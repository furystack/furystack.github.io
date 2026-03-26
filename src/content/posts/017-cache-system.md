---
title: 'Cache Me If You Can'
author: [gallayl]
tags: ['cache', 'shades-common-components', 'shades-showcase-app']
date: '2026-03-26T12:00:00.000Z'
draft: false
image: img/017-cache-system.jpg
excerpt: "FuryStack's @furystack/cache isn't your grandmother's memoization wrapper — it's a full state machine with observable entries, stale/cache timers, capacity eviction, and a UI component that renders it all for you."
---

Every developer eventually arrives at the same crossroads: you have an expensive async operation — a network call, a database query, a function that grinds through 10,000 rows of data — and you need to not do it _every single time_ someone asks. You need a cache.

"Easy," you say. "I'll use a `Map`." And then you realize you need to track loading state. And error state. And stale state. And you want to observe changes reactively. And maybe evict old entries. And probably not fire 47 parallel requests for the same resource when 47 components mount at once. Congratulations, your `Map` has evolved into a state machine, and you've just re-invented `@furystack/cache` — except worse, because yours doesn't have tests.

Let's look at the one that does.

## The Cache class: what it actually does

At its core, `Cache<TData, TArgs>` wraps a `load` function — the thing that fetches your data — and layers a bunch of useful behavior on top. Here's the minimal setup:

```typescript
import { Cache } from '@furystack/cache';

const userCache = new Cache({
  load: async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  },
});

const user = await userCache.get('user-42'); // fetches from API
const sameUser = await userCache.get('user-42'); // returns cached value, no network call
```

That's it. One `load` function, and you get deduplication and caching for free. But the `Cache` constructor takes more than just `load`. Let's talk options.

## The settings: dials you can actually turn

The `CacheSettings` interface gives you four things to configure:

```typescript
const cache = new Cache({
  load: (...args) => fetchSomething(...args), // required — the data fetcher
  capacity: 100, // max entries before LRU eviction kicks in
  staleTimeMs: 30_000, // mark entries as "obsolete" after 30 seconds
  cacheTimeMs: 300_000, // hard-remove entries after 5 minutes
});
```

### `load` — the only required option

Your async function that fetches the actual data. It receives the same arguments you pass to `cache.get()`. The type system carries the argument types all the way through — `Cache<User, [string]>` means `load` receives a `string`, and `get()` expects a `string`. No guessing, no runtime surprises.

### `capacity` — the bouncer at the door

When the cache exceeds this many entries, the _oldest_ one gets evicted. It's a simple LRU strategy: every time you access an entry, it moves to the back of the line. The wallflower who hasn't been touched in a while? Bounced.

```typescript
const cache = new Cache({
  load: async (id: string) => fetchUser(id),
  capacity: 2,
});

await cache.get('alice'); // cached
await cache.get('bob'); // cached
await cache.get('charlie'); // cached — alice gets evicted
await cache.get('alice'); // re-fetched from source
```

This is particularly useful for frontend scenarios where you're caching individual entities (user profiles, product details, etc.) and don't want memory to grow unbounded as users click around. Set a reasonable capacity, and the cache manages itself.

### `staleTimeMs` — the "best before" label

After this many milliseconds, a loaded entry gets marked as `obsolete`. It's not _removed_ — the stale value is still there, still usable — but any subscriber watching it will know the data is getting long in the tooth. This is the foundation for stale-while-revalidate patterns: show the old data immediately, kick off a background refresh, swap in the fresh data when it arrives. Users see content instantly; freshness catches up.

### `cacheTimeMs` — the guillotine

