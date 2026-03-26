---
title: 'The Server Will See You Now'
author: [gallayl]
tags:
  [
    'Architecture',
    'data-storage',
    'entity-sync',
    'entity-sync-client',
    'entity-sync-service',
    'websocket-api',
    'repository',
  ]
date: '2026-03-26T18:00:00.000Z'
draft: false
image: img/018-entity-sync.jpg
excerpt: "Polling is dead, long live push. FuryStack's entity sync system gives you real-time, server-pushed updates over WebSocket — with delta replay, reference counting, auto-reconnect, and a state machine that actually makes sense."
---

There comes a moment in every application's life where someone looks at the polling interval and says, "Can't we just... know when things change?" And then someone else says, "WebSockets?" And then everyone gets very quiet because they remember the _last_ time they tried to build real-time sync and it turned into a haunted house of race conditions, stale state, and a WebSocket connection that reconnects approximately never.

Good news: FuryStack's entity sync does the haunted house part so you don't have to.

## What even is entity sync?

At the highest level, entity sync is a system that lets your frontend **subscribe** to entities (or collections of entities) and receive **real-time updates** when those entities change on the server. No polling. No "refresh to see changes." No "eventually consistent if you squint hard enough." The server knows something changed, and it tells you. Immediately.

It's built on three packages:

- **`@furystack/entity-sync`** — The shared wire protocol types. No runtime code. Just TypeScript types that both sides agree on. Think of it as the treaty between client and server.
- **`@furystack/entity-sync-service`** — The server side. Listens to DataSet events, maintains a changelog, manages subscriptions, pushes changes.
- **`@furystack/entity-sync-client`** — The client side. Opens the WebSocket, subscribes to things, handles reconnection, manages local state, and gives you nice reactive observables to bind to your UI.

Three packages might sound like a lot for "push data to clients," but the separation is clean: shared types in the middle, server logic on the server, client logic on the client. No accidental `ws` imports in your browser bundle.

## The protocol: what's on the wire

Before we get into setup and APIs, let's look at what actually travels over the WebSocket. It's refreshingly simple.

### Client → Server

The client sends three types of messages:

```typescript
type ClientSyncMessage =
  | { type: 'subscribe-entity'; requestId: string; model: string; key: unknown; lastSeq?: number }
  | {
      type: 'subscribe-collection';
      requestId: string;
      model: string;
      filter?: FilterType<unknown>;
      top?: number;
      skip?: number;
      order?: Record<string, 'ASC' | 'DESC'>;
      lastSeq?: number;
    }
  | { type: 'unsubscribe'; subscriptionId: string };
```

Subscribe to a single entity by primary key. Subscribe to a filtered, paginated, sorted collection. Unsubscribe when you're done. That's the entire client vocabulary.

The `lastSeq` field is the secret sauce for delta sync (currently used only for entity subscriptions — collections always receive full snapshots). More on that shortly.

### Server → Client

The server has a slightly richer vocabulary:

```typescript
type ServerSyncMessage =
  | { type: 'subscribed'; mode: 'snapshot'; data: unknown; version: SyncVersion /* ... */ }
  | {
      type: 'subscribed';
      mode: 'delta';
      changes: SyncChangeEntry[];
      version: SyncVersion; /* ... */
    }
  | { type: 'entity-added'; entity: unknown; version: SyncVersion /* ... */ }
  | {
      type: 'entity-updated';
      id: unknown;
      change: Record<string, unknown>;
      version: SyncVersion; /* ... */
    }
  | { type: 'entity-removed'; id: unknown; version: SyncVersion /* ... */ }
  | {
      type: 'collection-snapshot';
      data: unknown[];
      totalCount: number;
      version: SyncVersion; /* ... */
    }
  | { type: 'subscription-error'; error: string /* ... */ };
```

When you subscribe, you get either a **snapshot** (here's all the data) or a **delta** (here's what changed since your `lastSeq`). After that, you get incremental `entity-added`, `entity-updated`, `entity-removed` messages as things happen. Collections get re-evaluated and sent as fresh snapshots when their contents change.

