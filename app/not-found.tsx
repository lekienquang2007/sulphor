import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-4xl font-bold text-gray-900 mb-2">404</p>
        <p className="text-sm text-gray-500 mb-6">This page doesn&apos;t exist.</p>
        <Link href="/dashboard" className="text-sm text-gray-900 underline hover:no-underline">
          Go to home
        </Link>
      </div>
    </div>
  )
}
