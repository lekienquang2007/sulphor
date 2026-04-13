import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { formatCents, formatDate } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { PlanWithRelations } from "@/types/app"

function statusVariant(status: string) {
  if (status === "approved") return "success"
  if (status === "pending") return "warning"
  if (status === "skipped") return "outline"
  if (status === "reversed") return "destructive"
  return "default"
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Check Stripe connected
  const { data: connection } = await supabase
    .from("stripe_connections")
    .select("status, last_synced_at")
    .eq("user_id", user.id)
    .single()

  if (!connection) redirect("/onboarding/connect")

  // Parallel data fetch
  const [bucketsRes, snapshotRes, plansRes, pendingPayoutRes] = await Promise.all([
    supabase
      .from("virtual_buckets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),

    supabase
      .from("stripe_balance_snapshots")
      .select("available_amount, pending_amount, snapshot_at")
      .eq("user_id", user.id)
      .order("snapshot_at", { ascending: false })
      .limit(1)
      .single(),

    supabase
      .from("payout_plans")
      .select("id, status, payout_amount, spendable_amount, created_at, approved_at, stripe_payouts ( stripe_payout_id, arrival_date, status )")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("stripe_payouts")
      .select("stripe_payout_id, amount, arrival_date, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "in_transit"])
      .order("arrival_date", { ascending: true })
      .limit(1)
      .single(),
  ])

  const buckets = bucketsRes.data ?? []
  const balance = snapshotRes.data
  const plans = (plansRes.data as unknown as PlanWithRelations[]) ?? []
  const nextPayout = pendingPayoutRes.data

  const totalReserved = buckets.reduce((s, b) => s + b.current_balance, 0)

  // Unreserved = total approved payout income − total reserved
  const { data: approvedPlans } = await supabase
    .from("payout_plans")
    .select("payout_amount")
    .eq("user_id", user.id)
    .eq("status", "approved")

  const totalPayoutIncome = (approvedPlans as unknown as { payout_amount: number }[] | null)?.reduce((s, p) => s + p.payout_amount, 0) ?? 0
  const unreserved = totalPayoutIncome - totalReserved

  const pendingPlan = plans.find((p) => p.status === "pending")

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-foreground">Sulphor</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-foreground font-medium">Home</Link>
          <Link href="/history" className="text-muted-foreground hover:text-foreground">History</Link>
          <Link href="/settings" className="text-muted-foreground hover:text-foreground">Settings</Link>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Pending plan alert */}
        {pendingPlan && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div>
              <p className="font-medium text-yellow-900 text-sm">Payout plan awaiting approval</p>
              <p className="text-xs text-yellow-700 mt-0.5">
                {formatCents(pendingPlan.payout_amount)} — review and approve to update your reserves.
              </p>
            </div>
            <Button asChild size="sm" className="self-start sm:self-auto">
              <Link href={`/plans/${pendingPlan.id}`}>Review</Link>
            </Button>
          </div>
        )}

        {/* Unreserved — hero number, largest thing on screen */}
        <div className="bg-foreground rounded-xl px-6 py-7">
          <p className="text-xs text-white/50 uppercase tracking-widest font-medium mb-2">
            Unreserved from tracked payouts
          </p>
          <p className="money-hero text-6xl font-bold text-white leading-none mb-3">
            {formatCents(unreserved)}
          </p>
          <p className="text-xs text-white/40 leading-relaxed max-w-sm">
            Virtual allocation — reflects what you haven&apos;t reserved from payouts tracked here.
            Not a live bank balance, not a separate account.
          </p>
        </div>

        {/* Next payout readiness + balance */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {balance ? (
                <div className="flex gap-6">
                  <div>
                    <p className="money text-xl font-bold text-foreground">{formatCents(balance.available_amount)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Available in Stripe</p>
                  </div>
                  <div>
                    <p className="money text-xl font-bold text-muted-foreground">{formatCents(balance.pending_amount)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No balance data yet</p>
              )}
              <div className="text-sm text-muted-foreground">
                Next payout:{" "}
                {nextPayout
                  ? <span className="font-medium text-foreground">Expected {formatDate(nextPayout.arrival_date)}</span>
                  : <span>No upcoming payout</span>
                }
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Virtual buckets */}
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
                <p className="text-xs text-muted-foreground mt-1">Approve a payout plan to start building virtual reserves.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {buckets.map((b) => (
                  <div key={b.id} className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{b.label}</p>
                    <p className="money text-sm font-semibold text-foreground">{formatCents(b.current_balance)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent plans */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Payout Plans</CardTitle>
              <Link href="/history" className="text-sm text-muted-foreground hover:text-foreground">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground/70">No payout plans yet.</p>
            ) : (
              <div className="space-y-3">
                {plans.map((plan) => {
                  const po = plan.stripe_payouts
                  return (
                    <Link
                      key={plan.id}
                      href={`/plans/${plan.id}`}
                      className="flex items-center justify-between py-2 hover:bg-muted/50 -mx-1 px-1 rounded-md"
                    >
                      <div>
                        <p className="money text-sm font-medium text-foreground">{formatCents(plan.payout_amount)}</p>
                        <p className="text-xs text-muted-foreground">{po?.arrival_date ? formatDate(po.arrival_date) : "—"}</p>
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
      </main>
    </div>
  )
}
