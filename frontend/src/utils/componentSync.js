import { searchFieldsConfig, ComponentName } from '../types/search.js'

/**
 * コンポーネント別に状態を分割
 */
export const groupStateByComponent = (searchState) => {
  const componentStates = {}

  Object.entries(searchFieldsConfig).forEach(([field, config]) => {
    if (!componentStates[config.component]) {
      componentStates[config.component] = {}
    }
    componentStates[config.component][field] = searchState[field]
  })

  return componentStates
}

/**
 * 各コンポーネントに状態を同期
 */
export const syncComponentStates = (searchState, componentRefs) => {
  const componentStates = groupStateByComponent(searchState)

  // SearchBoxコンポーネントに状態を設定
  if (componentRefs.searchBoxRef?.value && componentStates[ComponentName.SEARCH_BOX]) {
    const searchBoxState = componentStates[ComponentName.SEARCH_BOX]
    componentRefs.searchBoxRef.value.setSearchState(
      searchBoxState.keyword,
      searchBoxState.showRelatedThreads
    )
  }

  // FilterBarコンポーネントに状態を設定
  if (componentRefs.filterBarRef?.value && componentStates[ComponentName.FILTER_BAR]) {
    componentRefs.filterBarRef.value.setFilterState(componentStates[ComponentName.FILTER_BAR])
  }
}
