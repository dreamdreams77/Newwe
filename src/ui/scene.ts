import { BALANCE } from '../config/balance';
import { game } from '../core/runtime';
import { addBuff } from '../core/timeSystem';
import type { HiddenSpot } from '../data/zones';
import { ZONES } from '../data/zones';
import { ITEMS } from '../data/items';
import { addVisitors } from '../systems/hits';
import { changeVital, statValue } from '../systems/stats';
import { passTime } from '../systems/actions';
import { h, btn } from './dom';
import { held, setHeld } from './held';
import { toast } from './notifications';
import { refreshView } from './router';

export interface Hotspot {
  id: string;
  label: string;
  /** percent of the scene box */
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: 'npc' | 'object' | 'exit' | 'item';
  onClick(): void;
  /** return true if the held item did something */
  onItem?(itemId: string): boolean | void;
  hidden?: boolean;
  /** extra text for screen readers / tooltip */
  hint?: string;
}

export interface SceneOpts {
  zone: string;
  /** native pixel size of the painted canvas */
  width: number;
  height: number;
  paint(ctx: CanvasRenderingContext2D, w: number, h: number): void;
  hotspots: Hotspot[];
  className?: string;
  caption?: string;
}

/** A painted pixel scene with old-school image-map hotspots over it. */
export function scene(opts: SceneOpts): HTMLElement {
  const canvas = h('canvas', { class: 'px scene-canvas', attrs: { width: opts.width, height: opts.height, role: 'img', 'aria-label': opts.caption ?? ZONES[opts.zone]?.title ?? 'scene' } });
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  opts.paint(ctx, opts.width, opts.height);

  const box = h('div', { class: `scene-box ${opts.className ?? ''}`, style: `aspect-ratio:${opts.width}/${opts.height}` }, canvas);

  for (const hs of opts.hotspots) {
    if (hs.hidden) continue;
    const b = h(
      'button',
      {
        type: 'button',
        class: `hotspot ${hs.kind ?? 'object'}`,
        style: `left:${hs.x}%;top:${hs.y}%;width:${hs.w}%;height:${hs.h}%`,
        title: hs.label,
        ariaLabel: hs.hint ? `${hs.label}. ${hs.hint}` : hs.label,
        dataset: { fk: `hs-${hs.id}` },
        onclick: () => {
          const item = held();
          if (item) {
            const handled = hs.onItem?.(item);
            if (handled) setHeld(null);
            else toast(`Nothing happens when you use the ${ITEMS[item]?.name ?? 'thing'} on the ${hs.label}.`, 'info');
            return;
          }
          hs.onClick();
        },
      },
      h('span', { class: 'hs-label' }, hs.label),
    );
    box.appendChild(b);
  }

  spotButtons(opts.zone).forEach((b) => box.appendChild(b));

  const tools = squintTools(opts.zone);
  return h('div', { class: 'scene' }, box, tools);
}

export function spotsLeft(zoneId: string): HiddenSpot[] {
  const g = game();
  const zone = g.zone(zoneId);
  return (ZONES[zoneId]?.spots ?? []).filter((s) => !zone.found.includes(s.id));
}

/** hidden visitors: Observation makes them glint, Squint helps. Place inside any position:relative box. */
export function spotButtons(zoneId: string): HTMLElement[] {
  const g = game();
  const zone = g.zone(zoneId);
  const obs = statValue(g, 'observation');
  return spotsLeft(zoneId).map((sp) => {
    const glint = obs >= sp.obs;
    return h(
      'button',
      {
        type: 'button',
        class: `spot ${glint ? 'glint' : ''}`,
        style: `left:${sp.x}%;top:${sp.y}%`,
        ariaLabel: glint ? 'Something glints' : undefined,
        tabindex: glint ? 0 : -1,
        attrs: glint ? {} : { 'aria-hidden': 'true' },
        dataset: { fk: `spot-${sp.id}` },
        onclick: () => {
          zone.found.push(sp.id);
          g.sfx('tick');
          toast(sp.text, 'funny');
          addVisitors(g, BALANCE.hits.hiddenVisitor, 'found a hidden visitor');
          g.changed();
        },
      },
      h('span', { class: 'spot-dot', attrs: { 'aria-hidden': 'true' } }),
    );
  });
}

export function squintTools(zoneId: string): HTMLElement {
  const g = game();
  const spots = spotsLeft(zoneId);
  const squinting = g.state.buffs.some((b) => b.label === 'Squinting');
  return h(
    'div',
    { class: 'scene-tools' },
    btn(squinting ? 'Squinting…' : 'Squint (1 ☕)', () => squint(), 'small', { disabled: squinting || g.state.vitals.coffee < 1, title: 'Look harder for a while. Hidden things glint.' }),
    spots.length ? h('span', { class: 'scene-note' }, `${spots.length} hidden thing${spots.length > 1 ? 's' : ''} left here`) : h('span', { class: 'scene-note' }, 'You have found everything hidden here.'),
  );
}

function squint(): void {
  const g = game();
  if (g.state.vitals.coffee < 1) return;
  changeVital(g, 'coffee', -1);
  addBuff(g, 'observation', 4, 45, 'Squinting');
  passTime(g, 2);
  g.sfx('click');
  toast('You squint. The page gets sharper. Hidden things start to glint.', 'info');
  refreshView();
}
