import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El puerto 3000 se mantiene igual que con Create React App
// (CORS del backend y FRONTEND_URL dependen de él). Vercel espera dist/.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // accesible desde la red local (tablets/TV del KDS)
  },
  build: {
    outDir: 'dist',
  },
});
