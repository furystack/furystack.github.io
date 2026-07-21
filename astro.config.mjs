import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkSmartypants from 'remark-smartypants';

export default defineConfig({
  site: 'https://furystack.github.io',
  markdown: {
    shikiConfig: {
      theme: 'night-owl',
    },
    remarkPlugins: [remarkSmartypants],
  },
  integrations: [sitemap()],
});
