import { Skeleton } from "@/components/ui/skeleton"

export default function HistoryLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Skeleton className="h-5 w-20" />
      </div>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {[1, 2].map((card) => (
          <div key={card} className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
            <Skeleton className="h-4 w-36" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between py-2 border-b border-gray-50">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </main>
    </div>
  )
}
