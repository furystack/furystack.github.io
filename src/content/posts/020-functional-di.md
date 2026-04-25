---
title: 'The Last Decorator'
author: [gallayl]
tags:
  [
    'Architecture',
    'refactoring',
    'breaking-changes',
    'dependency-injection',
    'migration',
    'FuryStack',
    'inject',
    'core',
    'repository',
    'rest-service',
    'security',
    'logging',
    'websocket-api',
    'filesystem-store',
    'mongodb-store',
    'redis-store',
    'sequelize-store',
    'shades',
    'shades-common-components',
    'shades-showcase-app',
  ]
date: '2026-04-25T12:00:00.000Z'
draft: false
image: img/020-functional-di.jpg
excerpt: "The latest FuryStack update throws @Injectable in the bin, replaces classes with tokens, and finally clears the runway for the next big TypeScript upgrade. Here's what changed and why your @Injected properties are about to get really lonely."
---

Almost four years ago, in [A little bit of Inject refactor](/posts/009-inject-refactor/), I wrote a slightly anxious sentence about decorator metadata being "doomed". I was being dramatic at the time. I was also, it turns out, _correct_. Then deeply, generationally, "the entire DI layer needs a redesign" correct.

This is that redesign. Welcome to the latest FuryStack update — the release where `@Injectable` finally walks into the sea.

## The decorator-shaped elephant

Quick recap for newcomers: legacy TypeScript decorators (the ones FuryStack has been leaning on since 2018) live in TC39 limbo. The standards committee moved on to a stage-3 design with a completely different shape. The legacy variant only really worked because TypeScript's `emitDecoratorMetadata` flag stuffed type info into the compiled output at build time — a feature that [esbuild explicitly refuses to support](https://github.com/evanw/esbuild/issues/257), and that the wider tooling ecosystem has spent years quietly distancing itself from.

I mitigated some of that in [A little bit of Inject refactor](/posts/009-inject-refactor/) by ditching constructor injection in favour of `@Injected` properties. That bought a few good years. But the writing was on the wall: the next TypeScript major was going to keep tightening the screws on the legacy decorator surface, the experimental flags were going to keep getting "experimental"-er, and any framework still leaning on `Reflect.metadata` was going to be left grinding through migration debt forever.

So I did the boring grown-up thing. I ripped the decorators out, replaced them with a functional, token-based DI API, and gave the framework a clean runway to upgrade TypeScript without holding its breath.

This post is the tour. It's also the polite warning: yes, this is a breaking change. Yes, every package got a major bump. Yes, there's a migration guide. I'll get to that.

## Meet `defineService`

The new mental model is short:

> A service is a **factory** that returns an object. The factory is registered behind a **token**. The injector resolves tokens, caches by lifetime, and runs your `onDispose` callbacks on teardown.

That's it. There are no classes. There is no `Reflect.metadata`. There is no constructor magic. Side-by-side:

```typescript
// before — decorators all the way down
@Injectable({ lifetime: 'singleton' })
class Counter {
  private value = 0;
  public increment(): number {
    return ++this.value;
  }
}
const svc = injector.getInstance(Counter);
```

```typescript
// after — a factory and a token
const Counter = defineService({
  name: 'my-app/Counter',
  lifetime: 'singleton',
  factory: () => {
    let value = 0;
    return { increment: () => ++value };
  },
});
const svc = injector.get(Counter);
```

The `Counter` identifier on the new side is doing double duty — it's both the token (for the injector) and the type (for consumers). That's the bit that makes the whole thing feel weirdly natural after a day or two: import a single thing, use it as a value (resolve it) or as a type (annotate variables), and the symbol identity is tracked by a fresh `Symbol` on every `defineService` call so accidental cross-package collisions are structurally impossible.

Dependencies come from the factory's context:

```typescript
const PaymentService = defineService({
  name: 'my-app/PaymentService',
  lifetime: 'singleton',
  factory: ({ inject, onDispose }) => {
    const logger = inject(LoggerCollection);
    const settings = inject(PaymentSettings);
    const client = createPaymentClient(settings);
    onDispose(async () => client.close());
    return {
      charge: async (amount: number) => {
        logger.info({ message: `Charging ${amount}` });
        return client.charge(amount);
      },
    };
  },
});
```

`onDispose` is a quietly important detail. Every factory gets one, and it runs in **reverse registration order** when the owning injector is disposed. No more "oh wait, did I forget to close that pool?" panic at process exit.

For things that genuinely need `await` during construction, `defineServiceAsync` is the async cousin — same shape, the factory returns a `Promise<T>`, consumers resolve via `injector.getAsync(Token)`. More on that later — it shows up again.

## The injector's new vocabulary

Most of the renames are mechanical. If the old API is in muscle memory, the new one will feel familiar within an hour:

