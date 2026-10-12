import './style.css'
import { gsap } from 'gsap'
import song from './data/song.json'
import gags from './data/gags.json'
import sprites from './data/sprites.json'
import { asset } from './asset.js'
import { buildActors, membersOf } from './layout.js'

const W = 2000, H = 1500
const $ = (s) => document.querySelector(s)
const stage = $('#stage')
const body = document.body
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const coarse = matchMedia('(pointer: coarse)').matches
const params = new URLSearchParams(location.search)
const parity = params.has('parity')
if (parity) body.classList.add('parity')
const TAU = Math.PI * 2
const PALETTE = ['#ff5a4e', '#ffcf3c', '#4cd16b', '#47b4ff', '#b47cff', '#ff8fc8', '#ff9b3d']

// who is who: names, colours and avatars for the subtitle stickers and speech bubbles
const CAST = {
  goodchoice: ['Mr. Goodchoice', '#1f8a4c'], choir: ['The Veggie Choir', '#e2382c'], bull: ['The Bull', '#9a5b2a'],
  chicken: ['The Hen', '#e2382c'], bagel: ['The Bagel', '#c06a1c'], banana: ['The Banana', '#d9a400'],
  peppers: ['Los Peppers', '#e2382c'], grapes: ['The Grapes', '#7a52e0'], tomatoes: ['The Tomatoes', '#e2382c'],
  carrots: ['The Carrots', '#f07a12'], cabbage: ['The Cabbage', '#3f9e45'], peapod: ['The Peas', '#2f8a3a'],
  corn: ['The Corn', '#e0a400'], pears: ['The Pears', '#b89a00'], limes: ['The Limes', '#3f9e45'],
}

// ——— the scene (positions match the photo: src/layout.js) ———
const actors = buildActors(sprites)
const byId = Object.fromEntries(actors.map((a) => [a.id, a]))
for (const a of actors) {
  const el = document.createElement('div')
  el.className = a.dance || a.talk ? 'actor dancer' : 'actor'
  el.dataset.id = a.id
  Object.assign(el.style, { left: a.x + 'px', top: a.y + 'px', width: a.w + 'px', height: a.h + 'px', zIndex: a.z })
  if (a.pivot) el.style.transformOrigin = a.pivot
  const rig = document.createElement('div')
  rig.className = 'rig'
  rig.innerHTML = `<img class="main" src="${a.src}" alt="" draggable="false">` + (a.altSrc ? `<img class="alt" src="${a.altSrc}" alt="" draggable="false">` : '')
  el.append(rig)
  if (a.slice) {
    // show only a vertical slice [f0, f1] of the sprite, stretched to fill this actor's box
    const [f0, f1] = a.slice, full = a.w / (f1 - f0)
    el.style.overflow = 'hidden'
    for (const img of rig.children) Object.assign(img.style, { width: full + 'px', left: -f0 * full + 'px', right: 'auto' })
  }
  if (a.click || a.gag) {
    el.dataset.click = a.click || 'gag'
    el.tabIndex = 0
    el.setAttribute('role', 'button')
    el.setAttribute('aria-label', a.label || a.id)
  }
  stage.append(el)
  a.el = el
  a.rig = rig
}

const fx = (cls, style = {}) => {
  const el = document.createElement('div')
  el.className = 'fx ' + cls
  Object.assign(el.style, style)
  stage.append(el)
  return el
}
// spotlights on the sign, the walls fading up into the dark (the store has no ceiling), lamp bulbs and beams
const signBeams = [fx('sign-beam l'), fx('sign-beam r')]
fx('wall-falloff')
fx('booth-light')
const lampFx = ['lamp-l', 'lamp-r'].map((id) => {
  const a = byId[id]
  return {
    bulb: fx('bulb', { left: a.x + a.w / 2 - 35 + 'px', top: a.y + a.h - 44 + 'px' }),
    cone: fx('lamp-cone', { left: a.x + a.w / 2 - 180 + 'px', top: a.y + a.h - 18 + 'px' }),
  }
})
const spots = [fx('spot a'), fx('spot b')]
fx('push-halo')
const live = document.createElement('div')
live.className = 'sr-only'
live.setAttribute('aria-live', 'polite')
body.append(live)

// ——— camera: the world always fills the screen; on narrow screens the camera follows the action ———
const FRAME = { top: 20, bottom: 1300, x: 1015 } // what a full view frames: the sign down to the fence
let scale = 1, vw = innerWidth, vh = innerHeight
const cam = { x: 1000, y: 700 }
let manual = null // { x, y, until } while the user is looking around
const view = () => ({ w: vw / scale, h: vh / scale })
function clampCam(x, y) {
  const v = view()
  return {
    x: v.w >= W ? W / 2 : Math.min(W - v.w / 2, Math.max(v.w / 2, x)),
    y: v.h >= H ? H / 2 : Math.min(H - v.h / 2, Math.max(v.h / 2, y)),
  }
}
function homeY() {
  const v = view(), range = FRAME.bottom - FRAME.top
  if (v.h >= range) return (FRAME.top + FRAME.bottom) / 2
  // not tall enough for everything: keep the sign, then trade a little of it for the booth on very wide screens
  return FRAME.top + v.h / 2 + Math.max(0, 1100 - v.h) * 0.6
}
function applyCam() {
  stage.style.transform = `translate(${(vw / 2 - cam.x * scale).toFixed(2)}px, ${(vh / 2 - cam.y * scale).toFixed(2)}px) scale(${scale})`
}
function fit() {
  vw = innerWidth
  vh = innerHeight
  scale = parity ? vw / W : Math.max(vw / W, vh / (FRAME.bottom - FRAME.top))
  Object.assign(cam, parity ? { x: W / 2, y: H / 2 } : clampCam(manual?.x ?? cam.x, manual?.y ?? homeY()))
  if (!manual && !running) cam.x = clampCam(FRAME.x, 0).x
  applyCam()
  // the in-scene PUSH button gets a finger-sized hit area however small the stage is drawn
  stage.style.setProperty('--hit', Math.max(0, 24 / scale - 30) + 'px')
}
addEventListener('resize', fit)

