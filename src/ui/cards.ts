import { game } from '../core/runtime';
import { CARDS, HAND_MAX } from '../data/cards';
import type { CardDef, CardInst } from '../core/types';
import { audio } from '../audio/audioManager';
import { cardDef, drawCards, redraw } from '../systems/cards';
import { playCard, whyNotPlayable } from '../systems/cardPlay';
import { passTime } from '../systems/actions';
import { sniffAround } from '../world/sniff';
import { h, btn } from './dom';
import { toast } from './notifications';
import { navigate } from './router';
import { icon } from './sprites';
import { alertWindow, openWindow, type WinHandle } from './windows';

export function cardEl(def: CardDef, opts: { small?: boolean } = {}): HTMLElement {
  return h(
    'div',
    { class: `card cat-${def.category} ${opts.small ? 'small' : ''}` },
    h('div', { class: 'card-top' }, h('span', { class: 'card-cat' }, def.category)),
    h('div', { class: 'card-art' }, icon(def.glyph, opts.small ? 32 : 48)),
    h('div', { class: 'card-name' }, def.name),
    h('div', { class: 'card-text' }, def.text),
    def.flavor && !opts.small ? h('div', { class: 'card-flavor' }, def.flavor) : null,
  );
}

export async function playWorld(inst: CardInst): Promise<void> {
  const g = game();
  const r = playCard(g, inst.uid, { mode: 'world' });
  if (!r.ok) {
    toast(r.reason ?? 'Not now.', 'info');
    return;
  }
  r.notes.forEach((n) => toast(n, 'funny'));
  if (r.peek !== undefined) await alertWindow('Something surfaces…', h('p', {}, r.peek ?? 'Nothing more comes to mind.'));
  if (r.travel) {
    toast('The page folds up and unfolds somewhere else.', 'magic');
    navigate(r.travel, { free: true });
  }
  if (r.assist) sniffAround();
}

export function openCards(): WinHandle {
  const g = game();
  return openWindow({
    id: 'cards',
    live: true,
    title: g.state.stage >= 3 ? 'Cards' : 'My Bookmarks',
    icon: 'floppy',
    className: 'cards-win',
    width: 'min(920px, 98vw)',
    render: (body, win) => {
      const c = g.state.cards;
      const hand = h('div', { class: 'hand', role: 'list', ariaLabel: 'Your hand' });
      if (!c.hand.length) hand.append(h('p', { class: 'empty' }, 'Your hand is empty. Draw something.'));
      c.hand.forEach((inst) => {
        const def = cardDef(inst.cardId);
        const why = whyNotPlayable(g, inst.uid, 'world');
        const worldOk = def.where.includes('world');
        hand.append(
          h(
            'div',
            { class: 'hand-slot', role: 'listitem' },
            cardEl(def),
            h(
              'div',
              { class: 'hand-actions' },
              worldOk ? btn('Play', async () => (audio.sfx('card'), win.close(), await playWorld(inst)), 'small go', { disabled: !!why, title: why ?? '', dataset: { fk: `play-${inst.uid}` } }) : h('span', { class: 'hint' }, 'Play during a roll or an encounter'),
            ),
          ),
        );
      });
      const actions = h(
        'div',
        { class: 'cards-actions' },
        btn('Draw a card', () => {
          if (c.hand.length >= HAND_MAX) return toast('Your hand is full. Cards are not unlimited. Neither are hands.', 'info');
          const d = drawCards(g, 1);
          passTime(g, 1);
          if (!d.length) toast('No cards left to draw.', 'info');
          else audio.sfx('card');
          win.refresh();
        }, 'small'),
        btn('Shuffle hand back & redraw', () => (redraw(g), passTime(g, 2), audio.sfx('card'), win.refresh()), 'small'),
        h('span', { class: 'deck-count' }, `Draw ${c.draw.length} · Discard ${c.discard.length} · Hand ${c.hand.length}/${HAND_MAX}`),
      );
      const collection = h('details', { class: 'collection' }, h('summary', {}, 'Everything in your deck'));
      const all = [...c.draw, ...c.hand, ...c.discard];
      const seen = new Map<string, number>();
      all.forEach((x) => seen.set(x.cardId, (seen.get(x.cardId) ?? 0) + 1));
      const grid = h('div', { class: 'collection-grid' });
      for (const [id, n] of seen) grid.append(h('div', { class: 'coll' }, cardEl(CARDS[id], { small: true }), n > 1 ? h('span', { class: 'coll-n' }, `×${n}`) : null));
      collection.append(grid);
      body.append(
        h('p', { class: 'cards-intro' }, 'Cards are not attacks. They change things: your coffee, a roll, what you remember, where you are. Items turn into cards while you carry them; playing the card uses the item up.'),
        hand,
        actions,
        collection,
      );
    },
  });
}
