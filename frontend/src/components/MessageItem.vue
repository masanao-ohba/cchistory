<template>
  <div :class="messageContainerClasses">
    <!-- メタ情報 -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-3">
        <!-- アバター風アイコン -->
        <div :class="avatarClasses">
          {{ conversation.type === 'user' ? 'U' : 'A' }}
        </div>

        <!-- タイプラベル -->
        <span :class="typeLabelClasses">
          {{ conversation.type === 'user' ? $t('conversations.user') : $t('conversations.assistant') }}
        </span>
      </div>

      <!-- タイムスタンプ -->
      <time class="text-xs text-gray-500">
        {{ formatTimestamp(conversation.timestamp) }}
      </time>
    </div>

    <!-- コンテンツ -->
    <div :class="contentClasses" v-html="renderMarkdown(conversation.content, conversation.search_keyword)" @click="handleCodeCopy"></div>

    <!-- 展開/折りたたみボタン -->
    <button v-if="shouldShowToggleButton(conversation.content)" @click="toggleExpand(index)" :class="toggleButtonClasses">
      {{ expandedItems.has(index) ? $t('conversations.collapse') : $t('conversations.showMore') }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t: $t } = useI18n()

const props = defineProps({
  conversation: { type: Object, required: true },
  index: { type: Number, required: true },
  expandedItems: { type: Set, required: true },
  renderMarkdown: { type: Function, required: true },
  handleCodeCopy: { type: Function, required: true },
  shouldShowToggleButton: { type: Function, required: true }
})

const emit = defineEmits(['toggle-expand'])

const isUser = computed(() => props.conversation.type === 'user')

const messageContainerClasses = computed(() => [
  'transition-all duration-200 hover:scale-[1.002] rounded-lg p-3 shadow-sm',
  isUser.value
    ? 'bg-gradient-to-br from-blue-100 to-blue-200 ml-0 mr-8'
    : 'bg-gradient-to-br from-green-100 to-green-200 ml-8 mr-0'
])

const avatarClasses = computed(() => [
  'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold',
  isUser.value ? 'bg-blue-500' : 'bg-green-500'
])

const typeLabelClasses = computed(() => [
  'text-sm font-medium',
  isUser.value ? 'text-blue-700' : 'text-green-700'
])

const contentClasses = computed(() => [
  'leading-relaxed break-words rounded-md p-3 text-gray-900 markdown-content shadow-sm border',
  isUser.value ? 'bg-blue-50 border-blue-300' : 'bg-green-50 border-green-300',
  { 'line-clamp-3': !props.expandedItems.has(props.index) }
])

const toggleButtonClasses = computed(() => [
  'mt-2 text-sm font-medium hover:underline',
  isUser.value
    ? 'text-blue-600 hover:text-blue-800'
    : 'text-green-600 hover:text-green-800'
])

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Tokyo'
  }).format(date)
}

const toggleExpand = (index) => {
  emit('toggle-expand', index)
}
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>