// SVGアイコンパスの定義
export const iconPaths = {
  // 統計関連
  conversation: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  message: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
  project: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',

  // 検索関連
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  close: 'M6 18L18 6M6 6l12 12',

  // UI関連
  chevronDown: 'M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z',
  arrowUp: 'M5 10l7-7m0 0l7 7m-7-7v18',
  copy: 'M9 9V4a3 3 0 00-3-3m3 3a3 3 0 013 3m-3-3v5m0 0H6m3 0h6M6 12h3m6 0h3m-3 0v5a3 3 0 01-3 3H9a3 3 0 01-3-3v-5',
  copyFill: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3',
  check: 'M20,6 9,17 4,12',

  // ローディング関連
  spinner: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
}

// 統計カード用の設定
export const statsConfig = [
  {
    type: 'threads',
    labelKey: 'statistics.totalThreads',
    color: 'blue',
    icon: iconPaths.conversation,
    valueField: 'total_threads'
  },
  {
    type: 'messages',
    labelKey: 'statistics.totalMessages',
    color: 'green',
    icon: iconPaths.message,
    valueField: 'total_messages'
  },
  {
    type: 'projects',
    labelKey: 'statistics.totalProjects',
    color: 'purple',
    icon: iconPaths.project,
    valueField: 'projects'
  }
]

// カラーテーマ設定
export const colorThemes = {
  blue: {
    card: 'from-blue-50 to-blue-100 border-blue-200/50',
    icon: 'from-blue-500 to-blue-600',
    value: 'text-blue-700',
    label: 'text-blue-600'
  },
  green: {
    card: 'from-green-50 to-green-100 border-green-200/50',
    icon: 'from-green-500 to-green-600',
    value: 'text-green-700',
    label: 'text-green-600'
  },
  purple: {
    card: 'from-purple-50 to-purple-100 border-purple-200/50',
    icon: 'from-purple-500 to-purple-600',
    value: 'text-purple-700',
    label: 'text-purple-600'
  }
}
