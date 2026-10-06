import type { TimeOfDay } from '../core/timeSystem';
import { seeded } from '../core/random';

type Ctx = CanvasRenderingContext2D;

const r = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
const disc = (c: Ctx, cx: number, cy: number, rad: number, col: string) => {
  c.fillStyle = col;
  for (let y = -rad; y <= rad; y++) {
    const w = Math.floor(Math.sqrt(rad * rad - y * y));
    c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
};
const grad = (c: Ctx, y0: number, y1: number, w: number, a: string, b: string, steps = 12) => {
  const pa = hex(a);
  const pb = hex(b);
  const hgt = y1 - y0;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const col = `rgb(${Math.round(pa[0] + (pb[0] - pa[0]) * t)},${Math.round(pa[1] + (pb[1] - pa[1]) * t)},${Math.round(pa[2] + (pb[2] - pa[2]) * t)})`;
    r(c, 0, y0 + (hgt / steps) * i, w, hgt / steps + 1, col);
  }
};
function hex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

interface Sky {
  top: string;
  bottom: string;
  sun?: { x: number; y: number; col: string };
  stars: boolean;
  water: [string, string];
  hill: string;
  hill2: string;
  ambient: string;
}
const SKIES: Record<TimeOfDay, Sky> = {
  day: { top: '#5ab8ff', bottom: '#c8f0ff', sun: { x: 250, y: 30, col: '#fff7a0' }, stars: false, water: ['#3a8fe0', '#2a6ab8'], hill: '#4aa05a', hill2: '#5cb86a', ambient: '#ffffff' },
  dawn: { top: '#ff9a8a', bottom: '#ffe0a8', sun: { x: 60, y: 60, col: '#fff0b0' }, stars: false, water: ['#d0809a', '#8a5aa0'], hill: '#4a7a6a', hill2: '#5c8a78', ambient: '#ffd0b0' },
  dusk: { top: '#4a2a7a', bottom: '#ff8a5a', sun: { x: 270, y: 80, col: '#ffcf70' }, stars: false, water: ['#8a4a9a', '#3a2a6a'], hill: '#3a4a6a', hill2: '#4a5a7a', ambient: '#ffb080' },
  night: { top: '#050a28', bottom: '#1a2a5a', stars: true, water: ['#0a1a4a', '#050f30'], hill: '#10203a', hill2: '#182a48', ambient: '#8aa0ff' },
};

function sky(c: Ctx, w: number, horizon: number, tod: TimeOfDay, seed = 1): Sky {
  const s = SKIES[tod];
  grad(c, 0, horizon, w, s.top, s.bottom, 14);
  const rng = seeded(seed * 77 + 5);
  if (s.stars) {
    for (let i = 0; i < 46; i++) r(c, rng.int(0, w), rng.int(0, horizon - 10), 1, 1, rng.chance(0.3) ? '#ffe8a0' : '#fff');
  }
  if (s.sun) {
    disc(c, s.sun.x, s.sun.y, 12, s.sun.col);
    disc(c, s.sun.x, s.sun.y, 8, '#ffffffcc');
  } else if (tod === 'night') {
    disc(c, 250, 34, 11, '#f4f0d0');
    disc(c, 246, 31, 3, '#d8d3b0');
    disc(c, 255, 38, 2, '#d8d3b0');
  }
  // clouds
  if (tod !== 'night') {
    for (let i = 0; i < 4; i++) {
      const x = rng.int(10, w - 60);
      const y = rng.int(10, horizon - 50);
      r(c, x + 6, y + 4, 40, 8, '#ffffffcc');
      r(c, x, y + 8, 56, 8, '#ffffffcc');
      r(c, x + 12, y, 22, 8, '#ffffffcc');
    }
  }
  return s;
}

