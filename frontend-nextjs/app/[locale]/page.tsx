import { Suspense } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import ConversationsDataFetcher from '@/components/server/ConversationsDataFetcher';
import ConversationListSkeleton from '@/components/skeletons/ConversationListSkeleton';
import {
  fetchProjects,
  fetchTokenUsage,
  fetchNotificationCount,
} from '@/lib/api/server';

/**
 * Home Page - Server Component with Streaming
 *
 * Fetches critical data immediately, streams conversations independently.
 * Phase 2: Suspense boundaries for progressive rendering.
 */
export default async function Home() {
  // Fetch critical data first (fast, needed for UI shell)
  const [projectsData, tokenUsageData, notificationCount] = await Promise.all([
    fetchProjects().catch((error) => {
      console.error('[Home] Failed to fetch projects:', error);
      return { projects: [] };
    }),
    fetchTokenUsage().catch((error) => {
      console.error('[Home] Failed to fetch token usage:', error);
      return { available: false, current_block: null, error: error.message };
    }),
    fetchNotificationCount().catch((error) => {
      console.error('[Home] Failed to fetch notification count:', error);
      return 0;
    }),
  ]);

  return (
    <ErrorBoundary>
      {/* Stream conversations independently - slower data */}
      <Suspense fallback={<ConversationListSkeleton />}>
        <ConversationsDataFetcher
          initialProjects={projectsData}
          initialTokenUsage={tokenUsageData}
          initialNotificationCount={notificationCount}
        />
      </Suspense>
    </ErrorBoundary>
  );
}
