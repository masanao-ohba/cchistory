import 'server-only';
import type { ConversationsResponse, Project } from '../hooks/useConversations';
import type { TokenUsageResponse } from '../types/tokenUsage';

/**
 * Server-side API client for Next.js Server Components
 *
 * This module ensures API calls only happen on the server side.
 * Uses the internal Docker network to communicate with the backend.
 */

// Use internal Docker network hostname (backend:8000)
// In production/development, Next.js server communicates directly with backend container
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api';

export interface FetchOptions {
  cache?: RequestCache;
  revalidate?: number;
  headers?: HeadersInit;
}

/**
 * Fetch data from the backend API (server-side only)
 *
 * @param endpoint - API endpoint path (e.g., '/conversations')
 * @param options - Fetch options (cache, revalidate, headers)
 * @returns Parsed JSON response
 */
export async function fetchFromAPI<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      cache: options.cache || 'no-store', // Default to always fresh data
      next: {
        revalidate: options.revalidate,
      },
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(
        `API error: ${response.status} ${response.statusText} for ${endpoint}`
      );
    }

    return response.json();
  } catch (error) {
    console.error(`[Server API] Failed to fetch ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Fetch conversations from the backend
 */
export async function fetchConversations(params: Record<string, any> = {}): Promise<ConversationsResponse> {
  const queryString = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((v) => queryString.append(`${key}[]`, v));
      } else {
        queryString.append(key, String(value));
      }
    }
  });

  const endpoint = `/conversations${queryString.toString() ? `?${queryString}` : ''}`;
  return fetchFromAPI<ConversationsResponse>(endpoint);
}

/**
 * Fetch projects list from the backend
 */
export async function fetchProjects(): Promise<{ projects: Project[] }> {
  return fetchFromAPI<{ projects: Project[] }>('/projects');
}

/**
 * Fetch token usage from the backend
 */
export async function fetchTokenUsage(): Promise<TokenUsageResponse> {
  return fetchFromAPI<TokenUsageResponse>('/token-usage');
}

/**
 * Fetch notification count from the backend
 */
export async function fetchNotificationCount() {
  try {
    const response = await fetchFromAPI<{
      total_notifications: number;
      unread_count: number;
      by_project: Record<string, Record<string, number>>;
      by_type: Record<string, number>;
      recent_activity: Array<Record<string, string | number>>;
    }>('/notifications/stats');
    return response.unread_count || 0;
  } catch (error) {
    console.error('[Server API] Failed to fetch notification count:', error);
    return 0; // Fallback to 0 if notifications unavailable
  }
}
