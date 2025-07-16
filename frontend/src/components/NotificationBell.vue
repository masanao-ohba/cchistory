<template>
  <div class="relative">
    <!-- ベルアイコン -->
    <button
      @click="togglePopup"
      class="relative p-2 text-gray-600 hover:text-purple-600 transition-colors duration-200 rounded-lg hover:bg-gray-100 cursor-pointer"
      :class="{ 'text-purple-600 bg-purple-50': showPopup }"
      aria-label="通知"
    >
      <!-- ベルアイコン -->
      <svg
        class="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          :d="iconPaths.bell"
        />
      </svg>

      <!-- 通知数バッジ（未読がない場合も件数表示） -->
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-medium animate-pulse"
        :class="{
          'px-1': unreadCount <= 9,
          'px-2': unreadCount > 9
        }"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>

      <!-- 全件数表示（右下、未読がない場合） -->
      <span
        v-else-if="totalNotifications > 0"
        class="absolute -bottom-1 -right-1 bg-gray-500 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center font-medium text-[10px]"
        :class="{
          'px-1': totalNotifications <= 9,
          'px-1.5': totalNotifications > 9
        }"
        title="総通知数"
      >
        {{ totalNotifications > 99 ? '99+' : totalNotifications }}
      </span>

      <!-- 接続状態インジケーター（通知がある場合のみ表示） -->
      <span
        v-if="isConnected && totalNotifications > 0 && unreadCount === 0"
        class="absolute -top-1 -left-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"
        title="リアルタイム通知有効"
      ></span>
    </button>

    <!-- 通知ポップアップ -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <NotificationPopup
        v-if="showPopup"
        :notifications="recentNotifications"
        :unread-count="unreadCount"
        :is-loading="isLoading"
        :error="error"
        @notification-click="onNotificationClick"
        @mark-all-read="markAllAsRead"
        @delete-notification="deleteNotification"
        @close="closePopup"
        class="absolute right-0 top-full mt-2 z-50"
      />
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNotifications } from '../composables/useNotifications.js'
import { useNotificationStore } from '../stores/notifications.js'
import { iconPaths } from '../assets/icons.js'
import NotificationPopup from './NotificationPopup.vue'

// Composables
const {
  showPopup,
  hasUnread,
  unreadCount,
  recentNotifications,
  isLoading,
  error,
  openPopup,
  closePopup,
  onNotificationClick,
  markAllAsRead,
  deleteNotification
} = useNotifications()

const store = useNotificationStore()

// computed
const isConnected = computed(() => store.isConnected)
const totalNotifications = computed(() => store.totalCount)

// メソッド

/**
 * ポップアップの表示/非表示を切り替え
 */
const togglePopup = () => {
  if (showPopup.value) {
    closePopup()
  } else {
    openPopup()
  }
}

/**
 * クリックアウトサイドでポップアップを閉じる
 */
const handleClickOutside = (event) => {
  const element = event.target.closest('.relative')
  if (!element && showPopup.value) {
    closePopup()
  }
}

// ライフサイクル
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* アニメーション用のカスタムスタイル */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ベルアイコンのホバーエフェクト */
button:hover svg {
  transform: rotate(15deg);
  transition: transform 0.2s ease-in-out;
}

/* 未読バッジのエフェクト */
span[class*="bg-red-500"] {
  box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.2);
}
</style>
