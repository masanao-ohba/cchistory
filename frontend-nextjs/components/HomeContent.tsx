'use client';

import { useTranslations } from 'next-intl';
import { useConversations, useProjects, useStats } from '@/lib/hooks/useConversations';
import { useConversationStore } from '@/lib/stores/conversationStore';
import { useNotificationStore } from '@/lib/stores/notificationStore';
import { useNewMessageManager } from '@/lib/hooks/useNewMessageManager';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ConversationList from '@/components/ConversationList';
import FilterBar from '@/components/FilterBar';
import SearchBox, { SearchBoxHandle } from '@/components/SearchBox';
import NotificationBell from '@/components/NotificationBell';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import BackToTopButton from '@/components/BackToTopButton';
import DailyConversationChart from '@/components/DailyConversationChart';
import { ChatBubbleIcon, MessageIcon, FolderIcon, LoadingSpinnerIcon } from '@/components/icons';

export default function HomeContent() {
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
  const { data: conversationsData, isLoading: conversationsLoading, refetch: refetchConversations } = useConversations(currentFilters, mounted);
  const { data: projectsData } = useProjects();
  const newMessageManager = useNewMessageManager();

  // Use stats from conversationsData (already filtered) instead of separate stats endpoint
  const statsData = conversationsData?.stats;
  const [hasMore, setHasMore] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [accumulatedConversations, setAccumulatedConversations] = useState<any[][]>([]);
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

  // Measure filter bar height for sticky user messages
  useEffect(() => {
    const updateFilterBarHeight = () => {
      if (filterBarRef.current) {
        setFilterBarHeight(filterBarRef.current.offsetHeight);
      }
    };

    updateFilterBarHeight();
    window.addEventListener('resize', updateFilterBarHeight);
    return () => window.removeEventListener('resize', updateFilterBarHeight);
  }, [isScrolled]);

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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header (hidden when scrolled) */}
      <header className={`bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg transition-all duration-500 ${isScrolled ? 'transform -translate-y-full opacity-0' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{t('title')}</h1>
              <p className="text-purple-100 mt-1 text-sm">{t('subtitle')}</p>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Sticky Filter Area */}
      <div ref={filterBarRef} className="sticky top-0 z-50 bg-white shadow-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4">
          {isScrolled ? (
            /* Compact layout when scrolled - only show title, search, and bell */
            <div className="py-2">
              <div className="flex items-center justify-between gap-4">
                {/* Title */}
                <h2 className="text-lg font-bold text-gray-800 flex-shrink-0">{t('title')}</h2>

                {/* Search Box */}
                <div className="flex-1 min-w-0">
                  <SearchBox
                    ref={searchBoxRef}
                    onSearch={handleSearch}
                    onClear={handleClearSearch}
                  />
                </div>

                {/* Right side: Bell only */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <NotificationBell />
                </div>
              </div>
            </div>
          ) : (
            /* Full layout when not scrolled */
            <div className="flex items-start justify-between">
              {/* Filter & Search Area */}
              <div className="flex-1 min-w-0">
                <FilterBar
                  projects={projectsData?.projects || []}
                  loading={conversationsLoading}
                  onFilterChange={handleFilterChange}
                  compact={isScrolled}
                />
                <div className="py-2">
                  <SearchBox
                    ref={searchBoxRef}
                    onSearch={handleSearch}
                    onClear={handleClearSearch}
                  />
                </div>
              </div>

              {/* Notification Bell */}
              <div className="flex-shrink-0 ml-4 pt-2">
                <NotificationBell />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics (hidden when scrolled) */}
      <div className={`transition-all duration-500 ${isScrolled ? 'transform -translate-y-full opacity-0 pointer-events-none' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
          <div className="bg-white rounded-lg shadow-md p-4">
            {statsData ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-1.5 shadow-sm flex-shrink-0">
                        <ChatBubbleIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-blue-700">{(statsData.total_threads || 0).toLocaleString()}</div>
                        <div className="text-xs font-medium text-blue-600">{tStats('totalThreads')}</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-1.5 shadow-sm flex-shrink-0">
                        <MessageIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-green-700">{(statsData.total_messages || 0).toLocaleString()}</div>
                        <div className="text-xs font-medium text-green-600">{tStats('totalMessages')}</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-1.5 shadow-sm flex-shrink-0">
                        <FolderIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-purple-700">{(statsData.projects || 0).toLocaleString()}</div>
                        <div className="text-xs font-medium text-purple-600">{tStats('totalProjects')}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Conversation Chart */}
                <DailyConversationChart dailyThreadCounts={statsData.daily_thread_counts} />
              </>
            ) : (
              <div className="text-gray-500">{tStats('loading')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pb-8 pt-2">

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
          onLoadMore={handleLoadMore}
          onShowNewMessages={handleShowNewMessages}
        />
      </main>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm py-4">
        {t('footer')}
      </footer>

      {/* WebSocket Connection Status */}
      {isConnected ? (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm z-40">
          🟢 {t('realTimeUpdate')}
        </div>
      ) : (
        <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm z-40">
          🟡 {t('offline')}
        </div>
      )}

      {/* Back to Top Button */}
      {isScrolled && <BackToTopButton onClick={scrollToTop} />}
    </div>
  );
}
