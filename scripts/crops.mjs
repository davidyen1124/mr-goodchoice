// Cuts the reference crop for every element out of ref/scene.jpg (art/crops/<name>.png) and draws every
// box on the photo (ref/boxes.png) so the measurements can be checked by eye.
import sharp from 'sharp'
import { ELEMENTS } from '../art/manifest.mjs'

const SRC = 'ref/scene.jpg'
const { width: PW, height: PH } = await sharp(SRC).metadata()
const k = PW / 2000 // stage units -> photo pixels

for (const e of ELEMENTS.filter((e) => e.box && !e.ui)) {
  const [x, y, w, h] = e.box
  const pad = e.opaque ? 0 : Math.max(18, Math.round(Math.min(w, h) * 0.18))
  const left = Math.max(0, Math.round((x - pad) * k)), top = Math.max(0, Math.round((y - pad) * k))
  const right = Math.min(PW, Math.round((x + w + pad) * k)), bottom = Math.min(PH, Math.round((y + h + pad) * k))
  let img = sharp(SRC).extract({ left, top, width: right - left, height: bottom - top })
  // tiny elements: upscale so image_gen sees detail
  if (right - left < 400) img = img.resize({ width: 512, kernel: 'lanczos3' })
  await img.png().toFile(`art/crops/${e.name}.png`)
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1500">${ELEMENTS.filter((e) => e.box && !e.opaque && !e.ui)
  .map(({ name, box: [x, y, w, h] }, i) => {
    const c = `hsl(${(i * 47) % 360} 100% 55%)`
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${c}" stroke-width="3"/><text x="${x + 3}" y="${y + 15}" font-size="15" font-family="Menlo" fill="${c}" stroke="#000" stroke-width="3" paint-order="stroke">${name}</text>`
  })
  .join('')}</svg>`
await sharp(SRC).resize(2000, 1500).composite([{ input: Buffer.from(svg) }]).png().toFile('ref/boxes.png')
console.log(`${ELEMENTS.length} crops`)
