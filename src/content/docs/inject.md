---
title: Dependency Injection
description: Define services as factories behind tokens, resolve them through an injector with explicit lifetimes and disposable scopes.
package: '@furystack/inject'
lastVerified: '2026-04-25T00:00:00.000Z'
order: 1
---

`@furystack/inject` is the dependency-injection primitive every other FuryStack package builds on. Services are declared with `defineService` (or `defineServiceAsync`), which returns an opaque **token**. The injector resolves tokens, caches instances per lifetime, and runs disposal callbacks on teardown. There are no decorators.

## A first service

```ts
import { createInjector, defineService } from '@furystack/inject';

const Counter = defineService({
  name: 'my-app/Counter',
  lifetime: 'singleton',
  factory: () => {
    let value = 0;
    return { increment: () => ++value };
  },
});

const injector = createInjector();
const counter = injector.get(Counter);
counter.increment(); // 1
counter.increment(); // 2
```

`Counter` does double duty — it's both the token (passed to `injector.get`) and the type (annotate variables with it). Each `defineService` call mints a fresh `Symbol` for identity, so two unrelated services with the same `name` never collide.

## Dependencies and disposal

Factories receive a `ServiceContext` with `inject`, `injector`, and `onDispose`:

```ts
import { defineService } from '@furystack/inject';

const PaymentService = defineService({
  name: 'my-app/PaymentService',
  lifetime: 'singleton',
  factory: ({ inject, onDispose }) => {
    const settings = inject(PaymentSettings);
    const client = createPaymentClient(settings);
    onDispose(async () => client.close());
    return {
      charge: async (amount: number) => client.charge(amount),
    };
  },
});
```

`onDispose` callbacks fire in **reverse registration order** when the owning injector is disposed. Use them for any teardown — closing pools, removing event listeners, releasing scopes.

## Lifetimes

Three lifetimes:

- **`singleton`** — one instance per root injector. The default for shared, stateless services (settings, telemetry hubs, client pools).
- **`scoped`** — one instance per scope. Good for per-request, per-message, or per-test state.
- **`transient`** — a fresh instance for every `injector.get(...)`. Rarely what you want.

```ts
const RequestLogger = defineService({
  name: 'my-app/RequestLogger',
  lifetime: 'scoped',
  factory: ({ inject }) => {
    const headers = inject(RequestHeaders);
    return createLogger({ requestId: headers['x-request-id'] });
  },
});
```

## Scopes

`createScope({ owner })` creates a child injector with its own cache. Use it for per-request, per-message, or per-test isolation:

```ts
import { createInjector } from '@furystack/inject';

const root = createInjector();

await using request = root.createScope({ owner: 'request-42' });
const logger = request.get(RequestLogger); // resolved once on `request`, gone when disposed
```

The `await using` (TC39 explicit resource management) syntax disposes the scope automatically when the block exits — running every `onDispose` callback in LIFO order. The same holds for the root injector itself.

## Overriding services

Two operations let you swap implementations at runtime — for tests, or for binding throw-by-default tokens to your application's persistent stores:

- **`bind(token, factory)`** — replace the factory on the injector that owns the cached instance, dropping any cached value.
- **`invalidate(token)`** — clear the cache for a token without rebinding.

```ts
import { LoggerCollection } from '@furystack/logging';

const injector = createInjector();
injector.bind(LoggerCollection, () => createTestLogger());
```

This is the canonical replacement for the deprecated `setExplicitInstance` pattern.

## Async services

When construction needs `await`, use `defineServiceAsync`. The factory returns a `Promise<T>`; consumers resolve via `injector.getAsync(Token)`:

```ts
import { defineServiceAsync } from '@furystack/inject';

const ConfigService = defineServiceAsync({
  name: 'my-app/ConfigService',
  lifetime: 'singleton',
  factory: async () => {
    const raw = await readFile('./config.json', 'utf8');
    return JSON.parse(raw);
  },
});

const config = await injector.getAsync(ConfigService);
```

Sync `injector.get(token)` rejects async tokens at compile time — no runtime surprises.

## What about `init(injector)`?

The previous-generation injector silently called `init(injector)` on freshly constructed singletons that exposed it. The current injector does **not**. If your service needs async bootstrap, convert it to `defineServiceAsync`. Hide loaders inside the factory body; consumers should receive a fully-initialised instance.

## Where to look next

- [Data Stores](/getting-started/data-stores/) — declarative store tokens with `defineStore`.
- [Repository](/getting-started/repository/) — DataSets with authorization, hooks, and events.
- [Migration guide](https://github.com/furystack/furystack/blob/develop/docs/migrations/v7-functional-di.md) — full API delta from the previous decorator-based API.
