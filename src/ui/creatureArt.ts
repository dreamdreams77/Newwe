import type { CreatureState } from '../core/types';
import { dominantTrait } from '../systems/creatures';
import { PALETTE, SPRITES } from './spriteData';

/** draw a creature's sprite, tinted by its personality, onto a 16×16 canvas */
export function drawCreature(canvas: HTMLCanvasElement, c: CreatureState): void {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const trait = dominantTrait(c);
  const rows = SPRITES[trait === 'hyper' ? 'chocobo2' : 'chocobo'];
  const tint: Record<string, string> = {};
  if (trait === 'glutton') {
    tint.y = '#ffe066';
    tint.Y = '#e0a020';
  }
  if (trait === 'gentle') {
    tint.y = '#ffe9a8';
    tint.Y = '#e8c070';
  }
  if (trait === 'hyper') {
    tint.o = '#ff5a8a';
  }
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const k = row[x];
      const col = tint[k] ?? PALETTE[k];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  });
}
