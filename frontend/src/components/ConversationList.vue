<template>
  <div class="bg-gray-100 rounded-lg overflow-hidden">
    <!-- ヘッダー -->
    <div class="bg-slate-50 px-4 py-2 border-b border-gray-200/60 rounded-t-lg rounded-b-lg mb-4">
      <h2 class="text-xl font-semibold text-gray-800">{{ $t('conversations.title') }}</h2>
      <p class="text-sm text-gray-600 mt-1">
        {{ totalThreads && totalThreads > actualThreads ? $t('conversations.showingThreadsFiltered', { threads: actualThreads.toLocaleString(), messages: actualMessages.toLocaleString(), totalThreads: totalThreads.toLocaleString() }) : $t('conversations.showingThreads', { threads: actualThreads.toLocaleString(), messages: actualMessages.toLocaleString() }) }}
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
    <div v-else class="space-y-6">
      <div
        v-for="(threadGroup, threadIndex) in groupedConversations"
        :key="`thread-${threadIndex}`"
        class="bg-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <div class="space-y-3">
          <MessageItem
            v-for="(conversation, index) in threadGroup"
            :key="`${conversation.session_id}-${index}`"
            :conversation="conversation"
            :index="Number(index)"
            :expanded-items="expandedItems"
            :render-markdown="renderMarkdown"
            :handle-code-copy="handleCodeCopy"
            :should-show-toggle-button="shouldShowToggleButton"
            @toggle-expand="toggleExpand"
          />
        </div>
      </div>
    </div>

    <!-- もっと読み込むボタン -->
    <div v-if="hasMore" class="p-6 bg-transparent border-t border-gray-200/60 rounded-b-lg">
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
import { useI18n } from 'vue-i18n'
import MarkdownIt from 'markdown-it'
import MessageItem from './MessageItem.vue'

const { t: $t } = useI18n()

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
  totalThreads: {
    type: Number,
    default: 0
  },
  totalMessages: {
    type: Number,
    default: 0
  },
  actualThreads: {
    type: Number,
    default: 0
  },
  actualMessages: {
    type: Number,
    default: 0
  }
})

