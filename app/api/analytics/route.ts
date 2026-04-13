import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

// GET /api/analytics — basic plan metrics for the authed user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [plansRes, approvalsRes, ruleChangesRes] = await Promise.all([
    supabase
      .from("payout_plans")
      .select("status, created_at, approved_at")
      .eq("user_id", user.id),

    supabase
      .from("plan_approvals")
      .select("action, created_at, payout_plan_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("event_logs")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("event_type", "rule_changed"),
  ])

  const plans = plansRes.data ?? []
  const approvals = approvalsRes.data ?? []

  const total = plans.length
  const approved = plans.filter((p) => p.status === "approved").length
  const skipped = plans.filter((p) => p.status === "skipped").length
  const pending = plans.filter((p) => p.status === "pending").length
  const reversed = plans.filter((p) => p.status === "reversed").length

  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : null

  // Median time-to-approve (ms)
  const approvedPlans = plans.filter((p) => p.status === "approved" && p.approved_at)
  const times = approvedPlans.map((p) =>
    new Date(p.approved_at!).getTime() - new Date(p.created_at).getTime()
  ).sort((a, b) => a - b)

  const medianMs = times.length > 0 ? times[Math.floor(times.length / 2)] : null
  const medianHours = medianMs !== null ? Math.round(medianMs / (1000 * 60 * 60) * 10) / 10 : null

  // Action breakdown
  const actionCounts = approvals.reduce<Record<string, number>>((acc, a) => {
    acc[a.action] = (acc[a.action] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    plans: { total, approved, skipped, pending, reversed },
    approvalRate,
    medianTimeToApproveHours: medianHours,
    actionBreakdown: actionCounts,
    ruleChangeCount: ruleChangesRes.data?.length ?? 0,
  })
}
