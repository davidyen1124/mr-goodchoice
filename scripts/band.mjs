// The Mr. Goodchoice house band, rendered offline: banjo rolls, boom-chick guitar, upright bass, fiddle and kazoo
// melody, washboard, plus the show's sound effects. Deliberately a little tinny, like a 1990s animatronic tape.
// renderBand(song) -> { L, R } Float32Arrays at SR.
export const SR = 44100

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 }
export const hz = (name) => {
  const [, n, o] = name.match(/^([A-G]#?)(\d)$/)
  return 440 * 2 ** ((NOTE[n] + 12 * (Number(o) + 1) - 69) / 12)
}
const CHORDS = {
  G: ['G2', 'D3', 'G3', 'B3', 'D4', 'G4'],
  C: ['C3', 'G3', 'C4', 'E4', 'G4', 'G4'],
  D: ['D3', 'A3', 'D4', 'F#4', 'A4', 'G4'],
  D7: ['D3', 'A3', 'C4', 'F#4', 'A4', 'G4'],
}

let rng = 1234567
const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1

// RBJ biquad, processed in place
function biquad(x, type, f, q = 0.707, gainDb = 0) {
  const w = (2 * Math.PI * f) / SR, cs = Math.cos(w), sn = Math.sin(w), a = sn / (2 * q), A = 10 ** (gainDb / 40)
  let b0, b1, b2, a0, a1, a2
  if (type === 'lp') [b0, b1, b2, a0, a1, a2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2, 1 + a, -2 * cs, 1 - a]
  else if (type === 'hp') [b0, b1, b2, a0, a1, a2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2, 1 + a, -2 * cs, 1 - a]
  else if (type === 'bp') [b0, b1, b2, a0, a1, a2] = [a, 0, -a, 1 + a, -2 * cs, 1 - a]
  else [b0, b1, b2, a0, a1, a2] = [1 + a * A, -2 * cs, 1 - a * A, 1 + a / A, -2 * cs, 1 - a / A] // peak
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y
  }
  return x
}

// Karplus-Strong plucked string
function pluck(f, dur, { decay = 0.995, bright = 0.6 } = {}) {
  const n = Math.round(SR * dur), p = Math.max(2, Math.round(SR / f)), buf = new Float32Array(p), out = new Float32Array(n)
  let prev = 0
  for (let i = 0; i < p; i++) { const r = rand(); prev = bright * r + (1 - bright) * prev; buf[i] = prev }
  for (let i = 0; i < n; i++) {
    const j = i % p, k = (i + 1) % p
    out[i] = buf[j]
    buf[j] = decay * 0.5 * (buf[j] + buf[k])
  }
  for (let i = 0; i < 40 && i < n; i++) out[i] *= i / 40
  return out
}

function osc(f, dur, { vib = 0, vibRate = 5.5, vibDelay = 0.12, glideFrom = 0, glide = 0.05, shape = 'saw' } = {}) {
  const n = Math.round(SR * dur), out = new Float32Array(n)
  let ph = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    let fr = glideFrom && t < glide ? glideFrom + (f - glideFrom) * (t / glide) : f
    if (vib && t > vibDelay) fr *= 1 + vib * Math.min(1, (t - vibDelay) / 0.15) * Math.sin(2 * Math.PI * vibRate * t)
    const dt = fr / SR
    ph += dt
    if (ph >= 1) ph -= 1
    let v
    if (shape === 'saw') {
      v = 2 * ph - 1
      // polyBLEP
      if (ph < dt) { const x = ph / dt; v -= x + x - x * x - 1 } else if (ph > 1 - dt) { const x = (ph - 1) / dt; v -= x * x + x + x + 1 }
    } else if (shape === 'square') v = ph < 0.5 ? 1 : -1
    else v = Math.sin(2 * Math.PI * ph)
    out[i] = v
  }
  return out
}

function env(x, a, d, s, r) {
  const n = x.length, A = Math.round(a * SR), D = Math.round(d * SR), R = Math.round(r * SR)
  for (let i = 0; i < n; i++) {
    let g
    if (i < A) g = i / A
    else if (i < A + D) g = 1 - (1 - s) * ((i - A) / D)
    else g = s
    if (i > n - R) g *= (n - i) / R
    x[i] *= g
  }
  return x
}

const noise = (dur) => { const x = new Float32Array(Math.round(SR * dur)); for (let i = 0; i < x.length; i++) x[i] = rand(); return x }
const expDecay = (x, tau) => { for (let i = 0; i < x.length; i++) x[i] *= Math.exp(-i / (tau * SR)); return x }

