import { create } from 'zustand';
import { buildSearchParams } from '../utils/params';
import { MIN_NOTIFICATIONS_BEFORE_AUTOLOAD } from '../constants/ui';

export interface Notification {
  id: string;
  type: 'notification' | 'permission_request' | 'tool_use';
  project_id: string;
  session_id?: string;
  timestamp: string;
  notification?: string;
  tool_name?: string;
  tool_input?: string;
  details?: Record<string, any>;
  read: boolean;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  display_name: string;
  path: string;
}

interface NotificationState {
  // State
  notifications: Notification[];
  serverUnreadCount: number;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  showPopup: boolean;
  projects: Project[];
  hasMoreNotifications: boolean;
  currentOffset: number;

  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  setShowPopup: (show: boolean) => void;
  togglePopup: () => void;

  // API Methods
  fetchNotifications: (options?: {
    project_id?: string | null;
    type?: string | null;
    unread_only?: boolean;
    limit?: number;
    offset?: number;
  }) => Promise<any>;

  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: (projectId?: string | null) => Promise<any>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  deleteAllNotifications: (projectId?: string | null) => Promise<any>;
  loadMoreNotifications: (count?: number) => Promise<boolean>;
  fetchStats: () => Promise<any>;
  fetchProjects: () => Promise<void>;

  // WebSocket
  handleWebSocketMessage: (data: any) => void;

  // Utilities
  reset: () => void;
}

/** Derived unread count from client-side notification state */
export const selectUnreadCount = (state: NotificationState) =>
  state.notifications.filter((n) => !n.read).length;

const MAX_NOTIFICATIONS = 200;

