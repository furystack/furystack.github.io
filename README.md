# furystack.github.io

The official website and blog for [FuryStack](https://github.com/furystack/furystack) — a flexible end-to-end framework for building complex services with Node.js.

**Live site:** [https://furystack.github.io](https://furystack.github.io)

## Tech Stack

- [Astro](https://astro.build/) — Static site generator
- [TypeScript](https://www.typescriptlang.org/) — Type safety
- Markdown — Blog content via Astro Content Collections
- [ESLint 9](https://eslint.org/) + [Prettier](https://prettier.io/) — Linting & formatting

## Getting Started

### Prerequisites

- Node.js 22+
- Yarn (via Corepack)

### Development

```bash
corepack enable
yarn install
yarn dev
```

The dev server runs at `http://localhost:4321`.

### Build

```bash
yarn build
```

Output goes to `dist/`.

### Preview

```bash
yarn preview
```

## Content

Blog posts live in `src/content/posts/` as Markdown files with frontmatter:

```yaml
---
title: 'Post Title'
author: [gallayl]
tags: ['Getting Started']
image: img/cover.jpg
date: '2024-01-01T00:00:00.000Z'
draft: false
excerpt: A short summary of the post.
---
```

Author data is in `src/data/authors.yaml` and tag metadata in `src/data/tags.yaml`.

## Deployment

The site deploys automatically to GitHub Pages via GitHub Actions on push to `main`. See `.github/workflows/deploy.yml`.

## License

MIT
