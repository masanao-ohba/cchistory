import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useConversationStore } from './conversations'

export const useNotificationStore = defineStore('notifications', () => {
  // State
  const notifications = ref([])
  const unreadCount = ref(0)
  const totalCount = ref(0)
  const isLoading = ref(false)
  const error = ref(null)
  const isConnected = ref(false)
  const projects = ref([])
  const hasMoreNotifications = ref(true)
  const currentOffset = ref(0)

  // WebSocket関連
  const ws = ref(null)

  // Computed
  const hasUnread = computed(() => unreadCount.value > 0)
  const unreadNotifications = computed(() =>
    notifications.value.filter(n => !n.read)
  )
  const recentNotifications = computed(() =>
    notifications.value
      .slice()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  )

  /**
   * プロジェクト表示名を取得
   */
  const getProjectDisplayName = computed(() => (projectId) => {
    const project = projects.value.find(p => p.id === projectId)
    return project ? project.display_name : projectId
  })

  // Actions

  /**
   * 通知一覧を取得
   */
  const fetchNotifications = async (options = {}) => {
    const {
      project_id = null,
      type = null,
      unread_only = false,
      limit = 50,
      offset = 0
    } = options

    isLoading.value = true
    error.value = null

    try {
      const params = new URLSearchParams()
      if (project_id) params.append('project_id', project_id)
      if (type) params.append('type', type)
      if (unread_only) params.append('unread_only', 'true')
      params.append('limit', limit.toString())
      params.append('offset', offset.toString())

      const response = await fetch(`/api/notifications?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (offset === 0) {
        notifications.value = data.notifications || []
        currentOffset.value = data.notifications?.length || 0
      } else {
        notifications.value.push(...(data.notifications || []))
        currentOffset.value += data.notifications?.length || 0
      }

      totalCount.value = data.total || 0
      unreadCount.value = data.unread_count || 0
      hasMoreNotifications.value = currentOffset.value < (data.total || 0)

      return data
    } catch (err) {
      // エラーが404の場合は通知がないことを意味するので、エラーを表示しない
      if (err.message.includes('404')) {
        notifications.value = offset === 0 ? [] : notifications.value
        totalCount.value = notifications.value.length
        unreadCount.value = notifications.value.filter(n => !n.read).length
        hasMoreNotifications.value = false
      } else {
        error.value = err.message
        console.error('Failed to fetch notifications:', err)
        throw err
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 通知を既読にマーク
   */
  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // ローカル状態を更新
      const notification = notifications.value.find(n => n.id === notificationId)
      if (notification && !notification.read) {
        notification.read = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }

      return true
    } catch (err) {
      error.value = err.message
      console.error('Failed to mark notification as read:', err)
      throw err
    }
  }

  /**
   * 全通知を既読にマーク
   */
  const markAllAsRead = async (projectId = null) => {
    try {
      const body = projectId ? JSON.stringify({ project_id: projectId }) : undefined
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // ローカル状態を更新
      notifications.value.forEach(notification => {
        if (!projectId || notification.project_id === projectId) {
          notification.read = true
        }
      })

      if (!projectId) {
        unreadCount.value = 0
      } else {
        unreadCount.value = notifications.value.filter(n => !n.read).length
      }

      return data
    } catch (err) {
      error.value = err.message
      console.error('Failed to mark all notifications as read:', err)
      throw err
    }
  }

  /**
   * 通知を削除
   */
  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // ローカル状態から削除
      const index = notifications.value.findIndex(n => n.id === notificationId)
      if (index !== -1) {
        const notification = notifications.value[index]
        if (!notification.read) {
          unreadCount.value = Math.max(0, unreadCount.value - 1)
        }
        notifications.value.splice(index, 1)
        totalCount.value = Math.max(0, totalCount.value - 1)
        currentOffset.value = Math.max(0, currentOffset.value - 1)
        
        // 削除後に表示件数が少なくなった場合、追加読み込みを実行
        if (notifications.value.length < 10 && hasMoreNotifications.value && !isLoading.value) {
          // 次のバッチを読み込み（エラーを無視）
          fetchNotifications({
            limit: 10 - notifications.value.length,
            offset: currentOffset.value
          }).catch(() => {
            // 通知がない場合のエラーは無視
          })
        }
      }

      return true
    } catch (err) {
      error.value = err.message
      console.error('Failed to delete notification:', err)
      throw err
    }
  }

  /**
   * 全通知を一括削除
   */
  const deleteAllNotifications = async (projectId = null) => {
    try {
      const params = new URLSearchParams()
      if (projectId) params.append('project_id', projectId)

      const response = await fetch(`/api/notifications/bulk?${params}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // ローカル状態を更新
      if (!projectId) {
        // 全削除の場合
        notifications.value = []
        unreadCount.value = 0
        totalCount.value = 0
        currentOffset.value = 0
        hasMoreNotifications.value = false
      } else {
        // プロジェクト別削除の場合
        const beforeCount = notifications.value.length
        notifications.value = notifications.value.filter(n => n.project_id !== projectId)
        const deletedCount = beforeCount - notifications.value.length
        
        unreadCount.value = notifications.value.filter(n => !n.read).length
        totalCount.value = Math.max(0, totalCount.value - deletedCount)
        currentOffset.value = Math.max(0, currentOffset.value - deletedCount)
      }

      return data
    } catch (err) {
      error.value = err.message
      console.error('Failed to delete all notifications:', err)
      throw err
    }
  }

  /**
   * 通知統計を取得
   */
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/notifications/stats')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const stats = await response.json()

      // 基本統計を更新
      totalCount.value = stats.total_notifications
      unreadCount.value = stats.unread_count

      return stats
    } catch (err) {
      error.value = err.message
      console.error('Failed to fetch notification stats:', err)
      throw err
    }
  }

  /**
   * プロジェクト一覧を取得
   */
  const fetchProjects = async () => {
    try {
      const conversationStore = useConversationStore()
      const response = await conversationStore.getProjects()
      projects.value = response.projects || []
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    }
  }

  /**
   * WebSocket接続を開始
   */
  const connectWebSocket = () => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      return // 既に接続済み
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/updates`

    ws.value = new WebSocket(wsUrl)

    ws.value.onopen = () => {
      isConnected.value = true
    }

    ws.value.onclose = () => {
      isConnected.value = false

      // 自動再接続（5秒後）
      setTimeout(() => {
        connectWebSocket()
      }, 5000)
    }

    ws.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleWebSocketMessage(data)
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    ws.value.onerror = (error) => {
      console.error('WebSocket error:', error)
      isConnected.value = false
    }
  }

  /**
   * WebSocketメッセージを処理
   */
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'new_notification':
        // 新着通知を追加
        if (data.data) {
          notifications.value.unshift(data.data)
          if (!data.data.read) {
            unreadCount.value += 1
          }
          totalCount.value += 1
        }
        break

      case 'notification_read':
        // 通知既読更新
        if (data.data?.notification_id) {
          const notification = notifications.value.find(n => n.id === data.data.notification_id)
          if (notification && !notification.read) {
            notification.read = true
            unreadCount.value = Math.max(0, unreadCount.value - 1)
          }
        }
        break

      case 'stats_update':
        // 統計更新
        if (data.data) {
          totalCount.value = data.data.total_notifications || totalCount.value
          unreadCount.value = data.data.unread_count || unreadCount.value
        }
        break

      case 'file_change':
        // 既存のファイル変更通知（既存機能との共存）
        break

      default:
        // 不明なメッセージタイプ
    }
  }

  /**
   * WebSocket接続を切断
   */
  const disconnectWebSocket = () => {
    if (ws.value) {
      ws.value.close()
      ws.value = null
      isConnected.value = false
    }
  }

  /**
   * 追加の通知を読み込む
   */
  const loadMoreNotifications = async (count = 10) => {
    if (!hasMoreNotifications.value || isLoading.value) {
      return false
    }

    try {
      await fetchNotifications({
        limit: count,
        offset: currentOffset.value
      })
      return true
    } catch (err) {
      console.error('Failed to load more notifications:', err)
      return false
    }
  }

  /**
   * ストアをリセット
   */
  const reset = () => {
    notifications.value = []
    unreadCount.value = 0
    totalCount.value = 0
    isLoading.value = false
    error.value = null
    hasMoreNotifications.value = true
    currentOffset.value = 0
    disconnectWebSocket()
  }

  return {
    // State
    notifications,
    unreadCount,
    totalCount,
    isLoading,
    error,
    isConnected,
    projects,
    hasMoreNotifications,
    currentOffset,

    // Computed
    hasUnread,
    unreadNotifications,
    recentNotifications,
    getProjectDisplayName,

    // Actions
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    loadMoreNotifications,
    fetchStats,
    fetchProjects,
    connectWebSocket,
    disconnectWebSocket,
    reset
  }
})
