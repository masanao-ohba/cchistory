<template>
  <div id="app" class="min-h-screen bg-gray-100">
    <!-- ヘッダー（スクロール時に隠れる） -->
    <header class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg transition-all duration-500"
            :class="{ 'transform -translate-y-full opacity-0': isScrolled }">
      <div class="max-w-7xl mx-auto px-4 py-3">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-xl font-bold">Claude Conversations History Viewer</h1>
            <p class="text-purple-100 mt-1 text-sm">{{ $t('app.subtitle') }}</p>
          </div>
          <LanguageSwitcher />
        </div>
      </div>
    </header>


    <!-- 固定フィルター（スクロール時にコンパクト表示） -->
    <div class="sticky top-0 z-50 bg-white shadow-md transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4">
        <FilterBar
          ref="filterBarRef"
          @filter="handleFilter"
          :loading="loading"
          :compact="isScrolled"
        />
        <div class="py-2">
          <SearchBox
            ref="searchBoxRef"
            @search="handleSearch"
            @clear="handleClearSearch"
          />
        </div>
      </div>
    </div>

    <!-- 統計情報（スクロール時に隠れる） -->
    <div class="transition-all duration-500"
         :class="{ 'transform -translate-y-full opacity-0 pointer-events-none': isScrolled }">
      <div class="max-w-7xl mx-auto px-4 pt-4 pb-2">
        <Statistics
          :stats="stats"
        />
      </div>
    </div>

    <!-- メインコンテンツ -->
    <main class="max-w-7xl mx-auto px-4 pb-8 pt-2">
      <!-- 会話リスト -->
      <ConversationList
        :conversations="conversations"
        :loading="loading"
        :has-more="hasMore"
        :total-threads="totalThreads"
        :total-messages="totalMessages"
        :actual-threads="actualThreads"
        :actual-messages="actualMessages"
        :new-message-manager="newMessageDisplayManager"
        @load-more="loadMore"
        @show-new-messages="handleShowNewMessages"
      />
    </main>

    <!-- トップへ戻るボタン -->
    <BackToTopButton v-show="isScrolled" @click="scrollToTop" />


    <!-- WebSocket接続状態 -->
    <div
      v-if="wsConnected"
      class="fixed bottom-4 right-4 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm z-40"
    >
      🟢 {{ $t('app.realTimeUpdate') }}
    </div>
    <div
      v-else
      class="fixed bottom-4 right-4 bg-yellow-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm z-40"
    >
      🟡 {{ $t('app.offline') }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import FilterBar from '../components/FilterBar.vue'
import Statistics from '../components/Statistics.vue'
import ConversationList from '../components/ConversationList.vue'
import SearchBox from '../components/SearchBox.vue'
import LanguageSwitcher from '../components/LanguageSwitcher.vue'
import BackToTopButton from '../components/BackToTopButton.vue'
import { useConversationStore } from '../stores/conversations'
import { createInitialSearchState } from '../types/search.js'
import { loadStateFromUrl as loadFromUrl, createQueryFromState } from '../utils/urlSync.js'
import { syncComponentStates } from '../utils/componentSync.js'
import { useNewMessageDisplayManager } from '../composables/useNewMessageDisplayManager.js'

const store = useConversationStore()
const router = useRouter()
const route = useRoute()

// 新着メッセージ管理機能
const newMessageDisplayManager = useNewMessageDisplayManager()

// URLパラメータ更新フラグ（無限ループ防止）
let isUpdatingFromUrl = false
// 更新中フラグ（無限ループ防止）
let isUpdating = false
// リアクティブデータ
const conversations = ref([])
const stats = ref({})
const loading = ref(false)
const hasMore = ref(true)
const wsConnected = ref(false)
const isScrolled = ref(false)
const totalThreads = ref(0)
const totalMessages = ref(0)
const actualThreads = ref(0)
const actualMessages = ref(0)

// 検索関連
const searchBoxRef = ref(null)
const filterBarRef = ref(null)
const searchState = reactive(createInitialSearchState())

// 初期化フラグ
let isInitialized = false

const loadStateFromUrl = () => {
  isUpdatingFromUrl = true

  try {
    const urlState = loadFromUrl(route.query)
    Object.assign(searchState, urlState)
    syncComponentStates(searchState, { searchBoxRef, filterBarRef })
  } finally {
    isUpdatingFromUrl = false
  }
}

const updateUrlFromState = () => {
  if (isUpdatingFromUrl) return

  const query = createQueryFromState(searchState)
  router.replace({ query }).catch(() => {})
}

// WebSocket接続
let ws = null

// WebSocketにフィルタリング条件を送信
const sendFiltersToWebSocket = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const filters = {
      projects: searchState.projects,
      startDate: searchState.startDate,
      endDate: searchState.endDate,
      keyword: searchState.keyword
    }

    const message = {
      type: 'update_filters',
      filters: filters
    }

    ws.send(JSON.stringify(message))
  }
}

