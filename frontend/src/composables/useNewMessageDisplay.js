import { reactive, ref } from 'vue'

/**
 * 新着メッセージ表示機能のコンポーザブル
 *
 * ハイブリッド方式：
 * - 初期表示時の各グループの最後のメッセージ情報を記録
 * - WebSocket更新時に、初期状態より後ろのメッセージを新着として判定
 * - 新着の2つ目以降のアシスタントメッセージのみ保留表示
 */
export function useNewMessageDisplay() {
  // 初期状態管理
  const initialState = reactive({
    // groupId -> { timestamp: string, length: number }
    groupStates: new Map(),
    isInitialized: false
  })

  // 現在の表示制御状態
  const displayState = reactive({
    // threadIndex -> 表示するメッセージ数
    visibleCounts: new Map()
  })

  /**
   * グループのユニークIDを生成
   */
  const getGroupId = (group) => {
    if (!group || group.length === 0) return null
    const firstMessage = group[0]
    return `${firstMessage.session_id}_${firstMessage.timestamp}`
  }

  /**
   * 初期状態を記録
   * @param {Array} conversations - 会話グループの配列
   */
  const recordInitialState = (conversations) => {
    initialState.groupStates.clear()

    if (!Array.isArray(conversations)) return

    conversations.forEach((group) => {
      if (!group || !Array.isArray(group) || group.length === 0) return

      const groupId = getGroupId(group)
      if (groupId) {
        const lastMessage = group[group.length - 1]
        initialState.groupStates.set(groupId, {
          timestamp: lastMessage.timestamp,
          length: group.length
        })
      }
    })

    initialState.isInitialized = true
  }

  /**
   * グループ内の新着メッセージを取得
   * @param {Array} group - メッセージグループ
   * @returns {Array} 新着メッセージの配列
   */
  const getNewMessagesInGroup = (group) => {
    // 型チェックを強化
    if (!group || !Array.isArray(group) || group.length === 0) {
      return []
    }

    const groupId = getGroupId(group)
    if (!groupId || !initialState.groupStates.has(groupId)) {
      // 新規グループまたは初期化前 → 新着扱いしない
      return []
    }

    const initial = initialState.groupStates.get(groupId)
    // 初期状態より後ろのメッセージが新着
    return group.slice(initial.length)
  }

  /**
   * 新着メッセージの中で保留表示すべきメッセージを判定
   * @param {Array} newMessages - 新着メッセージ配列
   * @param {Array} fullGroup - 完全なメッセージグループ
   * @returns {Array} 保留すべきメッセージの配列
   */
  const getPendingNewMessages = (newMessages, fullGroup) => {
    if (!newMessages || newMessages.length === 0) return []

    const pendingMessages = []

    // 新着メッセージ内でのアシスタントメッセージのみを抽出
    const newAssistantMessages = newMessages.filter(m => m.type === 'assistant')

    newMessages.forEach((message, index) => {
      if (message.type === 'user') {
        // ユーザーメッセージは即時表示
        return
      }

      if (message.type === 'assistant') {
        // 新着メッセージ内でのアシスタントメッセージの順序を確認
        const assistantIndexInNewMessages = newAssistantMessages.findIndex(m =>
          m.timestamp === message.timestamp && m.content === message.content
        )

        if (assistantIndexInNewMessages === 0) {
          // 新着メッセージ内で最初のアシスタントメッセージは即時表示
          return
        } else {
          // 新着メッセージ内で2つ目以降のアシスタントメッセージは保留
          pendingMessages.push(message)
        }
      }
    })

    return pendingMessages
  }

  /**
   * WebSocket更新時の新着メッセージ処理
   * @param {Array} newConversations - 新しい会話データ
   */
  const processNewMessages = (newConversations) => {
    if (!initialState.isInitialized || !Array.isArray(newConversations)) return

    newConversations.forEach((group, threadIndex) => {
      // 配列でない場合は静かにスキップ
      if (!Array.isArray(group)) return

      const newMessages = getNewMessagesInGroup(group)
      if (newMessages.length === 0) return

      const pendingMessages = getPendingNewMessages(newMessages, group)
      if (pendingMessages.length === 0) return

      // 保留メッセージがある場合、表示制限を設定
      const initialLength = initialState.groupStates.get(getGroupId(group))?.length || group.length
      const visibleCount = group.length - pendingMessages.length

      displayState.visibleCounts.set(threadIndex, visibleCount)
    })
  }

  /**
   * 表示するメッセージを取得
   * @param {Array} group - メッセージグループ
   * @param {number} threadIndex - スレッドインデックス
   * @returns {Array} 表示するメッセージの配列
   */
  const getVisibleMessages = (group, threadIndex) => {
    if (!group || !Array.isArray(group) || group.length === 0) return []

    const hasRestriction = displayState.visibleCounts.has(threadIndex)
    const visibleCount = displayState.visibleCounts.get(threadIndex)
    return hasRestriction ? group.slice(0, visibleCount) : group
  }

  /**
   * 保留メッセージがあるかどうかを判定
   * @param {Array} group - メッセージグループ
   * @param {number} threadIndex - スレッドインデックス
   * @returns {boolean} 保留メッセージの有無
   */
  const hasPendingMessages = (group, threadIndex) => {
    if (!group || !Array.isArray(group) || group.length === 0) return false

    // 表示制限が設定されていない場合は保留メッセージなし
    if (!displayState.visibleCounts.has(threadIndex)) {
      return false
    }

    // 制限が設定されている場合は保留メッセージを判定
    const visibleCount = displayState.visibleCounts.get(threadIndex)
    return group.length > visibleCount
  }

  /**
   * 保留メッセージ数を取得
   * @param {Array} group - メッセージグループ
   * @param {number} threadIndex - スレッドインデックス
   * @returns {number} 保留メッセージ数
   */
  const getPendingCount = (group, threadIndex) => {
    if (!group || !Array.isArray(group) || group.length === 0) return 0

    // 表示制限が設定されていない場合は保留数0
    if (!displayState.visibleCounts.has(threadIndex)) {
      return 0
    }

    // 制限が設定されている場合は保留数を計算
    const visibleCount = displayState.visibleCounts.get(threadIndex)
    return Math.max(0, group.length - visibleCount)
  }

  /**
   * 保留メッセージを表示（制限解除）
   * @param {number} threadIndex - スレッドインデックス
   * @param {Array} group - メッセージグループ
   */
  const showPendingMessages = (threadIndex, group) => {
    if (group && Array.isArray(group) && group.length > 0) {
      displayState.visibleCounts.set(threadIndex, group.length)
    }
  }

  /**
   * 表示状態をリセット（検索条件変更時など）
   */
  const resetDisplayState = () => {
    displayState.visibleCounts.clear()
  }

  /**
   * 初期状態をリセット（完全なリセット）
   */
  const resetInitialState = () => {
    initialState.groupStates.clear()
    initialState.isInitialized = false
    resetDisplayState()
  }

  /**
   * デバッグ用：現在の状態を取得
   */
  const getDebugInfo = () => {
    return {
      initialState: {
        isInitialized: initialState.isInitialized,
        groupCount: initialState.groupStates.size,
        groups: Array.from(initialState.groupStates.entries())
      },
      displayState: {
        restrictedThreads: Array.from(displayState.visibleCounts.entries())
      }
    }
  }

  return {
    // 初期化・状態管理
    recordInitialState,
    resetDisplayState,
    resetInitialState,

    // 新着メッセージ処理
    processNewMessages,
    getNewMessagesInGroup,

    // UI用ヘルパー関数
    getVisibleMessages,
    hasPendingMessages,
    getPendingCount,
    showPendingMessages,

    // デバッグ
    getDebugInfo,

    // 状態への読み取り専用アクセス
    get isInitialized() {
      return initialState.isInitialized
    }
  }
}
