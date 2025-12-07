import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  console.log('Loading env from:', process.cwd());
  console.log('VITE_ZAI_API_KEY loaded:', env.VITE_ZAI_API_KEY ? 'YES' : 'NO');
  
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        // Proxy DeepSeek API requests to avoid CORS issues
        '/api/deepseek': {
          target: 'https://api.deepseek.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/deepseek/, '/v1'),
          secure: true,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // Forward all headers including authorization
              const headers = req.headers;
              Object.keys(headers).forEach(key => {
                if (key.toLowerCase() !== 'host') {
                  proxyReq.setHeader(key, headers[key] as string);
                }
              });
            });
          },
        },
      },
    },
    plugins: [react()],
    define: {
      'import.meta.env.VITE_ZAI_API_KEY': JSON.stringify(env.VITE_ZAI_API_KEY || ''),
      'import.meta.env.VITE_DEEPSEEK_API_KEY': JSON.stringify(env.VITE_DEEPSEEK_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
