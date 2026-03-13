'use client';

import { useTranslations } from 'next-intl';
import { useConversations, useProjects } from '@/lib/hooks/useConversations';
import { Message } from '@/lib/types/message';
import { useConversationStore } from '@/lib/stores/conversationStore';
import { useNotificationStore } from '@/lib/stores/notificationStore';
import { useNewMessageManager } from '@/lib/hooks/useNewMessageManager';
import { useAccumulatedConversations } from '@/lib/hooks/useAccumulatedConversations';
import { useProjectTabs } from '@/lib/hooks/useProjectTabs';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { HEADER_HEIGHT_DEFAULT_PX, SCROLL_COLLAPSE_THRESHOLD_PX, SCROLL_EXPAND_THRESHOLD_PX } from '@/lib/constants/ui';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ConversationList from '@/components/ConversationList';
import InlineFilterBar from '@/components/InlineFilterBar';
import SearchBox, { SearchBoxHandle } from '@/components/SearchBox';
import NotificationBell from '@/components/NotificationBell';
import TokenUsageBar from '@/components/TokenUsageBar';
import BackToTopButton from '@/components/BackToTopButton';
import ProjectTabs from '@/components/ProjectTabs';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import Container from '@/components/layout/Container';

export interface HomeContentProps {
  initialNotificationCount?: number;
}

