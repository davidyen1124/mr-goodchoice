// App icons and the web app manifest's artwork: the singing tomato on a sunny tile.
import sharp from 'sharp'
const tile = (s, r) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><defs><radialGradient id="g" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#ffb62e"/></radialGradient></defs><rect width="${s}" height="${s}" rx="${r}" fill="url(#g)"/></svg>`)
for (const [file, s, r, inner] of [['icon-512.png', 512, 0, 360], ['icon-192.png', 192, 0, 136], ['apple-touch-icon.png', 180, 0, 128], ['favicon.png', 64, 14, 54]]) {
  const face = await sharp('assets-src/art/raw/tomato.png').trim().resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  await sharp(tile(s, r)).composite([{ input: face, gravity: 'center' }]).png().toFile('public/' + file)
}
console.log('icons')
