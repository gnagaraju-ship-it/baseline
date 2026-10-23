/**
 * OKLCH colour maths (OKLab by Björn Ottosson). Used to generate ramps with even lightness steps and
 * a steady hue. Hex values have no leading "#".
 */
export interface Oklch { L: number; C: number; H: number }

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
const toGamma = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)

function hexToLinear(hex: string): [number, number, number] {
  return [0, 2, 4].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255)) as [number, number, number]
}

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToLinear(hex)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { L, C: Math.hypot(a, bb), H: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 }
}

/** Linear sRGB channels, possibly outside 0..1 when the colour is out of gamut. */
function oklchToLinear({ L, C, H }: Oklch): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3)
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3)
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3)
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ]
}

const EPS = 1e-4

export function inGamut(c: Oklch): boolean {
  return oklchToLinear(c).every((v) => v >= -EPS && v <= 1 + EPS)
}

export function oklchToHex(c: Oklch): string {
  return oklchToLinear(c)
    .map((v) => {
      const n = Math.round(Math.max(0, Math.min(1, toGamma(Math.max(0, Math.min(1, v))))) * 255)
      return (n < 16 ? '0' : '') + n.toString(16)
    })
    .join('')
    .toUpperCase()
}

/** The colour with the largest chroma not above C that fits sRGB; lightness and hue are never changed. */
export function fitToGamut(c: Oklch): Oklch {
  if (inGamut(c)) return c
  let lo = 0
  let hi = c.C
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (inGamut({ ...c, C: mid })) lo = mid
    else hi = mid
  }
  return { ...c, C: lo }
}
