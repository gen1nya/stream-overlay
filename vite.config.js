import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react({
    babel: {
      plugins: [
        [
          'babel-plugin-transform-imports',
          {
            'react-icons': {
              transform: (importName) => {
                const family = importName.toLowerCase().slice(0, 2);
                return `react-icons/${family}/${importName}`;
              },
              preventFullImport: true,
            }
          }
        ]
      ]
    }
  })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  server: {
    proxy: {
      '/images': 'http://localhost:5123',
      '/media/': 'http://localhost:5123',
      '/font': 'http://localhost:5123'
    }
  }
})