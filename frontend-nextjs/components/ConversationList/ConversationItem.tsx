'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import MessageItem, { Avatar, formatTimestamp } from '@/components/MessageItem';
import { copyToClipboard } from '@/lib/utils/markdown';
import { CheckIcon, ClipboardIcon, LinkIcon } from '@/components/icons';
import { Message } from '@/lib/types/message';
import {
  copyButtonStyles,
  conversationCard,
  continuationIndicator,
  primaryButton,
  timestampStyles,
} from '@/lib/styles';

interface ConversationItemProps {
  displayMessages: Message[];
  threadIndex: number;
  expandedItems: Set<number>;
  userMessageRef: (el: HTMLDivElement | null) => void;
  lastAssistantRef: (el: HTMLDivElement | null) => void;
  onToggleExpand: (index: number) => void;
  showNewMessageButton: boolean;
  unreadCount: number;
  onShowNewMessages: () => void;
  highlightedMessageId: string | null;
  onMessageHover: (messageId: string | null) => void;
}

// Message header component (GitHub PR style)
function MessageHeader({
  message,
  isUser,
  onCopy,
}: {
  message: Message;
  isUser: boolean;
  onCopy: () => void;
}) {
  const t = useTranslations('conversations');
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    onCopy();
    setTimeout(() => setIsCopied(false), 2000);
  }, [message.content, onCopy]);

  return (
    <div className="flex items-center gap-2 mb-2">
      {/* Avatar on timeline */}
      <div className="relative z-10 flex-shrink-0">
        <Avatar isUser={isUser} size="sm" />
      </div>

      {/* Horizontal connector line */}
      <div className={`w-4 h-0.5 flex-shrink-0 ${isUser ? 'bg-blue-300 dark:bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`} />

      {/* Name and action */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className={`text-sm font-semibold ${isUser ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
          {isUser ? t('user') : t('assistant')}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {isUser ? t('commented') : t('replied')}
        </span>
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={`${copyButtonStyles(isCopied)} p-1 flex-shrink-0`}
        title={isCopied ? t('copied') : t('copyMessage')}
      >
        {isCopied ? <CheckIcon className="w-3.5 h-3.5" /> : <ClipboardIcon className="w-3.5 h-3.5" />}
      </button>

      {/* Timestamp */}
      <time className={`${timestampStyles} flex-shrink-0`}>
        {formatTimestamp(message.timestamp)}
      </time>
    </div>
  );
}

export default function ConversationItem({
  displayMessages,
  threadIndex,
  expandedItems,
  userMessageRef,
  lastAssistantRef,
  onToggleExpand,
  showNewMessageButton,
  unreadCount,
  onShowNewMessages,
  highlightedMessageId,
  onMessageHover,
}: ConversationItemProps) {
  const t = useTranslations('conversations');

  const userMessage = displayMessages.find(msg => msg.type === 'user');
  const assistantMessages = displayMessages.filter(msg => msg.type === 'assistant');

  const handleCodeCopy = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const button = target.closest('.copy-button');
    if (button) {
      const codeId = button.getAttribute('data-code-id');
      if (codeId) {
        copyToClipboard(codeId);
      }
      return;
    }
    if (target.tagName === 'CODE') {
      const code = target.textContent || '';
      navigator.clipboard.writeText(code).catch(err => {
        console.error('Failed to copy code:', err);
      });
    }
  };

  const shouldShowToggleButton = (content: string) => {
    const lines = content.split('\n');
    return lines.length > 3 || content.length > 200;
  };

  const totalMessages = (userMessage ? 1 : 0) + assistantMessages.length;

  return (
    <div className={conversationCard}>
      <div className="p-4">
        {/* Session Continuation Indicator */}
        {userMessage?.is_continuation_session && (
          <div className={continuationIndicator}>
            <div className="flex items-center text-sm text-blue-700 dark:text-blue-400">
              <LinkIcon className="w-4 h-4 mr-2" />
              <span className="font-medium">{t('continuedFromPreviousSession')}</span>
              {userMessage.parent_session_id && (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">
                  {userMessage.parent_session_id.substring(0, 8)}...
                </span>
              )}
            </div>
          </div>
        )}

        {/* GitHub PR Style Timeline */}
        <div className="relative">
          {/* Vertical Timeline Line */}
          {totalMessages > 1 && (
            <div className="absolute left-3 top-6 bottom-6 w-0.5 bg-gray-200 dark:bg-gray-700" />
          )}

          {/* User Message */}
          {userMessage && (
            <div className="relative" ref={userMessageRef}>
              {/* Header Row */}
              <MessageHeader
                message={userMessage}
                isUser={true}
                onCopy={() => {}}
              />

              {/* Content Box - indented from timeline */}
              <div className="ml-10 mb-4">
                <MessageItem
                  key={`${userMessage.session_id}-user`}
                  conversation={userMessage}
                  index={0}
                  expandedItems={expandedItems}
                  handleCodeCopy={handleCodeCopy}
                  shouldShowToggleButton={shouldShowToggleButton}
                  onToggleExpand={onToggleExpand}
                  isHighlighted={highlightedMessageId === `${threadIndex}-user`}
                  onHover={(isHovered) => onMessageHover(isHovered ? `${threadIndex}-user` : null)}
                  contentOnly={true}
                />
              </div>
            </div>
          )}

          {/* Assistant Messages - more indented to show thread hierarchy */}
          {assistantMessages.map((conversation, index) => (
            <div
              key={`${conversation.session_id}-${index}`}
              className="relative"
              ref={index === assistantMessages.length - 1 ? lastAssistantRef : undefined}
            >
              {/* Header Row */}
              <MessageHeader
                message={conversation}
                isUser={false}
                onCopy={() => {}}
              />

              {/* Content Box - more indented than user message */}
              <div className={`ml-14 ${index < assistantMessages.length - 1 ? 'mb-4' : ''}`}>
                <MessageItem
                  conversation={conversation}
                  index={index + 1}
                  expandedItems={expandedItems}
                  handleCodeCopy={handleCodeCopy}
                  shouldShowToggleButton={shouldShowToggleButton}
                  onToggleExpand={onToggleExpand}
                  isHighlighted={highlightedMessageId === `${threadIndex}-assistant-${index}`}
                  onHover={(isHovered) => onMessageHover(isHovered ? `${threadIndex}-assistant-${index}` : null)}
                  contentOnly={true}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Show new messages button */}
      {showNewMessageButton && (
        <div className="px-4 pb-4 pt-0 text-center border-t border-gray-100 dark:border-gray-800 mt-2">
          <button
            onClick={onShowNewMessages}
            className={`mt-3 text-sm ${primaryButton}`}
          >
            {t('loadMore')} ({unreadCount})
          </button>
        </div>
      )}
    </div>
  );
}
