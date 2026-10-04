// Where everything stands, in stage units: the photo (ref/scene.jpg) scaled to 2000x1500.
// [x, y, w, h?] is the box of the sprite's visible pixels; h defaults to the sprite's own aspect ratio.
// Positions were matched to the photo with the compare overlay (press C on the site, or ?compare).
//
// mouth: which frame has the open mouth ('alt' = the -alt sprite, 'base' = the sprite itself).
// talk:  the singing part the actor belongs to (see song.json `who`), plus 'choir' / 'all'.
// gag:   whose click lines it gets (gags.json `who`).
// dance: how it moves while the show runs. pivot: transform origin.

const PRODUCE = ['choir', 'all']

// [sprite, id, x, y, w, h?, extra]
const RAW = [
  // the room and the booth
  // the store without its ceiling (a Codex edit of store-bg): above the walls there is only darkness
  ['store-bg-noceiling', 'store', 0, 0, 2000, 1500, { z: 0, static: true }],
  // the booth in three slices: its posts sit exactly where the photo's do, and the roof overhangs are stretched
  // out to the photo's roof ends (the generated booth has shorter eaves)
  ['stand', 'stand-l', 165, 333, 212, 935, { z: 1, static: true, slice: [0, 0.1069] }],
  ['stand', 'stand-m', 377, 333, 1264, 935, { z: 1, static: true, slice: [0.1069, 0.8911] }],
  ['stand', 'stand-r', 1641, 333, 239, 935, { z: 1, static: true, slice: [0.8911, 1] }],
  ['sign', 'sign', 441, 42, 1160, 0, { z: 30, dance: 'sign', pivot: '50% 100%', click: 'sign', label: 'The Mr. Goodchoice sign' }],
  ['lamp', 'lamp-l', 662, 420, 70, 140, { z: 3, dance: 'pendulum', pivot: '50% 0%', click: 'lamp', label: 'Hanging lamp' }],
  ['lamp', 'lamp-r', 1310, 428, 70, 136, { z: 3, dance: 'pendulum', pivot: '50% 0%', click: 'lamp', label: 'Hanging lamp', phase: 0.5 }],
  ['lantern', 'lantern', 1440, 506, 40, 0, { z: 3, dance: 'pendulum', pivot: '50% 0%', click: 'lamp', label: 'Lantern', phase: 0.25 }],
  ['push', 'push', 1600, 659, 46, 0, { z: 40, click: 'push', label: 'PUSH: start the show' }],

  // the cast at the back
  ['bull', 'bull', 670, 626, 170, 0, { z: 4, mouth: 'alt', talk: ['bull', 'all'], gag: 'bull', dance: 'nod', pivot: '50% 95%', label: 'The bull' }],
  ['bagel', 'bagel', 833, 425, 195, 0, { z: 5, mouth: 'alt', talk: ['bagel', 'choir', 'all'], gag: 'bagel', dance: 'swing', pivot: '50% 0%', click: 'swing', label: 'The bagel on a swing' }],
  ['chicken', 'chicken', 1195, 446, 116, 0, { z: 5, mouth: 'alt', talk: ['chicken', 'all'], gag: 'chicken', dance: 'peck', pivot: '50% 100%', click: 'chicken', label: 'The hen' }],
  ['nest', 'nest', 1150, 592, 266, 190, { z: 6, dance: 'rustle', pivot: '50% 0%' }],
  ['goodchoice', 'goodchoice', 1010, 606, 166, 0, { z: 7, mouth: 'alt', talk: ['goodchoice', 'all'], gag: 'goodchoice', dance: 'sway', pivot: '50% 100%', click: 'goodchoice', label: 'Mr. Goodchoice' }],
  ['egg', 'egg', 1100, 790, 22, 0, { z: 8, label: 'Egg' }],

  // tomato vine and pea pod
  ['vine', 'vine', 1192, 628, 365, 310, { z: 8, dance: 'rustle', pivot: '50% 100%' }],
  ['peapod', 'peapod', 1234, 690, 86, 300, { z: 9, mouth: 'alt', talk: ['peapod', ...PRODUCE], gag: 'peapod', dance: 'sway', pivot: '50% 100%', label: 'Three peas in a pod' }],
  ...[[1405, 650, 84, 64], [1369, 724, 78, 60], [1452, 728, 54, 46], [1394, 812, 82, 62]].map(([x, y, w, h], i) =>
    ['tomato', `vine-tomato-${i}`, x, y, w, h, { z: 9, mouth: 'base', talk: ['tomatoes', ...PRODUCE], gag: 'tomatoes', dance: 'hop', phase: i * 0.27, label: 'Singing tomato' }]),

  // grapes, banana and the hay basket crew
  ['grape-leaves', 'grape-leaves', 612, 815, 215, 0, { z: 8, dance: 'rustle', pivot: '50% 100%' }],
  ...[[694, 843, 46], [651, 871, 47], [739, 875, 47], [689, 911, 47], [742, 931, 47], [676, 966, 45]].map(([x, y, w], i) =>
    ['grape', `grape-${i}`, x, y, w, 0, { z: 9, mouth: 'alt', talk: ['grapes', ...PRODUCE], gag: 'grapes', dance: 'bounce', phase: i * 0.19, label: 'Grape' }]),
  ['banana', 'banana', 552, 772, 100, 0, { z: 10, mouth: 'alt', talk: ['banana', ...PRODUCE], gag: 'banana', dance: 'groove', pivot: '50% 100%', label: 'The banana in sunglasses' }],
  ['hay', 'hay', 450, 1012, 380, 0, { z: 11, static: true }],
  ['pepper-hat', 'pepper-hat', 461, 940, 98, 0, { z: 12, mouth: 'base', talk: ['peppers', ...PRODUCE], gag: 'peppers', dance: 'shake', phase: 0.1, label: 'Pepper in a felt hat' }],
  ['pepper-black', 'pepper-black', 544, 890, 112, 0, { z: 12, mouth: 'base', talk: ['peppers', ...PRODUCE], gag: 'peppers', dance: 'shake', phase: 0.4, label: 'Pepper in a sombrero' }],
  ...[[521, 983, 76], [602, 976, 76]].map(([x, y, w], i) =>
    ['pear', `pear-${i}`, x, y, w, 0, { z: 13, mouth: 'base', talk: ['pears', ...PRODUCE], gag: 'pears', dance: 'bob', phase: i * 0.5, label: 'Pear in a straw hat' }]),
  ['pepper-red', 'pepper-red', 698, 968, 102, 0, { z: 13, mouth: 'base', talk: ['peppers', ...PRODUCE], gag: 'peppers', dance: 'shake', phase: 0.7, label: 'Pepper with a pink sombrero' }],

  // corn
  ...[[790, 866, 88], [868, 872, 96]].map(([x, y, w], i) =>
    ['corn', `corn-${i}`, x, y, w, 0, { z: 9, mouth: 'alt', talk: ['corn', ...PRODUCE], gag: 'corn', dance: 'sway', phase: i * 0.5, pivot: '50% 100%', label: 'Corn on the cob' }]),
  ['crate-corn', 'crate-corn', 815, 1028, 195, 0, { z: 12, dance: 'thump', pivot: '50% 100%' }],

  // carrots and cabbage in front of Mr. Goodchoice
  ['greens', 'greens', 995, 902, 252, 0, { z: 9, dance: 'rustle', pivot: '50% 100%' }],
  ['carrot', 'carrot-s0', 1027, 898, 48, 142, { z: 10, mouth: 'base', talk: ['carrots', ...PRODUCE], gag: 'carrots', dance: 'hop', phase: 0.0, label: 'Carrot' }],
  ['cabbage', 'cabbage', 1083, 930, 78, 0, { z: 10, mouth: 'alt', talk: ['cabbage', ...PRODUCE], gag: 'cabbage', dance: 'wobble', label: 'The cabbage' }],
  ['carrot', 'carrot-s1', 1141, 902, 54, 152, { z: 10, mouth: 'base', talk: ['carrots', ...PRODUCE], gag: 'carrots', dance: 'hop', phase: 0.5, label: 'Carrot' }],
  ['crate-carrot', 'crate-carrot', 1000, 1022, 236, 0, { z: 11, static: true }],
  ...[[1018, 1028, 56], [1066, 1030, 56], [1114, 1032, 56], [1162, 1034, 56]].map(([x, y, w], i) =>
    ['carrot', `carrot-c${i}`, x, y, w, 0, { z: 12, mouth: 'base', talk: ['carrots', ...PRODUCE], gag: 'carrots', dance: 'hop', phase: 0.25 + i * 0.25, label: 'Carrot' }]),
  ['crate-carrot-front', 'crate-carrot-front', 1000, 1022, 236, 0, { z: 13, static: true }],

  // the tomato crate and the lime crate
  ['crate-tomato', 'crate-tomato', 1226, 915, 322, 0, { z: 14, static: true }],
  ...[[1250, 916, 56], [1303, 922, 58], [1358, 928, 62], [1252, 994, 54], [1302, 998, 56], [1356, 1006, 60]].map(([x, y, w], i) =>
    ['tomato', `crate-tomato-${i}`, x, y, w, 0, { z: 15, mouth: 'base', talk: ['tomatoes', ...PRODUCE], gag: 'tomatoes', dance: 'hop', phase: i * 0.17, label: 'Tomato' }]),
  ['crate-tomato-front', 'crate-tomato-front', 1226, 915, 322, 0, { z: 16, static: true }],
  ['crate-lime', 'crate-lime', 1244, 1083, 306, 0, { z: 17, static: true }],
  ...[[1268, 1080, 50], [1322, 1086, 54], [1262, 1146, 52], [1314, 1150, 54], [1366, 1154, 50]].map(([x, y, w], i) =>
    ['lime', `lime-${i}`, x, y, w, 0, { z: 18, mouth: 'alt', talk: ['limes', ...PRODUCE], gag: 'limes', dance: 'bounce', phase: i * 0.3, label: 'Lime' }]),
  ['crate-lime-front', 'crate-lime-front', 1244, 1083, 306, 0, { z: 19, static: true }],
  ['ball', 'ball', 818, 1146, 52, 0, { z: 20, click: 'ball', label: 'Pink ball' }],

  // the fence along the front (the merchandise that stood in front of it is left out)
  ['skirt', 'skirt', 380, 1238, 1268, 270, { z: 2, static: true }],
  ['fence-l', 'fence-l', 200, 1085, 820, 0, { z: 21, static: true }],
  ['fence-r', 'fence-r', 1000, 1085, 815, 0, { z: 21, static: true }],
]

export function buildActors(sprites) {
  return RAW.map(([sprite, id, x, y, w, h, extra]) => {
    const s = sprites[sprite]
    const height = h || Math.round((w * s.h) / s.w)
    const alt = sprites[sprite + '-alt']
    return {
      id, sprite, x, y, w, h: height, z: 0, ...extra,
      src: s.src, altSrc: alt?.src || null,
      phase: extra.phase ?? (id.length * 0.137) % 1,
    }
  })
}

// who sings each line of the song -> which actors open their mouths
export function membersOf(actors, who) {
  return actors.filter((a) => a.talk?.includes(who))
}
