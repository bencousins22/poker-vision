import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const apiKey = env.API_KEY || process.env.API_KEY || '';
  const youtubeKey = env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY || '';

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.YOUTUBE_API_KEY': JSON.stringify(youtubeKey),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'framer-motion'],
            'charts': ['recharts'],
            'player': ['react-player'],
            'icons': ['lucide-react']
          }
        }
      }
    },
    server: {
      port: 3000
    }
  };
});