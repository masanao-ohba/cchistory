import { vi } from 'vitest'

// テスト環境の設定

// i18nのモック
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key) => key
  })
}))

// Piniaストアのモック
vi.mock('../stores/conversations', () => ({
  useConversationStore: () => ({
    getProjects: vi.fn().mockResolvedValue({
      projects: [
        { id: 'project1', display_name: 'Project 1', path: '/path/to/project1' },
        { id: 'project2', display_name: 'Project 2', path: '/path/to/project2' }
      ]
    })
  })
}))