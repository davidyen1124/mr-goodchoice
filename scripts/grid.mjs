// Renders assets-src/ref/scene.jpg at stage resolution (2000x1500) with a labelled 50px grid, for measuring element boxes.
// usage: node scripts/grid.mjs [x y w h]  -> writes assets-src/ref/grid.png (or a zoomed crop assets-src/ref/grid-crop.png)
import sharp from 'sharp'
const W = 2000, H = 1500
const [x, y, w, h] = process.argv.slice(2).map(Number)
let lines = ''
for (let i = 0; i <= W; i += 50) lines += `<line x1="${i}" y1="0" x2="${i}" y2="${H}" stroke="${i % 100 ? '#00ffff55' : '#ff00ffaa'}" stroke-width="${i % 100 ? 1 : 2}"/>`
for (let j = 0; j <= H; j += 50) lines += `<line x1="0" y1="${j}" x2="${W}" y2="${j}" stroke="${j % 100 ? '#00ffff55' : '#ff00ffaa'}" stroke-width="${j % 100 ? 1 : 2}"/>`
let labels = ''
for (let i = 0; i < W; i += 100) for (let j = 0; j < H; j += 100)
  labels += `<text x="${i + 3}" y="${j + 14}" font-size="13" font-family="Menlo" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">${i},${j}</text>`
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${lines}${labels}</svg>`)
let img = sharp('assets-src/ref/scene.jpg').resize(W, H).composite([{ input: svg }])
if (w) {
  const buf = await img.png().toBuffer()
  await sharp(buf).extract({ left: x, top: y, width: w, height: h }).toFile('assets-src/ref/grid-crop.png')
} else await img.png().toFile('assets-src/ref/grid.png')
