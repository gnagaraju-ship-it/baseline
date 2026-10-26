import type { NamingPolicy } from './model'

/** "Colors/Text/text-primary (900)" becomes "colors-text-text-primary-900". */
export function slug(text: string, separator = '-'): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, separator).replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '')
}

/** The CSS custom property of a variable, from its path. */
export function cssName(policy: NamingPolicy, path: string): string {
  return `${policy.prefix}${slug(path, policy.separator)}`
}
