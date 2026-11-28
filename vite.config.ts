import { defineConfig } from 'vite';

// base relativa: el mismo build sirve en GitHub Pages, en un dominio propio o dentro de Capacitor.
export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
});
