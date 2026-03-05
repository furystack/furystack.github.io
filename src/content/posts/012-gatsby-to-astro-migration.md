---
title: 'Bye Gatsby, Hello Astro 🚀'
author: [gallayl]
tags: ['FuryStack']
date: '2026-03-05T12:00:00.000Z'
draft: false
image: img/012-astro-migration.jpg
excerpt: The FuryStack site has been completely rebuilt with Astro 5 — here's why we moved on from Gatsby and what we gained.
---

## Déjà vu

If you've been here before, you might remember the [very first post on this site](/posts/001-welcome/) — where we moved from a hand-rolled React SPA to Gatsby. That was mid-2021. The reasoning was solid: Gatsby gave us Markdown-driven content, static HTML output, image optimization, and a theme we could build on top of.

Fast forward to 2026 and... we have a problem.

## What went wrong with Gatsby

Nothing _broke_, exactly. The site still built. But the ecosystem around it quietly collapsed:

- **Gatsby Inc. was acquired by Netlify** and active development effectively stopped. The last major release (Gatsby 5) shipped in late 2022 and has barely been touched since.
- **Node 14** — which we were pinned to — hit end-of-life in April 2023. That's nearly three years of missed security patches.
- **The dependency tree was enormous.** Over 1,600 packages for what is essentially a static blog. Build times reflected that.
- **No CI/CD.** Deployment was a manual `yarn deploy` that pushed to a `gh-pages` branch.

The site worked, but it was the software equivalent of a car that hasn't had an oil change in 50,000 miles. It _runs_, but you probably shouldn't drive it much further.

## Why Astro

When evaluating the replacement, the criteria were similar to what we had in 2021 — but sharper:

1. **Content-first.** This is a blog. We don't need a full React runtime in the browser.
2. **Fast builds.** The old Gatsby build pulled in webpack and hundreds of plugins. We wanted seconds, not minutes.
3. **Modern tooling.** Node 22, TypeScript 5, ESLint 9 flat config, native image optimization.
4. **Zero client-side JS by default.** Every page is static HTML + CSS. No hydration, no runtime.
5. **Active and growing.** Astro has a healthy community and regular releases.

Astro checked every box. Its Content Collections give us type-safe Markdown with Zod schemas. Its built-in image optimization replaces five Gatsby plugins. Its scoped `<style>` tags eliminate the need for CSS-in-JS entirely.

## What changed

Here's the before/after:

|                  | Before (Gatsby)                     | After (Astro)                  |
| ---------------- | ----------------------------------- | ------------------------------ |
| **Framework**    | Gatsby 4.20                         | Astro 5                        |
| **Node**         | 14 (EOL)                            | 22 LTS                         |
| **TypeScript**   | 4.7                                 | 5.x                            |
| **Styling**      | Emotion (React CSS-in-JS)           | Scoped CSS + custom properties |
| **Content**      | GraphQL + gatsby-transformer-remark | Content Collections + Zod      |
| **Images**       | gatsby-plugin-sharp + gatsby-image  | astro:assets (built-in)        |
| **SEO**          | react-helmet                        | Native `<head>`                |
| **Linting**      | ESLint 8 (xo config)                | ESLint 9 (flat config)         |
| **Deployment**   | Manual `gh-pages` push              | GitHub Actions → GitHub Pages  |
| **Dependencies** | ~1,600 packages                     | ~200 packages                  |
| **Build time**   | ~30s                                | ~2s                            |
| **Client JS**    | React runtime                       | 0 bytes                        |

## What's next

The framework is modern and if you see this post, it means the pipeline also works. Now it's time to focus on what matters — writing content. Expect posts about recent FuryStack developments (and there's a lot going on), new package releases, and maybe some deep dives into the architecture.

Stay tuned.
