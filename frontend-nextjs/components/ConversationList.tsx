'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import MessageItem from './MessageItem';
import { renderMarkdown, copyToClipboard } from '@/lib/utils/markdown';
import { useFloatingUserMessage } from '@/lib/hooks/useFloatingUserMessage';
import { ChatBubbleIcon, ArrowDownIcon, LoadingSpinnerIcon } from '@/components/icons';

interface Message {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  uuid?: string;
  session_id?: string;
  is_search_match?: boolean;
  search_keyword?: string;
  is_continuation_session?: boolean;
  parent_session_id?: string;
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
  stickyTopOffset?: number;
  isFiltering?: boolean;
  onLoadMore?: () => void;
  onShowNewMessages?: (params: { group: Message[]; groupIndex: number }) => void;
}

// Constants
const CONTEXT_BAR_HEIGHT = 80;
const LOAD_MORE_NOTIFICATION_DELAY = 500;
const LOAD_MORE_NOTIFICATION_DURATION = 3000;

export default function ConversationList({
  conversations = [],
  loading = false,
  hasMore = false,
  totalThreads = 0,
  actualThreads = 0,
  actualMessages = 0,
  newMessageManager = null,
  stickyTopOffset = 0,
  isFiltering = false,
  onLoadMore,
  onShowNewMessages,
}: ConversationListProps) {
  const t = useTranslations('conversations');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [lastLoadedCount, setLastLoadedCount] = useState(0);
  const [tallGroups, setTallGroups] = useState<Set<number>>(new Set());
  const groupRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const userMessageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const lastAssistantMessageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Use custom hook for floating user message management
  const floatingUserMessage = useFloatingUserMessage(
    conversations,
    tallGroups,
    stickyTopOffset,
    newMessageManager,
    groupRefs,
    userMessageRefs
  );

  // Helper function for smooth scrolling with offset
  const scrollToElement = useCallback((
    element: HTMLDivElement,
    additionalOffset: number = 0
  ) => {
    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - stickyTopOffset - additionalOffset - 10;
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }, [stickyTopOffset]);

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

    setTimeout(() => {
      const newCount = actualThreads;
      setLastLoadedCount(newCount - prevCount);

      setTimeout(() => {
        setLastLoadedCount(0);
      }, LOAD_MORE_NOTIFICATION_DURATION);
    }, LOAD_MORE_NOTIFICATION_DELAY);
  }, [actualThreads, onLoadMore]);

  // Check which message groups are tall enough to need sticky user messages
  useEffect(() => {
    const checkGroupHeights = () => {
      const viewportHeight = window.innerHeight;
      const newTallGroups = new Set<number>();

      groupRefs.current.forEach((element, index) => {
        if (element && conversations[index]) {
          const groupHeight = element.offsetHeight;
          const group = conversations[index];
          const displayMessages = !newMessageManager || !Array.isArray(group)
            ? (Array.isArray(group) ? group : [])
            : newMessageManager.getDisplayMessages(group, index);
          const assistantMessageCount = displayMessages.filter(msg => msg.type === 'assistant').length;

          const isTallByHeight = stickyTopOffset + groupHeight > viewportHeight;
          const isTallByMessageCount = assistantMessageCount >= 4;

          if (isTallByHeight || isTallByMessageCount) {
            newTallGroups.add(index);
          }
        }
      });

      setTallGroups(newTallGroups);
    };

    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        checkGroupHeights();
      });
    }, 100);

    window.addEventListener('resize', checkGroupHeights);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkGroupHeights);
    };
  }, [conversations, stickyTopOffset, expandedItems, newMessageManager]);

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
      {/* Smart Context-Aware Header - Show only when filtering */}
      {isFiltering && conversations.length > 0 && (
        <div className="bg-slate-50/50 px-4 py-2 border-b border-gray-200/60 mb-3">
          <p className="text-xs text-gray-600">
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
      )}

      {loading && conversations.length === 0 && (
        <div className="p-8 text-center">
          <div className="mx-auto w-12 h-12 text-primary-500 animate-spin">
            <LoadingSpinnerIcon className="w-12 h-12" />
          </div>
          <p className="text-gray-500 mt-4">{t('loading')}</p>
        </div>
      )}

      {!loading && conversations.length === 0 && (
        <div className="p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">💬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noConversations')}</h3>
          <p className="text-gray-500">{t('noConversationsHint')}</p>
        </div>
      )}
      {floatingUserMessage && (
        <div
          className="fixed left-0 right-0 z-40 px-4 animate-fade-in"
          style={{ top: `${stickyTopOffset}px` }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent pointer-events-none"></div>

            <div
              onClick={() => {
                const element = userMessageRefs.current.get(floatingUserMessage.groupIndex);
                if (element) {
                  scrollToElement(element);
                }
              }}
              className="relative w-full bg-gradient-to-r from-blue-100 via-indigo-100 to-blue-100 border-y-2 border-blue-300 hover:border-blue-500 px-5 py-3 transition-all duration-200 shadow-context-bar hover:shadow-context-bar-hover group backdrop-blur-sm cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 text-blue-600">
                  <ChatBubbleIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-600 font-medium mb-0.5">
                    {t('respondingTo')}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-2 group-hover:text-gray-900">
                    {floatingUserMessage.message.content}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {/* Jump to Latest (Bottom) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const element = lastAssistantMessageRefs.current.get(floatingUserMessage.groupIndex);
                      if (element) {
                        scrollToElement(element, CONTEXT_BAR_HEIGHT);
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors duration-200 text-xs font-medium"
                    title={t('jumpToLatest')}
                  >
                    <ArrowDownIcon className="w-4 h-4" />
                    {t('jumpToLatest')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversation list */}
      {conversations.length > 0 && (
        <div className="space-y-6">
          {conversations.map((threadGroup, threadIndex) => {
            const displayMessages = getDisplayMessages(threadGroup, threadIndex);
            const userMessage = displayMessages.find(msg => msg.type === 'user');
            const assistantMessages = displayMessages.filter(msg => msg.type === 'assistant');

            return (
              <div
                key={`thread-${threadIndex}`}
                ref={(el) => {
                  if (el) groupRefs.current.set(threadIndex, el);
                  else groupRefs.current.delete(threadIndex);
                }}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <div className="p-4 space-y-3">
                  {/* Session Continuation Indicator */}
                  {userMessage && userMessage.is_continuation_session && (
                    <div className="mb-3 px-3 py-2 bg-indigo-50 border-l-4 border-indigo-400 rounded">
                      <div className="flex items-center text-sm text-indigo-800">
                        <span className="mr-2">🔗</span>
                        <span className="font-medium">{t('continuedFromPreviousSession')}</span>
                        {userMessage.parent_session_id && (
                          <span className="ml-2 text-xs text-indigo-600">
                            (Session: {userMessage.parent_session_id.substring(0, 8)}...)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* User Message */}
                  {userMessage && (
                    <div
                      ref={(el) => {
                        if (el) userMessageRefs.current.set(threadIndex, el);
                        else userMessageRefs.current.delete(threadIndex);
                      }}
                    >
                      <MessageItem
                        key={`${userMessage.session_id}-user`}
                        conversation={userMessage}
                        index={0}
                        expandedItems={expandedItems}
                        renderMarkdown={renderMarkdown}
                        handleCodeCopy={handleCodeCopy}
                        shouldShowToggleButton={shouldShowToggleButton}
                        onToggleExpand={toggleExpand}
                      />
                    </div>
                  )}

                  {/* Assistant Messages */}
                  {assistantMessages.map((conversation, index) => (
                    <div
                      key={`${conversation.session_id}-${index}`}
                      ref={(el) => {
                        // Save reference to last assistant message
                        if (index === assistantMessages.length - 1) {
                          if (el) lastAssistantMessageRefs.current.set(threadIndex, el);
                          else lastAssistantMessageRefs.current.delete(threadIndex);
                        }
                      }}
                    >
                      <MessageItem
                        conversation={conversation}
                        index={Number(index) + 1}
                        expandedItems={expandedItems}
                        renderMarkdown={renderMarkdown}
                        handleCodeCopy={handleCodeCopy}
                        shouldShowToggleButton={shouldShowToggleButton}
                        onToggleExpand={toggleExpand}
                      />
                    </div>
                  ))}
                </div>

                {/* Show new messages button */}
                {shouldShowNewMessageButton(threadGroup, threadIndex) && (
                  <div className="p-4 pt-0 text-center">
                    <button
                      onClick={() => showNewMessages(threadGroup, threadIndex)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                    >
                      {t('loadMore')} ({getUnreadMessageCount(threadGroup, threadIndex)})
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
                <div className="animate-spin -ml-1 mr-3">
                  <LoadingSpinnerIcon className="h-5 w-5 text-white" />
                </div>
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
