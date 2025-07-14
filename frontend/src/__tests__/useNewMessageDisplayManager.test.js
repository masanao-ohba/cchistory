import { describe, it, expect, beforeEach } from 'vitest'
import { useNewMessageDisplayManager } from '../composables/useNewMessageDisplayManager.js'

describe('useNewMessageDisplayManager', () => {
  let manager

  beforeEach(() => {
    manager = useNewMessageDisplayManager()
  })

  describe('初期設定', () => {
    it('初期状態では全メッセージがreadに設定される', () => {
      const conversations = [
        [
          { uuid: 'user-1', type: 'user', content: 'Hello', timestamp: '2024-01-01T10:00:00Z' },
          { uuid: 'assistant-1', type: 'assistant', content: 'Hi there', timestamp: '2024-01-01T10:01:00Z' }
        ]
      ]

      manager.setInitialMessages(conversations)

      // 初期状態では全メッセージ表示
      const displayMessages = manager.getDisplayMessages(0)
      expect(displayMessages).toHaveLength(2)
      expect(manager.hasUnreadMessages(0)).toBe(false)
      expect(manager.getUnreadCount(0)).toBe(0)
    })
  })

  describe('新着メッセージ処理', () => {
    beforeEach(() => {
      // 初期状態: ユーザー + アシスタント1つ
      const initial = [
        [
          { uuid: 'user-1', type: 'user', content: 'Question', timestamp: '2024-01-01T10:00:00Z' },
          { uuid: 'assistant-1', type: 'assistant', content: 'Answer 1', timestamp: '2024-01-01T10:01:00Z' }
        ]
      ]
      manager.setInitialMessages(initial)
    })

    it('新着メッセージがunreadに追加される', () => {
      const updated = [
        [
          { uuid: 'user-1', type: 'user', content: 'Question', timestamp: '2024-01-01T10:00:00Z' },
          { uuid: 'assistant-1', type: 'assistant', content: 'Answer 1', timestamp: '2024-01-01T10:01:00Z' },
          { uuid: 'assistant-2', type: 'assistant', content: 'Answer 2 (new)', timestamp: '2024-01-01T10:02:00Z' }
        ]
      ]

      manager.addNewMessages(updated)

      // read メッセージは変わらず2つ
      const displayed = manager.getDisplayMessages(0)
      expect(displayed).toHaveLength(2)
      
      // unread メッセージが1つ
      expect(manager.hasUnreadMessages(0)).toBe(true)
      expect(manager.getUnreadCount(0)).toBe(1)
    })

    it('新着メッセージ表示でunreadがreadに移動する', () => {
      const updated = [
        [
          { uuid: 'user-1', type: 'user', content: 'Question', timestamp: '2024-01-01T10:00:00Z' },
          { uuid: 'assistant-1', type: 'assistant', content: 'Answer 1', timestamp: '2024-01-01T10:01:00Z' },
          { uuid: 'assistant-2', type: 'assistant', content: 'Answer 2 (new)', timestamp: '2024-01-01T10:02:00Z' }
        ]
      ]

      manager.addNewMessages(updated)
      
      // 新着メッセージ表示前
      expect(manager.getDisplayMessages(0)).toHaveLength(2)
      expect(manager.getUnreadCount(0)).toBe(1)

      // 新着メッセージ表示
      manager.showNewMessages(0)

      // 新着メッセージ表示後
      expect(manager.getDisplayMessages(0)).toHaveLength(3)
      expect(manager.hasUnreadMessages(0)).toBe(false)
      expect(manager.getUnreadCount(0)).toBe(0)
    })
  })

  describe('複数グループ管理', () => {
    it('グループ毎に独立して管理される', () => {
      const initial = [
        [
          { uuid: 'user-1', type: 'user', content: 'Q1', timestamp: '2024-01-01T10:00:00Z' },
          { uuid: 'assistant-1', type: 'assistant', content: 'A1', timestamp: '2024-01-01T10:01:00Z' }
        ],
        [
          { uuid: 'user-2', type: 'user', content: 'Q2', timestamp: '2024-01-01T11:00:00Z' },
          { uuid: 'assistant-2', type: 'assistant', content: 'A2', timestamp: '2024-01-01T11:01:00Z' }
        ]
      ]
      manager.setInitialMessages(initial)

      const updated = [
        [
          { uuid: 'user-1', type: 'user', content: 'Q1', timestamp: '2024-01-01T10:00:00Z' },
          { uuid: 'assistant-1', type: 'assistant', content: 'A1', timestamp: '2024-01-01T10:01:00Z' },
          { uuid: 'assistant-3', type: 'assistant', content: 'A1-2 (new)', timestamp: '2024-01-01T10:02:00Z' }
        ],
        [
          { uuid: 'user-2', type: 'user', content: 'Q2', timestamp: '2024-01-01T11:00:00Z' },
          { uuid: 'assistant-2', type: 'assistant', content: 'A2', timestamp: '2024-01-01T11:01:00Z' }
        ]
      ]

      manager.addNewMessages(updated)

      // グループ0: 新着あり
      expect(manager.hasUnreadMessages(0)).toBe(true)
      expect(manager.getUnreadCount(0)).toBe(1)

      // グループ1: 新着なし
      expect(manager.hasUnreadMessages(1)).toBe(false)
      expect(manager.getUnreadCount(1)).toBe(0)
    })
  })

  describe('デバッグ機能', () => {
    it('状態確認機能が動作する', () => {
      const conversations = [
        [
          { uuid: 'user-1', type: 'user', content: 'Test', timestamp: '2024-01-01T10:00:00Z' },
          { uuid: 'assistant-1', type: 'assistant', content: 'Response', timestamp: '2024-01-01T10:01:00Z' }
        ]
      ]

      manager.setInitialMessages(conversations)

      const groupState = manager.getGroupState(0)
      expect(groupState).toEqual({
        read: 2,
        unread: 0,
        readMessages: expect.any(Array),
        unreadMessages: expect.any(Array)
      })

      const allStates = manager.getAllStates()
      expect(allStates).toEqual({
        0: { read: 2, unread: 0 }
      })
    })

    it('新着メッセージシミュレーションが動作する', () => {
      const conversations = [
        [
          { uuid: 'user-1', type: 'user', content: 'Test', timestamp: '2024-01-01T10:00:00Z' }
        ]
      ]

      manager.setInitialMessages(conversations)

      // シミュレーション実行
      const result = manager.simulateNewMessage(0, 'テストメッセージ')
      expect(result).toBe(true)

      // 新着メッセージが追加されたことを確認
      expect(manager.hasUnreadMessages(0)).toBe(true)
      expect(manager.getUnreadCount(0)).toBe(1)
    })
  })
})