'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useNotificationStore, selectUnreadCount } from '@/lib/stores/notificationStore';
import { NOTIFICATION_AUTOREAD_DELAY_MS, NOTIFICATION_AUTOREAD_FADE_MS } from '@/lib/constants/ui';
import { cn, textLinkButtonStyles } from '@/lib/styles';
import NotificationItem from './NotificationItem';

const CLOSE_ICON = 'M6 18L18 6M6 6l12 12';
const BELL_ICON = 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9';

export default function NotificationPopup() {
  const t = useTranslations('notifications');
  const {
    notifications, projects, togglePopup,
    markAllAsRead, deleteAllNotifications, deleteNotification, loadMoreNotifications, markAsRead,
  } = useNotificationStore();
  const unreadCount = useNotificationStore(selectUnreadCount);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibilityTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [autoReadingIds, setAutoReadingIds] = useState<Set<string>>(new Set());

  // Stable ref for markAsRead to avoid observer recreation
  const markAsReadRef = useRef(markAsRead);
  markAsReadRef.current = markAsRead;

  // Create IntersectionObserver once for auto-read-marking
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const timersMap = visibilityTimersRef.current;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const id = el.dataset.notificationId;
          if (!id || el.dataset.notificationRead === 'true') continue;

          if (entry.isIntersecting) {
            if (visibilityTimersRef.current.has(id)) continue;
            const timer = setTimeout(() => {
              setAutoReadingIds(prev => new Set(prev).add(id));
              setTimeout(() => {
                markAsReadRef.current(id)
                  .then(() => setAutoReadingIds(prev => { const s = new Set(prev); s.delete(id); return s; }))
                  .catch((err) => {
                    console.error('Failed to auto-mark notification as read:', err);
                    setAutoReadingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
                  });
              }, NOTIFICATION_AUTOREAD_FADE_MS);
            }, NOTIFICATION_AUTOREAD_DELAY_MS);
            visibilityTimersRef.current.set(id, timer);
          } else {
            const timer = visibilityTimersRef.current.get(id);
            if (timer) {
              clearTimeout(timer);
              visibilityTimersRef.current.delete(id);
            }
          }
        }
      },
      { root: scrollContainerRef.current, threshold: 0.5 }
    );

    return () => {
      timersMap.forEach((timer) => clearTimeout(timer));
      timersMap.clear();
      observerRef.current?.disconnect();
    };
  }, []);

  // Observe notification elements when list changes
  useEffect(() => {
    const observer = observerRef.current;
    const container = scrollContainerRef.current;
    if (!observer || !container) return;

    const rafId = requestAnimationFrame(() => {
      container.querySelectorAll('.notification-item').forEach((el) => {
        observer.observe(el);
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [notifications.length]);

  const handleAction = async (action: () => Promise<any>) => {
    try { await action(); } catch (err) {
      console.error('Notification action failed:', err);
    }
  };

  return (
    <div className="notification-popup bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[400px] max-w-[500px]">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('title')}</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 dark:bg-red-600 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={() => handleAction(() => markAllAsRead())}
              className={cn(textLinkButtonStyles('purple'), 'font-medium')}
              title={t('markAllReadTitle')}
            >
              {t('markAllRead')}
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={async () => {
                if (!confirm(t('deleteAllConfirm'))) return;
                await handleAction(() => deleteAllNotifications());
              }}
              className={cn(textLinkButtonStyles('red'), 'font-medium')}
              title={t('deleteAllTitle')}
            >
              {t('deleteAll')}
            </button>
          )}
          <button
            onClick={togglePopup}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            title={t('closeTitle')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={CLOSE_ICON} />
            </svg>
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div ref={scrollContainerRef} className="max-h-96 overflow-y-auto dark-scrollbar">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <svg className="w-8 h-8 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={BELL_ICON} />
            </svg>
            <p className="text-sm">{t('noNotifications')}</p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                projects={projects}
                onDelete={(id) => handleAction(() => deleteNotification(id))}
                onMarkAsRead={(id) => handleAction(() => markAsRead(id))}
                isAutoReading={autoReadingIds.has(notification.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{t('showing', { count: notifications.length })}</span>
            <button
              onClick={() => handleAction(() => loadMoreNotifications(10))}
              className={cn(textLinkButtonStyles('purple'), 'font-medium')}
            >
              {t('loadMore')}
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .notification-item.auto-reading {
          transition: opacity 0.75s ease-out, background-color 0.75s ease-out;
          opacity: 0.6;
          background-color: rgba(229, 231, 235, 0.5) !important;
        }
        .dark .notification-item.auto-reading {
          background-color: rgba(55, 65, 81, 0.5) !important;
        }
      `}</style>
    </div>
  );
}
