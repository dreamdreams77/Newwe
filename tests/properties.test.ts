import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { seeded } from '../src/core/random';
import { test as cond } from '../src/systems/conditions';
import { exportPassword, importPassword } from '../src/core/saveSystem';
import { FLAG_DICT } from '../src/core/saveCodec';
import { ITEMS } from '../src/data/items';
import { BALANCE } from '../src/config/balance';
import type { Cond, StatId } from '../src/core/types';
import { newGame, flush } from './helpers';

// Property-based tests: instead of hand-picked examples, state an invariant and let fast-check hunt for a counterexample.

const STAT_IDS = Object.keys(BALANCE.stats.start) as StatId[];
const ITEM_IDS = Object.keys(ITEMS);

describe('random number generator', () => {
  it('is deterministic per seed, and shuffle is always a permutation', () => {
    fc.assert(fc.property(fc.integer(), fc.array(fc.integer(), { maxLength: 40 }), (seed, arr) => {
      const a = seeded(seed >>> 0);
      const b = seeded(seed >>> 0);
      for (let i = 0; i < 20; i++) expect(a.next()).toBe(b.next());
      const out = seeded(seed >>> 0).shuffle(arr.slice());
      expect([...out].sort((x, y) => x - y)).toEqual([...arr].sort((x, y) => x - y));
    }), { numRuns: 300 });
  });
  it('int() stays inside its bounds', () => {
    fc.assert(fc.property(fc.integer(), fc.integer({ min: -50, max: 50 }), fc.integer({ min: 0, max: 80 }), (seed, lo, span) => {
      const r = seeded(seed >>> 0);
      for (let i = 0; i < 30; i++) { const v = r.int(lo, lo + span); expect(v).toBeGreaterThanOrEqual(lo); expect(v).toBeLessThanOrEqual(lo + span); }
    }), { numRuns: 300 });
  });
});

describe('condition language', () => {
  const FLAGS = ['a', 'b', 'c', 'd'];
  const leaf = fc.constantFrom(...FLAGS).map((f): Cond => ({ flag: f }));
  const condArb: fc.Arbitrary<Cond> = fc.letrec((tie) => ({
    node: fc.oneof(
      { depthSize: 'small', maxDepth: 3 },
      leaf,
      tie('node').map((c): Cond => ({ not: c as Cond })),
      fc.array(tie('node'), { minLength: 1, maxLength: 3 }).map((cs): Cond => ({ all: cs as Cond[] })),
      fc.array(tie('node'), { minLength: 1, maxLength: 3 }).map((cs): Cond => ({ any: cs as Cond[] })),
    ),
  })).node;
  const withFlags = (set: boolean[]) => { const g = newGame(); FLAGS.forEach((f, i) => { if (set[i]) g.state.flags[f] = true; }); return g; };

  it('double negation cancels, and De Morgan holds', () => {
    fc.assert(fc.property(condArb, fc.array(fc.boolean(), { minLength: 4, maxLength: 4 }), (c, set) => {
      const g = withFlags(set);
      expect(cond(g, { not: { not: c } })).toBe(cond(g, c));
      expect(cond(g, { not: { all: [c, { flag: 'a' }] } })).toBe(cond(g, { any: [{ not: c }, { not: { flag: 'a' } }] }));
      expect(cond(g, { not: { any: [c, { flag: 'b' }] } })).toBe(cond(g, { all: [{ not: c }, { not: { flag: 'b' } }] }));
    }), { numRuns: 300 });
  });
  it('all/any of one element is that element; an absent condition is always true', () => {
    fc.assert(fc.property(condArb, fc.array(fc.boolean(), { minLength: 4, maxLength: 4 }), (c, set) => {
      const g = withFlags(set);
      expect(cond(g, { all: [c] })).toBe(cond(g, c));
      expect(cond(g, { any: [c] })).toBe(cond(g, c));
      expect(cond(g, undefined)).toBe(true);
    }), { numRuns: 300 });
  });
});

describe('save password round trip', () => {
  it('random progress survives export then import, exactly', async () => {
    await fc.assert(fc.asyncProperty(
      fc.integer({ min: 1, max: 99999 }),
      fc.subarray(FLAG_DICT, { maxLength: 60 }),
      fc.subarray(ITEM_IDS, { maxLength: 12 }),
      fc.array(fc.integer({ min: 0, max: 12 }), { minLength: STAT_IDS.length, maxLength: STAT_IDS.length }),
      fc.integer({ min: 0, max: 20000 }),
      fc.integer({ min: 0, max: 1400 }),
      async (seed, flags, items, stats, minutes, visitors) => {
        const g = newGame(seed);
        const s = g.state;
        for (const f of flags) s.flags[f] = true;
        for (const id of items) s.inventory[id] = { qty: 1 + (id.length % 3), acquiredAt: 5 };
        STAT_IDS.forEach((k, i) => { s.stats[k] = stats[i]; });
        s.clock.minutes = 600 + minutes;
        s.visitors = 73 + visitors;
        g.changed();
        await flush(); // derived systems (quests, badges) settle before we snapshot
        const back = await importPassword(await exportPassword(s));
        expect(back.seed).toBe(s.seed);
        expect(back.visitors).toBe(s.visitors);
        expect(back.clock.minutes).toBe(s.clock.minutes);
        expect(back.stats).toEqual(s.stats);
        expect(Object.keys(back.inventory).sort()).toEqual(Object.keys(s.inventory).sort());
        for (const f of flags) expect(back.flags[f]).toBe(true);
        for (const [k, v] of Object.entries(s.flags)) if (v === true) expect(back.flags[k]).toBe(true);
      },
    ), { numRuns: 60 });
  });
});

describe('save password versioning', () => {
  it('a password from a different version of the id tables is refused with a clear message, not misread', async () => {
    const { DICT_FINGERPRINT } = await import('../src/core/saveCodec');
    const g = newGame(7);
    const code = await exportPassword(g.state);
    expect(DICT_FINGERPRINT).toBeGreaterThan(0);
    // forge the fingerprint of an older/newer build: re-frame the same body under another fingerprint
    const { fromBase32, toBase32 } = await import('../src/core/saveSystem');
    const bytes = fromBase32(code);
    bytes[1] = (bytes[1] + 1) & 255;
    await expect(importPassword(toBase32(bytes).match(/.{1,4}/g)!.join('-'))).rejects.toThrow(/different version/);
    // and the untouched one still loads
    expect((await importPassword(code)).seed).toBe(g.state.seed);
  });
});