// ——— audio ———
let muted = false
const songAudio = new Audio()
songAudio.preload = 'auto'
const gagAudio = new Audio()
const sfxCache = {}
function sfx(name, volume = 0.6) {
  if (muted) return
  const base = (sfxCache[name] ||= new Audio(asset(`audio/sfx/${name}.mp3`)))
  const a = base.cloneNode()
  a.volume = volume
  a.play().catch(() => {})
}
function setMuted(m) {
  muted = m
  songAudio.muted = gagAudio.muted = m
  body.classList.toggle('muted', m)
  $('#btn-sound').setAttribute('aria-pressed', String(m))
  $('#btn-sound').setAttribute('aria-label', m ? 'Unmute' : 'Mute')
}
const buzz = (ms = 8) => navigator.vibrate?.(ms)

// ——— loading ———
async function preload() {
  const urls = [...new Set([...actors.flatMap((a) => [a.src, a.altSrc]), asset(sprites.egg.src), asset('img/push.webp'), asset('img/push-alt.webp'), asset('img/hand.webp'),
    ...Object.keys(CAST).map((w) => asset(`img/avatar-${w}.webp`))].filter(Boolean))]
  let done = 0
  const total = urls.length + 2
  const ring = $('#ring-fill')
  const tick = () => { done++; ring.style.strokeDashoffset = String(339.3 * (1 - done / total)) }
  const img = (u) => new Promise((r) => { const i = new Image(); i.onload = i.onerror = () => { tick(); r() }; i.src = u })
  const songLoad = fetch(asset('audio/song.mp3')).then((r) => r.blob()).then((b) => { songAudio.src = URL.createObjectURL(b); tick() })
  await Promise.all([...urls.map(img), songLoad, document.fonts.ready.then(tick)])
  for (const n of ['pop', 'boing', 'ding', 'kaching', 'whistleDown']) sfxCache[n] = new Audio(asset(`audio/sfx/${n}.mp3`))
}

// ——— the show ———
const ENERGY = { intro: 0.4, verse: 0.75, chorus: 1.2, verse2: 0.85, bridge: 1.05, chorus2: 1.35, outro: 0.95 }
const SECTION_COLORS = ['#ffb020', '#47b4ff', '#e2382c', '#4cd16b', '#b47cff', '#e2382c', '#ff8fc8']
const lineMembers = song.lines.map((l) => membersOf(actors, l.who))
const pips = $('#pips')
pips.innerHTML = song.sections.map((s, i) => `<li style="--c:${SECTION_COLORS[i % SECTION_COLORS.length]}"></li>`).join('')
let running = false
let energy = 0
let firedEvents = new Set()
let captionLine = -1

