import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import { generatePlan } from "@/lib/generate-plan"
import type { Database } from "@/types/database"

export const dynamic = 'force-dynamic'

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
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Only block test events when STRIPE_REQUIRE_LIVEMODE=true is explicitly set.
  // Do NOT use NODE_ENV — Vercel is always 'production' even during test mode testing.
  if (process.env.STRIPE_REQUIRE_LIVEMODE === 'true' && !event.livemode) {
    console.log(`Skipping test-mode event ${event.type} (STRIPE_REQUIRE_LIVEMODE=true)`)
    return NextResponse.json({ received: true })
  }

  // Find the user by stripe account id from the event
  const stripeAccountId = (event as Stripe.Event & { account?: string }).account

  console.log(`[webhook] event=${event.type} livemode=${event.livemode} account=${stripeAccountId ?? "none"}`)

  // Platform-level events (no connected account) — handle subscription lifecycle
  if (!stripeAccountId) {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== "subscription") break
        const userId = session.metadata?.user_id
        if (!userId) break
        await supabase.from("profiles").update({
          stripe_customer_id: session.customer as string,
          subscription_id: session.subscription as string,
          subscription_status: "active",
        }).eq("id", userId)
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
        if (userId) { await query.eq("id", userId) }
        else { await query.eq("stripe_customer_id", sub.customer as string) }
        break
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.user_id
        const query = supabase.from("profiles").update({ subscription_status: "free", subscription_id: null })
        if (userId) { await query.eq("id", userId) }
        else { await query.eq("stripe_customer_id", sub.customer as string) }
        break
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await supabase.from("profiles")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", invoice.customer as string)
        break
      }
    }
    return NextResponse.json({ received: true })
  }

  const { data: connection } = await supabase
    .from("stripe_connections")
    .select("user_id, access_token")
    .eq("stripe_account_id", stripeAccountId)
    .eq("status", "active")
    .single()

  if (!connection) {
    console.error(`[webhook] No active stripe_connection found for account ${stripeAccountId}`)
    return NextResponse.json({ received: true })
  }

  const userId = connection.user_id
  console.log(`[webhook] matched user ${userId} for account ${stripeAccountId}`)

  switch (event.type) {
    case "payout.created":
    case "payout.paid": {
      const payout = event.data.object as Stripe.Payout
      const { data: upserted, error: upsertErr } = await supabase.from("stripe_payouts").upsert({
        user_id: userId,
        stripe_payout_id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        arrival_date: new Date(payout.arrival_date * 1000).toISOString().split("T")[0],
        status: payout.status,
        description: payout.description ?? null,
      }, { onConflict: "stripe_payout_id" }).select("id").single()

      if (upsertErr) console.error(`[webhook] payout upsert failed:`, upsertErr)
      console.log(`[webhook] payout upserted db_id=${upserted?.id} stripe_id=${payout.id}`)

      await supabase.from("event_logs").insert({
        user_id: userId,
        event_type: "payout_synced",
        metadata: { stripe_payout_id: payout.id, event: event.type },
      })

      // Auto-generate plan on paid payouts and refresh balance snapshot
      if (event.type === "payout.paid" && upserted?.id) {
        console.log(`[webhook] calling generatePlan for db_id=${upserted.id}`)
        const planRes = await generatePlan(supabase, userId, upserted.id)
        console.log(`[webhook] generatePlan status=${planRes.status}`)

        // Refresh balance snapshot for the connected account
        try {
          const balance = await stripe.balance.retrieve(
            {},
            { stripeAccount: stripeAccountId }
          )
          const usdAvailable = balance.available.find((b) => b.currency === "usd")
          const usdPending = balance.pending.find((b) => b.currency === "usd")
          await supabase.from("stripe_balance_snapshots").insert({
            user_id: userId,
            available_amount: usdAvailable?.amount ?? 0,
            pending_amount: usdPending?.amount ?? 0,
            currency: "usd",
          })
        } catch (err) {
          console.error("Balance refresh failed:", err)
        }
      }
      break
    }

    case "payout.updated": {
      const payout = event.data.object as Stripe.Payout
      await handlePayoutUpdate(supabase, userId, payout)
      break
    }

    case "payout.failed": {
      const payout = event.data.object as Stripe.Payout
      await handlePayoutFailure(supabase, userId, payout)
      break
    }

    case "balance.available": {
      // Refresh balance snapshot
      const balance = event.data.object as Stripe.Balance
      const usdAvailable = balance.available.find((b) => b.currency === "usd")
      const usdPending = balance.pending.find((b) => b.currency === "usd")

      await supabase.from("stripe_balance_snapshots").insert({
        user_id: userId,
        available_amount: usdAvailable?.amount ?? 0,
        pending_amount: usdPending?.amount ?? 0,
        currency: "usd",
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}

async function handlePayoutUpdate(
  supabase: import("@supabase/supabase-js").SupabaseClient<import("@/types/database").Database>,
  userId: string,
  payout: Stripe.Payout
) {
  // Update payout status
  await supabase
    .from("stripe_payouts")
    .update({ status: payout.status })
    .eq("stripe_payout_id", payout.id)
    .eq("user_id", userId)

  // If payout failed, handle plan reversal
  if (payout.status === "failed") {
    await handlePayoutFailure(supabase, userId, payout)
  }
}

async function handlePayoutFailure(
  supabase: import("@supabase/supabase-js").SupabaseClient<import("@/types/database").Database>,
  userId: string,
  payout: Stripe.Payout
) {
  // Update payout status to failed
  await supabase
    .from("stripe_payouts")
    .update({ status: "failed" })
    .eq("stripe_payout_id", payout.id)
    .eq("user_id", userId)

  // Find the stripe_payout row to get its UUID
  const { data: payoutRow } = await supabase
    .from("stripe_payouts")
    .select("id")
    .eq("stripe_payout_id", payout.id)
    .eq("user_id", userId)
    .single()

  if (!payoutRow) return

  // Find any payout plan for this payout
  const { data: plan } = await supabase
    .from("payout_plans")
    .select("id, status")
    .eq("stripe_payout_id", payoutRow.id)
    .eq("user_id", userId)
    .single()

  if (!plan) return

  if (plan.status === "pending") {
    // Auto-cancel pending plans
    await supabase
      .from("payout_plans")
      .update({ status: "reversed" })
      .eq("id", plan.id)
  } else if (plan.status === "approved") {
    // Reverse approved plan: undo virtual bucket entries
    const { data: planItems } = await supabase
      .from("payout_plan_items")
      .select("bucket_name, amount")
      .eq("payout_plan_id", plan.id)

    if (planItems && planItems.length > 0) {
      for (const item of planItems) {
        // Find the bucket
        const { data: bucket } = await supabase
          .from("virtual_buckets")
          .select("id, current_balance")
          .eq("user_id", userId)
          .eq("bucket_name", item.bucket_name)
          .single()

        if (bucket) {
          // Add reversal entry (negative amount)
          await supabase.from("virtual_bucket_entries").insert({
            user_id: userId,
            bucket_id: bucket.id,
            payout_plan_id: plan.id,
            amount: -item.amount,
            description: `Reversal: payout ${payout.id} failed`,
          })

          // Update bucket balance
          await supabase
            .from("virtual_buckets")
            .update({ current_balance: Math.max(0, bucket.current_balance - item.amount) })
            .eq("id", bucket.id)
        }
      }
    }

    // Mark plan as reversed
    await supabase
      .from("payout_plans")
      .update({ status: "reversed" })
      .eq("id", plan.id)

    await supabase.from("event_logs").insert({
      user_id: userId,
      event_type: "plan_reversed",
      metadata: { plan_id: plan.id, stripe_payout_id: payout.id, reason: "payout_failed" },
    })
  }
}