// ------------------------------------------------------------ construction
export function paintConstruction(c: Ctx, w: number, h: number): void {
  sky(c, w, 90, 'day', 3);
  r(c, 0, 90, w, h - 90, '#e8c878');
  const rng = seeded(11);
  for (let i = 0; i < 260; i++) r(c, rng.int(0, w), rng.int(92, h), 2, 1, rng.chance(0.5) ? '#d8b868' : '#f4dc98');
  // distant half-built "website": grey scaffolding and a big "WWW"
  r(c, 190, 40, 100, 50, '#9aa4c0');
  r(c, 190, 40, 100, 4, '#6a74a0');
  for (let x = 196; x < 290; x += 14) r(c, x, 44, 2, 46, '#6a74a0');
  for (let y = 56; y < 90; y += 14) r(c, 190, y, 100, 2, '#6a74a0');
  r(c, 214, 60, 52, 18, '#fff');
  c.fillStyle = '#d02050';
  c.font = '10px monospace';
  c.fillText('WWW', 226, 73);
  // sand pit
  r(c, 20, 120, 80, 36, '#c9a24a');
  r(c, 24, 124, 72, 28, '#b8903a');
  r(c, 40, 130, 30, 6, '#9a7a2a');
  // pile of dirt
  disc(c, 120, 150, 14, '#a07830');
  r(c, 100, 150, 40, 10, '#a07830');
  // sign
  r(c, 8, 96, 4, 40, '#6a4a22');
  r(c, 0, 80, 70, 24, '#ffd400');
  r(c, 0, 80, 70, 3, '#000');
  r(c, 0, 101, 70, 3, '#000');
  for (let x = 0; x < 70; x += 14) r(c, x, 83, 7, 18, '#111');
  r(c, 8, 86, 54, 12, '#ffd400');
  c.fillStyle = '#000';
  c.font = 'bold 8px monospace';
  c.fillText('UNDER', 10, 93);
  c.fillText('CONSTR.', 10, 99);
  // barrier tape + hidden fridge
  r(c, 224, 112, 30, 40, '#f4f4ff');
  r(c, 224, 112, 30, 3, '#bcc');
  r(c, 226, 118, 26, 1, '#889');
  r(c, 250, 126, 2, 8, '#889');
  r(c, 228, 154, 22, 3, '#0004');
  for (let i = 0; i < 6; i++) r(c, 196 + i * 18, 128 + (i % 2) * 2, 12, 5, i % 2 ? '#ffd400' : '#111');
  r(c, 196, 120, 2, 38, '#555');
  r(c, 292, 120, 2, 38, '#555');
  // cones
  for (const x of [160, 180, 300]) {
    r(c, x, 150, 10, 3, '#222');
    r(c, x + 2, 141, 6, 10, '#ff7a1a');
    r(c, x + 3, 144, 4, 2, '#fff');
  }
  // Bob
  r(c, 140, 112, 16, 6, '#ffd400');
  r(c, 138, 116, 20, 3, '#e0b400');
  r(c, 142, 119, 12, 12, '#f0c89a');
  r(c, 146, 123, 2, 2, '#111');
  r(c, 151, 123, 2, 2, '#111');
  r(c, 144, 127, 8, 2, '#7a4a1a');
  r(c, 140, 131, 16, 18, '#e8742a');
  r(c, 142, 149, 5, 8, '#2a4a8a');
  r(c, 149, 149, 5, 8, '#2a4a8a');
  r(c, 158, 118, 3, 36, '#8a6a3a');
  r(c, 156, 150, 8, 5, '#8a98a8');
}

