import { searchFieldsConfig, SearchFieldType } from '../types/search.js'

/**
 * URLパラメータから状態への変換（統一処理）
 */
export const parseValueFromUrl = (value, type) => {
  if (value === undefined) return undefined

  switch (type) {
    case SearchFieldType.ARRAY:
      return Array.isArray(value) ? value : [value]
    case SearchFieldType.BOOLEAN:
      return value === 'true'
    default:
      return value
  }
}

/**
 * 状態からURLパラメータへの変換（統一処理）
 */
export const formatValueForUrl = (value, type, defaultValue) => {
  if (type === SearchFieldType.ARRAY) {
    return value && value.length > 0 ? value : undefined
  } else if (type === SearchFieldType.BOOLEAN) {
    return value !== defaultValue ? value.toString() : undefined
  } else {
    return value && value !== '' && value !== defaultValue ? value : undefined
  }
}

/**
 * URLクエリパラメータから検索状態を復元
 */
export const loadStateFromUrl = (query) => {
  const state = {}

  Object.entries(searchFieldsConfig).forEach(([field, config]) => {
    const queryValue = query[config.urlParam]
    const parsedValue = parseValueFromUrl(queryValue, config.type)

    if (parsedValue !== undefined) {
      state[field] = parsedValue
    }
  })

  return state
}

/**
 * 検索状態からURLクエリパラメータを生成
 */
export const createQueryFromState = (searchState) => {
  const query = {}

  Object.entries(searchFieldsConfig).forEach(([field, config]) => {
    const value = searchState[field]
    const formattedValue = formatValueForUrl(value, config.type, config.default)

    if (formattedValue !== undefined) {
      query[config.urlParam] = formattedValue
    }
  })

  return query
}
