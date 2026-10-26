// Reads Figma variable-collection exports ({ id, name, modes, variables }) into Baseline's imported token set.
// Used by scripts/build-untitled.mjs; the app itself only reads the JSON it writes.

const byte = (n) => Math.round(n * 255).toString(16).padStart(2, '0').toUpperCase()

export function colourHex(c) {
  const hex = `#${byte(c.r)}${byte(c.g)}${byte(c.b)}`
  return c.a < 1 ? hex + byte(c.a) : hex
}

// Helper variables that only exist to label swatches in Figma ("Brand/50 hex", "Brand/50 contrast").
export const isHelper = (v) => v.type === 'STRING' && / (hex|contrast)$/.test(v.name)

/**
 * `files`: parsed exports. Aliases are written as "Collection::variable name" so they survive without Figma ids.
 * Returns { collections: [{ name, modes, variables: [{ name, type, scopes, values: { mode: { v, a? } } }] }] }.
 */
export function parseCollections(files) {
  const where = {}
  files.forEach((f) => f.variables.forEach((v) => { where[v.id] = `${f.name}::${v.name}` }))
  return {
    collections: files.map((f) => {
      const modes = Object.values(f.modes)
      const ids = Object.keys(f.modes)
      const variables = f.variables.filter((v) => !isHelper(v)).map((v) => {
        const type = v.type === 'COLOR' ? 'color' : v.type === 'FLOAT' ? 'number' : 'string'
        const values = {}
        ids.forEach((id, i) => {
          const r = v.resolvedValuesByMode[id]
          if (!r) return
          const out = { v: type === 'color' ? colourHex(r.resolvedValue) : r.resolvedValue }
          if (r.alias && where[r.alias]) out.a = where[r.alias]
          values[modes[i]] = out
        })
        return { name: v.name, type, scopes: v.scopes, values }
      })
      return { name: f.name, modes, variables }
    })
  }
}
