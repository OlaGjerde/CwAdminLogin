import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { cspPlugin } from './vite-csp-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cspPlugin()
  ],
  server: {
    port: 5173,
    proxy: {
      '/api/auth': {
        target: 'https://localhost:7059',
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
      },
      '/api/installation': {
        target: 'https://localhost:7060',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'https://localhost:7059',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})
