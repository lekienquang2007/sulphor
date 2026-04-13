import Anthropic from "@anthropic-ai/sdk"
import { applyRules } from "@/lib/rules-engine"
import type { AllocationRule, PayoutPlan } from "@/lib/rules-engine"
import { formatCents, formatDate } from "@/lib/utils"

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
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const itemLines = plan.items
    .map((i) => `${i.label}: ${formatCents(i.amount)}`)
    .join(", ")

  const prevSection = previous
    ? `Previous payout was ${formatCents(previous.amount)} on ${formatDate(previous.arrival_date)} with allocations: ${previous.items.map((i) => `${i.label} ${formatCents(i.amount)}`).join(", ")}.`
    : "This is the first tracked payout."

  const prompt = `You are a plain-language summarizer for a payout allocation tool. Your only job is to describe what the numbers say — not to advise, coach, or recommend anything.

Strict rules:
- Use ONLY the exact dollar amounts provided below. Do not recalculate, round differently, or invent any number.
- Do NOT suggest rule changes, comment on whether allocations are appropriate, or provide any financial or tax advice.
- Do NOT use words like "recommend", "suggest", "consider", "you should", "ideally", or "tip".
- Do NOT reference AI, automation, or this tool by name.
- Write 2-3 sentences maximum. Plain language. Past tense for what arrived, present tense for what it means.

Payout: ${formatCents(plan.payout_amount)} arrived on ${formatDate(arrivalDate)}.
Allocations: ${itemLines}.
Unreserved: ${formatCents(plan.spendable_amount)}.
${prevSection}

Write the summary now.`

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
