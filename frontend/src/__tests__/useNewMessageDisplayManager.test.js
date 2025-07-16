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
      const displayMessages = manager.getDisplayMessages(conversations[0], 0)
      expect(displayMessages).toHaveLength(2)
      expect(manager.hasUnreadMessages(conversations[0], 0)).toBe(false)
      expect(manager.getUnreadCount(conversations[0], 0)).toBe(0)
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
      const displayed = manager.getDisplayMessages(updated[0], 0)
      expect(displayed).toHaveLength(2)
      
      // unread メッセージが1つ
      expect(manager.hasUnreadMessages(updated[0], 0)).toBe(true)
      expect(manager.getUnreadCount(updated[0], 0)).toBe(1)
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
      expect(manager.getDisplayMessages(updated[0], 0)).toHaveLength(2)
      expect(manager.getUnreadCount(updated[0], 0)).toBe(1)

      // 新着メッセージ表示
      manager.showNewMessages(updated[0], 0)

      // 新着メッセージ表示後
      expect(manager.getDisplayMessages(updated[0], 0)).toHaveLength(3)
      expect(manager.hasUnreadMessages(updated[0], 0)).toBe(false)
      expect(manager.getUnreadCount(updated[0], 0)).toBe(0)
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
      expect(manager.hasUnreadMessages(updated[0], 0)).toBe(true)
      expect(manager.getUnreadCount(updated[0], 0)).toBe(1)

      // グループ1: 新着なし
      expect(manager.hasUnreadMessages(updated[1], 1)).toBe(false)
      expect(manager.getUnreadCount(updated[1], 1)).toBe(0)
    })
  })

  describe('基本機能統合テスト', () => {
    it('初期化から新着メッセージ表示までの一連の流れが動作する', () => {
      const conversations = [
        [
          { uuid: 'user-1', type: 'user', content: 'Test', timestamp: '2024-01-01T10:00:00Z' },
          { uuid: 'assistant-1', type: 'assistant', content: 'Response', timestamp: '2024-01-01T10:01:00Z' }
        ]
      ]

      // 初期設定
      manager.setInitialMessages(conversations)
      
      // 初期状態確認
      expect(manager.getDisplayMessages(conversations[0], 0)).toHaveLength(2)
      expect(manager.hasUnreadMessages(conversations[0], 0)).toBe(false)
      expect(manager.getUnreadCount(conversations[0], 0)).toBe(0)

      // 新着メッセージ追加
      const updated = [
        [
          { uuid: 'user-1', type: 'user', content: 'Test', timestamp: '2024-01-01T10:00:00Z' },
          { uuid: 'assistant-1', type: 'assistant', content: 'Response', timestamp: '2024-01-01T10:01:00Z' },
          { uuid: 'assistant-2', type: 'assistant', content: 'New Response', timestamp: '2024-01-01T10:02:00Z' }
        ]
      ]
      
      manager.addNewMessages(updated)
      
      // 新着メッセージが未読状態で追加されたことを確認
      expect(manager.getDisplayMessages(updated[0], 0)).toHaveLength(2) // 表示は元のまま
      expect(manager.hasUnreadMessages(updated[0], 0)).toBe(true)
      expect(manager.getUnreadCount(updated[0], 0)).toBe(1)
      
      // 新着メッセージを表示
      manager.showNewMessages(updated[0], 0)
      
      // 全メッセージが表示され、未読がクリアされることを確認
      expect(manager.getDisplayMessages(updated[0], 0)).toHaveLength(3)
      expect(manager.hasUnreadMessages(updated[0], 0)).toBe(false)
      expect(manager.getUnreadCount(updated[0], 0)).toBe(0)
    })

    it('空のグループや無効なデータを適切に処理する', () => {
      const invalidConversations = [
        [], // 空の配列
        null, // null
        [{ uuid: null, type: 'user', content: 'No UUID' }] // UUIDなし
      ]

      // エラーが発生しないことを確認
      expect(() => {
        manager.setInitialMessages(invalidConversations)
      }).not.toThrow()

      // 無効なグループに対する操作が安全に処理されることを確認
      expect(manager.getDisplayMessages([], 0)).toEqual([])
      expect(manager.hasUnreadMessages(null, 0)).toBe(false)
      expect(manager.getUnreadCount(undefined, 0)).toBe(0)
    })
  })
})