import { PALETTE, SPRITES } from './spriteData';

const cache = new Map<string, string>();

export function hasSprite(key: string): boolean {
  return key in SPRITES;
}

/** Render a sprite to a data URL at 1px-per-pixel; CSS scales it with image-rendering: pixelated. */
export function spriteURL(key: string): string {
  const hit = cache.get(key);
  if (hit) return hit;
  const rows = SPRITES[key] ?? SPRITES.star;
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = PALETTE[row[x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

export function icon(key: string, px = 24, alt = ''): HTMLImageElement {
  const url = spriteURL(key);
  const img = document.createElement('img');
  img.src = url;
  img.className = 'px';
  img.width = px;
  img.height = px;
  img.alt = alt;
  if (!alt) img.setAttribute('aria-hidden', 'true');
  img.draggable = false;
  return img;
}

/** a CSS cursor made from a sprite (used when holding an item) */
export function cursorFor(key: string): string {
  const rows = SPRITES[key] ?? SPRITES.star;
  const w = Math.max(...rows.map((r) => r.length));
  const scale = 2;
  const c = document.createElement('canvas');
  c.width = w * scale + 2;
  c.height = rows.length * scale + 2;
  const ctx = c.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = PALETTE[row[x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x * scale + 1, y * scale + 1, scale, scale);
    }
  });
  return `url(${c.toDataURL('image/png')}) ${Math.round(c.width / 2)} ${Math.round(c.height / 2)}, crosshair`;
}
