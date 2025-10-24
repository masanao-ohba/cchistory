/**
 * Token Usage Bar Skeleton Loader
 *
 * Displays a loading placeholder while token usage data is being fetched.
 * Matches the compact mode of TokenUsageBar component.
 */
export default function TokenUsageBarSkeleton() {
  return (
    <div className="py-2 px-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 animate-pulse">
      <div className="flex items-center gap-3">
        {/* Icon skeleton */}
        <div className="flex-shrink-0 w-4 h-4 bg-indigo-200 rounded" />

        {/* Progress bar skeleton */}
        <div className="flex-1 min-w-0">
          <div className="h-2 bg-gray-200 rounded-full" />
        </div>

        {/* Token count skeleton */}
        <div className="flex-shrink-0 w-12 h-4 bg-gray-200 rounded" />

        {/* Timer skeleton */}
        <div className="flex-shrink-0 w-16 h-4 bg-gray-200 rounded" />

        {/* Expand button skeleton */}
        <div className="flex-shrink-0 w-4 h-4 bg-indigo-200 rounded" />
      </div>
    </div>
  );
}
