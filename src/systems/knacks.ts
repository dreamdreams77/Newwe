import { BALANCE } from '../config/balance';
import type { Game } from '../core/game';
import type { StatId } from '../core/types';

// Knacks: small permanent choices you earn by growing, one of two per tier. No XP and no level number:
// the tier you reach is how much you have changed since you started. Stored as a string flag, so it
// saves with no format change.

export interface KnackDef {
  id: string;
  tier: number;
  label: string;
  text: string;
}

/** total stat growth for each pick. Measured: a full run of the original slice grows about 5 points, so these are 'early, mid, after the extras' */
export const KNACK_TIERS = [2, 5, 9];

export const KNACKS: KnackDef[] = [
  { id: 'steady_hands', tier: 0, label: 'Steady Hands', text: 'The first mistake in every boss fight is forgiven.' },
  { id: 'quick_study', tier: 0, label: 'Quick Study', text: 'You count as knowing one more thing about the boss (+1 Boss Knowledge).' },
  { id: 'second_wind', tier: 1, label: 'Second Wind', text: 'Solving a boss phase heals you 2 HP.' },
  { id: 'night_owl', tier: 1, label: 'Night Owl', text: 'Everything takes a tenth less time.' },
  { id: 'lucky_streak', tier: 2, label: 'Lucky Streak', text: 'Luck +2, permanently. The dice have noticed you.' },
  { id: 'archivist', tier: 2, label: 'Archivist', text: 'The Inspector probes cost no Coffee.' },
];

export function growth(g: Game): number {
  const start = BALANCE.stats.start as Record<string, number>;
  return (Object.entries(g.state.stats) as Array<[StatId, number]>)
    .filter(([k]) => k !== 'bossKnowledge')
    .reduce((n, [k, v]) => n + Math.max(0, v - (start[k] ?? 0)), 0);
}

export function picked(g: Game): string[] {
  const v = g.state.flags.knacks;
  return typeof v === 'string' && v ? v.split(',') : [];
}

export const hasKnack = (g: Game, id: string): boolean => picked(g).includes(id);

/** tiers you have earned but not yet chosen from, lowest first */
export function pendingTier(g: Game): number | null {
  const have = picked(g).length;
  const earned = KNACK_TIERS.filter((t) => growth(g) >= t).length;
  return have < earned ? have : null;
}

export function pickKnack(g: Game, id: string): boolean {
  const k = KNACKS.find((x) => x.id === id);
  const tier = pendingTier(g);
  if (!k || tier === null || k.tier !== tier) return false;
  g.state.flags.knacks = [...picked(g), id].join(',');
  g.sfx('puzzle');
  g.toast(`Knack gained: ${k.label}. ${k.text}`, 'magic');
  g.changed();
  return true;
}
