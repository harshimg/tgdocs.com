// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://astro.build/config
export default defineConfig({
  site: 'https://tgdocs.com',
  output: 'static',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'ru', 'ja', 'fr', 'de', 'pt', 'ko', 'it', 'hi'],
    routing: 'manual',
  },
  integrations: [react()],
  vite: {
    plugins: [
      tailwindcss(),
      nodePolyfills({
        include: ['buffer', 'process', 'crypto', 'stream', 'util', 'events', 'path', 'os'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    ssr: {
      external: ['telegram', 'telegram/sessions', 'telegram/client/uploads', 'telegram/Password'],
    },
    define: {
      global: 'globalThis',
    },
  },
});
