import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// GET /api/billing/checkout — create a Stripe Checkout session and redirect
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`)
  }

  // Check if already subscribed
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, stripe_customer_id")
    .eq("id", user.id)
    .single()

  if (profile?.subscription_status === "active") {
    return NextResponse.redirect(`${appUrl}/settings`)
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  })

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: process.env.STRIPE_STANDARD_PRICE_ID!, quantity: 1 }],
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    success_url: `${appUrl}/dashboard?upgraded=1`,
    cancel_url: `${appUrl}/pricing`,
  }

  // Re-use existing Stripe customer if present
  if (profile?.stripe_customer_id) {
    sessionParams.customer = profile.stripe_customer_id
  } else {
    sessionParams.customer_email = user.email ?? undefined
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  return NextResponse.redirect(session.url!)
}
