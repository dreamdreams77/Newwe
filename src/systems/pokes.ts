import type { Game } from '../core/game';
import { POKES } from '../data/pokes';
import { applyEffects } from './effects';

/** Click something repeatedly and it answers differently each time. Some of them pay off, once. */
export function poke(g: Game, id: string): string {
  const def = POKES[id];
  if (!def) return '';
  const key = `poke_${id}`;
  const n = ((g.state.flags[key] as number | undefined) ?? 0) + 1;
  g.state.flags[key] = n;
  const at = def.payoff ? (g.has('ng') && id === 'chair' ? 3 : def.payoff.at) : 0;
  if (def.payoff && n === at) {
    g.state.flags.poke_payoff = true;
    g.state.flags[`${key}_done`] = true;
    g.toast('You were not supposed to click that.', 'magic');
    g.sfx('eleven');
    applyEffects(g, def.payoff.effects);
    g.changed();
    return def.payoff.text;
  }
  g.changed();
  return def.lines[Math.min(n - 1, def.lines.length - 1)];
}
