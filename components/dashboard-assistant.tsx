"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCents } from "@/lib/utils"
import type { AllocationRule } from "@/lib/rules-engine"

interface DraftRule {
  bucket_name: string
  label: string
  rule_type: "percentage" | "fixed_amount" | "remainder"
  value: number
  priority: number
  source: "user_stated" | "inferred"
  explanation: string
  warnings: string[]
}

interface Message {
  role: "user" | "assistant"
  content: string
}

const PREVIEW_AMOUNT = 500000

function previewDraft(rules: DraftRule[]) {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority)
  let remaining = PREVIEW_AMOUNT
  const items: { label: string; amount: number }[] = []
  for (const rule of sorted) {
    if (rule.rule_type === "remainder") continue
    let amount =
      rule.rule_type === "percentage"
        ? Math.round((rule.value / 100) * PREVIEW_AMOUNT)
        : Math.round(rule.value * 100)
    amount = Math.min(amount, Math.max(remaining, 0))
    remaining -= amount
    items.push({ label: rule.label, amount })
  }
  const rem = sorted.find((r) => r.rule_type === "remainder")
  if (rem) {
    items.push({ label: rem.label, amount: Math.max(remaining, 0) })
    remaining = 0
  }
  if (remaining > 0) items.push({ label: "Unreserved", amount: remaining })
  return items
}

export default function DashboardAssistant() {
  const [existingRules, setExistingRules] = useState<AllocationRule[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [followupCount, setFollowupCount] = useState(0)
  const [draft, setDraft] = useState<{ rules: DraftRule[]; warnings: string[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/rules")
      .then((r) => r.json())
      .then((d) => setExistingRules(d.rules ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const next: Message[] = [...messages, { role: "user", content: text }]
    setMessages(next)
    setInput("")
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/assistant/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          existing_rules: existingRules,
          followup_count: followupCount,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Something went wrong")
        return
      }
      if (data.mode === "follow_up") {
        setMessages((p) => [...p, { role: "assistant", content: data.question }])
        setFollowupCount((n) => n + 1)
      } else if (data.mode === "draft") {
        setMessages((p) => [
          ...p,
          { role: "assistant", content: "Here's your draft setup. Review before saving." },
        ])
        setDraft({ rules: data.rules ?? [], warnings: data.warnings ?? [] })
      } else {
        setError("Unexpected response")
      }
    } catch {
      setError("Network error — try again.")
    } finally {
      setLoading(false)
    }
  }

  async function approve() {
    if (!draft) return
    setApproving(true)
    setError(null)
    try {
      for (const rule of existingRules) {
        await fetch(`/api/rules/${rule.id}`, { method: "DELETE" })
      }
      const sorted = [...draft.rules].sort((a, b) => {
        if (a.rule_type === "remainder") return 1
        if (b.rule_type === "remainder") return -1
        return a.priority - b.priority
      })
      for (const rule of sorted) {
        const res = await fetch("/api/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket_name: rule.bucket_name,
            label: rule.label,
            rule_type: rule.rule_type,
            value: rule.rule_type === "remainder" ? 0 : rule.value,
            priority: rule.priority,
          }),
        })
        if (!res.ok) {
          const d = await res.json()
          setError(d.error ?? `Failed to save "${rule.label}"`)
          setApproving(false)
          return
        }
      }
      fetch("/api/assistant/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "assistant_draft_approved",
          metadata: { rule_count: draft.rules.length },
        }),
      }).catch(() => {})
      reset()
    } catch {
      setError("Network error — try again.")
      setApproving(false)
    }
  }

  function discard() {
    fetch("/api/assistant/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "assistant_draft_discarded", metadata: {} }),
    }).catch(() => {})
    reset()
  }

  function reset() {
    setMessages([])
    setInput("")
    setFollowupCount(0)
    setDraft(null)
    setError(null)
    setApproving(false)
  }

  const hasMessages = messages.length > 0
  const previewItems = draft ? previewDraft(draft.rules) : []

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Conversation messages */}
        {hasMessages && (
          <div className="px-4 pt-4 space-y-2 max-h-52 overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[75%] text-sm px-3 py-2 rounded-2xl leading-relaxed ${
                    m.role === "user"
                      ? "bg-foreground text-background rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </p>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1 items-center">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Draft preview */}
        {draft && (
          <div className="px-4 pt-4 space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Draft — review before saving
            </p>

            <div className="divide-y divide-border/50">
              {draft.rules.map((rule, i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{rule.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {rule.explanation}
                    </p>
                    {rule.warnings?.map((w, wi) => (
                      <p key={wi} className="text-xs text-amber-600 mt-0.5">
                        {w}
                      </p>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {rule.rule_type === "percentage"
                        ? `${rule.value}%`
                        : rule.rule_type === "fixed_amount"
                        ? `$${rule.value}`
                        : "rem."}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                        rule.source === "user_stated"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {rule.source === "user_stated" ? "stated" : "inferred"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-muted/50 rounded-lg px-3 py-2.5">
              <p className="text-xs text-muted-foreground/70 mb-1.5">Preview on $5,000 payout</p>
              <div className="space-y-1">
                {previewItems.map((item) => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium text-foreground">{formatCents(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {draft.warnings.length > 0 && (
              <div className="space-y-0.5">
                {draft.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-600">
                    {w}
                  </p>
                ))}
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 pb-4">
              <Button size="sm" onClick={approve} disabled={approving}>
                {approving ? "Saving..." : "Approve draft"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={discard}
                disabled={approving}
                className="text-muted-foreground"
              >
                Discard
              </Button>
            </div>
          </div>
        )}

        {/* Input area */}
        {!draft && (
          <div className={hasMessages ? "px-4 pb-4 pt-3" : "p-4"}>
            <textarea
              ref={textareaRef}
              className="w-full text-sm bg-muted/40 border border-border rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-colors placeholder:text-muted-foreground/50 leading-relaxed"
              rows={hasMessages ? 2 : 3}
              placeholder={
                hasMessages
                  ? "Reply..."
                  : "Describe how you want Sulphor to organize your payouts..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send()
              }}
              disabled={loading}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground/50">
                {hasMessages
                  ? <span className="select-none">⌘↵ to send</span>
                  : "Drafts allocation rules from your description. Not tax or financial advice."}
              </p>
              <Button
                size="sm"
                onClick={send}
                disabled={!input.trim() || loading}
              >
                {loading ? "..." : "Send"}
              </Button>
            </div>
          </div>
        )}

        {error && !draft && (
          <p className="px-4 pb-4 text-xs text-red-500">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
