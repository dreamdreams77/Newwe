import { game } from '../core/runtime';
import { BALANCE } from '../config/balance';
import { GUS, GUS_GIFT } from '../data/dialogue';
import { timeOfDay } from '../core/timeSystem';
import { ecoRule, ecoState, harvest, stockOf } from '../systems/ecosystem';
import { addItem, hasItem } from '../systems/inventory';
import { activeCreature, feedCreature, meetCreature, reactionFor, species } from '../systems/creatures';
import { removeItem } from '../systems/inventory';
import { passTime } from '../systems/actions';
import { changeVital } from '../systems/stats';
import { isSuccess, type CheckDef } from '../systems/dice';
import { runDialogue } from '../ui/dialogue';
import { openCheck } from '../ui/dice';
import { openLilyChime } from '../ui/puzzle/lilyChime';
import { h, btn } from '../ui/dom';
import { toast } from '../ui/notifications';
import { navigate, registerZone, refreshView } from '../ui/router';
import { scene } from '../ui/scene';
import { paintLake } from '../ui/scenes';
import { openWindow } from '../ui/windows';
import { SPECIES } from '../data/creatures';
import { icon } from '../ui/sprites';
import { footer, pageHeader, ringBar } from './pageKit';
import { audio } from '../audio/audioManager';
import { sniffAround } from './sniff';
import { canSniff } from '../systems/creatures';

const REEDS: CheckDef = {
  id: 'reeds',
  title: 'Something is peeping in the reeds',
  stat: 'observation',
  dc: 9,
  text: 'The reeds are rustling in a way reeds do not. There is a sound like a very small, very determined kettle.',
  approaches: [
    { id: 'look', label: 'Part the reeds and look carefully', stat: 'observation', text: 'Reeds are good at hiding things. You are better at noticing them.' },
    { id: 'wait', label: 'Sit still and let it come to you', stat: 'nurture', dcMod: -1, text: 'Small things trust patient people.' },
  ],
};

const TAME: CheckDef = {
  id: 'tame',
  title: 'Befriend the tiny thing',
  stat: 'nurture',
  dc: 9,
  text: 'It is yellow. It is the size of a fist. It is looking at you the way a very small person looks at a very large door.',
  approaches: [
    { id: 'gentle', label: 'Hold out your hand and wait', stat: 'nurture', text: 'Slowly. Do not blink at it aggressively.' },
    { id: 'bold', label: 'Introduce yourself with great confidence', stat: 'courage', dcMod: 1, text: 'It respects confidence. It also respects snacks.' },
    { id: 'dad', label: 'Make a dad joke at it', stat: 'dadEnergy', dcMod: 1, text: 'It does not understand the joke. It understands the energy.' },
  ],
};

async function talkGus(): Promise<void> {
  const g = game();
  await runDialogue(GUS);
  if (g.has('ride_requested')) {
    g.state.flags.ride_requested = false;
    await rideSwan();
  }
  refreshView();
}

/** the swan boat: spend the ticket, pedal out, and the pads start to listen */
async function rideSwan(): Promise<void> {
  const g = game();
  if (!g.has('boat_ridden')) {
    if (!hasItem(g, 'swan_ticket')) {
      toast('You need a ticket to ride. Gus is very firm about it.', 'info');
      return;
    }
    g.state.flags.boat_ridden = true;
    changeVital(g, 'coffee', -1);
    passTime(g, 12);
    audio.sfx('step');
    await new Promise<void>((resolve) => {
      openWindow({
        id: 'ride',
        title: 'Pedalling…',
        icon: 'swan',
        modal: true,
        closable: false,
        className: 'alert',
        render: (b, w) =>
          b.append(
            h('p', {}, 'You pedal. The swan creaks. The ticket is punched with a hole shaped, unreasonably, like a tiny swan. Behind you the dock gets small and Gus gets smaller.'),
            h('p', {}, 'The swan stops by itself in the middle of the pond, among four lily pads. The water is very quiet.'),
            h('div', { class: 'win-actions' }, btn('Look at the pads', () => (w.close(), resolve()), 'go', { attrs: { 'data-autofocus': '' } })),
          ),
      });
    });
  }
  await playPads();
}

async function playPads(): Promise<void> {
  const g = game();
  if (!g.has('boat_ridden')) {
    toast('The pads are shy. They will not sing for someone standing on the shore.', 'funny');
    return;
  }
  if (g.has('lake_solved')) {
    toast('The pads hum the last note, just for you, and are quiet again.', 'funny');
    return;
  }
  const solved = await openLilyChime();
  if (solved) {
    await runDialogue(GUS_GIFT);
  }
  refreshView();
}

