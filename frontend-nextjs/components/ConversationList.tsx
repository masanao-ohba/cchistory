'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import MessageItem from './MessageItem';
import { renderMarkdown, copyToClipboard } from '@/lib/utils/markdown';

interface Message {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  uuid?: string;
  session_id?: string;
  is_search_match?: boolean;
  search_keyword?: string;
}

interface NewMessageManager {
  getDisplayMessages: (group: Message[], groupIndex: number) => Message[];
  hasUnreadMessages: (group: Message[], groupIndex: number) => boolean;
  getUnreadCount: (group: Message[], groupIndex: number) => number;
  showNewMessages: (group: Message[], groupIndex: number) => void;
}

interface ConversationListProps {
  conversations: Message[][];
  loading?: boolean;
  hasMore?: boolean;
  totalThreads?: number;
  totalMessages?: number;
  actualThreads?: number;
  actualMessages?: number;
  newMessageManager?: NewMessageManager | null;
  onLoadMore?: () => void;
  onShowNewMessages?: (params: { group: Message[]; groupIndex: number }) => void;
}

export default function ConversationList({
  conversations = [],
  loading = false,
  hasMore = false,
  totalThreads = 0,
  totalMessages = 0,
  actualThreads = 0,
  actualMessages = 0,
  newMessageManager = null,
  onLoadMore,
  onShowNewMessages,
}: ConversationListProps) {
  const t = useTranslations('conversations');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [lastLoadedCount, setLastLoadedCount] = useState(0);

  const toggleExpand = useCallback((index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const handleCodeCopy = useCallback((event: React.MouseEvent) => {
    const button = (event.target as HTMLElement).closest('.copy-button');
    if (button) {
      const codeId = button.getAttribute('data-code-id');
      if (codeId) {
        copyToClipboard(codeId);
      }
    }
  }, []);

  const shouldShowToggleButton = useCallback((content: string) => {
    // Show button if more than 3 lines or content is too long
    const lines = content.split('\n');
    return lines.length > 3 || content.length > 200;
  }, []);

  const getDisplayMessages = useCallback(
    (group: Message[], groupIndex: number) => {
      if (!newMessageManager || !Array.isArray(group)) {
        return Array.isArray(group) ? group : [];
      }
      return newMessageManager.getDisplayMessages(group, groupIndex);
    },
    [newMessageManager]
  );

  const shouldShowNewMessageButton = useCallback(
    (group: Message[], groupIndex: number) => {
      if (!newMessageManager || !Array.isArray(group)) {
        return false;
      }
      return newMessageManager.hasUnreadMessages(group, groupIndex);
    },
    [newMessageManager]
  );

  const getUnreadMessageCount = useCallback(
    (group: Message[], groupIndex: number) => {
      if (!newMessageManager || !Array.isArray(group)) {
        return 0;
      }
      return newMessageManager.getUnreadCount(group, groupIndex);
    },
    [newMessageManager]
  );

  const showNewMessages = useCallback(
    (group: Message[], groupIndex: number) => {
      onShowNewMessages?.({ group, groupIndex });
    },
    [onShowNewMessages]
  );

  const handleLoadMore = useCallback(() => {
    const prevCount = actualThreads;
    onLoadMore?.();

    // Wait a bit and calculate newly loaded count
    setTimeout(() => {
      const newCount = actualThreads;
      setLastLoadedCount(newCount - prevCount);

      // Hide message after 3 seconds
      setTimeout(() => {
        setLastLoadedCount(0);
      }, 3000);
    }, 500);
  }, [actualThreads, onLoadMore]);

  const loadMoreRangeText = () => {
    if (!totalThreads || actualThreads === 0) return '';

    const start = actualThreads + 1;
    const defaultBatchSize = 50;
    const remaining = totalThreads - actualThreads;
    const end = actualThreads + Math.min(defaultBatchSize, remaining);

    return `(${start.toLocaleString()} - ${end.toLocaleString()})`;
  };

  return (
    <div className="bg-gray-100 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 px-4 py-2 border-b border-gray-200/60 rounded-t-lg rounded-b-lg mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{t('title')}</h2>
        <p className="text-sm text-gray-600 mt-1">
          {totalThreads && totalThreads > actualThreads
            ? t('showingThreadsFiltered', {
                threads: actualThreads.toLocaleString(),
                messages: actualMessages.toLocaleString(),
                totalThreads: totalThreads.toLocaleString()
              })
            : t('showingThreads', {
                threads: actualThreads.toLocaleString(),
                messages: actualMessages.toLocaleString()
              })}
        </p>
      </div>

      {/* Loading */}
      {loading && conversations.length === 0 && (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-gray-500 mt-4">{t('loading')}</p>
        </div>
      )}

      {/* No conversations */}
      {!loading && conversations.length === 0 && (
        <div className="p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">💬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noConversations')}</h3>
          <p className="text-gray-500">{t('noConversationsHint')}</p>
        </div>
      )}

      {/* Conversation list */}
      {conversations.length > 0 && (
        <div className="space-y-6">
          {conversations.map((threadGroup, threadIndex) => (
            <div
              key={`thread-${threadIndex}`}
              className="bg-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <div className="space-y-3">
                {getDisplayMessages(threadGroup, threadIndex).map((conversation, index) => (
                  <MessageItem
                    key={`${conversation.session_id}-${index}`}
                    conversation={conversation}
                    index={Number(index)}
                    expandedItems={expandedItems}
                    renderMarkdown={renderMarkdown}
                    handleCodeCopy={handleCodeCopy}
                    shouldShowToggleButton={shouldShowToggleButton}
                    onToggleExpand={toggleExpand}
                  />
                ))}
              </div>

              {/* Show new messages button */}
              {shouldShowNewMessageButton(threadGroup, threadIndex) && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => showNewMessages(threadGroup, threadIndex)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    {t('loadMore')} ({getUnreadMessageCount(threadGroup, threadIndex)})
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load more button */}
      {hasMore && (
        <div className="p-6 bg-transparent border-t border-gray-200/60 rounded-b-lg">
          {lastLoadedCount > 0 && (
            <div className="mb-3 text-center text-sm text-green-600 font-medium animate-pulse">
              ✓ {t('newConversationsLoaded', { count: lastLoadedCount })}
            </div>
          )}
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className={`w-full px-4 py-2 bg-[#667eea] text-white rounded-md hover:bg-[#5a67d8] focus:outline-none focus:ring-2 focus:ring-[#667eea] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ${loading ? 'animate-pulse' : ''}`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {t('loading')}
              </span>
            ) : (
              <span>{t('loadMore')} {loadMoreRangeText()}</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
