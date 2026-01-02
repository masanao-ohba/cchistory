const API_BASE_URL = '/api';

export interface ApiError {
  message: string;
  status: number;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const startTime = performance.now();

    try {
      const fetchStart = performance.now();
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      const fetchEnd = performance.now();
      console.log(`[API] Fetch ${endpoint}: ${(fetchEnd - fetchStart).toFixed(0)}ms`);

      if (!response.ok) {
        throw {
          message: `HTTP error! status: ${response.status}`,
          status: response.status,
        } as ApiError;
      }

      const jsonStart = performance.now();
      const data = await response.json();
      const jsonEnd = performance.now();
      console.log(`[API] JSON parse ${endpoint}: ${(jsonEnd - jsonStart).toFixed(0)}ms`);

      const totalTime = performance.now() - startTime;
      console.log(`[API] Total ${endpoint}: ${totalTime.toFixed(0)}ms`);

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = params
      ? `${endpoint}?${new URLSearchParams(params).toString()}`
      : endpoint;
    return this.request<T>(url);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Token usage API
import type { TokenUsageResponse } from '../types/tokenUsage';

export const fetchTokenUsage = async (): Promise<TokenUsageResponse> => {
  return apiClient.get<TokenUsageResponse>('/token-usage');
};
