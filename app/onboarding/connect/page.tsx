import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ConnectStripePage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const errorMessages: Record<string, string> = {
    access_denied: "You declined the Stripe connection. Try again when ready.",
    missing_params: "Something went wrong. Please try again.",
    db_error: "We had trouble saving your connection. Please try again.",
  }

  const errorMsg = searchParams.error ? errorMessages[searchParams.error] ?? "An error occurred." : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-sm border border-gray-200 text-center">
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Connect your Stripe account</h1>
        <p className="text-gray-500 text-sm mb-6">
          We&apos;ll read your payout history and balance to build your operating plan.
          We never initiate transfers, move funds, or modify your Stripe account in any way.
        </p>

        <ul className="text-left text-sm text-gray-600 space-y-2 mb-8">
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span> Read payout history (last 12 months)
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span> Read current balance
          </li>
          <li className="flex items-center gap-2">
            <span className="text-red-400">✗</span> We never move or modify funds
          </li>
          <li className="flex items-center gap-2">
            <span className="text-red-400">✗</span> We never create charges or payouts
          </li>
        </ul>

        {errorMsg && (
          <p className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-md">{errorMsg}</p>
        )}

        <Button asChild className="w-full">
          <Link href="/api/stripe/connect">Connect Stripe</Link>
        </Button>
      </div>
    </div>
  )
}
