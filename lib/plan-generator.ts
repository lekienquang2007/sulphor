import Anthropic from "@anthropic-ai/sdk"
import { applyRules } from "@/lib/rules-engine"
import type { AllocationRule, PayoutPlan } from "@/lib/rules-engine"
import { formatCents, formatDate } from "@/lib/utils"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface PreviousPayout {
  amount: number
  arrival_date: string
  items: { label: string; amount: number }[]
}

export async function generatePlanSummary(
  plan: PayoutPlan,
  arrivalDate: string,
  previous: PreviousPayout | null
): Promise<string> {
  const itemLines = plan.items
    .map((i) => `${i.label}: ${formatCents(i.amount)}`)
    .join(", ")

  const prevSection = previous
    ? `Previous payout was ${formatCents(previous.amount)} on ${formatDate(previous.arrival_date)} with allocations: ${previous.items.map((i) => `${i.label} ${formatCents(i.amount)}`).join(", ")}.`
    : "This is the first tracked payout."

  const prompt = `You are summarizing a payout plan for a solo business founder. Use only the exact numbers provided — do not recalculate or estimate anything.

Payout: ${formatCents(plan.payout_amount)} arrived on ${formatDate(arrivalDate)}.
Allocations: ${itemLines}.
Unreserved (spendable): ${formatCents(plan.spendable_amount)}.
${prevSection}

Write a 2-3 sentence plain-language summary of this payout plan. If there was a previous payout, briefly note any significant change in total amount or largest allocations. Do not recalculate numbers. Use exactly the numbers provided above.`

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== "text") return ""
  return content.text.trim()
}

export function buildPlan(payoutAmountCents: number, rules: AllocationRule[]): PayoutPlan {
  return applyRules(payoutAmountCents, rules)
}