// -------------------------------------------------------------------- lake
export function paintLake(c: Ctx, w: number, h: number, tod: TimeOfDay, willowStock: number, willowMax: number, peeping: boolean, boatOut: boolean): void {
  const hor = 84;
  const s = sky(c, w, hor, tod, 5);
  // hills
  const rng = seeded(21);
  for (let x = 0; x < w; x += 2) {
    const y = hor - 18 - Math.sin(x / 31) * 8 - Math.sin(x / 11) * 3;
    r(c, x, y, 2, hor - y + 2, s.hill2);
  }
  for (let x = 0; x < w; x += 2) {
    const y = hor - 8 - Math.sin(x / 19 + 2) * 5;
    r(c, x, y, 2, hor - y + 2, s.hill);
  }
  // water
  grad(c, hor, h, w, s.water[0], s.water[1], 10);
  for (let i = 0; i < 70; i++) {
    const x = rng.int(0, w);
    const y = rng.int(hor + 4, h - 4);
    r(c, x, y, rng.int(6, 16), 1, tod === 'night' ? '#4a6ad0' : '#ffffff55');
  }
  // reflection of the sun/moon
  if (s.sun || tod === 'night') for (let i = 0; i < 8; i++) r(c, 246 + (i % 2) * 4, hor + 4 + i * 5, 12 - i, 1, '#ffffff66');
  // lily pads
  const pads: Array<[number, number]> = [[140, 122], [172, 112], [204, 124], [160, 144]];
  pads.forEach(([x, y], i) => {
    disc(c, x, y, 8, '#2f9a4a');
    disc(c, x, y, 6, '#3fbb5a');
    r(c, x, y - 1, 8, 2, '#3a8fe0');
    const colours = ['#ff8ac8', '#7fe3ff', '#ffd93b', '#9cff7a'];
    disc(c, x - 1, y - 1, 2, colours[i]);
  });
  // far bank trees
  for (const x of [290, 306]) {
    r(c, x, 70, 4, 16, '#4a3018');
    disc(c, x + 2, 66, 9, '#2f8a4a');
  }
  // willow (left)
  r(c, 30, 60, 8, 62, '#5a3a1a');
  r(c, 26, 112, 16, 10, '#5a3a1a');
  r(c, 34, 74, 18, 4, '#5a3a1a');
  const leaves = Math.max(0, Math.min(willowMax, willowStock));
  const strands = Math.round((leaves / willowMax) * 22);
  const lr = seeded(9);
  if (leaves > 0) disc(c, 40, 56, 6 + Math.round((leaves / willowMax) * 14), '#2fa05a');
  for (let i = 0; i < strands; i++) {
    const x = 14 + lr.int(0, 54);
    const len = lr.int(26, 56);
    r(c, x, 54 + (Math.abs(x - 40) > 20 ? 6 : 0), 2, len, i % 3 ? '#3fbb5a' : '#7fe08a');
  }
  if (leaves === 0) {
    r(c, 22, 60, 4, 2, '#5a3a1a');
    r(c, 46, 66, 10, 2, '#5a3a1a');
    r(c, 18, 74, 12, 2, '#5a3a1a');
  }
  // dock + booth (right)
  r(c, 252, 118, 68, 8, '#9a6a3a');
  for (let x = 254; x < 320; x += 8) r(c, x, 126, 3, 12, '#6a4a22');
  r(c, 266, 78, 40, 40, '#f4e4c0');
  r(c, 262, 70, 48, 10, '#d02a50');
  r(c, 266, 86, 16, 14, '#a8d8ff');
  r(c, 288, 92, 12, 26, '#6a4a22');
  r(c, 268, 60, 36, 10, '#fff');
  c.fillStyle = '#d02a50';
  c.font = 'bold 7px monospace';
  c.fillText('TICKETS', 271, 68);
  // Gus
  r(c, 270, 100, 8, 8, '#f0c89a');
  r(c, 269, 96, 10, 5, '#2a4aa8');
  r(c, 271, 103, 2, 2, '#111');
  // swan boat
  const bx = boatOut ? 130 : 232;
  const by = boatOut ? 130 : 130;
  r(c, bx, by + 6, 40, 8, '#fff');
  r(c, bx + 4, by + 12, 32, 4, '#cdd');
  r(c, bx + 28, by - 6, 8, 14, '#fff');
  r(c, bx + 32, by - 12, 8, 6, '#fff');
  r(c, bx + 38, by - 10, 6, 2, '#ff9a3a');
  r(c, bx + 34, by - 10, 1, 1, '#111');
  r(c, bx + 6, by, 18, 6, '#ff8ac8');
  // reeds (bottom-left)
  for (let i = 0; i < 14; i++) {
    const x = 6 + i * 4 + (i % 3);
    const top = 128 + (i % 4) * 3;
    r(c, x, top, 1, 40 - (top - 128), i % 2 ? '#3a8a3a' : '#2a6a2a');
    if (i % 3 === 0) r(c, x - 1, top - 3, 3, 5, '#6a4a22');
  }
  if (peeping) {
    r(c, 22, 150, 7, 6, '#ffd93b');
    r(c, 26, 152, 1, 1, '#111');
    r(c, 29, 153, 3, 2, '#ff8c2e');
  }
}

