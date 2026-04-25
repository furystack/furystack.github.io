---
title: 'Themes All the Way Down'
author: [gallayl]
tags: ['shades', 'shades-common-components', 'shades-showcase-app']
date: '2026-03-24T12:00:00.000Z'
draft: false
image: img/016-shades-theme-system.jpg
excerpt: "FuryStack Shades ships 19 themes, 90+ CSS variables, scoped nesting, and a ThemeProviderService that turns your entire design system into a runtime dial — here's how it actually works under the hood."
---

Last time we [talked about the Showcase App](/posts/014-showcase-updates/), we casually name-dropped **19 themes** and moved on like that's a normal thing. Time to actually explain what's going on under the hood — because the theme system in Shades is not a color picker bolted on as an afterthought. It's a full design token architecture that controls colors, typography, spacing, shadows, border radii, transitions, blur effects, z-indices, and probably your emotional state if you spend enough time with the Sith palette.

## The Theme interface: more than meets the eye

Most UI libraries give you a "theme" that's basically `{ primary: '#3f51b5', secondary: '#1de9b6' }` and call it a day. Cute. Shades decided that was insufficiently over-engineered and went _much_ further.

The `Theme` interface defines the complete design language for an application:

```typescript
export interface Theme {
  name: string;
  palette: Palette; // 6 semantic colors × 3 shades × 2 (color + contrast) = 36 color tokens
  text: Text; // primary, secondary, disabled
  button: ButtonColor; // active, hover, selected, disabled, disabledBackground
  background: Background; // default, paper, paperImage (yes, paper can have a background image)
  divider: Color;
  action: ActionColors; // hover, selected, active backgrounds + focus ring + backdrop + subtle border
  shape: Shape; // border radius scale (xs → full) + border width
  shadows: Shadows; // none → sm → md → lg → xl
  typography: ThemeTypography; // font family, 8 font sizes, 4 weights, 3 line heights, 6 letter spacings, text shadow
  transitions: Transitions; // 3 durations + 3 easings
  spacing: Spacing; // xs through xl
  zIndex: ZIndex; // drawer, appBar, modal, tooltip, dropdown
  effects: Effects; // 4 blur levels
}
```

That's roughly **90+ individually configurable design tokens** per theme. Change a theme, and _everything_ shifts — not just the background color, but how round buttons are, how text shadows render, which font loads, how fast transitions animate, and how thick borders appear. It's a full sensory overhaul.

The `Palette` alone would make a color theorist cry tears of well-contrasted joy:

```typescript
export interface Palette {
  primary: ColorVariants; // light, main, dark + contrast pairs for each
  secondary: ColorVariants;
  error: ColorVariants;
  warning: ColorVariants;
  success: ColorVariants;
  info: ColorVariants;
}
```

Each semantic color comes in three shades (light, main, dark), and every shade carries a `contrast` color that's guaranteed to be readable on top of it. No more "is white or black text better on this particular shade of teal?" — the theme already answered that question for you.

## The CSS variable bridge

Here's where the architecture gets interesting. Components in Shades don't import theme colors directly. They reference CSS custom properties. Every. Single. Token.

The `cssVariableTheme` object is a `Theme` where every value is a `var(--shades-theme-*)` reference:

```typescript
export const cssVariableTheme = {
  name: 'css-variable-theme',
  text: {
    primary: 'var(--shades-theme-text-primary)',
    secondary: 'var(--shades-theme-text-secondary)',
    disabled: 'var(--shades-theme-text-disabled)',
  },
  palette: {
    primary: {
      main: 'var(--shades-theme-palette-primary-main)',
      mainContrast: 'var(--shades-theme-palette-primary-main-contrast)',
      // ... you get the idea
    },
    // ... 5 more semantic colors
  },
  typography: {
    fontFamily: 'var(--shades-theme-typography-font-family)',
    fontSize: {
      xs: 'var(--shades-theme-typography-font-size-xs)',
      // ... 7 more sizes
    },
    // ... weights, line heights, letter spacing
  },
  // ... shadows, spacing, transitions, effects, zIndex, shape, action, button, background
} satisfies Theme;
```

When you build a component, you grab `cssVariableTheme` and use it in your styles:

```typescript
const theme = cssVariableTheme;

const myStyles = {
  color: theme.text.primary,
  backgroundColor: theme.background.paper,
  borderRadius: theme.shape.borderRadius.md,
  fontFamily: theme.typography.fontFamily,
  transition: buildTransition([
    'background',
    theme.transitions.duration.normal,
    theme.transitions.easing.default,
  ]),
};
```

Your component never knows or cares which concrete theme is active. It just points at CSS variables and trusts that _someone_ will fill them in. That someone is `useThemeCssVariables()`.

## How theme activation works

The `useThemeCssVariables()` function takes a theme object (the one with _actual_ hex values, font names, pixel sizes, etc.) and recursively walks the `cssVariableTheme` tree. For every leaf, it calls `root.style.setProperty()` to assign the concrete value to the corresponding CSS custom property:

