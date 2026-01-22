import { defineCollection, z } from 'astro:content';

// Documentation collection - guides, tutorials, reference
const docs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    section: z.enum(['getting-started', 'tutorials', 'author-guide', 'developer-guide']),
    order: z.number().default(0), // For sidebar ordering
    draft: z.boolean().default(false),
  }),
});

// Platform info for games/demos
const platformSchema = z.object({
  browser: z.string().optional(),
  electron: z.string().optional(),
  screenReader: z.string().optional(),
});

// Author info
const authorSchema = z.object({
  name: z.string(),
  url: z.string().optional(),
});

// Demos collection - example/tutorial games
const demos = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    coverImage: z.string().optional(),
    authors: z.array(authorSchema),
    version: z.string(),
    platforms: platformSchema,
    featured: z.boolean().default(false),
    dateAdded: z.date(),
  }),
});

// Games collection - community games
const games = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    coverImage: z.string().optional(),
    authors: z.array(authorSchema),
    version: z.string(),
    platforms: platformSchema,
    featured: z.boolean().default(false),
    dateAdded: z.date(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { docs, demos, games };
