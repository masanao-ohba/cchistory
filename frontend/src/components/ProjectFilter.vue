<template>
  <div class="bg-white transition-all duration-300" :class="compact ? 'p-3' : 'p-6 rounded-lg'">
    <div class="grid grid-cols-1 gap-4 items-end" :class="compact ? 'md:grid-cols-3' : 'md:grid-cols-2'">
      <!-- プロジェクト選択 -->
      <div>
        <label v-if="!compact" for="projectSelect" class="block text-sm font-medium text-gray-700 mb-2">
          {{ $t('projectFilter.projects') }}
        </label>
        <div class="relative">
          <button
            @click="toggleDropdown"
            :class="compact ? 'px-2 py-1 text-sm' : 'px-3 py-2'"
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

      <!-- ボタン -->
      <div class="flex gap-2">
        <button
          @click="applyFilter"
          :disabled="loading"
          :class="compact ? 'px-3 py-1 text-sm' : 'px-6 py-2'"
          class="bg-primary-500 text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="loading">{{ $t('projectFilter.applying') }}</span>
          <span v-else>{{ compact ? $t('projectFilter.apply') : $t('projectFilter.apply') }}</span>
        </button>
        <button
          @click="clearFilter"
          :disabled="loading"
          :class="compact ? 'px-3 py-1 text-sm' : 'px-6 py-2'"
          class="bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ $t('projectFilter.reset') }}
        </button>
      </div>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
const selectedProjects = ref([])
const projects = ref([])
const isDropdownOpen = ref(false)

// 計算プロパティ
const selectedProjectsText = computed(() => {
  if (selectedProjects.value.length === 0) {
    return props.compact ? 'All Projects' : 'すべてのプロジェクト'
  }
  if (selectedProjects.value.length === 1) {
    const project = projects.value.find(p => p.id === selectedProjects.value[0])
    return project ? project.display_name : 'Unknown'
  }
  return `${selectedProjects.value.length} projects selected`
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

const applyFilter = () => {
  const filterData = {
    projects: selectedProjects.value.length ? selectedProjects.value : []
  }
  emit('filter', filterData)
}

const clearFilter = () => {
  selectedProjects.value = []
  emit('filter', { projects: [] })
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
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})

// プロジェクト選択の変更を監視して自動検索
watch(selectedProjects, (newVal, oldVal) => {
  // toggleAllProjectsやremoveProjectから呼ばれる場合は重複実行を避ける
  if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
    applyFilter()
  }
}, { deep: true })
</script>
