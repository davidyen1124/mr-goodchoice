// node scripts/sidebyside.mjs x y w h out.png  -> site render (qa/parity-site.png) | photo, same region
import sharp from 'sharp'
const [x, y, w, h] = process.argv.slice(2, 6).map(Number), out = process.argv[7] || process.argv[6]
const r = { left: x, top: y, width: w, height: h }
const a = await sharp('qa/parity-site.png').extract(r).toBuffer()
const b = await sharp('assets-src/ref/scene.jpg').resize(2000, 1500).extract(r).toBuffer()
const c = await sharp({ create: { width: w * 2 + 8, height: h, channels: 3, background: '#f0f' } }).composite([{ input: a, left: 0, top: 0 }, { input: b, left: w + 8, top: 0 }]).png().toBuffer()
await sharp(c).resize(Math.min(1800, w * 2 + 8)).toFile(out)
