// Address of a file in public/ (sprites, audio), wherever the site is served from: a domain root, or a sub-path
// such as GitHub Pages' https://<user>.github.io/<repo>/. BASE_URL is './' in the build and '/' in dev. The
// result is a full address, so it also works in a CSS custom property, where a relative url() would be resolved
// against the stylesheet instead of the page. A leading slash is fine: sprites.json writes '/img/x.webp'.
export const asset = (path) => new URL(import.meta.env.BASE_URL + path.replace(/^\//, ''), document.baseURI).href
