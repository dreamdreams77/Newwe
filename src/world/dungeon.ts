import { game } from '../core/runtime';
import { BALANCE } from '../config/balance';
import { generateMaze, placeThings, exits, E, N, S, W, type Maze, type MazeThing } from '../systems/maze';
import { learn } from '../systems/effects';
import { addItem, hasItem } from '../systems/inventory';
import { passTime } from '../systems/actions';
import { applyAilment, cureAilment, hasAilment } from '../systems/ailments';
import { spendEleven } from '../systems/elevenEleven';
import { runEncounter } from '../ui/combat';
import { activeCreature, canSniff } from '../systems/creatures';
import { audio } from '../audio/audioManager';
import { h, btn } from '../ui/dom';
import { toast } from '../ui/notifications';
import { navigate, registerZone, refreshView, currentZone } from '../ui/router';
import { anyModalOpen } from '../ui/windows';
import { footer } from './pageKit';
import { sniffAround } from './sniff';

const CELL = 24;
let maze: Maze | null = null;
let things: MazeThing[] = [];
let mazeSeed = 0;
const messages: string[] = [];

function ensure(): void {
  const g = game();
  if (maze && mazeSeed === g.state.seed) return;
  mazeSeed = g.state.seed;
  maze = generateMaze((g.state.seed ^ 0x1111) >>> 0);
  things = placeThings(g, maze);
}

function pos(): [number, number] {
  const g = game();
  const s = String(g.state.flags.maze_pos ?? '0,0').split(',').map(Number);
  return [s[0] || 0, s[1] || 0];
}
function seenSet(): Set<string> {
  const g = game();
  return new Set(String(g.state.flags.maze_seen ?? '0,0').split(';').filter(Boolean));
}
function markSeen(x: number, y: number): void {
  const g = game();
  const s = seenSet();
  s.add(`${x},${y}`);
  if (maze) {
    const c = maze.cells[y * maze.n + x];
    if (c.open & N) s.add(`${x},${y - 1}`);
    if (c.open & S) s.add(`${x},${y + 1}`);
    if (c.open & E) s.add(`${x + 1},${y}`);
    if (c.open & W) s.add(`${x - 1},${y}`);
  }
  g.state.flags.maze_seen = [...s].join(';');
}

function interact(x: number, y: number): void {
  const g = game();
  const t = things.find((th) => th.x === x && th.y === y);
  if (t && !g.has(`maze_loot_${t.id}`)) {
    g.state.flags[`maze_loot_${t.id}`] = true;
    messages.push(`${t.title}: ${t.text}`);
    if (t.know) learn(g, t.know);
    if (t.kind === 'note') {
      g.state.flags.maze_steps = 0;
      cureAilment(g, 'lost'); // a landmark: you know where you are
    }
    if (t.item) addItem(g, t.item, 1);
    audio.sfx(t.kind === 'note' ? 'page' : 'pickup');
    if (t.kind === 'note') toast('You read it. (Boss Knowledge +1)', 'info');
  } else if (t) {
    messages.push(`${t.title}. You have already been through it.`);
  }
  if (maze && x === maze.goal[0] && y === maze.goal[1] && !g.has('maze_goal')) {
    g.state.flags.maze_goal = true;
    messages.push('A low hum. A glow of cola-red light. The corridor opens into a room, and in the room, a vending machine.');
    audio.sfx('door');
  }
}

function move(dx: number, dy: number, bit: number): void {
  ensure();
  const g = game();
  const m = maze!;
  const [x, y] = pos();
  const cell = m.cells[y * m.n + x];
  if (!(cell.open & bit)) {
    audio.sfx('error');
    messages.push('A wall. Solid, cold, covered in cables.');
    return refreshView();
  }
  const nx = x + dx;
  const ny = y + dy;
  g.state.flags.maze_pos = `${nx},${ny}`;
  markSeen(nx, ny);
  passTime(g, BALANCE.time.cost.maze);
  audio.sfx('step');
  messages.length = 0;
  const steps = ((g.state.flags.maze_steps as number) || 0) + 1;
  g.state.flags.maze_steps = steps;
  if (steps % 16 === 0 && !hasAilment(g, 'lost')) {
    if (applyAilment(g, 'lost', 90)) messages.push('The corridors begin to look alike. You are, for now, LOST: the map will not be trusted.');
  }
  interact(nx, ny);
  g.changed();
  refreshView();
}

