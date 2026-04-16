import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  // If deployed in a subdirectory like example.com/app, use:
  // base: '/app/',
  // For root deployment (example.com), leave base as default or use:
  base: '/',
})
