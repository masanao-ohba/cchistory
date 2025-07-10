<template>
  <div class="bg-white transition-all duration-300" :class="compact ? 'p-3' : 'p-6 rounded-lg'">
    <div class="grid grid-cols-1 gap-4 items-end" :class="compact ? 'md:grid-cols-6' : 'md:grid-cols-4'">
      <!-- 開始日 -->
      <div>
        <label v-if="!compact" for="startDate" class="block text-sm font-medium text-gray-700 mb-2">
          開始日
        </label>
        <input
          id="startDate"
          v-model="filters.startDate"
          type="date"
          :placeholder="compact ? '開始日' : ''"
          :class="compact ? 'px-2 py-1 text-sm' : 'px-3 py-2'"
          class="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <!-- 終了日 -->
      <div>
        <label v-if="!compact" for="endDate" class="block text-sm font-medium text-gray-700 mb-2">
          終了日
        </label>
        <input
          id="endDate"
          v-model="filters.endDate"
          type="date"
          :placeholder="compact ? '終了日' : ''"
          :class="compact ? 'px-2 py-1 text-sm' : 'px-3 py-2'"
          class="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <!-- ボタン -->
      <div class="flex gap-2" :class="compact ? 'col-span-2' : ''">
        <button
          @click="applyFilter"
          :disabled="loading"
          :class="compact ? 'px-3 py-1 text-sm' : 'px-6 py-2'"
          class="bg-primary-500 text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="loading">検索中...</span>
          <span v-else>{{ compact ? '検索' : 'フィルター' }}</span>
        </button>
        <button
          @click="clearFilter"
          :disabled="loading"
          :class="compact ? 'px-3 py-1 text-sm' : 'px-6 py-2'"
          class="bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          クリア
        </button>
      </div>
    </div>

    <!-- クイックフィルター -->
    <div v-if="!compact" class="mt-4 flex flex-wrap gap-2">
      <button
        v-for="quick in quickFilters"
        :key="quick.label"
        @click="applyQuickFilter(quick)"
        class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
      >
        {{ quick.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useConversationStore } from '../stores/conversations'

const emit = defineEmits(['filter'])
const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const store = useConversationStore()

// リアクティブデータ
const filters = ref({
  startDate: '',
  endDate: '',
  projects: []
})

const projects = ref([])

// クイックフィルター
const quickFilters = ref([
  {
    label: '今日',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  },
  {
    label: '昨日',
    startDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    endDate: new Date(Date.now() - 86400000).toISOString().split('T')[0]
  },
  {
    label: '過去7日',
    startDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  },
  {
    label: '過去30日',
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  }
])

// メソッド
const applyFilter = () => {
  const filterData = {
    startDate: filters.value.startDate || null,
    endDate: filters.value.endDate || null,
    projects: filters.value.projects.length ? filters.value.projects : null,
    offset: 0,
    limit: 100
  }
  emit('filter', filterData)
}

const clearFilter = () => {
  filters.value = {
    startDate: '',
    endDate: '',
    projects: []
  }
  emit('filter', { offset: 0, limit: 100 })
}

const applyQuickFilter = (quick) => {
  filters.value.startDate = quick.startDate
  filters.value.endDate = quick.endDate
  applyFilter()
}

// ライフサイクル
onMounted(async () => {
  try {
    projects.value = await store.getProjects()
  } catch (error) {
    console.error('Error loading projects:', error)
  }
})
</script>
