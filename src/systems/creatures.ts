import { BALANCE } from '../config/balance';
import type { Game } from '../core/game';
import type { CreatureState, FlagValue } from '../core/types';
import { SPECIES, type FoodReaction, type SpeciesDef } from '../data/creatures';
import { ITEMS } from '../data/items';
import { removeItem, qty } from './inventory';
import { raiseStat, statValue } from './stats';

export function species(id: string): SpeciesDef {
  const s = SPECIES[id];
  if (!s) throw new Error(`Unknown species ${id}`);
  return s;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function meetCreature(g: Game, speciesId: string, name?: string): CreatureState {
  const sp = species(speciesId);
  const existing = g.state.creatures[speciesId];
  if (existing?.met) return existing;
  const c: CreatureState = {
    id: speciesId,
    species: speciesId,
    name: name ?? sp.defaultName,
    met: true,
    fullness: 40,
    mood: 55,
    trust: 6,
    energy: 70,
    traits: {},
    learned: [],
    fedLog: [],
    lastCareAt: g.state.clock.minutes,
  };
  g.state.creatures[speciesId] = c;
  g.state.activeCreature = speciesId;
  g.reveal('creature');
  g.changed();
  return c;
}

export function activeCreature(g: Game): CreatureState | null {
  const id = g.state.activeCreature;
  return id ? g.state.creatures[id] ?? null : null;
}

export function creatureField(g: Game, id: string, field: 'trust' | 'mood' | 'energy' | 'fullness', by: number): void {
  const c = g.state.creatures[id];
  if (!c) return;
  c[field] = clamp(c[field] + by);
  g.changed();
}

export function dominantTrait(c: CreatureState): string | null {
  let best: string | null = null;
  let score = 0;
  for (const [k, v] of Object.entries(c.traits)) {
    if (v > score) {
      best = k;
      score = v;
    }
  }
  return score >= 2 ? best : null;
}

export function personalityLabel(c: CreatureState): string {
  const sp = species(c.species);
  const t = dominantTrait(c);
  return t ? sp.traits[t] : 'Undecided';
}

export function creatureMoodText(g: Game, c: CreatureState): string {
  const sp = species(c.species);
  const lines = c.mood < 30 ? sp.moodLines.low : c.mood > 70 ? sp.moodLines.high : sp.moodLines.mid;
  const loc = sp.locationLines[g.state.zone];
  const pick = lines[(g.state.clock.minutes + c.trust) % lines.length];
  return loc && c.mood >= 30 ? `${pick} ${loc}` : pick;
}

/** how food is received: by item id, then by tag */
export function reactionFor(sp: SpeciesDef, itemId: string): FoodReaction {
  if (sp.foods[itemId]) return sp.foods[itemId];
  const def = ITEMS[itemId];
  for (const tag of def?.tags ?? []) if (sp.tagFoods[tag]) return sp.tagFoods[tag];
  return sp.confused;
}

export interface FeedResult {
  ok: boolean;
  text: string;
  learned?: string;
}

export function feedCreature(g: Game, creatureId: string, itemId: string): FeedResult {
  const c = g.state.creatures[creatureId];
  if (!c || qty(g, itemId) < 1) return { ok: false, text: 'Nothing to feed.' };
  const sp = species(c.species);
  const r = reactionFor(sp, itemId);
  if (r === sp.confused) return { ok: false, text: r.text };
  // Nurture makes care land better
  const nurtureBonus = 1 + (statValue(g, 'nurture') - 3) * 0.06;
  const scale = (n = 0) => Math.round(n * (n > 0 ? nurtureBonus : 1));
  removeItem(g, itemId, 1);
  c.fullness = clamp(c.fullness + scale(r.fullness));
  c.mood = clamp(c.mood + scale(r.mood));
  c.energy = clamp(c.energy + scale(r.energy));
  c.trust = clamp(c.trust + scale(r.trust));
  for (const [k, v] of Object.entries(r.traits ?? {})) c.traits[k] = (c.traits[k] ?? 0) + v;
  c.fedLog.push(itemId);
  if (c.fedLog.length > 6) c.fedLog.shift();
  let text = r.text;
  if (c.fullness > BALANCE.creature.stuffedAbove) {
    c.mood = clamp(c.mood - 8);
    text += ' It is so full it makes a small, regretful noise.';
  }
  let learned: string | undefined;
  if (r.learn && !c.learned.includes(r.learn)) {
    c.learned.push(r.learn);
    learned = r.learn;
  }
  // trust milestones grow Nurture (care changes the carer too)
  const m = Math.floor(c.trust / 25);
  const k = `nurture_milestone_${creatureId}`;
  if (m > ((g.state.flags[k] as number | undefined) ?? 0)) {
    g.state.flags[k] = m as FlagValue;
    raiseStat(g, 'nurture', 1);
    g.toast('Looking after something raised your Nurture.', 'good');
  }
  if (c.trust >= BALANCE.creature.trustForSniff && !c.learned.includes('sniff')) {
    c.learned.push('sniff');
    learned = learned ?? 'sniff';
  }
  g.changed();
  return { ok: true, text, learned };
}

export function careAction(g: Game, creatureId: string, kind: 'pet' | 'play' | 'nap'): string {
  const c = g.state.creatures[creatureId];
  if (!c) return '';
  const sp = species(c.species);
  const nb = 1 + (statValue(g, 'nurture') - 3) * 0.06;
  if (kind === 'pet') {
    c.trust = clamp(c.trust + Math.round(3 * nb));
    c.mood = clamp(c.mood + Math.round(6 * nb));
    c.traits.gentle = (c.traits.gentle ?? 0) + 0.25;
    g.changed();
    return sp.petLines[(c.trust + g.state.counters.actions) % sp.petLines.length];
  }
  if (kind === 'play') {
    if (c.energy < 15) return 'It is too tired to play. It flops over to make the point.';
    c.energy = clamp(c.energy - 15);
    c.mood = clamp(c.mood + Math.round(12 * nb));
    c.trust = clamp(c.trust + Math.round(2 * nb));
    c.fullness = clamp(c.fullness - 6);
    c.traits.bold = (c.traits.bold ?? 0) + 0.25;
    g.changed();
    return 'You play chase-the-shoelace. It wins, gloatingly.';
  }
  c.energy = clamp(c.energy + 40);
  c.mood = clamp(c.mood + 4);
  g.changed();
  return 'It naps on your shoulder, one claw gripping your collar for security.';
}

/** time passes: hunger creeps up, energy recovers, mood follows hunger */
export function tickCreatures(g: Game, minutes: number): void {
  const hours = minutes / 60;
  for (const c of Object.values(g.state.creatures)) {
    if (!c.met) continue;
    c.fullness = clamp(c.fullness - BALANCE.creature.hungerPerHour * hours);
    c.energy = clamp(c.energy + (c.fullness > 20 ? 4 : -2) * hours);
    if (c.fullness < 15) c.mood = clamp(c.mood - 3 * hours);
  }
}

export function canSniff(c: CreatureState | null): boolean {
  return !!c && c.learned.includes('sniff') && c.energy >= BALANCE.creature.sniffEnergy;
}
export function canAssist(c: CreatureState | null): boolean {
  return !!c && c.trust >= BALANCE.creature.trustToBond && c.energy >= BALANCE.creature.assistEnergy;
}
export function spendCreatureEnergy(g: Game, id: string, n: number): void {
  creatureField(g, id, 'energy', -n);
}
