/**
 * Conversation List Skeleton Loader
 *
 * Displays a loading placeholder while conversations are being fetched.
 * Matches the visual structure of the actual ConversationList component.
 */
export default function ConversationListSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Skeleton for 3 conversation groups */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          {/* User message skeleton */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>

          {/* Assistant message skeleton */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-4 bg-gray-200 rounded w-4/6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
