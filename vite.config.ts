import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Hosted at https://jasonreis.dev/djvault/ (Cloudflare Pages publish root = dist/)
export default defineConfig({
  base: '/djvault/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist/djvault',
    emptyOutDir: true,
  },
})
