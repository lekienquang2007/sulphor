import Stripe from "stripe"
import { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

export async function syncPayoutsAndBalance(
  supabase: SupabaseClient<Database>,
  userId: string,
  accessToken: string
) {
  // Use the connected account's OAuth token as the API key so all calls
  // operate on their account, not Sulphor's platform account.
  const stripe = new Stripe(accessToken, { apiVersion: "2026-03-25.dahlia" })
  // Sync last 12 months of payouts
  const twelveMonthsAgo = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 365

  // Auto-paginate
  const allPayouts: Stripe.Payout[] = []
  for await (const payout of stripe.payouts.list(
    { limit: 100, created: { gte: twelveMonthsAgo } }
  )) {
    allPayouts.push(payout)
  }

  if (allPayouts.length > 0) {
    const rows = allPayouts.map((p) => ({
      user_id: userId,
      stripe_payout_id: p.id,
      amount: p.amount,
      currency: p.currency,
      arrival_date: new Date(p.arrival_date * 1000).toISOString().split("T")[0],
      status: p.status,
      description: p.description ?? null,
    }))

    const { error } = await supabase
      .from("stripe_payouts")
      .upsert(rows, { onConflict: "stripe_payout_id", ignoreDuplicates: false })

    if (error) throw new Error(`Failed to upsert payouts: ${error.message}`)
  }

  // Sync balance snapshot
  const balance = await stripe.balance.retrieve()

  const usdAvailable = balance.available.find((b) => b.currency === "usd")
  const usdPending = balance.pending.find((b) => b.currency === "usd")

  await supabase.from("stripe_balance_snapshots").insert({
    user_id: userId,
    available_amount: usdAvailable?.amount ?? 0,
    pending_amount: usdPending?.amount ?? 0,
    currency: "usd",
  })

  // Update last_synced_at
  await supabase
    .from("stripe_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId)

  await supabase.from("event_logs").insert({
    user_id: userId,
    event_type: "payout_synced",
    metadata: { count: allPayouts.length },
  })

  return { payoutCount: allPayouts.length }
}