| Before                                          | Now                                    |
| ----------------------------------------------- | -------------------------------------- |
| `new Injector()`                                | `createInjector()`                     |
| `injector.getInstance(Class)`                   | `injector.get(Token)`                  |
| `injector.setExplicitInstance(instance, Class)` | `injector.bind(Token, () => instance)` |
| `injector.createChild({ owner })`               | `injector.createScope({ owner })`      |
| `injector.cachedSingletons.has(X)`              | (gone — use a nullable scoped token)   |

A few additions worth knowing about:

- **`getAsync(token)`** — resolves both sync and async tokens. The TypeScript signatures stop you from calling sync `get` on an async-only token, so the failure mode is a compile error, not a runtime surprise.
- **`bind(token, factory)` + `invalidate(token)`** — `bind` overrides on the injector that owns the cached instance and drops any cached value. `invalidate` clears the cache without rebinding. Together they replace every "I want to swap this dependency for tests" pattern.
- **`Symbol.asyncDispose`** — every injector implements it, so `await using injector = createInjector()` (or the existing `usingAsync` helper) cleans up the whole tree, recursively, in LIFO order.
- **`createScope(opts?)`** — the renamed `createChild`. Scopes are cheap, disposable, and the right unit of isolation for per-request, per-message, or per-test work.

## Stores and DataSets, now with metadata

The old `addStore(injector, new Store({...}))` + `getRepository(injector).createDataSet(Model, 'pk', settings)` dance is gone. The new form has two functions doing the heavy lifting:

```typescript
const UserStore = defineStore<User, 'username'>({
  name: 'my-app/UserStore',
  model: User,
  primaryKey: 'username',
  factory: () => new InMemoryStore({ model: User, primaryKey: 'username' }),
});

const UserDataSet = defineDataSet({
  name: 'my-app/UserDataSet',
  store: UserStore,
  settings: {
    /* authorize, modifyOnAdd, etc. */
  },
});
```

`StoreToken` and `DataSetToken` both carry their model + primary-key metadata along for the ride, which means downstream APIs (REST endpoint generators, `SubscriptionManager.registerModel`, `getDataSetFor`) accept a single token argument instead of yet another `(Model, 'primaryKey')` tuple. One source of truth, type-checked at the declaration site, propagated everywhere it's needed.

The backend store packages each ship a dedicated mint for their flavour:

- `defineFileSystemStore<T, PK>({ name, model, primaryKey, fileName, tickMs? })`
- `defineMongoDbStore<T, PK>({ name, model, primaryKey, url, db, collection })`
- `defineRedisStore<T, PK>({ name, model, primaryKey, client })`
- `defineSequelizeStore<T, M, PK>({ name, model, sequelizeModel, primaryKey, options })`

Same idea, same shape. The MongoDB and Sequelize variants now expose their underlying client factories as singleton tokens with an internal connection pool that closes itself on injector dispose — so writing 80 tests against the same database no longer leaks 80 mongo clients into the void.

### Throw-by-default stores

Here's a small but opinionated change that pays off enormously in practice. Every persistent store that ships with FuryStack — `UserStore`, `SessionStore`, `RefreshTokenStore`, `PasswordCredentialStore`, `PasswordResetTokenStore` — is now a token whose default factory **throws**. As in: resolve it without binding it first, and you get a clear, named error telling you what's missing.

```typescript
// At app bootstrap:
const AppUserStore = defineSequelizeStore<User, UserModel, 'username'>({
  name: 'my-app/AppUserStore',
  model: User,
  sequelizeModel: UserModel,
  primaryKey: 'username',
  options: { dialect: 'postgres' /* ... */ },
});

injector.bind(UserStore, ctx => ctx.inject(AppUserStore));
```

Tests opt into `InMemoryStore` per scope:

```typescript
injector.bind(UserStore, () => new InMemoryStore({ model: User, primaryKey: 'username' }));
```

This sounds annoying for about ninety seconds, until the first time you forget to wire up a database in a new app and the test suite tells you _exactly which store wasn't bound_ instead of mysteriously returning empty arrays. I have not missed the silent-empty-store debugging sessions. They are not invited back.

## The Great Manager Massacre

One of the quieter side effects of the rewrite was realising how many of the old "Manager" classes existed purely to paper over `@Injectable` ergonomics. Most of them turned out to be unnecessary the moment real DI tokens were on the table.

The casualty list:

- **`ServerManager`**, **`ApiManager`**, **`StaticServerManager`**, **`ProxyManager`** — all gone. Replaced by `HttpServerPoolToken` (a singleton-pooled HTTP server registry) and `ServerTelemetryToken` (an event hub emitting `onApiRequestError`, `onProxyFailed`, `onWebSocketActionFailed`, `onWebSocketProxyFailed`). The `useRestService` / `useStaticFiles` / `useProxy` helpers kept their public shapes; the internals are token-based and significantly less circular.
- **`Repository`** — gone. `defineDataSet` covers everything `Repository.createDataSet` used to do, with stronger types and zero shared mutable state.
- **`StoreManager`** — gone. Stores resolve through their tokens; `addStore` is no longer a thing.

