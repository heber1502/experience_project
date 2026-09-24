# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static clone of an Awwwards-listed landing page ("Welcome"), built with Vite + vanilla JS/CSS — no framework. Single `index.html` entry point, built section by section.

## Commands

```bash
npm install
npm run dev       # Vite dev server, http://localhost:5173
npm run build     # production build
npm run preview   # preview the production build
```

No test suite, linter, or type checker is configured.

## Architecture

- `index.html` — the entire page markup, one `<section>` per landing-page section (hero, trust, experience, testimonial, studio, revenue, howit, integrate, stories, usecases, articles, events, newsletter, cta, footer). Everything lives in this one file; there is no templating or component system.
- `src/style.css` — all CSS. Design tokens (`--container-pad`, `--header-h`, etc.) are defined in `:root` at the top, followed by one block per section in the same order as `index.html`, each preceded by a `/* ===== ... ===== */` banner comment. Section blocks each carry their own `@media (max-width: 1199px)` and `@media (max-width: 560px)` overrides inline rather than a global breakpoint stylesheet.
- `src/main.js` — non-animation interaction logic: the Figma-frame scale wrapper, header scroll state, mobile/floating nav menu, nav hover dots, customer-stories slider, newsletter form stub, footer year. Calls `initAnimations()` from `animations.js` at the end.
- `src/animations.js` — all GSAP/ScrollTrigger/SplitText/Lenis choreography, one function per section (`heroIntro`, `trust`, `experience`, `testimonial`, `studio`, `revenue`, `howItWorks`, `integrate`, `stories`, `usecases`, `articles`, `events`, `newsletter`, `finalCta`, `footer`, plus cross-cutting helpers `sectionCurves`, `directionalMarquees`, `magneticButtons`, `preloader`, `customCursor`, `createCurtain`). Each section owns its own animation timeline — there is deliberately no generic "fade up on scroll" applied globally.
- `src/counter.js` — unused leftover from the Vite scaffold template; not imported anywhere.
- `public/assets/` — all images/icons/logos referenced by `index.html`, served at `/assets/...`.

### The Figma-frame scale system (critical to understand before touching layout/animations)

The desktop layout is built at the exact 1440px design width using the same literal pixel values as the Figma file. `main.js` measures the viewport and applies `transform: scale()` to `#scaleWrapper` to fit any monitor size — the same way Figma's prototype player scales a 1440px frame. This only applies at `>=1200px` (`SCALE_BREAKPOINT`); below that, inline styles are cleared and `style.css`'s own `@media (max-width: 1199px)` rules take over with a dedicated adaptive (non-scaled) mobile/tablet layout.

Consequences for future work:
- Below 1200px there is no scaled Figma frame — treat that range as its own layout, not a shrunk desktop.
- `animations.js` never uses ScrollTrigger's `pin` option, because `position: fixed` breaks inside a transformed ancestor (the scaled wrapper).
- Whenever the scale changes, `main.js` dispatches a `figmascale` window event; `animations.js` listens for it and calls `ScrollTrigger.refresh()` to keep trigger positions correct. Any new scroll-triggered logic must account for this event too.
- Respects `prefers-reduced-motion: reduce` — when set, `initAnimations()` short-circuits, removes the preloader, and just shows all `[data-reveal]` elements without animating.

### Images

`index.html` may still reference temporary Figma MCP asset URLs (`https://www.figma.com/api/mcp/asset/...`), which expire after 7 days. Any such URL found should be downloaded into `public/assets/` and replaced with a local path (e.g. `/assets/hero-glow.png`) before considering a section done.
