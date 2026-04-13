import Link from "next/link"
import { Button } from "@/components/ui/button"

const features = [
  {
    title: "Connect Stripe once",
    body: "Read-only OAuth. We pull your payout history and live balance. No credentials stored, no money movement.",
  },
  {
    title: "Set your rules",
    body: "Define how every payout splits — Tax 30%, Ops 10%, Owner Pay, Growth. Apply in order, any mix of percentages, fixed amounts, or remainder.",
  },
  {
    title: "Approve the plan",
    body: "Every payout generates a line-by-line plan in seconds. Plain-language summary included. Approve, edit, or skip — your call every time.",
  },
  {
    title: "Watch reserves build",
    body: "Virtual buckets track every allocation. See exactly how much is reserved for tax, ops, and growth — no second bank account needed.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-semibold text-gray-900 tracking-tight">Sulphor</span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get started free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-2xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full mb-6">
          For solo digital founders · U.S. only · Read-only Stripe access
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-5 leading-tight tracking-tight">
          This money just landed.<br />What do you do with it?
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-lg mx-auto leading-relaxed">
          Sulphor turns each Stripe payout into a simple operating plan.
          Tax holdback, ops buffer, owner pay, growth fund — all in one view.
          Virtual allocations, no bank switching required.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" asChild className="w-full sm:w-auto">
            <Link href="/signup">Connect your Stripe →</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-y border-gray-100 py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
          {features.map((f) => (
            <div key={f.title}>
              <p className="font-semibold text-gray-900 mb-1 text-sm">{f.title}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-xl mx-auto px-6 py-16">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">How it works</h2>
        <ol className="space-y-5">
          {[
            ["Sign up", "Email and password. Takes 30 seconds."],
            ["Connect Stripe", "OAuth, read-only. No credentials stored."],
            ["Set your rules", "Pre-filled defaults. Edit to match your situation."],
            ["Approve plans", "Every payout generates a plan. You approve, skip, or adjust."],
          ].map(([step, desc], i) => (
            <li key={step} className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-gray-900 text-white rounded-full text-xs flex items-center justify-center font-bold">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">{step}</p>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-gray-100 py-14 text-center px-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Stop guessing when a payout lands</h2>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
          Free to start. No credit card. Just connect Stripe and see your first plan in under two minutes.
        </p>
        <Button size="lg" asChild>
          <Link href="/signup">Get started free</Link>
        </Button>
      </section>

      <footer className="border-t border-gray-100 py-6 px-6 text-center">
        <p className="text-xs text-gray-400">
          Sulphor · Not a bank · No money movement · Read-only Stripe access
        </p>
      </footer>
    </div>
  )
}
