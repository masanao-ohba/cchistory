/**
 * Search field types for URL synchronization
 */
export enum SearchFieldType {
  STRING = 'string',
  ARRAY = 'array',
  BOOLEAN = 'boolean',
}

/**
 * Search field configuration
 * Maps internal state field names to URL parameters and their types
 */
export interface SearchFieldConfig {
  type: SearchFieldType;
  urlParam: string;
  default: any;
}

/**
 * Search fields configuration
 * Defines all searchable/filterable fields and their URL parameter mappings
 */
export const searchFieldsConfig: Record<string, SearchFieldConfig> = {
  startDate: {
    type: SearchFieldType.STRING,
    urlParam: 'start_date',
    default: null,
  },
  endDate: {
    type: SearchFieldType.STRING,
    urlParam: 'end_date',
    default: null,
  },
  projects: {
    type: SearchFieldType.ARRAY,
    urlParam: 'projects',
    default: [],
  },
  keyword: {
    type: SearchFieldType.STRING,
    urlParam: 'keyword',
    default: '',
  },
  showRelatedThreads: {
    type: SearchFieldType.BOOLEAN,
    urlParam: 'show_related_threads',
    default: false,
  },
  sortOrder: {
    type: SearchFieldType.STRING,
    urlParam: 'sort_order',
    default: 'desc',
  },
};

/**
 * Create initial search state from configuration
 */
export const createInitialSearchState = (): Record<string, any> => {
  const state: Record<string, any> = {};
  Object.entries(searchFieldsConfig).forEach(([field, config]) => {
    state[field] = Array.isArray(config.default) ? [...config.default] : config.default;
  });
  return state;
};
