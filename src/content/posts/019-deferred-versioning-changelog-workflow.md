---
title: 'Deferred Gratification: Changelog Edition'
author: [gallayl]
tags: ['Architecture', 'tooling', 'site']
date: '2026-04-20T18:00:00.000Z'
draft: false
image: img/019-changelogs.webp
excerpt: "How FuryStack turns Yarn deferred versioning into changelog entries without guessing, vibes, or heroic memory."
---

At some point in every monorepo, you ask a simple question: _"What changed in this release?"_ Then everyone stares at each other, opens 17 tabs, and starts reconstructing history like a low-budget detective show.

I decided to stop doing that.

This post is about how changelog generation works in FuryStack, with **Yarn deferred versioning** doing the heavy lifting and a custom plugin making sure I don't "forget" release notes for three weeks.

## Why deferred versioning exists (and why your future self loves it)

Yarn's deferred versioning is basically this idea:

- You don't bump package versions immediately while coding.
- You record _intent_ in a version manifest.
- You apply everything later, in one controlled step.

So instead of manually editing 12 `package.json` files and pretending you'll remember why each bump happened, you run:

```bash
yarn version check --interactive
```

That creates files in `.yarn/versions/` describing which workspaces should get `patch`, `minor`, or `major` bumps.

Think of these files as release receipts. Small, boring, and incredibly useful when CI asks uncomfortable questions.

## The FuryStack twist: changelog drafts from version manifests

In FuryStack, version manifests are not the end of the story. They're the beginning.

I use `@furystack/yarn-plugin-changelog`, which reads `.yarn/versions/*.yml` and generates draft changelog files:

```bash
yarn changelog create
```

Those drafts land in `.yarn/changelogs/` and include sensible markdown sections like:

- Breaking changes
- Features
- Bug fixes
- Docs
- CI
- Dependencies
- Chores

In other words: no blank page syndrome, no "what section should this go in?" decision paralysis, no freestyle release poetry at 2 AM.

## The practical flow (the one I actually use)

This is the normal FuryStack release prep cycle:

1. Make code changes
2. Create deferred version entries
3. Generate changelog drafts
4. Fill the drafts like a civilized human
5. Validate in CI and locally
6. Apply versions and changelogs in one go

Translated to commands:

```bash
# pick package bumps interactively
yarn version check --interactive

# generate markdown drafts from manifests
yarn changelog create

# validate changelog completeness and version-type matching
yarn changelog check

# apply versions + merge changelogs into package CHANGELOG.md files
yarn version apply --all
yarn changelog apply
```

Or, if you prefer one button for the final step, FuryStack has:

```bash
yarn applyReleaseChanges
```

That script applies versions, applies changelogs, and runs Prettier. Because if you're going to automate release prep, you might as well automate cleanup too.

## What CI enforces (aka "trust, but verify")

Two checks keep the process honest:

- `yarn version check` in the version workflow
- `yarn changelog check` in the changelog workflow

The changelog check verifies things like:

- Every versioned package has a changelog draft
- The draft version type matches the manifest (`patch`/`minor`/`major`)
- Required sections are filled (especially for majors)
- At least one section has real content (not just placeholders)

So yes, CI will absolutely reject your PR if your changelog says "TBD" everywhere. As it should.

## Why this beats "just write changelogs manually"

Manual changelog writing sounds fine until:

- multiple packages change in one PR,
- version bumps drift from actual intent,
- people forget to update files,
- release day becomes archaeology.

Deferred versioning makes release intent explicit early. Generated drafts turn that intent into structured notes. CI ensures both stay aligned.

It's not flashy. It _is_ reliable. And reliable tooling is way cooler than debugging release mistakes on Friday night.

## A tiny mental model

If you only remember one thing, remember this pipeline:

**Manifest = what changed in versioning terms**  
**Draft = what changed in human terms**  
**Apply = write both into the repo reality**

That's the whole trick.

No magic, no AI-generated changelog fan fiction, no heroic memory required.

Just deferred versioning, some opinionated tooling, and fewer release surprises.

You're welcome, future you.
