import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) {
            return 'react-vendor'
          }

          if (id.includes('/recharts/')) {
            return 'charts-vendor'
          }

          if (id.includes('/@supabase/')) {
            return 'supabase-vendor'
          }

          if (
            id.includes('/@mui/') ||
            id.includes('/@emotion/') ||
            id.includes('/@fortawesome/') ||
            id.includes('/lucide-react/')
          ) {
            return 'ui-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
})
