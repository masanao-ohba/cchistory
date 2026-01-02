'use client';

import { useTranslations } from 'next-intl';

interface FilteringHeaderProps {
  totalThreads: number;
  actualThreads: number;
  actualMessages: number;
}

export default function FilteringHeader({
  totalThreads,
  actualThreads,
  actualMessages,
}: FilteringHeaderProps) {
  const t = useTranslations('conversations');

  return (
    <div className="bg-slate-50/50 px-4 py-3 border border-gray-200/60 rounded-lg">
      <p className="text-xs text-gray-600">
        {totalThreads > actualThreads
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
  );
}
