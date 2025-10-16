import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { cspPlugin } from './vite-csp-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cspPlugin()
  ],
})
