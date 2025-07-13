/**
 * 検索フィールドの統一定義
 * 新しいフィールドはここに追加するだけでURL同期、コンポーネント同期が自動化される
 */

export const SearchFieldType = {
  STRING: 'string',
  ARRAY: 'array',
  BOOLEAN: 'boolean'
}

export const ComponentName = {
  SEARCH_BOX: 'SearchBox',
  FILTER_BAR: 'FilterBar'
}

/**
 * 検索フィールドの設定定義
 * 新しいフィールドを追加する場合は、この設定にエントリを追加するだけ
 */
export const searchFieldsConfig = {
  startDate: {
    type: SearchFieldType.STRING,
    urlParam: 'start_date',
    component: ComponentName.FILTER_BAR,
    default: null
  },
  endDate: {
    type: SearchFieldType.STRING,
    urlParam: 'end_date',
    component: ComponentName.FILTER_BAR,
    default: null
  },
  projects: {
    type: SearchFieldType.ARRAY,
    urlParam: 'projects',
    component: ComponentName.FILTER_BAR,
    default: () => []
  },
  keyword: {
    type: SearchFieldType.STRING,
    urlParam: 'keyword',
    component: ComponentName.SEARCH_BOX,
    default: ''
  },
  showRelatedThreads: {
    type: SearchFieldType.BOOLEAN,
    urlParam: 'show_related_threads',
    component: ComponentName.SEARCH_BOX,
    default: true
  },
  sortOrder: {
    type: SearchFieldType.STRING,
    urlParam: 'sort_order',
    component: ComponentName.FILTER_BAR,
    default: 'desc'
  },
  threadMode: {
    type: SearchFieldType.STRING,
    urlParam: 'thread_mode',
    component: ComponentName.FILTER_BAR,
    default: 'grouped'
  }
}

/**
 * 初期状態を生成する
 */
export const createInitialSearchState = () => {
  const state = {}
  Object.entries(searchFieldsConfig).forEach(([field, config]) => {
    state[field] = typeof config.default === 'function' ? config.default() : config.default
  })
  return state
}
