---
title: Data Validation
description: Generate JSON Schemas from your TypeScript REST API and enforce them at runtime with the Validate middleware.
package: '@furystack/rest-service'
lastVerified: '2026-04-25T00:00:00.000Z'
order: 5
---

A type-safe REST API gives you compile-time confidence that the server and client agree on shapes. It does **not** stop a malformed request from reaching your handler at runtime — TypeScript types are erased before the bytes hit the wire.

The fix is to project the same TypeScript interfaces into runtime-checkable JSON Schemas, and run incoming payloads through them with the `Validate` middleware from `@furystack/rest-service`.

## The plan

1. Define the API interface (see [REST](/getting-started/rest/)).
2. Generate a JSON Schema from those interfaces with `ts-json-schema-generator`.
3. Wrap each endpoint handler with `Validate({ schema, schemaName })`.

## 1. Generate the schema

Add `ts-json-schema-generator` as a dev dependency in your `common` workspace:

```sh
yarn add -D ts-json-schema-generator
```

Add an npm script that emits a schema for the file containing your endpoint types:

```json
{
  "scripts": {
    "build:schema": "ts-json-schema-generator -f tsconfig.json --no-type-check -p src/api.ts -o src/api.schema.json"
  }
}
```

Then re-export it so both server and client can import it as JSON:

```ts
// common/src/index.ts
import schema from './api.schema.json' with { type: 'json' };
export { schema };
```

Make sure `resolveJsonModule: true` is in your `tsconfig.json`.

## 2. Validate on the server

Wrap the endpoint handler with `Validate({ schema, schemaName })`. The `schemaName` should match the type the request payload conforms to.

```ts
import type { RequestAction } from '@furystack/rest-service';
import { JsonResult, Validate } from '@furystack/rest-service';
import { schema } from 'common';
import type { CreateTodo } from 'common';

const createTodoEndpoint: RequestAction<CreateTodo> = Validate({
  schema,
  schemaName: 'CreateTodo',
})(async ({ getBody, injector }) => {
  const body = await getBody();
  const dataSet = injector.get(TodoDataSet);
  const todo = await dataSet.add(injector, body);
  return JsonResult(todo);
});
```

`Validate` checks **every** field of the request — `body`, `query`, `url`, `headers`. If something doesn't match the schema, the middleware short-circuits with a `400 Bad Request` and a verbose `ajv` error message describing exactly what failed. Your handler never runs with bad data.

## 3. Wire it into the API

Drop the validated handler into your `useRestService` call like any other endpoint:

```ts
import { useRestService } from '@furystack/rest-service';

await useRestService<TodoApi>({
  injector,
  port: 3000,
  root: '/api',
  api: {
    POST: {
      '/todos': createTodoEndpoint,
    },
  },
});
```

## What gets validated

Everything declared on the endpoint type:

```ts
export interface CreateTodo {
  body: { title: string; description?: string };
  query: { dryRun?: boolean };
  result: { id: string };
}
```

The `Validate` middleware enforces:

- Required fields (`title` must be present)
- Type correctness (`title` must be a string, `dryRun` must be a boolean)
- Optionality (missing `description` is fine; missing `title` is a `400`)
- Nested objects, unions, intersections, string literals, regex constraints — anything `ts-json-schema-generator` can express.

## Tips

- **Add `additionalProperties: false`** to your schema if you want unknown fields to fail validation. By default they pass through silently.
- **Regenerate the schema in CI** alongside your other build steps — it's a sync between two source-of-truth descriptions of your API, and a stale schema can hide drift.
- **Reuse the schema on the client** for early form validation if you want — but the server is still the trust boundary.

## Where to look next

- [REST](/getting-started/rest/) — designing the API interface that the schema is generated from.
- [Repository](/getting-started/repository/) — DataSet authorization callbacks pair naturally with `Validate` for "is this payload well-formed _and_ are you allowed to do this?"
