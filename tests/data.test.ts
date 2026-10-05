import { describe, expect, it } from 'vitest';
import { ITEMS } from '../src/data/items';
import { CARDS } from '../src/data/cards';
import { RECIPES } from '../src/data/recipes';
import { SPECIES } from '../src/data/creatures';
import { TREES } from '../src/data/dialogue';
import { GUEST_ENTRIES, DEDUCTION, ENTRY_BY_ID } from '../src/data/guestbook';
import { QUESTS } from '../src/data/quests';
import { MEMORIES } from '../src/data/memories';
import { ZONES, WEBRING } from '../src/data/zones';
import { ENCOUNTERS } from '../src/data/encounters';
import { KNOWLEDGE } from '../src/data/knowledge';
import { SPRITES } from '../src/ui/spriteData';
import { LULLABY, PAD_NOTES, cipherAlphabet, encipher, CIPHER_PLAIN, FINE_PRINT, FINE_PRINT_ANSWER } from '../src/data/puzzles';
import { generateMaze, placeThings, MAZE_N } from '../src/systems/maze';
import { makeLights, toggleLights } from '../src/systems/combat';
import { newGame } from './helpers';
import type { Effect } from '../src/core/types';

const spriteKeys = Object.keys(SPRITES);
const effectItems = (effects: Effect[]) => effects.filter((e): e is Extract<Effect, { t: 'item' }> => e.t === 'item').map((e) => e.id);

describe('content integrity', () => {
  it('every sprite is rectangular and uses only palette characters', async () => {
    const { PALETTE } = await import('../src/ui/spriteData');
    for (const [key, rows] of Object.entries(SPRITES)) {
      const w = rows[0].length;
      for (const r of rows) {
        expect(r.length, `${key} row "${r}" has width ${r.length}, expected ${w}`).toBe(w);
        for (const ch of r) if (ch !== '.') expect(PALETTE[ch], `${key} uses unknown palette char '${ch}'`).toBeTruthy();
      }
    }
  });
  it('items and cards point at sprites and cards that exist', () => {
    for (const i of Object.values(ITEMS)) {
      expect(spriteKeys, `item ${i.id} icon ${i.icon}`).toContain(i.icon);
      if (i.cardId) expect(CARDS[i.cardId], `item ${i.id} card ${i.cardId}`).toBeTruthy();
      for (const u of i.uses) for (const it of effectItems(u.effects ?? [])) expect(ITEMS[it]).toBeTruthy();
    }
    for (const c of Object.values(CARDS)) expect(spriteKeys, `card ${c.id} glyph ${c.glyph}`).toContain(c.glyph);
  });
  it('recipes only use real items, and chaos recipes have several outcomes', () => {
    for (const r of RECIPES) {
      for (const i of r.inputs) expect(ITEMS[i], `recipe ${r.id} input ${i}`).toBeTruthy();
      for (const o of r.outcomes) for (const it of effectItems(o.effects)) expect(ITEMS[it], `recipe ${r.id} output ${it}`).toBeTruthy();
      if (r.category === 'chaos') expect(r.outcomes.length).toBeGreaterThan(2);
    }
  });
  it('dialogue trees never point at a missing node and use real portraits', () => {
    for (const tree of Object.values(TREES)) {
      const names = new Set(Object.keys(tree.nodes));
      if (typeof tree.start === 'string') expect(names.has(tree.start)).toBe(true);
      for (const n of Object.values(tree.nodes)) {
        if (n.next) expect(names.has(n.next), `${tree.id}.${n.id} -> ${n.next}`).toBe(true);
        if (n.portrait) expect(spriteKeys).toContain(n.portrait);
        for (const c of n.choices ?? []) {
          if (c.next) expect(names.has(c.next), `${tree.id}.${n.id} choice -> ${c.next}`).toBe(true);
          if (c.check) {
            expect(names.has(c.check.ok)).toBe(true);
            expect(names.has(c.check.fail)).toBe(true);
          }
        }
      }
    }
  });
  it('guestbook attachments exist and the deduction is well-formed', () => {
    for (const e of GUEST_ENTRIES) if (e.attachment) expect(ITEMS[e.attachment.item]).toBeTruthy();
    const subj = ENTRY_BY_ID[DEDUCTION.subject];
    const tellsOf = (id: string) => new Set(ENTRY_BY_ID[id].msg.filter((s) => typeof s !== 'string').map((s) => (s as { tell: string }).tell));
    const subjTells = tellsOf(subj.id);
    const shared = (id: string) => [...tellsOf(id)].filter((t) => subjTells.has(t)).length;
    expect(shared(DEDUCTION.author)).toBeGreaterThanOrEqual(DEDUCTION.needTells);
    for (const id of DEDUCTION.candidates.filter((c) => c !== DEDUCTION.author)) expect(shared(id), `decoy ${id}`).toBeLessThan(DEDUCTION.needTells);
  });
  it('quests have rewards and steps that make sense; knowledge ids exist', () => {
    for (const q of QUESTS) {
      expect(q.steps.length).toBeGreaterThan(0);
      for (const st of q.steps) if ('know' in st.done) expect(KNOWLEDGE[st.done.know]).toBeTruthy();
    }
  });
  it('memories become something', () => {
    for (const m of Object.values(MEMORIES)) {
      expect(m.becomes.length).toBeGreaterThan(3);
      expect(m.onGain.length).toBeGreaterThan(0);
    }
  });
  it('every zone has an address and every encounter phase has a nudge', () => {
    for (const z of Object.values(ZONES)) expect(z.url.startsWith('http')).toBe(true);
    for (const t of WEBRING) expect(t.alt.startsWith('[broken image')).toBe(true);
    for (const e of Object.values(ENCOUNTERS)) for (const p of e.phases) expect(p.unknown.length).toBeGreaterThan(5);
  });
  it('creatures react to each of the slice foods', () => {
    const sp = SPECIES.chocobo;
    for (const f of ['snack_711', 'good_coffee', 'yoghurt', 'willow_leaf', 'coffee']) expect(sp.foods[f]).toBeTruthy();
  });
});

