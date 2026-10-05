import type { Game } from '../core/game';
import { addBuff } from '../core/timeSystem';
import { passTime } from './actions';
import type { Effect } from '../core/types';
import { MEMORIES } from '../data/memories';
import { earnCard } from './cards';
import { creatureField } from './creatures';
import { gainEleven } from './elevenEleven';
import { addVisitors } from './hits';
import { addItem } from './inventory';
import { applyAilment } from './ailments';
import { changeVital, raiseStat } from './stats';
import { STAT_BY_ID } from '../data/statDefs';

/** Learn something about the world. Boss Knowledge is literally the count of these. */
export function learn(g: Game, id: string): boolean {
  if (g.state.knowledge.includes(id)) return false;
  g.state.knowledge.push(id);
  g.changed();
  return true;
}

export function grantMemory(g: Game, id: string): boolean {
  const def = MEMORIES[id];
  if (!def || g.state.memories.includes(id)) return false;
  g.state.memories.push(id);
  g.reveal('memories');
  g.toast(`Memory recovered: ${def.title}`, 'magic');
  g.sfx('memory');
  g.log(`Memory recovered: ${def.title}.`);
  applyEffects(g, def.onGain);
  g.changed();
  return true;
}

export function applyEffect(g: Game, e: Effect): void {
  switch (e.t) {
    case 'item':
      if ((e.qty ?? 1) >= 0) addItem(g, e.id, e.qty ?? 1, { quiet: e.quiet });
      break;
    case 'stat': {
      const real = raiseStat(g, e.stat, e.by);
      if (real !== 0) g.toast(`${STAT_BY_ID[e.stat].label} ${real > 0 ? '+' : ''}${real}`, real > 0 ? 'good' : 'bad');
      break;
    }
    case 'vital': {
      const real = changeVital(g, e.v, e.by);
      if (real !== 0) g.toast(`${e.v === 'hp' ? 'HP' : 'Coffee'} ${real > 0 ? '+' : ''}${real}`, real > 0 ? 'good' : 'bad');
      break;
    }
    case 'eleven':
      if (e.by > 0) for (let i = 0; i < e.by; i++) gainEleven(g, e.why ?? 'a coincidence');
      break;
    case 'hits':
      addVisitors(g, e.by, e.why);
      break;
    case 'flag':
      g.state.flags[e.key] = e.value ?? true;
      g.changed();
      break;
    case 'card':
      earnCard(g, e.id);
      break;
    case 'memory':
      grantMemory(g, e.id);
      break;
    case 'know':
      if (learn(g, e.id)) g.toast('You learned something. (Boss Knowledge +1)', 'info');
      break;
    case 'time':
      passTime(g, e.by);
      break;
    case 'buff':
      addBuff(g, e.stat, e.by, e.minutes, e.label);
      g.toast(`${e.label}: ${STAT_BY_ID[e.stat].label} ${e.by > 0 ? '+' : ''}${e.by}`, e.by > 0 ? 'good' : 'bad');
      break;
    case 'say':
      g.toast(e.text, e.kind ?? 'info');
      break;
    case 'creature':
      creatureField(g, e.id, e.field, e.by);
      break;
    case 'recipe':
      if (!g.state.recipes.discovered.includes(e.id)) g.state.recipes.discovered.push(e.id);
      g.changed();
      break;
    case 'ailment':
      applyAilment(g, e.id, e.minutes);
      break;
    case 'reveal':
      g.reveal(e.key);
      break;
  }
}

export function applyEffects(g: Game, effects: Effect[] | undefined): void {
  for (const e of effects ?? []) applyEffect(g, e);
}
