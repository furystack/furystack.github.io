---
title: Repository
description: DataSet tokens layer authorization, hooks, and events on top of physical stores.
package: '@furystack/repository'
lastVerified: '2026-04-25T00:00:00.000Z'
order: 3
---

A **DataSet** wraps a physical store with entity-level business logic — authorization callbacks, modification hooks, and change events. Where a `PhysicalStore` only handles CRUD, a `DataSet` enforces _who_ may do _what_, _when_, and _what gets emitted_ as a side effect.

Use the DataSet for every write to an entity. The `furystack/no-direct-store-token` lint rule flags direct store access in application code precisely because bypassing the DataSet skips authorization, modifiers, and downstream subscribers (e.g. [entity-sync-service](https://github.com/furystack/furystack/tree/develop/packages/entity-sync-service)).

## Declaring a DataSet

```ts
import { createInjector } from '@furystack/inject';
import { defineStore, InMemoryStore } from '@furystack/core';
import { defineDataSet, getDataSetFor } from '@furystack/repository';
import { getLogger } from '@furystack/logging';

class TodoItem {
  declare id: string;
  declare title: string;
  declare completed: boolean;
}

const TodoStore = defineStore<TodoItem, 'id'>({
  name: 'my-app/TodoStore',
  model: TodoItem,
  primaryKey: 'id',
  factory: () => new InMemoryStore({ model: TodoItem, primaryKey: 'id' }),
});

export const TodoDataSet = defineDataSet({
  name: 'my-app/TodoDataSet',
  store: TodoStore,
  settings: {
    authorizeAdd: async ({ entity }) => {
      if (!entity.title || entity.title.length < 3) {
        return {
          isAllowed: false,
          message: 'Todo title must be at least 3 characters.',
        };
      }
      return { isAllowed: true };
    },
    onEntityAdded: ({ injector, entity }) => {
      getLogger(injector).verbose({
        message: `Todo added: ${entity.title}`,
      });
    },
  },
});
```

`defineDataSet` returns a `DataSetToken<T, PK>` that carries the model and primary-key metadata along with the configured behaviour.

## Using a DataSet

```ts
const injector = createInjector();
const dataSet = getDataSetFor(injector, TodoDataSet);

await dataSet.add(injector, { id: '1', title: 'walk the cat', completed: false });
const todos = await dataSet.find(injector, { filter: { completed: { $eq: false } } });
```

`getDataSetFor` is a convenience wrapper around `injector.get(TodoDataSet)`. Pick whichever reads cleaner at the call site.

## Authorization callbacks

Each callback returns an `AuthorizationResult` (`{ isAllowed: true }` or `{ isAllowed: false, message: string }`).

| Callback                | Fires before…                                 |
| ----------------------- | --------------------------------------------- |
| `authorizeAdd`          | inserting a new entity                        |
| `authorizeUpdate`       | updating an entity (without loading it first) |
| `authorizeUpdateEntity` | updating an entity (loads the original)       |
| `authorizeRemove`       | deleting (without loading)                    |
| `authorizeRemoveEntity` | deleting (loads the entity)                   |
| `authorizeGet`          | reading a collection                          |
| `authorizeGetEntity`    | reading a single entity                       |

The `Entity` variants (re)load the persisted entity before the check, so you can compare old vs new values or check ownership. Skip them when you only need to validate the incoming payload.

## Modifiers and additional filters

- **`modifyOnAdd` / `modifyOnUpdate`** — transform the entity before it is persisted. Useful for `createdByUser`, `lastModifiedAt`, etc.
- **`addFilter`** — append a condition to every collection query, narrowing what callers can see.

```ts
defineDataSet({
  name: 'my-app/TodoDataSet',
  store: TodoStore,
  settings: {
    modifyOnAdd: async ({ injector, entity }) => {
      const httpUser = injector.get(HttpUserContext);
      const user = await httpUser.getCurrentUser();
      return { ...entity, createdByUser: user.username };
    },
    addFilter: async ({ injector, filter }) => {
      const httpUser = injector.get(HttpUserContext);
      const user = await httpUser.getCurrentUser();
      return { ...filter, createdByUser: { $eq: user.username } };
    },
  },
});
```

## Change events

`onEntityAdded`, `onEntityUpdated`, and `onEntityRemoved` fire after the operation succeeds. Use them for logging, metrics, cache invalidation, or pushing changes to subscribers.

## Server-side writes (background jobs, seed scripts)

Code outside an HTTP request has no `HttpUserContext`. Use `useSystemIdentityContext` to create a scoped child injector with elevated privileges, and dispose it via `usingAsync`:

```ts
import { useSystemIdentityContext } from '@furystack/core';
import { getDataSetFor } from '@furystack/repository';
import { usingAsync } from '@furystack/utils';

await usingAsync(
  useSystemIdentityContext({ injector, username: 'seed-script' }),
  async systemInjector => {
    const dataSet = getDataSetFor(systemInjector, TodoDataSet);
    await dataSet.add(systemInjector, {
      id: 'seed-1',
      title: 'first seed',
      completed: false,
    });
  },
);
```

> **Warning:** `useSystemIdentityContext` bypasses every authorization callback. Only use it in trusted server-side code. Never hand the returned injector to a user-facing request handler.

## Where to look next

- [Data Stores](/getting-started/data-stores/) — declaring the underlying `StoreToken`.
- [REST](/getting-started/rest/) — wire a DataSet to CRUD endpoints in two lines.
