'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useFloatingUserMessage } from '@/lib/hooks/useFloatingUserMessage';
import { ChatBubbleIcon, ArrowDownIcon } from '@/components/icons';
import { useTranslations } from 'next-intl';
import FilteringHeader from './FilteringHeader';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';
import LoadMoreButton from './LoadMoreButton';
import ConversationItem from './ConversationItem';

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

  const scrollToElement = useCallback((element: HTMLDivElement, additionalOffset: number = 0) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const toggleExpand = useCallback((index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      newSet.has(index) ? newSet.delete(index) : newSet.add(index);
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
  }, [conversations, getDisplayMessages, setTallGroups, headerHeight]);

  return (
    <div className="bg-gray-100 rounded-lg overflow-hidden">
      {/* Floating user message - Fixed position relative to viewport */}
      {floatingUserMessage && (
        <div className="fixed left-0 right-0 z-40 px-4 animate-fade-in" style={{ top: `${headerHeight}px` }}>
          <div className="max-w-7xl mx-auto">
            <div
              onClick={() => {
                const element = userMessageRefs.current.get(floatingUserMessage.groupIndex);
                if (element) scrollToElement(element);
              }}
              className="relative w-full bg-gradient-to-r from-blue-100 via-indigo-100 to-blue-100 border-y-2 border-blue-300 hover:border-blue-500 px-5 py-3 transition-all shadow-context-bar hover:shadow-context-bar-hover group backdrop-blur-sm cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 text-blue-600">
                  <ChatBubbleIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-600 font-medium mb-0.5">{t('respondingTo')}</p>
                  <p className="text-sm text-gray-700 line-clamp-2 group-hover:text-gray-900">
                    {floatingUserMessage.message.content}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const element = lastAssistantMessageRefs.current.get(floatingUserMessage.groupIndex);
                      if (element) scrollToElement(element, CONTEXT_BAR_HEIGHT);
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-xs font-medium"
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
