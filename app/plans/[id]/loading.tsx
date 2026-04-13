import { Skeleton } from "@/components/ui/skeleton"

export default function PlanDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-5">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <Skeleton className="h-4 w-40" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
