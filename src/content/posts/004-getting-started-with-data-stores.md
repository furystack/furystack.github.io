---
layout: post
title: Let's store some freaking data 📦
author: [gallayl]
tags: ['Getting Started', 'core', 'filesystem-store', 'sequelize-store', 'mongodb-store', 'redis-store']
image: img/004-getting-started-with-data-stores-cover.jpg
date: '2021-06-23T09:58:20.257Z'
draft: false
excerpt: Where should you store your data? SQL, NOSQL, InMemory or on a sticky note on the back of your pillow? Doesn't matter if you have a PhysicalStore implementation...
---

### About Physical stores

In FuryStack, the preferred mode of accessing data is via physical stores. A [physical store](https://github.com/furystack/furystack/blob/develop/packages/core/src/models/physical-store.ts) is a bare minimum interface that a store should do. A store is always bound to a collection with a specified type of entities. It can only do the basic CRUD operations (create, get by Id, filter, delete, count). These stores should **not have a concept about relations**, indexes and other storage-specific stuff. Data stores **doesn't care about permission**, role or session checking.

### Store setup

The setup is quite straightforward - create your entity class (the class itself will be used as a primary key and the fields for type checking) you can use the extension method called `.setupStores()` on the Injector:


```ts
class MyEntity {
  public key!: number
  public value!: string
}

export const myInjector = new Injector().setupStores((sm) =>
  sm.addStore(new InMemoryStore({ model: MyEntity, primaryKey: 'key' })),
)
```

### Basic usage

You can retrieve your store from any injector with `myInjector.getInstance(StoreManager).getStoreFor(MyEntity)`. You will receive a PhysicalStore instance and you can do all the basic operations mentioned above.

### What type of store(s) should you choose?
 - **InMemoryStore** is the simplest implementation and a part of the Core package. Data won't be persisted but no hassle with additional dependencies. Can be used for POCs or for e.g. storing user sessions or in a demo / experimental enviromnent
 - **filesystem-store** is another simple implementation, it saves (and reloads on change) your data to files, however it's recommended to use only in development / experimental environments. Lives in a `@furystack/filesystem-store` package.
 - **sequelize-store** is built on the top of the Sequelize package and you can create stores with all of it's supported DBs (MySQL / Postgres / SQLite, etc...). Recommended if you want to work with any supported SQL-based DB.
 - **mongodb-store** provides a store implementation for the famous document store. Simple yet powerful usage.
 - **redis-store** allows you to connect to a redis service. Useful is you want e.g. storing user sessions and keep them in sync between multiple web nodes. Altough searching is not supported...