import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: cast process to any to avoid type error about missing cwd()
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // This ensures process.env.API_KEY works in your client-side code
      // by replacing it with the string value at build time.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.YOUTUBE_API_KEY': JSON.stringify(env.YOUTUBE_API_KEY),
    },
  };
});