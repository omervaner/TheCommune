import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@game': resolve(__dirname, 'src/game'),
      '@rendering': resolve(__dirname, 'src/rendering'),
      '@scenes': resolve(__dirname, 'src/scenes'),
      '@animation': resolve(__dirname, 'src/animation'),
      '@data': resolve(__dirname, 'src/data'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@input': resolve(__dirname, 'src/input'),
      '@audio': resolve(__dirname, 'src/audio'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
