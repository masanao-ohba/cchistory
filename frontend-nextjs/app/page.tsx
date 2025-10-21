'use client';

import { Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../messages/en.json';
import HomeContent from '@/components/HomeContent';

export default function Home() {
  return (
    <NextIntlClientProvider
      messages={enMessages}
      locale="en"
      timeZone="Asia/Tokyo"
    >
      <Suspense fallback={<div>Loading...</div>}>
        <HomeContent />
      </Suspense>
    </NextIntlClientProvider>
  );
}
