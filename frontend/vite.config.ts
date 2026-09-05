import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
        if (id.includes('react') && (id.includes('/node_modules/react') || id.includes('node_modules/react'))) return 'vendor-react'
        if (id.includes('react-router-dom')) return 'vendor-router'
        if (id.includes('recharts')) return 'vendor-charts'
        if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-maps'
        if (id.includes('lucide-react') || id.includes('axios')) return 'vendor-ui'
      },
      },
    },
  },
})
