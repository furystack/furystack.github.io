---
layout: post
title: REST in peace
author: [gallayl]
tags: ['Getting Started', 'rest', 'rest-service', 'rest-client-fetch', 'rest-client-got']
image: img/006-getting-started-with-rest-cover.jpg
date: '2021-06-23T12:58:20.257Z'
draft: false
excerpt: Designing and implementing APIs can be hard and consuming them can be frustrating, if they doesn't work as expected. REST API as a Typescript interface to the rescue!
---

### The problem 🤷‍♂️

The old-fashioned approach is to decouple _nearly everything_, but (as a fullstack dev) when speaking about the relation between REST API's, there is a problem:

![Does clients depends on APIs?](img/006-joker.jpg)

So, let's dig deep into the good old S.O.L.I.D. principles, until the end of it, where **D** stands for **dependency inversion**... khm:

> Entities must depend on abstractions, not on concretions.

So, again, let's get this straight. The happy path should be:
1. Design an abstraction (interface) for the API
1. Implement your API
1. The client should depend on the abstraction, not the actual implementation

In FuryStack, there is 3 type of REST packages which are meant to solve the scenarios. In order:
1. `@furystack/rest` for the API design
1. `@furystack/rest-service` for the implementation
1. `@furystack/rest-client-fetch` and `@furystack/rest-client-got` for consuming the API

### Prerequisites 👈

To be able to use this ideal path, you have to share the abstraction between the service and the consumer / frontend.
The preferred way can be some kind of a Monorepo (see the Boilerplate app's approacth with Yarn Workspaces).
If you can't do that, you can still extract the definition to e.g. an NPM package. 

### Step One - Design your API first. 📐

If you want to achieve the first step, your API should have an abstraction. An interface. And that should be a.... (drumroll 🥁 )... **Typescript Interface** 🎉

The following example can give you the idea how you should implement the API

```ts
import {
  DeleteEndpoint,
  GetCollectionEndpoint,
  GetEntityEndpoint,
  PatchEndpoint,
  PostEndpoint,
  RestApi,
} from '@furystack/rest'

export interface Mock {
  id: string
  value: string
}

export interface CustomQuery {
  query: { foo: string; bar: number; baz: boolean }
  result: { foo: string; bar: number; baz: boolean }
}
export interface CustomUrl {
  url: { id: number }
  result: { id: number }
}
export interface CustomHeaders {
  headers: { foo: string; bar: number; baz: boolean }
  result: { foo: string; bar: number; baz: boolean }
}
export interface CustomBody {
  body: { foo: string; bar: number; baz: boolean }
  result: { foo: string; bar: number; baz: boolean }
}

export interface MyApi extends RestApi {
  GET: {
    '/custom-query': CustomQuery
    '/custom-url/:id': CustomUrl
    '/custom-headers': CustomHeaders
    '/mock': GetCollectionEndpoint<MockEntity>
    '/mock/:id': GetEntityEndpoint<MockEntity, 'id'>
  }
  POST: {
    '/custom-body': CustomBody
    '/mock': PostEndpoint<Mock, 'id'>
  }
  PATCH: {
    '/mock/:id': PatchEndpoint<Mock, 'id'>
  }
  DELETE: {
    '/mock/:id': DeleteEndpoint<Mock, 'id'>
  }
}
```

So the interface is build on two levels. The first level defines the HTTP method.

The second level is actually a _key-value pair_. The key will be the URL endpoint, the second one is the type in a predefined format.
The custom types can contain the following fields:
 - `result`: This will be the type of the response on success
 - `url`: An URL parameter object. This should be also part of the url (e.g. if you define the `{id: string}` as type, the `/:id` parameter)
 - `headers`: The required explicit headers
 - `query`: The query string parameters
 - `body`: The POST Body parameters

There are also some entity-related shortcut types in the example, e.g. `PatchEndpoint<T, TKey>` stands for `{ body: Partial<T>, url: { id: T[TPrimaryKey] }, result: undefined}`

### Step Two - Implement 🛠

OK, we've got a well-defined REST API with all the payloads, bodys, headers, bells and whistles. Now we can implement it, so let's move to the _service-side_.

So, an example API implementation overview looks like this:
```ts
const i = new Injector()
i.useRestService<MyApi>({
  port: 1234,       // The port that the app will use
  root: '/api/v1',  // The root path of your API
  api: {
    GET: {
      "/custom-headers": customHeadersEndpoint
    }
    /*(...and you should implement all endpoints here if you want to compile it. Good luck ;) )*/
  }
})
```

So, the basic structure is similar to the interface, you should use the `.useRestService<T>()` injector extension with some basic options like the port or root path.
The `api` should follow the same structure as the definition, but the `customHeadersEndpoint` should implement the endpoint `CustomHeaders`. So let's take a look at this:

```ts
const customHeadersEndpoint: RequestAction<CustomHeaders> = async ({ headers }) => {
  console.log(headers) // The type is inferred from CustomHeaders: { foo: string; bar: number; baz: boolean }
  return JsonResult(headers) // This should also match the `result` type
}
```

The magical part is covered by the `RequestAction<CustomHeaders>`. This generic type tells that this
 - Should be an async method
 - Will recieve headers with a specified type
 - Should return the JsonResult with a specified type

The other properties will be also inferred:
 - if there is `{ url: T }` defined on the interface, you will have `getUrlParams: ()=> T` in the parameter object
 - if there is `{ body: T }` defined, you will get `getBody: () => Promise<T>` in the parameter object
 - if there is `{ query: T }` defined, you will get `getQuery: () => T`

### Consume your interface, not your API 🍽

OK, we have an interface and an implementation. The interface is shared between the service and the client. So let's take a look how the client can consume the API.
Let's take a simple approacth with the native `fetch` implementation (there's also a `got`-based client implementation that can be used in node-based clients as well)

```ts
import { createClient } from '@furystack/rest-client-fetch'

const callMyApi = createClient<MyApi>({
  endpointUrl: `http://localhost:1234/api/v1`,
})

const result = await callMyApi({
  method: 'GET',    // This should be the first property in order to work with Intellisense
  action: '/custom-headers', // After selecting the action from the list, other required properties will be inferred and required
  headers: {
    foo: 'asd',
    bar: 42,
    baz: false,
  },
})
```

So, step by step:
1. Select a method
1. All available actions will be offered by IntelliSense
1. Once you've selected an action, the full payload will be inferred. You will get type checks in header, body, query, url, etc... parameters. The response type will be also there for you 💚

### The main gotcha: Let's break all the thingzzz!!!!4!!!💥

There's an ancient refactoring technique in the _type-safe dreamlands_: If you can change your type definitions and try to recompile, you will see immediately where it will break your code.
We have good news: **Now you can do that with your API definition** - your backend service and your frontend app will is type-protected now 🙌

![hulk breaks thingz](img/006-hulk.gif)