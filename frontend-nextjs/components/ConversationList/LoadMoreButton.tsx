'use client';

import { useTranslations } from 'next-intl';
import { LoadingSpinnerIcon } from '@/components/icons';

interface LoadMoreButtonProps {
  loading: boolean;
  totalThreads: number;
  actualThreads: number;
  lastLoadedCount: number;
  onLoadMore: () => void;
}

export default function LoadMoreButton({
  loading,
  totalThreads,
  actualThreads,
  lastLoadedCount,
  onLoadMore,
}: LoadMoreButtonProps) {
  const t = useTranslations('conversations');

  const getRangeText = () => {
    if (!totalThreads || actualThreads === 0) return '';
    const start = actualThreads + 1;
    const pageSize = Math.min(15, actualThreads || 15);
    const remaining = totalThreads - actualThreads;
    const end = actualThreads + Math.min(pageSize, remaining);
    return `(${start.toLocaleString()} - ${end.toLocaleString()})`;
  };

  return (
    <div className="pt-6 border-t border-gray-200/60">
      {lastLoadedCount > 0 && (
        <div className="mb-3 text-center text-sm text-green-600 font-medium animate-pulse">
          ✓ {t('newConversationsLoaded', { count: lastLoadedCount })}
        </div>
      )}
      <button
        onClick={onLoadMore}
        disabled={loading}
        className={`w-full px-4 py-2 bg-[#667eea] text-white rounded-md hover:bg-[#5a67d8] focus:outline-none focus:ring-2 focus:ring-[#667eea] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer ${loading ? 'animate-pulse' : ''}`}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <div className="animate-spin -ml-1 mr-3">
              <LoadingSpinnerIcon className="h-5 w-5 text-white" />
            </div>
            {t('loading')}
          </span>
        ) : (
          <span>{t('loadMore')} {getRangeText()}</span>
        )}
      </button>
    </div>
  );
}
