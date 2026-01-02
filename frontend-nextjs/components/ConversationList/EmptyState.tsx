'use client';

import { useTranslations } from 'next-intl';

export default function EmptyState() {
  const t = useTranslations('conversations');

  return (
    <div className="p-4 text-center">
      <div className="text-gray-400 text-6xl mb-4">💬</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noConversations')}</h3>
      <p className="text-gray-500">{t('noConversationsHint')}</p>
    </div>
  );
}
