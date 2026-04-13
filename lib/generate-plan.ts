import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildPlan, generatePlanSummary } from "@/lib/plan-generator"
import type { AllocationRule } from "@/lib/rules-engine"
import type { PrevPlanShape } from "@/types/app"

export async function generatePlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  stripePayoutDbId: string
) {
  // Load the payout
  const { data: payout } = await supabase
    .from("stripe_payouts")
    .select("*")
    .eq("id", stripePayoutDbId)
    .eq("user_id", userId)
    .single()

  if (!payout) {
    return NextResponse.json({ error: "Payout not found" }, { status: 404 })
  }

  // Check if plan already exists
  const { data: existing } = await supabase
    .from("payout_plans")
    .select("id, status")
    .eq("stripe_payout_id", stripePayoutDbId)
    .eq("user_id", userId)
    .single()

  if (existing && existing.status === "pending") {
    return NextResponse.json({ error: "Plan already exists and is pending", plan_id: existing.id }, { status: 409 })
  }

  // Load active rules
  const { data: rules } = await supabase
    .from("allocation_rules")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("priority", { ascending: true })

  if (!rules || rules.length === 0) {
    return NextResponse.json({ error: "No active rules configured" }, { status: 400 })
  }

  // Build the plan
  const plan = buildPlan(payout.amount, rules as AllocationRule[])

  // Load previous plan for Claude context
  const { data: prevPlanRaw } = await supabase
    .from("payout_plans")
    .select(`payout_amount, stripe_payouts ( arrival_date ), payout_plan_items ( label, amount )`)
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  const prevPlan = prevPlanRaw as unknown as PrevPlanShape | null
  const previous = prevPlan
    ? {
        amount: prevPlan.payout_amount,
        arrival_date: prevPlan.stripe_payouts?.arrival_date ?? "",
        items: prevPlan.payout_plan_items ?? [],
      }
    : null

  // Get Claude summary
  let aiSummary: string | null = null
  try {
    aiSummary = await generatePlanSummary(plan, payout.arrival_date, previous)
  } catch (err) {
    console.error("Claude summary failed:", err)
  }

  // Save the plan
  const { data: savedPlan, error: planErr } = await supabase
    .from("payout_plans")
    .upsert(
      {
        user_id: userId,
        stripe_payout_id: stripePayoutDbId,
        payout_amount: plan.payout_amount,
        spendable_amount: plan.spendable_amount,
        status: "pending",
        ai_summary: aiSummary,
        rules_snapshot: plan.rules_snapshot as unknown as import("@/types/database").Json,
      },
      { onConflict: "user_id,stripe_payout_id" }
    )
    .select()
    .single()

  if (planErr || !savedPlan) {
    return NextResponse.json({ error: planErr?.message ?? "Failed to save plan" }, { status: 500 })
  }

  // Save line items (delete old ones first if re-generating)
  await supabase.from("payout_plan_items").delete().eq("payout_plan_id", savedPlan.id)

  const lineItems = plan.items.map((item) => ({
    user_id: userId,
    payout_plan_id: savedPlan.id,
    bucket_name: item.bucket_name,
    label: item.label,
    amount: item.amount,
    rule_type: item.rule_type,
    rule_value: item.rule_value,
  }))

  await supabase.from("payout_plan_items").insert(lineItems)

  await supabase.from("event_logs").insert({
    user_id: userId,
    event_type: "plan_generated",
    metadata: { plan_id: savedPlan.id, payout_id: stripePayoutDbId },
  })

  return NextResponse.json({ plan: savedPlan, items: plan.items }, { status: 201 })
}