describe('puzzle content', () => {
  it('the lullaby is a legal sequence of pads', () => {
    expect(LULLABY.every((i) => i >= 0 && i < PAD_NOTES.length)).toBe(true);
    expect(LULLABY.length).toBe(5);
  });
  it('the keyword cipher is a permutation and round-trips', () => {
    const a = cipherAlphabet();
    expect(new Set(a).size).toBe(26);
    const c = encipher(CIPHER_PLAIN);
    expect(c).not.toBe(CIPHER_PLAIN);
    expect(c.replace(/[^A-Z]/g, '').length).toBe(CIPHER_PLAIN.replace(/[^A-Z]/g, '').length);
    // decode
    const back = c.split('').map((ch) => (a.indexOf(ch) >= 0 ? String.fromCharCode(65 + a.indexOf(ch)) : ch)).join('');
    expect(back).toBe(CIPHER_PLAIN);
  });
  it('the fine print really is an acrostic', () => {
    expect(FINE_PRINT.map((l) => l[0]).join('')).toBe(FINE_PRINT_ANSWER);
  });
  it('mazes are perfect (every cell reachable), deterministic, and place every note', () => {
    const m1 = generateMaze(777);
    const m2 = generateMaze(777);
    expect(JSON.stringify(m1.cells)).toBe(JSON.stringify(m2.cells));
    expect(m1.dist.every((d) => d >= 0)).toBe(true);
    expect(m1.dist[m1.goal[1] * MAZE_N + m1.goal[0]]).toBeGreaterThan(8);
    const g = newGame(5);
    const things = placeThings(g, m1);
    expect(new Set(things.map((t) => `${t.x},${t.y}`)).size).toBe(things.length); // none share a cell
    expect(things.filter((t) => t.know).map((t) => t.know)).toEqual(expect.arrayContaining(['vm_pattern', 'vm_code_hour', 'vm_dad_jokes', 'vm_slot_taped']));
    expect(things.find((t) => t.item === 'token_broken')).toBeTruthy();
  });
  it('the lights puzzle is always solvable by exactly its recorded presses', () => {
    for (let seed = 1; seed < 30; seed++) {
      const g = newGame(seed);
      const { lights, solution } = makeLights(g, seed);
      const L = lights.slice();
      for (const p of solution) toggleLights(L, p, false);
      expect(L.every((x) => !x)).toBe(true);
      expect(lights.some(Boolean)).toBe(true);
    }
  });
});
