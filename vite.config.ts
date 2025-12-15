import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 9800,
        host: '0.0.0.0',
        allowedHosts: [
      'deegan-propertied-unaudaciously.ngrok-free.dev',
      // 만약 다른 ngrok 주소를 또 사용할 일이 있다면 여기에 추가
      '*.ngrok-free.dev' // 또는 와일드카드 문자로 모든 ngrok free 도메인 허용
        ]
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