export default function HomeContent({}: HomeContentProps = {}) {
  const t = useTranslations('app');
  const currentFilters = useConversationStore((state) => state.currentFilters);
  const setFilters = useConversationStore((state) => state.setFilters);
  const setProjects = useConversationStore((state) => state.setProjects);
  const resetFilters = useConversationStore((state) => state.resetFilters);
  const activeProjectTab = useConversationStore((state) => state.activeProjectTab);
  const setActiveProjectTab = useConversationStore((state) => state.setActiveProjectTab);
  const { handleWebSocketMessage: handleNotificationMessage } = useNotificationStore();

  // URL state synchronization
  useUrlSync();

  // Create filters based on active project tab
  const effectiveFilters = useMemo(() => {
    if (activeProjectTab === 'all') {
      return {
        ...currentFilters,
        projects: [],
      };
    } else {
      // When a specific project tab is selected, filter to show only that project
      return {
        ...currentFilters,
        projects: [activeProjectTab],
      };
    }
  }, [currentFilters, activeProjectTab]);

  // Use isPending for initial load state (better than isLoading for our use case)
  const { data: conversationsData, isPending: conversationsLoading } = useConversations(effectiveFilters);

  const { data: projectsData } = useProjects();
  const newMessageManager = useNewMessageManager();
  const { accumulatedConversations, hasMore, resetAccumulation } = useAccumulatedConversations(
    conversationsData,
    currentFilters.offset,
    newMessageManager
  );
  const { projectTabs, totalAllProjectsUnreadCount } = useProjectTabs(
    accumulatedConversations,
    projectsData,
    newMessageManager,
    conversationsLoading
  );

  const [isScrolled, setIsScrolled] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(HEADER_HEIGHT_DEFAULT_PX);
  const searchBoxRef = useRef<SearchBoxHandle>(null);
  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const queryClient = useQueryClient();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle file changes from WebSocket - memoized to prevent re-creation
  const handleFileChange = useCallback(async () => {
    // Clear any pending debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce the refresh to avoid excessive updates
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        // Invalidate queries - React Query will refetch automatically
        await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      } catch (error) {
        console.error('Error auto-refreshing conversations:', error);
      }
    }, 1000);
  }, [queryClient]);

  // WebSocket callbacks - memoized to prevent infinite reconnection loop
  const handleWSMessage = useCallback((data: any) => {
    if (data.type === 'file_change') {
      handleFileChange();
    } else if (['new_notification', 'notification_read', 'stats_update'].includes(data.type)) {
      // Handle notification messages
      handleNotificationMessage(data);
    }
  }, [handleFileChange, handleNotificationMessage]);

  const handleWSOpen = useCallback(() => {}, []);
  const handleWSClose = useCallback(() => {}, []);

  // WebSocket connection
  useWebSocket('/ws/updates', {
    onMessage: handleWSMessage,
    onOpen: handleWSOpen,
    onClose: handleWSClose,
  });

  useEffect(() => {
    if (projectsData?.projects) {
      setProjects(projectsData.projects);
    }
  }, [projectsData?.projects]); // eslint-disable-line react-hooks/exhaustive-deps

  // Note: Read state initialization is now handled by useNewMessageManager
  // All existing messages are set as 'read' on initial load via setInitialMessages()

  // Auto-select the project with the most recent message on initial load
  useEffect(() => {
    if (activeProjectTab === 'all' && projectTabs.length > 0 && !currentFilters.keyword) {
      // Find the project with the most recent message
      const latestProject = projectTabs.find(tab => tab.lastMessageTime);
      if (latestProject) {
        setActiveProjectTab(latestProject.id);
        setFilters({ offset: 0 });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Measure header height dynamically using ResizeObserver
  useEffect(() => {
    const headerElement = headerRef.current;
    if (!headerElement) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        setHeaderHeight(height);
      }
    });

    resizeObserver.observe(headerElement);
    // Initial measurement
    setHeaderHeight(headerElement.offsetHeight);

    return () => {
      resizeObserver.disconnect();
    };
  }, []); // Only run once on mount

  // Scroll tracking for main container with hysteresis
  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const handleScroll = () => {
      const scrollTop = mainElement.scrollTop;

      if (!isScrolled && scrollTop > SCROLL_COLLAPSE_THRESHOLD_PX) {
        setIsScrolled(true);
      } else if (isScrolled && scrollTop < SCROLL_EXPAND_THRESHOLD_PX) {
        setIsScrolled(false);
      }
    };

    mainElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, [isScrolled]);

  const handleLoadMore = useCallback(() => {
    // Increment offset by limit to load next batch
    setFilters({
      offset: currentFilters.offset + currentFilters.limit,
    });
  }, [currentFilters.offset, currentFilters.limit, setFilters]);

  const handleShowNewMessages = ({ group }: { group: Message[]; groupIndex: number }) => {
    newMessageManager.showNewMessages(group);
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
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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


  // Filter change handlers for auto-apply
  const handleStartDateChange = useCallback((date: string) => {
    setFilters({ startDate: date || null, offset: 0 });
  }, [setFilters]);

  const handleEndDateChange = useCallback((date: string) => {
    setFilters({ endDate: date || null, offset: 0 });
  }, [setFilters]);


  const handleSortOrderChange = useCallback((order: 'asc' | 'desc') => {
    setFilters({ sortOrder: order, offset: 0 });
  }, [setFilters]);

  const handleResetFilters = useCallback(async () => {
    // Clear accumulated conversations immediately
    resetAccumulation();

    // Invalidate React Query cache to force fresh fetch
    await queryClient.invalidateQueries({ queryKey: ['conversations'] });

    // Reset all filters to initial state using store's resetFilters
    resetFilters();
    // Also reset project tab
    setActiveProjectTab('all');
  }, [resetAccumulation, resetFilters, queryClient, setActiveProjectTab]);

  // Handle project tab change
  const handleTabChange = useCallback((projectId: string) => {
    setActiveProjectTab(projectId);
    // Reset offset when changing project tabs
    setFilters({ offset: 0 });
  }, [setActiveProjectTab, setFilters]);

  return (
    <div className="h-screen flex flex-col bg-[#FAFAFA] dark:bg-gray-900">
      {/* Sticky Header Area */}
      <header ref={headerRef} className="sticky top-0 z-50 flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {/* Token Usage Bar */}
        <TokenUsageBar compact={isScrolled} />

        {/* Project Tabs Row */}
        <Container>
          <div className="flex items-center min-w-0">
            <div className="flex-1 min-w-0">
              <ProjectTabs
                projects={projectTabs}
                selectedTabId={activeProjectTab}
                onTabChange={handleTabChange}
                totalMessageCount={totalAllProjectsUnreadCount}
                loading={conversationsLoading}
              />
            </div>
            <NotificationBell />
          </div>
        </Container>

        {/* Filter Controls Row - Collapses on scroll using CSS grid */}
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: isScrolled ? '0fr' : '1fr' }}
        >
          <div className="overflow-hidden">
            <div className="border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
              <Container>
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 min-w-0">
                    <SearchBox
                      ref={searchBoxRef}
                      onSearch={handleSearch}
                      onClear={handleClearSearch}
                      compact={true}
                    />
                  </div>
                  <InlineFilterBar
                    startDate={currentFilters.startDate || ''}
                    endDate={currentFilters.endDate || ''}
                    sortOrder={currentFilters.sortOrder}
                    onStartDateChange={handleStartDateChange}
                    onEndDateChange={handleEndDateChange}
                    onSortOrderChange={handleSortOrderChange}
                    onReset={handleResetFilters}
                    compact={true}
                  />
                </div>
              </Container>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable area */}
      <main ref={mainRef} className="flex-1 overflow-y-auto bg-[#FAFAFA] dark:bg-gray-900 dark-scrollbar">
        <Container>
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
            headerHeight={headerHeight}
            isFiltering={
              !!currentFilters.keyword ||
              !!currentFilters.startDate ||
              !!currentFilters.endDate ||
              activeProjectTab !== 'all'
            }
            onLoadMore={handleLoadMore}
            onShowNewMessages={handleShowNewMessages}
          />
        </Container>

        {/* Footer - Only visible when scrolled to bottom */}
        <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-4 mt-8">
          <Container>
            <div className="flex items-center justify-center">
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                {t('footer')}
              </div>
            </div>
          </Container>
        </footer>
      </main>

      {/* Back to Top Button */}
      {isScrolled && <BackToTopButton onClick={scrollToTop} />}

      {/* Language Switcher - Fixed bottom right, above ThemeToggle, z-[60] to stay above highlighted messages (z-50) */}
      <div className="fixed bottom-16 right-4 z-[60]">
        <LanguageSwitcher />
      </div>

      {/* Theme Toggle - Fixed bottom right */}
      <ThemeToggle />
    </div>
  );
}
