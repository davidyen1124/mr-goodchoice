// assets-src/art/raw/*.png -> public/img/*.webp, plus src/data/sprites.json (each sprite's size).
// Sprites are trimmed to their visible pixels. A sprite's second frame (<name>-alt) and a crate's front panel
// (<crate>-front) are registered onto their first frame and cut with the same box, so swapping frames never jitters.
// usage: node scripts/clean.mjs
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { ELEMENTS } from '../assets-src/art/manifest.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const RAW = path.join(ROOT, 'assets-src/art/raw')
const OUT = path.join(ROOT, 'public/img')
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(path.join(ROOT, 'src/data'), { recursive: true })

const alphaOf = async (file, scale = 1) => {
  const img = sharp(file).ensureAlpha()
  const { width, height } = await img.metadata()
  const w = Math.round(width * scale), h = Math.round(height * scale)
  const { data } = await img.resize(w, h).extractChannel(3).raw().toBuffer({ resolveWithObject: true })
  return { a: data, w, h, width, height }
}
function bbox({ a, w, h }, thr = 24) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y * w + x] > thr) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}
// offset (in full-size px) that best lays `b` over `a` (max overlap of alpha, searched on a 1/4 scale copy)
async function register(fa, fb) {
  const s = 0.25, A = await alphaOf(fa, s), B = await alphaOf(fb, s)
  if (A.w !== B.w || A.h !== B.h) return { dx: 0, dy: 0 }
  let best = -Infinity, bx = 0, by = 0
  const R = 20
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    let sum = 0
    for (let y = Math.max(0, -dy); y < Math.min(A.h, A.h - dy); y += 2) {
      const ra = y * A.w, rb = (y + dy) * A.w
      for (let x = Math.max(0, -dx); x < Math.min(A.w, A.w - dx); x += 2) sum += A.a[ra + x] * B.a[rb + x + dx] - 0.5 * Math.abs(A.a[ra + x] - B.a[rb + x + dx]) * 255
    }
    if (sum > best) { best = sum; bx = dx; by = dy }
  }
  return { dx: Math.round(bx / s), dy: Math.round(by / s) }
}

// how many output pixels per stage unit: enough for a 2x screen showing the stage at ~1.6x
const DENSITY = 3
const sprites = {}
async function emit(name, file, rect, outW) {
  const meta = await sharp(file).metadata()
  // pad the canvas so a shifted rect can never fall outside it
  const P = 200
  const padded = await sharp(file).ensureAlpha().extend({ top: P, bottom: P, left: P, right: P, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  let img = sharp(padded).extract({ left: rect.x + P, top: rect.y + P, width: rect.w, height: rect.h })
  const w = Math.min(rect.w, outW)
  img = img.resize({ width: w, kernel: 'lanczos3' })
  const opaque = name === 'store-bg'
  await (opaque ? img.removeAlpha().webp({ quality: 84 }) : img.webp({ quality: 88, alphaQuality: 92, effort: 5 })).toFile(path.join(OUT, name + '.webp'))
  const h = Math.round((rect.h * w) / rect.w)
  sprites[name] = { w, h, src: `/img/${name}.webp`, raw: [meta.width, meta.height] }
  return sprites[name]
}

for (const e of ELEMENTS) {
  if (e.edit) continue // emitted with the element it edits
  const file = path.join(RAW, e.name + '.png')
  if (!fs.existsSync(file)) { console.log(`missing ${e.name}`); continue }
  const A = await alphaOf(file)
  const outW = e.hiRes || Math.round((e.box?.[2] || 200) * DENSITY)
  if (e.opaque) {
    if (!e.source) {
      await emit(e.name, file, { x: 0, y: 0, w: A.width, h: A.height }, A.width)
      console.log(`${e.name.padEnd(20)} opaque`)
    }
    // edits of a full-bleed image stay full-bleed (no trimming), so they line up with the stage
    for (const x of ELEMENTS.filter((x) => x.edit === e.name)) {
      const f = path.join(RAW, x.name + '.png')
      if (!fs.existsSync(f)) continue
      const m = await sharp(f).metadata()
      await emit(x.name, f, { x: 0, y: 0, w: m.width, h: m.height }, m.width)
      console.log(`${x.name.padEnd(20)} full-bleed edit`)
    }
    continue
  }
  const b = bbox(A)
  const pad = 2
  let rect = { x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad }
  const partners = [e.alt && e.name + '-alt', ...ELEMENTS.filter((x) => x.edit === e.name).map((x) => x.name)].filter((n) => n && fs.existsSync(path.join(RAW, n + '.png')))
  const offsets = {}
  for (const n of partners) {
    const f = path.join(RAW, n + '.png')
    offsets[n] = await register(file, f)
    // grow the box so it holds the partner frame too
    const pb = bbox(await alphaOf(f))
    const x0 = Math.min(rect.x, pb.x - offsets[n].dx - pad), y0 = Math.min(rect.y, pb.y - offsets[n].dy - pad)
    const x1 = Math.max(rect.x + rect.w, pb.x + pb.w - offsets[n].dx + pad), y1 = Math.max(rect.y + rect.h, pb.y + pb.h - offsets[n].dy + pad)
    rect = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
  }
  await emit(e.name, file, rect, outW)
  for (const n of partners) await emit(n, path.join(RAW, n + '.png'), { ...rect, x: rect.x + offsets[n].dx, y: rect.y + offsets[n].dy }, outW)
  console.log(`${e.name.padEnd(20)} ${sprites[e.name].w}x${sprites[e.name].h}${partners.map((n) => `  ${n} ${offsets[n].dx},${offsets[n].dy}`).join('')}`)
}
fs.writeFileSync(path.join(ROOT, 'src/data/sprites.json'), JSON.stringify(sprites, null, 1))
const kb = fs.readdirSync(OUT).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0) / 1024
console.log(`${Object.keys(sprites).length} sprites, ${Math.round(kb)} KB`)
