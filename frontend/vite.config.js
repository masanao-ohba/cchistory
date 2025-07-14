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
    host: '0.0.0.0',
    port: 3000,
    strictPort: false,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '.ngrok.io',
      '.ngrok-free.app',
      '.ngrok.app'
    ],
    hmr: true,
    cors: true,
    watch: {
      usePolling: true,
      interval: 100
    },
    proxy: {},
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
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
