<template>
  <div class="bg-white rounded-lg shadow-md overflow-hidden">
    <!-- ヘッダー -->
    <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
      <h2 class="text-xl font-semibold text-gray-900">{{ $t('conversations.title') }}</h2>
      <p class="text-sm text-gray-500 mt-1">
        {{ totalCount && totalCount > conversations.length ? $t('conversations.showingFiltered', { count: conversations.length.toLocaleString(), total: totalCount.toLocaleString() }) : $t('conversations.showing', { count: conversations.length.toLocaleString() }) }}
      </p>
    </div>

    <!-- ローディング -->
    <div v-if="loading && conversations.length === 0" class="p-8 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
      <p class="text-gray-500 mt-4">{{ $t('conversations.loading') }}</p>
    </div>

    <!-- 会話がない場合 -->
    <div v-else-if="conversations.length === 0" class="p-8 text-center">
      <div class="text-gray-400 text-6xl mb-4">💬</div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">{{ $t('conversations.noConversations') }}</h3>
      <p class="text-gray-500">{{ $t('conversations.noConversationsHint') }}</p>
    </div>

    <!-- 会話リスト -->
    <div v-else class="space-y-3">
      <div
        v-for="(conversation, index) in conversations"
        :key="`${conversation.session_id}-${index}`"
        class="transition-all duration-200 hover:scale-[1.005]"
        :class="[
          'rounded-lg p-3 shadow-sm',
          conversation.type === 'user'
            ? 'bg-blue-50 ml-0 mr-12'
            : 'bg-green-50 ml-12 mr-0'
        ]"
      >
        <!-- メタ情報 -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-3">
            <!-- アバター風アイコン -->
            <div
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold',
                conversation.type === 'user'
                  ? 'bg-blue-500'
                  : 'bg-green-500'
              ]"
            >
              {{ conversation.type === 'user' ? 'U' : 'A' }}
            </div>

            <!-- タイプラベル -->
            <span
              :class="[
                'text-sm font-medium',
                conversation.type === 'user'
                  ? 'text-blue-700'
                  : 'text-green-700'
              ]"
            >
              {{ conversation.type === 'user' ? $t('conversations.user') : $t('conversations.assistant') }}
            </span>
          </div>

          <!-- タイムスタンプ -->
          <time class="text-xs text-gray-500">
            {{ formatTimestamp(conversation.timestamp) }}
          </time>
        </div>

        <!-- コンテンツ -->
        <div
          :class="[
            'leading-relaxed break-words rounded-md p-3 bg-white text-gray-900 markdown-content',
            { 'line-clamp-3': !expandedItems.has(index) }
          ]"
          v-html="renderMarkdown(conversation.content, conversation.searchKeyword)"
        ></div>

        <!-- 展開/折りたたみボタン -->
        <button
          v-if="shouldShowToggleButton(conversation.content)"
          @click="toggleExpand(index)"
          :class="[
            'mt-2 text-sm font-medium hover:underline',
            conversation.type === 'user'
              ? 'text-blue-600 hover:text-blue-800'
              : 'text-green-600 hover:text-green-800'
          ]"
        >
          {{ expandedItems.has(index) ? $t('conversations.collapse') : $t('conversations.showMore') }}
        </button>

      </div>
    </div>

    <!-- もっと読み込むボタン -->
    <div v-if="hasMore" class="p-6 bg-gray-50 border-t border-gray-200">
      <div v-if="lastLoadedCount > 0" class="mb-3 text-center text-sm text-green-600 font-medium animate-pulse">
        ✓ {{ $t('conversations.newConversationsLoaded', { count: lastLoadedCount }) }}
      </div>
      <button
        @click="handleLoadMore"
        :disabled="loading"
        class="w-full px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        :class="{ 'animate-pulse': loading }"
      >
        <span v-if="loading" class="flex items-center justify-center">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ $t('conversations.loading') }}
        </span>
        <span v-else>{{ $t('conversations.loadMore') }} {{ loadMoreRangeText }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import MarkdownIt from 'markdown-it'

const emit = defineEmits(['load-more'])
const props = defineProps({
  conversations: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  hasMore: {
    type: Boolean,
    default: false
  },
  totalCount: {
    type: Number,
    default: 0
  }
})

// Markdownパーサーの初期化
const md = new MarkdownIt({
  html: false,
  xhtmlOut: false,
  breaks: true,
  linkify: true,
  typographer: true
})

// 展開状態管理
const expandedItems = ref(new Set())
const lastLoadedCount = ref(0)

// 計算プロパティ
const loadMoreRangeText = computed(() => {
  if (!props.totalCount || props.conversations.length === 0) return ''

  const start = props.conversations.length + 1
  const defaultBatchSize = 100 // デフォルトの読み込み件数
  const remaining = props.totalCount - props.conversations.length
  const end = props.conversations.length + Math.min(defaultBatchSize, remaining)

  return `(${start.toLocaleString()}件〜${end.toLocaleString()}件)`
})

// メソッド
const renderMarkdown = (content, searchKeyword = null) => {
  if (!content) return ''

  // まずMarkdownをレンダリング
  let renderedContent = md.render(content)

  // 検索キーワードがある場合、レンダリング後のHTMLにハイライトを適用
  if (searchKeyword) {
    const regex = new RegExp(`(${searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    renderedContent = renderedContent.replace(regex, '<mark>$1</mark>')
  }

  return renderedContent
}

const handleLoadMore = () => {
  const prevCount = props.conversations.length
  emit('load-more')

  // 少し待ってから新しく読み込まれた件数を計算
  setTimeout(() => {
    const newCount = props.conversations.length
    lastLoadedCount.value = newCount - prevCount

    // 3秒後にメッセージを非表示
    setTimeout(() => {
      lastLoadedCount.value = 0
    }, 3000)
  }, 500)
}
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
  if (expandedItems.value.has(index)) {
    expandedItems.value.delete(index)
  } else {
    expandedItems.value.add(index)
  }
}

// 「もっと見る」ボタンを表示するかどうかの判定
const shouldShowToggleButton = (content) => {
  // 改行で分割して行数をカウント
  const lines = content.split('\n')
  // 3行以上、または1行が長すぎる場合にボタンを表示
  return lines.length > 3 || content.length > 200
}
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Markdownコンテンツのスタイリング */
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  @apply font-bold text-gray-900 mb-2 mt-4;
}

.markdown-content :deep(h1) { @apply text-xl; }
.markdown-content :deep(h2) { @apply text-lg; }
.markdown-content :deep(h3) { @apply text-base; }

.markdown-content :deep(p) {
  @apply mb-3 last:mb-0 leading-relaxed;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  @apply mb-3 pl-6;
}

.markdown-content :deep(li) {
  @apply mb-1;
}

.markdown-content :deep(ul li) {
  @apply list-disc;
}

.markdown-content :deep(ol li) {
  @apply list-decimal;
}

.markdown-content :deep(blockquote) {
  @apply border-l-4 border-gray-300 pl-4 italic text-gray-600 my-3;
}

.markdown-content :deep(code) {
  @apply bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800;
}

.markdown-content :deep(pre) {
  @apply bg-gray-100 p-3 rounded-md overflow-x-auto mb-3 border;
}

.markdown-content :deep(pre code) {
  @apply bg-transparent p-0 text-sm;
}

.markdown-content :deep(a) {
  @apply text-blue-600 hover:text-blue-800 underline;
}

.markdown-content :deep(strong) {
  @apply font-bold;
}

.markdown-content :deep(em) {
  @apply italic;
}

.markdown-content :deep(hr) {
  @apply border-gray-300 my-4;
}

.markdown-content :deep(table) {
  @apply w-full border-collapse border border-gray-300 mb-3;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  @apply border border-gray-300 px-3 py-2 text-left;
}

.markdown-content :deep(th) {
  @apply bg-gray-50 font-semibold;
}

/* 検索ハイライト */
.markdown-content :deep(mark) {
  @apply bg-yellow-200 px-1 py-0.5 rounded-sm font-medium;
}
</style>
