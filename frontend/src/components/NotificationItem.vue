<template>
  <div
    class="notification-item border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
    :class="{
      'bg-blue-50 border-blue-100': !notification.read,
      'bg-white': notification.read
    }"
    @click="$emit('click', notification)"
  >
    <div class="p-4">
      <div class="flex items-start space-x-3">
        <!-- 通知タイプアイコン -->
        <div class="flex-shrink-0">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-sm"
            :class="getTypeIconClass(notification.type)"
          >
            {{ getTypeIcon(notification.type) }}
          </div>
        </div>

        <!-- 通知内容 -->
        <div class="flex-1 min-w-0">
          <!-- ヘッダー行 -->
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center space-x-2">
              <!-- プロジェクト名 -->
              <span class="text-sm font-medium text-purple-600 truncate">
                {{ getProjectDisplayName(notification.project_id) }}
              </span>

              <!-- 通知タイプ -->
              <span class="text-xs px-2 py-1 rounded-full" :class="getTypeBadgeClass(notification.type)">
                {{ getTypeLabel(notification.type) }}
              </span>

              <!-- 未読インジケーター -->
              <span
                v-if="!notification.read"
                class="w-2 h-2 bg-blue-500 rounded-full"
                title="未読"
              ></span>
            </div>

            <!-- 時刻 -->
            <span class="text-xs text-gray-500 flex-shrink-0">
              {{ formatTime(notification.timestamp) }}
            </span>
          </div>

          <!-- 通知メッセージ -->
          <div class="mb-2">
            <!-- 権限要求・一般通知の場合 -->
            <p
              v-if="notification.notification"
              class="text-sm text-gray-700 line-clamp-2"
            >
              {{ notification.notification }}
            </p>

            <!-- ツール使用の場合 -->
            <div v-else-if="notification.type === 'tool_use'" class="text-sm text-gray-700">
              <p class="font-medium">{{ notification.tool_name }}</p>
              <p
                v-if="notification.tool_input"
                class="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded mt-1 line-clamp-1"
              >
                {{ notification.tool_input }}
              </p>
            </div>
          </div>

          <!-- アクションボタン -->
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <!-- 既読/未読切り替え -->
              <button
                @click.stop="toggleReadStatus"
                class="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                :title="notification.read ? '未読にする' : '既読にする'"
              >
                <svg
                  class="w-3 h-3"
                  :class="{ 'text-blue-500': !notification.read }"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path v-if="notification.read" d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path v-if="notification.read" fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                  <path v-else d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"/>
                  <path v-if="!notification.read" d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
                </svg>
                <span>{{ notification.read ? '未読' : '既読' }}</span>
              </button>

            </div>

            <!-- 削除ボタン -->
            <button
              @click.stop="$emit('delete', notification.id)"
              class="text-xs text-gray-400 hover:text-red-500 transition-colors"
              title="削除"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPaths.trash" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import { useNotifications } from '../composables/useNotifications.js'
import { useNotificationStore } from '../stores/notifications.js'
import { iconPaths, notificationConfig } from '../assets/icons.js'

// Props
const props = defineProps({
  notification: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['click', 'delete'])

// Composables
const {
  formatNotificationTime,
  getNotificationIcon,
  getNotificationTypeLabel,
  markAsRead
} = useNotifications()

const notificationStore = useNotificationStore()
const getProjectDisplayName = (projectId) => {
  return notificationStore.getProjectDisplayName(projectId)
}

// メソッド

/**
 * 通知タイプのアイコンを取得
 */
const getTypeIcon = (type) => {
  const config = notificationConfig.types[type]
  return config ? config.emoji : '📢'
}

/**
 * 通知タイプのアイコンクラスを取得
 */
const getTypeIconClass = (type) => {
  const config = notificationConfig.types[type]
  if (!config) return 'bg-gray-100 text-gray-600'
  
  const colorConfig = notificationConfig.colors[config.color]
  return `${colorConfig.bg} ${colorConfig.icon}`
}

/**
 * 通知タイプのバッジクラスを取得
 */
const getTypeBadgeClass = (type) => {
  const config = notificationConfig.types[type]
  if (!config) return 'bg-gray-100 text-gray-800'
  
  const colorConfig = notificationConfig.colors[config.color]
  return `${colorConfig.bg} ${colorConfig.text}`
}

/**
 * 通知タイプのラベルを取得
 */
const getTypeLabel = (type) => {
  const config = notificationConfig.types[type]
  return config ? config.label : '不明'
}

/**
 * 時刻をフォーマット
 */
const formatTime = (timestamp) => {
  return formatNotificationTime(timestamp)
}

/**
 * 既読/未読状態を切り替え
 */
const toggleReadStatus = async () => {
  if (!props.notification.read) {
    try {
      await markAsRead(props.notification.id)
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }
  // 未読への切り替えは必要に応じて追加予定
}
</script>

<style scoped>
/* 行の制限 */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 通知アイテムのホバーエフェクト */
.notification-item:hover {
  transform: translateX(2px);
  transition: transform 0.2s ease-in-out, background-color 0.15s ease-in-out;
}

/* 未読通知の左端ボーダー */
.notification-item:not(.bg-white)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, #3b82f6, #1d4ed8);
}

.notification-item {
  position: relative;
}
</style>
