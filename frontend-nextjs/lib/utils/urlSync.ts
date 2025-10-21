import { searchFieldsConfig, SearchFieldType } from '../types/search';

/**
 * Parse value from URL parameter based on field type
 */
export const parseValueFromUrl = (value: string | string[] | undefined, type: SearchFieldType): any => {
  if (value === undefined || value === null) return undefined;

  switch (type) {
    case SearchFieldType.ARRAY:
      return Array.isArray(value) ? value : [value];
    case SearchFieldType.BOOLEAN:
      return value === 'true';
    default:
      return value;
  }
};

/**
 * Format value for URL parameter based on field type
 */
export const formatValueForUrl = (value: any, type: SearchFieldType, defaultValue: any): string | string[] | undefined => {
  if (type === SearchFieldType.ARRAY) {
    return value && value.length > 0 ? value : undefined;
  } else if (type === SearchFieldType.BOOLEAN) {
    return value !== defaultValue ? value.toString() : undefined;
  } else {
    return value && value !== '' && value !== defaultValue ? value : undefined;
  }
};

/**
 * Load state from URL search params
 */
export const loadStateFromUrl = (searchParams: URLSearchParams): Record<string, any> => {
  const state: Record<string, any> = {};

  Object.entries(searchFieldsConfig).forEach(([field, config]) => {
    const urlValue = searchParams.get(config.urlParam);

    // Handle array parameters (multiple values with same key)
    if (config.type === SearchFieldType.ARRAY) {
      const allValues = searchParams.getAll(config.urlParam);
      if (allValues.length > 0) {
        state[field] = allValues;
      }
    } else {
      const parsedValue = parseValueFromUrl(urlValue ?? undefined, config.type);
      if (parsedValue !== undefined) {
        state[field] = parsedValue;
      }
    }
  });

  return state;
};

/**
 * Create URL search params from state
 */
export const createQueryFromState = (searchState: Record<string, any>): URLSearchParams => {
  const params = new URLSearchParams();

  Object.entries(searchFieldsConfig).forEach(([field, config]) => {
    const value = searchState[field];
    const formattedValue = formatValueForUrl(value, config.type, config.default);

    if (formattedValue !== undefined) {
      if (Array.isArray(formattedValue)) {
        // Add multiple values for array fields
        formattedValue.forEach((v) => params.append(config.urlParam, v));
      } else {
        params.set(config.urlParam, formattedValue);
      }
    }
  });

  return params;
};

/**
 * Create URL query string from state
 */
export const createQueryStringFromState = (searchState: Record<string, any>): string => {
  const params = createQueryFromState(searchState);
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};
