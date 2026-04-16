import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import Stripe from "stripe"
import { decrypt } from "@/lib/crypto"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: connection } = await supabase
    .from("stripe_connections")
    .select("access_token, status")
    .eq("user_id", user.id)
    .single()

  if (!connection || connection.status !== "active") {
    return NextResponse.json({ error: "No active Stripe connection" }, { status: 400 })
  }

  const stripe = new Stripe(decrypt(connection.access_token), { apiVersion: "2026-03-25.dahlia" })
  const balance = await stripe.balance.retrieve()

  const usdAvailable = balance.available.find((b) => b.currency === "usd")
  const usdPending = balance.pending.find((b) => b.currency === "usd")

  const service = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await service.from("stripe_balance_snapshots").insert({
    user_id: user.id,
    available_amount: usdAvailable?.amount ?? 0,
    pending_amount: usdPending?.amount ?? 0,
    currency: "usd",
  })

  return NextResponse.json({ ok: true })
}
