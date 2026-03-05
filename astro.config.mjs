import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://furystack.github.io',
  markdown: {
    shikiConfig: {
      theme: 'night-owl',
    },
    remarkPlugins: ['remark-smartypants'],
  },
  integrations: [sitemap()],
});
