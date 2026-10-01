import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading state for the media library.
 *
 * Mirrors the page's own shell (heading, toolbar, grid) so the layout does not
 * jump when the rows arrive — a spinner in the middle of an empty screen would
 * be a worse answer than a grey version of what is coming.
 */
export default function MediaLoading() {
  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-7 w-28" />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-full sm:max-w-xs" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-24" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
