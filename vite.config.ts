import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // The Pages workflow sets BASE_PATH=/water-delivery-system/; local dev stays at /.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
