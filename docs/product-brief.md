# Omni by Canvs — Product Brief

Oct 22, 2026 · g.nagaraju@enspirit.co

## Overview

Omni by Canvs turns a handful of brand inputs into a complete, export-ready design-token system: colour, type, grid, spacing and elevation, in one browser tool.

A designer enters a primary hex, picks a neutral and semantic colours, sets a base font size and ratio, and chooses breakpoints. Omni generates 16-step colour ramps, light and dark semantic tokens, a contrast grid, a type scale, column grids, a spacing scale and shadow levels, then previews them in real UI and exports them as code.

Positioning: the fastest way to get from a brand colour to a system a developer can ship, with accessibility checked at every step rather than audited at the end.

## Problem

Building a token foundation today means stitching together five or six tools, and the results drift apart before they reach code.

- **Colour ramps are hand-tuned.** Designers nudge 10–16 shades per hue by eye, then discover late that steps fail contrast.
- **Semantic mapping is tribal knowledge.** Which step is `bg-surface-hover` in dark mode lives in a spreadsheet or one person's head.
- **Accessibility is checked after the fact.** WCAG 2 ratios and APCA Lc values are looked up cell by cell in separate checkers.
- **Type, grid, spacing and shadows are set up separately**, each with its own maths, units and breakpoint logic.
- **Hand-off is lossy.** Values are retyped into Figma Variables and CSS, so design and code disagree within a sprint.

## Target users

The primary user is the product or UX designer who owns a design system; developers and agencies are close second audiences.

| User | Context | Job to be done |
| --- | --- | --- |
| Design-system lead | Owns tokens for one product or a suite | Generate a full, accessible foundation from brand inputs and keep it consistent across light and dark |
| Product / UX designer | Starting a new product or rebrand | See ramps, type and spacing working in real UI before committing |
| Front-end developer | Implements the system | Get exact, named values in CSS or Figma-Variables shape, with no retyping |
| Agency / studio | Spins up systems for many clients | Go from a client's brand colour to a hand-off pack in one session, using presets |
| Mobile designer | Ships iOS / watchOS apps | Start from Apple HIG text styles and pt units instead of a web scale |

## Goals and success metrics

v1 succeeds if a designer can go from one brand hex to an exported, accessible token set in a single sitting. Targets are placeholders until the team sets them.

| Goal | Metric | Target |
| --- | --- | --- |
| Fast time to a full system | Median time from first hex to first export | [TARGET, minutes] |
| Accessible by default | Share of generated text/background token pairs meeting the chosen threshold (APCA Lc 60+ or WCAG 4.5:1) | [TARGET %] |
| Hand-off without retyping | Share of sessions that use Copy all or Export | [TARGET %] |
| Covers the whole foundation | Share of exporting projects that configure 3+ modules (colour, type, grid, spacing, elevation) | [TARGET %] |
| Repeat use | Projects reopened within 30 days | [TARGET %] |

## Product scope

v1 is eight modules in two groups, Colour and Foundations, sharing one side rail and one export.

```
Brand colours  ──▶  COLOUR:       Palette ─▶ Tokens
                                  Contrast grid · UI preview      ──▶  Export (CSS variables, Copy all)
Type settings  ──▶  FOUNDATIONS:  Type scale · Grids
Breakpoints    ──▶                Spacing · Elevation             ──▶
```

Palette ramps feed the semantic Tokens, which the Contrast grid and UI preview check; Grids' breakpoints are reused by Spacing and Type.

| Module | What the user does | What it produces |
| --- | --- | --- |
| Palette | Sets primary, neutral preset and five semantic hexes; inspects swatches | Seven 16-step ramps (112 colours), base step marked, contrast on white and black |
| Tokens | Reviews and remaps semantic tokens per mode | Backgrounds, Text and Borders tokens with light and dark references and Lc badges |
| Contrast grid | Picks palette, standard (APCA or WCAG 2) and threshold; clicks cells | 18 × 18 pass/fail matrix incl. white and black, with per-pair use-case checklist |
| UI preview | Switches Light / Dark, preview type, fonts | Charts (bar, line, area, donut, progress) styled with the system |
| Type scale | Sets platform, base, ratio, line grid, fonts, responsive shrink; adds weights | 11 web steps (heading, body, label) or Apple HIG styles, variants, overrides |
| Grids | Sets platform, sidebar, breakpoints, columns, gutter, preset | Column overlay per breakpoint with computed column width |
| Spacing | Picks base, toggles steps, adds custom values | Spacing scale plus grouped tokens per breakpoint, off-scale values flagged |
| Elevation | Picks a shadow preset, edits layers and shadow colour | `elevation-*` tokens with multi-layer box-shadows and CSS |

