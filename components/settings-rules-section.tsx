"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import AssistantPanel from "@/components/assistant-panel"
import type { AllocationRule } from "@/lib/rules-engine"

function ruleDisplayValue(r: AllocationRule): string {
  if (r.rule_type === "percentage") return `${r.value}%`
  if (r.rule_type === "fixed_amount") return `$${r.value} fixed`
  return "remainder"
}

export default function SettingsRulesSection({
  initialRules,
}: {
  initialRules: AllocationRule[]
}) {
  const [rules, setRules] = useState<AllocationRule[]>(initialRules)

  const reload = useCallback(async () => {
    const res = await fetch("/api/rules")
    const data = await res.json()
    setRules(data.rules ?? [])
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allocation Rules</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AssistantPanel existingRules={rules} onApproved={reload} />

        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground/70">No rules configured.</p>
        ) : (
          <div className="space-y-2">
            {rules.map((r) => (
              <div key={r.id} className="flex justify-between text-sm">
                <span className="text-foreground/80">{r.label}</span>
                <span className="text-muted-foreground">{ruleDisplayValue(r)}</span>
              </div>
            ))}
          </div>
        )}

        <Button asChild size="sm" variant="outline" className="w-full">
          <a href="/onboarding/rules">Edit rules manually</a>
        </Button>
      </CardContent>
    </Card>
  )
}
