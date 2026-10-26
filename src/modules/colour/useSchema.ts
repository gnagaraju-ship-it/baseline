import { useMemo } from 'react'
import { colourSchema, tokenSchemaOf } from '../../lib/schemas'
import { useProject } from '../../store/project'

/** The colour schema of the active theme (null = Baseline's own) and its token schema. */
export function useSchema() {
  const id = useProject((s) => s.schemaId)
  return useMemo(() => {
    const colour = colourSchema(id)
    return { colour, tokens: tokenSchemaOf(colour) }
  }, [id])
}