Every message carries a `SyncVersion` — a monotonically increasing sequence number plus a timestamp. This is how both sides track "where we are" in the stream of changes.

```typescript
type SyncVersion = {
  seq: number;
  timestamp: string;
};
```

No UUIDs, no vector clocks, no CRDTs. Just a counter that goes up. Sometimes the simplest solution is the right one.

## The state machine: five states of sync

On the client side, every subscription lives in one of five states:

```typescript
type SyncState<T> =
  | { status: 'connecting' }
  | { status: 'cached'; data: T }
  | { status: 'suspended'; data: T }
  | { status: 'synced'; data: T }
  | { status: 'error'; error: string };
```

Let's walk through them:

- **`connecting`** — The initial state. WebSocket handshake is happening, subscription request has been sent, no data yet. Show a spinner, show a skeleton, show a haiku about patience.
- **`cached`** — We have data from a local cache store, but we're not connected to the server (yet). The data might be stale, but it's _something_. This is the stale-while-revalidate sweet spot: show the user what you have while you work on getting something fresher. (If you plug in a `localStore`, this state can kick in _before_ the WebSocket even connects — see Local caching below.)
- **`synced`** — The happy state. We're connected, the data is live, changes are being pushed to us in real time. Life is good.
- **`suspended`** — Nobody is observing this subscription anymore, so we've told the server to stop pushing updates. The data is preserved locally in case someone subscribes again soon. It's like putting a conversation on hold — the data is still there, you just stopped listening.
- **`error`** — Something went wrong. The model isn't registered, the WebSocket died and won't come back, or the server rejected the subscription. The `error` field tells you why.

The transitions between these states are well-defined. `connecting → synced` is the happy path. `synced → cached` happens when the WebSocket drops (your data is still there, just no longer live). `synced → suspended` happens when no component is observing the subscription anymore. `suspended → cached → synced` happens when a component re-subscribes and the connection catches up.

It's a discriminated union, so TypeScript narrows the type for you. Check the `status`, and you know exactly which fields are available. No "is `data` defined? Is `error` a string or an object? Who knows!" Just pattern match and move on.

## Server setup: wiring up the push machine

Setting up entity sync on the server takes about as much code as you'd spend writing a TODO comment about how you should "add real-time updates later":

```typescript
import { Injector } from '@furystack/inject';
import { useWebsockets } from '@furystack/websocket-api';
import {
  SyncSubscribeAction,
  SyncUnsubscribeAction,
  useEntitySync,
} from '@furystack/entity-sync-service';

const injector = new Injector();

// ... set up your Repository and DataSets first ...

await useWebsockets(injector, {
  path: '/api/sync',
  actions: [SyncSubscribeAction, SyncUnsubscribeAction],
});

useEntitySync(injector, {
  models: [
    { model: User, primaryKey: 'id' },
    { model: ChatMessage, primaryKey: 'id', debounceMs: 100 },
    { model: Product, primaryKey: 'sku', changelogRetentionMs: 10 * 60 * 1000 },
  ],
});
```

That's it. `useWebsockets` sets up the WebSocket endpoint with the two built-in actions (subscribe and unsubscribe). `useEntitySync` registers your models with the `SubscriptionManager`, which hooks into the DataSet events and starts tracking changes.

### The SubscriptionManager: the brain behind the operation

The `SubscriptionManager` is a singleton that does the heavy lifting. When you register a model, it:

1. Resolves the model's `DataSet` from the `Repository`
2. Subscribes to `onEntityAdded`, `onEntityUpdated`, and `onEntityRemoved` events
3. Maintains a per-model **changelog** — a time-bounded list of recent changes, each tagged with a sequence number
4. When a client subscribes, it sends a snapshot (or a delta if the changelog covers the gap)
5. When entities change, it pushes incremental updates to all relevant subscribers

One important caveat worth tattooing on your forehead: **writes must go through the DataSet**. If you bypass the DataSet and write directly to the physical store, the `SubscriptionManager` won't see the change, and your clients won't get notified. The DataSet is the gatekeeper. Respect the gatekeeper.

### Tuning knobs

Each model registration accepts three optional settings:

