'use client';

import { useTranslations } from 'next-intl';
import MessageItem from '@/components/MessageItem';
import { copyToClipboard } from '@/lib/utils/markdown';

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
}: ConversationItemProps) {
  const t = useTranslations('conversations');

  const userMessage = displayMessages.find(msg => msg.type === 'user');
  const assistantMessages = displayMessages.filter(msg => msg.type === 'assistant');

  const handleCodeCopy = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;

    // Check if clicked element is copy button or its child (SVG icon)
    const button = target.closest('.copy-button');
    if (button) {
      const codeId = button.getAttribute('data-code-id');
      if (codeId) {
        copyToClipboard(codeId);
      }
      return;
    }

    // Legacy: Direct CODE tag click (keeping for backward compatibility)
    if (target.tagName === 'CODE') {
      const code = target.textContent || '';
      // Find a unique ID or create temporary element for clipboard
      navigator.clipboard.writeText(code).catch(err => {
        console.error('Failed to copy code:', err);
      });
    }
  };

  const shouldShowToggleButton = (content: string) => {
    const lines = content.split('\n');
    return lines.length > 3 || content.length > 200;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all">
      <div className="p-4 space-y-3">
        {/* Session Continuation Indicator */}
        {userMessage?.is_continuation_session && (
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
          <div ref={userMessageRef}>
            <MessageItem
              key={`${userMessage.session_id}-user`}
              conversation={userMessage}
              index={0}
              expandedItems={expandedItems}
              handleCodeCopy={handleCodeCopy}
              shouldShowToggleButton={shouldShowToggleButton}
              onToggleExpand={onToggleExpand}
            />
          </div>
        )}

        {/* Assistant Messages */}
        {assistantMessages.map((conversation, index) => (
          <div
            key={`${conversation.session_id}-${index}`}
            ref={index === assistantMessages.length - 1 ? lastAssistantRef : undefined}
          >
            <MessageItem
              conversation={conversation}
              index={index + 1}
              expandedItems={expandedItems}
              handleCodeCopy={handleCodeCopy}
              shouldShowToggleButton={shouldShowToggleButton}
              onToggleExpand={onToggleExpand}
            />
          </div>
        ))}
      </div>

      {/* Show new messages button */}
      {showNewMessageButton && (
        <div className="p-4 pt-0 text-center">
          <button
            onClick={onShowNewMessages}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer"
          >
            {t('loadMore')} ({unreadCount})
          </button>
        </div>
      )}
    </div>
  );
}
