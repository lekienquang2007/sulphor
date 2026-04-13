export type RuleType = "percentage" | "fixed_amount" | "remainder"

export interface AllocationRule {
  id: string
  bucket_name: string
  label: string
  rule_type: RuleType
  value: number
  priority: number
  is_active: boolean
}

export interface PlanLineItem {
  bucket_name: string
  label: string
  amount: number // cents
  rule_type: RuleType
  rule_value: number
}

export interface PayoutPlan {
  items: PlanLineItem[]
  payout_amount: number // cents
  spendable_amount: number // cents (unreserved)
  rules_snapshot: AllocationRule[]
}

export interface RulesValidation {
  valid: boolean
  errors: string[]
}

export function validateRules(rules: AllocationRule[]): RulesValidation {
  const errors: string[] = []
  const active = rules.filter((r) => r.is_active)

  const remainderRules = active.filter((r) => r.rule_type === "remainder")
  if (remainderRules.length > 1) {
    errors.push("Only one remainder rule is allowed.")
  }

  const priorities = active.map((r) => r.priority)
  const uniquePriorities = new Set(priorities)
  if (uniquePriorities.size !== priorities.length) {
    errors.push("Each rule must have a unique priority.")
  }

  return { valid: errors.length === 0, errors }
}

export function applyRules(payoutAmountCents: number, rules: AllocationRule[]): PayoutPlan {
  const active = rules
    .filter((r) => r.is_active)
    .sort((a, b) => a.priority - b.priority)

  const items: PlanLineItem[] = []
  let remaining = payoutAmountCents

  for (const rule of active) {
    if (rule.rule_type === "remainder") continue // handle last

    let amount = 0
    if (rule.rule_type === "percentage") {
      amount = Math.round((rule.value / 100) * payoutAmountCents)
    } else if (rule.rule_type === "fixed_amount") {
      // fixed in dollars → cents
      amount = Math.round(rule.value * 100)
    }

    amount = Math.min(amount, Math.max(remaining, 0))
    remaining -= amount

    items.push({
      bucket_name: rule.bucket_name,
      label: rule.label,
      amount,
      rule_type: rule.rule_type,
      rule_value: rule.value,
    })
  }

  // Apply remainder rule last
  const remainderRule = active.find((r) => r.rule_type === "remainder")
  if (remainderRule) {
    const amount = Math.max(remaining, 0)
    remaining -= amount
    items.push({
      bucket_name: remainderRule.bucket_name,
      label: remainderRule.label,
      amount,
      rule_type: "remainder",
      rule_value: 0,
    })
  }

  const spendable = Math.max(remaining, 0)

  return {
    items,
    payout_amount: payoutAmountCents,
    spendable_amount: spendable,
    rules_snapshot: rules,
  }
}

export function checkAllocationOverflow(
  payoutAmountCents: number,
  rules: AllocationRule[]
): { overflows: boolean; excess: number; conflicting: string[] } {
  const active = rules.filter((r) => r.is_active && r.rule_type !== "remainder")

  let total = 0
  const conflicting: string[] = []

  for (const rule of active) {
    const amount =
      rule.rule_type === "percentage"
        ? Math.round((rule.value / 100) * payoutAmountCents)
        : Math.round(rule.value * 100)
    total += amount
    if (total > payoutAmountCents) conflicting.push(rule.label)
  }

  return {
    overflows: total > payoutAmountCents,
    excess: Math.max(total - payoutAmountCents, 0),
    conflicting,
  }
}

export const DEFAULT_RULES: Omit<AllocationRule, "id">[] = [
  {
    bucket_name: "tax",
    label: "Tax Holdback",
    rule_type: "percentage",
    value: 30,
    priority: 1,
    is_active: true,
  },
  {
    bucket_name: "ops",
    label: "Operating Buffer",
    rule_type: "percentage",
    value: 10,
    priority: 2,
    is_active: true,
  },
  {
    bucket_name: "owner_pay",
    label: "Owner Pay",
    rule_type: "remainder",
    value: 0,
    priority: 3,
    is_active: true,
  },
]