**`debounceMs`** — If your entities change rapidly (think: a collaborative editor, a real-time dashboard, a chat with that one colleague who types at 200 WPM), you might not want to push every single change individually. Set a debounce window, and the server will batch notifications. For entity subscriptions, it queues messages and flushes after the debounce. For collection subscriptions, it re-evaluates the query once after the dust settles. Default is `0` (immediate).

**`changelogRetentionMs`** — How long the server keeps change entries in memory for delta sync. When a client reconnects with a `lastSeq`, the server checks if the changelog covers that sequence number. If yes, it sends only the changes since then instead of a full snapshot. Default is 5 minutes. Set it higher if your clients have flaky connections and you want to maximize delta hits. Set it lower if memory is tight and your data is large.

**`queryTtlMs`** — For collection subscriptions, the server re-runs the query every time an entity changes (to check whether the collection's contents changed). If your queries are expensive, you can cache the results. Default is `0` (no cache). Set it higher if you're okay with slightly stale collection updates in exchange for fewer database round-trips.

## Client setup: subscribing to reality

On the client side, you create an `EntitySyncService`, register your models, and start subscribing:

```typescript
import { EntitySyncService, createInMemoryCacheStore } from '@furystack/entity-sync-client';

const syncService = injector.setExplicitInstance(
  new EntitySyncService({
    wsUrl: 'ws://localhost:8080/api/sync',
    localStore: createInMemoryCacheStore(),
    suspendDelayMs: 2000,
  }),
);

syncService.registerModel(User);
syncService.registerModel(ChatMessage);
syncService.registerModel(Product);
```

The `wsUrl` points to your WebSocket endpoint. The `localStore` enables the stale-while-revalidate pattern (we'll get to that). `suspendDelayMs` controls how long the client waits before telling the server "nobody's listening anymore" after the last observer disposes.

### Subscribing to an entity

```typescript
using liveEntity = syncService.subscribeEntity(User, 'user-42');

liveEntity.state.subscribe(state => {
  if (state.status === 'synced') {
    console.log('User data:', state.data);
  }
});
```

`subscribeEntity` returns a `LiveEntity<T>` — a disposable handle with a `state` observable. The `state` is an `ObservableValue<SyncState<T | undefined>>` (the entity can be `undefined` if it was deleted), so you can subscribe to it and react to every state transition.

Notice the `using` keyword — when the `LiveEntity` goes out of scope, it's automatically disposed. The client decrements the reference count, and if nobody else is subscribed to the same entity, a suspend timer starts ticking.

### Subscribing to a collection

```typescript
using liveCollection = syncService.subscribeCollection(ChatMessage, {
  filter: { roomId: { $eq: 'room-42' } },
  order: { createdAt: 'DESC' },
  top: 50,
});

liveCollection.state.subscribe(state => {
  if (state.status === 'synced') {
    console.log(`${state.data.count} messages total`);
    console.log('Latest 50:', state.data.entries);
  }
});
```

Collections give you both the matching `entries` and the `count` (total matching items, ignoring pagination). When entities change on the server, the server re-evaluates the query and sends a fresh snapshot if the results differ. Your observable fires, your UI updates. Nobody had to write a polling loop.

## Reference counting: sharing is caring

Here's a subtle but important detail: if two components both call `subscribeEntity(User, 'user-42')`, they get the _same_ underlying WebSocket subscription. The client maintains a reference count. Only one subscribe message is sent to the server.

When the first component disposes its handle, the ref count drops to 1. Nothing happens — the subscription stays active. When the second component disposes, the ref count hits 0, and the suspend timer starts.

This means you can freely call `subscribeEntity` from any component that needs the data, without worrying about duplicate subscriptions or redundant network traffic. The `EntitySyncService` deduplicates for you. Mount five components that all watch the same user? One WebSocket message. Unmount four of them? Still one subscription. Unmount the last one? The suspend timer kicks in, and after `suspendDelayMs` milliseconds, the subscription is put to sleep.

## Auto-reconnect: the optimist in the machine

WebSocket connections die. WiFi hiccups, laptops sleep, servers restart, cosmic rays flip bits. The `EntitySyncService` handles this with exponential backoff. It also extends `EventHub`, emitting events like `onConnect`, `onDisconnect`, `onReconnectAttempt`, and `onReconnectFailed` — handy for wiring up status indicators or logging.

```typescript
new EntitySyncService({
  wsUrl: 'ws://localhost:8080/api/sync',
  reconnect: true, // default
  reconnectBaseMs: 1000, // 1s, 2s, 4s, 8s...
  reconnectMaxMs: 30000, // caps at 30s
  maxReconnectAttempts: 10, // give up after 10 tries
});
```

When the connection drops, all `synced` subscriptions transition to `cached` (they keep their data, they just aren't live anymore). The client starts reconnecting. On reconnect, it **re-subscribes all active subscriptions**, sending `lastSeq` to request delta updates.

If the server's changelog still covers the client's last sequence, you get a compact delta. If not, you get a full snapshot. Either way, your UI snaps back to `synced` without any manual intervention.

And yes, if someone subscribes _during_ a reconnection attempt, the message is queued and sent once the connection is re-established. No messages lost to the void.

## Delta sync: don't repeat yourself

The `lastSeq` mechanism is the feature that separates "works nicely in demos" from "works in production where networks are terrible."

Here's the flow:

1. Client subscribes, gets a snapshot with `version: { seq: 42 }`.
2. Client watches entities change, seq goes up to 50.
3. WebSocket dies. Client transitions to `cached`.
4. Client reconnects, sends `subscribe-entity` with `lastSeq: 50`.
5. Server checks changelog: "Do I have changes from seq 50 onwards?" If yes, sends only those changes as a delta. If the changelog has been pruned (too old), sends a full snapshot.

For entity subscriptions, a delta is an array of `SyncChangeEntry` items — adds, updates, and removes. The client replays them on top of the cached state. For collections, the server re-evaluates the query and sends a fresh snapshot (since collection diffing across a gap is more complex than it's worth).

This means brief disconnections — a network blip, a server restart, switching WiFi networks — are nearly invisible to the user. They see their data, they might briefly see a `cached` status indicator, and then it's back to `synced` with a tiny delta instead of re-downloading everything.

## Local caching: memory that outlives the socket

The `localStore` option plugs in a `SyncCacheStore` — an interface with `get(key)` and `set(key, entry)` methods. The client persists subscription data to this store whenever it receives updates, and reads from it on startup (before the WebSocket is even connected).

```typescript
import { createInMemoryCacheStore } from '@furystack/entity-sync-client';

const syncService = new EntitySyncService({
  wsUrl: 'ws://localhost:8080/api/sync',
  localStore: createInMemoryCacheStore(),
});
```

The built-in `createInMemoryCacheStore()` is a simple `Map`-backed store — great for keeping data across reconnections within the same session. For actual persistence across page reloads, you'd implement the `SyncCacheStore` interface backed by IndexedDB or localStorage. Keep in mind that a persistent store should also handle eviction — the in-memory store naturally clears when the page unloads, but IndexedDB entries accumulate across sessions.

The flow with a cache store looks like:

1. Component mounts, subscribes to `User:42`. State: `connecting`.
2. Cache has data from a previous session. State: `cached` (instant render, no spinner).
3. WebSocket connects, server sends snapshot or delta. State: `synced`.
4. User sees data immediately, then sees it quietly refresh if anything changed. Nobody waited for a network round-trip.

Stale-while-revalidate for WebSocket subscriptions. Your users see content instantly. Freshness catches up in the background.

## Optimistic updates: the trust exercise

Sometimes you don't want to wait for the server to confirm a change before showing it to the user. You _know_ the update will succeed (probably), and making the user wait 200ms for a round-trip when they just toggled a checkbox feels... disrespectful.

The `EntitySyncService` provides optimistic update methods:

```typescript
const rollback = syncService.applyOptimisticEntityUpdate(User, 'user-42', {
  name: 'New Name',
});

try {
  await updateUserOnServer('user-42', { name: 'New Name' });
  // Server update will arrive via sync, overwriting the optimistic value
} catch {
  rollback?.(); // Revert to pre-update state
}
```

`applyOptimisticEntityUpdate` merges the change into the entity's local state _immediately_ and returns a rollback function. If the server update succeeds, the real data arrives via the sync channel and replaces the optimistic value. If the update fails, you call `rollback()` and the state reverts.

There's a clever safety check: if a _server_ update arrives between your optimistic update and your rollback call, the rollback is a no-op. It checks `lastSeq` — if the sequence has moved, the server has spoken, and the rollback respects that.

The same pattern exists for collections: `applyOptimisticCollectionAdd`, `applyOptimisticCollectionUpdate`, and `applyOptimisticCollectionRemove`. Add an item, update an item, remove an item — all with instant local feedback and a rollback escape hatch. One caveat: if you stack multiple optimistic updates on the same entity before any server response arrives, their rollbacks interleave — rolling back the second one restores the first's optimistic state, not the original. In practice this rarely matters, but it's worth knowing if you're building something like a rapid-fire form.

## Shades integration: hooks that hook

If you're using Shades for your UI, the `@furystack/entity-sync-client` package ships two convenience hooks that handle the full lifecycle — subscribe on mount, observe reactively, dispose on unmount:

### `useEntitySync`

```tsx
import { Shade } from '@furystack/shades';
import { useEntitySync } from '@furystack/entity-sync-client';

const UserProfile = Shade<{ userId: string }>({
  customElementName: 'user-profile',
  render: options => {
    const userState = useEntitySync(options, User, options.props.userId);

    if (userState.status === 'connecting') return <div>Loading...</div>;
    if (userState.status === 'error') return <div>Error: {userState.error}</div>;

    return <div>{userState.data?.name}</div>;
  },
});
```

Three lines in your render function. The hook gets the `EntitySyncService` from the injector, creates a `LiveEntity`, subscribes to it, and returns the current state. When the component unmounts, the disposable is cleaned up. When the state changes, the component re-renders.

### `useCollectionSync`

```tsx
import { Shade } from '@furystack/shades';
import { useCollectionSync } from '@furystack/entity-sync-client';

const ChatMessages = Shade<{ roomId: string }>({
  customElementName: 'chat-messages',
  render: options => {
    const messagesState = useCollectionSync(options, ChatMessage, {
      filter: { roomId: { $eq: options.props.roomId } },
      top: 50,
      order: { createdAt: 'DESC' },
    });

    if (messagesState.status === 'connecting') return <div>Loading...</div>;
    if (messagesState.status === 'error') return <div>Error: {messagesState.error}</div>;

    return (
      <div>
        <p>{messagesState.data.count} messages total</p>
        {messagesState.data.entries.map(msg => (
          <div>{msg.text}</div>
        ))}
      </div>
    );
  },
});
```

Same pattern. Subscribe to a filtered, paginated collection, get live updates, render accordingly. The `data` object gives you both `entries` and `count`, always in sync (pun intended).

## The suspend dance: saving bandwidth, keeping data

Suspend behavior deserves its own section because it's one of those features that's invisible when it works and infuriating when it doesn't exist.

When a component unmounts and disposes its `LiveEntity` or `LiveCollection`, the reference count drops. If it hits zero, a **suspend timer** starts (configurable via `suspendDelayMs`). After the delay:

1. The client sends an `unsubscribe` message to the server.
2. The subscription state transitions to `suspended` (data is preserved).
3. The data is persisted to the local cache store.

If the same entity is re-subscribed _before_ the timer fires, the timer is cancelled and nothing happens. The subscription stays active.

If the same entity is re-subscribed _after_ the timer fires, the subscription is revived: state goes to `cached` (showing the preserved data), a new subscribe message is sent to the server with `lastSeq`, and once the server responds, state transitions to `synced`. The user sees instant data — the stale cached version — while the fresh data loads in the background.

The suspend delay is the critical parameter here. Too short, and you're constantly subscribing/unsubscribing as users navigate between views. Too long, and you're keeping subscriptions alive for entities nobody's looking at. The default is 1 second (unless overridden in the `EntitySyncService` constructor) — long enough to survive a quick route change, short enough to clean up genuinely abandoned subscriptions.

You can also set `suspendDelayMs` per model:

```typescript
syncService.registerModel(User, { suspendDelayMs: 5000 }); // users change rarely, keep 5s
syncService.registerModel(StockPrice, { suspendDelayMs: 0 }); // unsubscribe immediately
syncService.registerModel(ChatMessage, { suspendDelayMs: Infinity }); // never suspend
```

Setting it to `Infinity` means the subscription lives forever (or until you dispose the `EntitySyncService`). Useful for models where you always want to be subscribed regardless of what's currently rendered.

## Putting it all together: the end-to-end picture

Let's trace a full lifecycle to see how all the pieces fit:

1. **Server starts.** Repository and DataSets are configured. `useWebsockets` sets up the WebSocket endpoint. `useEntitySync` registers models with the `SubscriptionManager`, which starts listening to DataSet events.

2. **Client connects.** `EntitySyncService` opens a WebSocket. Connection established. `onConnect` fires.

3. **Component mounts.** `useEntitySync(options, User, 'user-42')` is called. The hook creates a `LiveEntity`, which sends a `subscribe-entity` message. State: `connecting`. (If there's cached data, it's `cached` instead — instant render.)

4. **Server responds.** The `SubscriptionManager` fetches the entity, creates a subscription, sends a `subscribed` message with a snapshot. The client receives it, updates the state to `synced`. The component re-renders with live data.

5. **Someone updates the user.** A REST endpoint calls `dataSet.update(injector, 'user-42', { name: 'New Name' })`. The DataSet fires `onEntityUpdated`. The `SubscriptionManager` catches it, increments the model sequence, appends to the changelog, and pushes an `entity-updated` message to all subscribers of `User:42`.

6. **Client receives the update.** The state observable fires with the new data (status stays `synced`, data is merged). The component re-renders. The user sees the name change in real time.

7. **Component unmounts.** The `LiveEntity` is disposed. Reference count drops to 0. Suspend timer starts.

8. **Timer fires.** Client sends `unsubscribe`. State transitions to `suspended`. Data is cached locally.

9. **User navigates back.** The component mounts again. `subscribeEntity` finds the suspended subscription, cancels nothing (timer already fired), transitions to `cached`, sends a new `subscribe-entity` with `lastSeq`. The user sees the cached data immediately.

10. **Server responds with a delta.** Only the changes since `lastSeq` are sent. Client applies them. State: `synced`. No full re-download.

That's the full circle. From first connection to reconnection, from subscription to suspension to revival. All reactive, all type-safe, all handled by the entity sync system.

## When to use entity sync (and when not to)

Entity sync shines when:

- You have **multiple users** viewing the same data and need them to see each other's changes in real time
- You have **dashboards or monitoring views** that should update without manual refresh
- You have **collaborative features** (chat, shared documents, task boards) where latency matters
- You want to **eliminate polling** and the wasted bandwidth that comes with it

Entity sync is probably overkill when:

- Your data changes once a day and nobody is staring at it
- You're building a static blog (hi there)
- You have one user and no real-time requirements — a simple `fetch` and `Cache` will do
- You need offline-first, multi-master, conflict-resolution sync — entity sync is server-authoritative, not a CRDT framework

The system is designed to complement, not replace, the existing REST layer. Use REST for CRUD operations. Use entity sync for live updates. They work together naturally: your REST POST creates an entity via the DataSet, the DataSet fires an event, entity sync pushes it to all subscribers. Best of both worlds.

## Source and links

The packages live in the FuryStack monorepo:

- [`packages/entity-sync`](https://github.com/furystack/furystack/tree/develop/packages/entity-sync) — Shared protocol types
- [`packages/entity-sync-client`](https://github.com/furystack/furystack/tree/develop/packages/entity-sync-client) — Client library
- [`packages/entity-sync-service`](https://github.com/furystack/furystack/tree/develop/packages/entity-sync-service) — Server library

Now go subscribe to something. Your users will thank you for not making them hit F5.
