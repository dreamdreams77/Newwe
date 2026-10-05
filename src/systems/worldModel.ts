import type { Game } from '../core/game';
import { WORLD, WORLD_BY_ID, type Dep, type WorldObj } from '../data/world';
import { test } from './conditions';
import { changeVital, statValue } from './stats';
import { passTime } from './actions';
import { hasPerk } from './equipment';
import { isIdentity } from './identity';

export type Tier = 0 | 1 | 2;

export function objectState(g: Game, o: WorldObj): string {
  for (const r of o.stateRules) if (test(g, r.when)) return r.is;
  return 'UNKNOWN';
}

export function knownObjects(g: Game): WorldObj[] {
  return WORLD.filter((o) => test(g, o.known));
}

export function depSatisfied(g: Game, d: Dep): boolean {
  return test(g, d.cond);
}

/** how many of the clauses must hold for the object to "work" */
export function objectOk(g: Game, o: WorldObj): boolean {
  const n = o.deps.filter((d) => depSatisfied(g, d)).length;
  if (o.mode === 'ALL') return n === o.deps.length;
  if (o.mode === 'ANY') return n >= 1;
  return n === 1;
}

const key = (o: WorldObj, d: Dep) => `${o.id}:${d.id}`;

/**
 * How well the player understands a dependency:
 *  0 = "??? = ?"   1 = "name = ?"   2 = the whole clause.
 * You fully understand what you have satisfied yourself, what you have been told (reveal),
 * and what you have probed. Probing is limited by Observation, so stats change what you can SEE.
 */
export function depTier(g: Game, o: WorldObj, d: Dep): Tier {
  const stored = g.state.inspector.tiers[key(o, d)] ?? 0;
  let t: number = stored;
  if (g.has('ng')) t = Math.max(t, 1); // you have seen this place before
  if (d.nameKnown && test(g, d.nameKnown)) t = Math.max(t, 1);
  if (depSatisfied(g, d) || (d.reveal && test(g, d.reveal))) t = Math.max(t, 2);
  return Math.min(2, t) as Tier;
}

export interface ProbeResult {
  ok: boolean;
  text: string;
  revealed?: string;
}

/** Spend a coffee to look deeper at one object. Needs the Observation to see what is there. */
export function probe(g: Game, objId: string): ProbeResult {
  const o = WORLD_BY_ID[objId];
  if (!o) return { ok: false, text: 'Nothing there.' };
  const free = g.state.inspector.level >= 2;
  if (!free && g.state.vitals.coffee < 1) return { ok: false, text: 'Too jittery to focus. (Needs 1 Coffee.)' };
  const obs = statValue(g, 'observation') + (hasPerk(g, 'probe_plus2') ? 2 : 0) + (isIdentity(g, 'scholar') ? 1 : 0) + (g.state.inspector.level >= 2 ? 2 : 0);
  const open = o.deps.filter((d) => depTier(g, o, d) < 2);
  if (!open.length) return { ok: false, text: 'There is nothing left in here you do not already understand.' };
  const reachable = open.filter((d) => (d.obs ?? 3) <= obs).sort((a, b) => depTier(g, o, a) - depTier(g, o, b));
  if (!free) changeVital(g, 'coffee', -1);
  passTime(g, 3);
  g.state.inspector.probes++;
  if (!reachable.length) {
    const need = Math.min(...open.map((d) => d.obs ?? 3));
    return { ok: false, text: `The characters swim. You need to see more than you can yet (Observation ${need}).` };
  }
  const d = reachable[0];
  const next = Math.min(2, depTier(g, o, d) + 1);
  g.state.inspector.tiers[key(o, d)] = next;
  g.changed();
  return { ok: true, text: next === 2 ? 'It comes into focus.' : 'You can make out a name, though not what it is compared to.', revealed: d.id };
}

export function maskedClause(g: Game, o: WorldObj, d: Dep): { text: string; tier: Tier; met: boolean | null } {
  const t = depTier(g, o, d);
  if (t === 0) return { text: '??? = ?', tier: 0, met: null };
  if (t === 1) return { text: `${d.name} = ?`, tier: 1, met: null };
  return { text: d.op ? `${d.name} ${d.op} ${d.value}` : d.name, tier: 2, met: depSatisfied(g, d) };
}

export function errorLine(g: Game, o: WorldObj): string {
  if (!o.error) return '';
  return test(g, o.error.reveal) ? `${o.error.code}: ${o.error.text}` : `ERROR: ${'█'.repeat(9)}`;
}

export function noteLine(g: Game, o: WorldObj): string | null {
  if (!o.note || !test(g, o.note.reveal)) return null;
  const all = o.deps.every((d) => depTier(g, o, d) === 2);
  return all ? o.note.text : null;
}

/** raw dump of an object for terminal/source views; honours what the player may know */
export function describeObject(g: Game, o: WorldObj): string[] {
  const lines = [`OBJECT: ${o.label}`, `TYPE: ${o.kind}`, `STATE: ${objectState(g, o)}`, `LOGIC: ${o.mode}`, 'DEPENDENCIES:'];
  for (const d of o.deps) {
    const c = maskedClause(g, o, d);
    lines.push(`  ${c.met === null ? '[ ]' : c.met ? '[x]' : '[!]'} ${c.text}`);
  }
  const e = errorLine(g, o);
  if (e) lines.push(e);
  const n = noteLine(g, o);
  if (n) lines.push(`NOTE: ${n}`);
  return lines;
}

/** a boolean "world view" of everything: used by the final SYSTEM STATUS and the tests */
export function worldSummary(g: Game) {
  return knownObjects(g).map((o) => ({ id: o.id, state: objectState(g, o), ok: objectOk(g, o) }));
}
