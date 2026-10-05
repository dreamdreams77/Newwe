import { game } from '../core/runtime';
import { STAT_DEFS } from '../data/statDefs';
import { QUESTS } from '../data/quests';
import { KNOWLEDGE } from '../data/knowledge';
import { SPECIES } from '../data/creatures';
import { BALANCE } from '../config/balance';
import { discoveredRecipes, describeInputs, undiscoveredCount } from '../systems/crafting';
import { coffeeState, dayNumber, formatClock } from '../core/timeSystem';
import { baseStat, statValue } from '../systems/stats';
import { activeAilments } from '../systems/ailments';
import { SLOTS, equippedIn, unequip } from '../systems/equipment';
import { currentStepIndex, questStatus } from '../systems/quests';
import { activeCreature, careAction, personalityLabel, creatureMoodText } from '../systems/creatures';
import { passTime } from '../systems/actions';
import { audio } from '../audio/audioManager';
import { h, btn, type Child } from './dom';
import { icon } from './sprites';
import { toast } from './notifications';
import { openWindow, type WinHandle } from './windows';
import { drawCreature } from './creatureArt';
import { inventoryList } from '../systems/inventory';
import { feedCreature, reactionFor } from '../systems/creatures';
import { openInventory } from './inventory';

// ---------------------------------------------------------------- status

export function openStats(): WinHandle {
  const g = game();
  return openWindow({
    id: 'stats',
    live: true,
    title: g.state.stage >= 3 ? 'Status' : 'My Profile',
    icon: 'heart',
    className: 'stats-win',
    width: 'min(760px, 98vw)',
    render: (body) => {
      const s = g.state;
      const cs = coffeeState(g);
      body.append(
        h(
          'div',
          { class: 'stat-top' },
          h('div', { class: 'portrait-big' }, icon('person', 72, 'You')),
          h('div', {}, h('h3', {}, 'Visitor #73'), h('p', {}, `Day ${dayNumber(s.clock.minutes)}, ${formatClock(s.clock.minutes)}`), h('p', {}, `HP ${s.vitals.hp}/${s.vitals.hpMax} · Coffee ${s.vitals.coffee}/${s.vitals.coffeeMax}`), h('p', { class: `coffee-state cs-${cs}` }, coffeeText(cs))),
        ),
      );
      const fx = activeAilments(g);
      body.append(
        h('section', { class: 'stat-group fx-group' }, h('h4', {}, 'Status'),
          fx.length ? h('ul', { class: 'fx-list' }, fx.map((a) => h('li', { class: a.good ? 'good' : 'bad' }, h('b', {}, a.label), ` — ${a.text} `, h('small', {}, `Cure: ${a.cure}`)))) : h('p', { class: 'empty' }, 'Nothing is wrong with you. Statistically unusual.'),
        ),
        h('section', { class: 'stat-group gear-group' }, h('h4', {}, 'Equipment'),
          h('div', { class: 'gear-grid' }, SLOTS.map((sl) => { const it = equippedIn(g, sl.id); return h('div', { class: `gear-slot ${it ? 'on' : ''}` }, h('span', { class: 'gs-l' }, sl.label), it ? h('div', { class: 'gs-item' }, icon(it.icon, 28), h('b', {}, it.name), h('small', {}, it.equip!.text), btn('Take off', () => { unequip(g, sl.id); }, 'small', { dataset: { fk: `unequip-${sl.id}` } })) : h('div', { class: 'gs-empty' }, sl.hint)); }),
            (() => { const pet = g.state.creatures.chocobo; const out = !!pet?.met && g.state.activeCreature === null; return h('div', { class: `gear-slot ${pet?.met ? 'on' : ''}` }, h('span', { class: 'gs-l' }, 'Companion'), pet?.met ? h('div', { class: 'gs-item' }, icon('chocobo', 28), h('b', {}, pet.name), h('small', {}, out ? 'Resting. It cannot help, and it is a little offended.' : 'Along for the ride. Sniffs things.'), btn(out ? 'Bring it' : 'Let it rest', () => { g.state.activeCreature = out ? 'chocobo' : null; if (!out) pet.mood = Math.max(0, pet.mood - 4); g.changed(); }, 'small', { dataset: { fk: 'companion' } })) : h('div', { class: 'gs-empty' }, 'Something small, loyal and yellow.')); })(),
          ),
        ),
      );
      for (const group of ['Body / Heart', 'Mind', 'Wild'] as const) {
        const sec = h('section', { class: 'stat-group' }, h('h4', {}, group));
        for (const d of STAT_DEFS.filter((x) => x.group === group)) {
          const eff = statValue(g, d.id);
          const base = baseStat(g, d.id);
          const diff = d.id === 'bossKnowledge' ? s.knowledge.length : eff - base;
          sec.append(
            h(
              'div',
              { class: 'stat-row' },
              icon(d.icon, 24),
              h('div', { class: 'sr-main' }, h('b', {}, d.label), h('span', { class: 'sr-blurb' }, ` — ${d.blurb}`), h('div', { class: 'sr-use' }, d.use)),
              h('div', { class: 'sr-val' }, String(eff), diff ? h('small', { class: diff > 0 ? 'up' : 'down' }, ` (${diff > 0 ? '+' : ''}${diff})`) : null),
              h('div', { class: 'sr-pips', attrs: { 'aria-hidden': 'true' } }, Array.from({ length: 10 }, (_, i) => h('i', { class: i < Math.min(10, eff) ? 'on' : '' }))),
            ),
          );
        }
        body.append(sec);
      }
      body.append(
        h('section', { class: 'stat-group' }, h('h4', {}, '11:11'), h('p', {}, `Charges: ${s.eleven.charges}/${s.eleven.max}. Gained ${s.eleven.gained}, spent ${s.eleven.spent}. A wish, not a stat: reroll a failed roll, bend a rule, reveal a secret. Rare on purpose.`)),
      );
      if (s.buffs.length)
        body.append(h('section', { class: 'stat-group' }, h('h4', {}, 'Right now'), h('ul', {}, s.buffs.map((b) => h('li', {}, `${b.label}: ${STAT_DEFS.find((d) => d.id === b.stat)!.label} ${b.by > 0 ? '+' : ''}${b.by} for ${Math.max(0, Math.round(b.until - s.clock.minutes))} more minutes`)))));
    },
  });
}