// ファイル変更時の処理
const handleFileChange = async () => {
  if (!isInitialized) {
    return
  }

  setTimeout(async () => {
      try {
        const filters = {
          startDate: searchState.startDate,
          endDate: searchState.endDate,
          projects: searchState.projects.length ? searchState.projects : null,
          keyword: searchState.keyword || null,
          showRelatedThreads: searchState.showRelatedThreads,
          sortOrder: searchState.sortOrder,
          threadMode: searchState.threadMode,
          offset: 0,
          limit: conversations.value.length || 50 // 現在表示中の件数分を取得
        }

        const result = await store.getConversations(filters, true) // 強制更新

        // キーワードがクリアされた場合、search_keywordフィールドを明示的に除去
        if (!searchState.keyword) {
          result.conversations = result.conversations.map(conv => {
            // convが配列の場合はそのまま返す
            if (Array.isArray(conv)) {
              return conv
            }
            // オブジェクトの場合のみsearch_keywordを除去
            const { search_keyword, ...cleanConv } = conv
            return cleanConv
          })
        }


        conversations.value = result.conversations
        totalThreads.value = result.total_threads || 0
        totalMessages.value = result.total_messages || 0
        actualThreads.value = result.actual_threads || 0
        actualMessages.value = result.actual_messages || 0
        hasMore.value = result.total_threads > result.actual_threads

        // WebSocket更新時: 新着メッセージを処理
        newMessageDisplayManager.addNewMessages(result.conversations)

        // 統計情報も同期更新
        await updateStats(result)

        // 検索結果の統計を更新
        if (searchState.keyword && searchBoxRef.value) {
          searchBoxRef.value.setSearchResults({
            total: result.search_match_count,
            keyword: searchState.keyword
          })
        }
      } catch (error) {
        console.error('Error auto-refreshing conversations:', error)
      }
    }, 1000)
}

// 検索ステートの変更を監視して自動検索実行
watch(searchState, async (newState, oldState) => {
  if (!isInitialized || isUpdating) {
    return
  }

  // 更新中フラグをセット
  isUpdating = true

  try {
    // URLパラメータを更新
    updateUrlFromState()

    loading.value = true

    const filters = {
      startDate: newState.startDate,
      endDate: newState.endDate,
      projects: newState.projects.length ? newState.projects : null,
      keyword: newState.keyword || null,
      showRelatedThreads: newState.showRelatedThreads,
      sortOrder: newState.sortOrder,
      threadMode: newState.threadMode,
      offset: 0,
      limit: 50
    }

    // バックエンドで統合検索を実行
    const result = await store.getConversations(filters)

    // キーワードがクリアされた場合、search_keywordフィールドを明示的に除去
    if (!newState.keyword) {
      result.conversations = result.conversations.map(conv => {
        // convが配列の場合はそのまま返す
        if (Array.isArray(conv)) {
          return conv
        }
        // オブジェクトの場合のみsearch_keywordを除去
        const { search_keyword, ...cleanConv } = conv
        return cleanConv
      })
    }

    conversations.value = result.conversations
    totalThreads.value = result.total_threads || 0
    totalMessages.value = result.total_messages || 0
    actualThreads.value = result.actual_threads || 0
    actualMessages.value = result.actual_messages || 0
    hasMore.value = result.total_threads > result.actual_threads

    // 統計情報を同期更新
    await updateStats(result, newState)

    // 検索結果の統計を更新
    if (newState.keyword && searchBoxRef.value) {
      searchBoxRef.value.setSearchResults({
        total: result.search_match_count,
        keyword: newState.keyword
      })
    } else if (searchBoxRef.value) {
      searchBoxRef.value.setSearchResults(null)
    }
  } catch (error) {
    console.error('Search error:', error)
  } finally {
    loading.value = false
    // 更新中フラグをリセット
    isUpdating = false
  }

  // WebSocketにフィルタリング条件を送信
  sendFiltersToWebSocket()
}, { deep: true })

// URLクエリパラメータの変更を監視（ブラウザの戻る/進むボタン対応）
watch(() => route.query, () => {
  if (isInitialized && !isUpdatingFromUrl) {
    loadStateFromUrl()
  }
}, { deep: true })

// スクロール検出
const handleScroll = () => {
  const threshold = 150
  const shouldBeScrolled = window.scrollY > threshold

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
    sendFiltersToWebSocket()
  }

  ws.onclose = () => {
    wsConnected.value = false
    setTimeout(connectWebSocket, 5000)
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'file_change') {
      // フィルタリング条件に応じた自動更新を実行
      handleFileChange()
    }
  }

  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
    wsConnected.value = false
  }
}

