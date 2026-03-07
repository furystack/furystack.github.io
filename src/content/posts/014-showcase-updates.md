---
title: 'The Showcase Strikes Back'
author: [gallayl]
tags: ['shades', 'shades-common-components', 'shades-showcase-app']
date: '2026-03-07T12:00:00.000Z'
draft: false
image: img/014-showcase-updates.jpg
excerpt: The Shades Showcase App went from a humble component demo to a 60+ page, 19-theme, fully-routed component museum — and it only took two months.
---

Remember [the last time](/posts/010-showcase-app/) we talked about the Showcase App? It had a grid, a joystick wrapper, a Monaco editor page, some inputs, some buttons, and a light/dark theme switch. Cute. Charming. A solid proof of concept.

Well, we cranked the dial to 11. Then past 11. Somewhere around the _Neon Runner_ theme we lost count entirely.

Over the last two months the Showcase App has mutated from a modest demo into a full-blown **component museum** — 60+ pages, 19 themes, a proper layout system, breadcrumb navigation, and a routing engine that actually knows where it is. Let's break down the highlights.

## The engine swap nobody saw

None of this would have landed smoothly without the [VNode refactor](/posts/013-shades-vnode-refactor/) that shipped in Shades v12. The old "build real DOM, diff it, throw it away" approach was like cooking dinner just to take a photo and order takeout instead. The new VNode reconciler diffs lightweight descriptor objects and only touches the DOM where something actually changed.

The showcase was the first real stress test for this engine — dozens of components, nested routers, lazy-loaded pages — and it held up beautifully. Batched microtask updates mean we can hammer state changes without the UI turning into a slideshow.

## From 7 pages to 60+ (we may have a problem)

The old showcase had a handful of demo pages tucked behind a flat sidebar. The new one? Categories. Subcategories. A proper taxonomy of UI components:

| Category           | What lives here                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Data Display**   | Accordion, Avatar, Badge, Breadcrumb, Carousel, Chip, Grid, Icons, Image, List, Timeline, Tooltip, Tree, Typography, CacheView |
| **Inputs & Forms** | Buttons, ButtonGroup, Checkboxes, Form, Inputs, InputNumber, Radio, Rating, Select, Slider, Switch                             |
| **Navigation**     | CommandPalette, ContextMenu, Dropdown, Menu, Pagination, Suggest, Tabs, ViewTransitions                                        |
| **Feedback**       | Alert, Notifications, Progress, Result                                                                                         |
| **Surfaces**       | Card, Dialog, FAB, Wizard                                                                                                      |
| **Layout**         | Divider, Layout Showcase                                                                                                       |
| **Layout Tests**   | AppBar Only, AppBar + Drawers (left, right, both), Auto-hide AppBar, Collapsible Drawer, Temporary Drawer, Responsive Layout   |
| **Integrations**   | Monaco Editor, Markdown, NippleJS, Lottie, i18n, Micro-frontends                                                               |
| **Utilities**      | SearchState, StoredState                                                                                                       |
| **Themes**         | Runtime theme switcher with 19 lazy-loaded themes                                                                              |

Each page is lazy-loaded, so the initial bundle isn't carrying the weight of all those components on its back. You only pay for what you visit.

## 19 themes walk into a bar

The old light/dark toggle was respectable. Functional. _Boring_.

Now there's a theme dropdown with **19 options**, and they're not just "blue but slightly different blue." They're _themed_ themes, each with its own iconic quote:

- **Paladin** — _"Cheat Enabled, You Wascally Wabbit!"_
- **Chieftain** — _"It is a good day to die!"_
- **Dragonborn** — _"Fus Ro Dah!"_
- **Neon Runner** — _"Wake up, Samurai. We have a city to burn."_
- **Vault Dweller** — _"War. War never changes."_
- **Shadow Broker** — _"I'm the Shadow Broker. I know everything."_
- **Black Mesa** — _"Rise and shine, Mr. Freeman. Rise and shine."_
- **Wild Hunt** — _"Wind's howling."_
- **Plumber** — _"It's-a me, Mario!"_
- **Auditore** — _"Nothing is true, everything is permitted."_
- **Architect** — _"There is no spoon."_
- **Sandworm** — _"The spice must flow."_
- **Replicant** — _"All those moments will be lost in time, like tears in rain."_
- **Jedi** vs **Sith** — because you have to pick a side
- **Xenomorph** — _"In space, no one can hear you scream."_
- **Hawkins** — _"Friends don't lie."_

