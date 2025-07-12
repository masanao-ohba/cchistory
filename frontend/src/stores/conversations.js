import { defineStore } from 'pinia'
import axios from 'axios'

// Axiosのベース設定
const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

export const useConversationStore = defineStore('conversations', {
  state: () => ({
    currentFilters: {},
    projects: []
  }),

  actions: {
    async getProjects() {
      try {
        const response = await api.get('/projects')
        this.projects = response.data.projects
        return response.data
      } catch (error) {
        console.error('Error fetching projects:', error)
        throw error
      }
    },

    async getConversations(filters = {}, force = false) {
      try {
        this.currentFilters = { ...this.currentFilters, ...filters }

        const params = new URLSearchParams()

        if (filters.startDate) {
          params.append('start_date', filters.startDate)
        }
        if (filters.endDate) {
          params.append('end_date', filters.endDate)
        }
        if (filters.projects && filters.projects.length > 0) {
          filters.projects.forEach(project => {
            params.append('project[]', project)
          })
        }
        if (filters.offset) {
          params.append('offset', filters.offset)
        }
        if (filters.limit) {
          params.append('limit', filters.limit)
        }
        if (filters.keyword) {
          params.append('keyword', filters.keyword)
        }
        if (filters.showRelatedThreads !== undefined) {
          params.append('show_related_threads', filters.showRelatedThreads)
        }
        if (filters.sortOrder) {
          params.append('sort_order', filters.sortOrder)
        }
        if (filters.threadMode && filters.threadMode === 'grouped') {
          params.append('group_by_thread', 'true')
        }

        // キャッシュ無効化のため
        if (force) {
          params.append('_t', Date.now())
        }

        const response = await api.get(`/conversations?${params}`)
        return response.data
      } catch (error) {
        console.error('Error fetching conversations:', error)
        throw error
      }
    },

    async getStats() {
      try {
        const response = await api.get('/conversations/stats')
        return response.data
      } catch (error) {
        console.error('Error fetching stats:', error)
        throw error
      }
    }
  }
})