// フィルターイベントハンドラー
const handleFilter = async (filters) => {
  searchState.startDate = filters.startDate || null
  searchState.endDate = filters.endDate || null
  searchState.projects = filters.projects || []
  searchState.sortOrder = filters.sortOrder || 'desc'
  searchState.threadMode = filters.threadMode || 'grouped'
}

const loadMore = async () => {
  if (loading.value || !hasMore.value) return

  loading.value = true
  try {
    const currentCount = conversations.value.length
    const filters = {
      startDate: searchState.startDate,
      endDate: searchState.endDate,
      projects: searchState.projects.length ? searchState.projects : null,
      keyword: searchState.keyword || null,
      showRelatedThreads: searchState.showRelatedThreads,
      sortOrder: searchState.sortOrder,
      threadMode: searchState.threadMode,
      offset: actualThreads.value, // 実際に表示されているスレッド数を使用
      limit: 50
    }

    const result = await store.getConversations(filters)

    conversations.value.push(...result.conversations)

    // 累積値を正しく計算
    const newActualThreads = actualThreads.value + (result.actual_threads || 0)
    const newActualMessages = actualMessages.value + (result.actual_messages || 0)

    totalThreads.value = result.total_threads || 0
    totalMessages.value = result.total_messages || 0
    actualThreads.value = newActualThreads
    actualMessages.value = newActualMessages
    hasMore.value = result.total_threads > newActualThreads

    // 統計情報は変更しない（Load More時は累積表示のため）
    // updateStats(result) は削除
  } catch (error) {
    console.error('Load more error:', error)
  } finally {
    loading.value = false
  }
}

const loadConversations = async (force = false) => {
  loading.value = true
  try {
    // 現在のsearchStateに基づいてフィルターを構築
    const filters = {
      startDate: searchState.startDate,
      endDate: searchState.endDate,
      projects: searchState.projects.length ? searchState.projects : null,
      keyword: searchState.keyword || null,
      showRelatedThreads: searchState.showRelatedThreads,
      sortOrder: searchState.sortOrder,
      threadMode: searchState.threadMode,
      offset: 0,
      limit: 50
    }

    const result = await store.getConversations(filters, force)
    
    conversations.value = result.conversations
    totalThreads.value = result.total_threads || 0
    totalMessages.value = result.total_messages || 0
    actualThreads.value = result.actual_threads || 0
    actualMessages.value = result.actual_messages || 0
    hasMore.value = result.total_threads > result.actual_threads

    // 新着メッセージ管理の初期状態を設定
    newMessageDisplayManager.setInitialMessages(result.conversations)

    // 統計情報も同期更新
    await updateStats(result)
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


const handleSearch = (searchData) => {
  if (typeof searchData === 'string') {
    // 後方互換性のため文字列も受け付ける
    searchState.keyword = searchData
  } else {
    // 新しいオブジェクト形式
    searchState.keyword = searchData.keyword
    searchState.showRelatedThreads = searchData.showRelatedThreads
  }
}

const handleClearSearch = () => {
  searchState.keyword = ''
}

// 新着メッセージ表示のイベントハンドラー
const handleShowNewMessages = ({ group, groupIndex }) => {
  newMessageDisplayManager.showNewMessages(group, groupIndex)
}


// フィルターが適用されているかを判定
const hasActiveFilter = (state) => {
  return !!(
    state.keyword ||
    state.startDate ||
    state.endDate ||
    (state.projects && state.projects.length > 0)
  )
}

// 統計情報を更新する共通関数
const updateStats = async (result, state = null) => {
  const currentState = state || searchState

  if (hasActiveFilter(currentState)) {
    // フィルター適用時はフィルター結果の統計を使用
    stats.value = {
      total_threads: result.stats.total_threads || 0,
      total_messages: result.stats.total_messages || 0,
      projects: result.stats.projects || 0,
      daily_thread_counts: result.stats.daily_thread_counts || {}
    }
  } else {
    // フィルターがクリアされた場合は全体統計を再読み込み
    await loadStats()
  }
}

// クリーンアップ用の変数
let globalScrollHandler = null

// ライフサイクル
onMounted(async () => {
  isScrolled.value = window.scrollY > 100

  // URLからの状態復元を先に実行（watchが無効な状態で）
  loadStateFromUrl()

  nextTick(() => {
    syncComponentStates(searchState, { searchBoxRef, filterBarRef })
  })

  // URLパラメータの有無に関わらず、現在のsearchStateで初期データを読み込み
  await Promise.all([
    loadConversations(),
    loadStats()
  ])

  connectWebSocket()

  globalScrollHandler = handleScroll
  window.addEventListener('scroll', globalScrollHandler, { passive: true })

  // 初期化完了後にwatchを有効化（無限ループ防止）
  isInitialized = true
})

onUnmounted(() => {
  if (globalScrollHandler) {
    window.removeEventListener('scroll', globalScrollHandler)
  }
  if (ws) {
    ws.close()
  }
})
</script>
