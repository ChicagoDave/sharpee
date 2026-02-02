// @ts-check
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [
    expressiveCode({
      themes: ['github-dark', 'github-light'],
    }),
    mdx(),
  ],
});
