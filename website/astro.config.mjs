// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://sharpee.net',
  integrations: [
    starlight({
      title: 'Sharpee',
      description: 'Interactive Fiction Engine for TypeScript',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/ChicagoDave/sharpee' },
      ],
      sidebar: [
        {
          label: 'Design Patterns',
          link: '/design-patterns/',
        },
        {
          label: 'Getting Started',
          items: [
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
          ],
        },
        {
          label: 'Tutorials',
          items: [
            { label: 'Cloak of Darkness', slug: 'tutorials/cloak-of-darkness' },
          ],
        },
        {
          label: 'Author Guide',
          items: [
            { label: 'Creating Stories', slug: 'author-guide/creating-stories' },
            { label: 'Rooms', slug: 'author-guide/rooms' },
            { label: 'Objects', slug: 'author-guide/objects' },
            { label: 'NPCs', slug: 'author-guide/npcs' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'Traits', slug: 'api-reference/traits' },
            { label: 'Standard Actions', slug: 'api-reference/actions' },
            { label: 'Grammar & Commands', slug: 'api-reference/grammar' },
          ],
        },
        {
          label: 'Developer Guide',
          items: [
            { label: 'Project Structure', slug: 'developer-guide/project-structure' },
            { label: 'Build System', slug: 'developer-guide/build-system' },
          ],
        },
      ],
    }),
  ],
});
