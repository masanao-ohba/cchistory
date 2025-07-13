import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterBar from '../FilterBar.vue'

describe('FilterBar - 統一検索フィルター', () => {
  let wrapper
  let emitSpy

  beforeEach(() => {
    emitSpy = vi.fn()
    wrapper = mount(FilterBar, {
      props: {
        loading: false,
        compact: false
      },
      global: {
        mocks: {
          $t: (key) => key
        }
      }
    })

    // emitをスパイ
    wrapper.vm.$emit = emitSpy
  })

  describe('初期状態', () => {
    it('初期値が正しく設定されている', () => {
      expect(wrapper.vm.searchFilters.startDate).toBe('')
      expect(wrapper.vm.searchFilters.endDate).toBe('')
      expect(wrapper.vm.searchFilters.projects).toEqual([])
      expect(wrapper.vm.searchFilters.sortOrder).toBe('desc')
      expect(wrapper.vm.searchFilters.threadMode).toBe('grouped')
    })
  })

  describe('日付フィルター', () => {
    it('開始日を変更すると filter イベントが発火される', async () => {
      const startDateInput = wrapper.find('#startDate')
      await startDateInput.setValue('2025-07-10')

      // 少し待つ（リアクティブな更新のため）
      await wrapper.vm.$nextTick()

      expect(emitSpy).toHaveBeenCalledWith('filter', expect.objectContaining({
        startDate: '2025-07-10',
        endDate: null,
        projects: null,
        sortOrder: 'desc',
        threadMode: 'grouped'
      }))
    })

    it('終了日を変更すると filter イベントが発火される', async () => {
      const endDateInput = wrapper.find('#endDate')
      await endDateInput.setValue('2025-07-15')

      await wrapper.vm.$nextTick()

      expect(emitSpy).toHaveBeenCalledWith('filter', expect.objectContaining({
        startDate: null,
        endDate: '2025-07-15',
        projects: null,
        sortOrder: 'desc',
        threadMode: 'grouped'
      }))
    })

    it('クイックフィルターボタンで日付が設定される', async () => {
      const todayButton = wrapper.findAll('.bg-gray-100')[0] // 「今日」ボタン
      await todayButton.trigger('click')

      const today = new Date().toISOString().split('T')[0]

      expect(wrapper.vm.searchFilters.startDate).toBe(today)
      expect(wrapper.vm.searchFilters.endDate).toBe(today)

      expect(emitSpy).toHaveBeenCalledWith('filter', expect.objectContaining({
        startDate: today,
        endDate: today
      }))
    })
  })

  describe('プロジェクトフィルター', () => {
    it('プロジェクトを選択すると filter イベントが発火される', async () => {
      // プロジェクトが読み込まれるまで待つ
      await wrapper.vm.$nextTick()

      // ドロップダウンを開く
      const dropdownButton = wrapper.find('button')
      await dropdownButton.trigger('click')

      // プロジェクトのチェックボックスを選択
      const projectCheckboxes = wrapper.findAll('input[type="checkbox"]')
      if (projectCheckboxes.length > 1) {
        await projectCheckboxes[1].setChecked(true) // 最初のプロジェクト

        await wrapper.vm.$nextTick()

        expect(emitSpy).toHaveBeenCalledWith('filter', expect.objectContaining({
          projects: expect.arrayContaining(['project1'])
        }))
      }
    })
  })

  describe('表示順フィルター', () => {
    it('表示順を変更すると filter イベントが発火される', async () => {
      const sortSelect = wrapper.find('#sortOrder')
      await sortSelect.setValue('asc')

      await wrapper.vm.$nextTick()

      expect(emitSpy).toHaveBeenCalledWith('filter', expect.objectContaining({
        sortOrder: 'asc'
      }))
    })
  })

  describe('フィルターリセット', () => {
    it('リセットボタンで全フィルターがクリアされる', async () => {
      // 先にフィルターを設定
      wrapper.vm.searchFilters.startDate = '2025-07-10'
      wrapper.vm.searchFilters.projects = ['project1']
      wrapper.vm.searchFilters.sortOrder = 'asc'

      await wrapper.vm.$nextTick()

      // リセットボタンをクリック
      const resetButton = wrapper.find('.bg-gray-500')
      await resetButton.trigger('click')

      await wrapper.vm.$nextTick()

      expect(wrapper.vm.searchFilters.startDate).toBe('')
      expect(wrapper.vm.searchFilters.endDate).toBe('')
      expect(wrapper.vm.searchFilters.projects).toEqual([])
      expect(wrapper.vm.searchFilters.sortOrder).toBe('desc')

      expect(emitSpy).toHaveBeenLastCalledWith('filter', expect.objectContaining({
        startDate: null,
        endDate: null,
        projects: null,
        sortOrder: 'desc',
        threadMode: 'grouped'
      }))
    })
  })

  describe('外部からの状態設定', () => {
    it('setFilterState でフィルター状態を設定できる', async () => {
      const testState = {
        startDate: '2025-07-01',
        endDate: '2025-07-31',
        projects: ['project1', 'project2'],
        sortOrder: 'asc',
        threadMode: 'grouped'
      }

      wrapper.vm.setFilterState(testState)

      await wrapper.vm.$nextTick()

      expect(wrapper.vm.searchFilters.startDate).toBe('2025-07-01')
      expect(wrapper.vm.searchFilters.endDate).toBe('2025-07-31')
      expect(wrapper.vm.searchFilters.projects).toEqual(['project1', 'project2'])
      expect(wrapper.vm.searchFilters.sortOrder).toBe('asc')
    })
  })
})

describe('useSearchFilters Composable', () => {
  it('統一的な検索フィルター管理が正しく動作する', async () => {
    const emitMock = vi.fn()

    // Composableを直接テスト
    const { useSearchFilters } = await import('../../composables/useSearchFilters')

    const {
      searchFilters,
      setFilterState,
      clearAllFilters,
      markAsInitialized
    } = useSearchFilters(emitMock)

    // 初期化
    markAsInitialized()

    // 状態変更のテスト
    searchFilters.startDate = '2025-07-10'

    await new Promise(resolve => setTimeout(resolve, 0)) // nextTickの代替

    expect(emitMock).toHaveBeenCalledWith('filter', expect.objectContaining({
      startDate: '2025-07-10'
    }))

    // クリアのテスト
    clearAllFilters()

    expect(searchFilters.startDate).toBe('')
    expect(searchFilters.projects).toEqual([])
  })
})
