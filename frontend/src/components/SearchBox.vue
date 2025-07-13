<template>
  <div class="relative">
    <div class="relative">
      <input
        v-model="searchKeyword"
        type="text"
        :placeholder="$t('search.placeholder')"
        class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        @input="handleSearch"
      />
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <BaseIcon name="search" class="text-gray-400" />
      </div>
      <button
        v-if="searchKeyword"
        @click="clearSearch"
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
      >
        <BaseIcon name="close" />
      </button>

      <!-- 関連スレッド表示オプション（右上配置） -->
      <div v-if="searchKeyword" class="absolute -top-8 right-0">
        <label class="inline-flex items-center text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
          <input
            type="checkbox"
            v-model="showRelatedThreads"
            @change="handleOptionsChange"
            class="mr-1 rounded border-gray-300 text-primary-500 focus:ring-primary-500 text-xs"
          />
          {{ $t('search.showRelatedThreads') }}
        </label>
      </div>
    </div>

    <!-- 検索結果サマリー -->
    <div v-if="searchKeyword && searchResults !== null" class="mt-2 text-sm text-gray-600">
      <span v-if="searchResults.total > 0">
        {{ $t('search.foundMessages', { keyword: searchKeyword, count: searchResults.total }) }}
      </span>
      <span v-else>
        {{ $t('search.noMessagesFound', { keyword: searchKeyword }) }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineEmits } from 'vue'
import BaseIcon from './BaseIcon.vue'

const emit = defineEmits(['search', 'clear', 'optionsChange'])

const searchKeyword = ref('')
const searchResults = ref(null)
const showRelatedThreads = ref(true) // デフォルトON

// デバウンス用のタイマー
let searchTimer = null

const handleSearch = () => {
  // 既存のタイマーをクリア
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  // 300ms後に検索実行
  searchTimer = setTimeout(() => {
    if (searchKeyword.value.trim()) {
      emit('search', {
        keyword: searchKeyword.value.trim(),
        showRelatedThreads: showRelatedThreads.value
      })
    } else {
      emit('clear')
      searchResults.value = null
    }
  }, 300)
}

const handleOptionsChange = () => {
  // オプション変更時にも検索を再実行
  if (searchKeyword.value.trim()) {
    emit('search', {
      keyword: searchKeyword.value.trim(),
      showRelatedThreads: showRelatedThreads.value
    })
  }
}

const clearSearch = () => {
  searchKeyword.value = ''
  searchResults.value = null
  emit('clear')
}

// 検索結果を受け取る
const setSearchResults = (results) => {
  searchResults.value = results
}

// 外部から検索状態を設定する
const setSearchState = (keyword, showRelated) => {
  if (keyword !== undefined) {
    searchKeyword.value = keyword
  }
  if (showRelated !== undefined) {
    showRelatedThreads.value = showRelated
  }
}

// 親コンポーネントから呼び出せるようにする
defineExpose({
  setSearchResults,
  setSearchState
})
</script>
