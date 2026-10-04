// "Make a Good Choice (The Mollie Stone's Hoedown)": the show that plays when you press PUSH.
// Every voice is ElevenLabs (eleven_v3, with timestamps) using the API key of ../audio-anchors.
// The band is rendered by scripts/band.mjs, because that key has no music_generation permission
// (`node scripts/song.mjs --probe` says whether it has been granted since).
// Writes public/audio/song.mp3, public/audio/gags/*.mp3 and src/data/{song,gags}.json, the cue sheet the page
// uses to move each character's mouth and to show the words.
// usage: node scripts/song.mjs [--probe] [--no-gags]
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { renderBand, SFX, SR } from './band.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const CACHE = path.join(ROOT, 'art/voice-cache')
const AUDIO = path.join(ROOT, 'public/audio')
const DATA = path.join(ROOT, 'src/data')
for (const d of [CACHE, AUDIO, path.join(AUDIO, 'gags'), DATA]) fs.mkdirSync(d, { recursive: true })

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY
  const env = path.resolve(ROOT, '../audio-anchors/.env')
  const line = fs.readFileSync(env, 'utf8').split('\n').find((l) => l.startsWith('ELEVENLABS_API_KEY='))
  return line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '')
}
const KEY = apiKey()

async function eleven(pathname, body) {
  const res = await fetch('https://api.elevenlabs.io' + pathname, {
    method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

if (process.argv.includes('--probe')) {
  try { await eleven('/v1/music/plan', { prompt: 'a short hoedown', music_length_ms: 10000 }); console.log('music_generation: granted') }
  catch (e) { console.log('music_generation:', String(e.message).includes('missing_permissions') ? 'NOT granted' : e.message) }
  process.exit(0)
}

// ——— the cast ———
const V = {
  bill: 'pqHfZKP75CvOlQylNhV4', brian: 'nPczCjzI2devNBz1zQrb', laura: 'FGY2WhTYpPnrIDTdsKH5', liam: 'TX3LPaxmHKxFdv7VOQHJ',
  will: 'bIHbv24MWmeRgasZH58o', callum: 'N2lVS1w4EtoT3dr4eOWO', jessica: 'cgSgspJ2msm6clMCkdW9', matilda: 'XrExE9yKIg1WjnnlVkGX',
  chris: 'iP95p4xoKVk53GoZ742B', alice: 'Xb7hH8MSUJpSbSDYk0k2', roger: 'CwhRBWXzGAHq8TQ4Fs17', sarah: 'EXAVITQu4vr4xnSDxMaL', charlie: 'IKne3meq5aSn9XLyUdCD',
}
// voice and pitch (semitones) per character; the choir is several voices at once
const CAST = {
  goodchoice: [{ voice: V.bill, pitch: 0 }],
  bull: [{ voice: V.brian, pitch: -4 }],
  chicken: [{ voice: V.laura, pitch: 3 }],
  bagel: [{ voice: V.liam, pitch: 2 }],
  banana: [{ voice: V.will, pitch: -1 }],
  peppers: [{ voice: V.callum, pitch: 2 }],
  grapes: [{ voice: V.jessica, pitch: 4 }],
  tomatoes: [{ voice: V.matilda, pitch: 3 }],
  carrots: [{ voice: V.chris, pitch: 3 }],
  cabbage: [{ voice: V.alice, pitch: 2 }],
  peapod: [{ voice: V.jessica, pitch: 7 }],
  corn: [{ voice: V.roger, pitch: 1 }],
  pears: [{ voice: V.sarah, pitch: 3 }],
  limes: [{ voice: V.laura, pitch: 6 }],
  choir: [
    { voice: V.jessica, pitch: 4, pan: -0.4, delay: 0 }, { voice: V.laura, pitch: 3, pan: 0.4, delay: 0.018 },
    { voice: V.liam, pitch: 3, pan: -0.15, delay: 0.031 }, { voice: V.charlie, pitch: 2, pan: 0.2, delay: 0.012 },
  ],
}

// ——— the song ———
const BPM = 132
const VERSE = ['D5 B4 D5 G5 D5 B4 G4 B4', 'A4 B4 C5 D5 E5 D5 B4 G4', 'C5 E5 G5 E5 D5 C5 B4 A4', 'B4 D5 G5 - G5 F#5 E5 D5',
  'D5 B4 D5 G5 D5 B4 G4 B4', 'A4 B4 C5 D5 E5 F#5 G5 E5', 'F#5 E5 D5 C5 B4 A4 F#4 A4', 'G4 - B4 D5 G5 - . .']
const CHORUS = ['E5 - E5 D5 C5 - E5 G5', 'G5 - D5 - B4 - D5 -', 'F#5 - F#5 E5 D5 - C5 A4', 'B4 - G4 - G4 A4 B4 D5',
  'E5 - E5 D5 C5 - E5 G5', 'G5 - D5 - B4 D5 G5 -', 'F#5 G5 A5 G5 F#5 E5 D5 C5', 'B4 - G4 - G4 . . .']
const SECTIONS = [
  { name: 'intro', bars: 6, chords: ['G', 'C', 'G', 'D7', 'G', 'D7'], drums: false, energy: 0.8 },
  // the caller's verse ends on a two-bar turnaround into the chorus
  { name: 'verse', bars: 10, chords: ['G', 'G', 'C', 'G', 'G', 'G', 'D', 'G', 'D', 'D7'], fiddle: 0.12, melody: [...VERSE, 'A4 - D5 - F#5 - A5 -', 'A5 G5 F#5 E5 D5 C5 B4 A4'] },
  { name: 'chorus', bars: 8, chords: ['C', 'G', 'D', 'G', 'C', 'G', 'D7', 'G'], fiddle: 0.2, kazoo: 0.08, energy: 1.1, melody: CHORUS },
  { name: 'verse2', bars: 8, chords: ['G', 'G', 'C', 'G', 'G', 'G', 'D', 'G'], fiddle: 0.12, melody: VERSE },
  {
    name: 'bridge', bars: 4, chords: ['C', 'C', 'D', 'D7'], fiddle: 0.16, energy: 1.05,
    melody: ['E5 F#5 G5 - E5 - C5 -', 'E5 F#5 G5 - A5 G5 E5 C5', 'F#5 G5 A5 - F#5 - D5 -', 'F#5 - A5 - C5 - A4 -'],
  },
  { name: 'chorus2', bars: 8, chords: ['C', 'G', 'D', 'G', 'C', 'G', 'D7', 'G'], fiddle: 0.22, kazoo: 0.1, energy: 1.15, melody: CHORUS },
  {
    name: 'outro', bars: 5, chords: ['G', 'C', 'D7', 'G', 'G'], fiddle: 0.18,
    melody: ['D5 B4 D5 G5 D5 B4 G4 B4', 'C5 E5 G5 E5 D5 C5 B4 A4', 'A4 B4 C5 D5 E5 F#5 G5 -', 'G5 - D5 - B4 - G4 -', 'G4 . . . . . . .'],
  },
]
const MAKE = '[shouting] Make a good choice! [excited] Yee-haw!'
const FRESH = '[excited] Fresh from the farm to the shopping cart!'
const HEART = "[excited] Mollie Stone's has got a whole lotta heart!"
// bar: where the line starts (fractions are parts of a bar), bars: how long it may take
const LINES = [
  { bar: 0.25, bars: 1.75, who: 'goodchoice', text: '[excited] Well HOWDY, shoppers!' },
  { bar: 2, bars: 2, who: 'goodchoice', text: "Welcome to Mollie Stone's Market!" },
  { bar: 4, bars: 2, who: 'goodchoice', text: "[cheerfully] I'm Mister Goodchoice, and THIS is my band!" },
  { bar: 6, bars: 2, who: 'goodchoice', text: '[cheerfully] Grab your cart and promenade,' },
  { bar: 8, bars: 2, who: 'goodchoice', text: 'past the finest produce ever made!' },
  { bar: 10, bars: 2, who: 'goodchoice', text: 'Swing your partner round and round,' },
  { bar: 12, bars: 2, who: 'goodchoice', text: "the bagel's swingin' and he won't come down!" },
  { bar: 14, bars: 1.75, who: 'goodchoice', text: '[shouting] Now everybody, sing it loud and proud!' },
  { bar: 16, bars: 2, who: 'choir', text: MAKE },
  { bar: 18, bars: 2, who: 'choir', text: FRESH },
  { bar: 20, bars: 2, who: 'choir', text: MAKE },
  { bar: 22, bars: 2, who: 'choir', text: HEART },
  { bar: 24, bars: 2, who: 'bull', text: 'Moooove over, partner! The prices are low!' },
  { bar: 26, bars: 2, who: 'chicken', text: '[excited] Bawk! Which came first? [laughs] The coupon!' },
  { bar: 28, bars: 2, who: 'bagel', text: "[excited] I'm a bagel on a swing! Go Cardinal! Ka-ching!" },
  { bar: 30, bars: 2, who: 'banana', text: "[mischievously] Don't call me bananas. I'm a-peeling." },
  { bar: 32, bars: 2, who: 'peppers', text: "[shouting] Ay, ay, ay! We're hot stuff today!" },
  { bar: 34, bars: 1.75, who: 'grapes', text: "[excited] We're grape-ful you came to play!" },
  { bar: 36, bars: 2, who: 'choir', text: MAKE },
  { bar: 38, bars: 2, who: 'choir', text: FRESH },
  { bar: 40, bars: 2, who: 'choir', text: MAKE },
  { bar: 42, bars: 2, who: 'choir', text: HEART },
  { bar: 44, bars: 2.85, who: 'goodchoice', text: "[laughs] Thank ya kindly! Now push that button again, y'hear?" },
  { bar: 47, bars: 0.75, who: 'choir', text: '[shouting] YEE-HAW!' },
  { bar: 47.75, bars: 0.6, who: 'bull', text: 'Moooo!' },
  { bar: 48.3, bars: 0.6, who: 'chicken', text: 'Bawk!' },
]
// visual + sound cues that are not singing (the page reacts to them too)
const EVENTS = [
  { bar: 15.5, type: 'whistle' }, { bar: 24, type: 'cowbell', gain: 0.25 }, { bar: 25, type: 'cowbell', gain: 0.25 },
  { bar: 27.3, type: 'egg', sfx: 'whistleDown' }, { bar: 29.4, type: 'kaching' }, { bar: 32, type: 'boing' },
  { bar: 35.5, type: 'whistle' }, { bar: 48.75, type: 'finale', sfx: 'kaching' },
]

// ——— click gags (when the show is not running) ———
const GAGS = [
  ['goodchoice', 'Howdy, partner! Go on, push the big blue button!'],
  ['goodchoice', '[laughs] Fresh eggs! Well... egg. Singular.'],
  ['goodchoice', "[whispers] Psst. I've been standing here since nineteen ninety-four."],
  ['bull', "Moooo... I mean, good afternoon. Don't have a cow. I'm a bull."],
  ['bull', '[sighs] Nobody ever pets the bull.'],
  ['chicken', '[excited] Bawk! Watch me lay down a hot deal!'],
  ['chicken', 'Cluck around and find out.'],
  ['bagel', "[excited] Wheee! Has anybody seen my cream cheese?"],
  ['bagel', "I'm on a roll! Well. Technically I'm boiled."],
  ['banana', "Easy there. Don't slip on me."],
  ['banana', '[mischievously] Shades on. Peel off.'],
  ['tomatoes', "[laughs] Hey, we're a fruit! Look it up!"],
  ['tomatoes', "Don't rush us, we're still ketchup-ing up!"],
  ['peppers', '[shouting] Ay caramba! Too spicy!'],
  ['peppers', 'Hot, hot, hot! Olé!'],
  ['grapes', "[excited] We're grape! Thanks for noticing!"],
  ['grapes', "[giggles] Stop, you'll make us raisins!"],
  ['corn', 'Aw, shucks. You noticed me.'],
  ['corn', "I'm all ears!"],
  ['carrots', "[excited] Carrot-e chop! Hi-yah!"],
  ['carrots', "Eat your carrots. We're watching. We have excellent eyesight."],
  ['cabbage', "Lettuce be friends! Wait. I'm a cabbage."],
  ['peapod', "[excited] Peas and thank you!"],
  ['peapod', "We're three peas in a pod. Duh!"],
  ['pears', "[laughs] We make a great pear!"],
  ['limes', '[excited] The lime-light! Finally!'],
  ['goodchoice', '[shouting] Price check on aisle five!'],
]

// ——— audio helpers ———
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16)
async function tts(voice, text) {
  const file = path.join(CACHE, sha(voice + '|eleven_v3|' + text) + '.json')
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
  const body = { text, model_id: 'eleven_v3', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }
  let data
  for (let attempt = 1; ; attempt++) {
    try { data = await eleven(`/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, body); break }
    catch (e) { if (attempt >= 3) throw e; await new Promise((r) => setTimeout(r, 2000 * attempt)) }
  }
  fs.writeFileSync(file, JSON.stringify({ text, voice, audio: data.audio_base64, alignment: data.alignment }))
  console.log(`  voiced ${text.slice(0, 60)}`)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

// decode, pitch-shift and speed up with ffmpeg, return mono Float32 at SR
function processAudio(b64, pitch, speed) {
  const tmp = path.join(CACHE, '_in.mp3')
  fs.writeFileSync(tmp, Buffer.from(b64, 'base64'))
  const r = 2 ** (pitch / 12)
  const filters = [`asetrate=${SR * r}`, `aresample=${SR}`]
  let tempo = speed / r
  while (tempo < 0.5) { filters.push('atempo=0.5'); tempo /= 0.5 }
  while (tempo > 2) { filters.push('atempo=2'); tempo /= 2 }
  filters.push(`atempo=${tempo.toFixed(5)}`)
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', tmp, '-af', filters.join(','), '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 })
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4).slice()
}
function trim(x, thr = 0.02) {
  let a = 0, b = x.length - 1
  while (a < b && Math.abs(x[a]) < thr) a++
  while (b > a && Math.abs(x[b]) < thr) b--
  a = Math.max(0, a - Math.round(0.02 * SR))
  b = Math.min(x.length, b + Math.round(0.08 * SR))
  return { x: x.slice(a, b), lead: a / SR }
}
const lengthOf = (b64) => {
  const tmp = path.join(CACHE, '_len.mp3'); fs.writeFileSync(tmp, Buffer.from(b64, 'base64'))
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', tmp]).toString())
}
// words with start/end (seconds, in the original clip) from character alignment, without [audio tags]
function words(al) {
  const out = []
  if (!al) return out
  let cur = null, inTag = false
  al.characters.forEach((c, i) => {
    if (c === '[') inTag = true
    if (inTag) { if (c === ']') inTag = false; return }
    if (/\s/.test(c)) { if (cur) out.push(cur); cur = null; return }
    if (!cur) cur = { w: '', s: al.character_start_times_seconds[i], e: 0 }
    cur.w += c
    cur.e = al.character_end_times_seconds[i]
  })
  if (cur) out.push(cur)
  return out
}
// characters with start/end (seconds, in the original clip), without [audio tags]
function letters(al) {
  const out = []
  if (!al) return out
  let inTag = false
  al.characters.forEach((c, i) => {
    if (c === '[') inTag = true
    if (!inTag) out.push({ c, s: al.character_start_times_seconds[i], e: al.character_end_times_seconds[i] })
    if (c === ']') inTag = false
  })
  return out
}
// lip-sync track, one digit per frame: 2 = open (vowels), 1 = half (most consonants), 0 = shut (m b p f v, pauses,
// silence). Driven by ElevenLabs' character timings, gated by the loudness envelope.
function mouthTrack(chars, env) {
  let out = ''
  for (let f = 0; f < env.length; f++) {
    const t = (f + 0.5) / FPS
    const ch = chars.find((c) => t >= c.s && t < c.e)
    let v = 0
    if (ch && Number(env[f]) >= 2) v = /[aeiouyáéíóúAEIOUY]/.test(ch.c) ? 2 : /[mbpfvMBPFV]/.test(ch.c) ? 0 : /[a-zA-Z']/.test(ch.c) ? 1 : 0
    out += v
  }
  return out
}
const FPS = 30
function envelope(x) {
  const hop = SR / FPS, n = Math.ceil(x.length / hop), v = []
  for (let f = 0; f < n; f++) {
    let s = 0, c = 0
    for (let i = Math.floor(f * hop); i < Math.min(x.length, (f + 1) * hop); i++) { s += x[i] * x[i]; c++ }
    v.push(Math.sqrt(s / Math.max(1, c)))
  }
  const peak = Math.max(...v, 1e-6)
  return v.map((a) => Math.min(9, Math.round(Math.sqrt(a / peak) * 9.4 - 1.4))).map((d) => Math.max(0, d)).join('')
}
function wav(file, L, R) {
  const n = L.length, b = Buffer.alloc(44 + n * 4)
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20)
  b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34)
  b.write('data', 36); b.writeUInt32LE(n * 4, 40)
  for (let i = 0; i < n; i++) {
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4)
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4)
  }
  fs.writeFileSync(file, b)
}
// lufs: loudness-normalise (the song to -14 LUFS like streaming services, the click lines a touch under it)
const mp3 = (src, dst, kbps = 160, lufs = 0) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src,
  ...(lufs ? ['-af', `loudnorm=I=${lufs}:TP=-1.5:LRA=11`, '-ar', String(SR)] : []), '-codec:a', 'libmp3lame', '-b:a', `${kbps}k`, dst])

// a character's take of a line, fitted to `slot` seconds: { x, words, dur }
async function take(who, text, slot) {
  const parts = []
  for (const member of CAST[who]) {
    const t = await tts(member.voice, text)
    const raw = lengthOf(t.audio)
    // speed up only if it does not fit (never more than 1.3x), then trim silence
    const speed = Math.min(1.3, Math.max(1, (raw * 0.9) / slot))
    const { x, lead } = trim(processAudio(t.audio, member.pitch, speed))
    const ws = words(t.alignment).map((w) => ({ w: w.w, s: +(w.s / speed - lead).toFixed(3), e: +(w.e / speed - lead).toFixed(3) }))
    const cs = letters(t.alignment).map((c) => ({ c: c.c, s: c.s / speed - lead, e: c.e / speed - lead }))
    parts.push({ x, ws, cs, member })
  }
  return parts
}

// ——— build the song ———
const beat = 60 / BPM, bar = 4 * beat
const events = EVENTS.map((e) => ({ ...e, t: +(e.bar * bar).toFixed(3), type: e.sfx || e.type, cue: e.type }))
const band = renderBand({ bpm: BPM, sections: SECTIONS, events })
const vocL = new Float32Array(band.L.length), vocR = new Float32Array(band.L.length)
const lines = []
for (const line of LINES) {
  const start = line.bar * bar, slot = line.bars * bar
  const parts = await take(line.who, line.text, slot)
  const mixLen = Math.max(...parts.map((p) => p.x.length + Math.round((p.member.delay || 0) * SR)))
  const mono = new Float32Array(mixLen)
  const gain = parts.length > 1 ? 0.62 : 1.1
  for (const p of parts) {
    const o = Math.round((p.member.delay || 0) * SR), pan = p.member.pan || 0
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2, gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2
    for (let i = 0; i < p.x.length; i++) {
      const k = Math.round(start * SR) + o + i
      if (k < vocL.length) { vocL[k] += p.x[i] * gl; vocR[k] += p.x[i] * gr }
      mono[o + i] += p.x[i]
    }
  }
  const dur = mixLen / SR
  if (dur > slot + 0.05) console.log(`  ! "${line.text.slice(0, 40)}" runs ${(dur - slot).toFixed(2)}s over its slot`)
  lines.push({
    who: line.who, start: +start.toFixed(3), end: +(start + dur).toFixed(3),
    text: line.text.replace(/\[[^\]]*\]\s*/g, '').trim(),
    words: parts[0].ws.map((w) => ({ ...w, s: +(start + Math.max(0, w.s)).toFixed(3), e: +(start + w.e).toFixed(3) })),
    env: envelope(mono),
  })
  lines.at(-1).mouth = mouthTrack(parts[0].cs, lines.at(-1).env)
}

// duck the band a little under the voices, then master
const total = SECTIONS.reduce((s, x) => s + x.bars, 0) * bar + 2.2
const n = Math.min(band.L.length, Math.ceil(total * SR))
const L = new Float32Array(n), R = new Float32Array(n)
let duck = 1
for (let i = 0; i < n; i++) {
  const v = Math.abs(vocL[i]) + Math.abs(vocR[i])
  const target = v > 0.02 ? 0.5 : 1
  duck += (target - duck) * (target < duck ? 0.002 : 0.00005)
  L[i] = band.L[i] * duck + vocL[i]
  R[i] = band.R[i] * duck + vocR[i]
}
let peak = 0
for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
const g = 0.95 / Math.tanh(peak * 1.2) // soft clip then normalise
for (let i = 0; i < n; i++) { L[i] = Math.tanh(L[i] * 1.2) * g * 0.98; R[i] = Math.tanh(R[i] * 1.2) * g * 0.98 }
const fade = Math.round(1.2 * SR)
for (let i = 0; i < fade; i++) { L[n - 1 - i] *= i / fade; R[n - 1 - i] *= i / fade }
wav(path.join(CACHE, '_song.wav'), L, R)
wav(path.join(CACHE, '_vocals.wav'), vocL.subarray(0, n), vocR.subarray(0, n)) // for checking the words (whisper)
mp3(path.join(CACHE, '_song.wav'), path.join(AUDIO, 'song.mp3'), 160, -14)

const sections = []
let acc = 0
for (const s of SECTIONS) { sections.push({ name: s.name, start: +(acc * bar).toFixed(3), end: +((acc + s.bars) * bar).toFixed(3) }); acc += s.bars }
fs.writeFileSync(path.join(DATA, 'song.json'), JSON.stringify({
  title: "Make a Good Choice (The Mollie Stone's Hoedown)", bpm: BPM, beat: +beat.toFixed(5), bar: +bar.toFixed(5),
  duration: +(n / SR).toFixed(3), fps: FPS, sections, events: events.map(({ t, cue }) => ({ t, type: cue })), lines,
}, null, 1))
console.log(`song: ${(n / SR).toFixed(1)}s, ${lines.length} lines`)

// ——— click sounds ———
fs.mkdirSync(path.join(AUDIO, 'sfx'), { recursive: true })
for (const name of ['boing', 'pop', 'ding', 'whoosh', 'kaching', 'cowbell', 'whistle', 'whistleDown']) {
  const x = SFX[name](), peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 1e-6), y = x.map((v) => (v / peak) * 0.8)
  wav(path.join(CACHE, '_sfx.wav'), y, y)
  mp3(path.join(CACHE, '_sfx.wav'), path.join(AUDIO, 'sfx', name + '.mp3'), 96)
}

// ——— gags ———
if (!process.argv.includes('--no-gags')) {
  const gags = []
  for (const [i, [who, text]] of GAGS.entries()) {
    const [p] = await take(who, text, 99)
    const id = `${who}-${i}`
    const tmp = path.join(CACHE, '_gag.wav')
    wav(tmp, p.x.map((v) => v * 0.95), p.x.map((v) => v * 0.95))
    mp3(tmp, path.join(AUDIO, 'gags', id + '.mp3'), 96, -15)
    const env = envelope(p.x)
    gags.push({ id, who, text: text.replace(/\[[^\]]*\]\s*/g, '').trim(), dur: +(p.x.length / SR).toFixed(3), env, mouth: mouthTrack(p.cs, env) })
  }
  fs.writeFileSync(path.join(DATA, 'gags.json'), JSON.stringify(gags, null, 1))
  console.log(`gags: ${gags.length}`)
}
