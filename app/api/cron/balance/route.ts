import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"
import type { Database } from "@/types/database"
import { decrypt } from "@/lib/crypto"

export const dynamic = 'force-dynamic'

// Vercel cron: runs daily
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" })

  // Get all active connections
  const { data: connections } = await supabase
    .from("stripe_connections")
    .select("user_id, access_token")
    .eq("status", "active")

  if (!connections || connections.length === 0) {
    return NextResponse.json({ refreshed: 0 })
  }

  let refreshed = 0
  for (const conn of connections) {
    try {
      const balance = await stripe.balance.retrieve(
        {},
        { headers: { Authorization: `Bearer ${decrypt(conn.access_token)}` } }
      )

      const usdAvailable = balance.available.find((b) => b.currency === "usd")
      const usdPending = balance.pending.find((b) => b.currency === "usd")

      await supabase.from("stripe_balance_snapshots").insert({
        user_id: conn.user_id,
        available_amount: usdAvailable?.amount ?? 0,
        pending_amount: usdPending?.amount ?? 0,
        currency: "usd",
      })

      refreshed++
    } catch (err) {
      console.error(`Balance refresh failed for user ${conn.user_id}:`, err)
    }
  }

  // Prune old data daily (event_logs and balance_snapshots older than 90 days)
  const { data: pruned, error: pruneErr } = await supabase.rpc("prune_old_data")
  if (pruneErr) console.error("Pruning failed:", pruneErr)

  return NextResponse.json({ refreshed, pruned: pruned ?? null })
}
