import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { encrypt } from "@/lib/crypto"

export const dynamic = 'force-dynamic'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? ""

export async function GET(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" })
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state") // user_id
  const error = searchParams.get("error")

  if (error) {
    return NextResponse.redirect(
      `${appUrl()}/onboarding/connect?error=${encodeURIComponent(error)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl()}/onboarding/connect?error=missing_params`
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.id !== state) {
    return NextResponse.redirect(`${appUrl()}/login`)
  }

  // Exchange code for tokens
  const response = await stripe.oauth.token({
    grant_type: "authorization_code",
    code,
  })

  // Store connection (upsert)
  const { error: dbError } = await supabase
    .from("stripe_connections")
    .upsert({
      user_id: user.id,
      stripe_account_id: response.stripe_user_id!,
      access_token: encrypt(response.access_token!),
      refresh_token: response.refresh_token ? encrypt(response.refresh_token) : null,
      livemode: response.livemode ?? false,
      status: "active",
    }, { onConflict: "user_id" })

  if (dbError) {
    console.error("Failed to store Stripe connection:", dbError)
    return NextResponse.redirect(
      `${appUrl()}/onboarding/connect?error=db_error`
    )
  }

  // Log the event
  await supabase.from("event_logs").insert({
    user_id: user.id,
    event_type: "stripe_connected",
    metadata: { stripe_account_id: response.stripe_user_id },
  })

  return NextResponse.redirect(`${appUrl()}/onboarding/syncing`)
}