## Core principles

The same few behaviours run through every module, so learning one screen teaches the rest.

- **Inputs left, output right.** A settings panel drives a live canvas; every change re-renders at once.
- **Presets first, custom always.** Each module opens from a preset (Tailwind, Soft ambient, Material, 4px base, Major Second, Default HIG) and every value stays editable.
- **Accessibility is shown, not audited.** Swatches, token rows and grid cells carry WCAG 2 ratios or APCA Lc next to the colour.
- **One unit switch.** rem / px / pt sits in the same top-right spot on every screen and converts all values.
- **Breakpoints are shared.** Grid defines XXL / MD / XS; Spacing and Type reuse them unless turned off.
- **Names are the export.** Each value shows the token name it ships as (`space-16`, `elevation-md`, `heading-xl-semibold`).
- **Live counts.** Tab and Export badges show how many tokens will ship (for example 112 = 7 palettes × 16 steps).

## Key user flows

Four flows cover v1; each ends in Copy all or Export.

**1. Brand colour to token set**

1. Enter the primary hex (optionally a secondary) in Brand.
2. Pick a neutral preset (Gray, Slate, Zinc, Stone) or Custom.
3. Set semantic colours: Info, Success, Caution, Warning, Critical.
4. Review the 16-step ramps in Palette; click a swatch to see its contrast on white and black.
5. Check semantic mappings in Tokens; remap any light or dark value from the picker.
6. Confirm pairs in the Contrast grid, then preview in UI preview (Light / Dark).

**2. Accessibility check**

1. Open Contrast grid and choose a palette.
2. Switch between WCAG 3 · APCA and WCAG 2, and set a threshold (for example Lc 60+).
3. Click a cell to see sample text and which uses it passes (large text, UI, body).

**3. Type scale**

1. Choose platform: Website, Web app, iOS or watchOS.
2. Set base size, ratio and line grid, or apply a preset.
3. Pick heading and body fonts.
4. Expand a step to add weight variants or override line height and tracking.
5. Set Tablet / Mobile shrink and compare breakpoints.

**4. Layout and depth**

1. Grids: set platform, sidebar, breakpoints, columns and gutter; read column width off the overlay.
2. Spacing: pick a base (2 / 4 / 8 px), toggle steps, see off-scale tokens flagged.
3. Elevation: pick a shadow preset, tune layers, copy the CSS.

## Out of scope for v1

These appear in the screens as entry points but are not part of the v1 build.

- UI preview tabs beyond Charts (Dashboard, Mobile, Web, Components, Logos, Gradients, Text).
- Custom neutral ramps, secondary and tertiary brand colours beyond one extra hue.
- Uploading custom font files (the upload buttons) and fonts outside Google Fonts.
- Adding custom breakpoints or devices in Grids.
- Component libraries: Omni ships tokens, not buttons or cards.
- Two-way sync with Figma or code repositories.

## Risks and open questions

| Item | Why it matters |
| --- | --- |
| Ramp algorithm for non-Tailwind hues | Generated ramps for yellow and orange can look muddy in dark steps; trust in the palette hinges on this. |
| APCA vs WCAG 2 as default | APCA is not yet a ratified standard; teams with legal accessibility targets still need WCAG 2. |
| Meaning of the Lc badges in Tokens | Should they show the best text colour on a surface, or the pair the token is actually used with? |
| Export formats | Which ship in v1: CSS variables, Figma Variables JSON, Tailwind config, Style Dictionary, iOS / Android? |
| Preset licensing and accuracy | Presets named after Tailwind, Material, Fluent, Ant Design, Bootstrap, Carbon, Polaris and Apple HIG must match their published values. |
| SF Pro availability | Apple fonts cannot be served on the web; previews rely on the system font stack. |
| Pricing and accounts | Free vs paid tiers, saved projects and team sharing are not yet defined. |
| Dark theme for the tool | Screens exist in both themes; decide whether v1 ships one or both. |