// Markdownパーサーの初期化
const md = new MarkdownIt({
  html: true,
  xhtmlOut: true,
  breaks: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    return `<pre class="language-${lang}"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})

// コードブロックのカスタムレンダラー
const defaultFenceRenderer = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}

md.renderer.rules.fence = function(tokens, idx, options, env, self) {
  const token = tokens[idx]
  const code = token.content
  const lang = token.info ? token.info.trim() : ''
  const id = `code-block-${Math.random().toString(36).substr(2, 9)}`

  return `<div class="code-block-container relative mb-4 rounded-lg overflow-hidden border border-gray-300">
    <div class="code-block-header flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200">
      <span class="code-language text-sm font-medium text-gray-600">${lang || 'text'}</span>
      <button class="copy-button flex items-center justify-center w-8 h-8 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors duration-200" data-code-id="${id}" title="コピー">
        <svg class="copy-icon text-gray-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <svg class="check-icon hidden text-gray-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
      </button>
    </div>
    <pre class="code-block-content m-0 bg-gray-100"><code id="${id}" class="block p-4 bg-transparent text-sm font-mono leading-relaxed language-${lang}">${md.utils.escapeHtml(code)}</code></pre>
  </div>`
}

md.renderer.rules.code_block = md.renderer.rules.fence

// テーブルのカスタムレンダラー
const defaultTableRenderer = md.renderer.rules.table_open || function(tokens, idx, options, env, self) {
  return '<table>'
}

md.renderer.rules.table_open = function(tokens, idx, options, env, self) {
  return '<table class="w-full border-collapse border border-gray-300 mb-3">'
}

md.renderer.rules.th_open = function(tokens, idx, options, env, self) {
  return '<th class="border border-gray-300 px-3 py-2 text-left bg-gray-50 font-semibold">'
}

md.renderer.rules.td_open = function(tokens, idx, options, env, self) {
  return '<td class="border border-gray-300 px-3 py-2 text-left">'
}

// 展開状態管理
const expandedItems = ref(new Set())
const lastLoadedCount = ref(0)

// クリップボードコピー機能
const copyToClipboard = async (codeId) => {
  try {
    const codeElement = document.getElementById(codeId)
    if (!codeElement) return

    const code = codeElement.textContent
    await navigator.clipboard.writeText(code)

    // ボタンのアイコンを一時的に変更
    const button = document.querySelector(`[data-code-id="${codeId}"]`)
    if (button) {
      const copyIcon = button.querySelector('.copy-icon')
      const checkIcon = button.querySelector('.check-icon')

      copyIcon.classList.add('hidden')
      checkIcon.classList.remove('hidden')

      setTimeout(() => {
        copyIcon.classList.remove('hidden')
        checkIcon.classList.add('hidden')
      }, 2000)
    }
  } catch (err) {
    console.error('クリップボードへのコピーに失敗:', err)
  }
}

// 計算プロパティ
const groupedConversations = computed(() => {
  // バックエンドから既にグループ化された配列が返される
  return props.conversations
})

const loadMoreRangeText = computed(() => {
  if (!props.totalThreads || props.actualThreads === 0) return ''

  const start = props.actualThreads + 1
  const defaultBatchSize = 50 // デフォルトの読み込み件数
  const remaining = props.totalThreads - props.actualThreads
  const end = props.actualThreads + Math.min(defaultBatchSize, remaining)

  return $t('conversations.loadMoreThreadRange', { start: start.toLocaleString(), end: end.toLocaleString() })
})

// メソッド
const renderMarkdown = (content, searchKeyword = null) => {
  if (!content) return ''

  // まずMarkdownをレンダリング
  let renderedContent = md.render(content)

  // 検索キーワードがある場合のみ、レンダリング後のHTMLにハイライトを適用
  if (searchKeyword && searchKeyword.trim()) {
    const regex = new RegExp(`(${searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    renderedContent = renderedContent.replace(regex, '<mark>$1</mark>')
  } else {
    // キーワードがない場合は既存の<mark>タグを除去
    renderedContent = renderedContent.replace(/<mark>(.*?)<\/mark>/gi, '$1')
  }

  return renderedContent
}

const handleLoadMore = () => {
  const prevCount = props.actualThreads
  emit('load-more')

  // 少し待ってから新しく読み込まれた件数を計算
  setTimeout(() => {
    const newCount = props.actualThreads
    lastLoadedCount.value = newCount - prevCount

    // 3秒後にメッセージを非表示
    setTimeout(() => {
      lastLoadedCount.value = 0
    }, 3000)
  }, 500)
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

// クリックイベントハンドラー
const handleCodeCopy = (event) => {
  const button = event.target.closest('.copy-button')
  if (button) {
    const codeId = button.getAttribute('data-code-id')
    if (codeId) {
      copyToClipboard(codeId)
    }
  }
}
</script>

<style>
/* 検索ハイライト */
.prose mark {
  @apply bg-yellow-200 px-1 py-0.5 rounded-sm font-medium;
}

/* カスタムコードブロックのスタイリング（コピー機能付き） */
.prose .code-block-container {
  @apply relative mb-4 rounded-lg overflow-hidden border border-gray-300;
}

.prose .code-block-header {
  @apply flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200;
}

.prose .code-language {
  @apply text-sm font-medium text-gray-600;
}

.prose .copy-button {
  @apply flex items-center justify-center w-8 h-8 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors duration-200 cursor-pointer;
}

.prose .copy-button svg {
  @apply text-gray-600;
}

.prose .copy-button:hover svg {
  @apply text-gray-800;
}

.prose .code-block-content {
  @apply m-0 bg-gray-100;
}

.prose .code-block-content code {
  @apply block p-4 bg-transparent text-sm font-mono leading-relaxed whitespace-pre;
}
</style>
