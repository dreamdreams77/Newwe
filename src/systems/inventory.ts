import type { Game } from '../core/game';
import type { ItemDef, ItemStack } from '../core/types';
import { ITEMS } from '../data/items';

export function itemDef(id: string): ItemDef {
  const d = ITEMS[id];
  if (!d) throw new Error(`Unknown item: ${id}`);
  return d;
}

export function qty(g: Game, id: string): number {
  return g.state.inventory[id]?.qty ?? 0;
}
export function hasItem(g: Game, id: string, n = 1): boolean {
  return qty(g, id) >= n;
}

export function addItem(g: Game, id: string, n = 1, opts: { quiet?: boolean } = {}): void {
  const def = itemDef(id);
  const inv = g.state.inventory;
  const existing = inv[id];
  if (existing) {
    existing.qty += n;
  } else {
    inv[id] = { qty: n, acquiredAt: g.state.clock.minutes };
  }
  g.state.flags[`has_had_${id}`] = true;
  g.reveal('inventory');
  if (!opts.quiet) {
    g.toast(`Got ${n > 1 ? n + '× ' : ''}${def.name}`, 'item');
    g.sfx('pickup');
    g.log(`Found ${def.name}.`);
  }
  g.changed();
}

export function removeItem(g: Game, id: string, n = 1): boolean {
  const st = g.state.inventory[id];
  if (!st || st.qty < n) return false;
  st.qty -= n;
  if (st.qty <= 0) delete g.state.inventory[id];
  g.changed();
  return true;
}

export function inventoryList(g: Game): Array<{ def: ItemDef; stack: ItemStack }> {
  return Object.entries(g.state.inventory)
    .filter(([, s]) => s.qty > 0)
    .map(([id, stack]) => ({ def: itemDef(id), stack }))
    .sort((a, b) => rarityRank(b.def) - rarityRank(a.def) || a.def.name.localeCompare(b.def.name));
}

function rarityRank(d: ItemDef): number {
  return ['junk', 'common', 'uncommon', 'rare', 'legendary'].indexOf(d.rarity);
}

export function totalWeight(g: Game): number {
  let w = 0;
  for (const [id, st] of Object.entries(g.state.inventory)) w += (ITEMS[id]?.weight ?? 0) * st.qty;
  return Math.round(w * 10) / 10;
}

export type Freshness = 'fresh' | 'warm' | 'suspect' | 'sentient' | null;

/** perishable items age with in-game minutes. */
export function freshness(g: Game, id: string): Freshness {
  const def = ITEMS[id];
  const st = g.state.inventory[id];
  if (!def?.perishable || !st) return null;
  const age = g.state.clock.minutes - st.acquiredAt;
  const f = age / def.perishable.shelfMinutes;
  if (f < 0.4) return 'fresh';
  if (f < 0.75) return 'warm';
  if (f < 1) return 'suspect';
  return 'sentient';
}
export function ageMinutes(g: Game, id: string): number {
  const st = g.state.inventory[id];
  return st ? g.state.clock.minutes - st.acquiredAt : 0;
}
