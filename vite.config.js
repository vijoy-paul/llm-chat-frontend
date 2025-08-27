import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return defineConfig({
    plugins: [react()],
    server: {
      proxy: mode === 'development'
        ? {
            '/api': {
              target: env.VITE_API_URL, // remote Express backend
              changeOrigin: true,
              rewrite: path => path.replace(/^\/api/, '/.netlify/functions'),
              secure: true,
            },
          }
        : undefined,
    },
  });
};