```typescript
export const useThemeCssVariables = (theme: DeepPartial<Theme>, root?: HTMLElement) => {
  root ??= document.querySelector(':root') as HTMLElement;
  assignValue(cssVariableTheme, theme, root);

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
    setCssVariable(cssVariableTheme.transitions.duration.fast, '0s', root);
    setCssVariable(cssVariableTheme.transitions.duration.normal, '0s', root);
    setCssVariable(cssVariableTheme.transitions.duration.slow, '0s', root);
  }
};
```

Two things to notice here. First, the theme is `DeepPartial<Theme>` — you can provide _only_ the tokens you want to override, and the rest get removed (falling back to whatever the parent scope provides). Second, it automatically respects `prefers-reduced-motion` by zeroing out all transition durations. Accessibility baked in at the variable layer. No component-level checks needed.

The `ThemeProviderService` wraps this into an injectable singleton with event emission:

> ⚠️ **Outdated API.** `ThemeProviderService` was declassed in the functional-DI rewrite and is now a plain-object factory behind a singleton token. The API surface (`setAssignedTheme`, `themeChanged` events, the `theme` accessor) is unchanged; only the declaration shape moved. See the [Dependency Injection](/getting-started/inject/) guide for the current pattern.

```typescript
@Injectable({ lifetime: 'singleton' })
export class ThemeProviderService extends EventHub<{ themeChanged: DeepPartial<Theme> }> {
  public readonly theme = cssVariableTheme;

  public setAssignedTheme(theme: DeepPartial<Theme>, root?: HTMLElement) {
    this._assignedTheme = theme;
    useThemeCssVariables(theme, root);
    this.emit('themeChanged', theme);
  }
}
```

Call `setAssignedTheme()` with your theme object, and _every component in the tree_ instantly picks up the change — no re-render, no prop drilling, no context providers. The CSS variables update, the browser repaints, done. It's refreshingly boring in the best possible way.

## Nested themes: the real party trick

See that `root?: HTMLElement` parameter on `setAssignedTheme()`? That's where things get spicy.

By default, CSS variables are set on `:root` — the document element. Every component in the page sees them. But if you pass a specific DOM element as `root`, the variables are scoped to that subtree. Children of that element inherit the overridden values; everything outside remains untouched.

This means you can do things like this: render a Jedi theme on the left half of the screen and a Sith theme on the right, simultaneously, with zero interference. The Showcase App's Themes page does exactly this — multiple theme previews side by side, each living inside its own scoped `ThemeProviderService`. Light side, dark side, same page, no conflicts.

Because the scoping mechanism is just CSS custom property inheritance, nested themes compose naturally. A subtree can override only its palette and inherit everything else from the parent. Or it can replace the entire theme. Or it can do something truly cursed like running Neon Runner typography inside a Wild Hunt color scheme. The system won't judge you. TypeScript might, if you look at it hard enough.

## The 19 themes: a guided tour

### The sensible defaults

Every theme system needs a sane starting point. Shades ships two:

- **Default Dark** — `#121212` background, Material Design–influenced indigo/teal palette, `system-ui` font stack. Clean, professional, zero surprises. The "I just want my app to look good without thinking about it" option.
- **Default Light** — the inverse. Light backgrounds, adjusted contrast ratios, the same design language flipped. Still boring. Still exactly what you need.

### The pop culture collection

Then there are the other 17 themes, and they are... _thematic_.

Every franchise-inspired theme doesn't just swap colors — it reconfigures the entire design language. Font families change. Border radii shift. Shadow intensities adjust. Transition easings get personality. Here's a sampling to illustrate how far apart these themes actually sit:

**Neon Runner** — _"Wake up, Samurai. We have a city to burn."_

Cyberpunk to the bone. `#0a0e17` background (basically the void, but darker). Electric cyan `#00f0ff` primary with hot magenta `#ff2d95` secondary. Monospace `Share Tech Mono` typography. Razor-sharp `3px` border radii. Shadows have a subtle neon glow (`rgba(0, 240, 255, 0.08)`). Even the letter spacing is wider — because in Night City, characters need their personal space.

**Wild Hunt** — _"Wind's howling."_

Medieval fantasy in CSS form. `Cinzel` serif font — because nothing says "witcher medallion" like old-world typography. Border radius is `0px` across the board. Every corner is a hard edge, every surface is a weathered stone wall. The `paper` background even has an SVG-based `paperImage` for texture. The color palette is steel-silver and crimson, like a freshly polished silver sword right before things go badly for the nearest drowner.

**Plumber** — _"It's-a me, Mario!"_

The _anti_-Wild Hunt. `Nunito` rounded sans-serif, `12px` border radii everywhere, bright `#f8f8ff` background. Nintendo red primary (`#e60012`), pipe-green success colors. The `easeOut` easing uses `cubic-bezier(0.34, 1.56, 0.64, 1)` — that's an overshoot bounce. Buttons literally _bounce_ when they animate. The font weights skew heavier (`medium: 600`, `bold: 800`) because in the Mushroom Kingdom, subtlety is not a power-up.

