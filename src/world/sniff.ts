import { BALANCE } from '../config/balance';
import { game } from '../core/runtime';
import { SNIFFS } from '../data/zones';
import { addVisitors } from '../systems/hits';
import { addItem } from '../systems/inventory';
import { canSniff, activeCreature, spendCreatureEnergy, species } from '../systems/creatures';
import { test } from '../systems/conditions';
import { passTime } from '../systems/actions';
import { toast } from '../ui/notifications';

/** Let the active creature dig around the current zone. Each find happens once. */
export function sniffAround(): boolean {
  const g = game();
  const pet = activeCreature(g);
  if (!pet) {
    toast('You do not have a companion yet.', 'info');
    return false;
  }
  if (!canSniff(pet)) {
    toast(`${pet.name} ${pet.energy < BALANCE.creature.sniffEnergy ? 'is too tired to sniff around.' : 'does not trust you enough yet to go exploring.'}`, 'info');
    return false;
  }
  const zone = g.state.zone;
  const z = g.zone(zone);
  const next = (SNIFFS[zone] ?? []).find((f) => !z.found.includes(f.id) && test(g, f.when));
  spendCreatureEnergy(g, pet.id, BALANCE.creature.sniffEnergy);
  passTime(g, 8);
  g.sfx('chirp');
  if (!next) {
    toast(`${pet.name} snuffles around for a while and finds nothing. It looks personally offended by the lack of things.`, 'funny');
    g.changed();
    return true;
  }
  z.found.push(next.id);
  toast(next.text, 'funny');
  if (next.item) addItem(g, next.item, 1);
  if (next.hits) addVisitors(g, next.hits, 'found by a creature');
  void species(pet.species);
  g.changed();
  return true;
}
