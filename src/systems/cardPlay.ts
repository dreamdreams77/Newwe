import type { Game } from '../core/game';
import type { CardEffect, StatId, ZoneId } from '../core/types';
import { CARDS } from '../data/cards';
import { test } from './conditions';
import { discardFromHand, drawCards, findInHand, removeFromHand, syncDeck } from './cards';
import { applyEffect } from './effects';
import { hasItem, removeItem } from './inventory';
import { nextHint } from './hints';
import { statValue } from './stats';
import type { RollMods } from './dice';

export type PlayMode = 'world' | 'check' | 'combat';

export interface PlayCtx {
  mode: PlayMode;
  stat?: StatId;
  mods?: RollMods;
}

export interface PlayResult {
  ok: boolean;
  reason?: string;
  peek?: string | null;
  travel?: ZoneId;
  negate?: boolean;
  furyDown?: number;
  assist?: boolean;
  notes: string[];
}

export function whyNotPlayable(g: Game, uid: number, mode: PlayMode): string | null {
  const inst = findInHand(g, uid);
  if (!inst) return 'Not in your hand.';
  const def = CARDS[inst.cardId];
  if (!def.where.includes(mode)) {
    return mode === 'world' ? 'That one is for rolls and encounters.' : mode === 'check' ? 'That one cannot help with a roll.' : 'That one does not work in an encounter.';
  }
  if (def.needs && !test(g, def.needs)) return 'Something about it is not ready yet.';
  if (inst.itemId && !hasItem(g, inst.itemId)) return 'The item behind this card is gone.';
  return null;
}

/** Chaos pulls the Shrug toward the extremes by rolling twice and keeping the wilder result. */
function wildTable(g: Game): { effects: CardEffect[]; text: string } {
  const rng = g.rng;
  let r = rng.die(6);
  if (statValue(g, 'chaos') >= 4) {
    const r2 = rng.die(6);
    r = Math.abs(r2 - 3.5) > Math.abs(r - 3.5) ? r2 : r;
  }
  if (r === 1) return { effects: [{ t: 'vital', v: 'coffee', by: -1 }, { t: 'mod', amount: -1 }], text: 'The shrug shrugs back. -1 Coffee, -1 to the roll.' };
  if (r <= 3) return { effects: [{ t: 'mod', amount: 1 }], text: 'A confident shrug. +1.' };
  if (r <= 5) return { effects: [{ t: 'mod', amount: 2 }], text: 'A magnificent shrug. +2.' };
  return { effects: [{ t: 'dice', n: 1 }, { t: 'mod', amount: 2 }], text: 'A shrug of cosmic significance. +1 die and +2!' };
}

export function playCard(g: Game, uid: number, ctx: PlayCtx): PlayResult {
  const out: PlayResult = { ok: false, notes: [] };
  const why = whyNotPlayable(g, uid, ctx.mode);
  if (why) return { ...out, reason: why };
  const inst = findInHand(g, uid)!;
  const def = CARDS[inst.cardId];
  out.ok = true;
  let effects: CardEffect[] = def.effects;
  const expanded: CardEffect[] = [];
  for (const e of effects) {
    if (e.t === 'wild') {
      const w = wildTable(g);
      out.notes.push(w.text);
      expanded.push(...w.effects);
    } else expanded.push(e);
  }
  for (const e of expanded) {
    switch (e.t) {
      case 'mod':
        if (ctx.mods && (!e.stat || e.stat === ctx.stat)) {
          ctx.mods.amount += e.amount;
          ctx.mods.notes.push(`${def.name} ${e.amount >= 0 ? '+' : ''}${e.amount}`);
        }
        break;
      case 'dice':
        if (ctx.mods) {
          ctx.mods.dice += e.n;
          ctx.mods.notes.push(`${def.name} +${e.n} die`);
        }
        break;
      case 'rerollLowest':
        if (ctx.mods) {
          ctx.mods.rerollLowest++;
          ctx.mods.notes.push(`${def.name}: re-roll lowest`);
        }
        break;
      case 'peek':
        if (ctx.mode !== 'check') out.peek = nextHint(g, g.state.zone) ?? 'You remember nothing more. You have seen everything here that there is to see... for now.';
        break;
      case 'travel':
        out.travel = e.zone;
        break;
      case 'negate':
        out.negate = true;
        break;
      case 'furyDown':
        if (ctx.mode === 'combat') out.furyDown = (out.furyDown ?? 0) + e.by;
        break;
      case 'assist':
        out.assist = true;
        break;
      case 'draw':
        drawCards(g, e.n);
        break;
      case 'wild':
        break;
      default:
        applyEffect(g, e as never);
    }
  }
  // spend the card
  if (inst.itemId) {
    removeFromHand(g, uid);
    removeItem(g, inst.itemId, 1);
  } else if (def.consumable) {
    removeFromHand(g, uid);
    const i = g.state.cards.earned.indexOf(def.id);
    if (i >= 0) g.state.cards.earned.splice(i, 1);
  } else discardFromHand(g, uid);
  syncDeck(g);
  g.sfx('card');
  g.log(`Played ${def.name}.`);
  g.changed();
  return out;
}
