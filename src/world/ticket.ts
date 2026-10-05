import { game } from '../core/runtime';
import { FINE_PRINT, FINE_PRINT_ANSWER, TICKET_RIDES } from '../data/puzzles';
import { WEBRING } from '../data/zones';
import { test } from '../systems/conditions';
import { registerItemHandler } from '../systems/itemUse';
import { learn } from '../systems/effects';
import { addVisitors } from '../systems/hits';
import { statValue } from '../systems/stats';
import { BALANCE } from '../config/balance';
import type { ZoneId } from '../core/types';
import { audio } from '../audio/audioManager';
import { h, btn } from '../ui/dom';
import { toast } from '../ui/notifications';
import { navigate } from '../ui/router';
import { openWindow } from '../ui/windows';

export function ridesLeft(): number {
  const g = game();
  if (g.has('ticket_terminus')) return Infinity;
  return Math.max(0, TICKET_RIDES - ((g.state.flags.ticket_punches as number) || 0));
}

/** fast travel: the Bullet-Train Ticket, three punch-holes — or unlimited once the fine print is solved */
export function openTicketRide(): void {
  const g = game();
  const left = ridesLeft();
  openWindow({
    id: 'train',
    title: 'Platform 0 — Bullet Train',
    icon: 'trainticket',
    className: 'train-win',
    width: 'min(560px, 98vw)',
    render: (body, win) => {
      const dests: Array<{ zone: ZoneId; label: string }> = [{ zone: 'home', label: 'Home' }, { zone: 'guestbook', label: 'Guestbook' }];
      for (const t of WEBRING) if (!t.future && test(g, t.unlock) && g.state.flags[`visited_${t.zone}`]) dests.push({ zone: t.zone as ZoneId, label: t.label });
      body.append(
        h('p', {}, left === Infinity ? 'OPEN RETURN. The conductor nods at you with something like respect.' : `Punch-holes left: ${left}. The ticket doesn't say what happens at zero. It does say a lot of other things.`),
        h('div', { class: 'train-list' }, dests.filter((d) => d.zone !== g.state.zone).map((d) => btn(`🚅 ${d.label}`, () => {
          if (left <= 0) return toast('No punch-holes left. The fine print is looking at you.', 'info');
          if (left !== Infinity) g.state.flags.ticket_punches = ((g.state.flags.ticket_punches as number) || 0) + 1;
          audio.sfx('door');
          toast('Whoosh. 11:11 service. The view outside the window is just the number 11.', 'magic');
          win.close();
          navigate(d.zone, { free: true });
        }, 'big'))),
      );
    },
  });
}

/**
 * The fine print is an acrostic. Nothing tells you to read down the first letters,
 * but Puzzle Sense and Observation make them a little bolder. It is a nudge, not a solution.
 */
function openFinePrint(): Promise<void> {
  const g = game();
  return new Promise((resolve) => {
    const nudge = statValue(g, 'puzzleSense') + statValue(g, 'observation') >= 8;
    openWindow({
      id: 'fineprint',
      title: 'Bullet-Train Ticket — the back',
      icon: 'trainticket',
      className: 'fineprint-win',
      width: 'min(640px, 98vw)',
      onClose: () => resolve(),
      render: (body, win) => {
        const done = g.has('ticket_terminus');
        const input = h('input', { type: 'text', maxLength: 12, placeholder: 'the word', attrs: { 'aria-label': 'The word hidden in the fine print', autocomplete: 'off' } });
        const msg = h('p', { class: 'fp-msg', attrs: { role: 'status' } });
        body.append(
          h('p', { class: 'fp-top' }, 'READ DOWN FOR BEST RESULTS.'),
          h('div', { class: 'fine-print' }, FINE_PRINT.map((line) => h('p', {}, nudge ? h('b', { class: 'nudge' }, line[0]) : line[0], line.slice(1)))),
          done
            ? h('p', { class: 'fp-solved' }, `Stamped: ${FINE_PRINT_ANSWER}. OPEN RETURN.`)
            : h('div', { class: 'fp-answer' }, h('label', {}, 'The ticket seems to want a word: ', input), btn('Stamp it', () => {
                const ans = input.value.trim().toUpperCase();
                if (ans === FINE_PRINT_ANSWER) {
                  g.state.flags.ticket_terminus = true;
                  learn(g, 'terminus');
                  addVisitors(g, BALANCE.hits.puzzle - 30, 'read the fine print');
                  audio.sfx('puzzle');
                  toast('The ticket stamps itself: TERMINUS. Open return. Unlimited rides.', 'magic');
                  g.changed();
                  win.refresh();
                } else {
                  audio.sfx('error');
                  msg.textContent = ans ? 'The ticket says nothing, politely.' : 'Type something.';
                }
              }, 'go')),
          msg,
          nudge && !done ? h('p', { class: 'fp-sense' }, 'Puzzle Sense: the first letters feel slightly bolder than they should.') : '',
        );
      },
    });
  });
}

registerItemHandler('ticket_fineprint', () => openFinePrint());
registerItemHandler('ticket_ride', () => openTicketRide());
