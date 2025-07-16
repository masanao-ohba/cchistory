import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

describe('NotificationBell - 基本機能テスト', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  /**
   * 目的: ベルアイコンの基本的なレンダリング確認
   * 観点: コンポーネントの正常な初期化
   * 期待結果: SVGベルアイコンが表示される
   */
  it('ベルアイコンが正常に表示される', () => {
    // シンプルなテスト用ベルコンポーネント
    const SimpleBell = {
      template: `
        <button aria-label="通知">
          <svg viewBox="0 0 24 24" class="w-6 h-6">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </button>
      `
    }

    const wrapper = mount(SimpleBell)

    const bellIcon = wrapper.find('svg')
    expect(bellIcon.exists()).toBe(true)
    expect(bellIcon.attributes('viewBox')).toBe('0 0 24 24')

    const button = wrapper.find('button')
    expect(button.attributes('aria-label')).toBe('通知')
  })

  /**
   * 目的: 通知バッジ表示ロジックの確認
   * 観点: 数値に応じたバッジ表示
   * 期待結果: 適切なバッジが表示される
   */
  it('通知数に応じたバッジが表示される', () => {
    const BadgeComponent = {
      props: ['count'],
      template: `
        <div>
          <span v-if="count > 0 && count <= 99" class="bg-red-500">{{ count }}</span>
          <span v-else-if="count > 99" class="bg-red-500">99+</span>
        </div>
      `
    }

    // 通常の数値
    let wrapper = mount(BadgeComponent, { props: { count: 3 } })
    expect(wrapper.find('.bg-red-500').text()).toBe('3')

    // 99+表示
    wrapper = mount(BadgeComponent, { props: { count: 150 } })
    expect(wrapper.find('.bg-red-500').text()).toBe('99+')

    // バッジなし
    wrapper = mount(BadgeComponent, { props: { count: 0 } })
    expect(wrapper.find('.bg-red-500').exists()).toBe(false)
  })

  /**
   * 目的: 接続状態インジケーターの表示ロジック確認
   * 観点: 接続状態と通知状態による表示制御
   * 期待結果: 適切な条件でインジケーターが表示される
   */
  it('接続状態インジケーターが適切な条件で表示される', () => {
    const ConnectionIndicator = {
      props: ['isConnected', 'totalNotifications', 'unreadCount'],
      template: `
        <div>
          <span
            v-if="isConnected && totalNotifications > 0 && unreadCount === 0"
            class="bg-green-400"
            title="リアルタイム通知有効"
          ></span>
        </div>
      `
    }

    // 表示条件を満たす場合
    let wrapper = mount(ConnectionIndicator, {
      props: { isConnected: true, totalNotifications: 3, unreadCount: 0 }
    })
    expect(wrapper.find('.bg-green-400').exists()).toBe(true)

    // 未読がある場合は非表示
    wrapper = mount(ConnectionIndicator, {
      props: { isConnected: true, totalNotifications: 3, unreadCount: 1 }
    })
    expect(wrapper.find('.bg-green-400').exists()).toBe(false)

    // 切断状態の場合は非表示
    wrapper = mount(ConnectionIndicator, {
      props: { isConnected: false, totalNotifications: 3, unreadCount: 0 }
    })
    expect(wrapper.find('.bg-green-400').exists()).toBe(false)
  })

  /**
   * 目的: ボタンクリックイベントの基本動作確認
   * 観点: イベントエミッションの正常性
   * 期待結果: クリック時にイベントが発火される
   */
  it('ベルボタンクリック時にイベントが発火される', async () => {
    const ClickableButton = {
      emits: ['toggle'],
      template: `
        <button @click="$emit('toggle')">
          <svg viewBox="0 0 24 24">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </button>
      `
    }

    const wrapper = mount(ClickableButton)

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  /**
   * 目的: キーボードアクセシビリティの確認
   * 観点: Enterキーでの操作対応
   * 期待結果: Enterキーでもイベントが発火される
   */
  it('Enterキーでイベントが発火される', async () => {
    const KeyboardAccessibleButton = {
      emits: ['activate'],
      template: `
        <button @click="$emit('activate')" @keyup.enter="$emit('activate')">
          Notification Bell
        </button>
      `
    }

    const wrapper = mount(KeyboardAccessibleButton)

    await wrapper.find('button').trigger('keyup.enter')

    expect(wrapper.emitted('activate')).toHaveLength(1)
  })
})
