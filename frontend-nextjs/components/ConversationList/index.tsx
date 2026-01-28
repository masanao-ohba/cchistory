'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useFloatingUserMessage } from '@/lib/hooks/useFloatingUserMessage';
import { ChatBubbleIcon, ArrowToTopIcon, ArrowToBottomIcon } from '@/components/icons';
import { useTranslations } from 'next-intl';
import FilteringHeader from './FilteringHeader';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';
import LoadMoreButton from './LoadMoreButton';
import ConversationItem from './ConversationItem';
import { Message } from '@/lib/types/message';

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
  headerHeight?: number;
  isFiltering?: boolean;
  groupRefs?: React.MutableRefObject<Map<number, HTMLDivElement>>;
  userMessageRefs?: React.MutableRefObject<Map<number, HTMLDivElement>>;
  lastAssistantMessageRefs?: React.MutableRefObject<Map<number, HTMLDivElement>>;
  tallGroups?: Set<number>;
  setTallGroups?: (groups: Set<number>) => void;
  onLoadMore?: () => void;
  onShowNewMessages?: (params: { group: Message[]; groupIndex: number }) => void;
}

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
  headerHeight = 220,
  isFiltering = false,
  groupRefs: externalGroupRefs,
  userMessageRefs: externalUserMessageRefs,
  lastAssistantMessageRefs: externalLastAssistantMessageRefs,
  tallGroups: externalTallGroups,
  setTallGroups: externalSetTallGroups,
  onLoadMore,
  onShowNewMessages,
}: ConversationListProps) {
  const t = useTranslations('conversations');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [lastLoadedCount, setLastLoadedCount] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced hover handler to prevent flickering
  const handleMessageHover = useCallback((messageId: string | null) => {
    if (messageId) {
      // Immediately show highlight, cancel any pending hide
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setHighlightedMessageId(messageId);
    } else {
      // Delay hiding to allow smooth transition between messages
      hideTimeoutRef.current = setTimeout(() => {
        setHighlightedMessageId(null);
        hideTimeoutRef.current = null;
      }, 150);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Use external refs if provided, otherwise create internal ones
  const internalGroupRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const internalUserMessageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const internalLastAssistantMessageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [internalTallGroups, internalSetTallGroups] = useState<Set<number>>(new Set());

  const groupRefs = externalGroupRefs || internalGroupRefs;
  const userMessageRefs = externalUserMessageRefs || internalUserMessageRefs;
  const lastAssistantMessageRefs = externalLastAssistantMessageRefs || internalLastAssistantMessageRefs;
  const tallGroups = externalTallGroups || internalTallGroups;
  const setTallGroups = externalSetTallGroups || internalSetTallGroups;

  const floatingUserMessage = useFloatingUserMessage(
    conversations,
    tallGroups,
    newMessageManager,
    groupRefs,
    userMessageRefs
  );

  const scrollToElement = useCallback((element: HTMLDivElement) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

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

  const getDisplayMessages = useCallback(
    (group: Message[], groupIndex: number): Message[] => {
      if (!newMessageManager || !Array.isArray(group)) return Array.isArray(group) ? group : [];
      return newMessageManager.getDisplayMessages(group, groupIndex);
    },
    [newMessageManager]
  );

  const shouldShowNewMessageButton = useCallback(
    (group: Message[], groupIndex: number): boolean => {
      if (!newMessageManager || !Array.isArray(group)) return false;
      return newMessageManager.hasUnreadMessages(group, groupIndex);
    },
    [newMessageManager]
  );

  const getUnreadMessageCount = useCallback(
    (group: Message[], groupIndex: number): number => {
      if (!newMessageManager || !Array.isArray(group)) return 0;
      return newMessageManager.getUnreadCount(group, groupIndex);
    },
    [newMessageManager]
  );

  const handleLoadMore = useCallback(() => {
    const prevCount = actualThreads;
    onLoadMore?.();
    setTimeout(() => {
      setLastLoadedCount(actualThreads - prevCount);
      setTimeout(() => setLastLoadedCount(0), LOAD_MORE_NOTIFICATION_DURATION);
    }, LOAD_MORE_NOTIFICATION_DELAY);
  }, [actualThreads, onLoadMore]);

  useEffect(() => {
    const checkGroupHeights = () => {
      const viewportHeight = window.innerHeight;
      const newTallGroups = new Set<number>();

      groupRefs.current.forEach((element, index) => {
        if (element && conversations[index]) {
          const groupHeight = element.offsetHeight;
          const group = conversations[index];
          const displayMessages = getDisplayMessages(group, index);
          const assistantMessageCount = displayMessages.filter(msg => msg.type === 'assistant').length;

          const isTallByHeight = headerHeight + groupHeight > viewportHeight;
          const isTallByMessageCount = assistantMessageCount >= 4;

          if (isTallByHeight || isTallByMessageCount) {
            newTallGroups.add(index);
          }
        }
      });

      setTallGroups(newTallGroups);
    };

    const timeoutId = setTimeout(() => {
      requestAnimationFrame(checkGroupHeights);
    }, 100);

    window.addEventListener('resize', checkGroupHeights);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkGroupHeights);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, getDisplayMessages, setTallGroups, headerHeight]);

  return (
    <div className="bg-[#FAFAFA] dark:bg-gray-900 rounded-lg overflow-hidden relative">
      {/* Overlay for message highlight */}
      <div
        className={`fixed inset-0 bg-black/10 z-40 pointer-events-none transition-opacity duration-200 ${
          highlightedMessageId ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />
      {/* Floating user message - Fixed position relative to viewport */}
      {floatingUserMessage && (
        <div className="fixed left-0 right-0 z-[60] px-4 animate-fadeIn" style={{ top: `${headerHeight}px` }}>
          <div className="max-w-7xl mx-auto">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg pl-1 pr-2 py-2 flex items-center gap-2 transition-all hover:shadow-xl overflow-hidden">
              {/* Blue left border indicator */}
              <div className="flex-shrink-0 w-1 self-stretch bg-blue-500 rounded-full" />

              <div className="flex-shrink-0 text-blue-600">
                <ChatBubbleIcon />
              </div>

              <div
                className="flex-1 min-w-0 cursor-pointer overflow-hidden"
                onClick={() => {
                  const element = userMessageRefs.current.get(floatingUserMessage.groupIndex);
                  if (element) scrollToElement(element);
                }}
              >
                <p className="text-xs font-medium text-blue-600 mb-0.5">{t('respondingTo')}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                  {floatingUserMessage.message.content}
                </p>
              </div>

              {/* Navigation buttons - icon only for compact display */}
              <div className="flex-shrink-0 flex items-center gap-1">
                <button
                  onClick={() => {
                    const element = userMessageRefs.current.get(floatingUserMessage.groupIndex);
                    if (element) scrollToElement(element);
                  }}
                  className="flex items-center justify-center w-8 h-8 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors cursor-pointer"
                  title={t('backToQuestion')}
                  aria-label={t('backToQuestion')}
                >
                  <ArrowToTopIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const element = lastAssistantMessageRefs.current.get(floatingUserMessage.groupIndex);
                    if (element) scrollToElement(element);
                  }}
                  className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors cursor-pointer"
                  title={t('jumpToLatest')}
                  aria-label={t('jumpToLatest')}
                >
                  <ArrowToBottomIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {isFiltering && conversations.length > 0 && (
          <FilteringHeader
            totalThreads={totalThreads}
            actualThreads={actualThreads}
            actualMessages={actualMessages}
          />
        )}

        {loading && conversations.length === 0 && <LoadingState />}
        {!loading && conversations.length === 0 && <EmptyState />}

        {conversations.length > 0 && (
          <div className="space-y-6">
            {conversations.map((threadGroup, threadIndex) => (
              <div
                key={`thread-${threadIndex}`}
                ref={(el) => {
                  if (el) groupRefs.current.set(threadIndex, el);
                  else groupRefs.current.delete(threadIndex);
                }}
              >
                <ConversationItem
                  displayMessages={getDisplayMessages(threadGroup, threadIndex)}
                  threadIndex={threadIndex}
                  expandedItems={expandedItems}
                  userMessageRef={(el) => {
                    if (el) userMessageRefs.current.set(threadIndex, el);
                    else userMessageRefs.current.delete(threadIndex);
                  }}
                  lastAssistantRef={(el) => {
                    if (el) lastAssistantMessageRefs.current.set(threadIndex, el);
                    else lastAssistantMessageRefs.current.delete(threadIndex);
                  }}
                  onToggleExpand={toggleExpand}
                  showNewMessageButton={shouldShowNewMessageButton(threadGroup, threadIndex)}
                  unreadCount={getUnreadMessageCount(threadGroup, threadIndex)}
                  onShowNewMessages={() => onShowNewMessages?.({ group: threadGroup, groupIndex: threadIndex })}
                  highlightedMessageId={highlightedMessageId}
                  onMessageHover={handleMessageHover}
                />
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <LoadMoreButton
            loading={loading}
            totalThreads={totalThreads}
            actualThreads={actualThreads}
            lastLoadedCount={lastLoadedCount}
            onLoadMore={handleLoadMore}
          />
        )}
      </div>
    </div>
  );
}
