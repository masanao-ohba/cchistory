'use client';

import { useState, useEffect, useMemo, memo, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface Message {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  uuid?: string;
  is_search_match?: boolean;
  search_keyword?: string;
}

interface MessageItemProps {
  conversation: Message;
  index: number;
  expandedItems: Set<number>;
  handleCodeCopy: (event: React.MouseEvent) => void;
  shouldShowToggleButton: (content: string) => boolean;
  onToggleExpand: (index: number) => void;
}

const MessageItem = memo(function MessageItem({
  conversation,
  index,
  expandedItems,
  handleCodeCopy,
  shouldShowToggleButton,
  onToggleExpand,
}: MessageItemProps) {
  const t = useTranslations('conversations');
  const isUser = conversation.type === 'user';
  const isExpanded = expandedItems.has(index);
  const workerRef = useRef<Worker | null>(null);
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const messageContainerClasses = useMemo(() => {
    const base = 'transition-all duration-200 hover:scale-[1.002] rounded-lg p-3 shadow-md';
    const variant = isUser
      ? 'bg-gradient-to-br from-blue-100 to-blue-200 ml-0 mr-8'
      : 'bg-gradient-to-br from-green-100 to-green-200 ml-8 mr-0';
    return `${base} ${variant}`;
  }, [isUser]);

  const avatarClasses = useMemo(() => {
    const base = 'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold';
    const color = isUser ? 'bg-blue-500' : 'bg-green-500';
    return `${base} ${color}`;
  }, [isUser]);

  const typeLabelClasses = useMemo(() => {
    const base = 'text-sm font-medium';
    const color = isUser ? 'text-blue-700' : 'text-green-700';
    return `${base} ${color}`;
  }, [isUser]);

  const contentClasses = useMemo(() => {
    const base = [
      'prose prose-sm max-w-none break-words rounded-md p-3 text-gray-900 shadow-sm border overflow-x-auto',
      'prose-headings:text-gray-900 prose-p:text-gray-800 prose-code:bg-gray-100 prose-pre:bg-gray-100',
      'prose-table:border-gray-300 prose-th:border-gray-300 prose-td:border-gray-300',
    ].join(' ');
    const variant = isUser ? 'bg-blue-50 border-blue-300' : 'bg-green-50 border-green-300';
    const clamp = !isExpanded ? 'line-clamp-3' : '';
    return `${base} ${variant} ${clamp}`;
  }, [isUser, isExpanded]);

  const toggleButtonClasses = useMemo(() => {
    const base = 'mt-2 text-sm font-medium hover:underline';
    const color = isUser
      ? 'text-blue-600 hover:text-blue-800'
      : 'text-green-600 hover:text-green-800';
    return `${base} ${color}`;
  }, [isUser]);


  const formatTimestamp = (timestamp: string) => {
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

  const getMessageIcon = () => {
    if (isUser) {
      return <i className="fas fa-user text-base" />;
    }
    return <i className="fas fa-robot text-base" />;
  };

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
      { rootMargin: '200px' } // Start processing 200px before visible
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [isVisible]);

  // Use Web Worker for markdown processing (only when visible)
  useEffect(() => {
    if (!isVisible) return;

    // Create worker on first visibility
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
        setRenderedContent(`<p class="text-red-500">Error processing markdown</p>`);
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

  return (
    <div ref={containerRef} className={messageContainerClasses}>
      {/* Meta information */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {/* Avatar icon */}
          <div className={avatarClasses}>{getMessageIcon()}</div>

          {/* Type label */}
          <span className={typeLabelClasses}>
            {isUser ? t('user') : t('assistant')}
          </span>
        </div>

        {/* Timestamp */}
        <time className="text-xs text-gray-500">{formatTimestamp(conversation.timestamp)}</time>
      </div>

      {/* Content */}
      <div
        className={contentClasses}
        dangerouslySetInnerHTML={{
          __html: isProcessing
            ? `<pre class="whitespace-pre-wrap text-gray-700">${conversation.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`
            : renderedContent
        }}
        onClick={handleCodeCopy}
      />

      {/* Expand/Collapse button */}
      {shouldShowToggleButton(conversation.content) && (
        <button onClick={() => onToggleExpand(index)} className={toggleButtonClasses}>
          {isExpanded ? t('collapse') : t('showMore')}
        </button>
      )}
    </div>
  );
});

export default MessageItem;
