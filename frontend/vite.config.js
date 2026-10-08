import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Puerto 3000 y carpeta build/ se mantienen igual que con Create React App
// (CORS del backend, FRONTEND_URL y despliegue dependen de ellos).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // accesible desde la red local (tablets/TV del KDS)
  },
  build: {
    outDir: 'build',
  },
});