function startShow() {
  if (running) return
  running = true
  body.classList.add('show')
  firedEvents = new Set()
  manual = null
  hideHand()
  bubbleOut(true)
  songAudio.currentTime = 0
  songAudio.volume = 1
  songAudio.play().catch(() => {})
  $('#btn-push').setAttribute('aria-label', 'Stop the show')
  lightsOn()
  gsap.fromTo(byId.push.rig, { scale: 0.86 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' })
  sfx('pop', 0.5)
}
function stopShow(finished = false) {
  if (!running) return
  running = false
  body.classList.remove('show')
  if (!finished) gsap.to(songAudio, { volume: 0, duration: 0.35, onComplete: () => songAudio.pause() })
  $('#btn-push').setAttribute('aria-label', 'Push the button to start the show')
  lightsOff()
  setCaption(-1)
  for (const a of actors) a.el.classList.remove('flip')
  gsap.to('.spot', { opacity: 0, duration: 0.5 })
  lastInteraction = performance.now()
}
songAudio.addEventListener('ended', () => stopShow(true))
const toggleShow = () => (running ? stopShow() : startShow())

function lightsOn() {
  // the sign's spotlights clunk on one after the other, with a stutter
  signBeams.forEach((c, i) => gsap.timeline({ delay: i * 0.18 })
    .set(c, { opacity: 1 }).to(c, { opacity: 0.15, duration: 0.06 }).to(c, { opacity: 0.9, duration: 0.05 })
    .to(c, { opacity: 0.3, duration: 0.08 }).to(c, { opacity: 1, duration: 0.35 }))
  lampFx.forEach(({ bulb, cone }, i) => gsap.timeline({ delay: 0.25 + i * 0.15 })
    .to([bulb, cone], { opacity: 1, duration: 0.05 }).to([bulb, cone], { opacity: 0.2, duration: 0.07 }).to([bulb, cone], { opacity: 1, duration: 0.4 }))
}
function lightsOff() {
  gsap.to([...signBeams, ...lampFx.flatMap((l) => [l.bulb, l.cone])], { opacity: 0, duration: 0.6 })
}

const frac = (x) => x - Math.floor(x)
const pulse = (x) => Math.exp(-7 * frac(x))
const hop = (x) => Math.sin(Math.PI * frac(x)) ** 2

// one dance step per style: returns [tx, ty, rotate(deg), sx, sy]
function dance(style, b, e, ph) {
  switch (style) {
    case 'sway': return [0, -3 * e * hop(b + ph), 2.4 * e * Math.sin(TAU * (b / 2 + ph)), 1, 1]
    case 'nod': return [0, 3 * e * Math.sin(TAU * b), 5.5 * e * (0.5 - 0.5 * Math.cos(TAU * (b + ph))) - 2, 1, 1]
    case 'swing': return [0, 0, 9 * e * Math.sin(TAU * (b / 4 + ph)), 1, 1]
    case 'peck': return [0, -6 * e * pulse(b + ph), 6 * e * Math.sin(TAU * (b / 2 + ph)), 1, 1]
    case 'groove': return [7 * e * Math.sin(TAU * (b / 2 + ph)), -3 * e * hop(b), 6 * e * Math.sin(TAU * (b / 2 + ph) + 1.6), 1, 1]
    case 'bounce': { const p = pulse(b + ph); return [0, -5 * e * hop(b + ph), 0, 1 + 0.05 * e * p, 1 - 0.08 * e * p] }
    case 'hop': return [0, -9 * e * hop(b + ph), 2 * e * Math.sin(TAU * (b / 2 + ph)), 1, 1]
    case 'shake': return [0, -4 * e * hop(2 * b + ph), 8 * e * Math.sin(TAU * (2 * b + ph)), 1, 1]
    case 'bob': return [0, -6 * e * hop(b + ph), 3 * e * Math.sin(TAU * (b / 2 + ph)), 1, 1]
    case 'wobble': return [0, -3 * e * hop(b), 4 * e * Math.sin(TAU * (b + ph)), 1 + 0.03 * e * Math.sin(TAU * b), 1 - 0.03 * e * Math.sin(TAU * b)]
    case 'pendulum': return [0, 0, (0.6 + 2.6 * e) * Math.sin(TAU * (b / 4 + ph)), 1, 1]
    case 'rustle': return [0, 0, 1.3 * e * Math.sin(TAU * (b / 2 + ph)), 1, 1]
    case 'thump': { const p = pulse(b); return [0, 0, 0, 1 + 0.01 * e * p, 1 - 0.025 * e * p] }
    case 'sign': { const p = pulse(b) * Math.max(0, e - 1) * 2; return [0, 0, 0.5 * e * Math.sin(TAU * b / 4), 1 + 0.015 * p, 1 + 0.015 * p] }
    default: return null
  }
}

// mouths: which actors sing right now, how open (2 = vowel, 1 = half, 0 = shut; from ElevenLabs' timings)
function mouths(t) {
  const open = new Map()
  song.lines.forEach((l, i) => {
    if (t < l.start || t >= l.end) return
    for (const a of lineMembers[i]) {
      const f = Math.max(0, Math.floor((t - l.start) * song.fps) - Math.round(a.phase * 2))
      open.set(a.id, Math.max(open.get(a.id) || 0, Number(l.mouth[f] || 0)))
    }
  })
  return open
}

// subtitles: a sticker with the singer's face, the words lighting up as they are sung
function setCaption(i, t = 0) {
  const cap = $('#caption')
  if (i !== captionLine) {
    captionLine = i
    if (i < 0) { cap.classList.remove('on'); return }
    const l = song.lines[i]
    const [name, color] = CAST[l.who] || ['', '#e2382c']
    cap.style.setProperty('--c', color)
    $('#caption-avatar').style.setProperty('--img', `url(${asset(`img/avatar-${l.who}.webp`)})`)
    $('#caption-who').textContent = name
    $('#caption-words').innerHTML = l.words.map((w) => `<span class="w">${w.w}</span>`).join(' ')
    cap.classList.add('on')
    live.textContent = `${name}: ${l.text}`
  }
  if (i >= 0) {
    const ws = $('#caption-words').children
    song.lines[i].words.forEach((w, k) => ws[k]?.classList.toggle('on', t >= w.s - 0.05))
  }
}

function fire(ev) {
  switch (ev.type) {
    case 'egg': return layEgg(true)
    case 'kaching': return sparkle(byId.bagel)
    case 'cowbell': return gsap.fromTo(byId.bull.rig, { y: 0 }, { y: -8, duration: 0.08, yoyo: true, repeat: 3 })
    case 'boing': return ['pepper-hat', 'pepper-black', 'pepper-red'].forEach((id, i) =>
      gsap.fromTo(byId[id].rig, { y: 0 }, { y: -40, duration: 0.22, delay: i * 0.07, yoyo: true, repeat: 1, ease: 'power2.out' }))
    case 'whistle': return gsap.fromTo(byId.sign.rig, { y: 0 }, { y: -10, duration: 0.25, yoyo: true, repeat: 1 })
    case 'finale': return finale()
  }
}

// music notes float up from whoever is singing
const NOTE_PATHS = ['M26 5h4.5l10 5.5v7.5l-10-4.5v20.5a8 8 0 1 1-4.5-7.2z', 'M14 9l24-5v24.5a6.5 6.5 0 1 1-4-6V13l-16 3.4V33a6.5 6.5 0 1 1-4-6z']
let noteClock = 0
function spawnNote(a) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  n.setAttribute('viewBox', '0 0 48 48')
  n.classList.add('note')
  n.innerHTML = `<path fill="${PALETTE[Math.floor(Math.random() * PALETTE.length)]}" d="${NOTE_PATHS[Math.random() < 0.6 ? 0 : 1]}"/>`
  const s = 0.8 + Math.random() * 0.6
  Object.assign(n.style, { left: a.x + a.w * (0.2 + Math.random() * 0.6) - 23 + 'px', top: a.y + 10 + 'px' })
  stage.append(n)
  const dx = (Math.random() - 0.5) * 70
  gsap.timeline({ onComplete: () => n.remove() })
    .fromTo(n, { scale: 0.2 * s, opacity: 0 }, { scale: s, opacity: 1, y: -40, duration: 0.35, ease: 'back.out(2.5)' })
    .to(n, { y: -170 - Math.random() * 60, x: dx, rotation: dx / 3, opacity: 0, duration: 1.4, ease: 'sine.out' })
}

// ——— frame loop ———
let lastNow = performance.now()
let idleBeat = 0
let clock = 0
function frame(now) {
  const dt = Math.min(0.1, (now - lastNow) / 1000)
  lastNow = now
  clock += dt
  const t = running ? songAudio.currentTime : 0
  let target = 0
  let open = null
  if (running) {
    const si = Math.max(0, song.sections.findIndex((s) => t >= s.start && t < s.end))
    const sec = song.sections[si] || song.sections.at(-1)
    target = ENERGY[sec.name] ?? 0.8
    ;[...pips.children].forEach((li, k) => { li.classList.toggle('done', k < si); li.classList.toggle('now', k === si) })
    for (const ev of song.events) if (t >= ev.t && !firedEvents.has(ev)) { firedEvents.add(ev); if (t - ev.t < 0.5) fire(ev) }
    const chorus = sec.name.startsWith('chorus') || sec.name === 'bridge'
    spots.forEach((s, i) => {
      s.style.opacity = chorus && !reduced ? String(0.55 + 0.25 * Math.sin(t * 3 + i)) : '0'
      s.style.transform = `rotate(${(i ? -1 : 1) * (14 * Math.sin(t * 1.3 + i * 2))}deg)`
    })
    lampFx.forEach(({ bulb }, i) => (bulb.style.opacity = String(0.85 + 0.15 * Math.sin(t * 9 + i))))
    let ci = -1
    song.lines.forEach((l, i) => { if (t >= l.start - 0.05 && t < l.end + 0.5) ci = i })
    setCaption(ci, t)
    open = mouths(t)
    // notes from the singers that are on screen
    noteClock += dt
    const singers = [...open.entries()].filter(([, v]) => v > 0).map(([id]) => byId[id])
    if (singers.length && noteClock > (singers.length > 4 ? 0.16 : 0.32) && !reduced) {
      noteClock = 0
      const v = view(), onScreen = singers.filter((a) => Math.abs(a.x + a.w / 2 - cam.x) < v.w / 2)
      if (onScreen.length) spawnNote(onScreen[Math.floor(Math.random() * onScreen.length)])
    }
    // the camera follows whoever sings (it only has room to move on narrow screens)
    if (ci >= 0 && !manual) {
      const l = song.lines[ci], who = lineMembers[ci]
      const wide = l.who === 'choir' || l.who === 'all' || who.length > 6
      followX = wide ? FRAME.x + 330 * Math.sin(t * 0.45) : who.reduce((s, a) => s + a.x + a.w / 2, 0) / who.length
    }
  }
  // camera
  if (!parity) {
    if (manual && performance.now() > manual.until) manual = null
    // between shows on a narrow screen the camera drifts slowly across the booth (and holds still while the
    // glove is pointing or someone is talking, so nothing slides out from under them)
    if (!running && !manual && !handTl && !bubbleEl && !reduced) {
      const span = Math.max(0, (1645 - 380 - view().w) / 2)
      driftX = FRAME.x + span * Math.sin((drift += dt * 0.22))
    }
    const goal = clampCam(manual ? manual.x : running ? followX : driftX, manual ? manual.y : homeY())
    const k = 1 - Math.exp(-dt * (manual ? 14 : 2.2))
    const nx = cam.x + (goal.x - cam.x) * k, ny = cam.y + (goal.y - cam.y) * k
    if (Math.abs(nx - cam.x) > 0.01 || Math.abs(ny - cam.y) > 0.01) { cam.x = nx; cam.y = ny; applyCam() }
  }
  energy += (target - energy) * Math.min(1, dt * 3)
  const b = running ? t / song.beat : (idleBeat += dt / 1.6)
  for (const a of actors) {
    if (a.static) continue
    const singing = open?.get(a.id)
    let e = running ? energy : a.dance === 'pendulum' ? 0.05 : 0
    if (singing !== undefined) e *= 1.35
    if (reduced) e *= 0.35
    const d = a.dance && e > 0.001 ? dance(a.dance, b, e, a.phase) : null
    if (d) a.el.style.transform = `translate(${d[0].toFixed(2)}px, ${d[1].toFixed(2)}px) rotate(${d[2].toFixed(3)}deg) scale(${d[3].toFixed(4)}, ${d[4].toFixed(4)})`
    else if (a.talk && !reduced) {
      // between shows everybody breathes, a little out of step, like they are waiting for you
      const br = Math.sin(clock * 2.1 + a.phase * TAU)
      a.el.style.transform = `scale(${(1 - 0.006 * br).toFixed(4)}, ${(1 + 0.012 * br).toFixed(4)})`
    } else a.el.style.transform = ''
    if (a.mouth && running) {
      const isOpen = singing !== undefined && singing >= 2
      a.el.classList.toggle('flip', singing !== undefined && (a.mouth === 'alt' ? isOpen : !isOpen))
    }
  }
  if (running) byId.push.el.classList.add('flip')
  requestAnimationFrame(frame)
}
let followX = FRAME.x
let driftX = FRAME.x
let drift = 0

// ——— idle life: the animatronics twitch now and then, the button begs ———
function idle() {
  setTimeout(idle, 1400 + Math.random() * 2600)
  if (running || !body.classList.contains('ready') || reduced) return
  const pool = actors.filter((a) => a.talk && !talking.has(a.id))
  const a = pool[Math.floor(Math.random() * pool.length)]
  gsap.timeline().to(a.rig, { rotation: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 3), duration: 0.09, ease: 'power1.out' })
    .to(a.rig, { rotation: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.35)' })
}
setInterval(() => {
  if (running) return
  const p = byId.push.el
  p.classList.add('flip')
  setTimeout(() => !running && p.classList.remove('flip'), 550)
}, 2200)

// ——— characters talk when you tap them ———
const talking = new Set()
const gagIndex = {}
let bubbleEl = null
let gagTimer = 0
function say(a, line) {
  // characters in a group (tomatoes, grapes...) all chime in
  const crowd = ['tomatoes', 'grapes', 'carrots', 'limes', 'pears', 'peppers', 'corn'].includes(line.who)
  const cast = crowd ? actors.filter((x) => x.gag === line.who) : [a]
  gagAudio.pause()
  gagAudio.src = asset(`audio/gags/${line.id}.mp3`)
  gagAudio.play().catch(() => {})
  bubble(a, line)
  live.textContent = `${CAST[line.who]?.[0] || ''}: ${line.text}`
  talking.clear()
  cast.forEach((c) => talking.add(c.id))
  cancelAnimationFrame(gagTimer)
  const t0 = performance.now()
  const step = () => {
    const t = (performance.now() - t0) / 1000
    if (t > line.dur + 0.2 || running) {
      cast.forEach((c) => { c.el.classList.remove('flip'); gsap.to(c.rig, { y: 0, rotation: 0, duration: 0.3 }) })
      talking.clear()
      if (!running) bubbleOut()
      return
    }
    for (const c of cast) {
      const f = Math.max(0, Math.floor(t * song.fps) - Math.round(c.phase * 2))
      const v = Number(line.env[f] || 0)
      const isOpen = Number(line.mouth[f] || 0) >= 2
      c.el.classList.toggle('flip', c.mouth === 'alt' ? isOpen : !isOpen)
      gsap.set(c.rig, { y: -v * 0.7, rotation: Math.sin(t * 9 + c.phase * 6) * v * 0.25 })
    }
    gagTimer = requestAnimationFrame(step)
  }
  gagTimer = requestAnimationFrame(step)
}
function bubble(a, line) {
  bubbleOut(true)
  const [name, color] = CAST[line.who] || ['', '#e2382c']
  const el = document.createElement('div')
  el.className = 'bubble'
  el.innerHTML = `<span class="name"></span><span class="text"></span>`
  el.querySelector('.name').textContent = name
  el.querySelector('.text').textContent = line.text
  el.style.setProperty('--tint', color)
  el.style.fontSize = Math.min(64, Math.max(26, 21 / scale)) + 'px'
  stage.append(el)
  const bw = el.offsetWidth, bh = el.offsetHeight
  // keep it inside what the camera shows
  const v = view(), left0 = Math.max(0, cam.x - v.w / 2) + 16, right0 = Math.min(W, cam.x + v.w / 2) - 16
  const top0 = Math.max(0, cam.y - v.h / 2) + 70 / scale
  const cx = a.x + a.w / 2
  const left = Math.max(left0, Math.min(right0 - bw, cx - bw / 2))
  let top = a.y - bh - 24
  if (top < top0) { top = a.y + Math.min(a.h, 170) + 24; el.classList.add('below') }
  Object.assign(el.style, { left: left + 'px', top: top + 'px' })
  el.style.setProperty('--tail', `${Math.max(30, Math.min(bw - 30, cx - left))}px`)
  gsap.fromTo(el, { scale: 0.3, opacity: 0, rotation: -6 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: 'back.out(2.4)' })
  bubbleEl = el
}
function bubbleOut(now = false) {
  const el = bubbleEl
  if (!el) return
  bubbleEl = null
  if (now) return el.remove()
  el.classList.add('leaving')
  gsap.to(el, { scale: 0.6, opacity: 0, duration: 0.25, delay: 0.5, ease: 'power2.in', onComplete: () => el.remove() })
}
function nextGag(who) {
  const pool = gags.filter((g) => g.who === who)
  if (!pool.length) return null
  gagIndex[who] = ((gagIndex[who] ?? -1) + 1) % pool.length
  return pool[gagIndex[who]]
}
function boing(a, strength = 1) {
  gsap.timeline()
    .to(a.rig, { scaleY: 1 - 0.14 * strength, scaleX: 1 + 0.1 * strength, duration: 0.08, ease: 'power2.out' })
    .to(a.rig, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1.1, 0.3)' })
}

// ——— props ———
function layEgg(fromShow = false) {
  const c = byId.chicken
  const egg = document.createElement('div')
  egg.className = 'actor'
  Object.assign(egg.style, { left: c.x + c.w / 2 - 14 + 'px', top: c.y + c.h - 40 + 'px', width: '28px', height: '36px', zIndex: 7 })
  egg.innerHTML = `<div class="rig"><img class="main" src="${asset(sprites.egg.src)}" alt=""></div>`
  stage.append(egg)
  if (!fromShow) sfx('whistleDown', 0.45)
  gsap.timeline({ onComplete: () => egg.remove() })
    .from(egg, { scale: 0, duration: 0.25, ease: 'back.out(3)' })
    .to(egg, { y: 150, x: -40, rotation: -200, duration: 0.55, ease: 'power2.in' })
    .call(() => sfx('pop', 0.35))
    .to(egg, { y: 120, x: -75, rotation: -330, duration: 0.25, ease: 'power2.out' })
    .to(egg, { y: 540, x: -105, rotation: -520, duration: 0.6, ease: 'power2.in' })
    .to(egg, { opacity: 0, duration: 0.1 })
  boing(c, 1.2)
}
function sparkle(a) {
  for (let i = 0; i < 9; i++) {
    const s = document.createElement('div')
    s.className = 'fx'
    s.textContent = i % 3 ? '✦' : '$'
    Object.assign(s.style, { left: a.x + a.w / 2 + 'px', top: a.y + a.h * 0.45 + 'px', zIndex: 80, fontSize: 30 + Math.random() * 22 + 'px', color: i % 3 ? '#ffe28a' : '#7dd36f', fontWeight: 800, textShadow: '0 2px 0 rgba(0,0,0,.4)' })
    stage.append(s)
    const ang = (i / 9) * TAU + Math.random() * 0.5
    gsap.to(s, { x: Math.cos(ang) * (90 + Math.random() * 60), y: Math.sin(ang) * (70 + Math.random() * 50) - 40, opacity: 0, rotation: Math.random() * 90 - 45, duration: 1.1, ease: 'power2.out', onComplete: () => s.remove() })
  }
}
function confettiBurst() {
  const n = reduced ? 20 : 90
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div')
    c.className = 'confetti'
    c.style.background = PALETTE[i % PALETTE.length]
    c.style.left = 640 + Math.random() * 720 + 'px'
    c.style.top = 150 + Math.random() * 120 + 'px'
    stage.append(c)
    // pops up out of the sign, then flutters down over the booth
    const dx = (Math.random() - 0.5) * 1200
    gsap.timeline({ onComplete: () => c.remove() })
      .fromTo(c, { x: 0, y: 0, scale: 0.2 }, { x: dx * 0.35, y: -80 - Math.random() * 120, scale: 1, rotation: Math.random() * 360, duration: 0.45, ease: 'power2.out' })
      .to(c, { x: dx, y: 800 + Math.random() * 600, rotation: '+=' + (Math.random() * 900 - 450), rotationX: Math.random() * 720, duration: 2.4 + Math.random() * 1.4, ease: 'power1.in' })
  }
}
function finale() {
  confettiBurst()
  actors.filter((a) => a.talk).forEach((a, i) => gsap.fromTo(a.rig, { y: 0 }, { y: -30, duration: 0.22, delay: (i % 7) * 0.03, yoyo: true, repeat: 1, ease: 'power2.out' }))
  gsap.fromTo(byId.sign.rig, { scale: 1 }, { scale: 1.05, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out' })
}

function activate(a) {
  const kind = a.el.dataset.click
  buzz()
  if (kind === 'push') return toggleShow()
  switch (kind) {
    case 'lamp': sfx('ding', 0.25); gsap.fromTo(a.rig, { rotation: 0 }, { keyframes: [{ rotation: 14 }, { rotation: -10 }, { rotation: 6 }, { rotation: -3 }, { rotation: 0 }], duration: 1.6, ease: 'sine.inOut' }); return
    case 'sign': sfx('ding', 0.4); gsap.fromTo(a.rig, { rotation: 0 }, { keyframes: [{ rotation: -1.6 }, { rotation: 1.2 }, { rotation: -0.6 }, { rotation: 0 }], duration: 1, transformOrigin: '50% 0%' }); return
    case 'ball': sfx('boing', 0.5); gsap.timeline().to(a.rig, { y: -90, duration: 0.3, ease: 'power2.out' }).to(a.rig, { y: 0, duration: 0.3, ease: 'bounce.out' }); return
  }
  boing(a)
  if (kind === 'swing') gsap.fromTo(a.rig, { rotation: 0 }, { keyframes: [{ rotation: 22 }, { rotation: -18 }, { rotation: 12 }, { rotation: -7 }, { rotation: 3 }, { rotation: 0 }], duration: 2.6, ease: 'sine.inOut', transformOrigin: '50% 0%' })
  if (kind === 'chicken' && !running) layEgg()
  if (kind === 'goodchoice' && !running) {
    gsap.timeline().to(byId.egg.rig, { y: -150, rotation: 360, duration: 0.45, ease: 'power2.out' }).to(byId.egg.rig, { y: 0, rotation: 720, duration: 0.45, ease: 'power2.in' })
  }
  if (running) return
  const line = a.gag && nextGag(a.gag)
  if (line) say(a, line)
}

// ——— touch: tap characters, swipe to look around, and every tap answers with a sparkle ———
let drag = null
let dragged = false
let lastInteraction = performance.now()
const viewportEl = $('#viewport')
viewportEl.addEventListener('pointerdown', (e) => {
  dragged = false
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }
})
viewportEl.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id || parity) return
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y
  if (!dragged && Math.hypot(dx, dy) < 10) return
  if (!dragged) { dragged = true; viewportEl.setPointerCapture(e.pointerId); hideHand() }
  manual = { x: drag.cx - dx / scale, y: drag.cy - dy / scale, until: performance.now() + (running ? 3500 : 1e9) }
})
const endDrag = () => {
  if (drag && dragged && manual) manual.until = performance.now() + (running ? 3500 : 1e9)
  drag = null
}
viewportEl.addEventListener('pointerup', endDrag)
viewportEl.addEventListener('pointercancel', endDrag)
addEventListener('pointerdown', () => { lastInteraction = performance.now(); dragged = false; hideHand() }, true)
addEventListener('pointerup', (e) => {
  if (!body.classList.contains('ready') || dragged) return
  tapBurst(e.clientX, e.clientY, !!e.target.closest?.('.actor[data-click], button'))
})
stage.addEventListener('click', (e) => {
  if (dragged) return
  const el = e.target.closest('.actor[data-click]')
  if (el) activate(byId[el.dataset.id])
  else if (body.classList.contains('ready')) sfx('pop', 0.15)
})
stage.addEventListener('keydown', (e) => {
  const el = e.target.closest?.('.actor[data-click]')
  if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); activate(byId[el.dataset.id]) }
})
const taps = $('#taps')
function tapBurst(x, y, big) {
  if (reduced) return
  const ring = document.createElement('div')
  ring.className = 'ripple'
  Object.assign(ring.style, { left: x + 'px', top: y + 'px' })
  taps.append(ring)
  gsap.fromTo(ring, { scale: 0.3, opacity: 0.9 }, { scale: big ? 1.7 : 1.2, opacity: 0, duration: 0.5, ease: 'power2.out', onComplete: () => ring.remove() })
  const n = big ? 10 : 6
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div')
    s.className = 'spark' + (i % 2 ? ' star' : '')
    s.style.background = PALETTE[(i + Math.floor(Math.random() * 7)) % PALETTE.length]
    Object.assign(s.style, { left: x + 'px', top: y + 'px' })
    taps.append(s)
    const ang = (i / n) * TAU + Math.random() * 0.6, d = (big ? 70 : 44) + Math.random() * 30
    gsap.fromTo(s, { scale: 0.4 }, { x: Math.cos(ang) * d, y: Math.sin(ang) * d, scale: 0, rotation: 180, duration: 0.6 + Math.random() * 0.2, ease: 'power3.out', onComplete: () => s.remove() })
  }
}

