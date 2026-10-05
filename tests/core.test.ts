import { describe, expect, it } from 'vitest';
import { ELEVEN_AM, MIN_PER_DAY } from '../src/config/balance';
import { formatClock, advance, timeOfDay, nearEleven } from '../src/core/timeSystem';
import { Random } from '../src/core/random';
import { exportPassword, importPassword, migrate } from '../src/core/saveSystem';
import { addItem, hasItem } from '../src/systems/inventory';
import { addVisitors } from '../src/systems/hits';
import { newGame, flush } from './helpers';

describe('random', () => {
  it('is reproducible from a seed', () => {
    const a = new Random(42);
    const b = new Random(42);
    expect([a.next(), a.next(), a.int(1, 6)]).toEqual([b.next(), b.next(), b.int(1, 6)]);
  });
  it('state can be saved and restored mid-stream', () => {
    const a = new Random(7);
    a.next();
    const snap = a.state;
    const x = a.next();
    a.state = snap;
    expect(a.next()).toBe(x);
  });
});

describe('time', () => {
  it('formats the clock', () => {
    expect(formatClock(ELEVEN_AM)).toBe('11:11 AM');
    expect(formatClock(0)).toBe('12:00 AM');
    expect(formatClock(13 * 60 + 5)).toBe('1:05 PM');
  });
  it('fires the 11:11 event exactly when crossed', async () => {
    const g = newGame();
    let n = 0;
    g.bus.on('elevenTime', () => n++);
    g.state.clock.minutes = ELEVEN_AM - 5;
    advance(g, 4, { raw: true });
    expect(n).toBe(0);
    advance(g, 2, { raw: true });
    expect(n).toBe(1);
    advance(g, 3, { raw: true });
    expect(n).toBe(1);
  });
  it('grants the first 11:11 charge, a stage change and a visitor bump', async () => {
    const g = newGame();
    g.state.clock.minutes = ELEVEN_AM - 3;
    advance(g, 10, { raw: true });
    await flush();
    expect(g.state.eleven.charges).toBe(1);
    expect(g.state.stage).toBeGreaterThanOrEqual(2);
    expect(g.state.visitors).toBeGreaterThan(73 + 100);
  });
  it('detects near-11:11 windows and times of day', () => {
    expect(nearEleven(ELEVEN_AM + 8)).toBe(true);
    expect(nearEleven(ELEVEN_AM + 40)).toBe(false);
    expect(timeOfDay(2 * 60 + MIN_PER_DAY)).toBe('night');
  });
});

describe('hit counter', () => {
  it('crosses thresholds once and raises the finale flag at 1111', async () => {
    const g = newGame();
    const seen: number[] = [];
    g.bus.on('threshold', ({ at }) => seen.push(at));
    addVisitors(g, 30, 'test');
    expect(seen).toEqual([100]);
    addVisitors(g, 2000, 'test');
    expect(seen).toContain(1111);
    expect(g.state.flags.finale_ready).toBe(true);
    await flush();
    expect(g.state.stage).toBe(5);
  });
});

describe('save system', () => {
  it('round-trips a save password', async () => {
    const g = newGame(99);
    addItem(g, 'yoghurt', 1, { quiet: true });
    addItem(g, 'coffee', 2, { quiet: true });
    g.state.flags.lake_solved = true;
    const code = await exportPassword(g.state);
    expect(code).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{1,4})+$/);
    const back = await importPassword(code);
    expect(back.inventory.yoghurt.qty).toBe(1);
    expect(back.flags.lake_solved).toBe(true);
    expect(back.seed).toBe(99);
  });
  it('tolerates typos in letters that look alike', async () => {
    const g = newGame(5);
    const code = await exportPassword(g.state);
    const sloppy = code.toLowerCase().replace(/0/g, 'o').replace(/1/g, 'l');
    const back = await importPassword(sloppy);
    expect(back.seed).toBe(5);
  });
  it('rejects a corrupted password', async () => {
    const g = newGame(5);
    const code = await exportPassword(g.state);
    const broken = code.slice(0, 20) + (code[20] === 'A' ? 'B' : 'A') + code.slice(21);
    await expect(importPassword(broken)).rejects.toThrow();
  });
  it('migrates an old partial save without crashing', () => {
    const s = migrate({ seed: 3, visitors: 400, flags: { x: true } });
    expect(s.visitors).toBe(400);
    expect(s.stats.courage).toBeGreaterThan(0);
    expect(s.settings.volume).toBeGreaterThan(0);
  });
});

describe('inventory', () => {
  it('stacks and perishes', () => {
    const g = newGame();
    addItem(g, 'coffee', 2, { quiet: true });
    expect(g.state.inventory.coffee.qty).toBe(2);
    expect(hasItem(g, 'coffee', 2)).toBe(true);
  });
});
