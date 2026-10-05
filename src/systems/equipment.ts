import type { Game } from '../core/game';
import type { ItemDef, SlotId, StatId } from '../core/types';
import { ITEMS } from '../data/items';

export const SLOTS: Array<{ id: SlotId; label: string; hint: string }> = [
  { id: 'head', label: 'Head', hint: 'Something to see through.' },
  { id: 'body', label: 'Body', hint: 'Something warm. Or wearable.' },
  { id: 'hands', label: 'Hands', hint: 'For repairs and bad ideas.' },
  { id: 'accessory', label: 'Accessory', hint: 'A small, strange advantage.' },
  { id: 'tool', label: 'Tool', hint: 'Something to click with.' },
  { id: 'badge', label: 'Website Badge', hint: 'A thing the page recognises.' },
];

/** perks are named effects other systems look for; gear changes what you can DO, not just a percent */
export function equippedDefs(g: Game): ItemDef[] {
  return Object.values(g.state.equipment)
    .filter((id): id is string => !!id && !!g.state.inventory[id] && !!ITEMS[id]?.equip)
    .map((id) => ITEMS[id]);
}

export function hasPerk(g: Game, perk: string): boolean {
  return equippedDefs(g).some((d) => d.equip!.perks?.includes(perk));
}

export function equipMod(g: Game, stat: StatId): number {
  return equippedDefs(g).reduce((n, d) => n + (d.equip!.mods?.[stat] ?? 0), 0);
}

export function equip(g: Game, itemId: string): { ok: boolean; text: string } {
  const def = ITEMS[itemId];
  if (!def?.equip) return { ok: false, text: `${def?.name ?? 'That'} is not something you can wear.` };
  if (!g.state.inventory[itemId]) return { ok: false, text: 'You do not have it.' };
  const slot = def.equip.slot;
  const prev = g.state.equipment[slot];
  g.state.equipment[slot] = itemId;
  g.state.seenFx.push(`gear:${itemId}`);
  g.sfx('craft');
  g.reveal('gear');
  g.changed();
  return { ok: true, text: prev && prev !== itemId ? `You swap ${ITEMS[prev].name} for ${def.name}.` : `You put on ${def.name}. ${def.equip.text}` };
}

export function unequip(g: Game, slot: SlotId): void {
  g.state.equipment[slot] = null;
  g.changed();
}

export function equippedIn(g: Game, slot: SlotId): ItemDef | null {
  const id = g.state.equipment[slot];
  return id && g.state.inventory[id] ? ITEMS[id] : null;
}