const cowbell = () => { const a = osc(562, 0.5, { shape: 'square' }), b = osc(845, 0.5, { shape: 'square' }); for (let i = 0; i < a.length; i++) a[i] = (a[i] + b[i]) * 0.5; return expDecay(biquad(a, 'bp', 800, 2), 0.09) }
const whistle = (up = true) => { const n = Math.round(0.55 * SR), x = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / n; ph += (up ? 600 + 1400 * t * t : 2000 - 1400 * t) / SR; x[i] = Math.sin(2 * Math.PI * ph) * Math.sin(Math.PI * t) * (1 + 0.15 * Math.sin(2 * Math.PI * 7 * t * 0.55)) } return x }
const boing = () => { const n = Math.round(0.6 * SR), x = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += (180 + 160 * Math.sin(2 * Math.PI * 14 * t) * Math.exp(-t * 4) + 60 * t) / SR; x[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 5) } return x }
const kaching = () => { const x = new Float32Array(Math.round(1.1 * SR)); for (const [f, g] of [[2093, 1], [3136, 0.6], [4186, 0.4]]) { const b = expDecay(osc(f, 1.1, { shape: 'sine' }), 0.35); for (let i = 0; i < x.length; i++) x[i] += g * b[i] } const d = biquad(expDecay(noise(0.12), 0.03), 'hp', 3000); for (let i = 0; i < d.length; i++) x[i] += 0.8 * d[i]; return x }
const pop = () => { const n = Math.round(0.12 * SR), x = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += (900 * Math.exp(-t * 30) + 300) / SR; x[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 40) } return x }
const thud = () => { const x = new Float32Array(Math.round(0.35 * SR)); let ph = 0; for (let i = 0; i < x.length; i++) { const t = i / SR; ph += (70 + 60 * Math.exp(-t * 25)) / SR; x[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 14) } const k = biquad(expDecay(noise(0.08), 0.015), 'lp', 1200); for (let i = 0; i < k.length; i++) x[i] += 0.6 * k[i]; return x }
const ding = () => { const x = new Float32Array(Math.round(1.2 * SR)); for (const [f, g] of [[1318.5, 1], [2637, 0.35], [3955, 0.15]]) { const b = expDecay(osc(f, 1.2, { shape: 'sine' }), 0.4); for (let i = 0; i < x.length; i++) x[i] += g * b[i] } return x }
const whoosh = () => { const x = biquad(noise(0.5), 'bp', 900, 0.7); for (let i = 0; i < x.length; i++) x[i] *= Math.sin(Math.PI * i / x.length) ** 2; return x }
const crunch = () => { const x = new Float32Array(Math.round(0.4 * SR)); for (let k = 0; k < 9; k++) { const o = Math.round((k * 0.04 + Math.random() * 0.02) * SR), b = biquad(expDecay(noise(0.05), 0.008), 'hp', 2500); for (let i = 0; i < b.length && o + i < x.length; i++) x[o + i] += b[i] * (1 - k / 10) } return x }
export const SFX = { cowbell, whistle: () => whistle(true), whistleDown: () => whistle(false), boing, kaching, pop, thud, ding, whoosh, crunch }

