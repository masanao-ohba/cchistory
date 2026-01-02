'use client';

import HomeContent from '@/components/HomeContent';

/**
 * Home Page - Client Component
 *
 * Server Components were removed due to performance issues:
 * - Development SSR overhead: 9.8s HTML response time
 * - HTML payload bloat when passing large datasets
 * - No measurable benefits in development or production
 *
 * Client-side approach with React Query provides:
 * - Fast initial HTML delivery (<100ms)
 * - Efficient client-side data management
 * - Real-time WebSocket updates
 * - Better development experience
 */
export default function Home() {
  return <HomeContent />;
}
