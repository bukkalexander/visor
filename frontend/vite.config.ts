import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const basePath = process.env.ORC_BASE_PATH ? `/${process.env.ORC_BASE_PATH.replace(/^\/+|\/+$/g, '')}/` : '/';

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: { host: '127.0.0.1', proxy: { [`${basePath}api`]: { target: 'http://127.0.0.1:8000', rewrite: path => path.replace(basePath.slice(0, -1), '') } } },
  test: { environment: 'node' }
});
