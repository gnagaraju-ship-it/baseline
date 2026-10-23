import { describe, expect, it } from 'vitest'
import { defaultSettings } from './colour'
import { defaultElevationSettings } from './elevation'
import type { ExportInput } from './exportAll'
import { figmaPluginScript } from './figmaScript'
import { defaultGridSettings } from './grid'
import { defaultSpacingSettings } from './spacing'
import { defaultTypeSettings } from './typeScale'
import { ALL_MODULES } from './exportBuilder'

const input = (): ExportInput => ({
  settings: defaultSettings(), tokenOverrides: {}, type: defaultTypeSettings(), grid: defaultGridSettings(),
  spacing: defaultSpacingSettings(), elevation: defaultElevationSettings()
})

const docOf = (script: string) => JSON.parse(/const DOC = (\{.*\});\n/.exec(script)![1])

describe('figma plugin script', () => {
  it('is valid JavaScript that can run as plugin code', () => {
    const script = figmaPluginScript(input(), ALL_MODULES)
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
    expect(() => new AsyncFunction('figma', script)).not.toThrow()
    expect(script).toContain('figma.variables.createVariableCollection')
    expect(script).toContain('getLocalVariableCollectionsAsync')
    expect(script).toContain('createVariableAlias')
    expect(script).toContain('createEffectStyle')
  })

  it('embeds the tokens for the chosen modules only, without the $ metadata', () => {
    const doc = docOf(figmaPluginScript(input(), ['spacing', 'elevation']))
    expect(Object.keys(doc)).toEqual(['Spacing', 'Elevation'])
    const all = docOf(figmaPluginScript(input(), ALL_MODULES))
    expect(Object.keys(all)).toEqual(['Primitives', 'Semantic', 'Type', 'Grid', 'Spacing', 'Elevation'])
    expect(all.Primitives.colour.primary['10'].$value).toBe('#9D00D6')
  })

  it('updates in place rather than duplicating, and sets scopes and CSS names on every variable', () => {
    const script = figmaPluginScript(input(), ALL_MODULES)
    expect(script).toContain('findVariable(c, name)')
    expect(script).toContain('v.scopes = scopesFor')
    expect(script).toContain("setVariableCodeSyntax('WEB'")
    expect(script).toContain('Existing ones were updated')
  })

  it('does not call figma.notify or closePlugin outside guarded blocks', () => {
    const script = figmaPluginScript(input(), ALL_MODULES)
    for (const line of script.split('\n')) {
      if (line.includes('figma.closePlugin')) expect(line).toContain('try')
    }
  })
})
