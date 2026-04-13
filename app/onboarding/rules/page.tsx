"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { formatCents } from "@/lib/utils"
import type { AllocationRule, RuleType } from "@/lib/rules-engine"
import { checkAllocationOverflow } from "@/lib/rules-engine"

const PREVIEW_AMOUNT = 500000 // $5,000 in cents

function ruleLabel(rule: AllocationRule): string {
  if (rule.rule_type === "percentage") return `${rule.value}%`
  if (rule.rule_type === "fixed_amount") return `$${rule.value} fixed`
  return "remainder"
}

export default function RulesSetupPage() {
  const router = useRouter()
  const [rules, setRules] = useState<AllocationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newRule, setNewRule] = useState<Partial<AllocationRule>>({
    rule_type: "percentage",
    value: 0,
    label: "",
    bucket_name: "",
  })

  const fetchRules = useCallback(async () => {
    const res = await fetch("/api/rules")
    const data = await res.json()
    setRules(data.rules ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchRules() }, [fetchRules])

  const preview = useCallback(() => {
    // Compute split on $5,000 preview
    const active = rules.filter((r) => r.is_active).sort((a, b) => a.priority - b.priority)
    let remaining = PREVIEW_AMOUNT
    const items: { label: string; amount: number }[] = []

    for (const rule of active) {
      if (rule.rule_type === "remainder") continue
      let amount = 0
      if (rule.rule_type === "percentage") amount = Math.round((rule.value / 100) * PREVIEW_AMOUNT)
      else if (rule.rule_type === "fixed_amount") amount = Math.round(rule.value * 100)
      amount = Math.min(amount, Math.max(remaining, 0))
      remaining -= amount
      items.push({ label: rule.label, amount })
    }
    const rem = active.find((r) => r.rule_type === "remainder")
    if (rem) {
      items.push({ label: rem.label, amount: Math.max(remaining, 0) })
      remaining = 0
    }
    if (remaining > 0) items.push({ label: "Unreserved", amount: remaining })
    return items
  }, [rules])

  const overflow = checkAllocationOverflow(PREVIEW_AMOUNT, rules)

  async function saveRules() {
    setSaving(true)
    setError(null)
    const res = await fetch("/api/rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? "Failed to save")
      setSaving(false)
      return
    }
    router.push("/dashboard")
  }

  async function addRule() {
    if (!newRule.label || !newRule.bucket_name) return
    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newRule,
        priority: (rules[rules.length - 1]?.priority ?? 0) + 1,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setRules((prev) => [...prev, data.rule])
    setShowAdd(false)
    setNewRule({ rule_type: "percentage", value: 0, label: "", bucket_name: "" })
  }

  async function deleteRule(id: string) {
    await fetch(`/api/rules/${id}`, { method: "DELETE" })
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  function moveRule(idx: number, dir: -1 | 1) {
    const next = [...rules]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    // Reassign priorities
    next.forEach((r, i) => (r.priority = i + 1))
    setRules(next)
  }

  function updateRule(id: string, field: keyof AllocationRule, value: unknown) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  const previewItems = preview()

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Set your allocation rules</h1>
        <p className="text-sm text-gray-500 mb-8">
          These rules decide how every payout is split. Applied in order, top to bottom.
        </p>

        {/* Rules list */}
        <div className="space-y-2 mb-6">
          {rules.map((rule, idx) => (
            <div key={rule.id} className="bg-white border border-gray-200 rounded-lg p-4">
              {editingId === rule.id ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                      value={rule.label}
                      onChange={(e) => updateRule(rule.id, "label", e.target.value)}
                      placeholder="Label"
                    />
                    <select
                      className="px-2 py-1 text-sm border border-gray-300 rounded"
                      value={rule.rule_type}
                      onChange={(e) => updateRule(rule.id, "rule_type", e.target.value as RuleType)}
                    >
                      <option value="percentage">%</option>
                      <option value="fixed_amount">Fixed $</option>
                      <option value="remainder">Remainder</option>
                    </select>
                    {rule.rule_type !== "remainder" && (
                      <input
                        type="number"
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                        value={rule.value}
                        min={0}
                        onChange={(e) => updateRule(rule.id, "value", parseFloat(e.target.value))}
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setEditingId(null)}>Done</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveRule(idx, -1)}
                      disabled={idx === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                    >▲</button>
                    <button
                      onClick={() => moveRule(idx, 1)}
                      disabled={idx === rules.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                    >▼</button>
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-sm text-gray-900">{rule.label}</span>
                    <span className="ml-2 text-xs text-gray-400">{ruleLabel(rule)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(rule.id)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteRule(rule.id)}
                      className="text-red-500 hover:text-red-700">Remove</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add rule */}
        {showAdd ? (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <input
                className="flex-1 min-w-32 px-2 py-1 text-sm border border-gray-300 rounded"
                placeholder="Label (e.g. Tax Holdback)"
                value={newRule.label}
                onChange={(e) => setNewRule((p) => ({ ...p, label: e.target.value }))}
              />
              <input
                className="w-36 px-2 py-1 text-sm border border-gray-300 rounded"
                placeholder="bucket_name"
                value={newRule.bucket_name}
                onChange={(e) => setNewRule((p) => ({ ...p, bucket_name: e.target.value }))}
              />
              <select
                className="px-2 py-1 text-sm border border-gray-300 rounded"
                value={newRule.rule_type}
                onChange={(e) => setNewRule((p) => ({ ...p, rule_type: e.target.value as RuleType }))}
              >
                <option value="percentage">%</option>
                <option value="fixed_amount">Fixed $</option>
                <option value="remainder">Remainder</option>
              </select>
              {newRule.rule_type !== "remainder" && (
                <input
                  type="number"
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                  placeholder="Value"
                  value={newRule.value}
                  min={0}
                  onChange={(e) => setNewRule((p) => ({ ...p, value: parseFloat(e.target.value) }))}
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addRule}>Add rule</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="mb-6" onClick={() => setShowAdd(true)}>
            + Add custom bucket
          </Button>
        )}

        {/* Preview */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">
            Preview on $5,000 payout
          </p>
          {overflow.overflows && (
            <p className="text-sm text-red-600 mb-3">
              Warning: allocations exceed payout by {formatCents(overflow.excess)}. Conflicting rules: {overflow.conflicting.join(", ")}.
            </p>
          )}
          <div className="space-y-1">
            {previewItems.map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.label}</span>
                <span className="font-medium text-gray-900">{formatCents(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <Button
          onClick={saveRules}
          disabled={saving || overflow.overflows}
          className="w-full"
        >
          {saving ? "Saving..." : "Confirm rules and continue"}
        </Button>
      </div>
    </div>
  )
}
