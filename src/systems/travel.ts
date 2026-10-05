import { BALANCE } from '../config/balance';
import type { Game } from '../core/game';
import type { ZoneId } from '../core/types';
import { passTime } from './actions';
import { ensureHand, earnCard } from './cards';
import { addVisitors, homeReturnBump } from './hits';

export interface EnterOpts {
  free?: boolean; // no time cost (fast travel, load)
  silent?: boolean;
}

/** Move the player to a zone: costs a few minutes, pays first-visit rewards, deals a hand. */
export function enterZone(g: Game, zone: ZoneId, opts: EnterOpts = {}): void {
  const s = g.state;
  const from = s.zone;
  s.zone = zone;
  const z = g.zone(zone);
  const first = z.visits === 0;
  z.visits++;
  if (first) z.firstVisitAt = s.clock.minutes;
  s.flags[`visited_${zone}`] = true;
  if (!opts.free && from !== zone) passTime(g, BALANCE.time.cost.travel);
  if (first) {
    const hits = BALANCE.hits.firstVisit[zone];
    if (hits) addVisitors(g, hits, `first visit: ${zone}`);
    if (zone === 'lake') earnCard(g, 'loc_lake');
  }
  if (zone === 'home' && from !== 'home') homeReturnBump(g);
  ensureHand(g, 3);
  g.bus.emit('zone', { zone });
  g.changed();
}

/** HP hit zero. Nothing is lost for good; you just wake up on the homepage, a bit embarrassed. */
export function blueScreen(g: Game): string {
  const s = g.state;
  s.vitals.hp = Math.max(1, Math.round(s.vitals.hpMax * BALANCE.hp.blueScreenHpFraction));
  passTime(g, BALANCE.hp.blueScreenMinutes, { raw: true });
  s.flags.blue_screened = ((s.flags.blue_screened as number) || 0) + 1;
  s.zone = 'home';
  g.sfx('error');
  g.log('Blue-screened. Woke up on the homepage.');
  g.changed();
  return 'A BLUE SCREEN. A tiny polite tone. You wake up on the homepage with a headache and half your HP. (Nothing is lost. The page is just embarrassed for you.)';
}

export function restAtHome(g: Game): void {
  const s = g.state;
  passTime(g, BALANCE.time.cost.rest, { raw: true });
  s.vitals.hp = Math.min(s.vitals.hpMax, s.vitals.hp + BALANCE.hp.regenPerHourResting);
  g.changed();
}

