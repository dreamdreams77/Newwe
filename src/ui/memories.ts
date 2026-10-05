import { game } from '../core/runtime';
import { MEMORIES, memoryView } from '../data/memories';
import { LULLABY, PAD_NOTES } from '../data/puzzles';
import { noteFreq } from '../audio/music';
import { audio } from '../audio/audioManager';
import { h, btn, sleep } from './dom';
import { icon } from './sprites';
import { openWindow, type WinHandle } from './windows';

/** a procedural polaroid so placeholder photos are not empty grey boxes */
export function drawPlaceholderPhoto(c: HTMLCanvasElement, seed: string): void {
  const ctx = c.getContext('2d')!;
  const W = c.width;
  const H = c.height;
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.7);
  sky.addColorStop(0, '#ff9a6a');
  sky.addColorStop(1, '#ffe0a0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2a4a7a';
  ctx.fillRect(0, H * 0.7, W, H * 0.3);
  ctx.fillStyle = '#3a8a4a';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.75);
  ctx.lineTo(W * 0.5, H * 0.58);
  ctx.lineTo(W, H * 0.72);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
  // a slightly crooked lighthouse
  ctx.save();
  ctx.translate(W * 0.5, H * 0.58);
  ctx.rotate(-0.04);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-W * 0.05, -H * 0.4, W * 0.1, H * 0.4);
  ctx.fillStyle = '#d33';
  ctx.fillRect(-W * 0.05, -H * 0.3, W * 0.1, H * 0.06);
  ctx.fillRect(-W * 0.05, -H * 0.16, W * 0.1, H * 0.06);
  ctx.fillStyle = '#ffd93b';
  ctx.fillRect(-W * 0.04, -H * 0.46, W * 0.08, H * 0.06);
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  for (let i = 0; i < 60; i++) ctx.fillRect(((seed.length * 31 + i * 97) % W), (i * 53) % H, 1, 1);
}

let stopVoice = false;
export async function playVoiceClip(): Promise<void> {
  stopVoice = false;
  audio.init();
  for (const idx of LULLABY) {
    if (stopVoice) return;
    audio.note(noteFreq(PAD_NOTES[idx]), 0.5, 'triangle', 0.4);
    await sleep(520);
  }
}

export function openMemories(): WinHandle {
  const g = game();
  return openWindow({
    id: 'memories',
    title: g.state.stage >= 3 ? 'Materia' : 'My Photos',
    icon: 'brain',
    className: 'memories-win',
    width: 'min(820px, 98vw)',
    render: (body) => {
      const have = Object.values(MEMORIES).filter((m) => g.state.memories.includes(m.id));
      if (!have.length) {
        body.append(h('p', { class: 'empty' }, 'No memories yet. Some things only come back when you have done something to deserve them.'));
        return;
      }
      body.append(h('p', { class: 'mem-intro' }, 'Memories are not cutscenes. Every one of these became something: a card, a clue, a place to go.'));
      const grid = h('div', { class: 'mem-grid' });
      for (const m of have) {
        const v = memoryView(m);
        const card = h('article', { class: `memory kind-${m.kind}` }, h('h4', {}, icon(m.kind === 'photo' ? 'postcard' : m.kind === 'voice' ? 'note' : m.kind === 'note' ? 'quill' : 'brain', 20), ' ', v.title));
        if (m.kind === 'photo') {
          if (v.image) card.append(h('img', { class: 'polaroid', src: v.image, alt: v.caption ?? v.title }));
          else {
            const cv = h('canvas', { class: 'polaroid', attrs: { width: 160, height: 120, role: 'img', 'aria-label': v.caption ?? 'a photograph' } });
            drawPlaceholderPhoto(cv, m.id);
            card.append(cv);
          }
        }
        if (m.kind === 'voice') {
          card.append(
            btn('▶ Play recording', async () => {
              if (v.audio) {
                const a = new Audio(v.audio);
                await a.play().catch(() => undefined);
              } else await playVoiceClip();
            }, 'small'),
          );
        }
        card.append(h('p', { class: `mem-text ${m.kind === 'note' ? 'handwritten' : ''}` }, v.text), v.caption ? h('p', { class: 'mem-caption' }, v.caption) : '', h('p', { class: 'mem-becomes' }, `Became: ${m.becomes}`));
        grid.append(card);
      }
      body.append(grid);
    },
  });
}

export { memoryView };
