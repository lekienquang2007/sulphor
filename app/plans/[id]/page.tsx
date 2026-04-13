import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { formatCents, formatDate } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import PlanActions from "./plan-actions"
import type { PlanWithRelations, PrevPlanShape } from "@/types/app"

function statusVariant(status: string) {
  if (status === "approved") return "success"
  if (status === "pending") return "warning"
  if (status === "skipped") return "outline"
  if (status === "reversed") return "destructive"
  return "default"
}

export default async function PlanDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: planRaw } = await supabase
    .from("payout_plans")
    .select("*, stripe_payouts ( stripe_payout_id, amount, arrival_date, status ), payout_plan_items ( * )")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()

  const plan = planRaw as unknown as PlanWithRelations | null
  if (!plan) notFound()

  // Load previous approved plan for comparison
  const { data: prevPlanRaw } = await supabase
    .from("payout_plans")
    .select("payout_amount, stripe_payouts ( arrival_date ), payout_plan_items ( label, amount )")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .lt("created_at", plan.created_at)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  const prevPlan = prevPlanRaw as unknown as PrevPlanShape | null

  // Load active rules for assumptions
  const { data: activeRules } = await supabase
    .from("allocation_rules")
    .select("label, rule_type, value")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("priority", { ascending: true })

  const payout = plan.stripe_payouts
  const items = plan.payout_plan_items ?? []
  const prevItems = prevPlan?.payout_plan_items ?? []

  const amountDiff = prevPlan ? plan.payout_amount - prevPlan.payout_amount : null

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="money text-3xl font-bold text-foreground">{formatCents(plan.payout_amount)}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {payout?.arrival_date ? formatDate(payout.arrival_date) : "Unknown date"}
            </p>
          </div>
          <Badge variant={statusVariant(plan.status) as "default" | "success" | "warning" | "destructive" | "outline"}>
            {plan.status}
          </Badge>
        </div>

        {/* AI Summary */}
        {plan.ai_summary && (
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground/70 uppercase tracking-wide font-medium mb-2">Summary</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{plan.ai_summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Comparison to previous */}
        {prevPlan && amountDiff !== null && (
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground/70 uppercase tracking-wide font-medium mb-2">vs. Previous Payout</p>
              <p className="text-sm text-foreground/80">
                This payout is{" "}
                <span className={amountDiff >= 0 ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                  {amountDiff >= 0 ? "+" : ""}{formatCents(amountDiff)}
                </span>{" "}
                compared to {formatDate(prevPlan.stripe_payouts?.arrival_date ?? "")}{" "}
                ({formatCents(prevPlan.payout_amount)}).
              </p>
              {prevItems.length > 0 && (
                <div className="mt-2 space-y-1">
                  {items.map((item: { bucket_name: string; label: string; amount: number }) => {
                    const prev = prevItems.find((p: { label: string; amount: number }) => p.label === item.label)
                    if (!prev) return null
                    const diff = item.amount - prev.amount
                    if (diff === 0) return null
                    return (
                      <p key={item.bucket_name} className="text-xs text-muted-foreground">
                        {item.label}:{" "}
                        <span className={diff >= 0 ? "text-green-600" : "text-red-600"}>
                          {diff >= 0 ? "+" : ""}{formatCents(diff)}
                        </span>
                      </p>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Line items */}
        <Card>
          <CardHeader>
            <CardTitle>Allocation Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item: { id: string; bucket_name: string; label: string; amount: number; rule_type: string; rule_value: number }) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.rule_type === "percentage" && `${item.rule_value}% of payout`}
                      {item.rule_type === "fixed_amount" && `Fixed $${item.rule_value}`}
                      {item.rule_type === "remainder" && "Remainder"}
                    </p>
                  </div>
                  <span className="money text-sm font-semibold text-foreground">{formatCents(item.amount)}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Unreserved</p>
                  <p className="text-xs text-muted-foreground">Not allocated to any bucket in this plan</p>
                </div>
                <span className="money text-sm font-bold text-foreground">{formatCents(plan.spendable_amount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assumptions */}
        {activeRules && activeRules.length > 0 && (
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground/70 uppercase tracking-wide font-medium mb-2">Assumptions</p>
              <p className="text-xs text-muted-foreground">
                Based on your current rules:{" "}
                {activeRules.map((r) => (
                  <span key={r.label}>
                    {r.label}{" "}
                    {r.rule_type === "percentage" ? `at ${r.value}%` : r.rule_type === "fixed_amount" ? `$${r.value} fixed` : "(remainder)"}
                  </span>
                )).reduce((a: React.ReactNode[], b) => [...a, ", ", b], []).slice(1)}
                .
              </p>
            </CardContent>
          </Card>
        )}

        {/* Disclaimers */}
        <p className="text-xs text-muted-foreground/70 leading-relaxed px-1">
          All allocations are virtual — this plan reflects your intentions, not a separate account or actual fund segregation.
          Tax holdback figures are planning estimates only. Consult your accountant for your actual tax obligations.
        </p>

        {/* Actions */}
        {plan.status === "pending" && (
          <PlanActions
            planId={plan.id}
            items={items.map((i: { bucket_name: string; label: string; amount: number }) => ({
              bucket_name: i.bucket_name,
              label: i.label,
              amount: i.amount,
            }))}
            payoutAmount={plan.payout_amount}
            spendableAmount={plan.spendable_amount}
          />
        )}

        {plan.status !== "pending" && (
          <p className="text-center text-sm text-muted-foreground/70">
            This plan was {plan.status}{plan.approved_at ? ` on ${formatDate(plan.approved_at)}` : ""}.
          </p>
        )}
      </div>
    </div>
  )
}