async function harvestWillow(): Promise<void> {
  const g = game();
  const st = ecoState(g, 'lake', 'willow');
  if (!harvest(g, 'lake', 'willow')) {
    toast('The willow is bare. You are standing in front of a tree that has been bullied out of its leaves. It is not going to give you any more.', 'bad');
    return;
  }
  addItem(g, 'willow_leaf', 1);
  passTime(g, 3);
  const left = stockOf(g, 'lake', 'willow');
  const rule = ecoRule('lake', 'willow')!;
  toast(left <= 0 ? 'You pick the last leaf. The willow droops. You feel you have done something.' : left <= 2 ? 'The willow is thinner now. It does not say anything. It does not have to.' : st === 'lush' ? 'You pick a long silver leaf. The willow barely notices.' : 'Another leaf.', left <= 2 ? 'bad' : 'item');
  void rule;
  refreshView();
}

async function tendWillow(): Promise<void> {
  const g = game();
  const eco = ecoRule('lake', 'willow')!;
  if (stockOf(g, 'lake', 'willow') >= eco.max) return void toast('The willow is doing fine. It does not need a talking-to.', 'info');
  // nurture check: tending helps it regrow
  const out = await openCheck({
    id: 'tend', title: 'Tend the willow', stat: 'nurture', dc: 8,
    text: 'You could water it with pond water and say nice things. It is a tree. It might help.',
  });
  if (!out) return;
  if (isSuccess(out.result.outcome)) {
    g.zone('lake').stock.willow = Math.min(eco.max, stockOf(g, 'lake', 'willow') + (out.result.outcome === 'crit' ? 2 : 1));
    toast('New leaves, or the idea of them. The willow stands a little straighter.', 'good');
  } else toast('You mutter at a tree. It remains a tree.', 'funny');
  g.changed();
  refreshView();
}

async function reeds(): Promise<void> {
  const g = game();
  if (g.state.creatures.chocobo?.met) {
    const pet = activeCreature(g)!;
    toast(`${pet.name}'s old hiding place. It peeps at you from your shoulder, smugly.`, 'funny');
    return;
  }
  if (!g.has('chocobo_noticed')) {
    const out = await openCheck(REEDS);
    if (!out) return;
    if (!isSuccess(out.result.outcome)) {
      toast('Reeds. Many reeds. A suspicious number. You could try again with a clearer head.', 'info');
      return;
    }
    g.state.flags.chocobo_noticed = true;
    toast('A tiny yellow face. A tiny orange beak. It peeps once, with enormous dignity, and does not run.', 'magic');
    g.changed();
  }
  // befriend: foods help a lot
  await befriend();
  refreshView();
}

async function befriend(): Promise<void> {
  const g = game();
  const sp = SPECIES.chocobo;
  const foods = Object.keys(g.state.inventory).filter((id) => reactionFor(sp, id) !== sp.confused);
  let bonus = 0;
  let offered: string | null = null;
  if (foods.length) {
    offered = await new Promise<string | null>((resolve) => {
      openWindow({
        id: 'offer',
        title: 'It is watching your pockets',
        icon: 'chocobo',
        modal: true,
        closable: false,
        className: 'alert',
        render: (b, w) =>
          b.append(
            h('p', {}, 'It is not subtle. It has noticed that you may be carrying food.'),
            h('div', { class: 'feed-list' }, foods.map((id) => btn([icon(g.state.inventory[id] ? (id === 'snack_711' ? 'snack' : id === 'willow_leaf' ? 'leaf' : id === 'yoghurt' ? 'yoghurt' : id === 'coffee' ? 'coffee' : id === 'good_coffee' ? 'goodcoffee' : 'brew') : 'star', 20), ` Offer ${id.replace(/_/g, ' ')}`], () => (w.close(), resolve(id)), 'small'))),
            h('div', { class: 'win-actions' }, btn('Offer nothing', () => (w.close(), resolve(null)), 'small')),
          ),
      });
    });
    if (offered) bonus = 2;
  }
  const def: CheckDef = { ...TAME, dc: TAME.dc - bonus };
  const out = await openCheck(def, { intro: offered ? `You hold out a ${offered.replace(/_/g, ' ')}. It leans in. This helps.` : undefined });
  if (!out) return;
  if (isSuccess(out.result.outcome)) {
    const c = meetCreature(g, 'chocobo');
    if (offered && hasItem(g, offered)) {
      const res = feedCreature(g, 'chocobo', offered);
      toast(res.text, 'funny');
    }
    g.state.flags.creature_met = true;
    audio.sfx('chirp');
    toast(`It climbs onto your hand. It is yours now, or you are its. You name it ${c.name}.`, 'magic');
    g.changed();
  } else {
    toast(out.result.outcome === 'critFail' ? 'It bites your thumb, then looks mortified. It runs into the reeds.' : 'It watches you for a long, long moment. Not yet. Try again with something it likes.', 'info');
  }
}

