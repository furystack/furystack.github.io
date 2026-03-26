---
title: 'Routing, But Make It Nested'
author: [gallayl]
tags:
  [
    'Frontend',
    'routing',
    'ui-components',
    'shades',
    'shades-common-components',
    'shades-showcase-app',
  ]
date: '2026-03-12T12:00:00.000Z'
draft: false
image: img/015-nested-router.jpg
excerpt: The old flat Router served us well, but it's time to talk about its successor — NestedRouter brings hierarchical routes, type-safe links, automatic breadcrumbs, navigation trees, and view transitions to Shades.
---

At the end of the [VNode refactor post](/posts/013-shades-vnode-refactor/), we dropped a teaser: _"Stay tuned for a dedicated post on the NestedRouter."_ Well, here we are. Buckle up — this one's got type-level wizardry, recursive route matching, and enough generic parameters to make your IDE's IntelliSense break a sweat.

## The old Router: flat, simple, and... flat

The original `Router` component did one job: match a URL against a flat list of routes, render the first hit. It looked like this:

```typescript
const routes: Route[] = [
  { url: '/users', component: () => <UserList /> },
  { url: '/users/:id', component: ({ match }) => <UserDetail id={match.params.id} /> },
  { url: '/settings', component: () => <Settings /> },
]

<Router routes={routes} notFound={<NotFound />} />
```

Clean. Readable. _Completely incapable of expressing layouts._

Want a persistent sidebar that stays mounted while child pages swap? Tough luck — every route renders from scratch. Want breadcrumbs that actually know the route hierarchy? You're hand-rolling that yourself. Want your navigation sidebar to auto-generate from the route definitions? Write a separate data structure and keep it in sync manually. _Fun._

