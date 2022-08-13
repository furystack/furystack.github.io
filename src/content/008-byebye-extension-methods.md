---
layout: post
title: Bye-bye extension methods
author: [gallayl]
tags: ['FuryStack', 'core', 'filesystem-store', 'logging', 'mongodb-store', 'redis-store', 'repository', 'rest-service', 'security', 'sequelize-store', 'websocket-api', 'inject']
image: img/008-byebye-extension-methods.jpg
date: '2022-04-30T18:00:00.257Z'
draft: false
excerpt: Using extension methods was fun at the beginning but I've ran into more and more problems with them
---

### The Heritage from C#

It's not a big sectet that one of the main inspiration for FuryStack is the .NET (legacy and Core) stack where extension methods are quite common. The same can achieved in the JS world where everything is possible, every prototype can be hacked and it can be also type-safe.

### The Problem

The main problem in short that extending another module is _not officially supported_ by Typescript - however the type system can be hacked like _it was_ in FuryStack and as you can see in the following example:

```ts
import { Injector } from '@furystack/inject/dist/injector';

declare module '@furystack/inject/dist/injector' {
  export interface Injector {
    /**
     *  returns the current authorization status from the identity context
     */
    isAuthorized: (...roles: string[]) => Promise<boolean>;
  }
}

Injector.prototype.isAuthorized = async function (...roles) {
  return this.getInstance(IdentityContext).isAuthorized(...roles);
};

/** ...and the usage */

import '../path-to-my-extension';

const result = await injector.isAuthorized('admin');
```

...well, it works but I've ran into unexpected issues with conflicting import declarations and overrides. The problems appeared random, but somewhat based on the running context (ts-node, jest, browser) and it started to block dependency upgrades...

### How it works now

The extensions has been replaced by _helpers_, as you can see in the following example. These helpers are simple shortcuts - you should usually pass the injector (or the related manager class) to them as a parameter.
The imports are clear, as well as the execution path and the types.

```ts
import { isAuthorized } from '@furystack/core';

const result = await isAuthorized(injector, 'admin');
```

For more details, you can check out [this](https://github.com/furystack/furystack/commit/ba32902dba6bfbf8db4b1cc8a00861151999b71a#diff-45afbc003c3ca2cf0dac19a66d7aed4c4526c3df2ca00942e814970983e4ce84) commit.
