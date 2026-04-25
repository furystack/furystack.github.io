---
title: Data Stores
description: Declare physical stores as DI tokens that carry model and primary-key metadata, with a dedicated helper per backend.
package: '@furystack/core'
lastVerified: '2026-04-25T00:00:00.000Z'
order: 2
---

A **physical store** is the minimal interface for persisting a collection of entities — create, read, filter, update, delete, count. Stores don't know about authorization, relations, or business logic. That lives one layer up, in [DataSets](/getting-started/repository/).

A **`StoreToken`** is a DI token that resolves to a physical store and carries the store's `model` and `primaryKey` as metadata. Backend adapter packages ship dedicated helpers that mint the right token for their flavour.

## Declaring a store

```ts
import { defineStore, InMemoryStore } from '@furystack/core';

class TodoItem {
  declare id: string;
  declare title: string;
  declare completed: boolean;
}

export const TodoStore = defineStore<TodoItem, 'id'>({
  name: 'my-app/TodoStore',
  model: TodoItem,
  primaryKey: 'id',
  factory: () => new InMemoryStore({ model: TodoItem, primaryKey: 'id' }),
});
```

`defineStore` wraps `defineService({ lifetime: 'singleton' })` and registers an `onDispose` so the store cleans itself up when the injector is disposed.

> **Tip:** Pass the generics explicitly (`<TodoItem, 'id'>`). Inferred generics inside helper wrappers tend to widen `'id'` back to `keyof T`, which loses the literal primary-key type.

## Resolving the store

```ts
import { createInjector } from '@furystack/inject';

const injector = createInjector();
const store = injector.get(TodoStore);
await store.add({ id: '1', title: 'first', completed: false });
```

> **Heads up:** Resolving a `StoreToken` directly in application code is a smell — data should flow through DataSets, not raw stores. The `furystack/no-direct-store-token` lint rule flags this. See [Repository](/getting-started/repository/).

## Backend adapters

Each adapter exports a `defineXxxStore<T, PK>(opts)` helper:

| Package                       | Helper                  | Use when…                                           |
| ----------------------------- | ----------------------- | --------------------------------------------------- |
| `@furystack/core`             | `InMemoryStore` factory | Tests, demos, ephemeral state.                      |
| `@furystack/filesystem-store` | `defineFileSystemStore` | Development, prototypes, low-volume persistence.    |
| `@furystack/sequelize-store`  | `defineSequelizeStore`  | Any SQL DB via Sequelize (Postgres, MySQL, SQLite). |
| `@furystack/mongodb-store`    | `defineMongoDbStore`    | MongoDB document storage.                           |
| `@furystack/redis-store`      | `defineRedisStore`      | Redis key-value storage (e.g. shared sessions).     |

### `defineFileSystemStore`

```ts
import { defineFileSystemStore } from '@furystack/filesystem-store';

export const TodoStore = defineFileSystemStore<TodoItem, 'id'>({
  name: 'my-app/TodoStore',
  model: TodoItem,
  primaryKey: 'id',
  fileName: './data/todos.json',
  tickMs: 5000, // Optional: throttle disk writes to once per N ms
});
```

### `defineMongoDbStore`

```ts
import { defineMongoDbStore } from '@furystack/mongodb-store';

export const TodoStore = defineMongoDbStore<TodoItem, 'id'>({
  name: 'my-app/TodoStore',
  model: TodoItem,
  primaryKey: 'id',
  url: process.env.MONGODB_URL!,
  db: 'my-app',
  collection: 'todos',
});
```

The shared `MongoClientFactory` token pools clients per URL and closes them all on injector teardown — no connection leaks across tests.

### `defineRedisStore`

```ts
import { createClient } from 'redis';
import { defineRedisStore } from '@furystack/redis-store';

const redisClient = await createClient({ url: process.env.REDIS_URL }).connect();

export const SessionStore = defineRedisStore<Session, 'sessionId'>({
  name: 'my-app/SessionStore',
  model: Session,
  primaryKey: 'sessionId',
  client: redisClient,
});
```

The caller owns the `redis` client lifecycle — connect at startup, `quit()` on shutdown.

### `defineSequelizeStore`

```ts
import { DataTypes, Model } from 'sequelize';
import { defineSequelizeStore } from '@furystack/sequelize-store';

class TodoModel extends Model {}

export const TodoStore = defineSequelizeStore<TodoItem, typeof TodoModel, 'id'>({
  name: 'my-app/TodoStore',
  model: TodoItem,
  sequelizeModel: TodoModel,
  primaryKey: 'id',
  options: { dialect: 'postgres' /* ... */ },
  initModel: ({ model }) => {
    model.init(
      {
        id: { type: DataTypes.STRING, primaryKey: true },
        title: DataTypes.STRING,
        completed: DataTypes.BOOLEAN,
      },
      { sequelize: model.sequelize!, tableName: 'todos' },
    );
  },
});
```

The shared `SequelizeClientFactory` token pools clients per `JSON.stringify(options)` key and disposes them on teardown.

## Throw-by-default stores

Some packages ship `StoreToken`s that **throw** when resolved without a binding. This is intentional — they represent stores the framework needs but cannot pick on the application's behalf. Examples: `UserStore` and `SessionStore` from `@furystack/rest-service`; `RefreshTokenStore` from `@furystack/auth-jwt`; `PasswordCredentialStore` and `PasswordResetTokenStore` from `@furystack/security`.

Bind a concrete implementation at app bootstrap:

```ts
import { UserStore } from '@furystack/rest-service';
import { defineSequelizeStore } from '@furystack/sequelize-store';

const AppUserStore = defineSequelizeStore<User, typeof UserModel, 'username'>({
  name: 'my-app/AppUserStore',
  model: User,
  sequelizeModel: UserModel,
  primaryKey: 'username',
  options: { dialect: 'postgres' /* ... */ },
});

injector.bind(UserStore, ctx => ctx.inject(AppUserStore));
```

In tests, bind an `InMemoryStore` per scope:

```ts
injector.bind(UserStore, () => new InMemoryStore({ model: User, primaryKey: 'username' }));
```

## Where to look next

- [Repository](/getting-started/repository/) — wrap a `StoreToken` in a `DataSet` with authorization and events.
- [Dependency Injection](/getting-started/inject/) — how `defineService` and tokens work in general.
