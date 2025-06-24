import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', // Ensure build output is in "dist"
  },
  resolve: {
    alias: {
      '@': '/src', // This maps '@' to the 'src' folder
    },
  },
});
