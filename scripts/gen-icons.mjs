// Generates icon-192.png and icon-512.png — a "C" mark on the brand dark surface.
// Pure Node (zlib only), no image deps. Run: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const BG = [15, 23, 42] // #0f172a
const FG = [34, 197, 94] // #22c55e

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function makePng(size) {
  const cx = size / 2
  const cy = size / 2
  const rOuter = size * 0.32
  const rInner = size * 0.205
  // Gap on the right turns the ring into a "C".
  const gapHalf = 0.52 // radians

  // Raw image: each row prefixed with filter byte 0.
  const rowLen = size * 3
  const raw = Buffer.alloc((rowLen + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (rowLen + 1)] = 0
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      const dist = Math.hypot(dx, dy)
      const ang = Math.atan2(dy, dx) // -PI..PI; 0 = +x (right)
      const inRing = dist >= rInner && dist <= rOuter
      const inGap = Math.abs(ang) < gapHalf
      const color = inRing && !inGap ? FG : BG
      const off = y * (rowLen + 1) + 1 + x * 3
      raw[off] = color[0]
      raw[off + 1] = color[1]
      raw[off + 2] = color[2]
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: truecolor
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  const png = makePng(size)
  writeFileSync(join(outDir, `icon-${size}.png`), png)
  console.log(`wrote icon-${size}.png (${png.length} bytes)`)
}
