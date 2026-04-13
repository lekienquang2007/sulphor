import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generatePlan } from "@/lib/generate-plan"
import type { PlanWithRelations } from "@/types/app"

// GET /api/payout-plans — list plans for authed user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: plansRaw, error } = await supabase
    .from("payout_plans")
    .select(`*, stripe_payouts ( stripe_payout_id, amount, arrival_date, status ), payout_plan_items ( * )`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const plans = plansRaw as unknown as PlanWithRelations[]
  return NextResponse.json({ plans })
}

// POST /api/payout-plans — manually generate a plan for a given payout
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { stripe_payout_db_id } = await request.json()
  if (!stripe_payout_db_id) {
    return NextResponse.json({ error: "stripe_payout_db_id required" }, { status: 400 })
  }

  return generatePlan(supabase, user.id, stripe_payout_db_id)
}

