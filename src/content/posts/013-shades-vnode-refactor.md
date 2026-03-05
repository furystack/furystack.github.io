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

Shades has always had a simple rendering model: your `render()` function returns real DOM elements, the framework diffs them against the current tree, and patches the differences. It works — but it has a cost. Every render cycle creates a full shadow DOM tree just to compare it with the one on screen, even if nothing meaningful changed. That's a lot of allocation pressure and GC work for what often amounts to updating a single text node.

The v12 release replaces this with a **VNode-based reconciler**. Instead of creating real DOM elements during render, the JSX factory produces lightweight descriptor objects. A reconciler diffs the previous VNode tree against the new one and applies surgical DOM updates using tracked element references. No throwaway DOM trees, no redundant element creation.

## New hooks, fewer lifecycle callbacks

The old API surface had three separate lifecycle entry points: `constructed`, `onAttach`, and `onDetach`. Each had its own timing semantics and cleanup patterns. In v12, all three are gone — replaced by a single, composable primitive: **`useDisposable`**.

```typescript
// Before — scattered lifecycle management
Shade({
  shadowDomName: 'my-component',
  constructed: ({ element }) => {
    const listener = () => { /* ... */ }
    window.addEventListener('click', listener)
    return () => window.removeEventListener('click', listener)
  },
  render: () => <div>Hello</div>,
})

// After — setup and teardown live together in render
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

The `element` parameter — direct access to the host custom element — is also gone. Imperatively mutating the host was always a bit at odds with a declarative component model. The replacement is **`useHostProps`**, which lets you set attributes, styles (including CSS custom properties), ARIA attributes, and event handlers declaratively:

```typescript
render: ({ useHostProps, props }) => {
  useHostProps({
    'data-variant': props.variant,
    style: { '--color': colors.main },
  })
  return <button>{props.label}</button>
}
```

There's also a new **`useRef`** hook for capturing child element references — no more querying the shadow DOM manually:

```typescript
render: ({ useRef }) => {
  const inputRef = useRef<HTMLInputElement>('input')
  return <input ref={inputRef} />
  // Later: inputRef.current?.focus()
}
```

## Batched updates

`updateComponent()` used to render synchronously. Call it three times in a row and you'd get three render passes. In v12, updates are scheduled via `queueMicrotask` and coalesced — multiple observable changes within the same synchronous block produce a single render pass. The new `flushUpdates()` utility gives tests a reliable way to wait for pending renders without arbitrary `sleepAsync` calls.

## SVG support

Shades now handles SVG elements natively. Elements are created with `createElementNS` under the correct namespace, and attributes are applied via `setAttribute` instead of property assignment. A full set of typed SVG attribute interfaces covers shapes, gradients, filters, and animations — so you get proper autocompletion in your editor.

## Migration at a glance

| Removed                         | Replacement                              |
| ------------------------------- | ---------------------------------------- |
| `constructed` callback          | `useDisposable` in `render`              |
| `element` in render options     | `useHostProps` hook                      |
| `onAttach` / `onDetach`         | `useDisposable`                          |
| Synchronous `updateComponent()` | Async batched updates + `flushUpdates()` |

## What's next

The subsequent v12.x releases have already landed dependency tracking for `useDisposable`, a `css` property for component-level styling with pseudo-selectors, and a brand new routing system. The framework is moving fast — stay tuned for a dedicated post on the new `NestedRouter`.

If you want to try it out: `npm install @furystack/shades@latest` and check the [changelog](https://github.com/furystack/furystack/blob/develop/packages/shades/CHANGELOG.md#1220---2026-02-22) for the full details.