// ——— the tutorial glove: shows what to tap when nobody has touched anything for a while ———
const hand = $('#hand')
let handTl = null
let handTurn = 0
function hideHand() {
  if (!handTl) return
  handTl.kill()
  handTl = null
  gsap.to(hand, { opacity: 0, duration: 0.15 })
}
function screenPoint(a, fx = 0.5, fy = 0.4) {
  return { x: vw / 2 + (a.x + a.w * fx - cam.x) * scale, y: vh / 2 + (a.y + a.h * fy - cam.y) * scale }
}
let handRest = 0
function showHand() {
  if (handTl || running || !body.classList.contains('ready') || bubbleEl || performance.now() < handRest) return
  let target, angle
  if (handTurn++ % 2 === 0) {
    const r = $('#btn-push').getBoundingClientRect()
    target = { x: r.left + r.width * 0.5, y: r.top + r.height * 0.62 }
    angle = 105 // comes in from the left, pointing at the button
  } else {
    const v = view()
    const pool = ['goodchoice', 'bull', 'chicken', 'bagel', 'banana', 'cabbage', 'peapod'].map((id) => byId[id]).filter((a) => Math.abs(a.x + a.w / 2 - cam.x) < v.w / 2 - 60)
    const a = pool[Math.floor(Math.random() * pool.length)] || byId.goodchoice
    target = screenPoint(a, 0.5, 0.35)
    angle = -14
  }
  const w = hand.offsetWidth || 78, h = hand.offsetHeight || 106
  // the glove turns around its fingertip (13%, 1% of the sprite), which sits on the target
  Object.assign(hand.style, { left: target.x - w * 0.13 + 'px', top: target.y - h * 0.012 + 'px' })
  const rad = (angle * Math.PI) / 180
  const away = { x: -Math.sin(rad) * 70, y: Math.cos(rad) * 70 } // back along the arm
  const ripple = () => {
    const r = document.createElement('div')
    r.className = 'ripple'
    Object.assign(r.style, { left: target.x + 'px', top: target.y + 'px' })
    taps.append(r)
    gsap.fromTo(r, { scale: 0.3, opacity: 1 }, { scale: 1.3, opacity: 0, duration: 0.6, ease: 'power2.out', onComplete: () => r.remove() })
  }
  // it keeps demonstrating, with a breather in between, until somebody taps
  handTl = gsap.timeline({ onComplete: () => { handTl = null; handRest = performance.now() + 1800 } })
    .set(hand, { rotation: angle, x: away.x, y: away.y, scale: 1, opacity: 0 })
    .to(hand, { x: 0, y: 0, opacity: 1, duration: 0.55, ease: 'back.out(1.6)' })
    .to(hand, { scale: 0.86, duration: 0.14, ease: 'power2.in' }).call(ripple).to(hand, { scale: 1, duration: 0.22, ease: 'back.out(3)' })
    .to(hand, { scale: 0.86, duration: 0.14, ease: 'power2.in', delay: 0.18 }).call(ripple).to(hand, { scale: 1, duration: 0.22, ease: 'back.out(3)' })
    .to(hand, { x: away.x, y: away.y, opacity: 0, duration: 0.4, ease: 'power2.in', delay: 0.7 })
}
setInterval(() => { if (performance.now() - lastInteraction > 4500) showHand() }, 1000)

