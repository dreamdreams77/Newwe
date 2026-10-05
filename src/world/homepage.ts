import { BALANCE } from '../config/balance';
import { game } from '../core/runtime';
import { formatClock } from '../core/timeSystem';
import { OWNER } from '../data/personal';
import { WEBRING } from '../data/zones';
import { test } from '../systems/conditions';
import { addItem } from '../systems/inventory';
import { changeVital } from '../systems/stats';
import { restAtHome } from '../systems/travel';
import { passTime } from '../systems/actions';
import { activeCreature, creatureMoodText } from '../systems/creatures';
import { unreadCount } from '../systems/guestbook';
import { audio } from '../audio/audioManager';
import { h, btn } from '../ui/dom';
import { toast } from '../ui/notifications';
import { navigate, registerZone, refreshView } from '../ui/router';
import { icon } from '../ui/sprites';
import { spotButtons, squintTools } from '../ui/scene';
import { badge88, footer, funnyToast, marquee, odometer, pageHeader, ringBar } from './pageKit';

const COUNTER_LINES = [
  'VISITORS SINCE MARCH 2001. (Some of them are not what you would call visitors.)',
  'The counter ticks. You did not click it. You think.',
  'Somebody is visiting this website. You have been wondering who.',
  'It counts people. It also, you suspect, counts other things.',
];

function sipMug(): void {
  const g = game();
  const last = (g.state.flags.mug_last as number | undefined) ?? -9999;
  const now = g.state.clock.minutes;
  if (!g.has('mug_first')) {
    g.state.flags.mug_first = true;
    g.state.flags.mug_last = now;
    changeVital(g, 'coffee', 2);
    addItem(g, 'coffee', 1);
    toast("The webmaster's mug is still warm. (It is not.) You pour a cup and keep a spare.", 'item');
    audio.sfx('pickup');
    passTime(g, 3);
    return;
  }
  if (now - last < BALANCE.coffee.mugCooldownMinutes) {
    const wait = BALANCE.coffee.mugCooldownMinutes - (now - last);
    toast(`The mug is empty. It refills slowly, like hope. About ${wait} minutes.`, 'info');
    return;
  }
  g.state.flags.mug_last = now;
  const got = changeVital(g, 'coffee', BALANCE.coffee.mugRefill);
  toast(got > 0 ? 'You sip the webmaster’s coffee. It is the right temperature. It is always the right temperature.' : 'You are already full of coffee. The mug understands.', 'good');
  audio.sfx('pickup');
  passTime(g, 4);
}

function newsItems(): Array<{ date: string; text: string; cls?: string }> {
  const g = game();
  const s = g.state;
  const items: Array<{ date: string; text: string; cls?: string }> = [];
  if (s.stage >= 5) items.push({ date: 'NOW', text: 'THE PAGE IS RENDERING ITSELF.', cls: 'glitchy' });
  if (s.stage >= 4) {
    const pet = activeCreature(g);
    items.push({ date: formatClock(s.clock.minutes), text: pet ? `${pet.name} is ${pet.mood > 60 ? 'delighted' : pet.mood > 30 ? 'fine' : 'sulking'} today. ${creatureMoodText(g, pet)}` : 'The page is awake. It would like you to keep going.', cls: 'alive' });
  }
  if (s.stage >= 3) items.push({ date: '11/11/2003', text: 'NEW!! Character sheet (still under construction)', cls: '' });
  if (s.stage >= 2) items.push({ date: '11/11/2003 11:11', text: 'ThIs pAge wAs nOt uPdAtEd tOdAy', cls: 'glitchy' });
  items.push({ date: '06/2003', text: 'Gone fishing. Back soon!! :)' });
  items.push({ date: '03/2001', text: 'NEW!! Guestbook! Please sign it!' });
  return items;
}

