import type { Game } from '../core/game';
import { seeded } from '../core/random';

// A small perfect maze, generated from the world seed so it is the same every visit.

export const MAZE_N = 7;
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

export interface MazeCell {
  x: number;
  y: number;
  open: number; // bitmask of open sides
}

export interface Maze {
  n: number;
  cells: MazeCell[];
  start: [number, number];
  goal: [number, number];
  dist: number[];
}

export function generateMaze(seed: number, n = MAZE_N): Maze {
  const rng = seeded(seed >>> 0);
  const cells: MazeCell[] = Array.from({ length: n * n }, (_, i) => ({ x: i % n, y: Math.floor(i / n), open: 0 }));
  const seen = new Set<number>([0]);
  const stack = [0];
  const dirs: Array<[number, number, number, number]> = [[0, -1, N, S], [1, 0, E, W], [0, 1, S, N], [-1, 0, W, E]];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const cx = cur % n;
    const cy = Math.floor(cur / n);
    const opts = rng.shuffle(dirs).filter(([dx, dy]) => {
      const nx = cx + dx;
      const ny = cy + dy;
      return nx >= 0 && ny >= 0 && nx < n && ny < n && !seen.has(ny * n + nx);
    });
    if (!opts.length) {
      stack.pop();
      continue;
    }
    const [dx, dy, bit, opp] = opts[0];
    const nxt = (cy + dy) * n + (cx + dx);
    cells[cur].open |= bit;
    cells[nxt].open |= opp;
    seen.add(nxt);
    stack.push(nxt);
  }
  // distances from the start (BFS) so the goal is the farthest cell
  const dist = Array<number>(n * n).fill(-1);
  dist[0] = 0;
  const q = [0];
  while (q.length) {
    const c = q.shift()!;
    const cell = cells[c];
    for (const [dx, dy, bit] of dirs) {
      if (!(cell.open & bit)) continue;
      const nn = (cell.y + dy) * n + (cell.x + dx);
      if (dist[nn] < 0) {
        dist[nn] = dist[c] + 1;
        q.push(nn);
      }
    }
  }
  let far = 0;
  dist.forEach((d, i) => {
    if (d > dist[far]) far = i;
  });
  return { n, cells, start: [0, 0], goal: [far % n, Math.floor(far / n)], dist };
}

export interface MazeThing {
  id: string;
  x: number;
  y: number;
  kind: 'note' | 'item' | 'flavor';
  title: string;
  text: string;
  know?: string;
  item?: string;
}

const THINGS: Array<Omit<MazeThing, 'x' | 'y'>> = [
  { id: 'm_pattern', kind: 'note', title: 'A sticky note on a monitor', text: '"The panel lights are all connected to their neighbours. Up, down, left, right. Not corners. — w"', know: 'vm_pattern' },
  { id: 'm_code', kind: 'note', title: 'A note taped to a server rack', text: '"The code is the hour that makes a wish. — w"', know: 'vm_code_hour' },
  { id: 'm_jokes', kind: 'note', title: 'A page torn from a manual', text: '"WARNING: this unit groans audibly at puns. Do not make puns near the unit. (Make puns near the unit.)"', know: 'vm_dad_jokes' },
  { id: 'm_slot', kind: 'note', title: 'A scrap of paper under a cable', text: '"The coin slot just checks the shape. Tape works. Leaves work. Faith works. — w"', know: 'vm_slot_taped' },
  { id: 'm_coin', kind: 'item', title: 'A coin-return tray', text: 'Dust, one lint ball, and a broken brass token snapped neatly in half.', item: 'token_broken' },
  { id: 'm_tools', kind: 'item', title: 'A toolbox labelled DAD', text: 'Inside: a screwdriver, three batteries, and a roll of duct tape that has clearly seen things.', item: 'duct_tape' },
  { id: 'm_crt1', kind: 'flavor', title: 'A CRT', text: 'A single blinking cursor. Somebody typed "hello?" and then, in a different colour, "hello."' },
  { id: 'm_crt2', kind: 'flavor', title: 'A poster', text: 'A faded poster of a swan boat. Underneath: "DON’T FORGET TO WIND THEM UP."' },
];

export const MAZE_THING_IDS = THINGS.map((t) => t.id);

export function placeThings(g: Game, maze: Maze): MazeThing[] {
  const rng = seeded((g.state.seed ^ 0x404) >>> 0);
  const free = maze.cells.filter((c) => !(c.x === 0 && c.y === 0) && !(c.x === maze.goal[0] && c.y === maze.goal[1]));
  // spread across distances: sort by distance then deal alternately from the middle ground
  const shuffled = rng.shuffle(free);
  return THINGS.map((t, i) => ({ ...t, x: shuffled[i].x, y: shuffled[i].y }));
}

export function exits(maze: Maze, x: number, y: number): string[] {
  const c = maze.cells[y * maze.n + x];
  const out: string[] = [];
  if (c.open & N) out.push('north');
  if (c.open & E) out.push('east');
  if (c.open & S) out.push('south');
  if (c.open & W) out.push('west');
  return out;
}
