'use client';

import { useTranslations } from 'next-intl';
import { LoadingSpinnerIcon } from '@/components/icons';

export default function LoadingState() {
  const t = useTranslations('conversations');

  return (
    <div className="p-4 text-center">
      <div className="mx-auto w-12 h-12 text-primary-500 animate-spin">
        <LoadingSpinnerIcon className="w-12 h-12" />
      </div>
      <p className="text-gray-500 mt-4">{t('loading')}</p>
    </div>
  );
}
