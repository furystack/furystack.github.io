---
layout: post
title: Showcase-time
author: [gallayl]
tags: ['shades', 'shades-common-components', 'shades-showcase-app']
image: img/010-showcase-app.jpg
date: '2022-08-16T21:00:00.257Z'
draft: false
excerpt: Updates on Shades - Kick-ass DataGrid updates, fragments and a brand new Showcase app
---

## Fragments 🔪

Using [fragments](https://reactjs.org/docs/fragments.html) in React is not a new concept so I've implemented this also in Shades. The concept is the same - you can avoid unneccessary DOM nesting with them. The syntax is also the same - you can check out some [common component code](https://github.com/furystack/furystack/blob/e6edd24c9a196f56ba5b3b2dd65f062c8d68cdd5/packages/shades-common-components/src/components/data-grid/body.tsx#L52) to get the idea.

```tsx
export const HelloWorld = Shades({
    shadowDomName: 'shades-hello-world',
    render: ()=> <>
        <p>Hello</p>
        <p>World</p>
    </>
})
```

## Compare component states 🔎

Now the [state comparison API](https://github.com/furystack/furystack/blob/e6edd24c9a196f56ba5b3b2dd65f062c8d68cdd5/packages/shades/src/shade.ts#L41) has been opened up - you can optimize the performance of your components to avoid unneccessary re-renders.

## DataGrid upgrades

One of the most powerful component in Shades is the `<DataGrid />`. It can be easily extended with custom view components, ordering, filtering, etc... but I've implemented more goodies recently.

### Focused item 👓

Now you can focus on an item (at row level) by just simply clicking on it. The Grid and the `CollectionService` will update an observable (you can also use the same service at cell level). Only one item *can have* focus at the same time.

### Selection ☑️

The DataGrid (and the underlying `CollectionService`) now have an info about what *row* or *rows* are currently selected. Row selection can be used e.g. to trigger a bulk operation on items (e.g. bulk delete some entries)

### Keyboard shortcuts and mouse getsures ⌨️

Usability has been also improved with the followings:
 - **Up/down** keys moves the focus up/down
 - The focused item will be scrolled into the view, if neccessary
 - **Space** toggles the *selection* of the current item
 - **Insert** toggles the selection of the current item and moves the focus down
 - **\+ / -** keys selects / deselects all items
 - **\*** key inverts the selection
 - **CTRL + Mouse click** toggles the selection of the clicked element and also updates the focus
 - **SHIFT + Mouse click** *selects* all element between the old focused one and the *clicked* one, also updates the focus

### Some thoughts on the performance ⚡

Performance is a *key concept* when working with grids. The underlying CollectionService and its observables serve the reson to avoid re-rendering the whole grid when something (e.g. a selection) changes.

## And finally, The Showcase App 🏪

I've started to work on a "Showcase App" with Shades in the FuryStack monorepo. I wanted to try out some controls and mechanisms inside the monorepo and also speed up component development - so I've created a new package called `@furystack/shades-showcase-app`. 

It's also deployed via Netlify so you can check it out right now ;)

Pls visit [https://shades-showcase.netlify.app/](https://shades-showcase.netlify.app/)

It contains the followings:
 - Demo for a Grid with an in-memory random collection with the new features ✨
 - Demo for a Shades wrapper of my favorite joystick component called [NippleJS](https://yoannmoi.net/nipplejs/) 🕹️
 - Demo for my favourite Semi-IDE in Shades called Monaco Editor 📝
 - Demo page for Inputs (I want to extend this in a near future)
 - Demo page for Buttons
 - A simple lorem ipsum welcome page 😁
 - And last but not least, a light / dark theme switch 😉

Regarding the Showcase App, I've also experimented with some interesting new tools (esbuild, playwright), I want to write about in the near future. Cheeers :)