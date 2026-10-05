import { game } from '../core/runtime';
import { ZONES } from '../data/zones';
import { WORLD } from '../data/world';
import { objectState } from '../systems/worldModel';
import { test } from '../systems/conditions';
import { OWNER } from '../data/personal';
import { h } from './dom';
import { openWindow } from './windows';

/** "View → Page Source": the HTML behind the page, generated from the world. It leaks a little. */
export function pageSourceLines(zone: string): string[] {
  const g = game();
  const z = ZONES[zone];
  const s = g.state;
  const L: string[] = [
    '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2//EN">',
    '<html>',
    '<head>',
    `<title>${z?.pageTitle ?? zone}</title>`,
    '<meta name="generator" content="Notepad">',
    `<meta name="author" content="${OWNER.handle}">`,
    '<!-- last edited by w, probably at night -->',
    '</head>',
    '<body bgcolor="#000033" text="#FFFFFF" link="#00FFFF" vlink="#FF00FF">',
    '<!-- TODO: take out the debugging junk -->',
  ];
  if (zone === 'home') {
    L.push(`<marquee>you are visitor #${s.visitors}</marquee>`, '<table><tr><td> <!-- layout. do not touch. -->');
    if (s.stage >= 2) L.push('<!-- debug view: about:inspector -->');
    if (s.stage >= 2) L.push('<!-- version history: about:version -->');
    if (g.has('inspector_on')) L.push('<!-- /dev/ is not linked from anywhere. on purpose. -->');
  }
  L.push(`<!-- zone: ${zone}  visits: ${g.zone(zone).visits} -->`);
  // objects on this page: the state attribute is a hint about what depends on what
  for (const o of WORLD) {
    if (o.zone !== zone || !test(g, o.known)) continue;
    L.push(`<object id="${o.label}" state="${objectState(g, o)}" kind="${o.kind}"></object>`);
  }
  if (zone === 'lighthouse') L.push('<!-- the lamp has more than one way to be lit. nobody tells the visitors. -->');
  if (zone === 'e404') L.push('<!-- <h1>404</h1> would have been fine. -->', s.stage >= 3 ? '<!-- the lock is small. -->' : '');
  if (zone === 'dungeon') L.push('<!-- vm-1111 : exact change only. the hour that makes a wish. -->');
  L.push('<noscript>This page requires nothing. It requires you.</noscript>', '</body>', '</html>');
  return L.filter((x) => x !== '');
}

export function openSource(zone: string): void {
  const g = game();
  if (!g.has('source_read')) {
    g.state.flags.source_read = true;
    g.changed();
  }
  openWindow({
    id: 'source',
    title: `Source of ${ZONES[zone]?.url ?? zone}`,
    icon: 'book',
    className: 'source-win',
    width: 'min(820px, 98vw)',
    render: (body) => body.append(h('pre', { class: 'source-pre' }, pageSourceLines(zone).join('\n'))),
  });
}
