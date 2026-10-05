import type { Game } from '../core/game';
import type { CardDef, CardInst } from '../core/types';
import { CARDS, HAND_MAX, HAND_MIN } from '../data/cards';
import { ITEMS } from '../data/items';
import { qty } from './inventory';

const MAX_COPIES_PER_ITEM = 3;

export function cardDef(id: string): CardDef {
  const c = CARDS[id];
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}

export function earnCard(g: Game, id: string, quiet = false): boolean {
  const c = g.state.cards;
  if (c.earned.includes(id)) return false;
  c.earned.push(id);
  g.reveal('cards');
  if (!quiet) {
    g.toast(`New card: ${cardDef(id).name}`, 'magic');
    g.sfx('card');
    g.log(`Earned the card ${cardDef(id).name}.`);
  }
  syncDeck(g);
  g.changed();
  return true;
}

function wantedCards(g: Game): Array<{ cardId: string; itemId?: string; n: number }> {
  const out: Array<{ cardId: string; itemId?: string; n: number }> = [];
  for (const [id, st] of Object.entries(g.state.inventory)) {
    const def = ITEMS[id];
    if (def?.cardId && st.qty > 0) out.push({ cardId: def.cardId, itemId: id, n: Math.min(MAX_COPIES_PER_ITEM, qty(g, id)) });
  }
  for (const id of g.state.cards.earned) out.push({ cardId: id, n: 1 });
  return out;
}

function all(g: Game): CardInst[] {
  const c = g.state.cards;
  return [...c.draw, ...c.hand, ...c.discard];
}

/** Rebuild the deck from items + earned cards without touching what is already in hand. */
export function syncDeck(g: Game): void {
  const c = g.state.cards;
  const wanted = wantedCards(g);
  const key = (x: { cardId: string; itemId?: string }) => `${x.cardId}|${x.itemId ?? ''}`;
  const want = new Map<string, number>();
  for (const w of wanted) want.set(key(w), (want.get(key(w)) ?? 0) + w.n);

  // remove extras (discard first, then draw, then hand)
  const have = new Map<string, number>();
  for (const i of all(g)) have.set(key(i), (have.get(key(i)) ?? 0) + 1);
  for (const [k, n] of have) {
    let extra = n - (want.get(k) ?? 0);
    if (extra <= 0) continue;
    for (const pile of [c.discard, c.draw, c.hand]) {
      for (let i = pile.length - 1; i >= 0 && extra > 0; i--) {
        if (key(pile[i]) === k) {
          pile.splice(i, 1);
          extra--;
        }
      }
    }
  }
  // add missing to the draw pile
  for (const [k, n] of want) {
    const missing = n - (have.get(k) ?? 0);
    for (let m = 0; m < Math.max(0, missing); m++) {
      const [cardId, itemId] = k.split('|');
      const inst: CardInst = { uid: c.nextUid++, cardId, itemId: itemId || undefined };
      const at = g.rng.int(0, c.draw.length);
      c.draw.splice(at, 0, inst);
    }
  }
  if (c.hand.length === 0 && c.draw.length + c.discard.length > 0) ensureHand(g, HAND_MIN);
}

export function drawCards(g: Game, n: number): CardInst[] {
  const c = g.state.cards;
  const drawn: CardInst[] = [];
  for (let i = 0; i < n && c.hand.length < HAND_MAX; i++) {
    if (c.draw.length === 0) {
      if (c.discard.length === 0) break;
      c.draw = g.rng.shuffle(c.discard);
      c.discard = [];
    }
    const card = c.draw.shift()!;
    c.hand.push(card);
    drawn.push(card);
  }
  if (drawn.length) g.changed();
  return drawn;
}

export function ensureHand(g: Game, min = HAND_MIN): void {
  const need = min - g.state.cards.hand.length;
  if (need > 0) drawCards(g, need);
}

export function findInHand(g: Game, uid: number): CardInst | undefined {
  return g.state.cards.hand.find((c) => c.uid === uid);
}

export function discardFromHand(g: Game, uid: number): void {
  const c = g.state.cards;
  const i = c.hand.findIndex((x) => x.uid === uid);
  if (i < 0) return;
  c.discard.push(...c.hand.splice(i, 1));
  g.changed();
}

export function removeFromHand(g: Game, uid: number): void {
  const c = g.state.cards;
  const i = c.hand.findIndex((x) => x.uid === uid);
  if (i >= 0) c.hand.splice(i, 1);
  g.changed();
}

export function redraw(g: Game): void {
  // put the hand back, draw fresh
  const c = g.state.cards;
  c.discard.push(...c.hand.splice(0, c.hand.length));
  drawCards(g, HAND_MIN);
}
