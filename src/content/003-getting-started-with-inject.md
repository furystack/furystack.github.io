---
layout: post
title: 'DI / IOC with @furystack/inject 💉'
author: [gallayl]
tags: ['Getting Started', 'inject']
image: img/003-getting-started-with-inject-cover.jpg
date: '2021-06-23T08:58:20.257Z'
draft: false
excerpt: Dependency injection and Inversion of control is a common practice that tries to protect you from insanity that would happen when you realize that you can't refactor and test a giant global static app structure. @furystack/inject is a simple but powerful tool that you can use in NodeJs and in the browser. 
---


## Injectable services
An _injectable service_ is basically a class, decorated with the `@Injectable()` decorator. If you decorate a class, its injectable options (e.g. lifetime) will be stored and the injector will be able to instantiate a new instance any time. You can also decorate properties with the `@Injected(Type)` decorator to inject them after instantiating the object. Take a look at the following example and you'll get the idea:

```ts
const injector = new Injector()
@Injectable()
class Service1 {
  @Injected(Service2)
  public service2!: Service2

  @Injected(Service3)
  public service2!: Service3
}
@Injectable()
class Service2 {
  public value = 'foo'
}
@Injectable()
class Service3 {
  public value = 'bar'
}
expect(injector.getInstance(Service1).service2.value).toBe('foo')
expect(injector.getInstance(Service1).service2.value).toBe('bar')
```

All of the 3 classes are decorated as an injectable service. If you request an instance of 'Service1', the framework will also provide an instance of the two dependencies as well.


## Injector
An `Injector` is basically an _extendable container_ that instantiates services with dependencies and handles their lifecycles. The most used and most important method is the `injector.getInstance(MyServiceClass)` that returns with an instance from a requested service. Injectors are smart enough to handle lifecycles (e.g. "singleton" services will be constructed once per injector).

You can create multiple injectors in your project, they can act as multiple separated "global" containers.

You can also organize injectos in a tree structure in the following way:

```ts
const childInjector = injector.createChild({ owner: 'myCustomContext' })
```

Creating _child injectors_ can be useful if you want to store contextual data (e.g. a per-http-request context that should be initialized once)

## Lifecycles
The package defines four types of lifecycle:
 - **Transient** injectables are not cached - if you request an instance, you will get a new one every time.
 - **Scoped** injectables are cached, but only on the current level. If a service has been created in a current injector, the existing instance will be returned.
 - **Singleton** injectables are hoisted to the root injector. If you request a singleton, the injector will check create the instance in it's highest parent - and also returns it from there, if already exists.
 - **Explicit** values are not really injectables - you can call `injector.setExplicitInstance(myServiceInstance)` to set up an instance manually. Just like scoped services, explicit instances will be returned from the current scope only.

## ~~Extension methods~~

[(We have already said goodbye to extension methods)](/008-byebye-extension-methods/)

A simple injector can be easily extended by 3rd party packages with extension methods, just like the FuryStack packages. These extension methods usually provides a _shortcut_ of an instance or sets up a preconfigured explicit instance of a service. You can build clean and nice fluent API-s in that way - you can get the idea from one of the [FuryStack Injector Extensions](https://github.com/furystack/furystack/blob/develop/packages/rest-service/src/injector-extensions.ts)

You find more inject-related articles [here](/tags/inject) or check out the package at NPM

[![npm](https://img.shields.io/npm/v/@furystack/inject.svg?maxAge=3600)](https://www.npmjs.com/package/@furystack/inject)