# Baseline — project guide for Claude Code

Baseline is a browser tool that turns brand inputs into an export-ready design-token system
(colour, type, grid, spacing, elevation). Read `docs/product-brief.md` first — it is the source of truth for scope.

## Reference material (not production code)

- `design/screens/*.dc.html` — interactive design mockups, one per screen. They use a canvas
  runtime (`support.js`, `<x-dc>`, `<sc-for>`, `{{holes}}`, `class Component extends DCLogic`) that
  does NOT exist in this repo. Treat them as the visual + behaviour spec: copy layout, spacing,
  colours, copy and interactions; re-implement them in the real stack. Do not try to run them.
- The `<script type="text/x-dc">` block at the bottom of each screen holds working reference logic
  (ramp generation, WCAG 2 ratio, APCA Lc, type-scale maths, grid column maths, spacing scales,
  shadow presets). Port it into tested utility modules.
- `design/canvas.json` — the canvas index (screen order and sizes).

| Screen file | Module |
| --- | --- |
| Main.dc.html | Palette |
| Tokens.dc.html | Semantic tokens (light/dark) + palette picker |
| Contrast.dc.html | Contrast grid (APCA / WCAG 2) |
| Preview.dc.html | UI preview — Charts |
| Typography.dc.html | Type scale (web + iOS/watchOS) |
| Grids.dc.html | Column grids per breakpoint |
| Spacing.dc.html | Spacing scale + tokens |
| Elevation.dc.html | Shadow tokens |

## Stack

- React 19 + TypeScript + Vite 8, React Router 7, Tailwind CSS v4 (`@theme` tokens in `src/index.css`, base rules inside `@layer base`)
- State: one Zustand store (`src/store/project.ts`) holds project settings shared across modules (brand colours, token overrides, type, grid, spacing, elevation, shared unit). In memory only; persistence is not defined in the brief.
- Tests: Vitest + Testing Library (jsdom). All maths lives in `src/lib/` (colour, contrast, contrastGrid, tokens, charts, chartTheme, typeScale, grid, spacing, elevation) and is unit-tested; each module also has a page test.
- Commands: `npm run dev`, `npm run test`, `npm run typecheck`, `npm run build`
- Layout: `src/modules/<module>/` per screen, shared pieces in `src/components/`; Colour views share `modules/colour/ColourLayout`.

## Design rules carried from the mockups

- Light theme. Ground #FFFFFF, panels #FAFAFA, borders #E4E4E7, text #18181B, muted #52525B.
- Accent orange #E2531B (lines, toggles); primary button #D2400B with white text.
- Fonts: Inter (UI), JetBrains Mono (values, token names).
- Layout: 64px icon rail + 320px settings panel + fluid main area; wraps on narrow screens.
- Every screen: unit switch (rem/px/pt) and Export button top-right; token counts in badges.
- Accessibility: real buttons/inputs/labels, visible focus ring, text contrast ≥ 4.5:1.

## Working agreement

- Build one module at a time; propose a plan before writing code for a new module.
- Keep calculations pure and unit-tested in `src/lib/` (colour, contrast, typeScale, grid, spacing, elevation).
- Do not invent features beyond the brief; items in "Out of scope for v1" stay out.
