import type { Game } from '../core/game';
import type { Cond, Effect } from '../core/types';
import type { CheckDef } from '../systems/dice';

export interface DChoice {
  text: string | ((g: Game) => string);
  when?: Cond;
  next?: string;
  effects?: Effect[];
  end?: boolean;
  /** roll before moving on; `ok` / `fail` are node ids */
  check?: { def: CheckDef; ok: string; fail: string };
  /** hide this choice once this flag is set */
  once?: string;
  /** arbitrary game logic (hand over an item, etc.) */
  action?: (g: Game) => void;
  /** a choice that is shown but greyed out, with a reason */
  lockedReason?: (g: Game) => string | null;
}

export interface DNode {
  id: string;
  who: string;
  portrait?: string;
  text: string | ((g: Game) => string);
  choices?: DChoice[];
  next?: string;
  effects?: Effect[];
  end?: boolean;
  run?: (g: Game) => void;
}

export interface DTree {
  id: string;
  start: string | ((g: Game) => string);
  nodes: Record<string, DNode>;
}
