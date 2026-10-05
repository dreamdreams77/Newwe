import { describe, expect, it } from 'vitest';
import { ELEVEN_AM } from '../src/config/balance';
import { combine } from '../src/systems/crafting';
import { addItem, hasItem, qty, freshness } from '../src/systems/inventory';
import { approachesOf, prepareCheck, emptyMods, roll, wishReroll, isSuccess, type CheckDef } from '../src/systems/dice';
import { statValue } from '../src/systems/stats';
import { drawCards, syncDeck } from '../src/systems/cards';
import { playCard } from '../src/systems/cardPlay';
import { feedCreature, meetCreature } from '../src/systems/creatures';
import { harvest, ecoState, stockOf, tickEcology } from '../src/systems/ecosystem';
import { updateQuests, questStatus, currentStepIndex } from '../src/systems/quests';
import { QUEST_BY_ID } from '../src/data/quests';
import { gainEleven } from '../src/systems/elevenEleven';
import { runUse } from '../src/systems/itemUse';
import { enterZone } from '../src/systems/travel';
import { passTime } from '../src/systems/actions';
import { newGame, flush } from './helpers';

const CHECK: CheckDef = { id: 't', title: 'Test', stat: 'observation', dc: 10 };

describe('dice', () => {
  it('is deterministic for the same seed', () => {
    const a = newGame(7);
    const b = newGame(7);
    const pa = prepareCheck(a, CHECK, approachesOf(CHECK)[0], emptyMods());
    const pb = prepareCheck(b, CHECK, approachesOf(CHECK)[0], emptyMods());
    expect(roll(a, pa).total).toBe(roll(b, pb).total);
  });
  it('luck raises the average, chaos widens the spread', () => {
    const stats = (luck: number, chaos: number) => {
      const g = newGame(11);
      g.state.stats.luck = luck;
      g.state.stats.chaos = chaos;
      const totals: number[] = [];
      for (let i = 0; i < 1500; i++) {
        const p = prepareCheck(g, CHECK, approachesOf(CHECK)[0], emptyMods());
        totals.push(roll(g, p).total);
      }
      const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
      const sd = Math.sqrt(totals.reduce((a, b) => a + (b - mean) ** 2, 0) / totals.length);
      return { mean, sd };
    };
    const base = stats(0, 0);
    const lucky = stats(9, 0);
    const chaotic = stats(0, 9);
    expect(lucky.mean).toBeGreaterThan(base.mean + 0.4);
    expect(chaotic.sd).toBeGreaterThan(base.sd + 0.5);
    expect(Math.abs(chaotic.mean - base.mean)).toBeLessThan(0.5); // same mean, bigger swings
  });
  it('11:11 only rerolls failures and spends a charge', async () => {
    const g = newGame(3);
    gainEleven(g, 'test');
    g.state.stats.observation = 0;
    const hard: CheckDef = { ...CHECK, dc: 40 };
    const prep = prepareCheck(g, hard, approachesOf(hard)[0], emptyMods());
    const first = roll(g, prep);
    expect(isSuccess(first.outcome)).toBe(false);
    const again = wishReroll(g, prep, first);
    expect(again).not.toBeNull();
    expect(g.state.eleven.charges).toBe(0);
    expect(again!.wished).toBe(true);
    const easy: CheckDef = { ...CHECK, dc: 0 };
    gainEleven(g, 'again');
    const ep = prepareCheck(g, easy, approachesOf(easy)[0], emptyMods());
    const win = roll(g, ep);
    expect(wishReroll(g, ep, win)).toBeNull();
    expect(g.state.eleven.charges).toBe(1);
  });
  it('a crashed player has less Puzzle Sense', () => {
    const g = newGame();
    const before = statValue(g, 'puzzleSense');
    g.state.vitals.coffee = 0;
    expect(statValue(g, 'puzzleSense')).toBe(before - 2);
  });
});

