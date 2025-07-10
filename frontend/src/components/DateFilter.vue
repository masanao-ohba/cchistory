<template>
  <div class="bg-white transition-all duration-300" :class="compact ? 'p-3' : 'p-6 rounded-lg'">
    <div class="grid grid-cols-1 gap-4 items-end" :class="compact ? 'md:grid-cols-6' : 'md:grid-cols-4'">
      <!-- 開始日 -->
      <div>
        <label v-if="!compact" for="startDate" class="block text-sm font-medium text-gray-700 mb-2">
          {{ $t('dateFilter.from') }}
        </label>
        <input
          id="startDate"
          v-model="filters.startDate"
          type="date"
          :placeholder="compact ? $t('dateFilter.from') : ''"
          :class="compact ? 'px-2 py-1 text-sm' : 'px-3 py-2'"
          class="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <!-- 終了日 -->
      <div>
        <label v-if="!compact" for="endDate" class="block text-sm font-medium text-gray-700 mb-2">
          {{ $t('dateFilter.to') }}
        </label>
        <input
          id="endDate"
          v-model="filters.endDate"
          type="date"
          :placeholder="compact ? $t('dateFilter.to') : ''"
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
          <span v-if="loading">{{ $t('dateFilter.searching') }}</span>
          <span v-else>{{ compact ? $t('dateFilter.search') : $t('dateFilter.apply') }}</span>
        </button>
        <button
          @click="clearFilter"
          :disabled="loading"
          :class="compact ? 'px-3 py-1 text-sm' : 'px-6 py-2'"
          class="bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ $t('dateFilter.reset') }}
        </button>
      </div>
    </div>

    <!-- クイックフィルター -->
    <div v-if="!compact" class="mt-4 flex flex-wrap gap-2">
      <button
        v-for="quick in quickFilters"
        :key="quick.key"
        @click="applyQuickFilter(quick)"
        class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
      >
        {{ $t(`dateFilter.${quick.key}`) }}
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
    key: 'today',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  },
  {
    key: 'yesterday',
    startDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    endDate: new Date(Date.now() - 86400000).toISOString().split('T')[0]
  },
  {
    key: 'last7Days',
    startDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  },
  {
    key: 'last30Days',
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
