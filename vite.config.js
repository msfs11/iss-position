import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
  },
  server: {
    port: 5173,
  },
  resolve: {
    alias: [
      { find: '#wasm-single-thread', replacement: fileURLToPath(new URL('./src/vendor/wasmStub.js', import.meta.url)) },
      { find: '#wasm-multi-thread', replacement: fileURLToPath(new URL('./src/vendor/wasmStub.js', import.meta.url)) },
    ],
  },
});