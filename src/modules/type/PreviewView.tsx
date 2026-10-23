import { rowFamily, specimenRows, type TypeGroup, type TypeRow, type TypeSettings } from '../../lib/typeScale'

export function PreviewView({ groups, settings }: { groups: TypeGroup[]; settings: TypeSettings }) {
  const sp = specimenRows(settings, groups)
  const st = (r: TypeRow, weight?: number) => ({ fontFamily: rowFamily(settings, r), fontSize: r.size, lineHeight: `${r.lh}px`, letterSpacing: `${r.tr}em`, ...(weight ? { fontWeight: weight } : {}) })
  return (
    <article aria-label="Specimen" className="flex max-w-[760px] flex-col gap-4 rounded-[14px] border border-line p-10">
      <span className="uppercase text-accent-text" style={st(sp.label, 600)}>Field notes</span>
      <h2 className="m-0" style={st(sp.h1, 700)}>A type scale you can see at a glance</h2>
      <p className="m-0 text-[#3F3F46]" style={st(sp.lead)}>Every step on this page comes from the scale on the left. Change the base size or ratio and the whole page follows.</p>
      <h3 className="m-0 mt-2" style={st(sp.h2, 600)}>Why a ratio works</h3>
      <p className="m-0 text-[#3F3F46]" style={st(sp.body)}>Multiplying by one number keeps the steps in proportion, so headings feel related to body copy instead of picked at random. Line heights snap to the grid, which keeps baselines in step across columns.</p>
      <p className="m-0 text-muted" style={st(sp.small)}>Caption text sits on the smallest body step.</p>
    </article>
  )
}
