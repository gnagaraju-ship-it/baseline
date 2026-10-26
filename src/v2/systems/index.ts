import type { System } from '../model'
import { defaultSystem } from './default'
import { untitledSystem } from './untitled'

/** The systems v2 starts with. */
export const builtInSystems = (): System[] => [defaultSystem(), untitledSystem()]
export { defaultSystem, untitledSystem }
