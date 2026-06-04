import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/honbapcook.js',
        chunkFileNames: 'assets/honbapcook-chunk.js',
        assetFileNames: 'assets/honbapcook-[name].[ext]',
      },
    },
  },
})
