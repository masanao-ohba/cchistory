<template>
  <div class="bg-white transition-all duration-300" :class="compact ? 'p-3' : 'px-4 pt-4 pb-1 rounded-lg'">
    <div class="grid grid-cols-1 gap-4 items-end" :class="compact ? 'md:grid-cols-7' : 'md:grid-cols-6'">
      <!-- 開始日 -->
      <FormField
        id="startDate"
        v-model="filters.startDate"
        :label="$t('dateFilter.from')"
        :compact="compact"
        type="date"
        :placeholder="compact ? $t('dateFilter.from') : ''"
      />

      <!-- 終了日 -->
      <FormField
        id="endDate"
        v-model="filters.endDate"
        :label="$t('dateFilter.to')"
        :compact="compact"
        type="date"
        :placeholder="compact ? $t('dateFilter.to') : ''"
      />

      <!-- プロジェクト選択 -->
      <div :class="compact ? 'md:col-span-2' : ''">
        <label v-if="!compact" for="projectSelect" class="block text-sm font-medium text-gray-700 mb-2">
          {{ $t('projectFilter.projects') }}
        </label>
        <div class="relative">
          <button
            @click="toggleDropdown"
            :class="compact ? 'px-2 py-1 text-sm' : 'px-3 py-1.5'"
            class="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-left flex items-center justify-between"
          >
            <span class="truncate">
              {{ selectedProjectsText }}
            </span>
            <svg class="w-4 h-4 ml-2 transform transition-transform" :class="{ 'rotate-180': isDropdownOpen }" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>

          <!-- ドロップダウンメニュー -->
          <div
            v-if="isDropdownOpen"
            class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            <div class="p-2">
              <label class="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  :checked="selectedProjects.length === 0"
                  @change="toggleAllProjects"
                  class="mr-2 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span class="text-sm font-medium">{{ $t('projectFilter.all') }}</span>
              </label>
              <hr class="my-1 border-gray-200" />
              <label
                v-for="project in projects"
                :key="project.id"
                class="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :value="project.id"
                  v-model="selectedProjects"
                  class="mr-2 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span class="text-sm" :title="project.path">{{ project.display_name }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 表示順選択 -->
      <FormField
        id="sortOrder"
        v-model="selectedSortOrder"
        :label="$t('sortOrder.label')"
        :compact="compact"
        tag="select"
        class="bg-white"
      >
        <option value="asc">{{ $t('sortOrder.ascending') }}</option>
        <option value="desc">{{ $t('sortOrder.descending') }}</option>
      </FormField>


      <!-- リセットボタンのみ -->
      <div class="flex gap-2">
        <button
          @click="clearFilter"
          :disabled="loading"
          :class="compact ? 'px-3 py-1 text-sm' : 'px-4 py-1.5'"
          class="bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ $t('dateFilter.reset') }}
        </button>
      </div>
    </div>

    <!-- クイックフィルター -->
    <div v-if="!compact" class="mt-4 mb-2 flex flex-wrap gap-2">
      <button
        v-for="quick in quickFilters"
        :key="quick.key"
        @click="applyQuickFilter(quick)"
        class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
      >
        {{ $t(`dateFilter.${quick.key}`) }}
      </button>
    </div>

    <!-- 選択されたプロジェクト表示 -->
    <div v-if="selectedProjects.length > 0 && !compact" class="mt-4 flex flex-wrap gap-2">
      <span
        v-for="project in selectedProjectsDetails"
        :key="project.id"
        class="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md flex items-center"
      >
        {{ project.display_name }}
        <button
          @click="removeProject(project.id)"
          class="ml-2 text-primary-500 hover:text-primary-700"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 8.586L2.929 1.515 1.515 2.929 8.586 10l-7.071 7.071 1.414 1.414L10 11.414l7.071 7.071 1.414-1.414L11.414 10l7.071-7.071-1.414-1.414L10 8.586z"/>
          </svg>
        </button>
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConversationStore } from '../stores/conversations'
import FormField from './FormField.vue'

const { t: $t } = useI18n()

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
})

const selectedProjects = ref([])
const projects = ref([])
const isDropdownOpen = ref(false)
const selectedSortOrder = ref('desc')
const selectedThreadMode = ref('grouped')
let isInitialized = false

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

// 計算プロパティ
const selectedProjectsText = computed(() => {
  if (selectedProjects.value.length === 0) {
    return $t('projectFilter.allProjects')
  }
  if (selectedProjects.value.length === 1) {
    const project = projects.value.find(p => p.id === selectedProjects.value[0])
    return project ? project.display_name : 'Unknown'
  }
  return $t('projectFilter.projectsSelected', { count: selectedProjects.value.length })
})

const selectedProjectsDetails = computed(() => {
  return projects.value.filter(p => selectedProjects.value.includes(p.id))
})

// メソッド
const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const toggleAllProjects = () => {
  if (selectedProjects.value.length === 0) {
    selectedProjects.value = projects.value.map(p => p.id)
  } else {
    selectedProjects.value = []
  }
}

const removeProject = (projectId) => {
  selectedProjects.value = selectedProjects.value.filter(id => id !== projectId)
}


const clearFilter = () => {
  filters.value = {
    startDate: '',
    endDate: '',
  }
  selectedProjects.value = []
  selectedSortOrder.value = 'desc'
  selectedThreadMode.value = 'grouped'
}

const applyQuickFilter = (quick) => {
  filters.value.startDate = quick.startDate
  filters.value.endDate = quick.endDate
}

const closeDropdown = (event) => {
  if (!event.target.closest('.relative')) {
    isDropdownOpen.value = false
  }
}

// ライフサイクル
onMounted(async () => {
  try {
    const response = await store.getProjects()
    projects.value = response.projects || []
  } catch (error) {
    console.error('Error loading projects:', error)
  }

  // クリックイベントリスナーを追加
  document.addEventListener('click', closeDropdown)

  // 初期化完了後にwatchEffectを設定
  setTimeout(() => {
    isInitialized = true

    // 検索ステートの変更を自動検知して検索実行
    watchEffect(() => {
      // 日付、プロジェクト、表示順、スレッドモードのいずれかが変更されると自動実行
      const filterData = {
        startDate: filters.value.startDate || null,
        endDate: filters.value.endDate || null,
        projects: selectedProjects.value.length ? selectedProjects.value : null,
        sortOrder: selectedSortOrder.value,
        threadMode: selectedThreadMode.value,
        offset: 0,
        limit: 100
      }

      emit('filter', filterData)
    })
  }, 100)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>
