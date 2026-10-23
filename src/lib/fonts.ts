/**
 * Google Fonts catalogue for the Type screen, with hand-written pairing suggestions.
 * Every font here has an @fontsource-variable package imported in src/index.css.
 */
export type FontRole = 'heading' | 'body'
export type FontCategory = 'Sans' | 'Serif' | 'Display'

export interface FontInfo {
  name: string
  category: FontCategory
  /** Roles the font is well suited to. */
  roles: FontRole[]
}

const both: FontRole[] = ['heading', 'body']

export const FONT_CATALOG: FontInfo[] = [
  { name: 'Raleway', category: 'Sans', roles: ['heading'] },
  { name: 'Inter', category: 'Sans', roles: both },
  { name: 'Nunito', category: 'Sans', roles: ['body'] },
  { name: 'Manrope', category: 'Sans', roles: both },
  { name: 'DM Sans', category: 'Sans', roles: both },
  { name: 'Playfair Display', category: 'Serif', roles: ['heading'] },
  { name: 'Lora', category: 'Serif', roles: both },
  { name: 'Merriweather', category: 'Serif', roles: ['body'] },
  { name: 'Source Sans 3', category: 'Sans', roles: ['body'] },
  { name: 'Open Sans', category: 'Sans', roles: ['body'] },
  { name: 'Montserrat', category: 'Sans', roles: ['heading'] },
  { name: 'Work Sans', category: 'Sans', roles: both },
  { name: 'Plus Jakarta Sans', category: 'Sans', roles: ['heading'] },
  { name: 'Outfit', category: 'Sans', roles: ['heading'] },
  { name: 'Space Grotesk', category: 'Display', roles: ['heading'] },
  { name: 'Fraunces', category: 'Display', roles: ['heading'] },
  { name: 'Source Serif 4', category: 'Serif', roles: ['body'] },
  { name: 'Bricolage Grotesque', category: 'Display', roles: ['heading'] }
]

export const FONT_NAMES = FONT_CATALOG.map((f) => f.name)

/** Heading font → body fonts that pair well with it. */
export const PAIRINGS: Record<string, string[]> = {
  Raleway: ['Nunito', 'Inter', 'Open Sans', 'Source Sans 3'],
  'Playfair Display': ['Inter', 'Nunito', 'DM Sans', 'Source Sans 3'],
  Montserrat: ['Open Sans', 'Source Sans 3', 'Lora', 'Nunito'],
  Fraunces: ['Inter', 'DM Sans', 'Work Sans', 'Source Sans 3'],
  'Space Grotesk': ['Inter', 'DM Sans', 'Work Sans'],
  Outfit: ['Inter', 'Nunito', 'DM Sans'],
  'Plus Jakarta Sans': ['Inter', 'DM Sans', 'Open Sans'],
  'Bricolage Grotesque': ['Inter', 'DM Sans', 'Manrope'],
  Manrope: ['Inter', 'Open Sans', 'Source Serif 4'],
  Inter: ['Lora', 'Merriweather', 'Source Serif 4'],
  Lora: ['Inter', 'Open Sans', 'Work Sans'],
  'DM Sans': ['Inter', 'Lora', 'Source Serif 4'],
  'Work Sans': ['Inter', 'Lora', 'Open Sans']
}

export interface Suggestion {
  name: string
  reason: string
}

const MAX_SUGGESTIONS = 4

/**
 * Up to four suggestions for a slot given the font in the other slot.
 * Fonts that pair with it come first; remaining places are filled with fonts suited to the role.
 */
export function suggestFor(role: FontRole, other: string): Suggestion[] {
  const out: Suggestion[] = []
  const add = (name: string, reason: string) => {
    if (name !== other && !out.some((s) => s.name === name) && FONT_NAMES.includes(name)) out.push({ name, reason })
  }
  if (role === 'body') {
    for (const n of PAIRINGS[other] ?? []) add(n, `Pairs with ${other}`)
  } else {
    for (const [heading, bodies] of Object.entries(PAIRINGS)) if (bodies.includes(other)) add(heading, `Pairs with ${other}`)
  }
  for (const f of FONT_CATALOG) if (f.roles.includes(role)) add(f.name, role === 'heading' ? 'Suited to headings' : 'Suited to body text')
  return out.slice(0, MAX_SUGGESTIONS)
}

export interface FontGroups {
  suggested: Suggestion[]
  all: FontInfo[]
}

/**
 * Fonts to list for a slot. With no query: suggestions first, then every other font.
 * With a query: a flat list of fonts whose name or category contains it.
 */
export function filterFonts(query: string, role: FontRole, other: string): FontGroups {
  const q = query.trim().toLowerCase()
  if (q) {
    return { suggested: [], all: FONT_CATALOG.filter((f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().startsWith(q)) }
  }
  const suggested = suggestFor(role, other)
  return { suggested, all: FONT_CATALOG.filter((f) => !suggested.some((s) => s.name === f.name)) }
}