function coffeeText(cs: string): string {
  switch (cs) {
    case 'max':
      return 'Full to the brim: JITTERY.';
    case 'wired':
      return 'WIRED: sharper on mind-stat rolls (+1 die), everything takes a little less time.';
    case 'low':
      return 'Running low. Soon the page will start to feel unreliable.';
    case 'empty':
      return 'CRASHED: Puzzle Sense is down, everything takes longer, fumbles come sooner and careful options are unavailable. Get coffee.';
    default:
      return 'Steady.';
  }
}

// ---------------------------------------------------------------- journal

export function openJournal(): WinHandle {
  const g = game();
  return openWindow({
    id: 'journal',
    live: true,
    title: g.state.stage >= 3 ? 'Journal' : 'My History',
    icon: 'book',
    className: 'journal-win',
    width: 'min(760px, 98vw)',
    render: (body) => {
      const s = g.state;
      const quests = h('section', {}, h('h3', {}, 'Quests'));
      let any = false;
      for (const q of QUESTS) {
        const st = questStatus(g, q);
        if (st === 'locked') continue;
        any = true;
        const idx = currentStepIndex(g, q);
        quests.append(
          h(
            'div',
            { class: `quest ${st}` },
            h('h4', {}, q.title, st === 'done' ? ' ✓' : st === 'failed' ? ' ✗' : ''),
            h('p', { class: 'q-blurb' }, st === 'done' ? q.doneText : st === 'failed' ? q.failText ?? '' : q.blurb),
            st === 'active'
              ? h('ol', {}, q.steps.map((step, i) => h('li', { class: i < idx ? 'done' : i === idx ? 'now' : 'later' }, i <= idx ? step.text : '???', i === idx && step.hint ? h('div', { class: 'q-hint' }, step.hint) : null)))
              : null,
          ),
        );
      }
      if (!any) quests.append(h('p', { class: 'empty' }, 'Nothing yet. Things will start asking things of you.'));
      body.append(quests);

      const know = Object.keys(KNOWLEDGE).filter((k) => s.knowledge.includes(k));
      body.append(h('section', {}, h('h3', {}, `Things I have learned (${know.length})`), know.length ? h('ul', { class: 'learned' }, know.map((k) => h('li', {}, KNOWLEDGE[k]))) : h('p', { class: 'empty' }, 'Not much, yet. Listen to people. Read things. Notice things.')));

      const made = discoveredRecipes(g);
      body.append(
        h(
          'section',
          {},
          h('h3', {}, 'Tinkerings'),
          made.length ? h('ul', {}, made.map((r) => h('li', {}, h('b', {}, r.name), ` — ${describeInputs(r)}`))) : h('p', { class: 'empty' }, 'Nothing made yet.'),
          h('p', { class: 'mystery' }, `${undiscoveredCount(g)} still out there.`),
        ),
      );

      const log = [...s.log].reverse().slice(0, 30);
      body.append(h('details', { class: 'logs' }, h('summary', {}, 'Recent events'), h('ul', {}, log.map((l) => h('li', {}, `${formatClock(l.at)} — ${l.text}`)))));
    },
  });
}

// ---------------------------------------------------------------- creature

