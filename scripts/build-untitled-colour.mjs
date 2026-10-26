// Builds src/data/untitled-colour.json (ramps and semantic tokens as a colour schema) from src/data/untitled-ui.json.
// Usage: node scripts/build-untitled-colour.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const set = JSON.parse(readFileSync(new URL('../src/data/untitled-ui.json', import.meta.url), 'utf8'))
const col = (name) => set.collections.find((c) => c.name === name)
const kebab = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
const BASE = STEPS.indexOf('600') + 1
const GROUPS = { Neutral: 'neutral', Gray: 'neutral', Slate: 'neutral', Zinc: 'neutral', Stone: 'neutral', Taupe: 'neutral', Mauve: 'neutral', Mist: 'neutral', Olive: 'neutral', Brand: 'brand', Red: 'semantic', Yellow: 'semantic', Green: 'semantic' }

// Ramps: every "Colors/<Family>" of the primitives that has the 11 steps with plain colours.
const prim = col('_Primitives')
const families = []
for (const v of prim.variables) {
  const m = /^Colors\/([^/]+)\/(\d+)$/.exec(v.name)
  if (!m || !STEPS.includes(m[2])) continue
  let f = families.find((x) => x.name === m[1])
  if (!f) families.push((f = { name: m[1], steps: {} }))
  f.steps[m[2]] = String(Object.values(v.values)[0].v)
}
const palettes = families
  .filter((f) => STEPS.every((s) => /^#[0-9A-F]{6}$/i.test(f.steps[s] ?? '')))
  .map((f) => ({ key: kebab(f.name), name: f.name, group: GROUPS[f.name] ?? 'extra', base: BASE, steps: STEPS.map((s) => f.steps[s].slice(1).toUpperCase()) }))
const ORDER_G = ['brand', 'neutral', 'semantic', 'extra']
palettes.sort((a, b) => ORDER_G.indexOf(a.group) - ORDER_G.indexOf(b.group))
palettes.push({ key: 'base', name: 'Base', group: 'extra', base: 1, labels: ['white', 'black'], steps: ['FFFFFF', '000000'] })
// The brand ramp is the one chosen in "Brand palette": the Original mode (purple) is the starting colour.
const brandMode = 'Original'
const brand = palettes.find((p) => p.key === 'brand')
for (const v of col('Brand palette').variables) {
  const m = /^Brand\/(\d+)$/.exec(v.name)
  if (m && v.values[brandMode]) brand.steps[STEPS.indexOf(m[1])] = String(v.values[brandMode].v).slice(1).toUpperCase()
}
const keys = new Set(palettes.map((p) => p.key))

// Tokens: "1. Color modes". An alias to a ramp step or white/black stays a link; anything else becomes a plain colour.
const ref = (value) => {
  if (value.a) {
    const [coll, name] = value.a.split('::')
    const m = coll === '_Primitives' && /^Colors\/([^/]+)\/([^/]+)$/.exec(name)
    if (m && keys.has(kebab(m[1]))) {
      const key = kebab(m[1])
      const labels = key === 'base' ? ['white', 'black'] : STEPS
      if (labels.includes(m[2])) return `${key}-${m[2]}`
    }
  }
  return `raw:${String(value.v).toUpperCase()}`
}
const kindOf = (group, name) => (group === 'Text' || group === 'Foreground' ? 't' : group === 'Border' ? 'b' : group === 'Effects' || group === 'Alpha' ? 'a' : /text|fg/.test(name) ? 't' : 's')
const tokens = col('1. Color modes').variables.map((v) => {
  const path = v.name.split('/')
  const group = path[1]
  const name = kebab(path[path.length - 1].replace(/\s*\(\d+\)$/, ''))
  return { name, path: v.name, group, kind: kindOf(group, name), light: ref(v.values['Light mode']), dark: ref(v.values['Dark mode']) }
})

const ORDER = ['Background', 'Text', 'Foreground', 'Border', 'Utility', 'Components', 'Alpha', 'Effects']
const groups = ORDER.filter((g) => tokens.some((t) => t.group === g))
const out = {
  steps: STEPS,
  palettes,
  groups: groups.map((g) => ({ key: g, title: g })),
  tokens,
  // which palette plays which role for the contrast grid and charts
  roles: { primary: 'brand', neutral: 'neutral', info: 'blue', success: 'green', caution: 'yellow', warning: 'orange', critical: 'red' },
  // the steps contrast is judged against (0-based): text 900, fill 600, page 50 / 950
  anchors: { neutral: 'neutral', primary: 'brand', text: 9, fill: { light: 6, dark: 6 }, page: { light: 0, dark: 10 } }
}
writeFileSync(new URL('../src/data/untitled-colour.json', import.meta.url), JSON.stringify(out))
console.log(`${palettes.length} palettes, ${tokens.length} tokens, groups: ${groups.join(', ')}, raw refs: ${tokens.filter((t) => t.light.startsWith('raw:')).length + tokens.filter((t) => t.dark.startsWith('raw:')).length}`)
