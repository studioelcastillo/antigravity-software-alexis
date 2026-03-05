import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, '.', '');
  const runtimeEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.startsWith('VITE_'))
  );
  const env = { ...fileEnv, ...runtimeEnv };
  return {
    base: env.VITE_DASHBOARD_BASE || '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (!id.includes('node_modules')) return;
            if (id.includes('node_modules/react-router')) return 'vendor-router';
            if (id.includes('node_modules/react-dom')) return 'vendor-react';
            if (id.includes('node_modules/react/')) return 'vendor-react';
            if (id.includes('node_modules/@tanstack/react-query')) return 'vendor-query';
            if (id.includes('node_modules/@supabase/')) return 'vendor-supabase';
            if (id.includes('node_modules/recharts')) return 'vendor-charts';
            if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
            if (id.includes('node_modules/date-fns') || id.includes('node_modules/moment')) return 'vendor-dates';
            if (id.includes('node_modules/crypto-js')) return 'vendor-crypto';
            if (id.includes('node_modules/axios')) return 'vendor-axios';
            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
