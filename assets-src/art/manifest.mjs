// Every element of the Mr. Goodchoice farm-stand scene (assets-src/ref/scene.jpg), recreated one by one with Codex CLI's
// built-in image_gen (scripts/gen.mjs) so each can be animated on its own.
// box: where the element sits in the photo, in stage units (the photo scaled to 2000x1500).
// The crop of the photo around `box` is attached to the Codex run as the reference image.
// alt: a second frame of the same sprite (usually the other mouth position), made by editing the first.

export const LOOK = `STYLE: a faithful, photo-real recreation of the object in the attached reference photo: same design, colours, materials, proportions, pose and expression. These are painted fibreglass / foam-latex animatronic figures and props from a 1990s grocery-store farm-stand show, lit by warm indoor store light. Clean and crisp, high detail, as if photographed again with a better camera. Rebuild any part of the object that is hidden or cut off in the reference so the object is complete.`

export const CUTOUT = `Isolated object on a genuinely TRANSPARENT background (real alpha channel): no backdrop, no floor, no wall, no other objects from the photo, no drop shadow, no cast shadow, no glow. The whole object is inside the canvas with a small margin, nothing cropped.`

const FACE = 'Keep its cartoon face exactly as in the reference: the same eyes and the same big mouth.'
const OPEN = 'Change ONLY the mouth: open it much wider, as if belting out a loud note in a song (a dark open mouth, a hint of tongue). Keep everything else identical: same object, size, position, angle, colours, eyes, framing and canvas.'
const SHUT = 'Change ONLY the mouth: close it into a tight, cheeky closed-lip smile. Keep everything else identical: same object, size, position, angle, colours, eyes, framing and canvas.'

