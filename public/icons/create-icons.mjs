/**
 * Generates minimal valid PNG icons for PWA without any dependencies.
 * Run once: node public/icons/create-icons.mjs
 */
import { writeFileSync } from 'fs'
import { createHash } from 'crypto'

function crc32(buf) {
  const table = (() => {
    const t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      t[i] = c
    }
    return t
  })()
  let crc = 0xFFFFFFFF
  for (const b of buf) crc = table[(crc ^ b) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function uint32BE(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n)
  return b
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBytes, data])
  const crcValue = crc32(crcData)
  return Buffer.concat([uint32BE(data.length), typeBytes, data, uint32BE(crcValue)])
}

function deflateRaw(data) {
  // Minimal uncompressed deflate (zlib wrapper)
  const blocks = []
  let offset = 0
  while (offset < data.length) {
    const end = Math.min(offset + 65535, data.length)
    const block = data.slice(offset, end)
    const isLast = end === data.length ? 1 : 0
    const len = block.length
    const nlen = (~len) & 0xFFFF
    const header = Buffer.from([isLast, len & 0xFF, (len >> 8) & 0xFF, nlen & 0xFF, (nlen >> 8) & 0xFF])
    blocks.push(header, block)
    offset = end
  }
  const raw = Buffer.concat(blocks)
  // Adler32 checksum
  let s1 = 1, s2 = 0
  for (const b of data) { s1 = (s1 + b) % 65521; s2 = (s2 + s1) % 65521 }
  const adler = Buffer.from([s2 >> 8, s2 & 0xFF, s1 >> 8, s1 & 0xFF])
  // zlib header: CMF=0x78, FLG=0x9C (default compression but we use store)
  return Buffer.concat([Buffer.from([0x78, 0x01]), raw, adler])
}

function makePNG(size, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // color type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // Image data: each row = filter byte + RGB pixels
  const rowSize = 1 + size * 3
  const raw = Buffer.alloc(size * rowSize)

  for (let y = 0; y < size; y++) {
    const rowOff = y * rowSize
    raw[rowOff] = 0 // filter: None

    for (let x = 0; x < size; x++) {
      // Gradient: top-left blue to bottom-right indigo
      const t = (x + y) / (2 * (size - 1))
      const pr = Math.round(r + (99 - r) * t)   // 59->99 (blue to indigo R)
      const pg = Math.round(g + (102 - g) * t)  // 130->102 G
      const pb = Math.round(b + (241 - b) * t)  // 246->241 B

      // Rounded corners: blank outside circle-ish bounds
      const cx = x - size / 2, cy = y - size / 2
      const cornerR = size * 0.22
      let inBounds = true
      // Check four corners
      for (const [qx, qy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const ox = size / 2 - cornerR
        const dx = Math.abs(cx) - ox
        const dy = Math.abs(cy) - (size / 2 - cornerR)
        if (dx > 0 && dy > 0 && dx * dx + dy * dy > cornerR * cornerR) {
          inBounds = false; break
        }
      }

      const off = rowOff + 1 + x * 3
      if (inBounds) {
        raw[off] = pr; raw[off + 1] = pg; raw[off + 2] = pb
      } else {
        raw[off] = 255; raw[off + 1] = 255; raw[off + 2] = 255
      }
    }
  }

  const idat = chunk('IDAT', deflateRaw(raw))
  return Buffer.concat([sig, chunk('IHDR', ihdr), idat, chunk('IEND', Buffer.alloc(0))])
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
for (const s of sizes) {
  writeFileSync(`public/icons/icon-${s}x${s}.png`, makePNG(s, 59, 130, 246))
  console.log(`✓ icon-${s}x${s}.png`)
}
console.log('All icons generated!')
