import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNotificationStore } from '../stores/notifications.js'

export function useNotifications() {
  const store = useNotificationStore()

  // ローカルstate
  const showPopup = ref(false)
  const popupTimeout = ref(null)


  // computed
  const hasUnread = computed(() => store.hasUnread)
  const unreadCount = computed(() => store.unreadCount)
  const recentNotifications = computed(() => store.recentNotifications)
  const isLoading = computed(() => store.isLoading)
  const error = computed(() => store.error)

  // methods

  /**
   * 通知ポップアップを表示
   */
  const openPopup = async () => {
    showPopup.value = true

    // 最新の通知を取得
    try {
      await store.fetchNotifications({ limit: 10 })
    } catch (err) {
      console.error('Failed to fetch recent notifications:', err)
    }

    // クリックで開いた場合は自動非表示タイマーをセットしない
    // ポップアップはユーザーが明示的に閉じるまで表示し続ける
  }

  /**
   * 通知ポップアップを閉じる
   */
  const closePopup = () => {
    showPopup.value = false

    if (popupTimeout.value) {
      clearTimeout(popupTimeout.value)
      popupTimeout.value = null
    }
  }

  /**
   * マウスがポップアップに入った時（自動非表示を停止）
   * 現在は自動非表示機能を無効化しているため、何もしない
   */
  const onPopupMouseEnter = () => {
    // 自動非表示機能を無効化
  }

  /**
   * マウスがポップアップから出た時（自動非表示を再開）
   * 現在は自動非表示機能を無効化しているため、何もしない
   */
  const onPopupMouseLeave = () => {
    // 自動非表示機能を無効化
  }

  /**
   * 通知をクリック
   */
  const onNotificationClick = async (notification) => {
    try {
      // 未読の場合は既読にマーク
      if (!notification.read) {
        await store.markAsRead(notification.id)
      }

      // 通知タイプに応じた処理を実行
      handleNotificationAction(notification)

    } catch (err) {
      console.error('Failed to handle notification click:', err)
    }
  }

  /**
   * 通知タイプ別のアクション処理
   */
  const handleNotificationAction = (notification) => {
    switch (notification.type) {
      case 'permission_request':
        // 権限要求の場合 - プロジェクトに注目を促す
        break

      case 'tool_use':
        // ツール使用の場合 - ツール使用の詳細を表示
        break

      case 'notification':
        // 一般通知の場合 - 内容を表示
        break

      default:
        // 不明な通知タイプ
    }

    // 将来的にはメッセージ送信UIを表示する予定
  }

  /**
   * 全通知を既読にマーク
   */
  const markAllAsRead = async (projectId = null) => {
    try {
      await store.markAllAsRead(projectId)

      // 成功時の処理は必要に応じて追加

    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  /**
   * 通知を削除
   */
  const deleteNotification = async (notificationId) => {
    try {
      await store.deleteNotification(notificationId)
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  /**
   * 通知時刻をフォーマット
   */
  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) {
      return 'たった今'
    } else if (diffMins < 60) {
      return `${diffMins}分前`
    } else if (diffHours < 24) {
      return `${diffHours}時間前`
    } else if (diffDays < 7) {
      return `${diffDays}日前`
    } else {
      return new Intl.DateTimeFormat('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)
    }
  }

  /**
   * 通知タイプのアイコンを取得
   */
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'permission_request':
        return '🔐' // 権限要求
      case 'tool_use':
        return '🔧' // ツール使用
      case 'notification':
        return '💬' // 一般通知
      default:
        return '📢' // デフォルト
    }
  }

  /**
   * 通知タイプの説明を取得
   */
  const getNotificationTypeLabel = (type) => {
    switch (type) {
      case 'permission_request':
        return '権限要求'
      case 'tool_use':
        return 'ツール使用'
      case 'notification':
        return '通知'
      default:
        return '不明'
    }
  }

  /**
   * 初期化処理
   */
  const initialize = async () => {
    try {
      // WebSocket接続を開始
      store.connectWebSocket()

      // プロジェクト一覧を取得
      await store.fetchProjects()

      // 初回の通知統計を取得
      await store.fetchStats()

    } catch (err) {
      console.error('Failed to initialize notifications:', err)
    }
  }

  /**
   * クリーンアップ処理
   */
  const cleanup = () => {
    closePopup()
    store.disconnectWebSocket()
  }

  // ライフサイクル
  onMounted(() => {
    initialize()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    showPopup,
    hasUnread,
    unreadCount,
    recentNotifications,
    isLoading,
    error,

    // Methods
    openPopup,
    closePopup,
    onPopupMouseEnter,
    onPopupMouseLeave,
    onNotificationClick,
    markAllAsRead,
    deleteNotification,

    // Utilities
    formatNotificationTime,
    getNotificationIcon,
    getNotificationTypeLabel,

    // Store methods (direct access)
    fetchNotifications: store.fetchNotifications,
    markAsRead: store.markAsRead,
    fetchStats: store.fetchStats
  }
}
