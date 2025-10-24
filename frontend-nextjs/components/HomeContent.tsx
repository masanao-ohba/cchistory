'use client';

import { useTranslations } from 'next-intl';
import { useConversations, useProjects } from '@/lib/hooks/useConversations';
import type { ConversationsResponse } from '@/lib/hooks/useConversations';
import type { TokenUsageResponse } from '@/lib/types/tokenUsage';
import { useConversationStore } from '@/lib/stores/conversationStore';
import { useNotificationStore } from '@/lib/stores/notificationStore';
import { useNewMessageManager } from '@/lib/hooks/useNewMessageManager';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ConversationList from '@/components/ConversationList';
import FilterPanel from '@/components/FilterPanel';
import FilterToggle from '@/components/FilterToggle';
import SearchBox, { SearchBoxHandle } from '@/components/SearchBox';
import NotificationBell from '@/components/NotificationBell';
import TokenUsageBar from '@/components/TokenUsageBar';
import SettingsMenu from '@/components/SettingsMenu';
import BackToTopButton from '@/components/BackToTopButton';

export interface HomeContentProps {
  initialConversations?: ConversationsResponse;
  initialProjects?: { projects: any[] };
  initialTokenUsage?: TokenUsageResponse;
  initialNotificationCount?: number;
}

export default function HomeContent({
  initialConversations,
  initialProjects,
  initialTokenUsage,
  initialNotificationCount,
}: HomeContentProps = {}) {
  const t = useTranslations('app');
  const [mounted, setMounted] = useState(false);
  const currentFilters = useConversationStore((state) => state.currentFilters);
  const setFilters = useConversationStore((state) => state.setFilters);
  const setProjects = useConversationStore((state) => state.setProjects);
  const { handleWebSocketMessage: handleNotificationMessage } = useNotificationStore();

  // Wait for client-side mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // URL state synchronization
  useUrlSync();
  const { data: conversationsData, isLoading: conversationsLoading, refetch: refetchConversations } = useConversations(currentFilters, mounted, initialConversations);
  const { data: projectsData } = useProjects(initialProjects);
  const newMessageManager = useNewMessageManager();

  // Use stats from conversationsData (already filtered) instead of separate stats endpoint
  const statsData = conversationsData?.stats;
  const [hasMore, setHasMore] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [accumulatedConversations, setAccumulatedConversations] = useState<any[][]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const searchBoxRef = useRef<SearchBoxHandle>(null);
  const queryClient = useQueryClient();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [filterBarHeight, setFilterBarHeight] = useState(0);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Handle file changes from WebSocket - memoized to prevent re-creation
  const handleFileChange = useCallback(async () => {
    // Clear any pending debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce the refresh to avoid excessive updates
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        // Invalidate and refetch conversations (which includes filtered stats)
        await queryClient.invalidateQueries({ queryKey: ['conversations'] });
        await refetchConversations();
      } catch (error) {
        console.error('Error auto-refreshing conversations:', error);
      }
    }, 1000);
  }, [queryClient, refetchConversations]);

  // WebSocket callbacks - memoized to prevent infinite reconnection loop
  const handleWSMessage = useCallback((data: any) => {
    if (data.type === 'file_change') {
      handleFileChange();
    } else if (['new_notification', 'notification_read', 'stats_update'].includes(data.type)) {
      // Handle notification messages
      handleNotificationMessage(data);
    }
  }, [handleFileChange, handleNotificationMessage]);

  const handleWSOpen = useCallback(() => {
    console.log('WebSocket connected');
  }, []);

  const handleWSClose = useCallback(() => {
    console.log('WebSocket disconnected');
  }, []);

  // WebSocket connection
  const { isConnected } = useWebSocket('/ws/updates', {
    onMessage: handleWSMessage,
    onOpen: handleWSOpen,
    onClose: handleWSClose,
  });

  useEffect(() => {
    if (projectsData?.projects) {
      setProjects(projectsData.projects);
    }
  }, [projectsData?.projects]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const threshold = 150;
      const shouldBeScrolled = scrollY > threshold;

      if (isScrolled !== shouldBeScrolled) {
        setIsScrolled(shouldBeScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isScrolled]);

  // Measure filter bar height for main content padding
  useEffect(() => {
    const updateFilterBarHeight = () => {
      if (filterBarRef.current) {
        setFilterBarHeight(filterBarRef.current.offsetHeight);
      }
    };

    // Initial measurement
    updateFilterBarHeight();

    // Update on resize and when filter panel expands/collapses
    window.addEventListener('resize', updateFilterBarHeight);

    // Use MutationObserver to detect height changes when filter panel opens/closes
    const observer = new MutationObserver(updateFilterBarHeight);
    if (filterBarRef.current) {
      observer.observe(filterBarRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    return () => {
      window.removeEventListener('resize', updateFilterBarHeight);
      observer.disconnect();
    };
  }, [filtersExpanded]);

  useEffect(() => {
    if (conversationsData?.conversations) {
      // If offset is 0, it's a fresh load (reset accumulated conversations)
      if (currentFilters.offset === 0) {
        setAccumulatedConversations(conversationsData.conversations);
      } else {
        // Append new conversations to accumulated list
        setAccumulatedConversations((prev) => [...prev, ...conversationsData.conversations]);
      }

      // Initialize new message manager with all accumulated conversations
      newMessageManager.setInitialMessages(
        currentFilters.offset === 0
          ? conversationsData.conversations
          : [...accumulatedConversations, ...conversationsData.conversations]
      );

      // Update hasMore state - compare total with accumulated count
      const currentCount = currentFilters.offset === 0
        ? conversationsData.actual_threads
        : accumulatedConversations.length + conversationsData.actual_threads;
      setHasMore((conversationsData.total_threads || 0) > currentCount);
    }
  }, [conversationsData?.conversations, conversationsData?.total_threads, conversationsData?.actual_threads, currentFilters.offset]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = useCallback((filters: any) => {
    setFilters({
      startDate: filters.startDate || null,
      endDate: filters.endDate || null,
      projects: filters.projects || [],
      sortOrder: filters.sortOrder || 'desc',
      offset: 0, // Reset offset when filters change
    });
  }, [setFilters]);

  const handleLoadMore = useCallback(() => {
    // Increment offset by limit to load next batch
    setFilters({
      offset: currentFilters.offset + currentFilters.limit,
    });
  }, [currentFilters.offset, currentFilters.limit, setFilters]);

  const handleShowNewMessages = ({ group, groupIndex }: { group: any[]; groupIndex: number }) => {
    newMessageManager.showNewMessages(group, groupIndex);
  };

  const handleSearch = useCallback(({ keyword, showRelatedThreads }: { keyword: string; showRelatedThreads: boolean }) => {
    setFilters({
      keyword,
      showRelatedThreads,
      offset: 0, // Reset offset when searching
    });
  }, [setFilters]);

  const handleClearSearch = useCallback(() => {
    setFilters({
      keyword: '',
      showRelatedThreads: false,
      offset: 0, // Reset offset when clearing search
    });
  }, [setFilters]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Sync SearchBox state with current filters (on mount and when filters change)
  useEffect(() => {
    if (searchBoxRef.current) {
      // Restore search input value and showRelatedThreads state
      searchBoxRef.current.setSearchState(
        currentFilters.keyword || '',
        currentFilters.showRelatedThreads
      );

      // Update search results if there's a keyword
      if (currentFilters.keyword) {
        const totalMessages = conversationsData?.total_messages || 0;
        searchBoxRef.current.setSearchResults({
          total: totalMessages,
          keyword: currentFilters.keyword,
        });
      }
    }
  }, [currentFilters.keyword, currentFilters.showRelatedThreads, conversationsData?.total_messages]);

  const tStats = useTranslations('statistics');

  // Calculate active filter count
  const activeFilterCount =
    (currentFilters.startDate ? 1 : 0) +
    (currentFilters.endDate ? 1 : 0) +
    (currentFilters.projects.length > 0 ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  // Auto-collapse filters on scroll
  useEffect(() => {
    if (isScrolled && filtersExpanded) {
      setFiltersExpanded(false);
    }
  }, [isScrolled, filtersExpanded]);

  // Filter change handlers for auto-apply
  const handleStartDateChange = useCallback((date: string) => {
    setFilters({ startDate: date || null, offset: 0 });
  }, [setFilters]);

  const handleEndDateChange = useCallback((date: string) => {
    setFilters({ endDate: date || null, offset: 0 });
  }, [setFilters]);

  const handleProjectsChange = useCallback((projects: string[]) => {
    setFilters({ projects, offset: 0 });
  }, [setFilters]);

  const handleSortOrderChange = useCallback((order: 'asc' | 'desc') => {
    setFilters({ sortOrder: order, offset: 0 });
  }, [setFilters]);

  const handleResetFilters = useCallback(() => {
    setFilters({
      startDate: null,
      endDate: null,
      projects: [],
      sortOrder: 'desc',
      offset: 0,
    });
  }, [setFilters]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Header Area - Changed from sticky to fixed for iOS Safari compatibility */}
      <div ref={filterBarRef} className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
        {/* Token Usage Bar - Always visible */}
        <TokenUsageBar compact={isScrolled} initialData={initialTokenUsage} />

        {/* Primary Controls Row - Search, Notification, Filters, Settings */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center gap-2">
              {/* Search Box - Takes most space */}
              <div className="flex-1">
                <SearchBox
                  ref={searchBoxRef}
                  onSearch={handleSearch}
                  onClear={handleClearSearch}
                />
              </div>

              {/* Right-side controls */}
              <div className="flex items-center gap-2">
                <NotificationBell />
                <FilterToggle
                  isExpanded={filtersExpanded}
                  hasActiveFilters={hasActiveFilters}
                  activeFilterCount={activeFilterCount}
                  onToggle={() => setFiltersExpanded(!filtersExpanded)}
                />
                <SettingsMenu />
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        <FilterPanel
          isExpanded={filtersExpanded}
          startDate={currentFilters.startDate || ''}
          endDate={currentFilters.endDate || ''}
          selectedProjects={currentFilters.projects}
          availableProjects={
            projectsData?.projects?.map((p: any) =>
              typeof p === 'string' ? p : p.id || p.display_name || ''
            ) || []
          }
          sortOrder={currentFilters.sortOrder}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          onProjectsChange={handleProjectsChange}
          onSortOrderChange={handleSortOrderChange}
          onReset={handleResetFilters}
        />
      </div>

      {/* Main Content - Add top padding to account for fixed header */}
      <main className="max-w-7xl mx-auto px-4 pb-8" style={{ paddingTop: filterBarHeight > 0 ? `${filterBarHeight}px` : '140px' }}>

        {/* Conversations */}
        <ConversationList
          conversations={accumulatedConversations}
          loading={conversationsLoading}
          hasMore={hasMore}
          totalThreads={conversationsData?.total_threads || 0}
          totalMessages={conversationsData?.total_messages || 0}
          actualThreads={accumulatedConversations.length}
          actualMessages={accumulatedConversations.reduce((sum, group) => sum + group.length, 0)}
          newMessageManager={newMessageManager}
          stickyTopOffset={filterBarHeight}
          isFiltering={
            !!currentFilters.keyword ||
            !!currentFilters.startDate ||
            !!currentFilters.endDate ||
            currentFilters.projects.length > 0
          }
          onLoadMore={handleLoadMore}
          onShowNewMessages={handleShowNewMessages}
        />
      </main>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm py-4">
        {t('footer')}
      </footer>

      {/* Back to Top Button */}
      {isScrolled && <BackToTopButton onClick={scrollToTop} />}
    </div>
  );
}
