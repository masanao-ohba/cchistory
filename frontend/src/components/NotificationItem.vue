<template>
  <div
    class="notification-item border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
    :class="{
      'bg-blue-50 border-blue-100': !notification.read,
      'bg-white': notification.read
    }"
    :data-notification-id="notification.id"
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
                class="w-2 h-2 bg-blue-500 rounded-full unread-indicator"
                :title="$t('notifications.unread')"
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

            <!-- 詳細情報の表示（Claude Code hookからの追加データ） -->
            <div v-if="hasDetails" class="mt-3">
              <!-- 展開/折りたたみボタン -->
              <button
                @click.stop="toggleDetails"
                class="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <svg
                  class="w-4 h-4 transition-transform duration-200"
                  :class="{ 'rotate-90': showDetails }"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                </svg>
                <span>{{ showDetails ? 'Hide Details' : 'Show Details' }}</span>
              </button>

              <!-- 詳細内容 -->
              <div v-show="showDetails" class="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <!-- オプション/選択肢がある場合 -->
                <div v-if="detailOptions && detailOptions.length > 0" class="space-y-1">
                  <p class="text-xs font-medium text-gray-600 mb-2">Available Options:</p>
                  <div
                    v-for="(option, index) in detailOptions"
                    :key="index"
                    class="flex items-start space-x-2"
                  >
                    <span class="text-xs font-mono text-blue-600">{{ index + 1 }}.</span>
                    <span class="text-xs text-gray-700 flex-1">{{ option }}</span>
                  </div>
                </div>

                <!-- その他の詳細情報 -->
                <div v-if="otherDetails" class="mt-3 space-y-1">
                  <p class="text-xs font-medium text-gray-600 mb-1">Additional Information:</p>
                  <pre class="text-xs text-gray-600 font-mono bg-white p-2 rounded border border-gray-200 overflow-x-auto">{{ formattedOtherDetails }}</pre>
                </div>

                <!-- セッションIDがある場合 -->
                <div v-if="props.notification.details?.session_id" class="mt-2 pt-2 border-t border-gray-200">
                  <p class="text-xs text-gray-500">
                    <span class="font-medium">Session:</span> {{ props.notification.details.session_id }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- アクションボタン -->
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <!-- 既読/未読切り替え -->
              <button
                @click.stop="toggleReadStatus"
                class="p-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-1 touch-manipulation"
                :title="notification.read ? $t('notifications.markUnreadTitle') : $t('notifications.markReadTitle')"
              >
                <svg
                  class="w-4 h-4"
                  :class="{ 'text-blue-500': !notification.read }"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path v-if="notification.read" d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path v-if="notification.read" fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                  <path v-else d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"/>
                  <path v-if="!notification.read" d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
                </svg>
                <span :class="{ 'mark-read-text': !notification.read }">{{ notification.read ? $t('notifications.unread') : $t('notifications.markRead') }}</span>
              </button>

            </div>

            <!-- 削除ボタン -->
            <button
              @click.stop="$emit('delete', notification.id)"
              class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors touch-manipulation"
              :title="$t('notifications.deleteTitle')"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
import { defineProps, defineEmits, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
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

// State
const showDetails = ref(false)

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

// Computed
/**
 * 詳細情報があるかチェック
 */
const hasDetails = computed(() => {
  // デバッグ: 各通知の詳細を確認
  const details = props.notification?.details
  if (details) {
    console.debug(`Notification ${props.notification.id} has details:`, details)
  }
  return details && Object.keys(details).length > 0
})

/**
 * 詳細からオプション/選択肢を抽出
 */
const detailOptions = computed(() => {
  const details = props.notification?.details
  if (!details) return []

  // options配列がある場合
  if (Array.isArray(details.options)) {
    return details.options
  }

  // choices配列がある場合
  if (Array.isArray(details.choices)) {
    return details.choices
  }

  // optionsが文字列の場合、改行で分割
  if (typeof details.options === 'string') {
    return details.options.split('\n').filter(opt => opt.trim())
  }

  return []
})

/**
 * オプション以外の詳細情報
 */
const otherDetails = computed(() => {
  const details = props.notification?.details
  if (!details) return null

  // 深いコピーを作成して元のデータを変更しない
  const detailsCopy = JSON.parse(JSON.stringify(details))
  // 表示不要なフィールドのみを除外（session_id, cwd, transcript_pathは表示する）
  delete detailsCopy.options
  delete detailsCopy.choices
  delete detailsCopy.hook_event_name  // これも一般的なので除外

  return Object.keys(detailsCopy).length > 0 ? detailsCopy : null
})

/**
 * その他詳細情報のフォーマット済み表示
 */
const formattedOtherDetails = computed(() => {
  const other = otherDetails.value
  if (!other) return ''
  return JSON.stringify(other, null, 2)
})

// メソッド

/**
 * 詳細表示の切り替え
 */
const toggleDetails = () => {
  showDetails.value = !showDetails.value
}

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
  if (config && config.labelKey) {
    return useI18n().t(config.labelKey)
  }
  return useI18n().t('notifications.types.unknown')
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
.notification-item {
  transition: background-color 0.15s ease-in-out;
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
