import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST /api/payout-plans/[id]/skip
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const planId = params.id
  const body = await request.json().catch(() => ({}))
  const { notes } = body as { notes?: string }

  const { data: plan } = await supabase
    .from("payout_plans")
    .select("status")
    .eq("id", planId)
    .eq("user_id", user.id)
    .single()

  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })
  if (plan.status !== "pending") {
    return NextResponse.json({ error: `Plan is already ${plan.status}` }, { status: 409 })
  }

  await supabase
    .from("payout_plans")
    .update({ status: "skipped" })
    .eq("id", planId)

  await supabase.from("plan_approvals").insert({
    user_id: user.id,
    payout_plan_id: planId,
    action: "skipped",
    notes: notes ?? null,
  })

  await supabase.from("event_logs").insert({
    user_id: user.id,
    event_type: "plan_approved",
    metadata: { plan_id: planId, action: "skipped" },
  })

  return NextResponse.json({ success: true })
}
