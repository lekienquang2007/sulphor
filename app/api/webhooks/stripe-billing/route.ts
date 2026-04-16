import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

// Separate webhook for platform billing events (subscription lifecycle).
// In Stripe this endpoint must be registered with "Your account" (not Connected accounts)
// because checkout/subscription events fire on the platform, not on connected accounts.
export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" })
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.text()
  const sig = request.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_BILLING_WEBHOOK_SECRET!)
  } catch (err) {
    console.error("[billing-webhook] Signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  console.log(`[billing-webhook] event=${event.type} livemode=${event.livemode}`)

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== "subscription") break
      const userId = session.metadata?.user_id
      if (!userId) {
        console.error("[billing-webhook] checkout.session.completed: no user_id in metadata", session.id)
        break
      }
      const { error } = await supabase.from("profiles").update({
        stripe_customer_id: session.customer as string,
        subscription_id: session.subscription as string,
        subscription_status: "active",
      }).eq("id", userId)
      if (error) console.error("[billing-webhook] checkout.session.completed: update failed", error)
      else console.log(`[billing-webhook] checkout.session.completed: set active for user ${userId}`)
      break
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.user_id
      const statusMap: Record<string, string> = {
        active: "active", trialing: "active",
        past_due: "past_due", unpaid: "past_due",
        canceled: "free", incomplete: "free", incomplete_expired: "free",
      }
      const status = statusMap[sub.status] ?? "free"
      const query = supabase.from("profiles").update({ subscription_status: status, subscription_id: sub.id })
      const { error } = userId
        ? await query.eq("id", userId)
        : await query.eq("stripe_customer_id", sub.customer as string)
      if (error) console.error("[billing-webhook] customer.subscription.updated: update failed", error)
      else console.log(`[billing-webhook] customer.subscription.updated: status=${status}`)
      break
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.user_id
      const query = supabase.from("profiles").update({ subscription_status: "free", subscription_id: null })
      const { error } = userId
        ? await query.eq("id", userId)
        : await query.eq("stripe_customer_id", sub.customer as string)
      if (error) console.error("[billing-webhook] customer.subscription.deleted: update failed", error)
      else console.log(`[billing-webhook] customer.subscription.deleted: reset to free`)
      break
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      const { error } = await supabase.from("profiles")
        .update({ subscription_status: "past_due" })
        .eq("stripe_customer_id", invoice.customer as string)
      if (error) console.error("[billing-webhook] invoice.payment_failed: update failed", error)
      else console.log(`[billing-webhook] invoice.payment_failed: set past_due`)
      break
    }

    default:
      console.log(`[billing-webhook] unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