/** Shared error handler: set store error and log */
function handleStoreError(set: (partial: Partial<NotificationState>) => void, message: string, err: unknown) {
  const errMsg = err instanceof Error ? err.message : String(err);
  set({ error: errMsg });
  console.error(message, err);
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial State
  notifications: [],
  serverUnreadCount: 0,
  totalCount: 0,
  isLoading: false,
  error: null,
  showPopup: false,
  projects: [],
  hasMoreNotifications: true,
  currentOffset: 0,

  // Basic Actions
  setNotifications: (notifications) =>
    set({ notifications }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      totalCount: state.totalCount + 1,
    })),

  setShowPopup: (show) => set({ showPopup: show }),

  togglePopup: () => set((state) => ({ showPopup: !state.showPopup })),

  // API Methods
  fetchNotifications: async (options = {}) => {
    const {
      project_id = null,
      type = null,
      unread_only = false,
      limit = 50,
      offset = 0,
    } = options;

    set({ isLoading: true, error: null });

    try {
      const params = buildSearchParams({
        project_id,
        type,
        unread_only: unread_only ? 'true' : null,
        limit,
        offset,
      });

      const response = await fetch(`/api/notifications?${params}`);

      // 404 = no notifications; handle before generic error check
      if (response.status === 404) {
        set((state) => ({
          notifications: offset === 0 ? [] : state.notifications,
          totalCount: offset === 0 ? 0 : state.notifications.length,
          hasMoreNotifications: false,
          isLoading: false,
        }));
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      set((state) => {
        const newNotifications = (offset === 0
          ? data.notifications ?? []
          : [...state.notifications, ...(data.notifications ?? [])]
        ).slice(0, MAX_NOTIFICATIONS);

        const newOffset = offset === 0
          ? (data.notifications?.length ?? 0)
          : state.currentOffset + (data.notifications?.length ?? 0);

        return {
          notifications: newNotifications,
          totalCount: data.total ?? 0,
          serverUnreadCount: data.unread_count ?? 0,
          hasMoreNotifications: newOffset < (data.total ?? 0),
          currentOffset: newOffset,
          isLoading: false,
        };
      });

      return data;
    } catch (err) {
      handleStoreError(set, 'Failed to fetch notifications:', err);
      set({ isLoading: false });
      throw err;
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
      }));

      return true;
    } catch (err) {
      handleStoreError(set, 'Failed to mark notification as read:', err);
      throw err;
    }
  },

  markAllAsRead: async (projectId: string | null = null) => {
    try {
      const body = projectId ? JSON.stringify({ project_id: projectId }) : undefined;
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      set((state) => ({
        notifications: state.notifications.map((notification) =>
          !projectId || notification.project_id === projectId
            ? { ...notification, read: true }
            : notification
        ),
      }));

      return data;
    } catch (err) {
      handleStoreError(set, 'Failed to mark all notifications as read:', err);
      throw err;
    }
  },

  deleteNotification: async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      set((state) => {
        const index = state.notifications.findIndex((n) => n.id === notificationId);
        if (index === -1) return state;

        const newNotifications = [...state.notifications];
        newNotifications.splice(index, 1);

        return {
          notifications: newNotifications,
          totalCount: Math.max(0, state.totalCount - 1),
          currentOffset: Math.max(0, state.currentOffset - 1),
        };
      });

      // Auto-load more if list is short
      const state = get();
      if (state.notifications.length < MIN_NOTIFICATIONS_BEFORE_AUTOLOAD && state.hasMoreNotifications && !state.isLoading) {
        state.fetchNotifications({
          limit: MIN_NOTIFICATIONS_BEFORE_AUTOLOAD - state.notifications.length,
          offset: state.currentOffset,
        }).catch((err) => {
          console.error('Failed to auto-load notifications after delete:', err);
        });
      }

      return true;
    } catch (err) {
      handleStoreError(set, 'Failed to delete notification:', err);
      throw err;
    }
  },

  deleteAllNotifications: async (projectId: string | null = null) => {
    try {
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId);

      const response = await fetch(`/api/notifications/bulk?${params}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      set((state) => {
        if (!projectId) {
          return {
            notifications: [],
            totalCount: 0,
            currentOffset: 0,
            hasMoreNotifications: false,
          };
        }
        const newNotifications = state.notifications.filter((n) => n.project_id !== projectId);
        const deletedCount = state.notifications.length - newNotifications.length;
        return {
          notifications: newNotifications,
          totalCount: Math.max(0, state.totalCount - deletedCount),
          currentOffset: Math.max(0, state.currentOffset - deletedCount),
        };
      });

      return data;
    } catch (err) {
      handleStoreError(set, 'Failed to delete all notifications:', err);
      throw err;
    }
  },

  loadMoreNotifications: async (count = 10) => {
    const state = get();
    if (!state.hasMoreNotifications || state.isLoading) return false;

    await state.fetchNotifications({
      limit: count,
      offset: state.currentOffset,
    });
    return true;
  },

  fetchStats: async () => {
    try {
      const response = await fetch('/api/notifications/stats');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const stats = await response.json();
      set({
        totalCount: stats.total_notifications,
        serverUnreadCount: stats.unread_count,
      });
      return stats;
    } catch (err) {
      handleStoreError(set, 'Failed to fetch notification stats:', err);
      throw err;
    }
  },

  fetchProjects: async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      set({ projects: data.projects ?? [] });
    } catch (err) {
      handleStoreError(set, 'Failed to fetch projects:', err);
    }
  },

  // WebSocket Message Handler
  handleWebSocketMessage: (data: any) => {
    switch (data.type) {
      case 'new_notification':
        if (!data.data) return;
        set((state) => ({
          notifications: [data.data, ...state.notifications].slice(0, MAX_NOTIFICATIONS),
          totalCount: state.totalCount + 1,
        }));
        break;

      case 'notification_read': {
        const notifId = data.data?.notification_id;
        if (!notifId) return;
        set((state) => {
          const notification = state.notifications.find((n) => n.id === notifId);
          if (!notification || notification.read) return state;
          return {
            notifications: state.notifications.map((n) =>
              n.id === notifId ? { ...n, read: true } : n
            ),
          };
        });
        break;
      }

      case 'stats_update':
        if (!data.data) return;
        set((state) => ({
          totalCount: data.data.total_notifications ?? state.totalCount,
          serverUnreadCount: data.data.unread_count ?? state.serverUnreadCount,
        }));
        break;
    }
  },

  // Reset
  reset: () =>
    set({
      notifications: [],
      serverUnreadCount: 0,
      totalCount: 0,
      isLoading: false,
      error: null,
      showPopup: false,
      hasMoreNotifications: true,
      currentOffset: 0,
    }),
}));