// -------------------------------------------------------------- lighthouse
export function paintLighthouse(c: Ctx, w: number, h: number, tod: TimeOfDay, lit: boolean): void {
  const hor = 100;
  const s = sky(c, w, hor, tod, 8);
  // sea
  grad(c, hor, h, w, s.water[0], s.water[1], 10);
  const rng = seeded(31);
  for (let i = 0; i < 60; i++) r(c, rng.int(0, w), rng.int(hor + 3, h - 3), rng.int(5, 14), 1, tod === 'night' ? '#3a5ac0' : '#ffffff66');
  // cliff
  r(c, 0, 118, 190, h - 118, '#4a5a3a');
  for (let x = 0; x < 190; x += 2) r(c, x, 112 + Math.sin(x / 9) * 3, 2, 14, '#5aa05a');
  r(c, 140, 130, 60, 50, '#5a4a3a');
  for (let i = 0; i < 40; i++) r(c, rng.int(0, 195), rng.int(130, h), 3, 2, '#6a5a4a');
  r(c, 0, 140, 140, 40, '#3a3a3a');
  for (let i = 0; i < 50; i++) r(c, rng.int(0, 140), rng.int(140, h), 4, 2, '#4a4a4a');
  // tower
  r(c, 82, 40, 38, 80, '#f4f4ff');
  for (const y of [52, 76, 100]) r(c, 82, y, 38, 12, '#d02a3a');
  r(c, 96, 60, 10, 14, '#223');
  r(c, 94, 108, 14, 12, '#6a4a22');
  // gallery + lamp room
  r(c, 76, 36, 50, 5, '#333');
  r(c, 86, 18, 30, 20, lit ? '#fff8c0' : '#3a3a4a');
  r(c, 86, 18, 30, 2, '#333');
  r(c, 84, 14, 34, 4, '#222');
  r(c, 94, 8, 14, 6, '#222');
  r(c, 99, 4, 4, 4, '#222');
  if (lit) {
    disc(c, 101, 28, 6, '#ffffff');
    for (let i = 0; i < 22; i++) r(c, 114 + i * 8, 26 - i * 0.2, 14, 6 - Math.floor(i / 5), tod === 'night' ? '#ffffffaa' : '#fffbc044');
    for (let i = 0; i < 12; i++) r(c, 0 + i * 8, 24 + i * 0.3, 80 - i * 6, 5, tod === 'night' ? '#ffffff55' : '#fffbc022');
  }
  // keeper's hut
  r(c, 16, 96, 46, 30, '#c8a070');
  r(c, 10, 88, 58, 10, '#8a3a2a');
  r(c, 28, 104, 14, 22, '#5a3a1a');
  r(c, 46, 104, 10, 10, '#a8d8ff');
  // Marl
  r(c, 60, 108, 8, 8, '#f0c89a');
  r(c, 59, 105, 10, 4, '#555');
  r(c, 60, 114, 8, 6, '#ddd');
  r(c, 58, 120, 12, 14, '#2a4a6a');
  // table + book
  r(c, 150, 118, 30, 3, '#6a4a22');
  r(c, 152, 121, 3, 12, '#6a4a22');
  r(c, 176, 121, 3, 12, '#6a4a22');
  r(c, 158, 112, 14, 7, '#2a4aa8');
  r(c, 159, 113, 12, 2, '#fff');
  // fence
  for (let x = 120; x < 186; x += 8) r(c, x, 128, 2, 12, '#e8e8e8');
  r(c, 120, 131, 66, 2, '#e8e8e8');
  // gull
  r(c, 150, 20, 8, 1, '#fff');
  r(c, 154, 19, 4, 1, '#fff');
  r(c, 158, 20, 8, 1, '#fff');
  // rocks / visitor spot
  disc(c, 20, 80, 4, '#666');
}

