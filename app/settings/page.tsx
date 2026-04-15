import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import LogoutButton from "./logout-button"
import SettingsRulesSection from "@/components/settings-rules-section"
import type { AllocationRule } from "@/lib/rules-engine"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [connectionRes, profileRes, planCountRes, rulesRes] = await Promise.all([
    supabase
      .from("stripe_connections")
      .select("stripe_account_id, status, livemode, last_synced_at")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("profiles")
      .select("subscription_status, stripe_customer_id")
      .eq("id", user.id)
      .single(),
    supabase
      .from("payout_plans")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "reversed"),
    supabase
      .from("allocation_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("priority", { ascending: true }),
  ])

  const connection = connectionRes.data
  const subStatus = profileRes.data?.subscription_status ?? "free"
  const planCount = planCountRes.count ?? 0
  const rules = rulesRes.data

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-foreground">Sulphor</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Home</Link>
          <Link href="/history" className="text-muted-foreground hover:text-foreground">History</Link>
          <Link href="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
          <Link href="/settings" className="text-foreground font-medium">Settings</Link>
        </nav>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-6">

        {/* Billing */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Plan</CardTitle>
              <Badge variant={subStatus === "active" ? "success" : subStatus === "past_due" ? "destructive" : "outline"}>
                {subStatus === "active" ? "Standard" : subStatus === "past_due" ? "Past due" : "Free"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {subStatus === "active" ? (
              <>
                <p className="text-sm text-muted-foreground">Unlimited payouts · $9.99/month</p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/api/billing/portal">Manage subscription</Link>
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Payouts processed</span>
                  <span className={planCount >= 10 ? "text-red-600 font-semibold" : "text-foreground font-medium"}>
                    {planCount} / 10
                  </span>
                </div>
                {planCount >= 10 && (
                  <p className="text-xs text-red-600">Free limit reached. Upgrade to keep processing payouts.</p>
                )}
                <Button asChild size="sm">
                  <Link href="/api/billing/checkout">Upgrade to Standard — $9.99/mo</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stripe connection */}
        <Card>
          <CardHeader>
            <CardTitle>Stripe Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connection ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Account</span>
                  <span className="font-mono text-foreground">{connection.stripe_account_id}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Mode</span>
                  <Badge variant={connection.livemode ? "success" : "warning"}>
                    {connection.livemode ? "Live" : "Test"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={connection.status === "active" ? "success" : "destructive"}>
                    {connection.status}
                  </Badge>
                </div>
                {connection.last_synced_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last synced</span>
                    <span className="text-muted-foreground">{formatDate(connection.last_synced_at)}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">No Stripe account connected.</p>
                <Button asChild size="sm">
                  <Link href="/onboarding/connect">Connect Stripe</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rules */}
        <SettingsRulesSection initialRules={(rules ?? []) as AllocationRule[]} />

        {/* Account */}
        <Card>
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground">{user.email}</span>
            </div>
            <LogoutButton />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
