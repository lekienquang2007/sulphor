"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function SyncButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSync() {
    setLoading(true)
    setDone(false)
    try {
      await fetch("/api/stripe/sync-balance", { method: "POST" })
      router.refresh()
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleSync}
      disabled={loading}
      className="shrink-0"
    >
      {loading ? "Syncing…" : done ? "Synced ✓" : "Sync Stripe"}
    </Button>
  )
}
