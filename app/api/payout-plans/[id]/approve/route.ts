import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { PlanWithRelations } from "@/types/app"

// POST /api/payout-plans/[id]/approve
// Body: { items?: { bucket_name, amount }[], notes?: string }
// If items is provided, it's an edit-and-approve — overrides are validated before storing.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const planId = params.id
  const body = await request.json().catch(() => ({}))
  const { items: overrideItems, notes } = body as {
    items?: { bucket_name: string; amount: number }[]
    notes?: string
  }

  // Load plan
  const { data: planRaw } = await supabase
    .from("payout_plans")
    .select("*, payout_plan_items(*)")
    .eq("id", planId)
    .eq("user_id", user.id)
    .single()

  const plan = planRaw as unknown as PlanWithRelations | null
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })
  if (plan.status !== "pending") {
    return NextResponse.json({ error: `Plan is already ${plan.status}` }, { status: 409 })
  }

  let lineItems = plan.payout_plan_items ?? []
  const action = overrideItems ? "edited_and_approved" : "approved"

  if (overrideItems) {
    // Validate: sum of overridden amounts + spendable must equal payout_amount
    const overrideTotal = overrideItems.reduce((s, i) => s + i.amount, 0)
    if (overrideTotal > plan.payout_amount) {
      return NextResponse.json(
        { error: "Override amounts exceed payout amount" },
        { status: 422 }
      )
    }
    const spendable = plan.payout_amount - overrideTotal

    // Apply overrides to line items
    lineItems = lineItems.map((li) => {
      const override = overrideItems.find((o) => o.bucket_name === li.bucket_name)
      return override ? { ...li, amount: override.amount } : li
    })

    // Update line item amounts and spendable in DB
    for (const li of lineItems) {
      await supabase
        .from("payout_plan_items")
        .update({ amount: li.amount })
        .eq("id", li.id)
    }

    await supabase
      .from("payout_plans")
      .update({ spendable_amount: spendable })
      .eq("id", planId)
  }

  // Apply allocations to virtual buckets
  for (const li of lineItems) {
    const { data: bucket } = await supabase
      .from("virtual_buckets")
      .select("id, current_balance")
      .eq("user_id", user.id)
      .eq("bucket_name", li.bucket_name)
      .single()

    if (bucket) {
      await supabase.from("virtual_bucket_entries").insert({
        user_id: user.id,
        bucket_id: bucket.id,
        payout_plan_id: planId,
        amount: li.amount,
        description: `Payout allocation — plan ${planId}`,
      })

      await supabase
        .from("virtual_buckets")
        .update({ current_balance: bucket.current_balance + li.amount })
        .eq("id", bucket.id)
    }
  }

  // Mark plan approved
  await supabase
    .from("payout_plans")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", planId)

  // Audit trail
  await supabase.from("plan_approvals").insert({
    user_id: user.id,
    payout_plan_id: planId,
    action,
    notes: notes ?? null,
  })

  await supabase.from("event_logs").insert({
    user_id: user.id,
    event_type: "plan_approved",
    metadata: { plan_id: planId, action },
  })

  return NextResponse.json({ success: true, action })
}
