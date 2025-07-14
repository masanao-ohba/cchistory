import { describe, it, expect, beforeEach } from 'vitest'
import { useNewMessageDisplay } from '../composables/useNewMessageDisplay.js'

describe('useNewMessageDisplay', () => {
  let newMessageDisplay

  beforeEach(() => {
    newMessageDisplay = useNewMessageDisplay()
  })

  describe('初期化', () => {
    it('初期状態では未初期化', () => {
      expect(newMessageDisplay.isInitialized).toBe(false)
    })

    it('初期状態を正しく記録', () => {
      const conversations = [
        [
          { session_id: 'session1', timestamp: '2024-01-01T10:00:00Z', type: 'user', content: 'Hello' },
          { session_id: 'session1', timestamp: '2024-01-01T10:01:00Z', type: 'assistant', content: 'Hi there' }
        ],
        [
          { session_id: 'session2', timestamp: '2024-01-01T11:00:00Z', type: 'user', content: 'Question' },
          { session_id: 'session2', timestamp: '2024-01-01T11:01:00Z', type: 'assistant', content: 'Answer' },
          { session_id: 'session2', timestamp: '2024-01-01T11:02:00Z', type: 'assistant', content: 'More info' }
        ]
      ]

      newMessageDisplay.recordInitialState(conversations)

      expect(newMessageDisplay.isInitialized).toBe(true)

      // デバッグ情報で状態確認
      const debugInfo = newMessageDisplay.getDebugInfo()
      expect(debugInfo.initialState.groupCount).toBe(2)
      expect(debugInfo.initialState.isInitialized).toBe(true)
    })
  })

  describe('新着メッセージ判定', () => {
    beforeEach(() => {
      // 初期状態を設定
      const initialConversations = [
        [
          { session_id: 'session1', timestamp: '2024-01-01T10:00:00Z', type: 'user', content: 'Hello' },
          { session_id: 'session1', timestamp: '2024-01-01T10:01:00Z', type: 'assistant', content: 'Hi there' }
        ]
      ]
      newMessageDisplay.recordInitialState(initialConversations)
    })

    it('新着メッセージを正しく検出', () => {
      // メッセージが追加された状態
      const updatedGroup = [
        { session_id: 'session1', timestamp: '2024-01-01T10:00:00Z', type: 'user', content: 'Hello' },
        { session_id: 'session1', timestamp: '2024-01-01T10:01:00Z', type: 'assistant', content: 'Hi there' },
        { session_id: 'session1', timestamp: '2024-01-01T10:02:00Z', type: 'assistant', content: 'New message' }
      ]

      const newMessages = newMessageDisplay.getNewMessagesInGroup(updatedGroup)

      expect(newMessages).toHaveLength(1)
      expect(newMessages[0].content).toBe('New message')
    })

    it('新規グループは新着扱いしない', () => {
      const newGroup = [
        { session_id: 'session2', timestamp: '2024-01-01T11:00:00Z', type: 'user', content: 'New group' }
      ]

      const newMessages = newMessageDisplay.getNewMessagesInGroup(newGroup)

      expect(newMessages).toHaveLength(0)
    })
  })

  describe('表示制御', () => {
    beforeEach(() => {
      // 初期状態を設定
      const initialConversations = [
        [
          { session_id: 'session1', timestamp: '2024-01-01T10:00:00Z', type: 'user', content: 'Hello' },
          { session_id: 'session1', timestamp: '2024-01-01T10:01:00Z', type: 'assistant', content: 'Hi there' }
        ]
      ]
      newMessageDisplay.recordInitialState(initialConversations)
    })

    it('初期状態では全メッセージを表示', () => {
      const group = [
        { session_id: 'session1', timestamp: '2024-01-01T10:00:00Z', type: 'user', content: 'Hello' },
        { session_id: 'session1', timestamp: '2024-01-01T10:01:00Z', type: 'assistant', content: 'Hi there' },
        { session_id: 'session1', timestamp: '2024-01-01T10:02:00Z', type: 'assistant', content: 'Extra' }
      ]

      const visible = newMessageDisplay.getVisibleMessages(group, 0)
      expect(visible).toHaveLength(3)

      expect(newMessageDisplay.hasPendingMessages(group, 0)).toBe(false)
      expect(newMessageDisplay.getPendingCount(group, 0)).toBe(0)
    })

    it('新着メッセージ処理後は適切に制限', () => {
      // 新着メッセージがある状態をシミュレート
      const updatedConversations = [
        [
          { session_id: 'session1', timestamp: '2024-01-01T10:00:00Z', type: 'user', content: 'Hello' },
          { session_id: 'session1', timestamp: '2024-01-01T10:01:00Z', type: 'assistant', content: 'Hi there' },
          { session_id: 'session1', timestamp: '2024-01-01T10:02:00Z', type: 'assistant', content: 'New message 1' },
          { session_id: 'session1', timestamp: '2024-01-01T10:03:00Z', type: 'assistant', content: 'New message 2' }
        ]
      ]

      newMessageDisplay.processNewMessages(updatedConversations)

      const group = updatedConversations[0]

      // 初期の2つ + 新着アシスタントの1つ目は表示、2つ目以降の新着は保留
      const visible = newMessageDisplay.getVisibleMessages(group, 0)
      expect(visible).toHaveLength(3)

      expect(newMessageDisplay.hasPendingMessages(group, 0)).toBe(true)
      expect(newMessageDisplay.getPendingCount(group, 0)).toBe(1)
    })

    it('保留メッセージ表示で制限解除', () => {
      // 初期状態を設定
      const initialGroup = [
        { session_id: 'session1', timestamp: '2024-01-01T10:00:00Z', type: 'user', content: 'Hello' },
        { session_id: 'session1', timestamp: '2024-01-01T10:01:00Z', type: 'assistant', content: 'Hi there' }
      ]
      newMessageDisplay.recordInitialState([initialGroup])

      // 新着メッセージが追加された状態
      const updatedGroup = [
        { session_id: 'session1', timestamp: '2024-01-01T10:00:00Z', type: 'user', content: 'Hello' },
        { session_id: 'session1', timestamp: '2024-01-01T10:01:00Z', type: 'assistant', content: 'Hi there' },
        { session_id: 'session1', timestamp: '2024-01-01T10:02:00Z', type: 'assistant', content: 'New message 1' },
        { session_id: 'session1', timestamp: '2024-01-01T10:03:00Z', type: 'assistant', content: 'New message 2' }
      ]

      // 新着処理をシミュレート
      newMessageDisplay.processNewMessages([updatedGroup])

      // 制限状態を確認（初期2つ + 新着1つ目は表示、2つ目は保留）
      expect(newMessageDisplay.hasPendingMessages(updatedGroup, 0)).toBe(true)

      // 保留メッセージを表示
      newMessageDisplay.showPendingMessages(0, updatedGroup)

      // 制限解除を確認
      const visible = newMessageDisplay.getVisibleMessages(updatedGroup, 0)
      expect(visible).toHaveLength(4)
      expect(newMessageDisplay.hasPendingMessages(updatedGroup, 0)).toBe(false)
    })
  })

  describe('状態リセット', () => {
    it('表示状態のみリセット', () => {
      const conversations = [
        [
          { session_id: 'session1', timestamp: '2024-01-01T10:00:00Z', type: 'user', content: 'Hello' }
        ]
      ]

      newMessageDisplay.recordInitialState(conversations)
      newMessageDisplay.resetDisplayState()

      // 初期化状態は維持、表示制限のみクリア
      expect(newMessageDisplay.isInitialized).toBe(true)

      const debugInfo = newMessageDisplay.getDebugInfo()
      expect(debugInfo.displayState.restrictedThreads).toHaveLength(0)
    })

    it('完全リセット', () => {
      const conversations = [
        [
          { session_id: 'session1', timestamp: '2024-01-01T10:00:00Z', type: 'user', content: 'Hello' }
        ]
      ]

      newMessageDisplay.recordInitialState(conversations)
      newMessageDisplay.resetInitialState()

      // 全てリセット
      expect(newMessageDisplay.isInitialized).toBe(false)

      const debugInfo = newMessageDisplay.getDebugInfo()
      expect(debugInfo.initialState.groupCount).toBe(0)
      expect(debugInfo.displayState.restrictedThreads).toHaveLength(0)
    })
  })

  describe('実際の利用シナリオ', () => {
    it('完全なワークフロー', () => {
      // 1. 初期表示
      const initialConversations = [
        [
          { session_id: 'session1', timestamp: '2024-01-01T10:00:00Z', type: 'user', content: 'Question' },
          { session_id: 'session1', timestamp: '2024-01-01T10:01:00Z', type: 'assistant', content: 'Answer 1' }
        ]
      ]

      newMessageDisplay.recordInitialState(initialConversations)

      // 初期状態では全メッセージ表示
      expect(newMessageDisplay.getVisibleMessages(initialConversations[0], 0)).toHaveLength(2)
      expect(newMessageDisplay.hasPendingMessages(initialConversations[0], 0)).toBe(false)

      // 2. WebSocket経由で新着メッセージ追加
      const updatedConversations = [
        [
          { session_id: 'session1', timestamp: '2024-01-01T10:00:00Z', type: 'user', content: 'Question' },
          { session_id: 'session1', timestamp: '2024-01-01T10:01:00Z', type: 'assistant', content: 'Answer 1' },
          { session_id: 'session1', timestamp: '2024-01-01T10:02:00Z', type: 'assistant', content: 'Answer 2 (new)' },
          { session_id: 'session1', timestamp: '2024-01-01T10:03:00Z', type: 'assistant', content: 'Answer 3 (new)' }
        ]
      ]

      newMessageDisplay.processNewMessages(updatedConversations)

      // 初期の2つ + 新着アシスタントの1つ目は表示、2つ目は保留
      const group = updatedConversations[0]
      expect(newMessageDisplay.getVisibleMessages(group, 0)).toHaveLength(3)
      expect(newMessageDisplay.hasPendingMessages(group, 0)).toBe(true)
      expect(newMessageDisplay.getPendingCount(group, 0)).toBe(1)

      // 3. ユーザーが「新着メッセージ表示」をクリック
      newMessageDisplay.showPendingMessages(0, group)

      // 全メッセージが表示される
      expect(newMessageDisplay.getVisibleMessages(group, 0)).toHaveLength(4)
      expect(newMessageDisplay.hasPendingMessages(group, 0)).toBe(false)
      expect(newMessageDisplay.getPendingCount(group, 0)).toBe(0)
    })
  })
})
