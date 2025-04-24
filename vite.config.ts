import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    },
    define: {
      'import.meta.env': {
        VITE_API_URL: mode === 'production' 
          ? 'https://productmgmtaemaebeta.my.workfront.com/attask/api/v15.0'
          : 'http://localhost:3001',
        VITE_WORKFRONT_API_KEY: env.VITE_WORKFRONT_API_KEY || 'q9ios5o0rbu6lpe2vwjka9je4b00dgt0'
      }
    },
    base: './',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            mui: ['@mui/material', '@mui/icons-material']
          }
        }
      }
    }
  };
}); 