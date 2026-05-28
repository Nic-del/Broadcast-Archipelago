import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  return {
    base: command === 'build' ? './' : '/', // Use relative paths for built files so Electron can load them from the local filesystem, but use '/' for dev server
    plugins: [
      react(),
      tailwindcss(),
    ],
  }
})

