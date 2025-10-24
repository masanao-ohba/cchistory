'use client';

import { useEffect, useRef } from 'react';
import { useNotificationStore } from '@/lib/stores/notificationStore';
import NotificationItem from './NotificationItem';

export default function NotificationPopup() {
  const { notifications, unreadCount, togglePopup } = useNotificationStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibilityTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Icon paths
  const closeIconPath = 'M6 18L18 6M6 6l12 12';
  const bellIconPath = 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9';

  const { markAllAsRead, deleteAllNotifications, deleteNotification, loadMoreNotifications, markAsRead } = useNotificationStore();

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Delete all notifications? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteAllNotifications();
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleLoadMore = async () => {
    try {
      await loadMoreNotifications(10);
    } catch (error) {
      console.error('Failed to load more notifications:', error);
    }
  };

  // Setup IntersectionObserver for auto-read (5-second visibility threshold)
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    // Capture ref values for cleanup
    const timersMap = visibilityTimersRef.current;

    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const notificationElement = entry.target as HTMLElement;
          const notificationId = notificationElement.dataset.notificationId;

          if (!notificationId) return;

          const notification = notifications.find((n) => n.id === notificationId);
          if (!notification || notification.read) return;

          if (entry.isIntersecting) {
            // Start 5-second timer when notification becomes visible
            if (!visibilityTimersRef.current.has(notificationId)) {
              console.log(`Auto-read timer started for notification: ${notificationId}`);
              const timer = setTimeout(async () => {
                try {
                  console.log(`Auto-marking notification as read: ${notificationId}`);

                  // Add fade effect
                  notificationElement.classList.add('auto-reading');

                  // Mark as read after fade animation completes
                  setTimeout(async () => {
                    await markAsRead(notificationId);
                    notificationElement.classList.remove('auto-reading');
                  }, 750);
                } catch (err) {
                  console.error('Failed to auto-mark notification as read:', err);
                  notificationElement.classList.remove('auto-reading');
                }
              }, 5000);

              visibilityTimersRef.current.set(notificationId, timer);
            }
          } else {
            // Cancel timer when notification leaves viewport
            const timer = visibilityTimersRef.current.get(notificationId);
            if (timer) {
              console.log(`Auto-read timer cancelled for notification: ${notificationId}`);
              clearTimeout(timer);
              visibilityTimersRef.current.delete(notificationId);
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.5, // 50% visible
      }
    );

    // Observe all notification items after a short delay
    setTimeout(() => {
      const notificationElements = scrollContainerRef.current?.querySelectorAll('.notification-item');
      notificationElements?.forEach((element) => {
        observerRef.current?.observe(element);
      });
    }, 100);

    // Cleanup on unmount
    return () => {
      // Clear all timers using captured ref value
      timersMap.forEach((timer) => clearTimeout(timer));
      timersMap.clear();

      // Disconnect observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [notifications, markAsRead]);

  return (
    <div className="notification-popup bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden min-w-[400px] max-w-[500px]">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Mark All Read Button */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium"
              title="Mark all as read"
            >
              Mark all read
            </button>
          )}

          {/* Delete All Button */}
          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="text-xs text-red-600 hover:text-red-800 font-medium"
              title="Delete all notifications"
            >
              Delete all
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={togglePopup}
            className="text-gray-400 hover:text-gray-600 p-1"
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={closeIconPath} />
            </svg>
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div ref={scrollContainerRef} className="max-h-96 overflow-y-auto custom-scrollbar">
        {/* No Notifications */}
        {notifications.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={bellIconPath} />
            </svg>
            <p className="text-sm">No notifications</p>
          </div>
        )}

        {/* Notification Items */}
        {notifications.length > 0 && (
          <div>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={(n) => console.log('Notification clicked:', n)}
                onDelete={handleDeleteNotification}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Showing {notifications.length} notifications</span>
            <button
              onClick={handleLoadMore}
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              Load more
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }

        /* Auto-reading fade effect */
        .notification-item.auto-reading {
          transition: opacity 0.75s ease-out, background-color 0.75s ease-out;
          opacity: 0.6;
          background-color: rgba(229, 231, 235, 0.5) !important; /* gray-200 with opacity */
        }
      `}</style>
    </div>
  );
}
