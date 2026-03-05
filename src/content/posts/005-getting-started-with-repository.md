---
layout: post
title: Build a business layer with a Repository
author: [gallayl]
tags: ['Getting Started', 'repository']
image: img/005-getting-started-with-repository-cover.jpg
date: '2021-06-23T10:58:20.257Z'
draft: false
excerpt: A Repository is the next layer above the data stores. When setting up a repository, you can create DataSets that can rely on a previously configured physical store. The difference is that while PhysicalStore focuses on the data, DataSet focuses on business logic. You can authorize, check permissions, subscribe to entity changes, etc...
---

### Disclaimer


>  If you are using a repository, use the repository all the time. - Anonymous

As callbacks, authorization and data manipulation works through the Repository layer, you should always use Repository if you have dependant business logic through it.

### Simplifying a complex idea

Let's say you have an entity type. You have to be notified each and every time somebody creates a new instance.
You also have to take care about that new entities should have some validation.

```ts
class MyEntity {
  public key!: number
  public value!: string
}

const myInjector = new Injector()
  .setupStores((sm) => sm.addStore(new InMemoryStore({ model: MyEntity, primaryKey: 'key' })))
  .setupRepository((repo) =>
    repo.createDataSet(MyEntity, 'key', {
      authorizeAdd: async ({ entity }) => {
        if (entity.value && entity.value.length > 2)
          return {
            isAllowed: true,
          }
        return {
          isAllowed: false,
          message: `Failed to create entity. The value length should be greater than 2 but was ${
            entity.value?.length
          }. Entity: ${JSON.stringify(entity)}`,
        }
      },
    }),
  )

const dataSet = myInjector.getDataSetFor(MyEntity, 'key')

dataSet.onEntityAdded.subscribe(({ entity }) => {
  console.log('Hey, a new entity has been added', entity)
})

dataSet.add(myInjector, { key: 1, value: 'a' }) // Will fail
dataSet.add(myInjector, { key: 1, value: 'asd' }) // Will pass and will be logged to the console

```

### Event subscriptions

You can subscribe to the following events in your Repository:
 - `onEntityAdded` will notify you when a new entity has been created
 - `onEntityUpdated` will fire on updates
 - `onEntityRemoved` will notify about the deletions

 ### Authorizing operations

 You can define authorization / validation during you create the DataSet. These callbacks are the followings:
  - `authorizeAdd` will verify entities before adding / inserting them into the stores
  - `authorizeGet` / `authorizeGetEntity` will check that you can get that single entity (also `authorizeGetEntity` won't check collections)
  - `authorizeUpdate` / `authorizeUpdateEntity` will verify before update. `authorizeUpdate` won't load the entity from the Store (you won't have as a parameter) while `authorizeUpdateEntity` does
  - `authorizeRemove` / `authorizeRemoveEntity` will fire before remove. Again, `authorizeRemoveEntity` loads the whole entity from the store before deleting it.
  - with `addFilter`, you can append conditions to your filter expressions to narrow collection queries and optimize performance

### Manipulating Data

There are also two callbacks that allows you to modify data: with `modifyOnAdd` and `modifyOnUpdate`, you can update data in some fields like e.g. `createdByUser` or `lastModificationDate`

### Getting the Context

All methods above has an _injector_ instance on the call parameter - you can use that injector to get service instances from the right caller context. It means that you can e.g.: get the current user in the following way.

```ts
      authorizeAdd: async ({ injector }) => {
        const currentUser = await injector.getCurrentUser()
        if (currentUser.roles.find((role) => role === 'CanAddMyEntity'))
          return {
            isAllowed: true,
          }
        return {
          isAllowed: false,
          message: "The user doesn't have the role 'CanAddMyEntity'",
        }
      },
```