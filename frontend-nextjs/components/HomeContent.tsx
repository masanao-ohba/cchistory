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

  // Update search results when conversations data changes
  useEffect(() => {
    if (searchBoxRef.current && currentFilters.keyword) {
      const totalMessages = conversationsData?.total_messages || 0;
      searchBoxRef.current.setSearchResults({
        total: totalMessages,
        keyword: currentFilters.keyword,
      });
    }
  }, [conversationsData?.total_messages, currentFilters.keyword]); // Only depend on specific field

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
      <div className="sticky top-0 z-50 bg-white shadow-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4">
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
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
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
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
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
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
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
