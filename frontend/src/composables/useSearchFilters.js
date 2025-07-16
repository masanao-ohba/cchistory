import { ref, reactive, watch } from 'vue'

/**
 * 統一的な検索フィルター管理
 * すべての検索項目を一元的に管理し、変更を自動検知
 */
export function useSearchFilters(emit) {
  // 検索フィルターの初期状態
  const initialState = {
    startDate: '',
    endDate: '',
    projects: [],
    sortOrder: 'desc'
  }

  // リアクティブな検索フィルター
  const searchFilters = reactive({ ...initialState })

  // 初期化フラグ
  const isInitialized = ref(false)

  // プロジェクト一覧
  const projects = ref([])

  // UI状態
  const isDropdownOpen = ref(false)

  /**
   * フィルターの変更を監視して自動的にemitする
   */
  watch(
    () => ({ ...searchFilters }),
    (newFilters) => {
      if (!isInitialized.value) return

      const filterData = {
        startDate: newFilters.startDate || null,
        endDate: newFilters.endDate || null,
        projects: newFilters.projects.length ? newFilters.projects : null,
        sortOrder: newFilters.sortOrder,
        offset: 0,
        limit: 100
      }

      emit('filter', filterData)
    },
    { deep: true }
  )

  /**
   * 外部から状態を設定するメソッド
   */
  const setFilterState = (state) => {
    const wasInitialized = isInitialized.value
    isInitialized.value = false

    try {
      if (state.startDate !== undefined) {
        searchFilters.startDate = state.startDate || ''
      }
      if (state.endDate !== undefined) {
        searchFilters.endDate = state.endDate || ''
      }
      if (state.projects !== undefined) {
        searchFilters.projects = Array.isArray(state.projects) ? [...state.projects] : []
      }
      if (state.sortOrder !== undefined) {
        searchFilters.sortOrder = state.sortOrder || 'desc'
      }
    } finally {
      isInitialized.value = wasInitialized
    }
  }

  /**
   * フィルターをクリア
   */
  const clearAllFilters = () => {
    Object.assign(searchFilters, initialState)
  }

  /**
   * クイックフィルターを適用
   */
  const applyQuickFilter = (quickFilter) => {
    searchFilters.startDate = quickFilter.startDate
    searchFilters.endDate = quickFilter.endDate
  }

  /**
   * プロジェクト選択を切り替え
   */
  const toggleAllProjects = () => {
    if (searchFilters.projects.length === 0) {
      searchFilters.projects = projects.value.map(p => p.id)
    } else {
      searchFilters.projects = []
    }
  }

  /**
   * プロジェクトを削除
   */
  const removeProject = (projectId) => {
    const index = searchFilters.projects.indexOf(projectId)
    if (index > -1) {
      searchFilters.projects.splice(index, 1)
    }
  }

  /**
   * 初期化完了をマーク
   */
  const markAsInitialized = () => {
    isInitialized.value = true
  }

  return {
    searchFilters,
    projects,
    isDropdownOpen,
    isInitialized,
    setFilterState,
    clearAllFilters,
    applyQuickFilter,
    toggleAllProjects,
    removeProject,
    markAsInitialized
  }
}
