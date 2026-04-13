import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', // Use relative paths for built files so Electron can load them from the local filesystem
  plugins: [
    react(),
    tailwindcss(),
  ],
})
