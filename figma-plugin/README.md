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
- Collection **Primitives**: colour ramps and alpha scales.
- Collection **Semantic**: Light and Dark modes, linked to the primitives.
- Collections **Type**, **Grid**, **Spacing**: numbers.
- Effect styles **elevation/\***: shadows.

Variables get Figma scopes and their CSS name (for example `var(--primary-10)`).