The `Router` is now officially **deprecated**. It still works (we're not monsters), but new code should reach for its successor.

## Enter the NestedRouter

The `NestedRouter` flips the model. Routes are no longer a flat array — they're a **tree**. Each route is a Record entry where keys are URL patterns, and routes can have `children`. The killer feature: parent routes receive an `outlet` prop containing their matched child's rendered content.

```typescript
const routes = {
  '/': {
    component: ({ outlet }) => (
      <AppLayout sidebar={<Sidebar />}>
        {outlet ?? <HomePage />}
      </AppLayout>
    ),
    children: {
      '/users': {
        component: ({ outlet }) => outlet ?? <UserList />,
        children: {
          '/:id': {
            component: ({ match }) => <UserDetail id={match.params.id} />,
          },
        },
      },
      '/settings': {
        component: () => <Settings />,
      },
    },
  },
} satisfies Record<string, NestedRoute<any>>
```

When the user navigates to `/users/42`:

1. The `/` route matches as a prefix — its component renders `AppLayout` with the `outlet`
2. `/users` matches as a prefix — it passes through its `outlet`
3. `/:id` matches as a leaf — it renders `UserDetail` with `id: '42'`

The result is composed inside-out: `UserDetail` → `outlet` of `/users` → `outlet` of `/`. The `AppLayout` stays mounted, the sidebar doesn't re-render, and the only thing that swaps is the innermost content. Exactly like a good layout system should work.

## The match chain: how the sausage is made

Under the hood, `buildMatchChain()` walks the route tree recursively. For routes with children, it first tries a prefix match (so `/users` can match `/users/42`), then recurses into children with the remaining URL. For leaf routes, it does an exact match. The result is a `MatchChainEntry[]` — an ordered list from outermost to innermost matched route.

When the URL changes, `findDivergenceIndex()` compares the old and new chains to figure out _exactly_ which levels changed. Only divergent routes fire their lifecycle hooks. Navigate from `/users/42` to `/users/99`? The `AppLayout` and `/users` wrapper don't even blink — only the `/:id` leaf gets its `onLeave`/`onVisit` treatment.

This is not just an optimization — it means parent routes can hold state, run animations, and manage resources without getting torn down every time a child changes.

## Type safety that earns its keep

Here's where things get spicy. The `NestedRouteLink` component does SPA navigation (intercepts clicks, calls `history.pushState`), but the generic version goes further.

### Route parameter inference

`ExtractRouteParams` is a recursive conditional type that pulls parameter names out of URL patterns:

```typescript
type Params = ExtractRouteParams<'/users/:id/posts/:postId'>;
// => { id: string; postId: string }

type NoParams = ExtractRouteParams<'/settings'>;
// => Record<string, never>
```

When you use `NestedRouteLink`, it knows:

```typescript
// ✅ No params needed — params is optional
<NestedRouteLink href="/settings">Settings</NestedRouteLink>

// ✅ Params required — TypeScript enforces it
<NestedRouteLink href="/users/:id" params={{ id: '42' }}>User 42</NestedRouteLink>

// ❌ TypeScript error: Property 'id' is missing
<NestedRouteLink href="/users/:id">Oops</NestedRouteLink>
```

### Route path validation

Want to go even further? `createNestedRouteLink` constrains `href` to only accept paths that actually exist in your route tree:

```typescript
const AppLink = createNestedRouteLink<typeof appRoutes>()

// ✅ Valid path from the route tree
<AppLink href="/settings">Settings</AppLink>

// ❌ TypeScript error: '/nonexistent' is not assignable
<AppLink href="/nonexistent">Nope</AppLink>
```

`ExtractRoutePaths` recursively walks the route tree type and produces a union of all valid full paths — including child routes concatenated with their parents. Typo in a route link? TypeScript catches it at compile time, not in a bug report from production.

The same pattern powers the `createAppBarLink` and `createBreadcrumb` factories in `shades-common-components`. One line of setup, and every link in your app is validated against the actual route definitions.

## Route metadata: teach your routes to introduce themselves

Every `NestedRoute` can carry a `meta` object with a `title` (static string or async resolver function). But `NestedRouteMeta` is an **interface**, not a type — and that's deliberate. Declaration merging lets you extend it with your own fields:

```typescript
declare module '@furystack/shades' {
  interface NestedRouteMeta {
    icon?: IconDefinition;
    hidden?: boolean;
  }
}
```

Now every route in your app can carry an icon, a visibility flag, or whatever your navigation components need — and it's all type-checked.

The showcase app uses this to attach icons to category routes:

```typescript
'/inputs-and-forms': {
  meta: { title: 'Inputs & Forms', icon: icons.fileText },
  component: ({ outlet }) => outlet ?? <Navigate to="/inputs-and-forms/buttons" />,
  children: { /* ... */ },
},
```

## Breadcrumbs: know where you are

The `RouteMatchService` exposes the current match chain as an `ObservableValue`. Subscribe to it, and you always know the full path of matched routes from root to leaf.

`resolveRouteTitles()` takes a match chain and an injector, resolves all titles (including async ones) in parallel, and hands you an array of display-friendly strings. Combine that with `buildDocumentTitle()`:

```typescript
buildDocumentTitle(['Media', 'Movies', 'Superman'], { prefix: 'My App', separator: ' / ' });
// => 'My App / Media / Movies / Superman'
```

The `Breadcrumb` component in `shades-common-components` wires all of this together. And yes, it gets the `createBreadcrumb<typeof appRoutes>()` treatment too — every breadcrumb link is validated against your route tree. Here's how the showcase app uses it:

```typescript
const ShowcaseBreadcrumbItem = createBreadcrumb<typeof appRoutes>()

// In the render function:
<ShowcaseBreadcrumbItem
  homeItem={{ path: '/', label: <Icon icon={icons.home} size="small" /> }}
  items={resolvedItems}
  separator=" › "
/>
```

No manual breadcrumb configuration. Add a new nested route with a title, and the breadcrumbs just... work. It's almost suspicious how well it works.

## Navigation trees: routes as data

Sometimes you need the route hierarchy as a data structure — for sidebar navigation, sitemaps, or mega-menus. `extractNavTree()` walks your route definitions and returns a `NavTreeNode[]` tree:

```typescript
import { extractNavTree } from '@furystack/shades';

const navTree = extractNavTree(appRoutes['/'].children, '/');
```

Each node has `pattern`, `fullPath`, `meta`, and optional `children`. The showcase app uses this to auto-generate its entire sidebar navigation:

```typescript
const getCategoryNodes = (): NavTreeNode[] => extractNavTree(appRoutes['/'].children, '/');
```

Those nodes feed into `SidebarCategory` and `SidebarPageLink` components. New route? New sidebar entry. Delete a route? Gone from the sidebar. The navigation is always a perfect mirror of the route tree because it _is_ the route tree.

## View transitions: because teleporting is jarring

The `NestedRouter` supports the native View Transition API. Enable it globally or per-route:

```typescript
// Global — all route changes get transitions
<NestedRouter routes={appRoutes} viewTransition />

// Per-route — only this route animates
'/fancy-page': {
  viewTransition: { types: ['slide-left'] },
  component: () => <FancyPage />,
}

// Opt out — disable for a specific route even when global is on
'/instant-page': {
  viewTransition: false,
  component: () => <InstantPage />,
}
```

`resolveViewTransition()` merges the router-level default with the leaf route's override. A per-route `false` wins over a global `true`, and custom `types` let you drive CSS `view-transition-name` styling for directional animations. The transition wraps the DOM update — `onLeave` fires before, `onVisit` fires after, and the browser handles the crossfade in between.

## The old vs. the new: a side-by-side

|                         | Old `Router`         | New `NestedRouter`                              |
| ----------------------- | -------------------- | ----------------------------------------------- |
| **Route structure**     | Flat array           | Nested Record with `children`                   |
| **Layouts**             | Re-render everything | Parent `outlet` pattern — persistent layouts    |
| **Type-safe links**     | Nope                 | `createNestedRouteLink<typeof routes>()`        |
| **Route metadata**      | Nope                 | `meta` with declaration merging                 |
| **Breadcrumbs**         | DIY                  | `RouteMatchService` + `resolveRouteTitles()`    |
| **Nav tree extraction** | DIY                  | `extractNavTree()`                              |
| **View Transitions**    | Nope                 | Built-in, per-route configurable                |
| **Lifecycle scoping**   | Per matched route    | Per chain level — parents survive child changes |

## Migrating from Router to NestedRouter

If you're using the old `Router`, migration is straightforward:

1. Convert your flat `Route[]` array into a nested `Record<string, NestedRoute<any>>` object
2. Move the `url` field to the Record key
3. Wrap shared layouts in parent routes that render `outlet`
4. Replace `RouteLink` / `LinkToRoute` with `NestedRouteLink`
5. Optionally add `meta` for breadcrumbs and navigation

The old components aren't going anywhere immediately (deprecated ≠ deleted), but the new system is strictly better in every dimension. There's no reason to start new code with the flat router.

## What's next

Routing was just one piece of a busy stretch. A few other topics deserve their own deep dives — stay tuned for posts on the **19-theme system** with scoped theming and Monaco integration, the new **Entity Sync** packages bringing real-time WebSocket subscriptions with optimistic updates to the data layer, the custom **changelog tooling** that validates entries in CI and can auto-generate drafts, and the **ESLint plugin** that now ships 19 FuryStack-specific rules with auto-fixers. Plenty to unpack.

Want to see NestedRouter in action right now? The [Showcase App](https://shades-showcase.netlify.app/) runs entirely on it — 60+ pages, nested layouts, auto-generated navigation, the works. The source is in [`packages/shades-showcase-app`](https://github.com/furystack/furystack/tree/develop/packages/shades-showcase-app), and the router itself lives in [`packages/shades/src/components/nested-router.tsx`](https://github.com/furystack/furystack/blob/develop/packages/shades/src/components/nested-router.tsx).

Go nest some routes. Your flat router will understand. Eventually.
