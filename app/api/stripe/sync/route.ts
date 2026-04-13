import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { syncPayoutsAndBalance } from "@/lib/stripe-sync"
import { decrypt } from "@/lib/crypto"
import { rateLimit } from "@/lib/rate-limit"

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()

  let userId: string | null = null

  const headerUserId = request.headers.get("x-user-id")
  if (headerUserId) {
    userId = headerUserId
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limit: 10 syncs per user per hour
  const { allowed } = rateLimit(`sync:${userId}`, { windowMs: 60 * 60 * 1000, max: 10 })
  if (!allowed) {
    return NextResponse.json({ error: "Too many sync requests. Try again later." }, { status: 429 })
  }

  const { data: connection } = await supabase
    .from("stripe_connections")
    .select("access_token, status")
    .eq("user_id", userId)
    .single()

  if (!connection || connection.status !== "active") {
    return NextResponse.json({ error: "No active Stripe connection" }, { status: 400 })
  }

  const result = await syncPayoutsAndBalance(supabase, userId, decrypt(connection.access_token))
  return NextResponse.json({ success: true, ...result })
}
