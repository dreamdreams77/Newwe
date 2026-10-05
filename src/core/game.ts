import { BALANCE } from '../config/balance';
import { EventBus } from './eventBus';
import { Random } from './random';
import type { FlagValue, GameState, StatId, ToastKind, ZoneState } from './types';

export const SAVE_VERSION = 1;

export function createInitialState(seed = Date.now() >>> 0): GameState {
  return {
    version: SAVE_VERSION,
    seed,
    rng: seed >>> 0,
    clock: { minutes: BALANCE.time.startMinutes, lastReturnHit: -9999 },
    vitals: {
      hp: BALANCE.vitals.hp,
      hpMax: BALANCE.vitals.hp,
      coffee: BALANCE.vitals.coffee,
      coffeeMax: BALANCE.vitals.coffeeMax,
    },
    stats: { ...BALANCE.stats.start } as Record<StatId, number>,
    buffs: [],
    eleven: { charges: 0, max: BALANCE.eleven.maxCharges, gained: 0, spent: 0, seen: [] },
    visitors: BALANCE.hits.start,
    stage: 1,
    zone: 'home',
    inventory: {},
    cards: { earned: ['shrug'], draw: [], hand: [], discard: [], nextUid: 1 },
    recipes: { discovered: [], attempts: 0, chaosSeen: [] },
    flags: {},
    quests: {},
    knowledge: [],
    memories: [],
    guestbook: { read: [], taken: [], pinned: [], signed: null },
    creatures: {},
    activeCreature: null,
    zones: {},
    puzzles: {},
    encounters: {},
    myPage: { wallpaper: 'stars', slots: Array(8).fill(null), title: 'My Page!!' },
    ui: { revealed: {}, seenTutorial: {} },
    settings: {
      muted: false,
      volume: 0.5,
      music: false,
      reducedMotion: false,
      textScale: 1,
      showHotspots: false,
      sparkleCursor: false,
    },
    log: [],
    counters: { actions: 0, checks: 0, crits: 0, fumbles: 0, crafts: 0 },
    inspector: { level: 0, tiers: {}, probes: 0 },
    badges: [],
    handbook: [],
    createdAt: Date.now(),
  };
}

export function emptyZone(): ZoneState {
  return { visits: 0, firstVisitAt: null, stock: {}, taken: {}, lastRegrowAt: 0, found: [] };
}

/**
 * The Game owns state, rng and the event bus. Systems are plain functions
 * that take a Game, which keeps them testable without any DOM.
 */
export class Game {
  state: GameState;
  readonly bus = new EventBus();
  readonly rng: Random;
  /** set by the save system so mutations trigger autosave */
  onChanged?: () => void;
  private queued = false;

  constructor(state?: GameState, seed?: number) {
    this.state = state ?? createInitialState(seed);
    this.rng = new Random(this.state.rng);
  }

  /** replace the whole state (load / import) */
  replace(state: GameState): void {
    this.state = state;
    this.rng.state = state.rng;
    this.changed();
  }

  /** mutate state and notify listeners (batched to a microtask) */
  mutate(fn?: (s: GameState) => void): void {
    fn?.(this.state);
    this.changed();
  }

  changed(): void {
    this.state.rng = this.rng.state;
    if (this.queued) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      this.bus.emit('change');
      this.bus.emit('world');
      this.onChanged?.();
    });
  }

  zone(id: string): ZoneState {
    const z = this.state.zones[id] ?? (this.state.zones[id] = emptyZone());
    return z;
  }

  flag(key: string): FlagValue | undefined {
    return this.state.flags[key];
  }
  has(key: string): boolean {
    const v = this.state.flags[key];
    return v !== undefined && v !== false && v !== 0 && v !== '';
  }
  setFlag(key: string, value: FlagValue = true): void {
    this.state.flags[key] = value;
    this.changed();
  }

  toast(text: string, kind: ToastKind = 'info'): void {
    this.bus.emit('toast', { text, kind });
  }
  sfx(name: string): void {
    this.bus.emit('sfx', { name });
  }
  log(text: string): void {
    this.state.log.push({ at: this.state.clock.minutes, text });
    if (this.state.log.length > 200) this.state.log.shift();
    this.bus.emit('log', { text });
  }
  reveal(key: string): void {
    if (!this.state.ui.revealed[key]) {
      this.state.ui.revealed[key] = true;
      this.changed();
    }
  }
}
