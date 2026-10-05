import type { Game } from '../core/game';
import { ENTRY_BY_ID, GUEST_ENTRIES, SIGN_PRESETS, type GuestEntry } from '../data/guestbook';
import { test } from './conditions';
import { addVisitors } from './hits';
import { addItem } from './inventory';
import { raiseStat } from './stats';
import { grantMemory } from './effects';
import { BALANCE } from '../config/balance';

export function visibleEntries(g: Game): GuestEntry[] {
  return GUEST_ENTRIES.filter((e) => test(g, e.visible)).sort((a, b) => b.order - a.order);
}

export function unreadCount(g: Game): number {
  return visibleEntries(g).filter((e) => !g.state.guestbook.read.includes(e.id)).length;
}

export function readEntry(g: Game, id: string): void {
  const gb = g.state.guestbook;
  if (!gb.read.includes(id)) {
    gb.read.push(id);
    g.state.flags[`read_${id}`] = true;
    g.sfx('page');
    // reading *everything* is rewarded
    if (visibleEntries(g).every((e) => gb.read.includes(e.id)) && !g.state.flags.gb_all_read) {
      g.state.flags.gb_all_read = true;
      addVisitors(g, 24, 'read every entry');
    }
    g.changed();
  }
}

export function canTake(g: Game, e: GuestEntry): boolean {
  return !!e.attachment && !g.state.guestbook.taken.includes(e.id) && test(g, e.attachment.when);
}

export function takeAttachment(g: Game, id: string): boolean {
  const e = ENTRY_BY_ID[id];
  if (!e || !canTake(g, e)) return false;
  g.state.guestbook.taken.push(id);
  g.state.flags[`taken_${id}`] = true;
  addItem(g, e.attachment!.item, 1);
  return true;
}

export function signGuestbook(g: Game, name: string, presetIndex: number, custom?: string): string {
  const gb = g.state.guestbook;
  if (gb.signed) return 'You already signed it. The guestbook remembers.';
  const preset = SIGN_PRESETS[presetIndex] ?? SIGN_PRESETS[0];
  const text = (custom && custom.trim()) || preset.text;
  gb.signed = `${(name || 'Visitor #73').slice(0, 24)}|${text.slice(0, 120)}`;
  g.state.flags.guestbook_signed = true;
  raiseStat(g, preset.effect, 1);
  addVisitors(g, BALANCE.hits.firstVisit.guestbook, 'signed the guestbook');
  g.log('Signed the guestbook.');
  g.changed();
  return preset.reply;
}

// ---- the "who wrote this?" deduction puzzle

export function deductionState(g: Game) {
  return g.state.puzzles['deduction'] ?? (g.state.puzzles['deduction'] = { solved: false, attempts: 0 });
}

export function solveDeduction(g: Game): void {
  const p = deductionState(g);
  if (p.solved) return;
  p.solved = true;
  g.state.flags.deduction_solved = true;
  grantMemory(g, 'MEMORY_001');
  addVisitors(g, BALANCE.hits.puzzle, 'deduced it');
  g.sfx('puzzle');
  g.changed();
}