// ------------------------------------------------------------------ dungeon
export function paintVendingMachine(c: Ctx, w: number, h: number, phase: number, lights: boolean[], fury: number): void {
  r(c, 0, 0, w, h, '#05020f');
  // faint server-room scanlines
  for (let y = 0; y < h; y += 4) r(c, 0, y, w, 1, '#0d0a22');
  // body
  const bx = Math.floor(w / 2) - 48;
  r(c, bx, 8, 96, h - 14, '#c8cadc');
  r(c, bx, 8, 96, 4, '#fff');
  r(c, bx + 92, 8, 4, h - 14, '#7a7e98');
  r(c, bx + 6, 16, 62, 70, '#101030');
  // window with "snacks"
  const cols = ['#ff4a6a', '#4a8cff', '#ffd93b', '#52c45f'];
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 4; col++) {
      r(c, bx + 10 + col * 14, 22 + row * 20, 10, 12, cols[(row + col) % 4]);
      r(c, bx + 10 + col * 14, 36 + row * 20, 10, 2, '#fff');
    }
  // eyes (the machine looks at you)
  const angry = fury >= 3;
  r(c, bx + 76, 20, 14, 10, '#05050a');
  r(c, bx + 78, 22, 4, 6, angry ? '#ff3a3a' : '#7fff8a');
  r(c, bx + 85, 22, 4, 6, angry ? '#ff3a3a' : '#7fff8a');
  // panel of 3x3 lights
  r(c, bx + 72, 36, 22, 24, '#2a2a40');
  for (let i = 0; i < 9; i++) {
    const x = bx + 74 + (i % 3) * 7;
    const y = 38 + Math.floor(i / 3) * 7;
    r(c, x, y, 5, 5, lights[i] ? '#ffe45a' : '#3a3a58');
  }
  // keypad + slot
  r(c, bx + 72, 64, 22, 20, '#2a2a40');
  for (let i = 0; i < 6; i++) r(c, bx + 74 + (i % 3) * 7, 66 + Math.floor(i / 3) * 8, 5, 5, phase === 2 ? '#7fe3ff' : '#6a6a88');
  r(c, bx + 78, 88, 14, 3, '#000');
  r(c, bx + 74, 86, 4, 6, phase === 1 ? '#ffd93b' : '#7a7e98');
  // dispense flap
  r(c, bx + 10, h - 30, 56, 14, '#05050a');
  r(c, bx + 12, h - 28, 52, 10, phase === 3 ? '#ffd93b' : '#1a1a30');
  // legs
  r(c, bx + 6, h - 6, 10, 6, '#444');
  r(c, bx + 80, h - 6, 10, 6, '#444');
}

export function paintFace404(c: Ctx, w: number, h: number): void {
  r(c, 0, 0, w, h, '#fff');
  c.fillStyle = '#ccc';
  for (let i = 0; i < 20; i++) r(c, (i * 37) % w, (i * 53) % h, 2, 1, '#ddd');
}

export function paintMyPageSky(c: Ctx, w: number, h: number): void {
  grad(c, 0, h, w, '#0b0630', '#3a1a7a', 10);
  const rng = seeded(4);
  for (let i = 0; i < 40; i++) r(c, rng.int(0, w), rng.int(0, h), 1, 1, '#fff');
}

