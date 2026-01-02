'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
            retry: 1, // Only retry once on failure
            retryDelay: 1000, // Wait 1 second before retry
          },
        },
      })
  );

  // Show React Query Devtools based on NODE_ENV
  // Development mode: show devtools (unless explicitly disabled)
  // Production mode: hide devtools (unless explicitly enabled)
  const showDevtools = process.env.NEXT_PUBLIC_SHOW_DEV_INDICATORS
    ? process.env.NEXT_PUBLIC_SHOW_DEV_INDICATORS === 'true'
    : process.env.NODE_ENV === 'development';

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {showDevtools && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
