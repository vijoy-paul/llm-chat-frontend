import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default ({ mode }) => {
  // Load env variables for the current mode
  const env = loadEnv(mode, process.cwd(), '');

  return defineConfig({
    plugins: [react()],
    server: {
      proxy:
        mode === 'development'
          ? {
              '/api': {
                target: env.VITE_API_URL, 
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions'), 
                secure: true,
              },
            }
          : undefined, 
    },
  });
};

