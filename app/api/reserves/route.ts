import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/reserves — virtual bucket balances + latest balance snapshot
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [bucketsRes, snapshotRes, pendingPayoutRes] = await Promise.all([
    supabase
      .from("virtual_buckets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),

    supabase
      .from("stripe_balance_snapshots")
      .select("available_amount, pending_amount, snapshot_at")
      .eq("user_id", user.id)
      .order("snapshot_at", { ascending: false })
      .limit(1)
      .single(),

    supabase
      .from("stripe_payouts")
      .select("stripe_payout_id, amount, arrival_date, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "in_transit"])
      .order("arrival_date", { ascending: true })
      .limit(1)
      .single(),
  ])

  const buckets = bucketsRes.data ?? []
  const totalReserved = buckets.reduce((s, b) => s + b.current_balance, 0)

  // Total payout income from approved plans
  const { data: approvedPlans } = await supabase
    .from("payout_plans")
    .select("payout_amount, spendable_amount")
    .eq("user_id", user.id)
    .eq("status", "approved")

  const totalPayoutIncome = approvedPlans?.reduce((s, p) => s + p.payout_amount, 0) ?? 0
  const unreservedFromTracked = totalPayoutIncome - totalReserved

  return NextResponse.json({
    buckets,
    totalReserved,
    unreservedFromTracked,
    balance: snapshotRes.data ?? null,
    nextPayout: pendingPayoutRes.data ?? null,
  })
}
