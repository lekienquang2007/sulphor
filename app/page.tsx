import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <span className="font-semibold text-gray-900">Sulphor</span>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
          This money just landed.<br />What do you do with it?
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
          Sulphor turns each Stripe payout into a simple operating plan — tax holdback,
          ops buffer, owner pay, growth fund. Virtual allocations, no bank switching required.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/signup">Connect your Stripe</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>

        <p className="text-xs text-gray-400 mt-6">U.S. only · Read-only Stripe access · No money movement</p>
      </main>
    </div>
  )
}