After this many milliseconds, the entry is straight-up _removed_ from the cache. Gone. Next `get()` call will trigger a fresh `load()`. This is your hard TTL. Use it for data that genuinely changes over time and where serving a 10-minute-old value would be actively wrong (auth tokens, real-time dashboards, stock prices if you're brave enough to build a trading app in TypeScript).

The two timers compose naturally: set `staleTimeMs: 30_000` and `cacheTimeMs: 300_000`, and you get entries that start revalidating after 30 seconds but don't disappear entirely until 5 minutes have passed. During that window, stale-but-present data is available for instant display while the refresh happens in the background.

## The state machine: four states to rule them all

Every cache entry is in exactly one of four states, modeled as a discriminated union:

```typescript
type CacheResult<T> =
  | { status: 'loading'; value?: T; updatedAt: Date }
  | { status: 'loaded'; value: T; updatedAt: Date }
  | { status: 'obsolete'; value: T; updatedAt: Date }
  | { status: 'failed'; value?: T; error: unknown; updatedAt: Date };
```

Notice a few things:

1. **`loading` can have a value** — if you're reloading an entry that was previously loaded, the old value sticks around during the reload. No content flashing. No "loading spinner replaces perfectly good data."
2. **`failed` can also have a value** — the last known good value survives a failed reload. Your UI can decide whether to show the error or keep displaying stale data with a warning badge.
3. **Every state carries `updatedAt`** — so you always know _when_ this state was set. Useful for debugging, useful for "last updated 3 minutes ago" labels.

The package ships type guards for each state, so you can narrow the union cleanly:

```typescript
import {
  isLoadedCacheResult,
  isPendingCacheResult,
  isFailedCacheResult,
  isObsoleteCacheResult,
  hasCacheValue,
} from '@furystack/cache';

const result = observable.getValue();

if (isFailedCacheResult(result)) {
  console.error('Load failed:', result.error);
} else if (hasCacheValue(result)) {
  console.log('Got a value:', result.value);
  if (isObsoleteCacheResult(result)) {
    console.log('...but it is stale, a refresh would be nice');
  }
}
```

`hasCacheValue` is the "do I have _something_ to show?" guard. It returns true for `loaded`, `obsolete`, and even `loading`/`failed` when they carry a previous value. It's the "just give me data, I don't care about your existential crisis" check.

## Observability: subscribe to the drama

The `get()` method returns a plain `Promise<TData>` — great for one-shot fetches. But the real power is in `getObservable()`:

```typescript
const observable = cache.getObservable('user-42');

observable.subscribe(({ status, value, updatedAt }) => {
  console.log(`Status: ${status}, value:`, value);
});
```

This returns an `ObservableValue<CacheResult<T>>` that fires every time the entry's state changes. Loading? You hear about it. Loaded? You hear about it. Marked obsolete by a timer? Reload triggered? Error? You hear about _all of it_.

This is what makes the cache reactive rather than just a glorified `Map`. In a frontend context, your components can subscribe to cache entries and re-render automatically when data changes. In a service context, you can wire up logging, metrics, or downstream invalidation based on state transitions.

And here's the cherry on top: calling `getObservable()` on an entry that doesn't exist yet _automatically triggers a load_. You don't need to call `get()` first. Just subscribe, and the cache takes care of the rest. Lazy loading via subscription — because eagerness is overrated.

## Request deduplication: the silent hero

This is one of those features that's invisible until it saves your bacon. If three components call `cache.get('user-42')` simultaneously — before the first request has returned — the cache fires _one_ network request and resolves all three promises with the same result.

No thundering herd. No triple API bill. No backend engineer pinging you on Slack asking why they're seeing 47 identical requests per page load.

The implementation is refreshingly simple: pending `load` promises are stored in a `Map` keyed by the serialized arguments. If a load is already in flight for that key, the existing promise is returned instead of starting a new one. When the promise settles, it's cleaned up. Boring? Yes. Effective? Extremely.

## Invalidation: the hard part, made less hard

Cache invalidation is one of the two hard problems in computer science (the other being naming things and off-by-one errors). `@furystack/cache` gives you several tools:

### Surgical removal

```typescript
cache.remove('user-42'); // removes the specific entry
```

### Predicate-based removal

```typescript
cache.removeRange((user, args) => {
  return user.role === 'admin' || args[0].startsWith('temp-');
});
```

The callback receives both the cached value _and_ the original arguments. So you can filter by data content, by argument pattern, or both.

### Marking as obsolete (soft invalidation)

```typescript
cache.setObsolete('user-42'); // marks as stale, doesn't remove
```

This is the gentler option. The entry stays in the cache with its current value, but its status flips to `obsolete`. If anything is subscribed via `getObservable()`, it'll see the state change and can trigger a background reload. The user never sees a loading spinner — they see the old data until the fresh data arrives.

### Predicate-based obsolescence

```typescript
cache.obsoleteRange(user => user.lastLoginAt < oneHourAgo);
```

Same idea as `removeRange`, but marks entries as obsolete instead of nuking them. Perfect for "I know this data _might_ be stale, but I don't want to throw it away just yet."

### Nuclear option

```typescript
cache.flushAll(); // everything goes. scorched earth.
```

Use responsibly. Or irresponsibly. I'm a blog post, not a cop.

## Explicit state control: because sometimes _you_ know best

Sometimes the cache's `load` function isn't the only source of truth. Maybe you received updated data from a WebSocket push. Maybe the user just edited their own profile and you have the new data right there in the form submission response. Why re-fetch what you already have?

```typescript
cache.setExplicitValue({
  loadArgs: ['user-42'],
  value: {
    status: 'loaded',
    value: updatedUser,
    updatedAt: new Date(),
  },
});
```

This lets you inject any `CacheResult` directly into the cache. You can set it to `loaded` with fresh data, `failed` with a synthetic error, `loading` to show a spinner, or `obsolete` to trigger a re-fetch. Full control over the state machine, bypassing the `load` function entirely.

This is incredibly useful for optimistic updates: update the cache with the expected result _before_ the server confirms, and roll back to `failed` if the request doesn't pan out.

## Error handling: things will go wrong

When a `load()` call throws, the cache catches the error, sets the entry to `failed` state (preserving any previously loaded value), and re-throws so that `get()` and `reload()` callers can handle it in their own try/catch.

But what about `getObservable()`? That triggers a load in the background — there's no caller to catch the error. For that, the `Cache` extends `EventHub` and emits an `onLoadError` event:

```typescript
cache.addListener('onLoadError', ({ args, error }) => {
  logger.error(`Failed to load cache entry for args ${JSON.stringify(args)}:`, error);
});
```

Wire this up to your logging, your monitoring, your Slack webhook — whatever helps you sleep at night. The point is: errors don't silently vanish into the void.

## Service-level example: the API memoizer

Here's a realistic backend scenario. You have a service that resolves user permissions, and it's called _a lot_ — every request, every middleware check, every authorization decision. The underlying query hits a database.

```typescript
import { Cache } from '@furystack/cache';

const permissionCache = new Cache<string[], [string]>({
  load: async userId => {
    const permissions = await db.query(
      'SELECT permission FROM user_permissions WHERE user_id = ?',
      [userId],
    );
    return permissions.map(p => p.permission);
  },
  staleTimeMs: 60_000, // re-check permissions every minute
  cacheTimeMs: 600_000, // hard-expire after 10 minutes
  capacity: 1000, // keep up to 1000 users in cache
});

// In your authorization middleware:
const permissions = await permissionCache.get(currentUser.id);
if (!permissions.includes('admin:write')) {
  throw new ForbiddenError();
}

// When permissions are updated:
permissionCache.remove(updatedUserId);
// or, if you want a softer touch:
permissionCache.setObsolete(updatedUserId);
```

The first request for a user's permissions hits the database. Subsequent requests within 60 seconds get the cached result. After 60 seconds, the entry is marked obsolete — still usable, but the next access triggers a background refresh. After 10 minutes of no access, the entry is evicted entirely. And if you _know_ permissions changed (because an admin just edited them), you can surgically invalidate that specific user.

The capacity limit ensures you don't accidentally cache every user who's ever logged in. The LRU eviction ensures the most active users stay cached while inactive ones get cleaned up.

## Frontend-level example: the entity detail view

Now let's flip to the frontend. You have a list of items, and clicking one opens a detail view that fetches full data:

```typescript
import { Cache } from '@furystack/cache';
import { Injectable } from '@furystack/inject';

@Injectable({ lifetime: 'singleton' })
class ProductService {
  public readonly productCache = new Cache<Product, [string]>({
    load: async productId => {
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) throw new Error(`Failed to load product ${productId}`);
      return response.json();
    },
    staleTimeMs: 30_000,
    capacity: 50,
  });

  public invalidateProduct(productId: string) {
    this.productCache.setObsolete(productId);
  }

  public [Symbol.dispose]() {
    this.productCache[Symbol.dispose]();
  }
}
```

Register this as a singleton in your injector, and every component in your app shares the same cache. Navigate to a product detail page, and the data loads. Navigate back to the list, then to the same product again — instant render, no loading spinner. Navigate to a _different_ product, and the cache holds both. Hit the capacity limit, and the least recently viewed product gets evicted.

The `staleTimeMs` ensures that if a user sits on a product page for more than 30 seconds, the data gets a background refresh. The user sees the old data instantly while the fresh data loads behind the scenes. When it arrives, the observable fires, and the component re-renders with the update.

And because it's a singleton, if the user _edits_ the product from somewhere else in the app, you can call `invalidateProduct()` and every component observing that entry will see the state transition to `obsolete`, trigger a reload, and update. No prop drilling. No global state management library. Just a cache that knows what's stale.

## The CacheView component: let the UI handle itself

All of the above is great, but in a Shades application you'd still need to write the boilerplate: subscribe to the observable, check the state, render a spinner or error or content accordingly. That's repetitive enough that it earned its own component.

`CacheView` lives in `@furystack/shades-common-components` and it does _exactly_ what you think:

```tsx
import { CacheView } from '@furystack/shades-common-components';

<CacheView cache={productCache} args={[productId]} content={ProductDetail} />;
```

That's the entire integration. `CacheView` subscribes to `cache.getObservable(...args)`, and renders the right thing for each state:

1. **Failed?** → Shows an error UI with a retry button
2. **Has a value?** → Renders your `content` component with the data
3. **Loading with no value?** → Shows the loader (or nothing, by default)

The priority order is intentional. Errors take precedence — if the load failed, you want to see the error, not a stale value from a previous successful load. Values come next — if there's data, show it, even if it's marked as obsolete (and CacheView will trigger a background reload automatically). Loading is the fallback when there's truly nothing to show yet.

### Customizing the loader

By default, `CacheView` renders `null` during loading — no spinner, no skeleton, nothing. This is a deliberate choice: not every cache view needs a loading indicator, and showing one for cache hits that resolve in microseconds would just be visual noise.

But when you _do_ want a loader, you pass it:

```tsx
<CacheView
  cache={productCache}
  args={[productId]}
  content={ProductDetail}
  loader={
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Skeleton />
      <Skeleton />
      <Skeleton />
    </div>
  }
/>
```

Or a spinner:

```tsx
<CacheView
  cache={productCache}
  args={[productId]}
  content={ProductDetail}
  loader={
    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
      <Loader />
    </div>
  }
/>
```

Your loader, your rules. The cache just tells you _when_ to show it.

### Customizing the error UI

The default error UI is a `Result` component with an error status and a retry `Button`. Functional, but not always what you want. You can override it:

```tsx
<CacheView
  cache={productCache}
  args={[productId]}
  content={ProductDetail}
  error={(err, retry) => (
    <Alert severity="error" title="Failed to load product">
      <span>{String(err)}</span>
      <Button variant="outlined" color="error" size="small" onclick={retry}>
        Try again
      </Button>
    </Alert>
  )}
/>
```

The `retry` callback calls `cache.reload(...args)` — no need to wire that up yourself. Just call it and let the cache state machine do its thing.

### Passing extra props to the content component

Sometimes your content component needs more than just the cache data. Maybe it needs a label, an onEdit callback, or some configuration. `CacheView` supports this via `contentProps`:

```tsx
const ProductWithActions = Shade<{
  data: CacheWithValue<Product>
  onEdit: () => void
  showPrice: boolean
}>({
  customElementName: 'product-with-actions',
  render: ({ props }) => (
    <div>
      <h2>{props.data.value.name}</h2>
      {props.showPrice && <span>{props.data.value.price}</span>}
      <Button onclick={props.onEdit}>Edit</Button>
    </div>
  ),
})

<CacheView
  cache={productCache}
  args={[productId]}
  content={ProductWithActions}
  contentProps={{ onEdit: handleEdit, showPrice: true }}
/>
```

The `contentProps` are _type-checked_ against the content component's props (minus `data`, which CacheView provides). If your content component expects `{ data: CacheWithValue<Product>; label: string }`, then `contentProps` _must_ include `label: string`. TypeScript enforces this at compile time. No "oops, I forgot a prop" at runtime.

### View transitions

`CacheView` supports Shades' view transition system. When the cache state _category_ changes (loading → value, value → error, etc.), the transition fires:

```tsx
<CacheView cache={productCache} args={[productId]} content={ProductDetail} viewTransition={true} />
```

The transition only fires when the _category_ changes (error, value, or loading) — not on every state update. So a `loaded` → `obsolete` transition (both in the "value" category) won't trigger an animation, but `loading` → `loaded` will. Subtle, intentional, and exactly what you want for a polished UX.

## Putting it all together

Here's the full mental model:

1. **Create a `Cache`** with a `load` function and optional settings (capacity, stale time, cache time)
2. **Call `get()`** to fetch data — the cache handles deduplication, loading states, and error states
3. **Call `getObservable()`** to subscribe to state changes reactively
4. **Invalidate** with `remove()`, `setObsolete()`, `removeRange()`, `obsoleteRange()`, or the nuclear `flushAll()`
5. **In the UI**, use `CacheView` to bind a cache entry to a component with automatic loading, error, and content handling
6. **Inject** the cache as a singleton service to share it across your app

The cache doesn't try to be a global state manager. It doesn't care about your component tree. It doesn't have opinions about your data model. It's a focused tool that does one thing well: take an expensive async operation, wrap it in observable state management, and give you fine-grained control over when data is fresh, stale, or gone.

That's it. No ceremony, no boilerplate, no "please install these 7 peer dependencies and configure a provider hierarchy." Just a cache that respects your time — and your users'.

Want to see it in action? The [Showcase App](https://shades-showcase.netlify.app/) has an interactive CacheView demo where you can toggle between all four states and watch the component react in real time. The source lives in [`packages/cache`](https://github.com/furystack/furystack/tree/develop/packages/cache) and [`packages/shades-common-components/src/components/cache-view.tsx`](https://github.com/furystack/furystack/tree/develop/packages/shades-common-components/src/components/cache-view.tsx).

Now go cache something. Your API will thank you.