export const ELEMENTS = [
  // ——— the room ———
  {
    // source only: the page uses its edit store-bg-noceiling below
    name: 'store-bg', box: [0, 0, 2000, 1500], opaque: true, source: true, canvas: 'landscape 4:3 (1536x1152), or 1536x1024 if 4:3 is unavailable',
    prompt: `Recreate the grocery-store interior seen in the reference photo, from exactly the same camera position and framing, but with the farm-stand display (its sign, roof, posts, back wall, all characters, crates, white picket fence) and every foreground item (coolers, orange wire bins of balls, price signs, snack box) REMOVED. Where the stand was, show the plain beige store wall and the grey-blue floor continuing naturally. Keep: the drop ceiling with acoustic tiles and the two fluorescent light panels; the smoke detector at the top right; on the left, the greeting-card rack, the doorway into the produce area and the wooden slat wall hung with plush toys and children's books; on the right, the chrome wire shelving with snack bags and tubs, red coolers on the top shelf, the drinks fridge, and the tall red-and-yellow chip display at the far right edge. Full-bleed, opaque, no transparency.`,
  },
  {
    // the store without its ceiling: everything above the walls is transparent and the page shows darkness there
    name: 'store-bg-noceiling', edit: 'store-bg', box: null,
    prompt: 'Remove the ceiling completely: the drop-ceiling tiles, both fluorescent light panels, the smoke detector, and any ceiling seen through the openings in the walls. Everything above the top edges of the walls must be fully TRANSPARENT (real alpha channel). Keep the walls, the greeting-card rack, the slat wall with plush toys and books, the doorway, the wire shelving, the drinks fridge, the red-and-yellow chip display and the floor exactly as they are: same position, size, colours, framing and canvas.',
  },
  {
    name: 'stand', box: [160, 330, 1725, 935], canvas: 'landscape 16:9 (1536x864)',
    prompt: `Recreate ONLY the empty wooden farm-stand booth structure: the shingled roof edge across the top, the blue-painted fascia beam under it, the two blue corner posts with their diagonal braces, the weathered blue-grey plank back wall and side walls, the dark open doorway on the left of the back wall (with a white prize rosette ribbon pinned beside it), the coiled rope hanging on the left wall, the small framed painting of farm fields on the back wall, and the bundles of straw hanging along the top beam. Remove the sign above the roof, every character and animal, the hanging lamps, the lantern, the crates, the hay, all produce, the push button and the white picket fence: the booth must be EMPTY, with the bare plank floor visible. Keep the exact perspective and proportions of the reference. Everything outside the booth's outline is transparent.`,
  },
  {
    name: 'sign', box: [440, 45, 1160, 322], canvas: 'landscape 3:1 or the widest available (1536x512 or 1536x1024)',
    prompt: `Recreate the arched white wooden sign on top of the booth. It reads, in three lines, exactly:
line 1, chunky dark-green 3D block letters: "MR. GOODCHOICE"
line 2, chunky black letters: "WELCOMES YOU TO"
line 3, big chunky red 3D block letters with a dark-red extrusion: "MOLLIE STONE'S MARKET"
Spell every word exactly: M-R-.  G-O-O-D-C-H-O-I-C-E / W-E-L-C-O-M-E-S  Y-O-U  T-O / M-O-L-L-I-E  S-T-O-N-E-'-S  M-A-R-K-E-T.
A hand-drawn pink tomato with a green leafy top sits on each side of line 1. Flat bottom edge, gently arched top, cream-white paint, no other text.`,
  },
  { name: 'lamp', box: [655, 420, 82, 142], canvas: 'portrait 2:3 (1024x1536)', prompt: 'Recreate one hanging metal barn pendant lamp: dark gunmetal cone shade on a short rod, hanging straight down, the bulb hidden inside. Only the lamp.' },
  { name: 'lantern', box: [1432, 505, 56, 112], canvas: 'portrait 2:3 (1024x1536)', prompt: 'Recreate the small old-fashioned hanging oil lantern (dark metal frame, glass chimney, wire bail handle) that hangs on the right wall of the booth. Only the lantern.' },
  {
    // hiRes: also drawn big as the app's main button
    name: 'push', box: [1596, 655, 54, 72], canvas: 'square (1024x1024)', hiRes: 480,
    prompt: 'Recreate the small white push-button box mounted on the booth post: a white rectangular plate with the word "PUSH" printed in red capitals at the top and a round glossy blue push button below it. Front view, only the button box.',
    alt: 'Change ONLY the blue button: make it lit up and glowing bright electric blue from inside, pressed in slightly. Keep everything else identical, same framing and canvas.',
  },

  // ——— the cast ———
  {
    name: 'goodchoice', box: [1010, 606, 165, 340], canvas: 'portrait 2:3 (1024x1536)',
    prompt: `Recreate Mr. Goodchoice, the animatronic old grocer: a cheerful ruddy old man with a big grin, wearing a black baseball cap, a white long-sleeved shirt and a black apron printed with "MOLLIE STONE'S" in small white letters. Show him from the cap down to his knees. His right hand (on the viewer's right) is held out in front, cupped, palm up and EMPTY (no egg). ${FACE}`,
    alt: OPEN,
  },
  {
    name: 'bull', box: [678, 622, 156, 220], canvas: 'square (1024x1024)',
    prompt: `Recreate the animatronic bull: a shaggy brown furry head and neck with two short curved cream horns, a pale pink muzzle with big nostrils, droopy eyelids, and a red leather collar. Show the head, neck and the top of the shoulders, as in the reference. ${FACE}`,
    alt: 'Change ONLY the mouth: drop the jaw open wide in a long goofy "MOOO", showing a pink tongue. Keep everything else identical: same object, size, position, angle, colours, eyes, framing and canvas.',
  },
  {
    name: 'bagel', box: [833, 425, 195, 212], canvas: 'square (1024x1024)',
    prompt: `Recreate the animatronic bagel character sitting on its little wooden swing: a round golden-brown sesame bagel with a cartoon face (big eyes, wide grin), skinny arms and legs in white sneakers, wearing a dark red baseball cap with a white letter "S". Include the swing: a short wooden plank seat under him and two ropes rising straight up from the plank ends to the top edge of the canvas. ${FACE}`,
    alt: OPEN,
  },
  {
    name: 'chicken', box: [1188, 446, 130, 175], canvas: 'portrait 2:3 (1024x1536)',
    prompt: 'Recreate the animatronic white hen: fluffy white feathers, bright red comb and wattle, yellow beak, sitting upright. Show her from the comb down to the bottom of her body (no legs).',
    alt: 'Change ONLY the beak: open it wide in a loud cluck. Keep everything else identical: same object, size, position, angle, colours, framing and canvas.',
  },
  { name: 'nest', box: [1148, 588, 270, 178], canvas: 'landscape 3:2 (1536x1024)', prompt: 'Recreate the big shaggy mound of golden straw the hen sits on: a hanging hay nest with long straw strands drooping down. Only the straw, no hen.' },
  {
    name: 'peapod', box: [1236, 688, 80, 310], canvas: 'portrait 2:3 (1024x1536)',
    prompt: `Recreate the tall green pea pod character standing upright: a long glossy green pod split open down the front, with three round green peas inside stacked vertically, each pea with its own cartoon face (eyes and smile). ${FACE}`,
    alt: 'Change ONLY the three peas\' mouths: open all three wide, singing. Keep everything else identical: same object, size, position, angle, colours, eyes, framing and canvas.',
  },
  { name: 'vine', box: [1192, 628, 365, 305], canvas: 'square (1024x1024)', prompt: 'Recreate ONLY the leafy green tomato-plant foliage behind the tomatoes: a bushy mass of green tomato leaves and stems. Remove every tomato and the pea pod; fill the gaps with more leaves.' },
  {
    name: 'tomato', box: [1400, 650, 96, 78], canvas: 'square (1024x1024)',
    prompt: `Recreate ONE glossy red tomato character from the reference: a round shiny red tomato with a big cartoon face, small eyes and a huge wide open-mouthed grin, and a small green stem on top. Front view. ${FACE}`,
    alt: SHUT,
  },
  {
    name: 'banana', box: [552, 772, 100, 140], canvas: 'portrait 2:3 (1024x1536)',
    prompt: `Recreate the banana character standing upright: a yellow banana with a cartoon face, rosy cheeks, wearing small dark sunglasses, with a little dried-flower decoration on its side. ${FACE}`,
    alt: OPEN,
  },
  { name: 'grape-leaves', box: [612, 815, 215, 200], canvas: 'square (1024x1024)', prompt: 'Recreate ONLY the dark green grape-vine leaves behind the purple fruit characters. Remove every purple fruit; fill the gaps with more vine leaves.' },
  {
    name: 'grape', box: [690, 840, 58, 48], canvas: 'square (1024x1024)',
    prompt: `Recreate ONE of the round purple plum/grape characters: a single matte lavender-purple ball with two small eyes and a big grin. Front view. ${FACE}`,
    alt: OPEN,
  },
  {
    name: 'pepper-black', box: [544, 882, 112, 124], canvas: 'square (1024x1024)',
    prompt: `Recreate the chili-pepper character wearing a black mariachi sombrero trimmed with little red pom-poms (the one under the banana): a plump red-orange pepper with a big cartoon face and a wide grin. ${FACE}`,
    alt: SHUT,
  },
  {
    name: 'pepper-red', box: [690, 962, 120, 128], canvas: 'square (1024x1024)',
    prompt: `Recreate the bright red chili-pepper character with the tall pointed tip, wearing a pink-and-red sombrero tipped to one side and trimmed with yellow pom-poms: a big cartoon face with a huge open grin. ${FACE}`,
    alt: SHUT,
  },
  {
    name: 'pepper-hat', box: [460, 935, 98, 122], canvas: 'square (1024x1024)',
    prompt: `Recreate the round red pepper character on the far left wearing a dark felt hat with a gold braided band: a big cartoon face with a wide grin. ${FACE}`,
    alt: SHUT,
  },
  {
    name: 'pear', box: [600, 978, 84, 106], canvas: 'square (1024x1024)',
    prompt: `Recreate ONE yellow pear character wearing a small woven straw hat: a chubby golden-yellow pear with a cartoon face and a long open grin. ${FACE}`,
    alt: SHUT,
  },
  {
    name: 'corn', box: [812, 875, 60, 130], canvas: 'portrait 2:3 (1024x1536)',
    prompt: `Recreate ONE standing corn-cob character: a yellow ear of corn with rows of kernels, a small cartoon face (two eyes and a smile), wrapped at the bottom in long green husk leaves that flare out. ${FACE}`,
    alt: OPEN,
  },
  {
    name: 'carrot', box: [1023, 922, 62, 118], canvas: 'portrait 2:3 (1024x1536)',
    prompt: `Recreate ONE orange carrot character standing upright: a chunky orange carrot with ridges, a cartoon face with two eyes and a big open smile, and a tuft of short green leaves on top. ${FACE}`,
    alt: SHUT,
  },
  {
    name: 'cabbage', box: [1088, 920, 80, 98], canvas: 'square (1024x1024)',
    prompt: `Recreate the green cabbage character: a round pale-green cabbage head with layered leaves and a shy cartoon face (two eyes and a smile). ${FACE}`,
    alt: OPEN,
  },
  {
    name: 'lime', box: [1262, 1100, 72, 70], canvas: 'square (1024x1024)',
    prompt: `Recreate ONE of the bright green round fruit characters peeking out of the lower crate (a lime / green tomato): glossy bright green, with a cartoon face. Front view. ${FACE}`,
    alt: OPEN,
  },

  // ——— crates and hay ———
  { name: 'greens', box: [998, 878, 245, 160], canvas: 'landscape 3:2 (1536x1024)', prompt: 'Recreate ONLY the dark green leafy foliage that fills the space behind and between the standing carrots and the cabbage: a low, dense, bushy mound of dark green carrot tops and leafy greens. Remove the carrots, the cabbage, Mr. Goodchoice and the crate; fill their place with more leaves.' },
  { name: 'hay', box: [450, 1018, 380, 240], canvas: 'landscape 3:2 (1536x1024)', prompt: 'Recreate the big round woven wicker basket overflowing with golden hay that the peppers and pears sit on. Only the basket and its hay, no characters.' },
  { name: 'crate-corn', box: [815, 1022, 195, 135], canvas: 'landscape 3:2 (1536x1024)', prompt: 'Recreate the orange-painted wooden crate packed with ears of yellow corn in green husks standing upright. Only the crate and the corn.' },
  { name: 'crate-carrot', box: [995, 1018, 242, 148], canvas: 'landscape 3:2 (1536x1024)', prompt: 'Recreate the orange-painted wooden slatted crate the carrots stand in, seen straight from the front, EMPTY (no carrots, no cabbage). Match the slat layout of the reference exactly: a narrow top rail; below it a WIDE open gap, about a third of the crate\'s height, where the carrots\' faces show in the reference; then a slat; a narrow gap; and a bottom slat. Vertical corner posts at both ends. Through the gaps you see the dark, empty inside of the crate.' },
  { name: 'crate-tomato', box: [1220, 892, 330, 215], canvas: 'landscape 3:2 (1536x1024)', prompt: 'Recreate the orange-painted wooden slatted crate the tomatoes sit in, at the same angle (its front and its solid right side panel visible), EMPTY (no tomatoes). Match the slat layout of the reference exactly: the open top; a first slat about a quarter of the way down (in the reference it hides the bottoms of the top row of tomatoes); a WIDE open gap where the second row of tomatoes shows; then two lower slats with a narrow gap. Through the gaps you see the dark, empty inside of the crate.' },
  { name: 'crate-lime', box: [1235, 1088, 318, 182], canvas: 'landscape 3:2 (1536x1024)', prompt: 'Recreate the lower orange-painted wooden slatted crate (its front and its solid right side panel visible), EMPTY (no fruit). Match the slat layout of the reference: a narrow top rail; below it a WIDE open gap, about a third of the crate\'s height, where the green faces show in the reference; then two lower slats with a narrow gap between them. Through the gaps you see the dark, empty inside of the crate.' },
  // the front panels of the crates, drawn over the characters inside so they peek out between the slats
  ...['crate-carrot', 'crate-tomato', 'crate-lime'].map((c) => ({
    name: c + '-front', edit: c, box: null,
    prompt: 'Keep ONLY the slats and corner posts of the crate panels that face the viewer (the front panel, and the right side panel if it is visible). Erase the back panel, the far side panel, the inside floor and everything seen through the gaps: the gaps between the front slats, and everything above and behind them, must be fully TRANSPARENT. Do not move, resize or redraw the remaining slats: same position, size, colours, framing and canvas.',
  })),

  // ——— the fence (the coolers, ball bins, snack box and price cards in front of it were left out) ———
  { name: 'skirt', box: [380, 1235, 1270, 265], canvas: 'landscape 3:1 or the widest available (1536x512 or 1536x1024)', prompt: 'Recreate ONLY the dark weathered wooden base of the booth seen through the gaps of the white picket fence: a long low skirt of dark grey-brown vertical planks under the booth floor, with the blue-painted floor edge along its top. Remove the fence, the coolers, the bins and everything in front of it; show the whole skirt from end to end, straight on.' },
  { name: 'fence-l', box: [200, 1080, 820, 420], canvas: 'landscape 2:1 or 3:2 (1536x1024)', prompt: 'Recreate the LEFT half of the white wooden picket fence in front of the booth, with the same pickets, rounded/pointed tops and perspective (the far-left end turns toward the camera). Only the fence: nothing behind it and nothing in front of it.' },
  { name: 'fence-r', box: [1000, 1080, 815, 420], canvas: 'landscape 2:1 or 3:2 (1536x1024)', prompt: 'Recreate the RIGHT half of the white wooden picket fence in front of the booth, with the same pickets, rounded tops and perspective (the right end turns toward the camera). Only the fence: nothing behind it and nothing in front of it.' },
  { name: 'ball', box: [816, 1146, 56, 56], canvas: 'square (1024x1024)', prompt: 'Recreate the small pink rubber playground ball with a faint printed pattern lying on the booth floor. Only the ball.' },
  // ——— interface (not in the photo): the tutorial glove that shows what to tap ———
  {
    name: 'hand', ui: true, box: [0, 0, 140, 160], canvas: 'square (1024x1024)',
    prompt: 'A big friendly white cartoon glove hand, the classic animation glove with a rolled cuff, the index finger extended and pointing straight UP and slightly to the LEFT, the other fingers curled into the palm, the thumb tucked, three stitch lines on the back of the hand. Soft glossy 3D shading like a premium kids-game tutorial pointer, a thin cool-grey outline so it reads on white backgrounds. Seen from the back of the hand.',
  },
  { name: 'egg', box: [1098, 792, 26, 30], canvas: 'square (1024x1024)', prompt: 'Recreate the small white hen\'s egg Mr. Goodchoice holds. Only the egg, upright.' },
]
