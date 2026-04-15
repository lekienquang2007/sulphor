"use client"

import { useState, useRef, useEffect } from "react"
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
  confidence: "high" | "medium" | "low"
  explanation: string
  warnings: string[]
}

interface Message {
  role: "user" | "assistant"
  content: string
}

const PREVIEW_AMOUNT = 500000 // $5,000 in cents

function previewDraft(rules: DraftRule[]): { label: string; amount: number }[] {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority)
  let remaining = PREVIEW_AMOUNT
  const items: { label: string; amount: number }[] = []

  for (const rule of sorted) {
    if (rule.rule_type === "remainder") continue
    let amount = 0
    if (rule.rule_type === "percentage") amount = Math.round((rule.value / 100) * PREVIEW_AMOUNT)
    else if (rule.rule_type === "fixed_amount") amount = Math.round(rule.value * 100)
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

export default function AssistantPanel({
  existingRules,
  onApproved,
}: {
  existingRules: AllocationRule[]
  onApproved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [followupCount, setFollowupCount] = useState(0)
  const [draft, setDraft] = useState<{ rules: DraftRule[]; warnings: string[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && !draft) inputRef.current?.focus()
  }, [open, draft])

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
        setMessages((prev) => [...prev, { role: "assistant", content: data.question }])
        setFollowupCount((n) => n + 1)
      } else if (data.mode === "draft") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Here's your draft setup. Review before saving." },
        ])
        setDraft({ rules: data.rules ?? [], warnings: data.warnings ?? [] })
      } else {
        setError("Unexpected response from assistant")
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
      // Delete all existing rules first so there are no conflicts during creation
      for (const rule of existingRules) {
        await fetch(`/api/rules/${rule.id}`, { method: "DELETE" })
      }

      // Create draft rules sequentially — remainder last to pass validation
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

      // Log approval event (fire-and-forget, non-blocking)
      fetch("/api/assistant/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "assistant_draft_approved",
          metadata: { rule_count: draft.rules.length },
        }),
      }).catch(() => {})

      reset()
      setOpen(false)
      onApproved()
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

  if (!open) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-gray-500 underline underline-offset-2 hover:text-gray-800 transition-colors"
        >
          Draft rules with AI
        </button>
      </div>
    )
  }

  const previewItems = draft ? previewDraft(draft.rules) : []

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-900">Draft rules with AI</p>
        <button
          onClick={() => {
            reset()
            setOpen(false)
          }}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Close
        </button>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-xs text-gray-400 leading-relaxed">
          This drafts payout rules from your instructions. It is not tax or financial advice.
        </p>

        {/* Conversation */}
        {messages.length > 0 && (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-xs text-sm px-3 py-2 rounded-lg leading-relaxed ${
                    m.role === "user" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {m.content}
                </p>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-3 py-2.5 flex gap-1 items-center">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Text input — only shown while no draft exists */}
        {!draft && (
          <div className="space-y-2">
            {messages.length === 0 && (
              <p className="text-xs text-gray-500">
                Describe how you want Sulphor to organize your payouts.
              </p>
            )}
            <textarea
              ref={inputRef}
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder:text-gray-300 disabled:opacity-50"
              rows={3}
              placeholder="e.g. I need 30% for taxes, $400/month for software, and the rest as owner pay..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send()
              }}
              disabled={loading}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-300">⌘↵ to send</span>
              <Button size="sm" onClick={send} disabled={!input.trim() || loading}>
                {loading ? "..." : "Send"}
              </Button>
            </div>
          </div>
        )}

        {/* Draft preview */}
        {draft && (
          <div className="space-y-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Draft — review before saving
            </p>

            {/* Per-rule cards */}
            <div className="space-y-2">
              {draft.rules.map((rule, i) => (
                <div key={i} className="border border-gray-100 rounded-md p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{rule.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-gray-400">
                        {rule.rule_type === "percentage"
                          ? `${rule.value}%`
                          : rule.rule_type === "fixed_amount"
                          ? `$${rule.value} fixed`
                          : "remainder"}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          rule.source === "user_stated"
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {rule.source === "user_stated" ? "stated" : "inferred"}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{rule.explanation}</p>
                  {rule.warnings?.length > 0 &&
                    rule.warnings.map((w, wi) => (
                      <p key={wi} className="text-xs text-amber-600 mt-1">
                        {w}
                      </p>
                    ))}
                </div>
              ))}
            </div>

            {/* $5k preview */}
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs text-gray-400 mb-2">Preview on $5,000 payout</p>
              <div className="space-y-1">
                {previewItems.map((item) => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium text-gray-900">{formatCents(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Global warnings */}
            {draft.warnings.length > 0 && (
              <div className="space-y-1">
                {draft.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-600">
                    {w}
                  </p>
                ))}
              </div>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-2">
              <Button size="sm" onClick={approve} disabled={approving}>
                {approving ? "Saving..." : "Approve draft"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={discard}
                disabled={approving}
                className="text-gray-500"
              >
                Discard
              </Button>
            </div>
          </div>
        )}

        {error && !draft && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )
}
