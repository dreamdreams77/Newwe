import { BALANCE } from '../config/balance';
import type { Game } from '../core/game';
import { advance } from '../core/timeSystem';
import { tickCreatures } from './creatures';
import { tickEcology } from './ecosystem';
import { changeVital } from './stats';

export type CostKind = keyof typeof BALANCE.time.cost;

/** Pass time and let the world react: creatures get hungry, willows regrow. */
export function passTime(g: Game, minutes: number, opts: { raw?: boolean } = {}): number {
  const spent = advance(g, minutes, opts);
  if (spent > 0) {
    tickCreatures(g, spent);
    tickEcology(g);
  }
  return spent;
}

/** Standard action cost: some minutes, optionally some coffee. */
export function act(g: Game, kind: CostKind, coffee = 0): void {
  g.state.counters.actions++;
  if (coffee) changeVital(g, 'coffee', -coffee);
  passTime(g, BALANCE.time.cost[kind]);
}
