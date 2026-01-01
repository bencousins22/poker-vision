import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Use env file locally, or fallback to system environment variables in CI/CD
  const apiKey = env.API_KEY || process.env.API_KEY;
  const youtubeKey = env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.YOUTUBE_API_KEY': JSON.stringify(youtubeKey),
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});