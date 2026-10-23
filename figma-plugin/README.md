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
