import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const isDebugMode = process.env.VITE_DEBUG !== 'false'

export default defineConfig({
  plugins: [vue()],

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js']
  },

  server: {
    host: true,
    port: 3000,
    strictPort: false,
    allowedHosts: 'all',
    hmr: {
      port: 3000,
      host: 'localhost'
    },
    cors: true,
    watch: {
      usePolling: true,
      interval: 100
    },
    proxy: {}
  },

  build: {
    outDir: 'dist',
    sourcemap: isDebugMode ? 'inline' : false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'pinia', 'axios', 'vue-router', 'vue-i18n'],
          utils: ['@vueuse/core', 'markdown-it']
        }
      }
    },
    target: 'esnext',
    chunkSizeWarningLimit: 1000
  },

  cacheDir: '/tmp/vite-cache',

  resolve: {
    alias: {
      '@': '/app/src'
    }
  },

  define: {
    __DEBUG__: isDebugMode,
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  }
})
