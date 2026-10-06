import type { Game } from '../core/game';

// Old-school awards. No achievement pop-ups: a badge simply appears on your page.
// Hidden badges are not even listed until you earn them.

export interface BadgeDef {
  id: string;
  title: string;
  text: string;
  hidden: boolean;
  colour: string;
  check: (g: Game) => boolean;
}

const f = (k: string) => (g: Game) => g.has(k);

export const BADGES: BadgeDef[] = [
  { id: 'source', title: 'I READ THE SOURCE', text: 'You looked at the page behind the page.', hidden: false, colour: '#26c', check: f('source_read') },
  { id: 'inspector', title: 'THE INSPECTOR IS IN', text: 'You found the debug view.', hidden: true, colour: '#2a6', check: f('inspector_on') },
  { id: 'place', title: '404 IS A PLACE', text: 'The missing page was an address.', hidden: false, colour: '#a52', check: f('e404_open') },
  { id: 'clicked', title: "YOU WEREN'T SUPPOSED TO CLICK THAT", text: 'You poked something until it gave in.', hidden: true, colour: '#c24', check: f('poke_payoff') },
  { id: 'why', title: 'WHY WOULD YOU DO THAT', text: 'You ate the yoghurt.', hidden: true, colour: '#a4f', check: f('ate_yoghurt') },
  { id: 'first', title: 'FIRST TRY', text: 'You judged the machine on the first attempt.', hidden: true, colour: '#d90', check: (g) => !!g.state.encounters.vm1111?.won && g.state.encounters.vm1111.attempts === 1 },
  { id: 'thirty', title: '30 LIVES', text: 'You knew the code.', hidden: true, colour: '#e82', check: f('konami') },
  { id: 'remembered', title: 'IT REMEMBERS NOW', text: 'You helped the Broken Homepage remember itself.', hidden: true, colour: '#f6c', check: f('bh_defeated') },
  { id: 'v1111', title: 'VISITOR #1111', text: 'The counter reached the number.', hidden: false, colour: '#a4f', check: f('hits_1111') },
  { id: 'links', title: 'ALL LINKS LEAD SOMEWHERE', text: 'You went everywhere there is a link to.', hidden: true, colour: '#2a6', check: (g) => ['guestbook', 'construction', 'lake', 'lighthouse', 'e404', 'dungeon'].every((z) => g.has(`visited_${z}`)) },
  { id: 'remembers', title: 'THE WEBSITE REMEMBERS', text: 'You stripped something bare and the world noticed.', hidden: true, colour: '#c24', check: (g) => (g.state.zones.lake?.taken.willow ?? 0) >= 5 },
  { id: 'shouldnt', title: "THAT SHOULDN'T HAVE WORKED", text: 'You found a way in that was not a door.', hidden: true, colour: '#e60', check: f('bug_found') },
  { id: 'eyes', title: 'TWO ONES', text: 'Snake eyes. Even disasters are wishes.', hidden: true, colour: '#555', check: f('snake_eyes_seen') },
  { id: 'dev', title: 'WORKS ON MY MACHINE', text: 'You found the developer room.', hidden: true, colour: '#066', check: f('dev_open') },
  { id: 'coffee', title: 'THE GOOD COFFEE', text: 'You brewed it at the right minute.', hidden: false, colour: '#a52', check: f('good_coffee_brewed') },
  { id: 'understand', title: 'I UNDERSTAND NOW', text: 'You fully understood five things about how this place works.', hidden: true, colour: '#2a6', check: (g) => Object.values(g.state.inspector.tiers).filter((t) => t >= 2).length >= 5 },
];
