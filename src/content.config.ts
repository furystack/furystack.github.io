import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob, file } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      author: z.array(z.string()),
      tags: z.array(z.string()).optional(),
      image: image().optional(),
      date: z.coerce.date(),
      draft: z.boolean().default(false),
      excerpt: z.string().nullable().optional(),
      deprecated: z.boolean().default(false),
      supersededBy: z.string().nullable().optional(),
    }),
});

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    package: z.string().optional(),
    lastVerified: z.coerce.date(),
    order: z.number().default(0),
  }),
});

const authors = defineCollection({
  loader: file('src/data/authors.yaml'),
  schema: z.object({
    id: z.string(),
    avatar: z.string(),
    bio: z.string(),
    twitter: z.string().optional(),
    facebook: z.string().optional(),
    website: z.url().optional(),
    location: z.string().optional(),
    profile_image: z.string().optional(),
  }),
});

const tags = defineCollection({
  loader: file('src/data/tags.yaml'),
  schema: z.object({
    id: z.string(),
    description: z.string().optional(),
    image: z.string().optional(),
  }),
});

export const collections = { posts, docs, authors, tags };
