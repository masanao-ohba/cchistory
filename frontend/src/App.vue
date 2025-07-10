<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <!-- ヘッダー（スクロール時に隠れる） -->
    <header class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg transition-all duration-500"
            :class="{ 'transform -translate-y-full opacity-0': isScrolled }">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <h1 class="text-3xl font-bold">Claude Conversations History Viewer</h1>
        <p class="text-purple-100 mt-2">会話履歴の検索とフィルタリング</p>
      </div>
    </header>


    <!-- 固定フィルター（スクロール時にコンパクト表示） -->
    <div class="sticky top-0 z-50 bg-white shadow-md transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4">
        <DateFilter
          @filter="handleFilter"
          :loading="loading"
          :compact="isScrolled"
        />
      </div>
    </div>

    <!-- 統計情報（スクロール時に隠れる） -->
    <div class="transition-all duration-500"
         :class="{ 'transform -translate-y-full opacity-0 pointer-events-none': isScrolled }">
      <div class="max-w-7xl mx-auto px-4 pt-4 pb-4">
        <Statistics
          :stats="stats"
          :filtered-count="conversations.length"
        />
      </div>
    </div>

    <!-- メインコンテンツ -->
    <main class="max-w-7xl mx-auto px-4 pb-8 pt-4">
      <!-- 会話リスト -->
      <ConversationList
        :conversations="conversations"
        :loading="loading"
        :has-more="hasMore"
        :total-count="totalCount"
        @load-more="loadMore"
      />
    </main>

    <!-- トップへ戻るボタン -->
    <button
      v-show="isScrolled"
      @click="scrollToTop"
      class="fixed bottom-4 left-4 bg-primary-500 hover:bg-primary-600 text-white p-3 rounded-full shadow-lg transition-all duration-300 z-40"
      title="トップへ戻る"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
      </svg>
    </button>

    <!-- WebSocket接続状態 -->
    <div
      v-if="wsConnected"
      class="fixed bottom-4 right-4 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm z-40"
    >
      🟢 リアルタイム更新中
    </div>
    <div
      v-else
      class="fixed bottom-4 right-4 bg-yellow-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm z-40"
    >
      🟡 オフライン
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import DateFilter from './components/DateFilter.vue'
import Statistics from './components/Statistics.vue'
import ConversationList from './components/ConversationList.vue'
import { useConversationStore } from './stores/conversations'

const store = useConversationStore()

// リアクティブデータ
const conversations = ref([])
const stats = ref({})
const loading = ref(false)
const hasMore = ref(true)
const wsConnected = ref(false)
const isScrolled = ref(false)
const totalCount = ref(0)

// 要素への参照（必要最小限）

// WebSocket接続
let ws = null

// スクロール検出（シンプルな固定閾値）
const handleScroll = () => {
  const currentScrollY = window.scrollY
  const threshold = 150
  
  const shouldBeScrolled = currentScrollY > threshold
  
  if (isScrolled.value !== shouldBeScrolled) {
    isScrolled.value = shouldBeScrolled
  }
}

// トップへ戻る
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

const connectWebSocket = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/ws/updates`

  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    wsConnected.value = true
    console.log('WebSocket connected')
  }

  ws.onclose = () => {
    wsConnected.value = false
    console.log('WebSocket disconnected')
    // 5秒後に再接続を試行
    setTimeout(connectWebSocket, 5000)
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'file_change') {
      console.log('File change detected, refreshing data...')
      loadConversations(true) // 強制更新
    }
  }

  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
    wsConnected.value = false
  }
}

// イベントハンドラー
const handleFilter = async (filters) => {
  loading.value = true
  try {
    const result = await store.getConversations(filters)
    conversations.value = result.conversations
    totalCount.value = result.total
    hasMore.value = result.total > result.conversations.length
  } catch (error) {
    console.error('Filter error:', error)
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (loading.value || !hasMore.value) return

  loading.value = true
  try {
    const filters = store.currentFilters
    const result = await store.getConversations({
      ...filters,
      offset: conversations.value.length
    })
    conversations.value.push(...result.conversations)
    totalCount.value = result.total
    hasMore.value = conversations.value.length < result.total
  } catch (error) {
    console.error('Load more error:', error)
  } finally {
    loading.value = false
  }
}

const loadConversations = async (force = false) => {
  loading.value = true
  try {
    const result = await store.getConversations({}, force)
    conversations.value = result.conversations
    totalCount.value = result.total
    hasMore.value = result.total > result.conversations.length
  } catch (error) {
    console.error('Load conversations error:', error)
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    stats.value = await store.getStats()
  } catch (error) {
    console.error('Load stats error:', error)
  }
}

// クリーンアップ用の変数
let globalScrollHandler = null

// ライフサイクル
onMounted(async () => {
  // 初期状態を設定
  isScrolled.value = window.scrollY > 100

  await Promise.all([
    loadConversations(),
    loadStats()
  ])
  connectWebSocket()

  // スクロールイベントリスナー
  globalScrollHandler = handleScroll
  window.addEventListener('scroll', globalScrollHandler, { passive: true })
})

onUnmounted(() => {
  if (globalScrollHandler) {
    window.removeEventListener('scroll', globalScrollHandler)
  }
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  if (ws) {
    ws.close()
  }
})
</script>
