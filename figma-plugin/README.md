# Baseline: Import tokens (Figma plugin)

Imports the design tokens JSON exported from Baseline as Figma Variables and shadow styles.

## Install (once)
1. Unzip this folder (the Export dialog in Baseline downloads it as `baseline-figma-plugin.zip`).
2. In the Figma desktop app: **Plugins → Development → Import plugin from manifest…** and choose `manifest.json`.

## Use
1. In Baseline: **Export**, choose **Design tokens JSON**, **Download**.
2. In Figma: **Plugins → Development → Baseline: Import tokens**.
3. Choose (or drop) `baseline-tokens.json`, tick what to import, press **Import**.

Importing again updates the variables in place instead of duplicating them.

## What it creates
| Collection | Modes | Holds |
| --- | --- | --- |
| **Primitives** | Value | Colour ramps and alpha scales |
| **Semantic** | Light, Dark | Colour tokens, linked to the primitives |
| **Type** | Value | Heading and body font families, weight of every step |
| **Responsive** | XXL, MD, XS | Font size and line height of every step, grid (width, columns, gutter, margin, sidebar, column), spacing tokens such as `stack-md` |
| **Spacing** | Value | The spacing scale (`space/8`, `space/16` ...) |

Plus **text styles** `type/heading-xl` ... (bound to the variables above) and **shadow styles** `elevation/...`.

### Responsive layouts in Figma
Colours switch by setting a frame's **Semantic** mode to Light or Dark. Sizes switch the same way: select a frame (for example one 1400, 768 or 390 wide), open the right panel's **Layout / Variables** section and set the **Responsive** mode to XXL, MD or XS. Every text using a `type/...` style inside that frame takes that breakpoint's size and line height, and anything bound to `grid/...` or `spacing/...` variables takes its value.

The frame widths are the variables `grid/width` (1400, 768, 390 by default).

Variables get Figma scopes and their CSS name (for example `var(--primary-10)`, `var(--type-heading-xl-size)`).

## Themes

A file exported with several themes has a mode per theme in each collection where the themes differ: **Primitives**, **Type** and **Spacing** use the theme name as the mode ("Ocean"); **Semantic** and **Responsive** use "Ocean / Light" or "Ocean / XXL". Collections where every theme holds the same values keep the normal modes (Semantic stays Light and Dark when only the ramps differ, because its values point at Primitives). Set a frame's Primitives, Semantic and Responsive modes to switch it to a theme. Elevation styles are not variable-bound, so themes with different shadows get `elevation/<Theme>/<name>`.

Figma limits the number of modes per collection by plan. A collection that needs more is reported ("Responsive needs 6 modes") and skipped; everything else is imported.

## Themes built on a design system (Untitled)

A theme that comes from an existing design system (Untitled) is written under `Imported`. The plugin creates its collections with **their own names and modes**, the way they are in the source Figma file, and keeps aliases between them:

| Collection | Modes | Holds |
| --- | --- | --- |
| `_Primitives` | Style | colour ramps (50 to 950) and the spacing primitives |
| `1. Color modes` | Light mode, Dark mode | the semantic colour tokens, aliased to `_Primitives` |
| `6. Typography` | Value | font families, weights, sizes and line heights |
| `2. Radius`, `3. Spacing`, `4. Widths`, `5. Containers` | Mode 1 / Value | named sizes, aliased to the spacing primitives where the source did so |

Choose the **Imported tokens** row in the plugin window to import them. Importing again updates the variables in place. A collection that needs more modes than your Figma plan allows is reported and skipped.
