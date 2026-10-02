import { defineConfig } from 'vitest/config';
import react from "@vitejs/plugin-react";
const base = process.env.ORC_BASE_PATH || '/';
const backend = `http://127.0.0.1:${process.env.AGENT_BACKEND_PORT || '8000'}`;
export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    allowedHosts: ['bukkpi', '.ts.net'],
    proxy: {
      [`${base}api`]: { target: backend, changeOrigin: true, headers: {'X-Forwarded-Prefix': base.replace(/\/$/, '')}, rewrite: path => path.replace(base.replace(/\/$/, ''), '') },
      [`${base}uploads`]: { target: backend, changeOrigin: true, headers: {'X-Forwarded-Prefix': base.replace(/\/$/, '')}, rewrite: path => path.replace(base.replace(/\/$/, ''), '') },
    },
  },
  test: { environment: 'node' },
});
