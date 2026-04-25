---
title: REST
description: Type-safe REST API contracts shared between server and client, with endpoint generators driven by DataSet tokens.
package: '@furystack/rest'
lastVerified: '2026-04-25T00:00:00.000Z'
order: 4
---

FuryStack splits REST into three packages so the same TypeScript interface drives the server, the client, and any tooling in between:

| Package                        | Role                                                            |
| ------------------------------ | --------------------------------------------------------------- |
| `@furystack/rest`              | Define the API as a TypeScript interface (no runtime).          |
| `@furystack/rest-service`      | Implement the API server-side, with optional auth and CORS.     |
| `@furystack/rest-client-fetch` | Call the API from the browser (or Node 22+) via native `fetch`. |

Share the API interface from a `common` workspace; both ends import the same type.

## 1. Design the API

```ts
// common/src/index.ts
import type {
  RestApi,
  GetCollectionEndpoint,
  GetEntityEndpoint,
  PostEndpoint,
  PatchEndpoint,
  DeleteEndpoint,
} from '@furystack/rest';

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface TodoApi extends RestApi {
  GET: {
    '/todos': GetCollectionEndpoint<TodoItem>;
    '/todos/:id': GetEntityEndpoint<TodoItem, 'id'>;
  };
  POST: {
    '/todos': PostEndpoint<TodoItem, 'id'>;
  };
  PATCH: {
    '/todos/:id': PatchEndpoint<TodoItem, 'id'>;
  };
  DELETE: {
    '/todos/:id': DeleteEndpoint<TodoItem, 'id'>;
  };
}
```

Each endpoint type spells out `body`, `url`, `query`, `headers`, and `result`. The shorthand types (`GetCollectionEndpoint`, `PatchEndpoint`, etc.) cover the standard CRUD shapes; for custom endpoints, declare your own type with the fields you need.

## 2. Implement the server

The endpoint generators take a `DataSetToken` directly — no need to pass `(Model, 'primaryKey')` tuples.

```ts
// service/src/index.ts
import { createInjector } from '@furystack/inject';
import {
  Authenticate,
  createDeleteEndpoint,
  createGetCollectionEndpoint,
  createGetEntityEndpoint,
  createPatchEndpoint,
  createPostEndpoint,
  useHttpAuthentication,
  useRestService,
} from '@furystack/rest-service';
import { TodoDataSet } from './todo-dataset.js';
import type { TodoApi } from 'common';

const injector = createInjector();
useHttpAuthentication(injector);

await useRestService<TodoApi>({
  injector,
  port: 3000,
  root: '/api',
  cors: { credentials: true, origins: ['http://localhost:8080'] },
  api: {
    GET: {
      '/todos': Authenticate()(createGetCollectionEndpoint(TodoDataSet)),
      '/todos/:id': Authenticate()(createGetEntityEndpoint(TodoDataSet)),
    },
    POST: {
      '/todos': Authenticate()(createPostEndpoint(TodoDataSet)),
    },
    PATCH: {
      '/todos/:id': Authenticate()(createPatchEndpoint(TodoDataSet)),
    },
    DELETE: {
      '/todos/:id': Authenticate()(createDeleteEndpoint(TodoDataSet)),
    },
  },
});
```

Authorization, modifiers, and events configured on the DataSet apply automatically. `Authenticate()` short-circuits to a `401` for unauthenticated requests.

### Custom endpoints

When the CRUD generators don't fit, write the handler yourself. The handler receives a per-request `injector`, request/response objects, and helpers for `body`, `query`, `url`, and `headers`:

```ts
import { JsonResult, useRestService, HttpUserContext } from '@furystack/rest-service';

await useRestService<MyApi>({
  injector,
  port: 3000,
  root: '/api',
  api: {
    POST: {
      '/todos/:id/complete': async ({ getUrlParams, injector }) => {
        const { id } = getUrlParams();
        const httpUser = injector.get(HttpUserContext);
        const user = await httpUser.getCurrentUser();
        const dataSet = injector.get(TodoDataSet);
        await dataSet.update(injector, id, { completed: true, completedBy: user.username });
        return JsonResult({ ok: true });
      },
    },
  },
});
```

The injector parameter is **scoped to the request** — disposable, isolated from sibling requests, and the right place to read `HttpUserContext`.

## 3. Authentication

`useHttpAuthentication` binds the `HttpAuthenticationSettings` and `HttpUserContext` tokens. Bind the throw-by-default `UserStore` and `SessionStore` to your persistent implementations first, and pass the user `DataSetToken`:

```ts
import { useHttpAuthentication, UserStore, SessionStore } from '@furystack/rest-service';
import { AppUserStore, AppSessionStore, AppUserDataSet } from './stores.js';

injector.bind(UserStore, ctx => ctx.inject(AppUserStore));
injector.bind(SessionStore, ctx => ctx.inject(AppSessionStore));

useHttpAuthentication(injector, {
  cookieName: 'sessionId',
  enableBasicAuth: true,
  userDataSet: AppUserDataSet,
});
```

For JWT-based auth, swap in `useJwtAuthentication` from `@furystack/auth-jwt`.

## 4. Consume the API

```ts
// frontend/src/api-client.ts
import { createClient } from '@furystack/rest-client-fetch';
import type { TodoApi } from 'common';

export const apiClient = createClient<TodoApi>({
  endpointUrl: 'http://localhost:3000/api',
});

const result = await apiClient({
  method: 'GET',
  action: '/todos',
});
// result.result is typed as TodoItem[]
```

IntelliSense walks you through `method` → `action` → required fields (`url`, `body`, `query`, `headers`) for the picked action, and the response type is inferred from the API interface.

## What you get for free

- **End-to-end type safety.** Change the API interface, recompile, every mismatch lights up.
- **Telemetry.** `injector.get(ServerTelemetryToken).subscribe('onApiRequestError', ...)` to wire logging or alerting.
- **Static files** via `useStaticFiles({ injector, baseUrl, path, port })`.
- **HTTP and WebSocket proxying** via `useProxy({ injector, sourceBaseUrl, targetBaseUrl, ... })`.

## Where to look next

- [Data Validation](/getting-started/data-validation/) — runtime validation of request payloads against the API interface.
- [Repository](/getting-started/repository/) — DataSets that back your endpoint generators.
