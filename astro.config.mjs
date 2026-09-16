// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
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
  integrations: [
    react(),
    sitemap(),
    {
      name: 'sitemap-xml-alias',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          const fs = await import('node:fs');
          const path = await import('node:path');
          const { fileURLToPath } = await import('node:url');
          const distPath = fileURLToPath(dir);
          const indexXml = path.join(distPath, 'sitemap-index.xml');
          const sitemapXml = path.join(distPath, 'sitemap.xml');
          if (fs.existsSync(indexXml)) {
            fs.copyFileSync(indexXml, sitemapXml);
          }
        },
      },
    },
  ],
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