let wired = false;
function wireKeys(): void {
  if (wired) return;
  wired = true;
  document.addEventListener('keydown', (ev) => {
    if (currentZone() !== 'dungeon' || anyModalOpen()) return;
    const t = ev.target as HTMLElement;
    if (t && /input|textarea|select/i.test(t.tagName)) return;
    const k = ev.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') (ev.preventDefault(), move(0, -1, N));
    else if (k === 'arrowdown' || k === 's') (ev.preventDefault(), move(0, 1, S));
    else if (k === 'arrowleft' || k === 'a') (ev.preventDefault(), move(-1, 0, W));
    else if (k === 'arrowright' || k === 'd') (ev.preventDefault(), move(1, 0, E));
  });
}

function drawMaze(canvas: HTMLCanvasElement): void {
  const g = game();
  const m = maze!;
  const ctx = canvas.getContext('2d')!;
  const lost = hasAilment(g, 'lost');
  const [px, py] = pos();
  const seen = lost ? new Set([`${px},${py}`]) : seenSet(); // when lost, the map remembers nothing
  ctx.fillStyle = '#05020f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const c of m.cells) {
    const x = c.x * CELL;
    const y = c.y * CELL;
    if (!seen.has(`${c.x},${c.y}`)) {
      ctx.fillStyle = '#0a0620';
      ctx.fillRect(x, y, CELL, CELL);
      continue;
    }
    ctx.fillStyle = '#12123a';
    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    ctx.fillStyle = '#1a1a52';
    ctx.fillRect(x + 4, y + 4, 2, 2);
    ctx.fillRect(x + CELL - 6, y + CELL - 6, 2, 2);
    ctx.strokeStyle = '#7fe3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (!(c.open & N)) { ctx.moveTo(x, y + 1); ctx.lineTo(x + CELL, y + 1); }
    if (!(c.open & S)) { ctx.moveTo(x, y + CELL - 1); ctx.lineTo(x + CELL, y + CELL - 1); }
    if (!(c.open & W)) { ctx.moveTo(x + 1, y); ctx.lineTo(x + 1, y + CELL); }
    if (!(c.open & E)) { ctx.moveTo(x + CELL - 1, y); ctx.lineTo(x + CELL - 1, y + CELL); }
    ctx.stroke();
    // contents
    const t = things.find((th) => th.x === c.x && th.y === c.y);
    if (t) {
      const looted = g.has(`maze_loot_${t.id}`);
      ctx.fillStyle = looted ? '#445' : t.kind === 'note' ? '#ffd93b' : t.kind === 'item' ? '#52c45f' : '#ff7ae6';
      ctx.fillRect(x + CELL / 2 - 3, y + CELL / 2 - 3, 6, 6);
    }
    if (c.x === m.goal[0] && c.y === m.goal[1]) {
      ctx.fillStyle = '#ff4a6a';
      ctx.fillRect(x + 5, y + 4, 14, 16);
      ctx.fillStyle = '#ffe45a';
      ctx.fillRect(x + 8, y + 7, 4, 4);
    }
  }
  // you
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px * CELL + 8, py * CELL + 6, 8, 12);
  ctx.fillStyle = '#4a8cff';
  ctx.fillRect(px * CELL + 9, py * CELL + 12, 6, 6);
  ctx.fillStyle = '#ffd93b';
  ctx.fillRect(px * CELL + 9, py * CELL + 7, 6, 4);
}

async function approachMachine(): Promise<void> {
  const g = game();
  const res = await runEncounter('vm1111');
  if (res === 'tilt') navigate('e404', { free: true });
  refreshView();
  void g;
}

