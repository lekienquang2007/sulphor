"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { formatCents } from "@/lib/utils"

interface LineItem {
  bucket_name: string
  label: string
  amount: number
}

interface PlanActionsProps {
  planId: string
  items: LineItem[]
  payoutAmount: number
  spendableAmount: number
}

export default function PlanActions({ planId, items, payoutAmount, spendableAmount }: PlanActionsProps) {
  const router = useRouter()
  const [mode, setMode] = useState<"default" | "edit">("default")
  const [editedItems, setEditedItems] = useState<LineItem[]>(items.map((i) => ({ ...i })))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const editedTotal = editedItems.reduce((s, i) => s + i.amount, 0)
  const editedSpendable = payoutAmount - editedTotal
  const isValid = editedTotal <= payoutAmount && editedSpendable >= 0

  function updateAmount(bucket_name: string, value: number) {
    setEditedItems((prev) =>
      prev.map((i) => (i.bucket_name === bucket_name ? { ...i, amount: Math.max(0, value) } : i))
    )
  }

  async function handleApprove(withEdits: boolean) {
    setLoading(true)
    setError(null)
    const body = withEdits
      ? { items: editedItems.map((i) => ({ bucket_name: i.bucket_name, amount: i.amount })) }
      : {}

    const res = await fetch(`/api/payout-plans/${planId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? "Failed to approve")
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  async function handleSkip() {
    setLoading(true)
    await fetch(`/api/payout-plans/${planId}/skip`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
    router.push("/dashboard")
    router.refresh()
  }

  if (mode === "edit") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-900">Adjust allocations</p>
        <p className="text-xs text-gray-500">
          The sum of all amounts + unreserved must equal {formatCents(payoutAmount)}.
        </p>

        <div className="space-y-3">
          {editedItems.map((item) => (
            <div key={item.bucket_name} className="flex items-center justify-between gap-3">
              <label className="text-sm text-gray-700 flex-1">{item.label}</label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">$</span>
                <input
                  type="number"
                  min={0}
                  value={Math.round(item.amount / 100)}
                  onChange={(e) => updateAmount(item.bucket_name, Math.round(parseFloat(e.target.value) * 100))}
                  className="w-24 px-2 py-1 text-sm border border-gray-300 rounded text-right"
                />
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100 flex justify-between text-sm">
            <span className="text-gray-600">Unreserved</span>
            <span className={`font-semibold ${editedSpendable < 0 ? "text-red-600" : "text-gray-900"}`}>
              {formatCents(editedSpendable)}
            </span>
          </div>
        </div>

        {!isValid && (
          <p className="text-sm text-red-600">Allocations exceed payout amount. Reduce some amounts.</p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button
            onClick={() => handleApprove(true)}
            disabled={loading || !isValid}
            className="flex-1"
          >
            {loading ? "Saving..." : "Approve with edits"}
          </Button>
          <Button variant="outline" onClick={() => setMode("default")} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-foreground rounded-xl p-5 space-y-3">
      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={() => handleApprove(false)}
        disabled={loading}
        className="w-full py-3.5 px-5 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors tracking-wide"
      >
        {loading ? "Approving..." : "Approve this plan"}
      </button>
      <button
        onClick={() => setMode("edit")}
        disabled={loading}
        className="w-full py-2.5 px-5 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/15 disabled:opacity-50 transition-colors"
      >
        Edit and approve
      </button>
      <button
        onClick={handleSkip}
        disabled={loading}
        className="w-full py-2 px-5 text-white/40 text-xs hover:text-white/60 disabled:opacity-50 transition-colors"
      >
        Skip — handle manually
      </button>
    </div>
  )
}