`HttpUserContext` got a small but important fix while the area was open. The old version cached the current user in a private instance field — which, combined with how scoped tokens cache on the first ancestor that resolves them, meant authenticated state could quietly leak across scopes when two parts of an app shared an `HttpUserContext` instance. The new version stores the cache in a `WeakMap<request.headers, Promise<User>>`, keyed by the per-request headers object. Same instance, but every request gets its own cache slot, and the WeakMap drops entries automatically when the request goes out of scope.

The WebSocket layer got the most dramatic rewrite. `WebSocketAction` used to be a class with decorators, a constructor, and per-instance lifecycle. It's now a plain object:

```typescript
const PingAction: WebSocketAction = {
  canExecute: ({ data }) => data.type === 'ping',
  execute: async ({ injector, socket }) => {
    const logger = injector.get(LoggerCollection);
    logger.info({ message: 'pong' });
    socket.send(JSON.stringify({ type: 'pong' }));
  },
};
```

Each incoming message gets a fresh `injector.createScope({ owner: message })`, the action runs inside it, and the scope is disposed in `finally` — same per-request isolation pattern the rest service has been using for years. Action failures route to `ServerTelemetryToken#onWebSocketActionFailed` instead of being absorbed by the action class itself. Multi-endpoint setups Just Work because `useWebSocketApi(...)` returns its own handle instead of registering a singleton.

## `cachedSingletons.has(X)` is gone, long live nullable tokens

Here's a niche-but-illuminating pattern. The old `<Form>` component bound a `FormService` on a child injector; descendant `<Input>` components used to do this:

```typescript
// before
const formService = injector.cachedSingletons.has(FormService)
  ? injector.getInstance(FormService)
  : null;
```

The point being: "if there's a parent `<Form>`, hook into it; otherwise just be a plain input". The implementation depended on poking at the injector's internal cache, which is not something that survives a clean DI redesign, and frankly never should have been a public API.

The new pattern is a **nullable scoped token**:

```typescript
export const FormContextToken: Token<FormService | null, 'scoped'> = defineService({
  name: 'shades-common-components/FormContextToken',
  lifetime: 'scoped',
  factory: () => null,
});

// <Form> binds a real instance on its own scope:
scope.bind(FormContextToken, () => createFormService());

// Inputs just resolve and branch on null:
const form = injector.get(FormContextToken);
if (form) {
  /* register with the form */
}
```

The default factory returns `null`. `<Form>` rebinds the token on its own scope. Children resolve and branch. The "absent parent" case is no longer an opt-in escape hatch poked through the injector internals — it's a first-class state in the type signature. A generic `injector.tryGet(token)` helper was on the table briefly, then rejected: forcing the call site to think about what `null` _means_ is the entire point.

## The `init()` ghost

This one cost a real bug, so it deserves its own section.

