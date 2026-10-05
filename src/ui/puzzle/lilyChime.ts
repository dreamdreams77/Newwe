import { game } from '../../core/runtime';
import { LILY_ROUNDS, LULLABY, PAD_COLOURS, PAD_NOTES } from '../../data/puzzles';
import { noteFreq } from '../../audio/music';
import { audio } from '../../audio/audioManager';
import { grantMemory } from '../../systems/effects';
import { passTime } from '../../systems/actions';
import { changeVital, statValue } from '../../systems/stats';
import { raiseStat } from '../../systems/stats';
import { addVisitors } from '../../systems/hits';
import { earnCard } from '../../systems/cards';
import { BALANCE } from '../../config/balance';
import { h, btn, sleep } from '../dom';
import { toast } from '../notifications';
import { icon } from '../sprites';
import { openWindow } from '../windows';

/**
 * The lily pads sing a five-note song. You heard it hummed under the dock. Hear it,
 * then do what the water did. Memory buys replays; Puzzle Sense nudges after a slip.
 * It never plays itself for you.
 */
export function openLilyChime(): Promise<boolean> {
  const g = game();
  const state = g.state.puzzles.lily ?? (g.state.puzzles.lily = { solved: false, attempts: 0 });
  return new Promise((resolve) => {
    let round = 0;
    let input: number[] = [];
    let playing = false;
    let closed = false;
    let replays = 1 + Math.floor(statValue(g, 'memory') / 3);
    let hinted = false;
    let msg = 'Out here the pads are shy. Then, from under the dock, a hum.';
    let visual = true;
    let started = false;
    let hint: number | null = null;
    const lit = new Set<number>();

    const pad = (i: number, ms = 360) => {
      audio.note(noteFreq(PAD_NOTES[i]), ms / 1000 + 0.15, 'triangle', 0.5);
      if (visual) {
        lit.add(i);
        win.refresh();
        setTimeout(() => {
          lit.delete(i);
          if (!closed) win.refresh();
        }, ms * 0.8);
      }
    };
    const playSeq = async (n: number) => {
      if (playing) return;
      playing = true;
      win.refresh();
      for (let i = 0; i < n && !closed; i++) {
        pad(LULLABY[i]);
        await sleep(520);
      }
      playing = false;
      if (!closed) win.refresh();
    };

    const win = openWindow({
      id: 'lily',
      title: 'The Lily Pads',
      icon: 'swan',
      className: 'lily-win',
      width: 'min(560px, 98vw)',
      onClose: () => {
        closed = true;
        resolve(state.solved);
      },
      render: (body, w) => {
        const len = LILY_ROUNDS[round];
        body.append(
          h('p', { class: 'lily-msg', attrs: { role: 'status' } }, msg),
          h('div', { class: 'lily-progress', attrs: { 'aria-label': `Round ${round + 1} of ${LILY_ROUNDS.length}` } }, LILY_ROUNDS.map((n, i) => h('span', { class: i < round ? 'done' : i === round ? 'now' : '' }, `${n} notes`))),
        );
        const padsEl = h('div', { class: 'lily-pads', role: 'group', ariaLabel: 'Four lily pads' });
        PAD_NOTES.forEach((_, i) => {
          padsEl.append(
            h(
              'button',
              {
                type: 'button',
                class: `lily-pad ${lit.has(i) ? 'lit' : ''} ${hint === i ? 'hint' : ''}`,
                style: `--c:${PAD_COLOURS[i]}`,
                ariaLabel: `Pad ${i + 1}, ${['pink', 'blue', 'yellow', 'green'][i]}`,
                disabled: playing || !started,
                dataset: { fk: `pad-${i}` },
                onclick: () => press(i),
              },
              h('span', { class: 'pad-n' }, String(i + 1)),
            ),
          );
        });
        body.append(padsEl);
        const actions = h('div', { class: 'win-actions' });
        if (!started) {
          actions.append(
            btn('♪ Listen to the hum', async () => {
              started = true;
              grantMemory(g, 'VOICE_001');
              msg = 'Five notes. Hummed by someone who was happy and trying not to be heard. Now it is your turn.';
              await playSeq(LULLABY.length);
              msg = `Round 1: play the first ${LILY_ROUNDS[0]} notes back.`;
              await sleep(250);
              await playSeq(LILY_ROUNDS[0]);
              w.refresh();
            }, 'go big', { attrs: { 'data-autofocus': '' } }),
          );
        } else {
          actions.append(
            btn(`↻ Hear it again (${replays} left)`, async () => {
              if (replays <= 0) return toast('You have heard it as many times as you can hold in your head. (Memory.)', 'info');
              replays--;
              input = [];
              await playSeq(len);
            }, 'small', { disabled: playing || replays <= 0 }),
            h('label', { class: 'lily-opt' }, h('input', { type: 'checkbox', checked: visual, on: { change: (e) => ((visual = (e.target as HTMLInputElement).checked), w.refresh()) } }), ' Flash the pads (turn off for audio-only: a bonus if you finish)'),
          );
        }
        actions.append(btn('Leave the pads', () => w.close(), 'small'));
        body.append(
          h('div', { class: 'lily-input', attrs: { 'aria-live': 'polite' } }, `Your notes: ${input.map((i) => i + 1).join(' ') || '—'}`),
          actions,
        );
      },
    });

    const press = async (i: number) => {
      if (playing || closed) return;
      const want = LULLABY[input.length];
      pad(i);
      if (i !== want) {
        state.attempts++;
        input = [];
        audio.sfx('error');
        changeVital(g, 'coffee', 0);
        msg = 'That note bends sideways and the pad goes quiet. The water forgets what you played.';
        hint = null;
        if (statValue(g, 'puzzleSense') >= 4 && !hinted) {
          hinted = true;
          msg += ' Puzzle Sense: one pad is glowing very, very faintly.';
          hint = LULLABY[0];
          setTimeout(() => {
            hint = null;
            if (!closed) win.refresh();
          }, 2500);
        }
        passTime(g, 1);
        win.refresh();
        return;
      }
      input.push(i);
      hint = null;
      const len = LILY_ROUNDS[round];
      if (input.length < len) return win.refresh();
      // round complete
      input = [];
      round++;
      if (round >= LILY_ROUNDS.length) {
        state.solved = true;
        g.state.flags.lake_solved = true;
        if (!visual) {
          raiseStat(g, 'memory', 1);
          toast('You did it by ear alone. Memory +1.', 'good');
        }
        earnCard(g, 'lullaby');
        addVisitors(g, BALANCE.hits.puzzle, 'sang to the lily pads');
        audio.sfx('puzzle');
        for (const n of LULLABY) {
          pad(n);
          await sleep(220);
        }
        toast('Four lily pads chime, in time, then every swan on the pond turns to look at you.', 'magic');
        g.changed();
        closed = true;
        win.close();
        return;
      }
      msg = `Round ${round + 1}: ${LILY_ROUNDS[round]} notes now.`;
      replays = Math.max(replays, 1);
      audio.sfx('success');
      win.refresh();
      await sleep(400);
      await playSeq(LILY_ROUNDS[round]);
    };
    void icon;
  });
}
