// Round avatars for the subtitle stickers: each singer's face cropped out of its sprite -> public/img/avatar-<who>.webp
// [sprite, centre x, centre y, size] with centre and size as fractions of the sprite's width (y of its height).
import sharp from 'sharp'

const FACES = {
  goodchoice: ['goodchoice', 0.5, 0.135, 0.62],
  bull: ['bull', 0.54, 0.5, 0.86],
  chicken: ['chicken', 0.5, 0.24, 0.78],
  bagel: ['bagel', 0.5, 0.47, 0.6],
  banana: ['banana', 0.5, 0.25, 0.9],
  peppers: ['pepper-black', 0.5, 0.58, 0.9],
  grapes: ['grape', 0.5, 0.5, 1.02],
  choir: ['tomato', 0.5, 0.52, 1.02],
  tomatoes: ['tomato', 0.5, 0.52, 1.02],
  carrots: ['carrot', 0.5, 0.42, 0.95],
  cabbage: ['cabbage', 0.5, 0.52, 1.0],
  peapod: ['peapod', 0.5, 0.5, 0.95],
  corn: ['corn', 0.52, 0.42, 0.95],
  pears: ['pear', 0.5, 0.46, 1.0],
  limes: ['lime', 0.5, 0.52, 1.02],
}
const S = 192
for (const [who, [sprite, cx, cy, size]] of Object.entries(FACES)) {
  const src = `public/img/${sprite}.webp`
  const { width: w, height: h } = await sharp(src).metadata()
  const side = Math.round(size * w), left = Math.round(cx * w - side / 2), top = Math.round(cy * h - side / 2)
  const pad = Math.max(0, -left, -top, left + side - w, top + side - h)
  // (two steps: in one sharp pipeline the extract would run before the extend)
  const padded = await sharp(src).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  await sharp(padded).extract({ left: left + pad, top: top + pad, width: side, height: side }).resize(S, S).webp({ quality: 90 }).toFile(`public/img/avatar-${who}.webp`)
}
console.log(Object.keys(FACES).length, 'avatars')
