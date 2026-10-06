import { BALANCE } from '../config/balance';
import type { Game } from '../core/game';
import { seeded } from '../core/random';
import { ENCOUNTERS, type EncounterDef } from '../data/encounters';
import { changeVital } from './stats';
import { applyAilment } from './ailments';
import { isIdentity } from './identity';
import { hasKnack } from './knacks';

export interface EncState {
  phase: number;
  fury: number;
  won: boolean;
  attempts: number;
  data: Record<string, import('../core/types').FlagValue>;
}

export function encDef(id: string): EncounterDef {
  const d = (ENCOUNTERS as Record<string, EncounterDef>)[id];
  if (!d) throw new Error(`Unknown encounter ${id}`);
  return d;
}

export function encState(g: Game, id: string): EncState {
  return (g.state.encounters[id] ??= { phase: 0, fury: 0, won: false, attempts: 0, data: {} });
}

export function startEncounter(g: Game, id: string): EncState {
  const e = encState(g, id);
  e.fury = 0;
  e.attempts++;
  e.data.negate = false;
  e.data.glitched = false;
  e.data.forgave = false;
  g.changed();
  return e;
}

/** a solvable 3×3 "lights" puzzle derived from the world seed */
export function makeLights(g: Game, salt = 0): { lights: boolean[]; solution: number[] } {
  const rng = seeded((g.state.seed ^ 0x1111 ^ (salt * 7919)) >>> 0);
  for (let tries = 0; tries < 20; tries++) {
    const cells = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 4 + rng.int(0, 1));
    const lights = Array<boolean>(9).fill(false);
    for (const c of cells) toggleLights(lights, c, false);
    if (lights.some(Boolean)) return { lights, solution: cells };
  }
  const lights = Array<boolean>(9).fill(false);
  [0, 4, 8].forEach((c) => toggleLights(lights, c, false));
  return { lights, solution: [0, 4, 8] };
}

export function toggleLights(lights: boolean[], i: number, bend: boolean): void {
  const x = i % 3;
  const y = Math.floor(i / 3);
  lights[i] = !lights[i];
  if (bend) return; // 11:11 bent the rule: only the pressed light changes
  if (x > 0) lights[i - 1] = !lights[i - 1];
  if (x < 2) lights[i + 1] = !lights[i + 1];
  if (y > 0) lights[i - 3] = !lights[i - 3];
  if (y < 2) lights[i + 3] = !lights[i + 3];
}

export interface Attack {
  line: string;
  damage: number;
  negated: boolean;
}

export function bossAttack(g: Game, e: EncState, def: EncounterDef): Attack {
  const line = def.attackLines[g.rng.int(0, def.attackLines.length - 1)];
  if (e.data.negate) {
    e.data.negate = false;
    g.changed();
    return { line, damage: 0, negated: true };
  }
  const [lo, hi] = BALANCE.combat.attackDamage;
  const damage = Math.max(1, g.rng.int(lo, hi) - (isIdentity(g, 'daredevil') ? 1 : 0));
  changeVital(g, 'hp', -damage);
  g.sfx('hit');
  if (/cola/i.test(line)) applyAilment(g, 'jittery', 60); // a warm cola, directly into the face
  return { line, damage, negated: false };
}

export interface FuryResult {
  attacks: Attack[];
  tilt: boolean;
}

/** each point of fury is an attack; at the limit the machine tilts and ejects you */
export function raiseFury(g: Game, e: EncState, def: EncounterDef, n = 1): FuryResult {
  const attacks: Attack[] = [];
  for (let i = 0; i < n; i++) {
    if (hasKnack(g, 'steady_hands') && !e.data.forgave) {
      e.data.forgave = true; // the first mistake each fight is forgiven
      continue;
    }
    e.fury++;
    attacks.push(bossAttack(g, e, def));
  }
  g.changed();
  return { attacks, tilt: e.fury >= def.furyMax || g.state.vitals.hp <= 0 };
}

export function lowerFury(g: Game, e: EncState, n = 1): void {
  e.fury = Math.max(0, e.fury - n);
  g.changed();
}

export function advancePhase(g: Game, e: EncState): void {
  e.phase++;
  e.fury = Math.max(0, e.fury - (isIdentity(g, 'tinkerer') ? 2 : 1)); // a solved phase calms the machine a little
  if (hasKnack(g, 'second_wind')) changeVital(g, 'hp', 2);
  g.sfx('puzzle');
  g.changed();
}
