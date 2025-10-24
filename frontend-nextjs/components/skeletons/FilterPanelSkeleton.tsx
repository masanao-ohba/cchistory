/**
 * Filter Panel Skeleton Loader
 *
 * Displays a loading placeholder while filters are being set up.
 */
export default function FilterPanelSkeleton() {
  return (
    <div className="animate-pulse bg-white border-b border-gray-200">
      <div className="px-4 py-4">
        <div className="space-y-4">
          {/* Date range skeleton */}
          <div>
            <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
            <div className="flex gap-3">
              <div className="flex-1 h-10 bg-gray-100 rounded-lg" />
              <div className="w-6 h-10 flex items-center justify-center">
                <div className="w-2 h-2 bg-gray-300 rounded-full" />
              </div>
              <div className="flex-1 h-10 bg-gray-100 rounded-lg" />
            </div>
          </div>

          {/* Project and sort skeleton */}
          <div className="flex gap-6">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-24 bg-gray-100 rounded-lg" />
            </div>
            <div className="flex-shrink-0">
              <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
              <div className="space-y-2">
                <div className="h-6 bg-gray-100 rounded w-32" />
                <div className="h-6 bg-gray-100 rounded w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
