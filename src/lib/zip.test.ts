import { describe, expect, it } from 'vitest'
import { crc32, makeZip } from './zip'

const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8)
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0

describe('zip', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
    expect(crc32(new Uint8Array())).toBe(0)
  })

  it('writes a readable archive: local headers, central directory and end record', () => {
    const files = [{ name: 'a/x.txt', data: 'hello' }, { name: 'a/ü.json', data: '{"ok":true}' }]
    const z = makeZip(files)
    expect(u32(z, 0)).toBe(0x04034b50)
    const end = z.length - 22
    expect(u32(z, end)).toBe(0x06054b50)
    expect(u16(z, end + 10)).toBe(2)
    const cdSize = u32(z, end + 12)
    const cdOffset = u32(z, end + 16)
    expect(cdOffset + cdSize).toBe(end)

    // walk the central directory and read each file back through its local header
    let p = cdOffset
    const dec = new TextDecoder()
    const seen: Record<string, string> = {}
    for (let i = 0; i < 2; i++) {
      expect(u32(z, p)).toBe(0x02014b50)
      const crc = u32(z, p + 16)
      const size = u32(z, p + 24)
      const nameLen = u16(z, p + 28)
      const local = u32(z, p + 42)
      const name = dec.decode(z.slice(p + 46, p + 46 + nameLen))
      expect(u32(z, local)).toBe(0x04034b50)
      const lNameLen = u16(z, local + 26)
      const start = local + 30 + lNameLen
      const data = z.slice(start, start + size)
      expect(crc32(data)).toBe(crc)
      seen[name] = dec.decode(data)
      p += 46 + nameLen
    }
    expect(seen).toEqual({ 'a/x.txt': 'hello', 'a/ü.json': '{"ok":true}' })
  })
})
