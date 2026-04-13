import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { syncPayoutsAndBalance } from "@/lib/stripe-sync"

export async function POST(request: Request) {
  const supabase = await createClient()

  // Support both session-based (onboarding redirect) and header-based (internal)
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

  const { data: connection } = await supabase
    .from("stripe_connections")
    .select("access_token, status")
    .eq("user_id", userId)
    .single()

  if (!connection || connection.status !== "active") {
    return NextResponse.json({ error: "No active Stripe connection" }, { status: 400 })
  }

  const result = await syncPayoutsAndBalance(supabase, userId, connection.access_token)
  return NextResponse.json({ success: true, ...result })
}