export function openCreature(): WinHandle {
  const g = game();
  return openWindow({
    id: 'creature',
    live: true,
    title: 'Pet',
    icon: 'chocobo',
    className: 'creature-win',
    width: 'min(700px, 98vw)',
    render: (body, win) => {
      const c = activeCreature(g);
      if (!c) {
        body.append(h('p', { class: 'empty' }, 'You have not met anything yet. Something near the water was peeping.'));
        return;
      }
      const sp = SPECIES[c.species];
      const canvas = h('canvas', { class: 'px creature-art', attrs: { width: 16, height: 16, role: 'img', 'aria-label': `${c.name}, a ${sp.name}` } });
      drawCreature(canvas, c);
      const meter = (label: string, v: number, cls: string) => h('div', { class: `cmeter ${cls}` }, h('span', { class: 'cm-l' }, label), h('div', { class: 'cm-bar', attrs: { role: 'meter', 'aria-valuenow': Math.round(v), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': label } }, h('i', { style: `width:${v}%` })), h('span', { class: 'cm-n' }, String(Math.round(v))));
      body.append(
        h(
          'div',
          { class: 'creature-top' },
          h('div', { class: 'creature-stage' }, canvas),
          h(
            'div',
            { class: 'creature-info' },
            h('h3', {}, c.name, h('small', {}, ` the ${sp.name}`)),
            h('p', { class: 'cr-blurb' }, sp.blurb),
            h('p', { class: 'cr-mood', attrs: { 'aria-live': 'polite' } }, creatureMoodText(g, c)),
            h('p', {}, h('b', {}, 'Personality: '), personalityLabel(c)),
            meter('Fullness', c.fullness, 'full'),
            meter('Mood', c.mood, 'mood'),
            meter('Trust', c.trust, 'trust'),
            meter('Energy', c.energy, 'energy'),
          ),
        ),
      );
      const abilities = h('div', { class: 'cr-abilities' }, h('h4', {}, 'Things it can do'));
      Object.entries(sp.abilities).forEach(([id, ab]) => {
        const known = c.learned.includes(id) || (id === 'peck' && c.trust >= BALANCE.creature.trustToBond);
        abilities.append(h('div', { class: `ability ${known ? 'known' : 'locked'}` }, known ? '★ ' : '☆ ', h('b', {}, ab.label), ` — ${known ? ab.text : 'it has not learned this yet'}`));
      });
      body.append(abilities);

      const care = h(
        'div',
        { class: 'cr-care' },
        btn('Pet', () => (toast(careAction(g, c.id, 'pet'), 'funny'), passTime(g, 3), audio.sfx('chirp'), win.refresh()), 'small'),
        btn('Play', () => (toast(careAction(g, c.id, 'play'), 'funny'), passTime(g, 4), audio.sfx('chirp'), win.refresh()), 'small'),
        btn('Let it nap', () => (toast(careAction(g, c.id, 'nap'), 'funny'), passTime(g, 30), win.refresh()), 'small'),
        btn('Rename', () => rename(win), 'small'),
      );
      body.append(care);

      const foods = inventoryList(g).filter((i) => reactionFor(sp, i.def.id) !== sp.confused);
      body.append(
        h(
          'div',
          { class: 'cr-feed' },
          h('h4', {}, 'Feed it'),
          foods.length
            ? h(
                'div',
                { class: 'feed-list' },
                foods.map((f) =>
                  btn([icon(f.def.icon, 20), ` ${f.def.name}`], () => {
                    const res = feedCreature(g, c.id, f.def.id);
                    toast(res.text, res.ok ? 'funny' : 'info');
                    if (res.learned) toast(`${c.name} learned: ${sp.abilities[res.learned]?.label ?? res.learned}!`, 'magic');
                    audio.sfx('chirp');
                    win.refresh();
                  }, 'small'),
                ),
              )
            : h('p', { class: 'empty' }, 'You are carrying nothing it would eat. (Not everything is food, but a lot of it is, to a chocobo.)'),
          btn('Open backpack', () => (win.close(), openInventory()), 'small'),
        ),
      );
    },
  });
}

function rename(win: WinHandle): void {
  const g = game();
  const c = activeCreature(g);
  if (!c) return;
  const input = h('input', { type: 'text', value: c.name, maxLength: 16, attrs: { 'aria-label': 'Name' } });
  openWindow({
    id: 'rename',
    title: 'Name it',
    modal: true,
    className: 'alert',
    render: (b, ww) => {
      b.append(
        h('label', {}, 'What is its name? ', input),
        h('div', { class: 'win-actions' }, btn('OK', () => ((c.name = input.value.trim() || c.name), g.changed(), ww.close(), win.refresh()), 'go'), btn('Cancel', () => ww.close())),
      );
    },
  });
  setTimeout(() => input.focus(), 30);
}

export type { Child };
