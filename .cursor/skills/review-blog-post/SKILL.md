---
name: review-blog-post
description: >-
  Review blog posts for the FuryStack site. Use when the user asks to review a
  blog post, check tagging, validate frontmatter, or verify post conventions.
  Also use when a branch contains new or modified posts and the user asks for a
  review.
---

# Reviewing Blog Posts for FuryStack

When reviewing a blog post, check each of the following areas and report issues grouped by severity.

## 1. Frontmatter validation

Posts live in `src/content/posts/` as Markdown files named `{NNN}-{slug}.md`.

```yaml
---
title: 'Post Title'
author: [gallayl]
tags: ['PrimaryCategory', 'thematic-tag', 'package-tag']
date: '2026-03-12T12:00:00.000Z'
draft: false
image: img/{NNN}-{short-slug}.jpg
excerpt: One or two sentences shown on cards and in RSS.
---
```

Check:

- All required fields present: `title`, `author`, `tags`, `date`, `draft`, `excerpt`.
- `date` is a valid ISO 8601 string.
- `excerpt` is concise (1-2 sentences) — it appears on post cards and in the RSS feed.
- `image` path (if present) points to an existing file in `src/content/posts/img/`.
- File numbering is sequential (check surrounding files for gaps or collisions).

## 2. Tagging review

This is the most important part of the review. Tags drive post card display, related-post discovery, and package page links.

### Tag structure

Tags are ordered in three tiers:

1. **Category tag** (first in the array) — displayed on post cards and the post header.
2. **Thematic tags** — cross-cutting topics that drive related-post discovery.
3. **Package tags** — `@furystack/*` package short names linking from the packages page.

### Category tags (exactly one, must be first)

| Tag               | Use when the post...                                            |
| ----------------- | --------------------------------------------------------------- |
| `Getting Started` | is a tutorial teaching how to use a feature                     |
| `Announcement`    | is news, an introduction, or a site/project update              |
| `Architecture`    | covers design decisions, refactoring, or internals              |
| `Frontend`        | is about the Shades UI library, components, routing, or theming |

### Thematic tags (at least one, all that apply)

| Tag                    | Use when the post...                                   |
| ---------------------- | ------------------------------------------------------ |
| `tutorial`             | walks through steps to achieve something               |
| `refactoring`          | describes code or API refactoring                      |
| `breaking-changes`     | covers breaking API changes                            |
| `dependency-injection` | discusses DI / IoC patterns                            |
| `data-storage`         | is about stores, repositories, or the data layer       |
| `rest-api`             | covers REST API design, implementation, or consumption |
| `ui-components`        | is about UI components, theming, or layout             |
| `showcase`             | relates to the Shades Showcase App                     |
| `routing`              | covers client-side routing                             |
| `migration`            | is a migration story or upgrade guide                  |
| `site`                 | is about this blog or the FuryStack website itself     |
| `validation`           | covers data validation or schema enforcement           |

### Package tags (for each relevant `@furystack/*` package)

Use the npm short name (e.g. `inject`, `shades`, `rest`, `core`, `repository`).
Only tag packages that are a **primary focus** of the post.

### Tag checklist

- [ ] Exactly one category tag, placed first
- [ ] At least one thematic tag
- [ ] Package tags for primary packages discussed (if any)
- [ ] All tags have entries in `src/data/tags.yaml` — if not, flag as missing
- [ ] Tag order is: category, then thematic, then package

If a new thematic tag is warranted, suggest it along with a description for `src/data/tags.yaml`.

## 3. Content review

- `##` should be the top heading level (the `title` field renders as `<h1>`).
- Links to other posts use relative paths: `/posts/{slug}/`.
- Code examples have language tags on fenced blocks.
- No broken links to GitHub or internal pages.
- Tone matches existing posts: informal, direct, first person, occasional humor.

## 4. Review output format

```
## Tagging
- ...issues or suggestions...

## Frontmatter
- ...issues or suggestions...

## Content
- ...issues or suggestions...

## Summary
[One-line verdict: ready to publish / needs changes]
```

Omit sections with no issues. Always include the Summary.
