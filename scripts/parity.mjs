// Pixel parity check: renders the scene 1:1 at the photo's framing (2000x1500, ?parity) and compares it with
// ref/scene.jpg. Writes qa/parity-site.png, qa/parity-blend.png (50/50), qa/parity-side.png (side by side)
// and prints a per-region score (mean colour difference, lower is closer).
// usage: node scripts/parity.mjs [url]   (default http://localhost:5391)
import fs from 'node:fs'
import { chromium } from 'playwright'
import sharp from 'sharp'

const url = process.argv[2] || 'http://localhost:5391'
fs.mkdirSync('qa', { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 2000, height: 1500 }, deviceScaleFactor: 1 })
await page.goto(url + '/?skip&parity', { waitUntil: 'networkidle' })
await page.waitForFunction(() => document.body.classList.contains('ready'))
await page.waitForTimeout(800)
await page.screenshot({ path: 'qa/parity-site.png' })
await browser.close()

const photo = await sharp('ref/scene.jpg').resize(2000, 1500).removeAlpha().raw().toBuffer()
const site = await sharp('qa/parity-site.png').removeAlpha().raw().toBuffer()
await sharp('qa/parity-site.png').composite([{ input: await sharp('ref/scene.jpg').resize(2000, 1500).ensureAlpha(0.5).png().toBuffer() }]).toFile('qa/parity-blend.png')
await sharp({ create: { width: 4000, height: 1500, channels: 3, background: '#000' } })
  .composite([{ input: 'qa/parity-site.png', left: 0, top: 0 }, { input: await sharp('ref/scene.jpg').resize(2000, 1500).toBuffer(), left: 2000, top: 0 }])
  .jpeg({ quality: 80 }).toFile('qa/parity-side.jpg')

// mean absolute difference over regions (on a blurred copy, so 1-2px offsets do not dominate)
const blur = async (buf) => sharp(buf, { raw: { width: 2000, height: 1500, channels: 3 } }).blur(4).raw().toBuffer()
const [P, S] = [await blur(photo), await blur(site)]
const score = ([x, y, w, h]) => {
  let d = 0, n = 0
  for (let j = y; j < y + h; j += 2) for (let i = x; i < x + w; i += 2) {
    const k = (j * 2000 + i) * 3
    d += Math.abs(P[k] - S[k]) + Math.abs(P[k + 1] - S[k + 1]) + Math.abs(P[k + 2] - S[k + 2])
    n += 3
  }
  return d / n
}
const REGIONS = {
  whole: [0, 0, 2000, 1500], sign: [440, 45, 1160, 322], booth: [380, 420, 1270, 840], cast: [450, 430, 1110, 680],
  fence: [200, 1085, 1610, 200], foreground: [0, 1240, 2000, 260], 'store-left': [0, 300, 380, 950], 'store-right': [1650, 300, 350, 950],
}
for (const [k, r] of Object.entries(REGIONS)) console.log(`${k.padEnd(12)} ${score(r).toFixed(1)}`)