function render(): HTMLElement {
  const g = game();
  const tod = timeOfDay(g.state.clock.minutes);
  const stock = stockOf(g, 'lake', 'willow');
  const eco = ecoRule('lake', 'willow')!;
  const state = ecoState(g, 'lake', 'willow');
  const peeping = g.has('chocobo_noticed') && !g.state.creatures.chocobo?.met;
  const pet = activeCreature(g);
  const boatOut = g.has('boat_ridden');
  const sc = scene({
    zone: 'lake',
    width: 320,
    height: 180,
    className: `lake-scene willow-${state}`,
    paint: (ctx, w, hh) => paintLake(ctx, w, hh, tod, stock, eco.max, peeping, boatOut),
    caption: `A pond at ${tod}. A willow on the left, a ticket booth and dock on the right, four lily pads in the middle, and reeds in the corner.`,
    hotspots: [
      { id: 'willow', label: 'The willow', x: 4, y: 28, w: 26, h: 52, onClick: harvestWillow, hint: `Pick a leaf. It is ${state}.` },
      { id: 'tend', label: 'Tend the willow', x: 30, y: 62, w: 8, h: 14, onClick: tendWillow, hint: 'Look after it.' },
      { id: 'gus', label: 'Gus, Swan-Boat Clerk', x: 82, y: 46, w: 9, h: 18, kind: 'npc', onClick: talkGus, hint: 'Takes tickets very seriously.', onItem: (item) => {
          if (item !== 'swan_ticket') return false;
          void (async () => {
            g.state.flags.ride_pending = true;
            await runDialogue(GUS);
            g.state.flags.ride_pending = false;
            if (g.has('ride_requested')) {
              g.state.flags.ride_requested = false;
              await rideSwan();
            }
            refreshView();
          })();
          return true;
        } },
      { id: 'boat', label: boatOut ? 'The swan boat' : 'The swan boat (needs a ticket)', x: 72, y: 66, w: 14, h: 16, onClick: () => (g.has('boat_ridden') ? rideSwan() : toast('The swan boat needs a ticket. Gus guards it like a dragon with a name tag.', 'info')), onItem: (item) => { if (item === 'swan_ticket') { void rideSwan().then(refreshView); return true; } return false; } },
      { id: 'pads', label: 'The lily pads', x: 41, y: 56, w: 28, h: 26, onClick: playPads, hint: 'Shy.' },
      { id: 'reeds', label: g.state.creatures.chocobo?.met ? 'The reeds' : 'The reeds (rustling)', x: 2, y: 70, w: 22, h: 28, onClick: reeds, hint: 'Something is in there.',
        onItem: (item) => { if (!g.state.creatures.chocobo?.met && reactionFor(species('chocobo'), item) !== species('chocobo').confused) { void reeds(); return false; } return false; } },
    ],
  });
  const lines: HTMLElement[] = [];
  if (state === 'bare') lines.push(h('p', { class: 'willow-line willow-bare' }, 'The willow is bare. Its leaves are in your pockets and, probably, on your conscience.'));
  else if (state === 'thinning') lines.push(h('p', { class: 'willow-line' }, 'The willow is thinning out. It looks like a person who has been asked for a favour too many times.'));
  const petRow = pet && canSniff(pet) ? btn(`${pet.name}, go sniff around`, () => (sniffAround(), refreshView()), 'small') : null;
  return h(
    'div',
    { class: 'page lake-page' },
    pageHeader("~ Swanny's Pond Fan Page ~", 'swans, tickets, and the occasional mystery. est. 2002.'),
    sc,
    ...lines,
    h('p', { class: 'scene-text' }, g.has('boat_ridden') ? 'The swan boat bobs by the dock. The pads sit out in the middle, waiting to be asked.' : 'A willow on one side. A ticket booth on the other. In the middle: four lily pads, and the feeling of being waited for.'),
    petRow ? h('div', { class: 'back-link' }, petRow) : '',
    h('div', { class: 'back-link' }, btn('◄ Back to the homepage', () => navigate('home'), 'small')),
    ringBar('lake'),
    footer(),
  );
}

registerZone({ id: 'lake', render });
void BALANCE;
void removeItem;
