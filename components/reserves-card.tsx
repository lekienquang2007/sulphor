"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCents } from "@/lib/utils"

interface Bucket {
  id: string
  label: string
  current_balance: number
}

export default function ReservesCard({
  buckets,
  totalReserved,
}: {
  buckets: Bucket[]
  totalReserved: number
}) {
  const router = useRouter()
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [amountInput, setAmountInput] = useState("")
  const [noteInput, setNoteInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openAdjust(id: string) {
    setAdjustingId(id)
    setAmountInput("")
    setNoteInput("")
    setError(null)
  }

  function cancelAdjust() {
    setAdjustingId(null)
    setError(null)
  }

  async function submitAdjust(bucket: Bucket) {
    const amount = parseFloat(amountInput)
    if (isNaN(amount) || amount === 0) {
      setError("Enter a non-zero amount.")
      return
    }
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/buckets/${bucket.id}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount_dollars: amount,
        description: noteInput.trim() || undefined,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? "Failed to adjust")
      return
    }
    setAdjustingId(null)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Reserves</CardTitle>
          <span className="money text-sm text-muted-foreground">{formatCents(totalReserved)} total</span>
        </div>
      </CardHeader>
      <CardContent>
        {buckets.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">No reserves yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Approve a payout plan to start building virtual reserves.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {buckets.map((b) => (
              <div key={b.id}>
                {/* Bucket row */}
                <div className="flex items-center justify-between py-1.5 group">
                  <p className="text-sm font-medium text-foreground">{b.label}</p>
                  <div className="flex items-center gap-3">
                    <p className="money text-sm font-semibold text-foreground">
                      {formatCents(b.current_balance)}
                    </p>
                    {adjustingId !== b.id && (
                      <button
                        onClick={() => openAdjust(b.id)}
                        className="text-xs text-muted-foreground/50 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Adjust
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline adjust form */}
                {adjustingId === b.id && (
                  <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Adjusting <span className="font-medium text-foreground">{b.label}</span>
                      {" — "}positive adds, negative removes.
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full pl-6 pr-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder="0.00"
                          value={amountInput}
                          onChange={(e) => setAmountInput(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitAdjust(b)
                            if (e.key === "Escape") cancelAdjust()
                          }}
                        />
                      </div>
                      <input
                        type="text"
                        className="flex-[2] px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
                        placeholder="Note (optional)"
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitAdjust(b)
                          if (e.key === "Escape") cancelAdjust()
                        }}
                      />
                    </div>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => submitAdjust(b)} disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelAdjust}
                        disabled={saving}
                        className="text-muted-foreground"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
