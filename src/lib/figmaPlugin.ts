/** The Baseline Figma plugin, bundled from /figma-plugin so the app can hand it out as a zip. */
import code from '../../figma-plugin/code.js?raw'
import manifest from '../../figma-plugin/manifest.json?raw'
import readme from '../../figma-plugin/README.md?raw'
import ui from '../../figma-plugin/ui.html?raw'
import { makeZip, type ZipFile } from './zip'

export const PLUGIN_FOLDER = 'baseline-figma-plugin'
export const PLUGIN_ZIP = 'baseline-figma-plugin.zip'

export const PLUGIN_FILES: ZipFile[] = [
  { name: `${PLUGIN_FOLDER}/manifest.json`, data: manifest },
  { name: `${PLUGIN_FOLDER}/code.js`, data: code },
  { name: `${PLUGIN_FOLDER}/ui.html`, data: ui },
  { name: `${PLUGIN_FOLDER}/README.md`, data: readme }
]

export function pluginZip(): Uint8Array {
  return makeZip(PLUGIN_FILES)
}
