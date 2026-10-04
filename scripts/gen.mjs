// Recreates every element of the scene with Codex CLI's built-in image_gen tool (the imagegen skill),
// one `codex exec` per image, with the element's crop of the photo attached as the reference.
// An element's `alt` frame is a second run that edits the first render, so the two frames match.
// usage: node scripts/gen.mjs [--force] [--alt-only] [--no-alt] [-j 6] [name ...]
// Output: art/raw/<name>.png and art/raw/<name>-alt.png
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { CUTOUT, ELEMENTS, LOOK } from '../art/manifest.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const RAW = path.join(ROOT, 'art/raw')
const LOG = path.join(ROOT, 'art/logs')
const CROPS = path.join(ROOT, 'art/crops')
const GEN = path.join(os.homedir(), '.codex/generated_images')
fs.mkdirSync(RAW, { recursive: true })
fs.mkdirSync(LOG, { recursive: true })

const argv = process.argv.slice(2)
const force = argv.includes('--force')
const altOnly = argv.includes('--alt-only')
const noAlt = argv.includes('--no-alt')
const jIdx = argv.indexOf('-j')
const jobs = jIdx >= 0 ? Number(argv[jIdx + 1]) : 6
const names = argv.filter((a, i) => !a.startsWith('-') && argv[i - 1] !== '-j')
const picked = ELEMENTS.filter((e) => (names.length ? names.includes(e.name) : true))
const has = (file) => fs.existsSync(path.join(RAW, file + '.png'))

const HEAD = [
  'Use the imagegen skill with your built-in image_gen tool (NOT the CLI fallback, no API key needed).',
  'Make exactly ONE image_gen call, then reply with just DONE. Do not write code, do not create or edit files, do not ask questions.',
]

const baseBrief = (e) =>
  [
    ...HEAD,
    e.ui
      ? 'This is a new interface illustration for a premium kids app; there is no reference image.'
      : 'The attached image is a crop of a photo of a grocery-store farm-stand display. Use it as the REFERENCE input image for image_gen.',
    e.opaque
      ? 'This image is OPAQUE and full-bleed: it fills the whole canvas. Do not make it transparent.'
      : 'This image MUST have a genuinely transparent background (real alpha channel): request a transparent background from image_gen and keep the alpha.',
    '',
    `Canvas: ${e.canvas}.`,
    '',
    'BRIEF:',
    e.prompt,
    '',
    e.ui ? '' : LOOK,
    e.opaque ? '' : CUTOUT,
  ].join('\n')

const altBrief = (e) =>
  [
    ...HEAD,
    'The attached image is the edit target. Use image_gen in EDIT mode on it.',
    'Keep the genuinely transparent background (real alpha channel): request a transparent background from image_gen and keep the alpha.',
    '',
    'EDIT:',
    e.alt,
    '',
    CUTOUT,
  ].join('\n')

function run(label, brief, image, outName) {
  return new Promise((resolve) => {
    // --image is variadic, so it goes after the "-" that means "prompt on stdin"
    const args = ['exec', '--skip-git-repo-check', '-c', 'model_reasoning_effort="low"', '-C', RAW, '--json', '-', ...(image ? ['-i', image] : [])]
    const t0 = Date.now()
    const p = spawn('codex', args, { stdio: ['pipe', 'pipe', 'pipe'] })
    const out = fs.createWriteStream(path.join(LOG, outName + '.jsonl'))
    let first = ''
    p.stdout.on('data', (d) => {
      if (!first) first = d.toString()
      out.write(d)
    })
    p.stderr.pipe(fs.createWriteStream(path.join(LOG, outName + '.err')))
    p.stdin.end(brief)
    p.on('close', (code) => {
      out.end()
      const tid = (first.match(/"thread_id":"([^"]+)"/) || [])[1]
      const dir = tid && path.join(GEN, tid)
      const pngs = dir && fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.png')) : []
      const secs = Math.round((Date.now() - t0) / 1000)
      if (pngs.length) {
        const newest = pngs.map((f) => path.join(dir, f)).sort((x, y) => fs.statSync(y).mtimeMs - fs.statSync(x).mtimeMs)[0]
        fs.copyFileSync(newest, path.join(RAW, outName + '.png'))
        console.log(`ok   ${label.padEnd(20)} ${secs}s`)
        resolve(true)
      } else {
        console.log(`FAIL ${label.padEnd(20)} exit=${code} ${secs}s thread=${tid}`)
        resolve(false)
      }
    })
  })
}

// One job per element: its base render (unless it exists), then its alt frame from that render.
async function element(e) {
  if (!altOnly && (force || !has(e.name))) {
    // `edit`: this element is an edit of another element's render rather than a recreation from the photo
    const ok = e.edit
      ? await run(e.name, altBrief({ alt: e.prompt }), path.join(RAW, e.edit + '.png'), e.name)
      : await run(e.name, baseBrief(e), e.ui ? null : path.join(CROPS, e.name + '.png'), e.name)
    if (!ok) return
  }
  if (e.alt && !noAlt && has(e.name) && (force || !has(e.name + '-alt')))
    await run(e.name + '-alt', altBrief(e), path.join(RAW, e.name + '.png'), e.name + '-alt')
}

const queue = [...picked]
console.log(`${queue.length} element(s), ${jobs} at a time`)
await Promise.all(
  Array.from({ length: Math.min(jobs, queue.length) }, async () => {
    while (queue.length) await element(queue.shift())
  }),
)
console.log('all done')
