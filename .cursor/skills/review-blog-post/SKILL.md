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
- `image` path (if present) is noted for asset verification (see section 3).
- `tags` are noted for tag existence verification (see section 4).
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

## 3. Asset verification

Verify that all referenced assets exist:

- If `image` is set in the frontmatter, check that the file exists at `src/content/posts/img/{filename}`.
- Check for any other image references in the Markdown body (e.g. `![alt](img/...)`) and verify those files exist too.
- Flag missing assets as **Critical** — the build will break or produce broken images.

## 4. Tag existence verification

Read `src/data/tags.yaml` and verify **every** tag listed in the post's `tags` frontmatter field exists in that file.

- Compare each tag against the `id` values in `tags.yaml`.
- Flag any tag that does not have a matching entry — it will not render correctly on the site.
- If a missing tag seems intentional (new topic), suggest adding it to `tags.yaml` with an appropriate description.

## 5. Implementation accuracy check

Cross-reference code examples and API descriptions in the post against the actual FuryStack / Shades codebase (in the `furystack` workspace).

Check for:

- **Class / function names** — do they exist and are they spelled correctly?
- **Function signatures** — do parameters, return types, and generics match the current implementation?
- **Import paths** — are `@furystack/*` package imports valid?
- **Hook / render API** — does the Shades `render` destructuring (`useObservable`, `useDisposable`, `useHostProps`, `useRef`, `injector`, `props`, etc.) match the current `ShadeOptions` API?
- **Removed or renamed APIs** — flag any references to APIs that no longer exist (e.g. `element` in render, `onAttach`/`onDetach` callbacks).
- **Constructor / decorator patterns** — verify `@Injectable`, `@Injected`, `Injector` usage matches the current DI API.
- **Behavioral claims** — if the post states how something works (e.g. "the cache invalidates after 5 minutes"), spot-check against the source code.

Use the `furystack` workspace to look up actual source files. Focus on packages mentioned in the post's package tags, but also check any `@furystack/*` import that appears in code blocks.

## 6. Content review

- `##` should be the top heading level (the `title` field renders as `<h1>`).
- Links to other posts use relative paths: `/posts/{slug}/`.
- Code examples have language tags on fenced blocks.
- No broken links to GitHub or internal pages.
- Tone matches existing posts: informal, direct, first person, occasional humor.

## 7. Review output format

**1. Summary:** Brief overview of the post and one-line verdict (ready to publish / needs changes).

**2. Issues by Priority:**

- 💀 **Critical:** Must fix before publish (missing assets, broken builds, incorrect API usage)
- 🔥 **High:** Should fix before publish (wrong code examples, outdated API references, missing tags)
- 🤔 **Medium:** Consider addressing (tone inconsistencies, missing thematic tags, minor inaccuracies)
- 💚 **Low:** Nice to have (style suggestions, tag ordering, wording tweaks)

For each issue, be specific: section/line, what's wrong, and how to fix it.

**3. Tag Review:** List the post's tags and confirm each exists in `tags.yaml`. Flag missing or misordered tags.

**4. Implementation Accuracy:** List any code examples or API references that don't match the current FuryStack source. Include the relevant source file path for reference.

Omit sections with no issues. Always include the Summary.
