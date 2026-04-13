import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateRules, DEFAULT_RULES } from "@/lib/rules-engine"
import type { AllocationRule } from "@/lib/rules-engine"

// GET /api/rules — list active rules for the authed user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: rules, error } = await supabase
    .from("allocation_rules")
    .select("*")
    .eq("user_id", user.id)
    .order("priority", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // First-time: seed defaults
  if (!rules || rules.length === 0) {
    const defaults = DEFAULT_RULES.map((r) => ({ ...r, user_id: user.id }))
    const { data: seeded, error: seedErr } = await supabase
      .from("allocation_rules")
      .insert(defaults)
      .select()

    if (seedErr) return NextResponse.json({ error: seedErr.message }, { status: 500 })

    // Create default virtual buckets
    const buckets = defaults.map((r) => ({
      user_id: user.id,
      bucket_name: r.bucket_name,
      label: r.label,
      current_balance: 0,
    }))
    await supabase.from("virtual_buckets").upsert(buckets, { onConflict: "user_id,bucket_name" })

    return NextResponse.json({ rules: seeded })
  }

  return NextResponse.json({ rules })
}

// POST /api/rules — create a new rule
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { bucket_name, label, rule_type, value, priority } = body

  if (!bucket_name || !label || !rule_type || value === undefined || priority === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Validate against existing rules
  const { data: existing } = await supabase
    .from("allocation_rules")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)

  const newRule = { id: "new", bucket_name, label, rule_type, value, priority, is_active: true }
  const validation = validateRules([...(existing ?? []), newRule] as AllocationRule[])
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join(" ") }, { status: 422 })
  }

  const { data, error } = await supabase
    .from("allocation_rules")
    .insert({ user_id: user.id, bucket_name, label, rule_type, value, priority })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Ensure virtual bucket exists
  await supabase
    .from("virtual_buckets")
    .upsert({ user_id: user.id, bucket_name, label, current_balance: 0 }, { onConflict: "user_id,bucket_name" })

  await supabase.from("event_logs").insert({
    user_id: user.id,
    event_type: "rule_changed",
    metadata: { action: "created", rule_id: data.id },
  })

  return NextResponse.json({ rule: data }, { status: 201 })
}

// PUT /api/rules — bulk-update (reorder, edit values)
export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { rules } = body as { rules: AllocationRule[] }

  if (!Array.isArray(rules)) {
    return NextResponse.json({ error: "rules must be an array" }, { status: 400 })
  }

  const validation = validateRules(rules)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join(" ") }, { status: 422 })
  }

  // Update each rule
  for (const rule of rules) {
    await supabase
      .from("allocation_rules")
      .update({
        label: rule.label,
        rule_type: rule.rule_type,
        value: rule.value,
        priority: rule.priority,
        is_active: rule.is_active,
      })
      .eq("id", rule.id)
      .eq("user_id", user.id)

    // Keep virtual bucket label in sync
    if (rule.is_active) {
      await supabase
        .from("virtual_buckets")
        .upsert(
          { user_id: user.id, bucket_name: rule.bucket_name, label: rule.label, current_balance: 0 },
          { onConflict: "user_id,bucket_name" }
        )
    }
  }

  await supabase.from("event_logs").insert({
    user_id: user.id,
    event_type: "rule_changed",
    metadata: { action: "bulk_updated", count: rules.length },
  })

  return NextResponse.json({ success: true })
}