export function renderBand(song) {
  const { bpm, sections, events } = song
  const beat = 60 / bpm, bar = 4 * beat
  const totalBars = sections.reduce((s, x) => s + x.bars, 0)
  const total = totalBars * bar + 3
  const L = new Float32Array(Math.ceil(total * SR)), R = new Float32Array(L.length)
  const add = (x, t, gain = 1, pan = 0) => {
    const o = Math.round(t * SR), gl = gain * Math.cos(((pan + 1) * Math.PI) / 4), gr = gain * Math.sin(((pan + 1) * Math.PI) / 4)
    for (let i = 0; i < x.length && o + i < L.length; i++) if (o + i >= 0) { L[o + i] += x[i] * gl; R[o + i] += x[i] * gr }
  }
  // slight swing on the off 16ths
  const at = (barStart, sixteenth) => barStart + sixteenth * (beat / 4) + (sixteenth % 2 ? beat * 0.03 : 0)

  const banjo = (f) => biquad(biquad(pluck(f, 0.7, { decay: 0.991, bright: 0.85 }), 'hp', 180), 'peak', 2600, 1.2, 6)
  const fiddle = (f, dur, from) => {
    let x = osc(f, dur, { vib: 0.006, vibRate: 6, glideFrom: from, glide: 0.04 })
    x = biquad(biquad(biquad(x, 'lp', 4200), 'peak', 550, 1.4, 5), 'peak', 2900, 2, 4)
    return env(x, 0.03, 0.08, 0.8, 0.06)
  }
  const kazoo = (f, dur, from) => {
    let x = osc(f, dur, { vib: 0.012, vibRate: 7, vibDelay: 0.05, glideFrom: from, glide: 0.06 })
    for (let i = 0; i < x.length; i++) x[i] = Math.tanh(3 * x[i])
    x = biquad(biquad(x, 'bp', 700, 2.5), 'peak', 1800, 3, 9)
    return env(x, 0.02, 0.05, 0.9, 0.05)
  }
  const bass = (f) => biquad(pluck(f, 0.9, { decay: 0.997, bright: 0.25 }), 'lp', 900)
  const kick = () => {
    const x = new Float32Array(Math.round(0.3 * SR)); let ph = 0
    for (let i = 0; i < x.length; i++) { const t = i / SR; ph += (55 + 90 * Math.exp(-t * 30)) / SR; x[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 12) }
    return x
  }
  const snare = () => { const x = biquad(expDecay(noise(0.22), 0.05), 'bp', 2200, 0.8); const t = expDecay(osc(190, 0.1, { shape: 'sine' }), 0.03); for (let i = 0; i < t.length; i++) x[i] += 0.5 * t[i]; return x }
  const scrape = (accent) => biquad(expDecay(noise(0.06), accent ? 0.025 : 0.012), 'hp', 5000)

  let barIndex = 0
  for (const sec of sections) {
    for (let b = 0; b < sec.bars; b++, barIndex++) {
      const t0 = barIndex * bar
      const chord = sec.chords[b % sec.chords.length]
      const tones = CHORDS[chord]
      const e = sec.energy ?? 1
      const lastBar = barIndex === totalBars - 1
      // banjo forward rolls
      if (sec.banjo !== false && !lastBar) {
        const roll = [2, 3, 5, 2, 4, 5, 3, 5, 2, 3, 5, 2, 4, 5, 3, 5]
        roll.forEach((k, i) => add(banjo(hz(tones[k])), at(t0, i), (i % 4 === 0 ? 0.2 : 0.13) * e, 0.35))
      }
      // bass: boom on 1 and 3, walk up into the next section on the last bar
      const root = tones[0].replace(/\d/, (o) => String(Number(o) - (tones[0].startsWith('G') ? 0 : 1)))
      const fifth = tones[1].replace(/\d/, (o) => String(Number(o) - 1))
      if (lastBar) { add(bass(hz('G2')), t0, 0.7); }
      else {
        add(bass(hz(root)), t0, 0.62 * e)
        add(bass(hz(fifth)), t0 + 2 * beat, 0.55 * e)
        if (b === sec.bars - 1 && sec.walk !== false) { add(bass(hz('A2')), t0 + 3 * beat, 0.45); add(bass(hz('B2')), t0 + 3.5 * beat, 0.45) }
      }
      // guitar "chick" on 2 and 4: a short muted strum
      if (!lastBar) for (const k of [1, 3]) tones.slice(1, 5).forEach((n, i) => add(expDecay(pluck(hz(n), 0.25, { decay: 0.985, bright: 0.5 }), 0.07), t0 + k * beat + i * 0.007, 0.16 * e, -0.3))
      // drums
      if (sec.drums !== false) {
        add(kick(), t0, 0.55 * e); if (!lastBar) add(kick(), t0 + 2 * beat, 0.45 * e)
        if (!lastBar) { add(snare(), t0 + beat, 0.22 * e, 0.1); add(snare(), t0 + 3 * beat, 0.22 * e, 0.1) }
        if (!lastBar) for (let i = 0; i < 16; i++) add(scrape(i % 4 === 2), at(t0, i), (i % 4 === 2 ? 0.16 : 0.08) * e, 0.45)
      } else if (sec.name === 'intro' && b >= sec.bars - 1) {
        add(kick(), t0, 0.5)
      }
      // melody: fiddle (and kazoo in choruses). 8 eighth-notes per bar; '-' holds, '.' rests
      const mel = sec.melody?.[b % sec.melody.length]
      if (mel) {
        const steps = mel.split(' ')
        let prevF = 0
        for (let i = 0; i < steps.length; i++) {
          if (steps[i] === '-' || steps[i] === '.') continue
          let len = 1
          while (steps[i + len] === '-') len++
          const f = hz(steps[i]), dur = len * (beat / 2) * 0.95
          const t = t0 + i * (beat / 2) + (i % 2 ? beat * 0.04 : 0)
          add(fiddle(f, dur, prevF && Math.abs(prevF - f) / f < 0.2 ? prevF : 0), t, (sec.fiddle ?? 0.22) * e, -0.15)
          if (sec.kazoo) add(kazoo(f / 2, dur, 0), t, sec.kazoo, 0.2)
          prevF = f
        }
      }
    }
  }
  for (const ev of events || []) if (SFX[ev.type]) add(SFX[ev.type](), ev.t, ev.gain ?? 0.35, ev.pan ?? 0)
  return { L, R, totalBars, bar, beat }
}
