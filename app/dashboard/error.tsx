"use client"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-sm font-medium text-gray-900 mb-1">Something went wrong loading your home screen</p>
        <p className="text-xs text-gray-500 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="text-sm text-gray-900 underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
