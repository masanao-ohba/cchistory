import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { loadStateFromUrl, createQueryStringFromState } from '../utils/urlSync';
import { useConversationStore } from '../stores/conversationStore';

/**
 * Custom hook for synchronizing conversation filters with URL parameters
 */
export function useUrlSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentFilters, setFilters } = useConversationStore();
  const isInitialMount = useRef(true);
  const isUpdatingFromUrl = useRef(false);
  const lastUrlRef = useRef<string>('');
  const hasHydratedRef = useRef(false);

  // Load filters from URL on mount (takes precedence over localStorage)
  useEffect(() => {
    if (isInitialMount.current && searchParams) {
      isUpdatingFromUrl.current = true;
      const urlState = loadStateFromUrl(searchParams);

      if (Object.keys(urlState).length > 0) {
        setFilters(urlState);
      }

      isInitialMount.current = false;
      hasHydratedRef.current = true;

      // Reset flag after delay to allow state to settle
      setTimeout(() => {
        isUpdatingFromUrl.current = false;
      }, 500); // Increased delay to wait for store hydration
    }
  }, [searchParams, setFilters]);

  // Sync filters to URL when they change (DISABLED to prevent infinite loop)
  // The URL will only be set from user interactions, not from store changes
  // useEffect(() => {
  //   if (!isUpdatingFromUrl.current && !isInitialMount.current && hasHydratedRef.current) {
  //     const queryString = createQueryStringFromState(currentFilters);
  //     const newUrl = `${pathname}${queryString}`;
  //
  //     // Only update if the URL is actually different from last update
  //     if (newUrl !== lastUrlRef.current) {
  //       lastUrlRef.current = newUrl;
  //       router.replace(newUrl, { scroll: false });
  //     }
  //   }
  // }, [currentFilters, pathname, router]);

  return {
    loadStateFromUrl: () => {
      if (searchParams) {
        return loadStateFromUrl(searchParams);
      }
      return {};
    },
  };
}
