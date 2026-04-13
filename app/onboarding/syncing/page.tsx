"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const steps = [
  "Pulling your payouts...",
  "Reading your balance...",
  "Setting up your workspace...",
]

export default function SyncingPage() {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev < steps.length - 1) return prev + 1
        return prev
      })
    }, 1800)

    // After sync completes (enough time for backend), redirect to rules setup
    const timeout = setTimeout(() => {
      router.push("/onboarding/rules")
    }, 6000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-6" />
        <p className="text-lg font-medium text-gray-900">{steps[stepIndex]}</p>
        <p className="text-sm text-gray-500 mt-2">This takes just a moment</p>
      </div>
    </div>
  )
}
