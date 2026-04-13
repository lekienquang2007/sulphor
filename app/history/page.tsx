import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { formatCents, formatDate } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { PlanWithRelations } from "@/types/app"

function statusVariant(status: string) {
  if (status === "approved") return "success"
  if (status === "pending") return "warning"
  if (status === "skipped") return "outline"
  if (status === "reversed") return "destructive"
  return "default"
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [plansRes, bucketsRes, eventRes] = await Promise.all([
    supabase
      .from("payout_plans")
      .select("id, status, payout_amount, spendable_amount, created_at, approved_at, stripe_payouts ( stripe_payout_id, arrival_date, amount, status )")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("virtual_buckets")
      .select("id, label, bucket_name, current_balance")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),

    supabase
      .from("event_logs")
      .select("event_type, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  const plans = (plansRes.data as unknown as PlanWithRelations[]) ?? []
  const buckets = bucketsRes.data ?? []
  const events = eventRes.data ?? []

  // Running bucket total over approved plans (ascending order for trend)
  const approvedPlans = [...plans].filter((p) => p.status === "approved").reverse()
  const totalReserved = buckets.reduce((s, b) => s + b.current_balance, 0)

  // Simple trend: compare first approved plan window to last
  let trendLabel: string | null = null
  if (approvedPlans.length >= 2) {
    const first = approvedPlans[0].payout_amount
    const last = approvedPlans[approvedPlans.length - 1].payout_amount
    const diff = last - first
    trendLabel = `${formatCents(Math.abs(diff))} ${diff >= 0 ? "more" : "less"} per payout vs. your first tracked payout`
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-foreground">Sulphor</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Home</Link>
          <Link href="/history" className="text-foreground font-medium">History</Link>
          <Link href="/settings" className="text-muted-foreground hover:text-foreground">Settings</Link>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Reserve summary */}
        <Card>
          <CardHeader>
            <CardTitle>Reserve Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              {buckets.map((b) => (
                <div key={b.id} className="flex justify-between text-sm">
                  <span className="text-foreground/80">{b.label}</span>
                  <span className="font-semibold text-foreground">{formatCents(b.current_balance)}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-border flex justify-between text-sm font-semibold">
                <span>Total reserved</span>
                <span>{formatCents(totalReserved)}</span>
              </div>
            </div>
            {trendLabel && (
              <p className="text-xs text-muted-foreground/70">{trendLabel}</p>
            )}
          </CardContent>
        </Card>

        {/* Payout history */}
        <Card>
          <CardHeader>
            <CardTitle>All Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground/70">No payout history yet.</p>
            ) : (
              <div className="space-y-1">
                {plans.map((plan) => {
                  const po = plan.stripe_payouts
                  return (
                    <Link
                      key={plan.id}
                      href={`/plans/${plan.id}`}
                      className="flex items-center justify-between py-3 border-b border-border/30 last:border-0 hover:bg-muted/50 -mx-1 px-1 rounded-md"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{formatCents(plan.payout_amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {po?.arrival_date ? formatDate(po.arrival_date) : "—"}
                          {plan.status === "approved" && (
                            <span className="ml-2 text-muted-foreground/70">Unreserved: {formatCents(plan.spendable_amount)}</span>
                          )}
                        </p>
                      </div>
                      <Badge variant={statusVariant(plan.status) as "default" | "success" | "warning" | "destructive" | "outline"}>
                        {plan.status}
                      </Badge>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event log */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground/70">No events yet.</p>
            ) : (
              <div className="space-y-2">
                {events.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs text-muted-foreground">
                    <span className="shrink-0 text-border">{formatDate(ev.created_at)}</span>
                    <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground">{ev.event_type}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
