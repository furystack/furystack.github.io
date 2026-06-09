---
title: 'Cross-node bus: finally, pub/sub that actually crosses nodes'
author: [gallayl]
tags:
  [
    'Architecture',
    'distributed-systems',
    'redis',
    'entity-sync',
    'rest-service',
    'identity',
    'cross-node-bus',
  ]
date: '2026-06-09T12:00:00.000Z'
draft: false
image: img/021-cross-node-bus.png
excerpt: 'FuryStack now ships a real cross-node event bus and a Redis Streams adapter, so identity invalidation and entity sync finally work across pods instead of just within one lonely process.'
---

If your FuryStack app has ever been deployed as more than one pod, you already know the classic bug:

- user logs out on Pod A
- Pod B keeps serving stale identity until the cache TTL expires
- the whole system acts like the other nodes are imaginary friends

That illusion is over.

## What shipped

The new release adds a tiny public bus abstraction in `@furystack/cross-node-bus` plus a real Redis Streams adapter in `@furystack/redis-cross-node-bus`.

That means the framework now has one shared, transport-agnostic primitive for:

- identity events (`IdentityEventBus`)
- entity change broadcasts (`EntityChangeBus`)
- app-defined typed facades over the bus

The implementation is intentionally straightforward, because a distributed event bus should be predictable and reliable before it tries to be clever.

## Why this matters

Before this, FuryStack's internal `EventHub` and cache invalidations were strictly process-local. The app could run on N pods behind a load balancer, and every cross-cutting channel still behaved like a single-node app.

The new bus changes that:

- logout and session invalidation events now propagate across nodes
- entity change notifications now fan out from one write node to every sibling
- adapters can assign sequence ids, support replay, and let reconnecting consumers catch up without guessing

In other words: the system now treats the fleet as one cooperative actor instead of N independent silos.

## The simple API that makes this work

The core package defines one shared token: `CrossNodeBus`.

That token exposes a small interface:

- `publish(topic, payload)`
- `subscribe(topic, handler)`
- `subscribeRemoteOnly(topic, handler)`
- `subscribeForeign(prefix, topic, handler)`
- `replay(topic, fromSeq)`

And yes, it also exposes a stable `nodeId` and a capability descriptor so the framework can refuse to start if the bound adapter does not support the features it needs.

That last bit is important. `EntityChangeBus` requires `replay` and `assignsSequence`, and we now fail loudly at startup instead of letting a non-replaying adapter serve stale data forever.

## What the packages do

### `@furystack/cross-node-bus`

This is the abstraction. It includes:

- the `CrossNodeBus` token
- `InProcessCrossNodeBus` default factory for single-node apps
- a shared `BusMessage` envelope with `originId`, `emittedAt`, optional `seq`, and version pinning
- a lightweight in-process replay ring buffer for reconnecting subscribers
- a testing harness for multi-instance in-process simulations

The default adapter is intentionally unexciting. If you do not bind a transport adapter, the bus still works in one process exactly like before.

### `@furystack/redis-cross-node-bus`

This is the production-grade adapter that actually talks to Redis Streams.

It supports:

- persistence
- server-assigned sequence ids
- replay from an arbitrary stream position
- prefix-based multi-service isolation
- explicit cross-prefix subscription via `subscribeForeign`

The Redis adapter also duplicates the Redis client for the read loop, so every subscriber can boot without requiring consumer groups or orphaned group state.

## Identity and entity sync now live on the same shared bus

The two framework facades that landed with this release are the ones where the difference is most visible:

- `IdentityEventBus` in `@furystack/rest-service` now publishes logout/invalidation events to the bus and invalidates cached user resolution across nodes.
- `EntityChangeBus` in `@furystack/entity-sync-service` now publishes model-level deltas on the bus and uses replay to restore reconnecting clients.

That means a logout on one node invalidates the same cache entry everywhere, and a model update on one node is no longer invisible to the rest of the cluster.

## What “cross-node” actually looks like

The implementation is deliberately opinionated about one thing: the bus is a broadcast notification layer, not a distributed state store.

So:

- the bus carries events, not entire object graphs
- receivers still re-read their local store when they need the canonical state
- duplicates are fine, because the system is already designed for them
- ordering is only guaranteed per-publisher, not globally across the fleet

That is the practical design FuryStack needs right now: a broadcast notification layer, not a distributed state machine.

## How apps should use it

App authors do not need to use low-level Redis or wire-format details. The recommended pattern is:

- bind `CrossNodeBus` to a transport adapter
- define a typed facade over the bus
- publish typed domain events on that facade
- subscribe using the facade's local event API

This is the same pattern the framework facades already use, and it means custom app buses can be built with the same DX as `EventHub<T>` while still getting cross-node delivery.

Example sketch:

```ts
const AppEventBus = defineService({
  name: 'my-app/AppEventBus',
  lifetime: 'singleton',
  factory: ({ inject, onDispose }) => {
    const bus = inject(CrossNodeBus);
    const local = new EventHub<{ event: AppEvent }>();

    const handle = bus.subscribe('app/events', message => {
      local.emit('event', message.payload as AppEvent);
    });

    onDispose(() => handle[Symbol.dispose]());

    return {
      subscribe: (handler: (e: AppEvent) => void) => local.subscribe('event', handler),
      publish: (event: AppEvent) => bus.publish('app/events', event),
    };
  },
});
```

This release ships that pattern in the framework and makes it the recommended extension point for app-defined coordination.

## So what changed for release users?

If you are already on FuryStack 2026, the new bus means:

- single-node apps keep working as before
- multi-node apps can bind `@furystack/redis-cross-node-bus`
- identity invalidation becomes fleet-wide instead of pod-local
- entity sync uses replay and sequence numbers instead of fragile local changelogs

If your app needs cross-service isolation, `topicPrefix` gives each service its own wire namespace, and `subscribeForeign` makes cross-service eavesdrop explicit.

## Final note

This is the kind of feature that is boring to write and exciting to use.

You do not need a new framework API for every cross-node event you want to publish. You only need a small shared bus, a typed facade, and a shipping-quality adapter.

`@furystack/cross-node-bus` is that shared bus. `@furystack/redis-cross-node-bus` is the adapter that makes it real.

If your app runs on more than one pod, go try it. If your app does not, congrats — no upgrade urgency, but the package still ships with a really clean in-process default.
