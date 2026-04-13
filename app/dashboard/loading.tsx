import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Skeleton className="h-5 w-20" />
      </div>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-8">
            <div className="space-y-2"><Skeleton className="h-8 w-28" /><Skeleton className="h-3 w-16" /></div>
            <div className="space-y-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-3 w-14" /></div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-2">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-14 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
          <Skeleton className="h-4 w-24" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