/** the Whispering Woods: layered pines, a path, a mushroom ring, a signpost, Fern's lantern, and (after dark) foxfire */
export function paintForest(c: Ctx, w: number, h: number, tod: TimeOfDay, mushStock: number, mushMax: number, foxfire: boolean, oakFound: boolean): void {
  const hor = 78;
  sky(c, w, hor, tod, 9);
  const dim = tod === 'night' ? 0.55 : tod === 'dusk' || tod === 'dawn' ? 0.8 : 1;
  const tint = (n: number) => Math.round(n * dim);
  const green = (rr: number, gg: number, bb: number) => `rgb(${tint(rr)},${tint(gg)},${tint(bb)})`;
  const rng = seeded(31);
  // far ridge and pines, two layers
  for (let x = 0; x < w; x += 2) r(c, x, hor - 14 - Math.sin(x / 23) * 6, 2, 22, green(40, 96, 70));
  for (let layer = 0; layer < 2; layer++) {
    for (let x = -6 + layer * 9; x < w + 10; x += 19) {
      const top = hor - 34 + rng.int(-4, 6) + layer * 8;
      const colr = layer ? green(30, 110, 58) : green(26, 84, 52);
      for (let i = 0; i < 6; i++) r(c, x + 10 - (i + 2) * 2, top + i * 5, (i + 2) * 4, 6, colr);
      r(c, x + 9, top + 30, 3, 10, green(104, 70, 38));
    }
  }
  // ground
  grad(c, hor + 6, h, w, tod === 'night' ? '#0d2a16' : '#2f7a3a', tod === 'night' ? '#08160d' : '#1c4f26', 10);
  for (let i = 0; i < 90; i++) r(c, rng.int(0, w), rng.int(hor + 8, h - 2), rng.int(1, 3), 1, green(70, 150, 70));
  // the path: a wedge that opens toward the viewer
  for (let y = hor + 10; y < h; y++) {
    const t = (y - hor - 10) / (h - hor - 10);
    r(c, 150 - t * 34, y, 22 + t * 68, 1, green(150, 112, 70));
  }
  // the old oak (centre-right), bigger once you have found it
  const ox = 240;
  r(c, ox, 58, 18, 66, green(88, 58, 30));
  r(c, ox - 8, 114, 34, 10, green(88, 58, 30));
  disc(c, ox + 9, 44, 26, green(36, 120, 54));
  disc(c, ox - 12, 54, 16, green(44, 138, 62));
  disc(c, ox + 30, 52, 17, green(40, 128, 58));
  if (oakFound) {
    r(c, ox + 5, 92, 8, 14, green(30, 20, 10)); // a hollow
    r(c, ox + 6, 84, 2, 6, '#e8d8a0');
    r(c, ox + 10, 84, 2, 6, '#e8d8a0');
  }
  // mushroom ring (left)
  const n = Math.max(0, Math.min(mushMax, mushStock));
  for (let i = 0; i < mushMax; i++) {
    const mx = 34 + i * 12 + (i % 2) * 4;
    const my = 142 + (i % 2) * 6;
    r(c, mx + 2, my, 3, 6, '#f1e8d2');
    if (i < n) {
      disc(c, mx + 3, my, 5, '#d8302c');
      r(c, mx, my - 2, 2, 2, '#fff');
      r(c, mx + 4, my - 3, 2, 2, '#fff');
    } else r(c, mx + 1, my + 4, 5, 2, green(60, 90, 50));
  }
  // signpost (mid-left)
  r(c, 120, 96, 4, 46, green(110, 74, 40));
  r(c, 106, 100, 28, 8, green(160, 120, 70));
  r(c, 112, 112, 26, 8, green(160, 120, 70));
  // Fern's lantern and tent (bottom right)
  r(c, 268, 128, 36, 24, green(190, 160, 90));
  r(c, 274, 118, 24, 12, green(170, 140, 80));
  r(c, 302, 132, 2, 12, '#444');
  disc(c, 303, 130, 4, tod === 'day' ? '#f7e08a' : '#ffd24a');
  if (tod !== 'day') disc(c, 303, 130, 9, '#ffd24a33');
  // foxfire: pale green sparks drifting up the path
  if (foxfire) {
    const rf = seeded(77);
    for (let i = 0; i < 18; i++) {
      const t = rf.next();
      const x = 150 + (rf.next() - 0.5) * 70 * (1 - t * 0.4);
      const y = hor + 14 + (h - hor - 30) * t;
      disc(c, x, y, 2, '#aaffd8cc');
      disc(c, x, y, 5, '#7fffc022');
    }
  }
}

