---
title: 'Shades 12: The VNode Refactor'
author: [gallayl]
tags: ['shades']
date: '2026-03-05T18:00:00.000Z'
draft: false
image: img/013-vnode.jpg
excerpt: Shades v12 replaces the rendering engine with a VNode-based reconciler and drops lifecycle callbacks in favor of hooks — here's the full story.
---

## Why rewrite the renderer

Shades had a beautifully dumb rendering model: your `render()` function spits out real DOM elements, the framework diffs them against what's already on screen, and patches the differences. Simple, honest, easy to reason about... and wasteful. Every single render cycle spun up a full shadow DOM tree _just to throw it away after comparison_. That's a lot of garbage collection for what often boils down to changing one text node.

v12 rips that out and replaces it with a **VNode-based reconciler**. Now the JSX factory produces lightweight descriptor objects — plain JS, no DOM involved. The reconciler diffs the old VNode tree against the new one and pokes the real DOM only where something actually changed. No throwaway trees. No phantom elements. Just surgical updates.

## Hooks in, lifecycle callbacks out

The old API had three separate lifecycle hooks: `constructed`, `onAttach`, and `onDetach`. Three places to scatter your setup and teardown logic, three sets of timing semantics to keep in your head. In v12, they're all gone — consolidated into one composable primitive: **`useDisposable`**.

```typescript
// Before — lifecycle spaghetti
Shade({
  shadowDomName: 'my-component',
  constructed: ({ element }) => {
    const listener = () => { /* ... */ }
    window.addEventListener('click', listener)
    return () => window.removeEventListener('click', listener)
  },
  render: () => <div>Hello</div>,
})

// After — setup and cleanup live together, right where you use them
Shade({
  shadowDomName: 'my-component',
  render: ({ useDisposable }) => {
    useDisposable('click-handler', () => {
      const listener = () => { /* ... */ }
      window.addEventListener('click', listener)
      return { [Symbol.dispose]: () => window.removeEventListener('click', listener) }
    })
    return <div>Hello</div>
  },
})
```

The `element` parameter is also gone. Reaching into the host element and mutating it imperatively was always a bit... rebellious for a declarative framework. Say hello to **`useHostProps`** instead — it lets you declare attributes, styles, CSS custom properties, ARIA attrs, and event handlers without ever touching the DOM yourself:

```typescript
render: ({ useHostProps, props }) => {
  useHostProps({
    'data-variant': props.variant,
    style: { '--color': colors.main },
  })
  return <button>{props.label}</button>
}
```

And for those moments when you _do_ need a handle on a child element (focusing an input, measuring a bounding rect), there's **`useRef`** — no more `querySelector` treasure hunts through the shadow DOM:

```typescript
render: ({ useRef }) => {
  const inputRef = useRef<HTMLInputElement>('input')
  return <input ref={inputRef} />
  // Later: inputRef.current?.focus()
}
```

## Batched updates (a.k.a. stop re-rendering so much)

`updateComponent()` used to be synchronous. Fire three observable changes in a row? Enjoy your three render passes. In v12, updates go through `queueMicrotask` and get coalesced — hammer as many observables as you want within a synchronous block and the component renders _once_. The new `flushUpdates()` utility lets tests await pending renders properly, so you can finally delete those sketchy `sleepAsync(50)` calls.

## SVG — for real this time

Shades now handles SVG elements as first-class citizens. Elements are created with `createElementNS` under the correct namespace, attributes go through `setAttribute` instead of property assignment (because SVG is picky like that), and there's a full set of typed interfaces covering shapes, gradients, filters, and animations. Your editor's autocomplete will thank you.

## Migration cheat sheet

| Gone                            | Use this instead                         |
| ------------------------------- | ---------------------------------------- |
| `constructed` callback          | `useDisposable` in `render`              |
| `element` in render options     | `useHostProps` hook                      |
| `onAttach` / `onDetach`         | `useDisposable`                          |
| Synchronous `updateComponent()` | Async batched updates + `flushUpdates()` |

## What's next

The v12.x train keeps rolling — we've already shipped dependency tracking for `useDisposable`, a `css` property for component-level styling with pseudo-selectors, and a brand new routing system. Stay tuned for a dedicated post on the `NestedRouter`.

Want to take it for a spin? `npm install @furystack/shades@latest` and check the [changelog](https://github.com/furystack/furystack/blob/develop/packages/shades/CHANGELOG.md#1220---2026-02-22) for all the gory details.
