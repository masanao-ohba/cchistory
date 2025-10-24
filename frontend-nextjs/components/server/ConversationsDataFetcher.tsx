import { fetchConversations } from '@/lib/api/server';
import HomeContent from '@/components/HomeContent';

interface ConversationsDataFetcherProps {
  initialProjects?: any;
  initialTokenUsage?: any;
  initialNotificationCount?: number;
}

/**
 * Server Component that fetches conversations data
 *
 * This allows conversations to stream independently from other data.
 */
export default async function ConversationsDataFetcher({
  initialProjects,
  initialTokenUsage,
  initialNotificationCount,
}: ConversationsDataFetcherProps) {
  const conversationsData = await fetchConversations({
    limit: 50,
    sort_order: 'desc',
  }).catch((error) => {
    console.error('[ConversationsDataFetcher] Failed to fetch:', error);
    return {
      conversations: [],
      total_threads: 0,
      total_messages: 0,
      actual_threads: 0,
      actual_messages: 0,
      stats: {
        total_threads: 0,
        total_messages: 0,
        projects: 0,
        daily_thread_counts: {},
      },
    };
  });

  return (
    <HomeContent
      initialConversations={conversationsData}
      initialProjects={initialProjects}
      initialTokenUsage={initialTokenUsage}
      initialNotificationCount={initialNotificationCount}
    />
  );
}