/**
 * The bottom of the world. One painter, two photographs: variant 'A' (2001) and 'B' (2003). B differs in exactly
 * the five places listed in data/tasmania.ts. The aurora flag paints the southern lights over the sky.
 */
export function paintTasmania(c: Ctx, w: number, h: number, tod: TimeOfDay, variant: 'A' | 'B', aurora = false): void {
  const hor = 88;
  const s = sky(c, w, hor, tod, 14);
  // distant swell
  grad(c, hor, h, w, s.water[0], s.water[1], 10);
  const rng = seeded(52);
  for (let i = 0; i < 60; i++) r(c, rng.int(0, w), rng.int(hor + 3, h - 3), rng.int(6, 14), 1, tod === 'night' ? '#3a5acc' : '#ffffff66');
  // the cliff and the lighthouse on it (right)
  for (let x = 236; x < w; x += 2) r(c, x, 74 + (x - 236) * 0.05, 2, h - 74, '#5a4a3a');
  r(c, 250, 74, 70, 6, '#6b5a46');
  r(c, 262, 36, 12, 40, '#f2f2f2');
  r(c, 262, 48, 12, 6, '#d8302c');
  r(c, 262, 60, 12, 6, '#d8302c');
  r(c, 259, 30, 18, 6, '#333');
  disc(c, 268, 26, 4, tod === 'day' ? '#fff2a0' : '#ffd24a');
  // the beach and a rock (right foreground)
  r(c, 236, 134, 84, 46, tod === 'night' ? '#4a4a5a' : '#e8d8a8');
  disc(c, 300, 150, 9, '#4a4a54');
  // a rocky headland (left)
  for (let x = 0; x < 80; x += 2) r(c, x, 112 + Math.sin(x / 9) * 4 - x * 0.2, 2, h - 112, '#4a4048');
  // seabird dots, same in both photographs
  r(c, 190, 30, 3, 1, '#fff'); r(c, 194, 29, 3, 1, '#fff');
  if (aurora && tod === 'night') {
    for (let band = 0; band < 3; band++) {
      for (let x = 0; x < w; x += 2) {
        const y = 14 + band * 12 + Math.sin(x / 17 + band) * 7;
        r(c, x, y, 2, 22, band === 1 ? '#c07aff40' : '#58ffb040');
      }
    }
  }
  if (variant === 'B') {
    // 1: a red buoy
    disc(c, 40, 124, 3, '#e03030'); r(c, 39, 118, 2, 4, '#e03030'); r(c, 36, 127, 8, 1, '#ffffff88');
    // 2: a gull
    r(c, 96, 40, 4, 1, '#fff'); r(c, 100, 39, 4, 1, '#fff'); r(c, 104, 40, 4, 1, '#fff'); r(c, 99, 38, 2, 1, '#fff');
    // 3: a sailboat
    r(c, 150, 104, 20, 3, '#6b4a2a'); r(c, 159, 90, 2, 14, '#ddd'); for (let i = 0; i < 12; i++) r(c, 160, 92 + i, Math.max(1, 12 - i), 1, '#fff7e0');
    // 4: a kite over the cliff
    r(c, 214, 52, 8, 8, '#ffd23a'); r(c, 216, 54, 4, 4, '#e03030'); r(c, 218, 60, 1, 14, '#eee'); r(c, 216, 66, 4, 1, '#38a0ff');
    // 5: a penguin on the beach
    r(c, 272, 124, 8, 14, '#222'); r(c, 274, 128, 4, 9, '#f2f2f2'); r(c, 273, 136, 6, 2, '#f0a020'); r(c, 273, 126, 1, 1, '#fff');
  }
}
