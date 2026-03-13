'use client';

import { useEffect, useRef } from 'react';
import { useNotificationStore, selectUnreadCount } from '@/lib/stores/notificationStore';
import NotificationPopup from './NotificationPopup';
import { unreadBadge, cn } from '@/lib/styles';

export default function NotificationBell() {
  const { notifications, showPopup, togglePopup, fetchNotifications, fetchStats } = useNotificationStore();
  const unreadCount = useNotificationStore(selectUnreadCount);
  const bellRef = useRef<HTMLDivElement>(null);

  // Total notifications count
  const totalNotifications = notifications.length;

  // Fetch initial notifications on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          fetchStats(),
          fetchNotifications({ limit: 50 }),
        ]);
      } catch (error) {
        console.error('Failed to load initial notification data:', error);
      }
    };
    loadInitialData();
  }, [fetchStats, fetchNotifications]);

  // Bell icon SVG path
  const bellIconPath = 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9';

  // Handle click outside to close popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        if (showPopup) {
          togglePopup();
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showPopup, togglePopup]);

  const handleToggle = () => {
    togglePopup();
  };

  return (
    <div ref={bellRef} className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={handleToggle}
        className={`relative p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
          showPopup ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30' : ''
        }`}
        aria-label="Notifications"
      >
        {/* Bell Icon */}
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          <path d={bellIconPath} />
        </svg>

        {/* Unread Count Badge (red, animated) */}
        {unreadCount > 0 && (
          <span
            className={cn(
              unreadBadge,
              'animate-pulse',
              unreadCount <= 9 ? 'px-1' : 'px-2'
            )}
            style={{
              boxShadow: '0 0 0 1px rgba(239, 68, 68, 0.2)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Total Count Badge (gray, bottom-right) */}
        {unreadCount === 0 && totalNotifications > 0 && (
          <span
            className={`absolute -bottom-1 -right-1 bg-gray-500 dark:bg-gray-600 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center font-medium text-[10px] ${
              totalNotifications <= 9 ? 'px-1' : 'px-1.5'
            }`}
            title="Total notifications"
          >
            {totalNotifications > 99 ? '99+' : totalNotifications}
          </span>
        )}
      </button>

      {/* Notification Popup */}
      {showPopup && (
        <div
          className="absolute right-0 top-full mt-2 z-50 transition-all duration-200 ease-out opacity-100 scale-100"
          style={{
            animation: 'fadeInScale 200ms ease-out',
          }}
        >
          <NotificationPopup />
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
