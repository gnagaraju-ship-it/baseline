import { ColourField } from '../../components/ColourField'
import type { ColourSchema } from '../../lib/schemas'
import { useProject } from '../../store/project'

const GROUPS: Array<{ key: string; title: string }> = [
  { key: 'brand', title: 'Brand' },
  { key: 'neutral', title: 'Neutral' },
  { key: 'semantic', title: 'Status' },
  { key: 'extra', title: 'Other colours' }
]

/** The Brand tab of a theme built on a colour schema: one colour field per palette of the schema. */
export function SchemaBrand({ schema }: { schema: ColourSchema }) {
  const settings = useProject((s) => s.settings)
  const setPaletteHex = useProject((s) => s.setPaletteHex)
  const setAlpha = useProject((s) => s.setAlpha)

  return (
    <div className="flex flex-col gap-6 p-5">
      <p className="m-0 text-xs leading-[1.55] text-muted">Each palette starts with the colours of {schema.id === 'untitled-ui' ? 'Untitled UI' : 'the schema'}. Type a new colour and the ramp is generated around it.</p>
      {GROUPS.map((g) => {
        const palettes = schema.palettes.filter((p) => p.group === g.key && !p.labels)
        if (!palettes.length) return null
        return (
          <section key={g.key} aria-label={g.title} className="flex flex-col gap-3">
            <h3 className="m-0 text-xs font-semibold uppercase tracking-[.08em] text-muted">{g.title}</h3>
            {palettes.map((p) => {
              const start = p.steps[p.base - 1]
              return (
                <ColourField
                  key={p.key}
                  id={`f-${p.key}`}
                  label={p.name}
                  alpha={settings.alpha?.[p.key]}
                  onAlpha={(n) => setAlpha(p.key, n)}
                  value={settings.hex?.[p.key] ?? `#${start}`}
                  fallback={start}
                  invalidMessage="Enter six hex digits."
                  onChange={(v) => setPaletteHex(p.key, v)}
                />
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
