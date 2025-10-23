'use client';

import { useTranslations } from 'next-intl';

interface BackToTopButtonProps {
  onClick: () => void;
}

export default function BackToTopButton({ onClick }: BackToTopButtonProps) {
  const t = useTranslations('app');

  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 left-4 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all duration-300 z-40"
      title={t('backToTop')}
      aria-label={t('backToTop')}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  );
}