**Architect** — _"There is no spoon."_

**Sandworm** — _"The spice must flow."_

**Replicant** — _"All those moments will be lost in time, like tears in rain."_

**Black Mesa** — _"Rise and shine, Mr. Freeman. Rise and shine."_

...and the list goes on. Each one is a full `Theme` object with 90+ carefully chosen tokens. Not a CSS filter on top of the dark theme. Not "the same layout but blue." These are _designed_.

## The anatomy of a theme file

Every theme in the `themes/` directory follows a two-file pattern:

1. **`<name>-palette.ts`** — exports a `Palette` object with the 6 semantic colors and their variants
2. **`<name>-theme.ts`** — imports the palette and builds the full `Theme` object around it

The palette is separated because it's the most reusable piece. You might want the Neon Runner color scheme but with your own typography and spacing. Import the palette, compose the rest yourself.

```typescript
import { neonRunnerPalette } from './neon-runner-palette.js';
import type { Theme } from '../services/theme-provider-service.js';

export const neonRunnerTheme = {
  name: 'neon-runner-theme',
  palette: neonRunnerPalette,
  typography: {
    fontFamily: "'Share Tech Mono', 'Fira Code', 'JetBrains Mono', 'Courier New', monospace",
    // ...
  },
  shape: {
    borderRadius: { xs: '2px', sm: '3px', md: '4px', lg: '6px', full: '50%' },
    borderWidth: '1px',
  },
  // ... rest of the theme
} satisfies Theme;
```

Note the `satisfies Theme` at the bottom. This is intentional — it validates the object against the `Theme` interface without widening the type. The theme retains its literal types, which means you get autocomplete on the exact values when you need to reference them directly. Type safety without type erasure.

## Monaco integration

The Showcase App doesn't stop at "the background color matches." The embedded Monaco editor reads the active theme's CSS variables and generates a matching editor color scheme on the fly. Switch to Neon Runner, and your code editor turns into a cyberpunk terminal with cyan syntax highlighting. Switch to Wild Hunt, and suddenly your function signatures look like inscriptions on an ancient scroll.

This works because Monaco supports programmatic theme definitions. The showcase maps the Shades palette tokens to Monaco's color entries: `editor.background` gets `background.paper`, `editor.foreground` gets `text.primary`, token colors derive from the palette's primary and secondary variants. One theme object, two rendering engines, zero manual sync.

## Lazy loading: because 19 themes at startup is a war crime

Every theme module is lazy-loaded. The Showcase App imports them dynamically:

```typescript
const loadTheme = (name: string) => import(`./themes/${name}-theme.js`);
```

Switch to Plumber, and only then does the Mario-red palette land in the browser. The initial bundle carries only the default theme and the `cssVariableTheme` indirection layer. The other 18 themes sit quietly on the server until someone actually asks for them. Your Lighthouse score is safe.

## Building your own theme

Creating a custom theme is straightforward:

1. Define your `Palette` — 6 colors, 3 shades each, with contrast pairs
2. Build your `Theme` — fill in every section or spread from `defaultDarkTheme` and override what you want
3. Use `satisfies Theme` for validation
4. Call `themeProviderService.setAssignedTheme(yourTheme)`

Because the theme is `DeepPartial`, you can also do surgical overrides:

```typescript
themeProviderService.setAssignedTheme({
  palette: { primary: { main: '#ff6600', mainContrast: '#000000' } },
  typography: { fontFamily: "'Comic Sans MS', cursive" },
});
```

That technically works. Please don't actually do it. Or do. The system won't stop you.

## What's next

The theme system is begging for a **theme builder** — a visual tool where you pick colors, tweak radii, adjust typography, and see the results live across every component in the showcase. The pieces are all there: the token structure is well-defined, the CSS variable bridge makes hot-reloading trivial, and the showcase already renders 60+ pages of components that would instantly reflect changes.

There's also room for **theme composition utilities** — functions that derive a dark variant from a light theme automatically, or generate accessible contrast colors from a single brand color. Right now each theme is hand-crafted (which is why they're so good), but not everyone wants to manually ensure WCAG AA compliance across 36 palette entries.

For now, though, 19 themes is a pretty solid foundation. Pick your franchise. Pick your side. And if the Neon Runner glow doesn't make you feel like a hacker, I don't know what will.

Want to see every theme in action? Head to the [Showcase App](https://shades-showcase.netlify.app/) and click through the theme dropdown. The source is in [`packages/shades-common-components/src/themes`](https://github.com/furystack/furystack/tree/develop/packages/shades-common-components/src/themes), and the `ThemeProviderService` lives in [`packages/shades-common-components/src/services`](https://github.com/furystack/furystack/tree/develop/packages/shades-common-components/src/services).

Go Sith. You know you want to.