function render(): HTMLElement {
  ensure();
  wireKeys();
  const g = game();
  const m = maze!;
  const [x, y] = pos();
  markSeen(x, y);
  const atGoal = x === m.goal[0] && y === m.goal[1];
  const canvas = h('canvas', { class: 'px maze-canvas', attrs: { width: m.n * CELL, height: m.n * CELL, role: 'img', 'aria-label': `Maze map. You are at column ${x + 1}, row ${y + 1}.` } });
  drawMaze(canvas);
  const ex = exits(m, x, y);
  const won = g.has('boss_defeated');
  const dpad = h('div', { class: 'dpad', role: 'group', ariaLabel: 'Move' },
    btn('▲', () => move(0, -1, N), 'dp up', { ariaLabel: 'Move north', dataset: { fk: 'dp-up' } }),
    btn('◄', () => move(-1, 0, W), 'dp left', { ariaLabel: 'Move west', dataset: { fk: 'dp-left' } }),
    btn('▼', () => move(0, 1, S), 'dp down', { ariaLabel: 'Move south', dataset: { fk: 'dp-down' } }),
    btn('►', () => move(1, 0, E), 'dp right', { ariaLabel: 'Move east', dataset: { fk: 'dp-right' } }),
  );
  const pet = activeCreature(g);
  const jammed = won && g.state.flags.vm_choice === 'refund' && !hasItem(g, 'golden_dice') && !g.has('gd_claimed');
  return h(
    'div',
    { class: 'page dungeon-page' },
    h('header', { class: 'page-header' }, h('h1', { class: 'glitch-text' }, 'PAGE FOUND.'), h('p', { class: 'page-sub' }, 'The server room under the page. Something hums at the pitch of a very large decision.')),
    h('div', { class: 'dungeon-grid' },
      h('div', { class: 'maze-wrap' }, canvas),
      h('div', { class: 'maze-side' },
        h('p', { class: 'maze-where', attrs: { 'aria-live': 'polite' } }, hasAilment(g, 'lost') ? 'You are in a corridor. You are LOST. Exits: it all looks the same.' : `You are in a corridor. Exits: ${ex.join(', ')}.`),
        dpad,
        h('p', { class: 'tiny' }, 'Arrow keys or WASD. Yellow squares are notes. Green squares are things you can take.'),
        h('div', { class: 'maze-log', attrs: { role: 'log', 'aria-live': 'polite' } }, messages.slice(-4).map((t) => h('p', {}, t))),
        atGoal ? (won ? h('div', {}, h('p', { class: 'maze-won' }, 'The machine sits quiet. A small light on its front blinks 11:11.'), jammed ? btn('✦ Spend 11:11: open the jammed flap', () => {
              if (!spendEleven(g, 'opened the prize flap')) return toast('You have no wishes to spend.', 'info');
              g.state.flags.gd_claimed = true;
              addItem(g, 'golden_dice', 1);
              toast('The flap pops open on its own and the Golden Dice rolls out, a little embarrassed.', 'magic');
              refreshView();
            }, 'magic', { disabled: g.state.eleven.charges < 1 }) : '') : btn('▶ Approach the machine', approachMachine, 'go big', { dataset: { fk: 'approach' } })) : '',
        won && g.state.flags.vm_choice === 'refund' ? btn('☕ Take the coffee the machine kept for you', () => {
          const day = Math.floor(g.state.clock.minutes / 1440);
          if (g.state.flags.vm_coffee_day === day) return toast('The machine says: tomorrow. (It is trying to be firm.)', 'funny');
          g.state.flags.vm_coffee_day = day;
          addItem(g, 'coffee', 1);
          refreshView();
        }, 'small go') : '',
        pet && canSniff(pet) ? btn(`${pet.name}, sniff around`, () => (sniffAround(), refreshView()), 'small') : '',
        btn('◄ Back to the white page', () => navigate('e404'), 'small'),
      ),
    ),
    footer(),
  );
}

if (new URLSearchParams(location.search).has('debug')) {
  (window as unknown as { __maze: unknown }).__maze = () => { ensure(); return { maze, things, pos: pos() }; };
}

registerZone({
  id: 'dungeon',
  render,
  onEnter: () => {
    ensure();
    const g = game();
    const [x, y] = pos();
    markSeen(x, y);
    // raw 404 data does not agree with you unless you can see through it
    if (!g.has('dungeon_corrupt_seen')) {
      g.state.flags.dungeon_corrupt_seen = true;
      applyAilment(g, 'corrupted', 60);
    }
  },
});
