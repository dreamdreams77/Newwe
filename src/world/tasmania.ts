import { game } from '../core/runtime';
import { DEVIL } from '../data/dialogue';
import { AURORA_WORD } from '../data/tasmania';
import { timeOfDay } from '../core/timeSystem';
import { addItem } from '../systems/inventory';
import { activeCreature, canSniff } from '../systems/creatures';
import { passTime } from '../systems/actions';
import { grantMemory } from '../systems/effects';
import { runDialogue } from '../ui/dialogue';
import { h, btn } from '../ui/dom';
import { toast } from '../ui/notifications';
import { navigate, registerZone, refreshView } from '../ui/router';
import { scene } from '../ui/scene';
import { paintTasmania } from '../ui/scenes';
import { openSpotChange } from '../ui/puzzle/spotChange';
import { openWindow } from '../ui/windows';
import { audio } from '../audio/audioManager';
import { footer, pageHeader, ringBar } from './pageKit';
import { sniffAround } from './sniff';

const isNight = () => timeOfDay(game().state.clock.minutes) === 'night';

function minutesToNight(): number {
  const g = game();
  if (isNight()) return 0;
  const m = g.state.clock.minutes % 1440;
  return Math.max(0, 21 * 60 - m);
}

async function board(): Promise<void> {
  const g = game();
  if (g.has('tas_diffs')) return void toast('Five letters, left to right: S-O-U-T-H. The photographs have nothing more to give.', 'info');
  await openSpotChange();
  refreshView();
}

async function talkDevil(): Promise<void> {
  await runDialogue(DEVIL);
  refreshView();
}

function speakToSky(): void {
  const g = game();
  if (!g.has('tas_diffs')) return void toast('The sky is just sky. Maybe the photographs on the board have something to say first.', 'info');
  if (g.has('tas_aurora')) return void toast('The lights ripple, green and violet, in a slow, pleased way. They have said what they had to say.', 'info');
  if (!isNight()) return void toast('The sky only answers after dark. (You could sit on the rocks until it does.)', 'info');
  openWindow({
    id: 'aurora',
    title: 'The sky',
    icon: 'star',
    className: 'alert aurora-win',
    render: (b, w) => {
      const input = h('input', { type: 'text', class: 'bh-input', ariaLabel: 'Say the word', attrs: { maxlength: 12, autocomplete: 'off', 'data-fk': 'aurora-word' } }) as HTMLInputElement;
      const say = () => {
        const word = input.value.trim().toUpperCase();
        if (word !== AURORA_WORD) {
          audio.sfx('click');
          return void toast(word ? `"${word}." The sky does nothing. Politely, in capitals, it waits.` : 'The sky waits for a word.', 'info');
        }
        g.state.flags.tas_aurora = true;
        addItem(g, 'aurora_jar', 1);
        grantMemory(g, 'TAS_001');
        audio.sfx('eleven');
        toast('THE SKY SAYS: YES. Green fire pours down the south, unfolding. A little of it drifts into your hands and settles into a jar.', 'magic');
        w.close();
        refreshView();
      };
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') say(); });
      b.append(
        h('p', {}, 'It is dark, and very large. The stars are waiting in a way stars do not. Say the word the photographs said.'),
        h('div', { class: 'enc-tools' }, input, btn('Say it', say, 'go small', { dataset: { fk: 'aurora-say' } })),
        h('div', { class: 'win-actions' }, btn('Say nothing', () => w.close(), 'small')),
      );
    },
  });
}

function render(): HTMLElement {
  const g = game();
  const tod = timeOfDay(g.state.clock.minutes);
  const lit = g.has('tas_aurora');
  const pet = activeCreature(g);
  const sc = scene({
    zone: 'tasmania',
    width: 320,
    height: 180,
    className: `tas-scene ${lit ? 'aurora-on' : ''}`,
    paint: (ctx, w, hh) => paintTasmania(ctx, w, hh, tod, 'A', lit),
    caption: `The coast at ${tod}. A lighthouse on a cliff on the right, a beach with a rock, a headland on the left, and the open sky.`,
    hotspots: [
      { id: 'board', label: g.has('tas_diffs') ? 'The noticeboard (solved)' : 'The noticeboard', x: 2, y: 56, w: 18, h: 26, onClick: board, hint: 'Two photographs pinned side by side.', obj: 'tasmania.board' },
      { id: 'devil', label: 'Mr. Gnarl, Tasmanian devil', x: 22, y: 66, w: 12, h: 20, kind: 'npc', onClick: talkDevil, hint: 'Screams when he is pleased.' },
      { id: 'sky', label: 'The sky', x: 30, y: 2, w: 40, h: 36, onClick: speakToSky, hint: g.has('tas_diffs') ? 'It is listening.' : 'Large.', obj: 'tasmania.sky' },
      { id: 'light', label: 'The lighthouse', x: 80, y: 20, w: 8, h: 40, onClick: () => navigate('lighthouse'), hint: 'Marl is up there, being gruff.' },
    ],
  });
  const sniff = pet && canSniff(pet) ? btn(`${pet.name}, go sniff around`, () => (sniffAround(), refreshView()), 'small') : null;
  const waitNight = g.has('tas_diffs') && !lit && !isNight()
    ? btn(`Sit on the rocks until dark (${Math.round((minutesToNight() / 60) * 10) / 10} h)`, () => { passTime(g, minutesToNight(), { raw: true }); toast('You sit on the rocks. The light goes pink, then violet, then the stars come out one by one, as if counting.', 'magic'); refreshView(); }, 'small', { dataset: { fk: 'tas-wait' } })
    : null;
  return h(
    'div',
    { class: 'page tas-page' },
    pageHeader('~ Greetings from the Bottom of the World! ~', 'postcards, penguins, and a very small devil. est. 2003. wish u were here.'),
    sc,
    h('p', { class: 'scene-text' }, lit
      ? 'The aurora ripples overhead, green and violet. It will not say anything else. It does not need to.'
      : g.has('tas_diffs') ? 'Five letters, left to right. The sky is very large, and, you are fairly sure, listening.' : 'A noticeboard, a headland, a lighthouse far off on the cliff. The wind smells of salt and of something unreasonably far away.'),
    waitNight ? h('div', { class: 'back-link' }, waitNight) : '',
    sniff ? h('div', { class: 'back-link' }, sniff) : '',
    h('div', { class: 'back-link' }, btn('◄ Back to the homepage', () => navigate('home'), 'small')),
    ringBar('tasmania'),
    footer(),
  );
}

registerZone({ id: 'tasmania', render, guard: (g) => (g.has('postcard_decoded') ? null : 'That page does not load. Yet. (A postcard somewhere is still keeping a secret.)') });
