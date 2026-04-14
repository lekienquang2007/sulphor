import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.STRIPE_CLIENT_ID!,
    scope: "read_only",
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")}/api/stripe/callback`,
    state: user.id,
  })

  const stripeOAuthUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`
  return NextResponse.redirect(stripeOAuthUrl)
}
