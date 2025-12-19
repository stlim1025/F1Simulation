import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    server: {
      port: 9800,
      host: '0.0.0.0',
      allowedHosts: true,
      proxy: {
        '/api/posts': {
          target: 'http://13.238.218.144:3001',
          changeOrigin: true,
          secure: false,
        },
        '/api/jsonBlob': {
          target: 'https://jsonblob.com',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
});
