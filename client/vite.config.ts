import { resolve } from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// BASE_PATH lets CI build the app under a different public path (e.g. a
// per-PR preview at /draftkit/pr-preview/pr-123/). Defaults to the prod path.
export default defineConfig({
  base: process.env.BASE_PATH || '/draftkit/',
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
