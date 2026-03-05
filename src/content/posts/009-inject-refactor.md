---
layout: post
title: A little bit of Inject refactor
author: [gallayl]
tags: ['inject']
image: img/009-inject-refactor.jpg
date: '2022-08-12T18:00:00.257Z'
draft: false
excerpt: Emitting decorator type data is doomed :(
---

## Why

As you can see, in FuryStack I've tried to take some steps to use only standardized APIs to maintain the supportability. As I started to work with new tools and framework, I've found some bottlenecks. The first big bad was the hacky [extension method support](/008-byebye-extension-methods/) that I've introduced in the beginning of the project, but I've found an another black sheep in the heart of the Typescript ecosystem - Decorator support.

In short: "[The emitDecoratorMetadata flag is intentionally not supported.](https://github.com/evanw/esbuild/issues/257#issuecomment-658053616)"

## Emm ok, what now? 😕

We had a feature in `Inject` that *was* build on a top of emitting type data and that was *constructor injection*. The syntax was like:

```ts
const injector = new Injector()
@Injectable()
class Service1 {
  constructor(public service2: Service2, public service3: Service3) {}
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

That's clear that we can't use this if we loose type data at runtime, so the idea was to pass down the constructor object at runtime - and try to maintain the simplicity of the old API.

## The new `Injected()` properties ✨

...so a new property-level decorator called `Injected()` was born.
The very same behavior with the new API looks like this:

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

### Some pros 👌
 - The consrtuctor instance is passed down as a variable - without emitting non-standard metadata and other black magic
 - The main behavior (lifetime, recursive resolution, etc...) remains the same

### ...and a few drawbacks 😿
 - Properties will be injected **after** constructing the instance - it means that you cannot use them in the constructor
 - A breaking change - again...
 - See the `!` operator? Yeah, it's a kind of "shortcut" for now...