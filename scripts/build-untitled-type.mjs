// Builds src/data/untitled-type.json (named type steps, fonts and weights) from src/data/untitled-ui.json.
// Usage: node scripts/build-untitled-type.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const set = JSON.parse(readFileSync(new URL('../src/data/untitled-ui.json', import.meta.url), 'utf8'))
const typo = set.collections.find((c) => c.name === '6. Typography')
const value = (name) => typo.variables.find((v) => v.name === name)?.values.Value.v

const names = typo.variables.filter((v) => v.name.startsWith('Font size/')).map((v) => v.name.slice('Font size/'.length))
const steps = names.map((name) => {
  const display = name.startsWith('display')
  return {
    name,
    group: display ? 'DISPLAY' : 'TEXT',
    font: display ? 'heading' : 'body',
    size: value(`Font size/${name}`),
    lh: value(`Line height/${name}`),
    tr: 0,
    // The files give sizes and line heights only; display styles are semibold, text regular.
    weight: display ? 600 : 400
  }
})
const out = {
  steps,
  fonts: { heading: value('Font family/font-family-display'), body: value('Font family/font-family-body') },
  weights: typo.variables.filter((v) => v.name.startsWith('Font weight/')).map((v) => ({ name: v.name, value: v.values.Value.v }))
}
writeFileSync(new URL('../src/data/untitled-type.json', import.meta.url), JSON.stringify(out))
console.log(`${steps.length} steps, fonts ${out.fonts.heading}/${out.fonts.body}, ${out.weights.length} weights`)
