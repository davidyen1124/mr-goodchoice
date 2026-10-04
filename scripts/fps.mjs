// Frame rate of the show at its busiest (chorus 2), measured in a real (headed) Chromium window on the GPU.
// Headless Chromium either renders in software or throttles requestAnimationFrame, so its numbers mean nothing.
// usage: node scripts/fps.mjs [url]
import { chromium } from 'playwright'
const url = process.argv[2] || 'http://localhost:5391'
const b = await chromium.launch({ headless: false, channel: 'chromium', args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
let ok = true
for (const [label, w, h, dpr] of [['desktop', 1440, 900, 2], ['wide', 2560, 1080, 1], ['phone', 393, 659, 3]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr })
  await p.goto(url + '/?skip', { waitUntil: 'load' })
  await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 60000 })
  await p.evaluate(() => window.goodchoice.seek(66))
  await p.waitForTimeout(800)
  const ts = await p.evaluate(() => new Promise((r) => { const ts = []; const f = (t) => { ts.push(t); ts.length < 240 ? requestAnimationFrame(f) : r(ts) }; requestAnimationFrame(f) }))
  const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b)
  const fps = 1000 / (d.reduce((a, b) => a + b) / d.length)
  ok &&= fps > 50
  console.log(`${fps > 50 ? 'PASS' : 'FAIL'}  ${label} ${w}x${h}@${dpr}x: ${fps.toFixed(0)} fps avg, p95 frame ${d[Math.floor(d.length * 0.95)].toFixed(1)}ms`)
  await p.close()
}
await b.close()
process.exit(ok ? 0 : 1)
