import { useEffect, useState } from 'react';

/**
 * Hook to prevent hydration mismatch with Zustand persist middleware
 * Returns true only after client-side hydration is complete
 */
export function useHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
