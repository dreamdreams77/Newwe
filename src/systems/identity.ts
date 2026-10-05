import type { Game } from '../core/game';
import type { StatId } from '../core/types';
import { BALANCE } from '../config/balance';
import { baseStat } from './stats';

// Playstyle identity: derived from what you have actually become (base stats), never chosen from a menu
// and never saved. Raise different stats and the same save becomes a different kind of visitor.

export interface IdentityDef {
  id: string;
  label: string;
  stats: StatId[];
  text: string;
  perk: string;
}

export const IDENTITIES: IdentityDef[] = [
  { id: 'tinkerer', label: 'Tinkerer', stats: ['creativity', 'puzzleSense'], perk: 'Every puzzle phase you solve calms the machine one extra step.', text: 'You fix things you were not asked to fix.' },
  { id: 'gambler', label: 'Gambler', stats: ['luck', 'chaos'], perk: 'Rare crafting outcomes come up about a quarter more often.', text: 'You hear the dice before you roll them.' },
  { id: 'daredevil', label: 'Daredevil', stats: ['courage', 'dadEnergy'], perk: 'Boss hits land one softer (never below 1).', text: 'You said yes before the question finished.' },
  { id: 'scholar', label: 'Scholar', stats: ['curiosity', 'observation'], perk: 'The Inspector probes one level deeper.', text: 'You read the terms and conditions. For fun.' },
  { id: 'keeper', label: 'Keeper', stats: ['nurture', 'memory'], perk: 'Your companion tires half as fast when it helps.', text: 'You remember everyone’s favourite snack.' },
];

/** growth over where you started, so the opening stats do not hand anyone a title */
const MIN_SCORE = 3;

export function identityScores(g: Game): Array<{ def: IdentityDef; score: number }> {
  return IDENTITIES.map((def) => ({ def, score: def.stats.reduce((n, s) => n + baseStat(g, s) - BALANCE.stats.start[s], 0) }));
}

/** the leading playstyle, or null while you are still a Drifter (no clear lead) */
export function identity(g: Game): IdentityDef | null {
  const sorted = identityScores(g).sort((a, b) => b.score - a.score);
  const [top, next] = sorted;
  if (top.score < MIN_SCORE || top.score - next.score < 1) return null;
  return top.def;
}

export function isIdentity(g: Game, id: string): boolean {
  return identity(g)?.id === id;
}
