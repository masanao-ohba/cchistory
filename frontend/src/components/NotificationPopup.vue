<template>
  <div
    class="notification-popup bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden min-w-[400px] max-w-[500px]"
  >
    <!-- ヘッダー -->
    <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <h3 class="font-semibold text-gray-900">{{ $t('notifications.title') }}</h3>
        <span
          v-if="unreadCount > 0"
          class="bg-red-500 text-white text-xs px-2 py-1 rounded-full"
        >
          {{ unreadCount }}
        </span>
      </div>

      <div class="flex items-center space-x-2">
        <!-- 全て既読ボタン -->
        <button
          v-if="unreadCount > 0"
          @click="$emit('mark-all-read')"
          class="text-xs text-purple-600 hover:text-purple-800 font-medium"
          :title="$t('notifications.markAllReadTitle')"
        >
          {{ $t('notifications.markAllRead') }}
        </button>

        <!-- 閉じるボタン -->
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 p-1"
          :title="$t('notifications.closeTitle')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPaths.close" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 通知リスト -->
    <div ref="scrollContainer" class="max-h-96 overflow-y-auto">
      <!-- ローディング状態 -->
      <div v-if="isLoading" class="p-4 text-center text-gray-500">
        <svg class="animate-spin h-5 w-5 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" :d="iconPaths.spinner"></path>
        </svg>
        {{ $t('notifications.loading') }}
      </div>

      <!-- エラー状態 -->
      <div v-else-if="error" class="p-4 text-center text-red-500">
        <svg class="w-5 h-5 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPaths.exclamationCircle" />
        </svg>
        {{ error }}
      </div>

      <!-- 通知なし -->
      <div v-else-if="notifications.length === 0" class="p-8 text-center text-gray-500">
        <svg class="w-8 h-8 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPaths.bell" />
        </svg>
        <p class="text-sm">{{ $t('notifications.noNotifications') }}</p>
      </div>

      <!-- 通知アイテム -->
      <div v-else>
        <NotificationItem
          v-for="notification in notifications"
          :key="notification.id"
          :notification="notification"
          @click="$emit('notification-click', notification)"
          @delete="$emit('delete-notification', notification.id)"
        />
      </div>
    </div>

    <!-- フッター -->
    <div v-if="notifications.length > 0" class="bg-gray-50 px-4 py-3 border-t border-gray-200">
      <div class="flex items-center justify-between text-sm text-gray-600">
        <span>{{ $t('notifications.count', { count: notifications.length }) }}</span>
        <button
          @click="viewAllNotifications"
          class="text-purple-600 hover:text-purple-800 font-medium"
        >
          {{ $t('notifications.viewAll') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineEmits, ref, watch, onMounted, onUnmounted } from 'vue'
import { iconPaths } from '../assets/icons.js'
import { useNotificationStore } from '../stores/notifications.js'
import NotificationItem from './NotificationItem.vue'

// Props
const props = defineProps({
  notifications: {
    type: Array,
    default: () => []
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
})

// Emits
const emit = defineEmits([
  'notification-click',
  'mark-all-read',
  'delete-notification',
  'close'
])

// Store
const notificationStore = useNotificationStore()

// Auto-read functionality
const visibilityTimers = ref(new Map())
const observer = ref(null)
const scrollContainer = ref(null)

// Intersection Observer の設定
const setupIntersectionObserver = () => {
  if (!scrollContainer.value) return

  observer.value = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const notificationElement = entry.target
        const notificationId = notificationElement.dataset.notificationId

        if (!notificationId) return

        const notification = props.notifications.find(n => n.id === notificationId)
        if (!notification || notification.read) return

        if (entry.isIntersecting) {
          // 表示されている場合、5秒後に既読にするタイマーを設定
          if (!visibilityTimers.value.has(notificationId)) {
            console.log(`Auto-read timer started for notification: ${notificationId}`)
            const timer = setTimeout(async () => {
              try {
                console.log(`Auto-marking notification as read: ${notificationId}`)

                // 個別要素のフェード効果を適用
                notificationElement.classList.add('auto-reading')

                // フェード完了後に既読化を実行
                setTimeout(async () => {
                  await notificationStore.markAsRead(notificationId)
                  // 既読化完了後にクラスを削除
                  notificationElement.classList.remove('auto-reading')
                }, 750)

              } catch (err) {
                console.error('Failed to auto-mark notification as read:', err)
              }
              visibilityTimers.value.delete(notificationId)
            }, 5000)
            visibilityTimers.value.set(notificationId, timer)
          }
        } else {
          // 表示されていない場合、タイマーをクリア
          const timer = visibilityTimers.value.get(notificationId)
          if (timer) {
            console.log(`Auto-read timer cleared for notification: ${notificationId}`)
            clearTimeout(timer)
            visibilityTimers.value.delete(notificationId)
          }
        }
      })
    },
    {
      root: scrollContainer.value, // スクロール可能なコンテナを基準に
      threshold: 0.5, // 50%以上表示されたときに判定
      rootMargin: '0px'
    }
  )
}

// 通知要素を監視対象に追加
const observeNotifications = () => {
  if (!observer.value) return

  // 既存の監視を停止
  observer.value.disconnect()

  // DOM更新を待ってから通知要素を監視対象に追加
  setTimeout(() => {
    const notificationElements = scrollContainer.value?.querySelectorAll('[data-notification-id]')
    if (notificationElements) {
      notificationElements.forEach(element => {
        const notificationId = element.dataset.notificationId
        const notification = props.notifications.find(n => n.id === notificationId)
        if (notification && !notification.read) {
          observer.value.observe(element)
        }
      })
    }
  }, 100)
}

// 通知リストが変更されたときに監視対象を更新
watch(() => props.notifications, observeNotifications, { immediate: true })

// ライフサイクル
onMounted(() => {
  // DOM更新を待ってからObserverを設定
  setTimeout(() => {
    setupIntersectionObserver()
    observeNotifications()
  }, 100)
})

onUnmounted(() => {
  // 全てのタイマーをクリア
  visibilityTimers.value.forEach(timer => clearTimeout(timer))
  visibilityTimers.value.clear()

  // Observerを停止
  if (observer.value) {
    observer.value.disconnect()
  }
})

// メソッド
const viewAllNotifications = () => {
  // 将来的には通知専用ページに遷移する予定
}
</script>

<style scoped>
/* カスタムスクロールバー */
.notification-popup div::-webkit-scrollbar {
  width: 6px;
}

.notification-popup div::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.notification-popup div::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.notification-popup div::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* ポップアップのシャドウ */
.notification-popup {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* アニメーション用 */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 自動既読化フェード効果 - 個別要素のみ */
.auto-reading {
  /* 背景色を白に変化 */
  background-color: white !important;
  border-color: #f3f4f6 !important;
  transition: background-color 0.4s ease-in-out, border-color 0.4s ease-in-out;
}

.auto-reading .unread-indicator {
  /* 青い丸印をフェードアウト */
  opacity: 0;
  transition: opacity 0.4s ease-in-out;
}

.auto-reading::before {
  /* 青い縦罫線をフェードアウト */
  opacity: 0;
  transition: opacity 0.4s ease-in-out;
}

.auto-reading .mark-read-text {
  /* Mark Read文言をフェードアウト */
  opacity: 0;
  transition: opacity 0.4s ease-in-out;
}
</style>
