"use client"

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center max-w-sm">
            <p className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</p>
            <p className="text-sm text-gray-500 mb-4">An unexpected error occurred. Please try again.</p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-700"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
