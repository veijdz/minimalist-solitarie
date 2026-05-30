import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/minimalist-solitarie/' : '/',
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: '/src/lib',
    },
  },
});
