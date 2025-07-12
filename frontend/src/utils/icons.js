/**
 * Font Awesomeアイコン定義
 * @fileoverview アプリケーション全体で使用するFont Awesomeアイコンのコンポーネント定義
 */
import { h } from 'vue'

/**
 * ユーザー（人間）アイコン
 * @param {Object} props - アイコンのプロパティ
 * @returns {VNode} Font AwesomeアイコンのVNode
 */
export const UserIcon = (props = {}) => h('i', {
  class: 'fas fa-user text-base',
  style: 'font-size: 16px;',
  ...props
})

/**
 * アシスタント（ロボット）アイコン
 * @param {Object} props - アイコンのプロパティ
 * @returns {VNode} Font AwesomeアイコンのVNode
 */
export const AssistantIcon = (props = {}) => h('i', {
  class: 'fas fa-robot text-base',
  style: 'font-size: 16px;',
  ...props
})

/**
 * メッセージタイプに応じたアイコンを取得
 * @param {string} messageType - メッセージタイプ ('user' または 'assistant')
 * @param {Object} props - アイコンのプロパティ
 * @returns {VNode} 対応するアイコンのVNode
 */
export const getMessageIcon = (messageType, props = {}) => {
  switch (messageType) {
    case 'user':
      return UserIcon(props)
    case 'assistant':
      return AssistantIcon(props)
    default:
      return UserIcon(props)
  }
}