import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    emptyOutDir: true,
    // Top-level await please
    target: 'esnext',
    rollupOptions: {
      external: ['config.json'],
      output: {
        // This is a manual chunk configuration, it's used to split the bundle
        manualChunks: {
          chartjs: ['chart.js', 'react-chartjs-2'],
          msalbrowser: ['@azure/msal-browser'],
          fontawesome: ['@fortawesome/fontawesome-svg-core', '@fortawesome/free-solid-svg-icons', '@fortawesome/react-fontawesome'],
          bootstrap: ['bootswatch/dist/sandstone/bootstrap.min.css', 'bootstrap/dist/js/bootstrap.bundle.min'],
        },
      },
    },
  },
})