Every theme is lazy-loaded — switch to _Plumber_ and the Mario-inspired palette lands on demand. The Monaco editor even picks up the theme colors, so your code editor matches your aesthetic choices. Questionable taste has never been so well-supported.

But here's the real party trick: themes can **nest**. The `ThemeProviderService` supports scoping, so any subtree of your component hierarchy can run its own theme independently of the rest of the app. The Themes page in the showcase shows this off — multiple theme previews rendered side by side, each one living in its own scoped provider. Jedi on the left, Sith on the right, no conflict, no cross-contamination. It's themes all the way down.

## The routing glow-up

The old showcase used a basic flat router. Click a link, swap a page, call it a day. The new **NestedRouter** system is a different beast entirely:

**Route metadata** — every route can carry a `title` and an `icon`. The sidebar, breadcrumbs, and page titles all derive from this metadata automatically. Add a new page, give it a title, and the navigation updates itself. No manual sidebar entries to maintain.

**Breadcrumbs** — the `extractNavTree()` utility walks the route tree and resolves display-friendly breadcrumbs. You always know where you are, even three levels deep into the Layout Tests section.

**Sidebar navigation** — auto-generated from the route tree. Collapsible categories, active-state highlighting, the works.

**View Transitions** — the native View Transition API is wired into both the router and `LazyLoad`. Page switches get smooth crossfade animations for free. Tabs, Wizards, and CacheView also picked up transition support, so content swaps don't just _happen_ — they _flow_.

## The greatest hits reel

A few more things that landed and deserve a shout-out:

**Icons overhaul** — 41 new SVG icons joined the party, with an auto-discovery gallery page. No more hunting through source files to find the icon you vaguely remember existing.

**Markdown integration** — `MarkdownDisplay`, `MarkdownInput`, and `MarkdownEditor` components. Write markdown, preview markdown, edit markdown. The showcase has a full demo page for it.

**Typed DataGrid filters** — the grid now supports typed column filters: string, number, boolean, enum, and date. The showcase's GameItem grid demo shows them off with a randomly generated dataset. Filter by rarity, sort by damage — you know, _important_ data.

**CacheView** — a dedicated showcase page for the `CacheView` component that handles loading/loaded/error/offline states. It's the "I don't want to write the same loading spinner boilerplate for the 47th time" component.

**Layout system** — `AppBar`, `Drawer`, `LayoutService` with 8 layout test pages covering every combination: left drawer, right drawer, both drawers, collapsible drawers, temporary drawers, auto-hiding app bars, responsive breakpoints. It's a layout playground.

**ESLint plugin** — `@furystack/eslint-plugin` shipped with FuryStack-specific rules covering DI consistency, observable disposal, Shades rendering patterns, and REST actions. The showcase (and the entire monorepo) runs clean against it.

## What's next

The showcase is now the de facto testing ground for everything Shades. New components get a demo page before they get a README. The theme system is begging for a theme _builder_. And the NestedRouter just shipped **nested layouts** — routes can now define persistent layout wrappers that survive child navigation without re-mounting.

Want to poke around? The showcase is still deployed at [shades-showcase.netlify.app](https://shades-showcase.netlify.app/), and the source lives in the [`packages/shades-showcase-app`](https://github.com/furystack/furystack/tree/develop/packages/shades-showcase-app) directory of the monorepo.

Go pick a theme. I recommend _Chieftain_ — pure Warcraft 1 nostalgia, straight from the early '90s RTS trenches. It is, indeed, a good day to die.
