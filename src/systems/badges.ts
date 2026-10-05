import type { Game } from '../core/game';
import { BADGES } from '../data/badges';

export function awardBadges(g: Game): void {
  for (const b of BADGES) {
    if (g.state.badges.includes(b.id)) continue;
    if (!b.check(g)) continue;
    g.state.badges.push(b.id);
    g.reveal('badges');
    g.toast(`A BADGE APPEARS on your page: ${b.title}`, 'magic');
    g.sfx('questDone');
    g.log(`Badge: ${b.title}.`);
    g.changed();
  }
}
