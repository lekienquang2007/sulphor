"use client"

import Link from "next/link"

export default function PlanError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-sm font-medium text-gray-900 mb-1">Couldn&apos;t load this plan</p>
        <p className="text-xs text-gray-500 mb-4">It may have been removed or you don&apos;t have access.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="text-sm text-gray-900 underline hover:no-underline">Try again</button>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">Go home</Link>
        </div>
      </div>
    </div>
  )
}
