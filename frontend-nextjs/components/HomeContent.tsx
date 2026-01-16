'use client';

import { useTranslations } from 'next-intl';
import { useConversations, useProjects } from '@/lib/hooks/useConversations';
import { useConversationStore } from '@/lib/stores/conversationStore';
import { useNotificationStore } from '@/lib/stores/notificationStore';
import { useNewMessageManager } from '@/lib/hooks/useNewMessageManager';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ConversationList from '@/components/ConversationList';
import InlineFilterBar from '@/components/InlineFilterBar';
import SearchBox, { SearchBoxHandle } from '@/components/SearchBox';
import NotificationBell from '@/components/NotificationBell';
import TokenUsageBar from '@/components/TokenUsageBar';
import BackToTopButton from '@/components/BackToTopButton';
import ProjectTabs, { ProjectTab } from '@/components/ProjectTabs';
import LanguageSwitcher from '@/components/LanguageSwitcher';
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

  // Fetch all conversations data (without filters) for project tab statistics
  const { data: allConversationsData } = useConversations({
    startDate: null,
    endDate: null,
    projects: [],
    keyword: '',
    showRelatedThreads: false,
    sortOrder: 'desc',
    threadMode: 'grouped',
    offset: 0,
    limit: 1000, // Get enough data for statistics
  });

  const { data: projectsData } = useProjects();
  const newMessageManager = useNewMessageManager();

  // Debug logging for loading state
  useEffect(() => {
    console.log('[HomeContent] Loading state:', {
      isPending: conversationsLoading,
      hasData: !!conversationsData,
      dataLength: conversationsData?.conversations?.length || 0,
    });
  }, [conversationsLoading, conversationsData]);

  // Use stats from conversationsData (already filtered) instead of separate stats endpoint
  const [hasMore, setHasMore] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [accumulatedConversations, setAccumulatedConversations] = useState<any[][]>([]);
  const [headerHeight, setHeaderHeight] = useState(220); // Default header height
  const [, forceUpdate] = useState({});
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

  const handleWSOpen = useCallback(() => {
    console.log('WebSocket connected');
  }, []);

  const handleWSClose = useCallback(() => {
    console.log('WebSocket disconnected');
  }, []);

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

  // Calculate project statistics and create ProjectTab data with unread counts
  const projectTabs = useMemo((): ProjectTab[] => {
    if (!projectsData?.projects) {
      return [];
    }

    const projectStats = new Map<string, {
      totalCount: number;
      unreadCount: number;
      lastTime: string | null;
    }>();

    // Initialize stats for all projects
    projectsData.projects.forEach((project: any) => {
      const projectId = typeof project === 'string' ? project : project.id;
      projectStats.set(projectId, {
        totalCount: 0,
        unreadCount: 0,
        lastTime: null,
      });
    });

    // Calculate statistics from currently displayed conversations
    // This ensures we're checking the same data that newMessageManager is managing
    accumulatedConversations.forEach((group: any[], index: number) => {
      if (group.length > 0) {
        const firstMessage = group[0];
        // Extract project ID - handle both string and object formats
        let projectId: string;
        if (typeof firstMessage.project_path === 'string') {
          projectId = firstMessage.project_path;
        } else if (typeof firstMessage.project === 'string') {
          projectId = firstMessage.project;
        } else if (firstMessage.project_path?.id) {
          projectId = firstMessage.project_path.id;
        } else if (firstMessage.project?.id) {
          projectId = firstMessage.project.id;
        } else {
          // Fallback: try to get id property
          projectId = firstMessage.project_path?.id || firstMessage.project?.id || 'unknown';
        }

        if (projectId && projectStats.has(projectId)) {
          const stats = projectStats.get(projectId)!;
          stats.totalCount += group.length;

          // Count unread messages in this group
          const unreadCount = newMessageManager.getUnreadCount(group, index);
          stats.unreadCount += unreadCount;

          // Update last message time if this is more recent
          const messageTime = firstMessage.created || firstMessage.timestamp;
          if (!stats.lastTime || (messageTime && new Date(messageTime) > new Date(stats.lastTime))) {
            stats.lastTime = messageTime;
          }
        }
      }
    });

    // Log unread counts for debugging
    projectStats.forEach((stats, projectId) => {
      if (stats.unreadCount > 0) {
        console.log(`[ProjectTabs] ${projectId}: ${stats.unreadCount} unread messages`);
      }
    });

    // Create ProjectTab array with unread counts
    return Array.from(projectStats.entries()).map(([projectId, stats]) => {
      const project = projectsData.projects.find((p: any) =>
        (typeof p === 'string' ? p : p.id) === projectId
      );
      const displayName = typeof project === 'string' ? projectId : (project?.display_name || projectId);

      return {
        id: projectId,
        displayName,
        messageCount: stats.unreadCount, // Show unread count from newMessageManager
        lastMessageTime: stats.lastTime || undefined,
      };
    }).sort((a, b) => {
      // Sort by last message time (most recent first)
      if (!a.lastMessageTime && !b.lastMessageTime) return 0;
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });
  }, [accumulatedConversations, projectsData?.projects, newMessageManager]);

  // Calculate total unread message count as sum of individual project unread counts
  const totalAllProjectsUnreadCount = useMemo(() => {
    // During initial loading, return 0 to avoid showing "999+"
    if (!projectTabs || projectTabs.length === 0 || conversationsLoading) return 0;
    // Sum up unread counts from all individual project tabs
    return projectTabs.reduce((total, tab) => {
      return total + (tab.messageCount || 0);
    }, 0);
  }, [projectTabs, conversationsLoading]);

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

  // Measure header height dynamically
  useEffect(() => {
    const measureHeader = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        setHeaderHeight(height);
      }
    };

    measureHeader();
    window.addEventListener('resize', measureHeader);
    return () => window.removeEventListener('resize', measureHeader);
  }, [isScrolled]); // Re-measure when header size changes

  // Scroll tracking for main container
  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const handleScroll = () => {
      const scrollTop = mainElement.scrollTop;
      const threshold = 150;
      const shouldBeScrolled = scrollTop > threshold;

      if (isScrolled !== shouldBeScrolled) {
        setIsScrolled(shouldBeScrolled);
      }
    };

    mainElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, [isScrolled]);

  // Track if this is the first load
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    if (conversationsData?.conversations) {
      // If offset is 0, it's a fresh load (reset accumulated conversations)
      if (currentFilters.offset === 0) {
        setAccumulatedConversations(conversationsData.conversations);
      } else {
        // Append new conversations to accumulated list
        setAccumulatedConversations((prev) => [...prev, ...conversationsData.conversations]);
      }

      const allConversations = currentFilters.offset === 0
        ? conversationsData.conversations
        : [...accumulatedConversations, ...conversationsData.conversations];

      // On first load: set all messages as read
      // On subsequent updates: add new messages as unread
      if (isFirstLoadRef.current) {
        newMessageManager.setInitialMessages(allConversations);
        isFirstLoadRef.current = false;
      } else {
        newMessageManager.addNewMessages(allConversations);
      }

      // Update hasMore state - compare total with accumulated count
      const currentCount = currentFilters.offset === 0
        ? conversationsData.actual_threads
        : accumulatedConversations.length + conversationsData.actual_threads;
      setHasMore((conversationsData.total_threads || 0) > currentCount);
    }
  }, [conversationsData?.conversations, conversationsData?.total_threads, conversationsData?.actual_threads, currentFilters.offset]); // eslint-disable-line react-hooks/exhaustive-deps


  const handleLoadMore = useCallback(() => {
    // Increment offset by limit to load next batch
    setFilters({
      offset: currentFilters.offset + currentFilters.limit,
    });
  }, [currentFilters.offset, currentFilters.limit, setFilters]);

  const handleShowNewMessages = ({ group, groupIndex }: { group: any[]; groupIndex: number }) => {
    newMessageManager.showNewMessages(group, groupIndex);
    // Force re-render to reflect the updated messages
    forceUpdate({});
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
    setAccumulatedConversations([]);

    // Invalidate React Query cache to force fresh fetch
    await queryClient.invalidateQueries({ queryKey: ['conversations'] });

    // Reset all filters to initial state using store's resetFilters
    resetFilters();
    // Also reset project tab
    setActiveProjectTab('all');
  }, [resetFilters, queryClient, setActiveProjectTab]);

  // Handle project tab change
  const handleTabChange = useCallback((projectId: string) => {
    setActiveProjectTab(projectId);
    // Reset offset when changing project tabs
    setFilters({ offset: 0 });
  }, [setActiveProjectTab, setFilters]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Sticky Header Area */}
      <header ref={headerRef} className="sticky top-0 z-50 flex-shrink-0 bg-white shadow-md">
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

        {/* Filter Controls Row */}
        <div className="border-b border-gray-200 bg-gray-50">
          <Container>
            <div className="flex items-center gap-2 py-2">
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
                keyword={currentFilters.keyword}
                activeProjectTab={activeProjectTab}
              />
            </div>
          </Container>
        </div>
      </header>

      {/* Main Content - Scrollable area */}
      <main ref={mainRef} className="flex-1 overflow-y-auto">
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
        <footer className="border-t border-gray-200 bg-white py-4 mt-8">
          <Container>
            <div className="flex items-center justify-center">
              <div className="text-gray-500 text-sm">
                {t('footer')}
              </div>
            </div>
          </Container>
        </footer>
      </main>

      {/* Back to Top Button */}
      {isScrolled && <BackToTopButton onClick={scrollToTop} />}
    </div>
  );
}
