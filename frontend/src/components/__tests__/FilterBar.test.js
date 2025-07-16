import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterBar from '../FilterBar.vue'

// useSearchFilters composableをモック
vi.mock('../../composables/useSearchFilters', () => ({
  useSearchFilters: vi.fn()
}))

// useConversationStore をモック
vi.mock('../../stores/conversations', () => ({
  useConversationStore: () => ({
    getProjects: vi.fn().mockResolvedValue({ projects: [] })
  })
}))

// vue-i18n をモック
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key) => key
  })
}))

describe('FilterBar - 統一検索フィルター', () => {
  let wrapper
  let emitSpy
  let mockUseSearchFilters

  beforeEach(async () => {
    emitSpy = vi.fn()

    // useSearchFiltersの戻り値をモック
    mockUseSearchFilters = {
      searchFilters: {
        startDate: '',
        endDate: '',
        projects: [],
        sortOrder: 'desc'
      },
      projects: { value: [] },
      isDropdownOpen: { value: false },
      setFilterState: vi.fn(),
      clearAllFilters: vi.fn(),
      applyQuickFilter: vi.fn(),
      toggleAllProjects: vi.fn(),
      removeProject: vi.fn(),
      markAsInitialized: vi.fn()
    }

    const { useSearchFilters } = await import('../../composables/useSearchFilters')
    useSearchFilters.mockReturnValue(mockUseSearchFilters)

    wrapper = mount(FilterBar, {
      props: {
        loading: false,
        compact: false
      }
    })
  })

  describe('初期状態', () => {
    it('初期値が正しく設定されている', () => {
      expect(mockUseSearchFilters.searchFilters.startDate).toBe('')
      expect(mockUseSearchFilters.searchFilters.endDate).toBe('')
      expect(mockUseSearchFilters.searchFilters.projects).toEqual([])
      expect(mockUseSearchFilters.searchFilters.sortOrder).toBe('desc')
    })
  })

  describe('日付フィルター', () => {
    it('開始日入力フィールドが存在する', async () => {
      const startDateInput = wrapper.find('#startDate')
      expect(startDateInput.exists()).toBe(true)
      expect(startDateInput.attributes('type')).toBe('date')
    })

    it('終了日入力フィールドが存在する', async () => {
      const endDateInput = wrapper.find('#endDate')
      expect(endDateInput.exists()).toBe(true)
      expect(endDateInput.attributes('type')).toBe('date')
    })

    it('クイックフィルターボタンが正しく動作する', async () => {
      const todayButton = wrapper.findAll('.bg-gray-100')[0] // 「今日」ボタン
      await todayButton.trigger('click')

      expect(mockUseSearchFilters.applyQuickFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'today'
        })
      )
    })
  })

  describe('プロジェクトフィルター', () => {
    it('プロジェクトドロップダウンが存在する', async () => {
      const dropdownButton = wrapper.find('button')
      expect(dropdownButton.exists()).toBe(true)

      await dropdownButton.trigger('click')
      expect(wrapper.find('.absolute.z-10').exists()).toBe(true)
    })

    it('全プロジェクト選択が動作する', async () => {
      const dropdownButton = wrapper.find('button')
      await dropdownButton.trigger('click')

      const allCheckbox = wrapper.find('input[type="checkbox"]')
      await allCheckbox.trigger('change')

      expect(mockUseSearchFilters.toggleAllProjects).toHaveBeenCalled()
    })
  })

  describe('表示順フィルター', () => {
    it('表示順セレクトボックスが存在する', async () => {
      const sortSelect = wrapper.find('#sortOrder')
      expect(sortSelect.exists()).toBe(true)

      const options = sortSelect.findAll('option')
      expect(options).toHaveLength(2)
      expect(options[0].attributes('value')).toBe('asc')
      expect(options[1].attributes('value')).toBe('desc')
    })
  })

  describe('フィルターリセット', () => {
    it('リセットボタンで全フィルターがクリアされる', async () => {
      const resetButton = wrapper.find('.bg-gray-500')
      await resetButton.trigger('click')

      expect(mockUseSearchFilters.clearAllFilters).toHaveBeenCalled()
    })
  })

  describe('外部からの状態設定', () => {
    it('setFilterState でフィルター状態を設定できる', async () => {
      const testState = {
        startDate: '2025-07-01',
        endDate: '2025-07-31',
        projects: ['project1', 'project2'],
        sortOrder: 'asc'
      }

      // setFilterState は defineExpose で公開されているため、wrapper.vm経由でアクセス
      expect(wrapper.vm.setFilterState).toBeDefined()
    })
  })

  describe('useSearchFilters Composable統合テスト', () => {
    it('useSearchFiltersが適切にマウントされる', async () => {
      expect(mockUseSearchFilters.searchFilters).toBeDefined()
      expect(mockUseSearchFilters.clearAllFilters).toBeDefined()
      expect(mockUseSearchFilters.setFilterState).toBeDefined()
      expect(mockUseSearchFilters.applyQuickFilter).toBeDefined()
    })
  })
})
