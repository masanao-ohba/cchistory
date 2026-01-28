'use client';

import { useState, useEffect, memo, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { CheckIcon, ClipboardIcon } from './icons';
import { Message } from '@/lib/types/message';
import {
  messageContainerStyles,
  indicatorStyles,
  contentStyles,
  toggleButtonStyles,
  copyButtonStyles,
  avatarStyles,
  roleLabelStyles,
  timestampStyles,
} from '@/lib/styles';

interface MessageItemProps {
  conversation: Message;
  index: number;
  expandedItems: Set<number>;
  handleCodeCopy: (event: React.MouseEvent) => void;
  shouldShowToggleButton: (content: string) => boolean;
  onToggleExpand: (index: number) => void;
  isHighlighted?: boolean;
  onHover?: (isHovered: boolean) => void;
  /** If true, renders only the content box without header (for GitHub PR style layout) */
  contentOnly?: boolean;
}

// Avatar component with initials - exported for use in ConversationItem
export const Avatar = memo(function Avatar({
  isUser,
  size = 'md'
}: {
  isUser: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={avatarStyles(isUser, size)}>
      {isUser ? 'U' : 'A'}
    </div>
  );
});

// Timestamp formatter - exported for use in ConversationItem
export const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(date);
};

const MessageItem = memo(function MessageItem({
  conversation,
  index,
  expandedItems,
  handleCodeCopy,
  shouldShowToggleButton,
  onToggleExpand,
  isHighlighted = false,
  onHover,
  contentOnly = false,
}: MessageItemProps) {
  const t = useTranslations('conversations');
  const isUser = conversation.type === 'user';
  const isExpanded = expandedItems.has(index);
  const workerRef = useRef<Worker | null>(null);
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Use centralized style utilities
  const containerClasses = messageContainerStyles({ isHighlighted, contentOnly });
  const indicatorClasses = indicatorStyles(isUser);
  const contentClasses = contentStyles(isExpanded);
  const toggleClasses = toggleButtonStyles(isUser);
  const copyClasses = copyButtonStyles(isCopied);

  const handleCopyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(conversation.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  }, [conversation.content]);

  // Intersection Observer to detect visibility
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
          }
        });
      },
      { rootMargin: '200px' }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [isVisible]);

  // Use Web Worker for markdown processing (only when visible)
  useEffect(() => {
    if (!isVisible) return;

    if (typeof window !== 'undefined' && !workerRef.current) {
      workerRef.current = new Worker(new URL('@/lib/workers/markdown.worker', import.meta.url));

      workerRef.current.onmessage = (e: MessageEvent) => {
        const { id, html } = e.data;
        if (id === conversation.uuid || id === `${index}-fallback`) {
          setRenderedContent(html);
          setIsProcessing(false);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
        setRenderedContent(`<p class="text-red-500 dark:text-red-400">Error processing markdown</p>`);
        setIsProcessing(false);
      };
    }

    if (workerRef.current) {
      setIsProcessing(true);
      workerRef.current.postMessage({
        id: conversation.uuid || `${index}-fallback`,
        content: conversation.content,
        searchKeyword: conversation.is_search_match ? conversation.search_keyword : null
      });
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [isVisible, conversation.content, conversation.uuid, conversation.is_search_match, conversation.search_keyword, index]);

  // GitHub PR style: content only mode
  if (contentOnly) {
    return (
      <div
        ref={containerRef}
        className={containerClasses}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
      >
        <div className="p-3">
          {/* Content */}
          <div
            className={contentClasses}
            dangerouslySetInnerHTML={{
              __html: isProcessing
                ? `<pre class="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm">${conversation.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`
                : renderedContent
            }}
            onClick={handleCodeCopy}
          />

          {/* Expand/Collapse button */}
          {shouldShowToggleButton(conversation.content) && (
            <button onClick={() => onToggleExpand(index)} className={toggleClasses}>
              {isExpanded ? t('collapse') : t('showMore')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Original full card style
  return (
    <div
      ref={containerRef}
      className={containerClasses}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      {/* Left side indicator bar */}
      <div className={indicatorClasses} />

      {/* Main content area */}
      <div className="flex-1 p-4">
        {/* Meta information */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar isUser={isUser} />
            <span className={roleLabelStyles(isUser)}>
              {isUser ? t('user') : t('assistant')}
            </span>
          </div>

          {/* Copy button and Timestamp */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMessage}
              className={copyClasses}
              title={isCopied ? t('copied') : t('copyMessage')}
              aria-label={t('copyMessage')}
            >
              {isCopied ? <CheckIcon /> : <ClipboardIcon />}
            </button>
            <time className={timestampStyles}>{formatTimestamp(conversation.timestamp)}</time>
          </div>
        </div>

        {/* Content */}
        <div
          className={contentClasses}
          dangerouslySetInnerHTML={{
            __html: isProcessing
              ? `<pre class="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm">${conversation.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`
              : renderedContent
          }}
          onClick={handleCodeCopy}
        />

        {/* Expand/Collapse button */}
        {shouldShowToggleButton(conversation.content) && (
          <button onClick={() => onToggleExpand(index)} className={toggleClasses}>
            {isExpanded ? t('collapse') : t('showMore')}
          </button>
        )}
      </div>
    </div>
  );
});

export default MessageItem;
