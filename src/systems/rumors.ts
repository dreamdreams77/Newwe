import type { Game } from '../core/game';
import { test } from './conditions';
import type { Cond } from '../core/types';

// NPCs do not always tell the truth, and they do not agree with each other.
// A rumour has a verdict the world can check once you have seen enough.

export interface Rumor {
  id: string;
  who: 'bob' | 'gus' | 'marl';
  text: string;
  /** evaluates true when the rumour has been verified true */
  isTrue?: Cond;
  /** evaluates true when the rumour has been shown false */
  isFalse?: Cond;
  verdictText: { true?: string; false?: string };
}

export const RUMORS: Rumor[] = [
  { id: 'r_midnight', who: 'gus', text: 'The lighthouse only opens at midnight. Everyone knows that.', isFalse: { flag: 'lamp_lit' }, verdictText: { false: 'The lamp came on at an ordinary hour. Gus is thinking of something else.' } },
  { id: 'r_nolight', who: 'bob', text: 'There is no lighthouse. I have been here since 2001. Never seen one.', isFalse: { flag: 'visited_lighthouse' }, verdictText: { false: 'There is a lighthouse. Bob has, it seems, never looked up.' } },
  { id: 'r_old', who: 'marl', text: 'Midnight? No, that was the old version.', isTrue: { flag: 'inspector_on' }, verdictText: { true: 'The old versions do remember things differently. See the version history.' } },
  { id: 'r_yoghurt', who: 'gus', text: 'That yoghurt is worth more than any key in this place.', isTrue: { flag: 'yoghurt_delivered' }, isFalse: { all: [{ flag: 'e404_open' }, { not: { flag: 'yoghurt_delivered' } }] }, verdictText: { true: 'A yoghurt opened a lamp. It is a very good yoghurt.', false: 'A key opened a door the yoghurt could not have. Gus is only partly right.' } },
  { id: 'r_404', who: 'bob', text: 'The 404 is just a broken link. Nothing is behind it.', isFalse: { flag: 'e404_open' }, verdictText: { false: 'Something was behind it. A lot of something.' } },
  { id: 'r_counter', who: 'marl', text: 'Do not trust that counter. It counts what it likes.', isTrue: { visitors: 1111 }, verdictText: { true: 'It counts more than visitors. That is exactly what it does.' } },
  { id: 'r_boats', who: 'gus', text: 'The swan boats run on spite. And a bit of lard.', verdictText: {} },
  { id: 'r_tape', who: 'bob', text: 'Duct tape holds everything together. It is the only thing that does.', isFalse: { flag: 'lamp_lit' }, verdictText: { false: 'Not the only thing. A lamp can be lit other ways.' } },
];

export function nextRumor(g: Game, who: Rumor['who']): Rumor | null {
  const heard = RUMORS.filter((r) => r.who === who);
  const fresh = heard.find((r) => !g.has(`rumor_heard_${r.id}`));
  return fresh ?? heard[(g.state.counters.actions + g.state.visitors) % heard.length] ?? null;
}

export function hearRumor(g: Game, r: Rumor): void {
  g.state.flags[`rumor_heard_${r.id}`] = true;
  g.reveal('journal');
  g.changed();
}

export type Verdict = 'true' | 'false' | 'open';
export function verdict(g: Game, r: Rumor): Verdict {
  if (r.isTrue && test(g, r.isTrue)) return 'true';
  if (r.isFalse && test(g, r.isFalse)) return 'false';
  return 'open';
}

/** the "checking a rumour matters" hook: counts once a verdict lands on something you heard */
export function checkRumors(g: Game): void {
  for (const r of RUMORS) {
    if (g.has(`rumor_heard_${r.id}`) && verdict(g, r) !== 'open' && !g.has(`rumor_checked_${r.id}`)) {
      g.state.flags[`rumor_checked_${r.id}`] = true;
      g.state.flags.rumor_checked = true;
      g.toast(`A rumour resolved: ${r.verdictText[verdict(g, r) as 'true' | 'false'] ?? ''}`, 'magic');
    }
  }
}

export function rumorText(g: Game): string {
  const r = RUMORS.find((x) => x.id === g.state.flags.rumor_last);
  return r ? r.text : 'Nothing new. Ask me again when something happens.';
}
