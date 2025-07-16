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
  spinner: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z',

  // 通知関連
  bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  exclamationCircle: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  cog: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
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

// 通知関連の設定
export const notificationConfig = {
  types: {
    permission_request: {
      icon: iconPaths.shield,
      emoji: '🔐',
      labelKey: 'notifications.types.permission_request',
      color: 'yellow'
    },
    tool_use: {
      icon: iconPaths.cog,
      emoji: '🔧',
      labelKey: 'notifications.types.tool_use',
      color: 'blue'
    },
    notification: {
      icon: iconPaths.bell,
      emoji: '💬',
      labelKey: 'notifications.types.notification',
      color: 'green'
    }
  },
  colors: {
    yellow: {
      bg: 'bg-yellow-100',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-600'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: 'text-green-600'
    }
  }
}
