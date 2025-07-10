<template>
  <div class="relative">
    <div class="relative">
      <input
        v-model="searchKeyword"
        type="text"
        placeholder="キーワードで検索..."
        class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        @input="handleSearch"
      />
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      <button
        v-if="searchKeyword"
        @click="clearSearch"
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>

    <!-- 検索結果サマリー -->
    <div v-if="searchKeyword && searchResults !== null" class="mt-2 text-sm text-gray-600">
      <span v-if="searchResults.total > 0">
        「{{ searchKeyword }}」で {{ searchResults.total }} 件のメッセージが見つかりました
      </span>
      <span v-else>
        「{{ searchKeyword }}」に一致するメッセージは見つかりませんでした
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineEmits } from 'vue'

const emit = defineEmits(['search', 'clear'])

const searchKeyword = ref('')
const searchResults = ref(null)

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
      emit('search', searchKeyword.value.trim())
    } else {
      emit('clear')
      searchResults.value = null
    }
  }, 300)
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

// 親コンポーネントから呼び出せるようにする
defineExpose({
  setSearchResults
})
</script>
