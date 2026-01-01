import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// Import process explicitly to resolve the TypeScript error 'Property cwd does not exist on type Process'
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Use process.cwd() from the Node.js process to correctly load environment variables from the project root
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.YOUTUBE_API_KEY': JSON.stringify(env.YOUTUBE_API_KEY),
    },
  };
});
