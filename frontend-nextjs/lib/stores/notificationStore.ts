import { create } from 'zustand';

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
  unreadCount: number;
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

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial State
  notifications: [],
  unreadCount: 0,
  totalCount: 0,
  isLoading: false,
  error: null,
  showPopup: false,
  projects: [],
  hasMoreNotifications: true,
  currentOffset: 0,

  // Basic Actions
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),

  addNotification: (notification) =>
    set((state) => {
      const newNotifications = [notification, ...state.notifications];
      return {
        notifications: newNotifications,
        unreadCount: newNotifications.filter((n) => !n.read).length,
        totalCount: state.totalCount + 1,
      };
    }),

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
      const params = new URLSearchParams();
      if (project_id) params.append('project_id', project_id);
      if (type) params.append('type', type);
      if (unread_only) params.append('unread_only', 'true');
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`/api/notifications?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      set((state) => {
        const newNotifications = offset === 0
          ? data.notifications || []
          : [...state.notifications, ...(data.notifications || [])];

        const newOffset = offset === 0
          ? (data.notifications?.length || 0)
          : state.currentOffset + (data.notifications?.length || 0);

        return {
          notifications: newNotifications,
          totalCount: data.total || 0,
          unreadCount: data.unread_count || 0,
          hasMoreNotifications: newOffset < (data.total || 0),
          currentOffset: newOffset,
          isLoading: false,
        };
      });

      return data;
    } catch (err: any) {
      // 404 means no notifications, not an error
      if (err.message.includes('404')) {
        set((state) => ({
          notifications: offset === 0 ? [] : state.notifications,
          totalCount: offset === 0 ? 0 : state.notifications.length,
          unreadCount: offset === 0 ? 0 : state.notifications.filter((n) => !n.read).length,
          hasMoreNotifications: false,
          isLoading: false,
        }));
      } else {
        set({ error: err.message, isLoading: false });
        console.error('Failed to fetch notifications:', err);
        throw err;
      }
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

      // Update local state
      set((state) => {
        const notifications = state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        );
        const notification = state.notifications.find((n) => n.id === notificationId);
        const unreadDecrement = notification && !notification.read ? 1 : 0;

        return {
          notifications,
          unreadCount: Math.max(0, state.unreadCount - unreadDecrement),
        };
      });

      return true;
    } catch (err: any) {
      set({ error: err.message });
      console.error('Failed to mark notification as read:', err);
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

      // Update local state
      set((state) => {
        const notifications = state.notifications.map((notification) =>
          !projectId || notification.project_id === projectId
            ? { ...notification, read: true }
            : notification
        );

        const unreadCount = projectId
          ? notifications.filter((n) => !n.read).length
          : 0;

        return {
          notifications,
          unreadCount,
        };
      });

      return data;
    } catch (err: any) {
      set({ error: err.message });
      console.error('Failed to mark all notifications as read:', err);
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

      // Update local state
      set((state) => {
        const index = state.notifications.findIndex((n) => n.id === notificationId);
        if (index === -1) return state;

        const notification = state.notifications[index];
        const newNotifications = [...state.notifications];
        newNotifications.splice(index, 1);

        const unreadDecrement = !notification.read ? 1 : 0;

        return {
          notifications: newNotifications,
          unreadCount: Math.max(0, state.unreadCount - unreadDecrement),
          totalCount: Math.max(0, state.totalCount - 1),
          currentOffset: Math.max(0, state.currentOffset - 1),
        };
      });

      // Auto-load more if list is short
      const state = get();
      if (
        state.notifications.length < 10 &&
        state.hasMoreNotifications &&
        !state.isLoading
      ) {
        state.fetchNotifications({
          limit: 10 - state.notifications.length,
          offset: state.currentOffset,
        }).catch(() => {
          // Ignore errors for auto-load
        });
      }

      return true;
    } catch (err: any) {
      set({ error: err.message });
      console.error('Failed to delete notification:', err);
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

      // Update local state
      set((state) => {
        if (!projectId) {
          // Delete all
          return {
            notifications: [],
            unreadCount: 0,
            totalCount: 0,
            currentOffset: 0,
            hasMoreNotifications: false,
          };
        } else {
          // Delete by project
          const beforeCount = state.notifications.length;
          const newNotifications = state.notifications.filter(
            (n) => n.project_id !== projectId
          );
          const deletedCount = beforeCount - newNotifications.length;

          return {
            notifications: newNotifications,
            unreadCount: newNotifications.filter((n) => !n.read).length,
            totalCount: Math.max(0, state.totalCount - deletedCount),
            currentOffset: Math.max(0, state.currentOffset - deletedCount),
          };
        }
      });

      return data;
    } catch (err: any) {
      set({ error: err.message });
      console.error('Failed to delete all notifications:', err);
      throw err;
    }
  },

  loadMoreNotifications: async (count = 10) => {
    const state = get();
    if (!state.hasMoreNotifications || state.isLoading) {
      return false;
    }

    try {
      await state.fetchNotifications({
        limit: count,
        offset: state.currentOffset,
      });
      return true;
    } catch (err) {
      console.error('Failed to load more notifications:', err);
      return false;
    }
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
        unreadCount: stats.unread_count,
      });

      return stats;
    } catch (err: any) {
      set({ error: err.message });
      console.error('Failed to fetch notification stats:', err);
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
      set({ projects: data.projects || [] });
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  },

  // WebSocket Message Handler
  handleWebSocketMessage: (data: any) => {
    switch (data.type) {
      case 'new_notification':
        if (data.data) {
          set((state) => {
            const newNotifications = [data.data, ...state.notifications];
            const unreadIncrement = !data.data.read ? 1 : 0;
            return {
              notifications: newNotifications,
              unreadCount: state.unreadCount + unreadIncrement,
              totalCount: state.totalCount + 1,
            };
          });
        }
        break;

      case 'notification_read':
        if (data.data?.notification_id) {
          set((state) => {
            const notification = state.notifications.find(
              (n) => n.id === data.data.notification_id
            );
            if (notification && !notification.read) {
              const notifications = state.notifications.map((n) =>
                n.id === data.data.notification_id ? { ...n, read: true } : n
              );
              return {
                notifications,
                unreadCount: Math.max(0, state.unreadCount - 1),
              };
            }
            return state;
          });
        }
        break;

      case 'stats_update':
        if (data.data) {
          set((state) => ({
            totalCount: data.data.total_notifications || state.totalCount,
            unreadCount: data.data.unread_count || state.unreadCount,
          }));
        }
        break;

      default:
        // Unknown message type
        break;
    }
  },

  // Reset
  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      totalCount: 0,
      isLoading: false,
      error: null,
      showPopup: false,
      hasMoreNotifications: true,
      currentOffset: 0,
    }),
}));
