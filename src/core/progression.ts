import { BALANCE } from '../config/balance';
import type { Game } from './game';
import type { Stage } from './types';
import { gainEleven } from '../systems/elevenEleven';
import { addVisitors } from '../systems/hits';
import { updateQuests } from '../systems/quests';
import { syncDeck } from '../systems/cards';
import { raiseStat } from '../systems/stats';
import { blueScreen } from '../systems/travel';
import { awardBadges } from '../systems/badges';
import { checkRumors } from '../systems/rumors';
import { watchCoffee, applyAilment } from '../systems/ailments';
import { passTime } from '../systems/actions';

/** Work out what stage the website is in. Stages only ever go up. */
export function computeStage(g: Game): Stage {
  const s = g.state;
  let st: Stage = 1;
  if (g.has('eleven_first') || s.visitors >= 150) st = 2;
  if (g.has('lake_solved') || g.has('creature_met')) st = 3;
  if (g.has('lamp_lit')) st = 4;
  if (s.visitors >= BALANCE.hits.finale && g.has('boss_defeated')) st = 5;
  return Math.max(s.stage, st) as Stage;
}

/**
 * Idempotent world-update. Runs after every state change: starts and finishes
 * quests, raises the stage, keeps the deck in sync with the inventory.
 */
export function evaluate(g: Game): void {
  const s = g.state;
  if (!s.flags.game_started) s.flags.game_started = true;
  if (s.creatures.chocobo?.met && !s.flags.creature_met) s.flags.creature_met = true;
  if (s.vitals.hp <= 0) {
    const text = blueScreen(g);
    g.bus.emit('toast', { text, kind: 'bad' });
  }
  syncDeck(g);
  updateQuests(g);
  if (s.stage >= 3 || g.has('creature_met')) g.reveal('mypage');
  if (s.stage >= 2) g.reveal('handbook');
  awardBadges(g);
  checkRumors(g);
  watchCoffee(g, passTime);
  if (s.visitors >= BALANCE.hits.finale && g.has('boss_defeated') && !g.has('finale_ready')) {
    s.flags.finale_ready = true;
    g.toast('THE COUNTER READS 001111, and the thing at the end of the dark has been judged. The page holds very still.', 'magic');
  }
  const next = computeStage(g);
  if (next !== s.stage) {
    const from = s.stage;
    s.stage = next;
    g.log(`The website changed (stage ${next}).`);
    g.bus.emit('stage', { from, to: next });
    g.changed();
  }
}

const THRESHOLD_TEXT: Record<number, string> = {
  100: 'The counter flickers. 000100. Somebody noticed you noticing.',
  250: 'The counter ticks past 250. Somewhere, a guestbook entry has been edited.',
  500: 'The counter hits 500. The page seems a little more awake.',
  777: 'Lucky 777. The counter rolls over like a slot machine, quietly delighted.',
  1111: 'THE COUNTER READS 001111. Something at the end of the dark has noticed. It is waiting to be dealt with.',
};

export function installProgression(g: Game): () => void {
  const offs: Array<() => void> = [];
  offs.push(
    g.bus.on('change', () => {
      evaluate(g);
    }),
  );
  offs.push(
    g.bus.on('threshold', ({ at }) => {
      g.toast(THRESHOLD_TEXT[at] ?? `The counter reaches ${at}.`, 'magic');
      g.sfx('threshold');
      if (at === 777) {
        raiseStat(g, 'luck', 1);
        applyAilment(g, 'lucky', 240);
      }
      if (at === 500) raiseStat(g, 'curiosity', 1);
    }),
  );
  offs.push(
    g.bus.on('elevenTime', ({ key }) => {
      const first = !g.has('eleven_first');
      if (first) {
        g.state.flags.eleven_first = true;
        g.toast('11:11. The visitor counter flickers. Something on the page just moved.', 'magic');
        addVisitors(g, BALANCE.hits.firstEleven, 'the clock hit 11:11');
      }
      gainEleven(g, 'the clock hit 11:11', key, first ? '11:11 — the first one. It sits in your pocket like a coin that is also a feeling.' : '11:11 on the clock. A small, private miracle.');
      g.changed();
    }),
  );
  return () => offs.forEach((f) => f());
}
