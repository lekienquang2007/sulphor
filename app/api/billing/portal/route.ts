import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// GET /api/billing/portal — open Stripe Customer Portal for subscription management
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return NextResponse.redirect(`${appUrl}/pricing`)
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  })

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/settings`,
  })

  return NextResponse.redirect(session.url)
}
