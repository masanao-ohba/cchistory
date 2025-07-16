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
    <div class="max-h-96 overflow-y-auto">
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
import { defineEmits } from 'vue'
import { iconPaths } from '../assets/icons.js'
import NotificationItem from './NotificationItem.vue'

// Props
defineProps({
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
defineEmits([
  'notification-click',
  'mark-all-read',
  'delete-notification',
  'close'
])

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
</style>