function render(): HTMLElement {
  const g = game();
  const s = g.state;
  const unread = unreadCount(g);
  const pet = activeCreature(g);

  const links = h(
    'nav',
    { class: 't-box links', ariaLabel: 'Site links' },
    h('h2', {}, '~ Links ~'),
    h('ul', {}, 
      h('li', {}, h('a', { href: '#', dataset: { fk: 'l-guestbook' }, onclick: (e: Event) => (e.preventDefault(), navigate('guestbook')) }, 'Guestbook'), unread ? h('span', { class: 'new-tag blink' }, ` NEW (${unread})`) : null),
      h('li', {}, h('a', { href: '#', dataset: { fk: 'l-construction' }, onclick: (e: Event) => (e.preventDefault(), navigate('construction')) }, 'Under Construction'), h('span', { class: 'new-tag' }, ' (always)')),
      h('li', {}, h('a', { href: '#', class: 'broken-link', dataset: { fk: 'l-404' }, onclick: (e: Event) => (e.preventDefault(), navigate('e404')) }, 'Secret Page!!'), h('span', { class: 'tiny' }, ' (broken)')),
      s.ui.revealed.mypage ? h('li', {}, h('a', { href: '#', dataset: { fk: 'l-mypage' }, onclick: (e: Event) => (e.preventDefault(), navigate('mypage')) }, 'My Page'), h('span', { class: 'new-tag blink' }, ' NEW')) : null,
    ),
  );

  const corner = h(
    'section',
    { class: 't-box corner' },
    h('h2', {}, "~ Webmaster's Corner ~"),
    h('div', { class: 'corner-btns' }, btn([icon('mug', 22), ' The Mug'], sipMug, 'small', { title: "Sip the webmaster's coffee. Refills slowly.", dataset: { fk: 'mug' } }), btn('Nap on the couch', () => (restAtHome(g), toast('You nap on a couch that smells like 2001. +3 HP. An hour gone.', 'good'), refreshView()), 'small', { title: 'An hour passes. HP comes back.' })),
  );

  const ring = h(
    'section',
    { class: 't-box ring', ariaLabel: 'Web ring' },
    h('h2', {}, '~ Cool Sites I Like ~'),
    h('p', { class: 'tiny' }, '(the web ring. some links are broken. it is 2003.)'),
    h(
      'div',
      { class: 'ring-grid' },
      WEBRING.map((t) => {
        const unlocked = !t.future && test(g, t.unlock);
        if (unlocked) {
          return h('button', { type: 'button', class: 'ring-tile live', style: `--tile:${t.colour}`, dataset: { fk: `ring-${t.zone}` }, onclick: () => navigate(t.zone as never) }, icon(t.zone === 'lake' ? 'swan' : 'lighthouse', 32), h('span', {}, t.label));
        }
        return h(
          'button',
          {
            type: 'button',
            class: 'ring-tile broken',
            dataset: { fk: `ring-${t.zone}` },
            title: t.alt,
            onclick: () => toast(t.future ? 'This site is under construction. It has been under construction for twenty years. It will be worth it.' : "The image won't load. There is alt text, at least. It's trying.", 'info'),
          },
          h('span', { class: 'broken-img', attrs: { 'aria-hidden': 'true' } }, '▣'),
          h('span', { class: 'alt' }, t.alt),
        );
      }),
    ),
  );

  const news = h('section', { class: 't-box news' }, h('h2', {}, '~ News ~'), h('dl', {}, newsItems().flatMap((n) => [h('dt', {}, n.date), h('dd', { class: n.cls ?? '' }, n.text)])));

  const finaleBox = g.has('finale_ready')
    ? h('section', { class: 't-box finale-cta' }, h('h2', {}, '~ THE COUNTER READS 001111 ~'), h('p', {}, 'The page is holding very still. Something at the bottom of the counter is rendering itself.'), btn('▶ Look closer', () => navigate('elevenRoom'), 'go big', { dataset: { fk: 'finale' } }))
    : '';
  const welcome = h(
    'section',
    { class: 't-box welcome' },
    h('h2', {}, '~ About Me ~'),
    h('p', {}, `hi!! i'm ${OWNER.handle} and this is my homepage!! i like coffee, video games, chocobos, and the number 11. i don't know why. it's just a good number. sign my guestbook!! or don't. i'll know either way.`),
    h('p', { class: 'handwritten' }, '— w'),
    pet ? h('p', { class: 'pet-line' }, icon('chocobo', 24), ` ${pet.name} is hanging around the page.`) : null,
  );

  const counter = h(
    'section',
    { class: 't-box counter-box' },
    h('div', { class: 'cb-label' }, 'You are visitor number'),
    h('button', { type: 'button', class: 'odo-btn', ariaLabel: `Visitor counter ${s.visitors}. Press for details.`, onclick: () => funnyToast(COUNTER_LINES) }, odometer(s.visitors)),
    h('div', { class: 'cb-sub' }, 'since March 2001'),
  );

  const midi = h('div', { class: 't-box midi' }, h('span', {}, '♪ Now playing: '), h('b', {}, 'welcome_to_my_world.mid'), btn(s.settings.music ? 'Stop' : 'Play', () => { audio.init(); s.settings.music = !s.settings.music; audio.setMusic(s.settings.music); g.changed(); refreshView(); }, 'small'));

  const badges = h('div', { class: 'badges' }, badge88('Made with NOTEPAD', 'b1'), badge88('Best viewed 800x600', 'b2'), badge88('Powered by COFFEE', 'b3'), badge88('11:11', 'b4'), badge88('Valid HTML 3.2*', 'b5'), badge88('NO FRAMES!!', 'b6'));

  const wander = s.stage >= 4 && pet ? h('div', { class: 'wanderer', attrs: { 'aria-hidden': 'true' } }, icon('chocobo', 32)) : null;

  const page = h(
    'div',
    { class: 'page home-page' },
    marquee(`~*~ WELCOME TO MY WORLD ~*~ you are visitor #${s.visitors} ~*~ sign my guestbook!! ~*~ best viewed in 800x600 ~*~`),
    pageHeader(OWNER.siteTitle, '(this page is under construction. it has always been under construction.)'),
    h('div', { class: 'cols' }, h('aside', { class: 'side' }, counter, links, corner, midi, badges), h('div', { class: 'main' }, finaleBox, welcome, news, ring)),
    squintTools('home'),
    ringBar('home'),
    footer(),
    wander,
  );
  const holder = h('div', { class: 'spot-layer', attrs: { 'aria-hidden': 'false' } });
  spotButtons('home').forEach((b) => holder.appendChild(b));
  page.appendChild(holder);
  return page;
}

registerZone({ id: 'home', render });
