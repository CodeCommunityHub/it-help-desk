import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Use '/' for local development (http://localhost:5173/) and '/gov-it-desk/' for GitHub Pages production build
  base: command === 'build' ? '/gov-it-desk/' : '/',
}))
