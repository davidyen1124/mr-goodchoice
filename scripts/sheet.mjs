// Contact sheet of sprites on a checkerboard (to check alpha and look): node scripts/sheet.mjs out.png file...
import sharp from 'sharp'
const [out, ...files] = process.argv.slice(2)
const T = 300, cols = Math.min(files.length, 6), rows = Math.ceil(files.length / cols)
const check = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}"><defs><pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#bbb"/><rect width="10" height="10" fill="#eee"/><rect x="10" y="10" width="10" height="10" fill="#eee"/></pattern></defs><rect width="${T}" height="${T}" fill="url(#p)"/></svg>`)
const tiles = await Promise.all(files.map(async (f, i) => {
  const img = await sharp(f).resize(T - 10, T - 24, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="20"><text x="4" y="15" font-size="13" font-family="Menlo">${f.split('/').pop()}</text></svg>`)
  const tile = await sharp(check).composite([{ input: img, top: 22, left: 5 }, { input: label, top: 0, left: 0 }]).png().toBuffer()
  return { input: tile, left: (i % cols) * T, top: Math.floor(i / cols) * T }
}))
await sharp({ create: { width: cols * T, height: rows * T, channels: 4, background: '#fff' } }).composite(tiles).png().toFile(out)
