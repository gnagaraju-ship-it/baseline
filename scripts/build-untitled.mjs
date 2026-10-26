// Builds src/data/untitled-ui.json from the Untitled UI Figma variable exports.
// Usage: node scripts/build-untitled.mjs <folder with the 8 .json files>
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseCollections } from './figmaCollection.mjs'

const dir = process.argv[2]
if (!dir) { console.error('Usage: node scripts/build-untitled.mjs <folder>'); process.exit(1) }
const FILES = ['_Primitives', 'Brand palette', '1. Color modes', '2. Radius', '3. Spacing', '4. Widths', '5. Containers', '6. Typography']
const set = parseCollections(FILES.map((n) => JSON.parse(readFileSync(join(dir, `${n}.json`), 'utf8'))))
writeFileSync(new URL('../src/data/untitled-ui.json', import.meta.url), JSON.stringify(set))
console.log(set.collections.map((c) => `${c.name}: ${c.variables.length} variables, modes ${c.modes.join(' | ')}`).join('\n'))
