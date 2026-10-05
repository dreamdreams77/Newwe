import type { Game } from '../core/game';
import type { ItemUse } from '../core/types';
import { test } from './conditions';
import { applyEffects } from './effects';
import { passTime } from './actions';
import { itemDef, removeItem, hasItem } from './inventory';
import { changeVital } from './stats';
import { addBuff } from '../core/timeSystem';
import { statValue } from './stats';

export type ItemHandler = (g: Game, itemId: string) => void | Promise<void>;
const handlers = new Map<string, ItemHandler>();

/** UI/world modules register handlers for uses that need a screen (puzzles, fast travel). */
export function registerItemHandler(name: string, fn: ItemHandler): void {
  handlers.set(name, fn);
}

export function visibleUses(g: Game, itemId: string): ItemUse[] {
  return itemDef(itemId).uses.filter((u) => (!u.hidden || (u.when && test(g, u.when))) && test(g, u.when ?? undefined));
}

// logic-only handlers
handlers.set('eat_snack', (g) => {
  const r = g.rng.die(6) + (statValue(g, 'luck') >= 4 ? 1 : 0);
  if (r <= 1) {
    changeVital(g, 'hp', -2);
    g.toast('It tastes like a warning label. -2 HP.', 'bad');
  } else if (r <= 3) {
    changeVital(g, 'hp', 2);
    changeVital(g, 'coffee', 1);
    g.toast('Salty, sweet, and quietly confusing. +2 HP, +1 Coffee.', 'funny');
  } else if (r <= 5) {
    changeVital(g, 'hp', 3);
    changeVital(g, 'coffee', 2);
    g.toast('Shockingly good. You do not ask questions. +3 HP, +2 Coffee.', 'good');
  } else {
    addBuff(g, 'luck', 2, 180, 'Lucky snack');
    g.toast('It tastes like a four-leaf clover. +2 Luck for a while.', 'magic');
  }
});

export async function runUse(g: Game, itemId: string, useId: string): Promise<void> {
  const def = itemDef(itemId);
  const use = def.uses.find((u) => u.id === useId);
  if (!use || !hasItem(g, itemId)) return;
  if (use.handler) {
    const h = handlers.get(use.handler);
    if (use.consume) removeItem(g, itemId, 1);
    if (use.minutes) passTime(g, use.minutes);
    await h?.(g, itemId);
    g.changed();
    return;
  }
  if (use.consume) removeItem(g, itemId, 1);
  if (use.text) g.toast(use.text, 'info');
  applyEffects(g, use.effects);
  if (use.minutes) passTime(g, use.minutes);
  g.state.counters.actions++;
  g.changed();
}
