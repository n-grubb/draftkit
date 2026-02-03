import { resolve } from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/draftkit/',
  plugins: [react()],
  resolve: {
    alias: {
      '~': resolve(__dirname, './src')
    }
  },
  server: {
    // Allow connections from network
    host: true,
    fs: {
      strict: false
    }
  }
})