describe('crafting', () => {
  it('mends a token with tape (logical recipe)', () => {
    const g = newGame();
    addItem(g, 'token_broken', 1, { quiet: true });
    addItem(g, 'duct_tape', 1, { quiet: true });
    const r = combine(g, ['duct_tape', 'token_broken']);
    expect(r.kind).toBe('made');
    expect(hasItem(g, 'token_mended')).toBe(true);
    expect(hasItem(g, 'token_broken')).toBe(false);
  });
  it('brews a plain willow brew normally, but The Good Coffee at 11:11', () => {
    const g = newGame();
    addItem(g, 'coffee', 2, { quiet: true });
    addItem(g, 'willow_leaf', 2, { quiet: true });
    g.state.clock.minutes = 14 * 60;
    expect(combine(g, ['coffee', 'willow_leaf']).recipe?.id).toBe('willow_brew');
    g.state.clock.minutes = ELEVEN_AM + 2;
    const r = combine(g, ['coffee', 'willow_leaf']);
    expect(r.recipe?.id).toBe('good_coffee');
    expect(hasItem(g, 'good_coffee')).toBe(true);
  });
  it('does not consume items on a fizzle and never reveals a recipe name', () => {
    const g = newGame();
    addItem(g, 'receipt', 1, { quiet: true });
    addItem(g, 'key', 1, { quiet: true });
    const r = combine(g, ['receipt', 'key']);
    expect(r.kind).toBe('nothing');
    expect(hasItem(g, 'key')).toBe(true);
  });
  it('chaos recipes vary by seed but always yield one of their outcomes', () => {
    const labels = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const g = newGame(seed);
      addItem(g, 'snack_711', 1, { quiet: true });
      addItem(g, 'token_broken', 1, { quiet: true });
      const r = combine(g, ['snack_711', 'token_broken']);
      expect(r.kind).toBe('made');
      labels.add(r.outcome!.label);
    }
    expect(labels.size).toBeGreaterThan(2);
  });
});

describe('cards', () => {
  it('are built from items and consume them when played', async () => {
    const g = newGame();
    addItem(g, 'coffee', 2, { quiet: true });
    syncDeck(g);
    drawCards(g, 5);
    const inst = g.state.cards.hand.find((c) => c.cardId === 'coffee');
    expect(inst).toBeTruthy();
    g.state.vitals.coffee = 1;
    const r = playCard(g, inst!.uid, { mode: 'world' });
    expect(r.ok).toBe(true);
    expect(g.state.vitals.coffee).toBe(5);
    expect(qty(g, 'coffee')).toBe(1);
  });
  it('mods only apply to the right stat', () => {
    const g = newGame();
    addItem(g, 'duct_tape', 1, { quiet: true });
    syncDeck(g);
    drawCards(g, 5);
    const inst = g.state.cards.hand.find((c) => c.cardId === 'tape')!;
    const mods = emptyMods();
    playCard(g, inst.uid, { mode: 'check', stat: 'dadEnergy', mods });
    expect(mods.amount).toBe(4);
  });
  it('refuses to be played in the wrong place', () => {
    const g = newGame();
    addItem(g, 'duct_tape', 1, { quiet: true });
    syncDeck(g);
    drawCards(g, 5);
    const inst = g.state.cards.hand.find((c) => c.cardId === 'tape')!;
    expect(playCard(g, inst.uid, { mode: 'world' }).ok).toBe(false);
  });
});

