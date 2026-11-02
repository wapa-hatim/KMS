import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/@supabase/')) return 'supabase'
          if (id.includes('/node_modules/@coreui/')) return 'coreui'
          if (id.includes('/node_modules/@radix-ui/')) return 'radix-ui'
          if (id.includes('/node_modules/react-dom/') || id.includes('/node_modules/react/') || id.includes('/node_modules/scheduler/')) return 'react'
        },
      },
    },
  },
})