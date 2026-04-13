// Explicit types for Supabase joined query results.
// Supabase's type inference returns `never` for joined selects without
// Relationship definitions, so we cast these explicitly.

export interface PlanItem {
  id: string
  bucket_name: string
  label: string
  amount: number
  rule_type: string
  rule_value: number
}

export interface PayoutStub {
  stripe_payout_id: string
  arrival_date: string
  amount?: number
  status: string
}

export interface PlanWithRelations {
  id: string
  user_id: string
  stripe_payout_id: string
  payout_amount: number
  spendable_amount: number
  status: string
  ai_summary: string | null
  rules_snapshot: unknown
  created_at: string
  approved_at: string | null
  stripe_payouts: PayoutStub | null
  payout_plan_items: PlanItem[]
}

export interface PrevPlanShape {
  payout_amount: number
  stripe_payouts: { arrival_date: string } | null
  payout_plan_items: { label: string; amount: number }[]
}
