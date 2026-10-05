import type { Game } from '../core/game';
import type { ZoneId } from '../core/types';
import { ZONES } from '../data/zones';
import { enterZone } from '../systems/travel';
import { announce, clear } from './dom';
import type { FrameRefs } from './browserFrame';
import { toast } from './notifications';

export interface ZoneModule {
  id: ZoneId;
  render(): HTMLElement;
  className?: string;
  /** return a message to refuse entry */
  guard?(g: Game): string | null;
  onEnter?(g: Game): void | Promise<void>;
  onLeave?(g: Game): void;
}

const registry = new Map<string, ZoneModule>();
export function registerZone(m: ZoneModule): void {
  registry.set(m.id, m);
}
export const zoneModule = (id: string) => registry.get(id);

let refs: FrameRefs;
let g: Game;
const back: ZoneId[] = [];
const fwd: ZoneId[] = [];
let renderQueued = false;

export function initRouter(frame: FrameRefs, game: Game): void {
  refs = frame;
  g = game;
}

function paint(): void {
  const m = registry.get(g.state.zone);
  const data = ZONES[g.state.zone];
  if (!m) return;
  const prevScroll = refs.viewport.scrollTop;
  const active = document.activeElement as HTMLElement | null;
  const fk = active && refs.viewport.contains(active) ? active.dataset.fk : undefined;
  clear(refs.viewport);
  const el = m.render();
  el.classList.add('zone', `zone-${m.id}`);
  if (m.className) el.classList.add(m.className);
  refs.viewport.appendChild(el);
  refs.viewport.scrollTop = prevScroll;
  if (fk) refs.viewport.querySelector<HTMLElement>(`[data-fk="${fk}"]`)?.focus();
  if (data) {
    refs.setTitle(data.pageTitle);
    refs.setAddress(data.url);
  }
}

export function navigate(zone: ZoneId, opts: { free?: boolean; history?: boolean } = {}): boolean {
  const m = registry.get(zone);
  if (!m) {
    toast('That page is still under construction.', 'info');
    return false;
  }
  const blocked = m.guard?.(g);
  if (blocked) {
    toast(blocked, 'info');
    return false;
  }
  const from = g.state.zone;
  if (from !== zone) {
    registry.get(from)?.onLeave?.(g);
    if (opts.history !== false) {
      back.push(from);
      fwd.length = 0;
    }
  }
  refs.loading();
  enterZone(g, zone, { free: opts.free });
  refs.viewport.scrollTop = 0;
  paint();
  refs.viewport.focus({ preventScroll: true });
  announce(`${ZONES[zone]?.title ?? zone}`);
  void m.onEnter?.(g);
  return true;
}

/** show the current zone without any entering side effects (after load) */
export function showCurrent(): void {
  const zone = g.state.zone;
  const m = registry.get(zone) ?? registry.get('home')!;
  if (!registry.get(zone)) g.state.zone = 'home';
  paint();
  void m.onEnter?.(g);
}

export function refreshView(): void {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    paint();
  });
}

export function goBack(): void {
  const to = back.pop();
  if (!to) return toast('Nothing to go back to. This is the beginning of the internet.', 'info');
  fwd.push(g.state.zone);
  navigate(to, { history: false });
}
export function goForward(): void {
  const to = fwd.pop();
  if (!to) return toast('Nothing ahead. Yet.', 'info');
  back.push(g.state.zone);
  navigate(to, { history: false });
}
export function currentZone(): ZoneId {
  return g.state.zone;
}
