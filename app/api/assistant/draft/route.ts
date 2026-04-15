import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"
import type { AllocationRule } from "@/lib/rules-engine"

export const dynamic = "force-dynamic"

const BASE_SYSTEM_PROMPT = `You are a payout rule drafting assistant embedded in Sulphor, a Stripe payout allocation tool for solo founders.

ROLE: Turn a founder's description of their cash needs into a complete draft set of allocation rules.
This is not financial advice. Describe only what numbers they gave you and what you inferred.

SUPPORTED RULE TYPES:
- percentage: value = the percent (e.g. 30 = 30% of gross payout)
- fixed_amount: value = dollars (e.g. 500 = $500 deducted per payout)
- remainder: takes what is left after all other rules; only one allowed; value must be 0

RULE APPLICATION ORDER: lower priority number runs first (priority 1 = applied first).

BUILD ORDER — apply this sequence when constructing the draft:
1. Fixed obligations (recurring software, subscriptions, known fixed costs)
2. Tax holdback
3. Minimum operating cushion
4. Owner pay
5. Growth or savings (usually remainder)

HARD CONSTRAINTS:
- Never invent a tax percentage. If the user has not stated their rate: ask once. If still unknown after 1 follow-up: use 25%, mark source as "inferred", confidence as "low", and add a warning.
- Never present pending Stripe funds as freely usable.
- Make only low-risk, reversible inferences. Label all inferences clearly.
- Reuse existing bucket_names (provided below) where logically correct.
- Create a new bucket only if it is clearly material, deadline-driven, or requires a distinct rule type.
- Total bucket count: 4–7 preferred. Never exceed 7.
- Never use advisory language: no "recommend", "suggest", "consider", "you should", "ideally".

FOLLOW-UP RULES:
- Ask a follow-up ONLY when missing info would materially change: obligations, tax rate, or minimum cushion.
- One question per response. Keep it short and operational.
- If followup_count >= 2: never ask another follow-up. Draft immediately using low-risk inferences.

OUTPUT — return ONLY a valid JSON object. No markdown fences, no extra text before or after the JSON.

When asking a follow-up:
{"mode":"follow_up","question":"<single operational question>"}

When drafting rules:
{
  "mode": "draft",
  "rules": [
    {
      "bucket_name": "<lowercase_snake_case, 30 chars max>",
      "label": "<Human Label, 40 chars max>",
      "rule_type": "percentage" | "fixed_amount" | "remainder",
      "value": <number — use 0 for remainder>,
      "priority": <unique integer starting at 1>,
      "source": "user_stated" | "inferred",
      "confidence": "high" | "medium" | "low",
      "explanation": "<one sentence describing how this was derived>",
      "warnings": ["<caveat string if any, else empty array>"]
    }
  ],
  "warnings": ["<global caveats, else empty array>"]
}`

function buildSystemPrompt(existingRules: AllocationRule[], followupCount: number): string {
  const rulesContext =
    existingRules.length > 0
      ? existingRules
          .map(
            (r) =>
              `  - bucket_name="${r.bucket_name}" label="${r.label}" rule_type=${r.rule_type} value=${r.value}`
          )
          .join("\n")
      : "  (none)"

  const followupInstruction =
    followupCount >= 2
      ? "CRITICAL: followup_count is 2 or more. You MUST return a draft now. Do NOT output a follow_up response."
      : `You have asked ${followupCount}/2 follow-up questions. You may ask at most ${2 - followupCount} more.`

  return `${BASE_SYSTEM_PROMPT}

---
SESSION CONTEXT:
Existing rules for this user (reuse these bucket_names where logically appropriate):
${rulesContext}

${followupInstruction}`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { allowed } = rateLimit(`assistant:${user.id}`, { windowMs: 60_000, max: 20 })
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  const body = await request.json()
  const { messages, existing_rules, followup_count } = body as {
    messages: { role: "user" | "assistant"; content: string }[]
    existing_rules: AllocationRule[]
    followup_count: number
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 })
  }

  // Log assistant_started on the first user message
  if (messages.length === 1) {
    await supabase.from("event_logs").insert({
      user_id: user.id,
      event_type: "assistant_started",
      metadata: { source: "rules_page" },
    })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: buildSystemPrompt(existing_rules ?? [], followup_count ?? 0),
    messages,
  })

  const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : ""

  // Strip markdown fences if the model wraps output despite instructions
  const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()

  let parsed: { mode: string; question?: string; rules?: unknown[]; warnings?: string[] }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    console.error("Assistant returned non-JSON:", raw)
    await supabase.from("event_logs").insert({
      user_id: user.id,
      event_type: "assistant_error",
      metadata: { raw: raw.slice(0, 200) },
    })
    return NextResponse.json({ error: "Assistant returned an invalid response. Try again." }, { status: 500 })
  }

  if (parsed.mode === "follow_up") {
    await supabase.from("event_logs").insert({
      user_id: user.id,
      event_type: "assistant_followup_asked",
      metadata: { question: parsed.question },
    })
  } else if (parsed.mode === "draft") {
    await supabase.from("event_logs").insert({
      user_id: user.id,
      event_type: "assistant_draft_created",
      metadata: { rule_count: (parsed.rules ?? []).length },
    })
  }

  return NextResponse.json(parsed)
}
