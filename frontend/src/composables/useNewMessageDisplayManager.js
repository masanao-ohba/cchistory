import { reactive } from 'vue'

/**
 * 新着メッセージ表示管理機能
 *
 * read/unread による明確な状態管理
 * - read: 表示済みメッセージ（初期表示またはボタンクリックで表示済み）
 * - unread: 未表示の新着メッセージ（WebSocket更新で追加）
 */
export function useNewMessageDisplayManager() {
  // グループID → { read: Message[], unread: Message[] }
  const groupStates = reactive(new Map())

  /**
   * グループの一意識別子を取得
   * グループを開始するユーザーメッセージのUUIDを使用
   */
  const getGroupId = (group) => {
    if (!Array.isArray(group) || group.length === 0) return null

    // グループの最初のメッセージはユーザーメッセージであるべき
    const firstMessage = group[0]
    if (firstMessage && firstMessage.type === 'user' && firstMessage.uuid) {
      return firstMessage.uuid
    }

    // 万が一最初がユーザーメッセージでない場合は、最初のユーザーメッセージを探す
    const firstUserMessage = group.find(msg => msg.type === 'user' && msg.uuid)
    return firstUserMessage ? firstUserMessage.uuid : null
  }

  /**
   * 初期状態設定（リロード・初回ロード時）
   * 全メッセージを read に格納、unread は空
   */
  const setInitialMessages = (conversations) => {
    // 既存状態をクリア
    groupStates.clear()

    conversations.forEach((group, groupIndex) => {
      if (Array.isArray(group) && group.length > 0) {
        const groupId = getGroupId(group)
        if (groupId) {
          groupStates.set(groupId, {
            read: [...group],  // 全メッセージを read として設定
            unread: []         // unread は空で初期化
          })
        }
      }
    })
  }

  /**
   * 新着メッセージ追加（WebSocket更新時）
   * 既存 read にないメッセージを unread に追加
   */
  const addNewMessages = (conversations) => {
    conversations.forEach((group, groupIndex) => {
      if (!Array.isArray(group) || group.length === 0) return

      const groupId = getGroupId(group)
      if (!groupId) return

      const currentState = groupStates.get(groupId)
      if (!currentState) {
        // グループが存在しない場合は新規作成（新しいグループ）
        groupStates.set(groupId, {
          read: [...group],
          unread: []
        })
        return
      }

      // 既存 read および unread メッセージのUUIDセット作成
      const readUuids = new Set(
        currentState.read
          .map(msg => msg.uuid)
          .filter(uuid => uuid) // UUID が存在するもののみ
      )

      const unreadUuids = new Set(
        currentState.unread
          .map(msg => msg.uuid)
          .filter(uuid => uuid) // UUID が存在するもののみ
      )

      // 新規メッセージ（read にも unread にもないメッセージ）を unread に追加
      const newMessages = group.filter(msg => {
        // UUID がない場合は新規として扱わない（安全のため）
        if (!msg.uuid) return false

        // read にも unread にも存在しないメッセージが新規
        return !readUuids.has(msg.uuid) && !unreadUuids.has(msg.uuid)
      })

      if (newMessages.length > 0) {
        currentState.unread.push(...newMessages)
      }
    })
  }

  /**
   * 表示用メッセージ取得
   * read メッセージのみを返す（unread は非表示）
   */
  const getDisplayMessages = (group, groupIndex) => {
    if (!Array.isArray(group)) return []

    const groupId = getGroupId(group)
    if (!groupId) return group // グループIDが取得できない場合は元のグループを返す

    const state = groupStates.get(groupId)
    return state ? state.read : group
  }

  /**
   * 未読メッセージ数取得
   */
  const getUnreadCount = (group, groupIndex) => {
    if (!Array.isArray(group)) return 0

    const groupId = getGroupId(group)
    if (!groupId) return 0

    const state = groupStates.get(groupId)
    return state ? state.unread.length : 0
  }

  /**
   * 未読メッセージ存在チェック
   */
  const hasUnreadMessages = (group, groupIndex) => {
    return getUnreadCount(group, groupIndex) > 0
  }

  /**
   * 新着メッセージ表示（ボタンクリック時）
   * unread を read に移動し、unread をクリア
   */
  const showNewMessages = (group, groupIndex) => {
    if (!Array.isArray(group)) return

    const groupId = getGroupId(group)
    if (!groupId) return

    const state = groupStates.get(groupId)
    if (state && state.unread.length > 0) {
      // UUIDの重複チェックを行ってから read に移動
      const readUuids = new Set(
        state.read
          .map(msg => msg.uuid)
          .filter(uuid => uuid)
      )

      // read に存在しない unread メッセージのみを追加
      const uniqueUnreadMessages = state.unread.filter(msg =>
        msg.uuid && !readUuids.has(msg.uuid)
      )

      if (uniqueUnreadMessages.length > 0) {
        state.read.push(...uniqueUnreadMessages)
      }

      // unread をクリア
      state.unread = []
    }
  }


  return {
    setInitialMessages,
    addNewMessages,
    getDisplayMessages,
    getUnreadCount,
    hasUnreadMessages,
    showNewMessages
  }
}
