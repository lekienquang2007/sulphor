import Link from "next/link"
import { Button } from "@/components/ui/button"

const FREE_FEATURES = [
  "10 payouts processed, free",
  "Unlimited allocation rules",
  "Virtual reserve buckets",
  "AI rule drafting assistant",
  "Payout plan history",
  "Manual bucket adjustments",
]

const STANDARD_FEATURES = [
  "Unlimited payouts processed",
  "Everything in Free",
  "Priority support",
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-semibold text-gray-900 tracking-tight">
            Sulphor
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm font-medium text-gray-900">
              Pricing
            </Link>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get started free</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="max-w-xl mx-auto px-6 pt-16 pb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
          Simple, honest pricing
        </h1>
        <p className="text-gray-500 text-base">
          Start free. Upgrade when your payouts keep coming.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-20 grid sm:grid-cols-2 gap-6">
        {/* Free */}
        <div className="border border-gray-200 rounded-2xl p-8 flex flex-col">
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-500 mb-1">Free</p>
            <p className="text-4xl font-bold text-gray-900">$0</p>
            <p className="text-sm text-gray-400 mt-1">No credit card required</p>
          </div>
          <ul className="space-y-3 flex-1 mb-8">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-gray-400 mt-0.5 shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Button variant="outline" asChild className="w-full">
            <Link href="/signup">Get started free</Link>
          </Button>
        </div>

        {/* Standard */}
        <div className="border-2 border-gray-900 rounded-2xl p-8 flex flex-col relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-gray-900 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Most popular
            </span>
          </div>
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-500 mb-1">Standard</p>
            <div className="flex items-end gap-1">
              <p className="text-4xl font-bold text-gray-900">$9.99</p>
              <p className="text-sm text-gray-400 mb-1.5">/month</p>
            </div>
            <p className="text-sm text-gray-400 mt-1">Cancel anytime</p>
          </div>
          <ul className="space-y-3 flex-1 mb-8">
            {STANDARD_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-gray-900 mt-0.5 shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Button asChild className="w-full">
            <Link href="/api/billing/checkout">Upgrade to Standard</Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-gray-100 py-10 px-6">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-sm text-gray-500 mb-1">
            All allocations are virtual — no money movement, no custody, no extra bank accounts.
          </p>
          <p className="text-sm text-gray-400">
            U.S. only · Read-only Stripe access · Not a bank
          </p>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-6 px-6 text-center">
        <p className="text-xs text-gray-400">
          Sulphor · Not a bank · No money movement · Read-only Stripe access
        </p>
      </footer>
    </div>
  )
}
