'use client';

import { useState, useEffect, memo, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { CheckIcon, ClipboardIcon } from './icons';
import { Message } from '@/lib/types/message';
import { markdownWorkerPool } from '@/lib/workers/markdownWorkerPool';
import { isWorkerCancellation } from '@/lib/utils/workerErrors';
import { VIEWPORT_PRERENDER_MARGIN_PX, COPY_CONFIRM_DURATION_MS } from '@/lib/constants/ui';
import { Avatar, formatTimestamp } from '@/lib/utils/messageDisplay';
import {
  messageContainerStyles,
  indicatorStyles,
  contentStyles,
  toggleButtonStyles,
  copyButtonStyles,
  roleLabelStyles,
  timestampStyles,
} from '@/lib/styles';

const renderCallbacks = new WeakMap<Element, () => void>();
const renderObserver =
  typeof window !== 'undefined'
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) renderCallbacks.get(entry.target)?.();
          }
        },
        { rootMargin: `${VIEWPORT_PRERENDER_MARGIN_PX}px` }
      )
    : null;

interface MessageItemProps {
  conversation: Message;
  index: number;
  expandedItems: Set<number>;
  handleCodeCopy: (event: React.MouseEvent) => void;
  shouldShowToggleButton: (content: string) => boolean;
  onToggleExpand: (index: number) => void;
  isHighlighted?: boolean;
  onHover?: (isHovered: boolean) => void;
  contentOnly?: boolean;
}

/** Escape HTML for safe inline display of raw content */
const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const mountedRef = useRef(true);

  const containerClasses = messageContainerStyles({ isHighlighted, contentOnly });
  const contentClasses = contentStyles(isExpanded);
  const toggleClasses = toggleButtonStyles(isUser);

  const messageId = conversation.uuid || `${index}-fallback`;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      markdownWorkerPool.cancel(messageId);
    };
  }, [messageId]);

  const handleCopyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(conversation.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), COPY_CONFIRM_DURATION_MS);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  }, [conversation.content]);

  // IntersectionObserver: one-way render trigger (200px ahead of viewport)
  // Once rendered, content stays — clearing would cause height collapse and scroll instability
  useEffect(() => {
    const el = containerRef.current;
    if (!renderObserver || !el) return;

    renderCallbacks.set(el, () => setIsNearViewport(true));
    renderObserver.observe(el);

    return () => {
      renderCallbacks.delete(el);
      renderObserver.unobserve(el);
    };
  }, []);

  // Worker Pool markdown processing (only when near viewport)
  useEffect(() => {
    if (!isNearViewport) return;
    setIsProcessing(true);

    markdownWorkerPool
      .process(
        messageId,
        conversation.content,
        conversation.is_search_match ? (conversation.search_keyword ?? null) : null
      )
      .then((html) => {
        if (mountedRef.current) {
          setRenderedContent(html);
          setIsProcessing(false);
        }
      })
      .catch((error) => {
        if (isWorkerCancellation(error)) return;
        console.error('Worker pool error:', error);
        if (mountedRef.current) {
          setRenderedContent(`<p class="text-red-500 dark:text-red-400">Error processing markdown</p>`);
          setIsProcessing(false);
        }
      });
  }, [isNearViewport, conversation.content, messageId, conversation.is_search_match, conversation.search_keyword]);

  // --- Shared rendering fragments ---
  const contentHtml = isProcessing
    ? `<pre class="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm">${escapeHtml(conversation.content)}</pre>`
    : renderedContent;

  const contentBlock = (
    <div
      className={contentClasses}
      dangerouslySetInnerHTML={{ __html: contentHtml }}
      onClick={handleCodeCopy}
    />
  );

  const toggleButton = shouldShowToggleButton(conversation.content) ? (
    <button onClick={() => onToggleExpand(index)} className={toggleClasses}>
      {isExpanded ? t('collapse') : t('showMore')}
    </button>
  ) : null;

  const hoverHandlers = {
    onMouseEnter: () => onHover?.(true),
    onMouseLeave: () => onHover?.(false),
  };

  if (contentOnly) {
    return (
      <div ref={containerRef} className={containerClasses} {...hoverHandlers}>
        <div className="p-3">
          {contentBlock}
          {toggleButton}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={containerClasses} {...hoverHandlers}>
      <div className={indicatorStyles(isUser)} />
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar isUser={isUser} />
            <span className={roleLabelStyles(isUser)}>
              {isUser ? t('user') : t('assistant')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMessage}
              className={copyButtonStyles(isCopied)}
              title={isCopied ? t('copied') : t('copyMessage')}
              aria-label={t('copyMessage')}
            >
              {isCopied ? <CheckIcon /> : <ClipboardIcon />}
            </button>
            <time className={timestampStyles}>{formatTimestamp(conversation.timestamp)}</time>
          </div>
        </div>
        {contentBlock}
        {toggleButton}
      </div>
    </div>
  );
});

export default MessageItem;
