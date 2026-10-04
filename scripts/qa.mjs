// End-to-end QA: drives the app in Chromium or WebKit (desktop, ultrawide, tablet, phones) and checks that it
// works the way a kids' app should: splash -> play, the world fills the screen, the glove shows what to tap,
// characters answer taps, the big PUSH button runs the show, subtitles and mouths follow the song, the camera
// follows the singers on narrow screens and can be dragged, no console errors, no failed requests.
// usage: node scripts/qa.mjs [url] [--webkit]   (default http://localhost:5391). Screenshots go to qa/.
import fs from 'node:fs'
import { chromium, devices, webkit } from 'playwright'

const engine = process.argv.includes('--webkit') ? webkit : chromium
const url = (process.argv.slice(2).find((a) => !a.startsWith('--')) || 'http://localhost:5391').replace(/\/$/, '')
const tag = engine === webkit ? 'webkit-' : ''
fs.mkdirSync('qa', { recursive: true })
const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`) }
const browser = engine === webkit ? await webkit.launch() : await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
const lineAt = (song, t) => song.lines.findLast((l) => t >= l.start - 0.05 && t < l.end + 0.5)

async function run(label, opts, full) {
  const ctx = await browser.newContext(opts)
  const page = await ctx.newPage()
  const errors = [], failed = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  // media elements abort their own range requests when a clip is replaced; that is not a failure
  page.on('requestfailed', (r) => !/ERR_ABORTED|cancelled/i.test(r.failure()?.errorText || '') && failed.push(`${r.failure()?.errorText} ${r.url()}`))
  page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`))
  const shot = (n) => page.screenshot({ path: `qa/${label}-${n}.png` })

  // splash
  const t0 = Date.now()
  await page.goto(url + '/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#enter:not([disabled])', { timeout: 60000 })
  check(`${label}: loads to the splash`, true, `${((Date.now() - t0) / 1000).toFixed(1)}s`)
  await page.waitForTimeout(500)
  await shot('1-splash')
  await page.click('#enter', { force: true })
  await page.waitForTimeout(1600)
  check(`${label}: play opens the store`, await page.evaluate(() => !document.querySelector('#intro') && document.body.classList.contains('ready')))
  check(`${label}: Mr. Goodchoice says hello`, (await page.locator('.bubble:not(.leaving)').count()) === 1, await page.locator('.bubble:not(.leaving)').textContent().catch(() => ''))
  await shot('2-idle')

  // full screen, one layer, no title, no overlay
  const layout = await page.evaluate(() => {
    const r = document.querySelector('#stage').getBoundingClientRect()
    const box = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, r: b.right, b: b.bottom, w: b.width, h: b.height } }
    return {
      vw: innerWidth, vh: innerHeight, stage: { x: r.x, y: r.y, r: r.right, b: r.bottom },
      leftovers: ['#ambient', '.brand', '.booth-shade', '.room-grade', '#compare', '.hint'].filter((s) => document.querySelector(s)),
      push: box('#btn-push'), sound: box('#btn-sound'), scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    }
  })
  const covers = layout.stage.x <= 0.5 && layout.stage.y <= 0.5 && layout.stage.r >= layout.vw - 0.5 && layout.stage.b >= layout.vh - 0.5
  check(`${label}: the store fills the whole screen`, covers, JSON.stringify(layout.stage))
  check(`${label}: no title, no blurred backdrop, no dark overlay`, layout.leftovers.length === 0, layout.leftovers.join(' '))
  const inside = (b) => b && b.x >= 0 && b.y >= 0 && b.r <= layout.vw && b.b <= layout.vh
  check(`${label}: big PUSH button on screen and thumb-sized`, inside(layout.push) && layout.push.w >= 60, layout.push && `${Math.round(layout.push.w)}x${Math.round(layout.push.h)}`)
  check(`${label}: sound button on screen`, inside(layout.sound) && layout.sound.w >= 44)
  check(`${label}: no scrolling`, layout.scroll[0] <= layout.vw && layout.scroll[1] <= layout.vh)

  // the glove shows up when nobody touches anything
  const handOn = await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('#hand')).opacity) > 0.9, null, { timeout: 12000, polling: 100 }).then(() => true, () => false)
  check(`${label}: the glove shows what to tap`, handOn)
  await page.waitForTimeout(300)
  await shot('3-glove')

  // tapping characters (the ones the camera shows: on a phone you swipe to the others)
  const onScreen = await page.evaluate(() => ['bull', 'grape-2', 'chicken', 'cabbage', 'goodchoice', 'bagel', 'peapod', 'banana', 'vine-tomato-0', 'corn-1']
    .filter((id) => { const r = document.querySelector(`.actor[data-id="${id}"]`).getBoundingClientRect(); return r.x + r.width / 2 > 20 && r.x + r.width / 2 < innerWidth - 20 }))
  for (const id of onScreen.slice(0, full ? 4 : 1)) {
    await page.locator(`.actor[data-id="${id}"]`).click({ force: true })
    await page.waitForTimeout(450)
    const bubble = await page.locator('.bubble:not(.leaving)').textContent().catch(() => '')
    const sparks = await page.evaluate(() => document.querySelectorAll('#taps > *').length)
    check(`${label}: tapping ${id} makes them talk`, !!bubble, bubble)
    check(`${label}: the tap sparkles`, sparks > 0, `${sparks} sparks`)
    await shot(`4-tap-${id}`)
    await page.waitForTimeout(2600)
  }

  // the show, from the big PUSH button
  await page.click('#btn-push', { force: true })
  await page.waitForTimeout(1200)
  check(`${label}: PUSH starts the show`, await page.evaluate(() => window.goodchoice.running && document.body.classList.contains('show')))
  const ta = await page.evaluate(() => window.goodchoice.time())
  await page.waitForTimeout(1000)
  const tb = await page.evaluate(() => window.goodchoice.time())
  check(`${label}: the song plays`, tb - ta > 0.6, `${ta.toFixed(2)}s -> ${tb.toFixed(2)}s`)
  const song = await page.evaluate(() => window.goodchoice.song)
  const moments = full
    ? [[1.2, 'intro', 'goodchoice'], [12.5, 'verse', 'goodchoice'], [29.6, 'chorus', null], [44.6, 'bull', 'bull'], [48.1, 'chicken', 'chicken'], [51.4, 'bagel', 'bagel'], [55.3, 'banana', 'banana'], [58.8, 'peppers', 'pepper-black'], [70.0, 'chorus2', null], [81.2, 'outro', 'goodchoice']]
    : [[1.2, 'intro', 'goodchoice'], [29.6, 'chorus', null], [44.6, 'bull', 'bull'], [48.1, 'chicken', 'chicken']]
  for (const [t, name, star] of moments) {
    await page.evaluate((t) => window.goodchoice.seek(t), t)
    await page.waitForTimeout(1500)
    const info = await page.evaluate((star) => {
      const a = star && document.querySelector(`.actor[data-id="${star}"]`)?.getBoundingClientRect()
      return {
        t: window.goodchoice.time(), caption: document.querySelector('#caption.on') ? document.querySelector('#caption-words').textContent : '',
        who: document.querySelector('#caption-who').textContent, avatar: getComputedStyle(document.querySelector('#caption-avatar')).getPropertyValue('--img'),
        notes: document.querySelectorAll('.note').length, starX: a ? a.x + a.width / 2 : null,
      }
    }, star)
    const line = lineAt(song, info.t)
    const first = line ? line.text.replace(/[^\w' ]/g, '').split(' ').slice(0, 2).join(' ') : ''
    check(`${label}: @${t}s ${name} subtitle follows the song`, line ? info.caption.replace(/[^\w' ]/g, '').startsWith(first) : true, `"${info.caption.slice(0, 44)}" (${info.who})`)
    if (line) check(`${label}: @${t}s ${name} subtitle shows the singer's face`, info.avatar.includes(`avatar-${line.who}`), info.avatar)
    if (star) check(`${label}: @${t}s camera has ${star} on screen`, info.starX > 0 && info.starX < layout.vw, `x=${Math.round(info.starX)} of ${layout.vw}`)
    if (line) check(`${label}: @${t}s music notes rise from the singers`, info.notes > 0, `${info.notes} notes`)
    await shot(`5-show-${String(t).padStart(4, '0')}-${name}`)
  }
  // mouths open and close with the words
  for (const who of full ? ['goodchoice', 'bull', 'choir'] : ['goodchoice']) {
    const l = song.lines.find((x) => x.who === who && x.end - x.start > 1.2)
    await page.evaluate((t) => window.goodchoice.seek(t), l.start)
    const seen = new Set()
    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(60)
      seen.add(await page.evaluate((id) => document.querySelector(`.actor[data-id="${id}"]`).classList.contains('flip'), who === 'choir' ? 'grape-0' : who))
    }
    check(`${label}: ${who} lip-syncs`, seen.size === 2)
  }
  // drag to look around (only possible where the booth is wider than the screen)
  const camRoom = await page.evaluate(() => innerWidth / window.goodchoice.scale < 1900)
  if (camRoom) {
    const x0 = (await page.evaluate(() => window.goodchoice.cam)).x
    await page.mouse.move(layout.vw * 0.7, layout.vh * 0.45)
    await page.mouse.down()
    for (let i = 1; i <= 8; i++) await page.mouse.move(layout.vw * 0.7 - i * 22, layout.vh * 0.45)
    await page.mouse.up()
    await page.waitForTimeout(500)
    const x1 = (await page.evaluate(() => window.goodchoice.cam)).x
    check(`${label}: swiping looks around`, Math.abs(x1 - x0) > 40, `cam ${Math.round(x0)} -> ${Math.round(x1)}`)
  }
  await page.click('#btn-push', { force: true })
  await page.waitForTimeout(700)
  check(`${label}: PUSH again stops the show`, !(await page.evaluate(() => window.goodchoice.running)))
  await page.click('#btn-sound', { force: true })
  check(`${label}: mute toggles`, await page.evaluate(() => document.body.classList.contains('muted')))
  await page.click('#btn-sound', { force: true })
  check(`${label}: no console errors`, errors.length === 0, errors.slice(0, 3).join(' | '))
  check(`${label}: no failed requests`, failed.length === 0, failed.slice(0, 3).join(' | '))
  await ctx.close()
}

const strip = ({ defaultBrowserType, ...o }) => (engine === webkit ? (({ isMobile, ...r }) => r)(o) : o)
for (const [label, opts, full] of [
  ['desktop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }, true],
  ['wide', { viewport: { width: 2560, height: 1080 }, deviceScaleFactor: 1 }, false],
  ['tablet', strip(devices['iPad Pro 11']), false],
  ['phone', strip(devices['iPhone 15 Pro']), true],
  ['phone-landscape', strip(devices['iPhone 15 Pro landscape']), false],
]) await run(tag + label, opts, full)

await browser.close()
const bad = results.filter((r) => !r.ok).length
console.log(`\n${results.length - bad}/${results.length} checks passed`)
fs.writeFileSync(`qa/${tag}results.json`, JSON.stringify(results, null, 1))
process.exit(bad ? 1 : 0)