// ——— controls ———
$('#btn-push').addEventListener('click', () => { buzz(12); toggleShow() })
$('#btn-sound').addEventListener('click', () => { buzz(); setMuted(!muted) })
addEventListener('keydown', (e) => {
  if (e.target.closest?.('.actor[data-click], button')) return
  if (!body.classList.contains('ready')) return
  if (e.key === ' ' || e.key === 'Enter' || e.key === 'p') { e.preventDefault(); toggleShow() }
  if (e.key === 'm') setMuted(!muted)
})

// ——— boot: splash, then into the store ———
fit()
requestAnimationFrame(frame)
setTimeout(idle, 2500)
preload().then(() => {
  const intro = $('#intro')
  const btn = $('#enter')
  btn.disabled = false
  btn.setAttribute('aria-label', 'Play')
  btn.focus({ preventScroll: true })
  const enter = (instant) => {
    body.classList.add('ready')
    lastInteraction = performance.now()
    // unlock audio on iOS inside the gesture
    songAudio.play().then(() => { songAudio.pause(); songAudio.currentTime = 0 }).catch(() => {})
    gagAudio.src = asset('audio/sfx/pop.mp3')
    gagAudio.volume = 0
    gagAudio.play().then(() => (gagAudio.volume = 1)).catch(() => (gagAudio.volume = 1))
    if (instant) { intro.remove(); return }
    // phones: go properly full screen where the browser allows it (Android; iPhone uses the home-screen app)
    if (coarse && document.fullscreenEnabled) document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {})
    const r = btn.getBoundingClientRect()
    intro.style.setProperty('--ox', r.left + r.width / 2 + 'px')
    intro.style.setProperty('--oy', r.top + r.height / 2 + 'px')
    sfx('pop', 0.5)
    const o = { r: 150 }
    gsap.timeline({ onComplete: () => intro.remove() })
      .to(btn, { scale: 0.85, duration: 0.12 })
      .to(o, { r: 0, duration: 0.75, ease: 'power3.in', onUpdate: () => (intro.style.clipPath = `circle(${o.r}% at var(--ox) var(--oy))`) })
    gsap.fromTo(stage, { opacity: 0.4 }, { opacity: 1, duration: 1.2, delay: 0.3, ease: 'power2.out' })
    setTimeout(() => !running && say(byId.goodchoice, gags.find((g) => g.id === 'goodchoice-0')), 1100)
  }
  btn.addEventListener('click', () => enter(false), { once: true })
  if (params.has('skip') || parity) enter(true)
})

// hooks for QA scripts
window.goodchoice = {
  actors, song, start: startShow, stop: stopShow,
  seek(t) { if (!running) startShow(); songAudio.currentTime = t },
  time: () => songAudio.currentTime,
  get running() { return running },
  get scale() { return scale },
  get cam() { return { ...cam } },
}
