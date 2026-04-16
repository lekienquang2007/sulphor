import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// GET /api/billing/portal — open Stripe Customer Portal for subscription management
export async function GET(request: Request) {
  const { origin } = new URL(request.url)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is not set")
    return NextResponse.json({ error: "Billing not configured" }, { status: 500 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return NextResponse.redirect(`${origin}/pricing`)
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia",
  })

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/settings`,
    })
    return NextResponse.redirect(session.url)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Stripe portal error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