Way back, [PR #329](https://github.com/furystack/furystack/pull/329) added a quiet behaviour to the previous injector: any time `getInstance` constructed a new singleton, it would inspect the freshly built instance, and if it exposed a method called `init(injector)`, it would automatically call it as part of construction. This was undocumented, never showed up in IntelliSense, and most consumers were unaware it existed. It also turned out to be load-bearing for exactly one service in the entire codebase: the showcase app's `GridPageService`, which seeded its demo store from inside `init()`.

The new injector has no equivalent. The grid silently rendered "- No Data -" until I figured out what was happening.

The fix isn't to bring `init()` back. The fix is to admit that "the consumer must remember to call this method before using the service" is an antipattern, and to use the right tool for genuine async bootstrap: `defineServiceAsync` plus `injector.getAsync`.

The canonical pattern, as it now ships in `shades-showcase-app`:

```typescript
export const GridPageService = defineServiceAsync({
  name: 'showcase/GridPageService',
  lifetime: 'singleton',
  factory: async ({ inject, injector, onDispose }) => {
    const dataSet = inject(GameItemDataSet);
    const scope = useSystemIdentityContext({ injector, username: 'GridPageService' });
    onDispose(() => scope[Symbol.asyncDispose]());
    await seedDemoData(dataSet, scope);
    return {
      /* the actually useful surface */
    };
  },
});
```

The route loader (`<LazyLoad>`) parallelises the page chunk import and the service bootstrap, and hands the resolved instance into the page as a regular prop:

```typescript
'/data-display/grid': {
  component: () => (
    <LazyLoad
      loader={<PageLoader />}
      component={async () => {
        const [{ GridPage }, gridPageService] = await Promise.all([
          import('./pages/data-display/grid/index.js'),
          shadesInjector.getAsync(GridPageService),
        ])
        return <GridPage service={gridPageService} />
      }}
    />
  ),
},
```

The page itself has no idea any of this happened. It receives a fully initialised service as a prop, renders synchronously, has no readiness flag, has no loading state, and never has to think about lifecycle. The async boundary lives in exactly one place — the route loader — where it belongs.

If your service used to lean on the old `init()` auto-call (or, more commonly, fire-and-forget async work in a sync constructor), this is the pattern you want.

## Quality-of-life wins

A grab bag of the smaller things, because there were a lot of them:

- **Shades is fully declassed.** `LocationService`, `RouteMatchService`, `ScreenService`, `SpatialNavigationService`, `ThemeProviderService`, `NotyService`, `LayoutService`, `FormService` — every one of them is now a plain-object factory behind a token. `<PageLayout>` binds its own `LayoutService` on its scope so descendants resolve the right instance; `<Form>` does the same for `FormService`. Cleaner mental model, no more "is this thing a singleton or scoped?" detective work — the lifetime is right there in the token's type.
- **i18n is per-app now.** `defineI18N<TKeys>(default, ...additional)` mints an app-specific singleton token. The library doesn't try to intern a generic token across apps, because each app's `TKeys` literal union is different and shared interning would erase the key-level type safety. Same pattern repeats for `defineEntitySyncService` on the client side.
- **`Constructable` moved.** It now lives in `@furystack/core` instead of `@furystack/inject`. If the old import path is in your codebase, swap it and add `@furystack/core` to your dependencies. There is a 100% chance you'll forget this on at least one package, and the TypeScript error will be very clear about what to do.
- **New ESLint rule.** `no-direct-store-token` flags `injector.get(StoreToken)` / `injector.getAsync(StoreToken)` in application code, because data should flow through DataSets, not raw stores. The old `injectable-consistent-inject` and `no-direct-physical-store` rules are gone — TypeScript already errors on every removed API, so duplicate lint rules would just add noise.
- **Node ≥ 22.** Required, not just recommended. The Shades test environment now relies on jsdom 29, which pulls in WHATWG streams from `@exodus/bytes` as an ESM-only dep. Node 20 throws `ERR_REQUIRE_ESM` on boot. Updating CI is left as an exercise for the reader, but it's a one-line change.

## The migration guide

The shipped version of this story is too long for a blog post (and too dry — you don't come here for tables, presumably). There's a proper migration guide for the per-package details, complete with before/after recipes, the common pitfalls hit along the way, and the testing checklist:

- **Shared migration guide:** [`docs/migrations/v7-functional-di.md`](https://github.com/furystack/furystack/blob/develop/docs/migrations/v7-functional-di.md) — every per-package CHANGELOG links to it.
- **Internal plan & post-mortem:** [`docs/internal/functional-di-migration-plan.md`](https://github.com/furystack/furystack/blob/develop/docs/internal/functional-di-migration-plan.md) — the messy, decision-by-decision history if you want to know _why_ a particular API ended up shaped the way it did. Includes a full list of the things considered and rejected, and the bugs caught along the way.

If you're upgrading an app, start with the shared guide. If you're upgrading a library that builds on FuryStack, read the internal plan too — there's a section on per-app token factories (`defineI18N`, `defineEntitySyncService`) that's the right pattern for any library with call-site literal generics.

## What's next

The whole point of this exercise was clearing the runway. With decorators gone and the DI surface entirely token-based, the TypeScript major upgrade I'd been carefully avoiding is now a normal, boring chore instead of a months-long migration. That's next on the list.

After that, there's still a small pile of class-shaped services that survived this sweep — `SubscriptionManagerImpl`, `I18NServiceImpl`, the showcase's `SuggestManager` and `CommandPaletteManager`, a few `EventHub`-extending primitives in `@furystack/utils`. None of them are blocking anything; they all sit comfortably behind tokens or are instantiated locally inside component bodies. If declassing them ever simplifies the surface, they'll go. If not, classes-behind-tokens remain a perfectly fine pattern.

For the rest of you: thanks for putting up with another breaking-change post. The good news is that this is, statistically speaking, the last one for a while. The not-so-good news is that I said almost exactly the same thing in [Bye-bye extension methods](/posts/008-byebye-extension-methods/) and [A little bit of Inject refactor](/posts/009-inject-refactor/), and you absolutely should not believe me.

But this time it's true. Probably.

Want to poke around the new API? The full source is on [GitHub](https://github.com/furystack/furystack), the [Showcase App](https://shades-showcase.netlify.app/) runs entirely on the new release, and the migration guide is the fastest way from "my old app" to "my new app". Decorators, you served the framework well. Mostly. Don't let the door hit you on the way out.