describe('creatures', () => {
  it('react differently to a snack and the Good Coffee', () => {
    const run = (item: string) => {
      const g = newGame();
      meetCreature(g, 'chocobo');
      addItem(g, item, 1, { quiet: true });
      const before = { ...g.state.creatures.chocobo };
      const r = feedCreature(g, 'chocobo', item);
      return { r, c: g.state.creatures.chocobo, before };
    };
    const snack = run('snack_711');
    const coffee = run('good_coffee');
    expect(snack.c.fullness).toBeGreaterThan(coffee.c.fullness);
    expect(coffee.c.energy).toBeGreaterThan(snack.c.energy);
    expect(coffee.c.learned).toContain('zoomies');
    expect(snack.c.learned).not.toContain('zoomies');
    expect(snack.c.traits.glutton).toBeGreaterThan(0);
  });
  it('does not eat non-food', () => {
    const g = newGame();
    meetCreature(g, 'chocobo');
    addItem(g, 'key', 1, { quiet: true });
    expect(feedCreature(g, 'chocobo', 'key').ok).toBe(false);
    expect(hasItem(g, 'key')).toBe(true);
  });
  it('learns to sniff once it trusts you', () => {
    const g = newGame();
    meetCreature(g, 'chocobo');
    g.state.creatures.chocobo.trust = 19;
    addItem(g, 'yoghurt', 1, { quiet: true });
    feedCreature(g, 'chocobo', 'yoghurt');
    expect(g.state.creatures.chocobo.learned).toContain('sniff');
  });
});

describe('ecosystem', () => {
  it('remembers harvesting, thins out, and regrows with time', () => {
    const g = newGame();
    expect(ecoState(g, 'lake', 'willow')).toBe('lush');
    for (let i = 0; i < 3; i++) harvest(g, 'lake', 'willow');
    expect(ecoState(g, 'lake', 'willow')).toBe('thinning');
    harvest(g, 'lake', 'willow');
    harvest(g, 'lake', 'willow');
    expect(ecoState(g, 'lake', 'willow')).toBe('bare');
    expect(harvest(g, 'lake', 'willow')).toBe(false);
    passTime(g, 1000, { raw: true });
    tickEcology(g);
    expect(stockOf(g, 'lake', 'willow')).toBeGreaterThan(0);
  });
});

describe('quests and progression', () => {
  it('starts, advances and completes a quest from flags alone', async () => {
    const g = newGame();
    g.state.flags.read_E_pete = true;
    updateQuests(g);
    const q = QUEST_BY_ID.q_pedalo;
    expect(questStatus(g, q)).toBe('active');
    expect(currentStepIndex(g, q)).toBe(0);
    addItem(g, 'swan_ticket', 1, { quiet: true });
    g.state.flags.visited_lake = true;
    g.state.flags.boat_ridden = true;
    g.state.flags.lake_solved = true;
    updateQuests(g);
    expect(questStatus(g, q)).toBe('done');
  });
  it('eating the yoghurt fails its quest into a different story, without a softlock', async () => {
    const g = newGame();
    addItem(g, 'yoghurt', 1, { quiet: true });
    await flush();
    updateQuests(g);
    expect(questStatus(g, QUEST_BY_ID.q_yoghurt)).toBe('active');
    await runUse(g, 'yoghurt', 'eat');
    updateQuests(g);
    expect(questStatus(g, QUEST_BY_ID.q_yoghurt)).toBe('failed');
    expect(g.state.cards.earned).toContain('regret');
    expect(hasItem(g, 'yoghurt')).toBe(false);
  });
  it('first visit to a zone pays visitors; returning home is cooldown-limited', () => {
    const g = newGame();
    const v0 = g.state.visitors;
    enterZone(g, 'guestbook');
    expect(g.state.visitors).toBeGreaterThan(v0);
    const v1 = g.state.visitors;
    enterZone(g, 'guestbook');
    expect(g.state.visitors).toBe(v1);
    enterZone(g, 'home');
    const v2 = g.state.visitors;
    enterZone(g, 'guestbook');
    enterZone(g, 'home');
    expect(g.state.visitors).toBe(v2);
  });
  it('yoghurt ages in game time', () => {
    const g = newGame();
    addItem(g, 'yoghurt', 1, { quiet: true });
    expect(freshness(g, 'yoghurt')).toBe('fresh');
    passTime(g, 800, { raw: true });
    expect(freshness(g, 'yoghurt')).toBe('sentient');
  });
});
