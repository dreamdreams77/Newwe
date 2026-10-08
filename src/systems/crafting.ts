import { BALANCE } from '../config/balance';
import type { Game } from '../core/game';
import { inWindow } from '../core/timeSystem';
import { passTime } from './actions';
import type { RecipeDef, RecipeOutcome } from '../core/types';
import { RECIPES } from '../data/recipes';
import { test } from './conditions';
import { applyEffects } from './effects';
import { hasItem, itemDef, removeItem } from './inventory';
import { statValue } from './stats';
import { hasPerk } from './equipment';
import { isIdentity } from './identity';

export interface CraftResult {
  kind: 'made' | 'nothing' | 'near';
  text: string;
  recipe?: RecipeDef;
  outcome?: RecipeOutcome;
  firstTime?: boolean;
}

function matches(r: RecipeDef, ids: string[]): boolean {
  if (r.inputs.length !== ids.length) return false;
  const a = [...r.inputs].sort().join('|');
  const b = [...ids].sort().join('|');
  return a === b;
}

function available(g: Game, r: RecipeDef): boolean {
  if (r.window && !inWindow(g.state.clock.minutes, r.window.centre, r.window.radius)) return false;
  if (r.requires && !test(g, r.requires)) return false;
  if (r.needsStat && statValue(g, r.needsStat.stat) < r.needsStat.gte) return false;
  return true;
}

const FIZZLES = [
  'You hold them together and wait. The universe declines.',
  'They sit next to each other, awkwardly, like strangers at a party.',
  'Nothing. But somewhere, a very small hint of a feeling that you were close to something else.',
  'You squash them together with confidence. They are not impressed.',
  'It does not work, but it works up a sweat.',
];

/** Try to combine items. Never reveals recipes that were not discovered by doing. */
export function combine(g: Game, ids: string[]): CraftResult {
  g.state.recipes.attempts++;
  for (const id of ids) if (!hasItem(g, id)) return { kind: 'nothing', text: 'You do not have all of those.' };
  const candidates = RECIPES.filter((r) => matches(r, ids)).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const ok = candidates.find((r) => available(g, r));
  if (!ok) {
    passTime(g, 1);
    if (candidates.length) return { kind: 'near', text: candidates[0].nearMiss ?? 'So close. Something about the moment is off.', recipe: undefined };
    return { kind: 'nothing', text: g.rng.pick(FIZZLES) };
  }
  const outcome = pickOutcome(g, ok);
  for (const id of ok.consume ?? ok.inputs) removeItem(g, id, 1);
  passTime(g, ok.minutes ?? BALANCE.time.cost.craft);
  g.state.counters.crafts++;
  const firstTime = !g.state.recipes.discovered.includes(ok.id) && !(ok.category === 'chaos' && g.state.recipes.chaosSeen.includes(outcome.label));
  if (ok.category === 'chaos') {
    if (!g.state.recipes.chaosSeen.includes(outcome.label)) g.state.recipes.chaosSeen.push(outcome.label);
  }
  if (!g.state.recipes.discovered.includes(ok.id)) g.state.recipes.discovered.push(ok.id);
  applyEffects(g, outcome.effects);
  g.reveal('crafting');
  g.sfx(outcome.tier === 'disaster' ? 'fumble' : outcome.tier === 'rare' ? 'crit' : 'craft');
  g.log(`Crafted: ${outcome.label}.`);
  g.changed();
  return { kind: 'made', text: outcome.text, recipe: ok, outcome, firstTime };
}

/** Chaos pulls the dice towards the extremes (rare + disaster); Luck pulls towards the good end. */
function pickOutcome(g: Game, r: RecipeDef): RecipeOutcome {
  if (r.outcomes.length === 1) return r.outcomes[0];
  const chaos = statValue(g, 'chaos');
  const luck = statValue(g, 'luck');
  const weighted = r.outcomes.map((o) => {
    let w = o.weight;
    if (o.tier === 'rare' || o.tier === 'secret') w *= (1 + chaos * 0.15 + luck * 0.1) * (hasPerk(g, 'lucky_receipt') ? 1.4 : 1) * (isIdentity(g, 'gambler') ? 1.25 : 1) * (hasPerk(g, 'chain_letter') ? 1.5 : 1);
    if (o.tier === 'disaster') w *= Math.max(0.2, 1 + chaos * 0.15 - luck * 0.12) * (hasPerk(g, 'chain_letter') ? 1.5 : 1);
    if (o.tier === 'joke' || o.tier === 'junk') w *= Math.max(0.3, 1 - chaos * 0.05);
    return { ...o, weight: w };
  });
  const picked = g.rng.weighted(weighted);
  return r.outcomes.find((o) => o.label === picked.label) ?? r.outcomes[0];
}

/** What the player has made so far (never the unmade). */
export function discoveredRecipes(g: Game): RecipeDef[] {
  return RECIPES.filter((r) => g.state.recipes.discovered.includes(r.id));
}
export function undiscoveredCount(g: Game): number {
  return RECIPES.filter((r) => !g.state.recipes.discovered.includes(r.id)).length;
}
export function describeInputs(r: RecipeDef): string {
  return r.inputs.map((i) => itemDef(i).name).join(' + ');
}
