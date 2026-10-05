import { cursorFor } from './sprites';
import { ITEMS } from '../data/items';

// "Holding" an item turns the cursor into that item (old point-and-click style).
// Zones read `held` when a hotspot is clicked.

let heldId: string | null = null;
const subs = new Set<() => void>();

export const held = () => heldId;
export function onHeldChange(fn: () => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}
export function setHeld(id: string | null): void {
  heldId = id;
  const root = document.body;
  if (id) {
    root.style.setProperty('--held-cursor', cursorFor(ITEMS[id]?.icon ?? 'star'));
    root.classList.add('holding');
  } else {
    root.classList.remove('holding');
    root.style.removeProperty('--held-cursor');
  }
  subs.forEach((f) => f());
}
