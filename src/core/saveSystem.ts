import { createInitialState, Game, SAVE_VERSION } from './game';
import type { GameState } from './types';
import { decodeState, encodeState } from './saveCodec';

const KEY = 'eleven-eleven:save:v1';

// ---------------------------------------------------------------- localStorage

export function loadFromStorage(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveToStorage(state: GameState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* private mode etc. */
  }
}

/** Fill in anything an older save is missing so new systems never crash on old data. */
export function migrate(raw: unknown): GameState {
  const base = createInitialState((raw as GameState)?.seed ?? 1);
  const s = raw as Partial<GameState>;
  const merged: GameState = {
    ...base,
    ...s,
    vitals: { ...base.vitals, ...s.vitals },
    stats: { ...base.stats, ...s.stats },
    clock: { ...base.clock, ...s.clock },
    eleven: { ...base.eleven, ...s.eleven },
    cards: { ...base.cards, ...s.cards },
    recipes: { ...base.recipes, ...s.recipes },
    guestbook: { ...base.guestbook, ...s.guestbook },
    ui: { ...base.ui, ...s.ui },
    settings: { ...base.settings, ...s.settings },
    myPage: { ...base.myPage, ...s.myPage },
    counters: { ...base.counters, ...s.counters },
    inspector: { ...base.inspector, ...s.inspector },
    version: SAVE_VERSION,
  };
  return merged;
}

/** Wire autosave to a game (debounced). */
export function installAutosave(g: Game, debounceMs = 250): () => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  g.onChanged = () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => saveToStorage(g.state), debounceMs);
  };
  const flush = () => saveToStorage(g.state);
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  return () => {
    g.onChanged = undefined;
    window.removeEventListener('pagehide', flush);
  };
}

// ----------------------------------------------------------- password-style export
//
// SAVE PASSWORD  "7F9K-11XQ-..."  — the state is deflated, framed with a
// checksum and written in Crockford base-32 groups of four.

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function checksum(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const x of bytes) {
    a = (a + x) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function toBase32(bytes: Uint8Array): string {
  let out = '';
  let bits = 0;
  let acc = 0;
  for (const b of bytes) {
    acc = (acc << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(acc >>> (bits - 5)) & 31];
      bits -= 5;
    }
    acc &= (1 << bits) - 1;
  }
  if (bits > 0) out += ALPHABET[(acc << (5 - bits)) & 31];
  return out;
}

function fromBase32(str: string): Uint8Array {
  const clean = str.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V');
  const out: number[] = [];
  let bits = 0;
  let acc = 0;
  for (const ch of clean) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) throw new Error('bad character');
    acc = (acc << 5) | v;
    bits += 5;
    if (bits >= 8) {
      out.push((acc >>> (bits - 8)) & 255);
      bits -= 8;
    }
    acc &= (1 << bits) - 1;
  }
  return Uint8Array.from(out);
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const blob = new Blob([bytes as BlobPart]);
  const out = await new Response(blob.stream().pipeThrough(stream as unknown as ReadableWritablePair<Uint8Array, Uint8Array>)).arrayBuffer();
  return new Uint8Array(out);
}

export async function exportPassword(state: GameState): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(encodeState(state)));
  const z = await pipe(json, new CompressionStream('deflate-raw'));
  const sum = checksum(z);
  const framed = new Uint8Array(z.length + 6);
  framed[0] = 0x11; // magic
  framed[1] = 2; // codec version
  framed.set(z, 2);
  framed[2 + z.length] = sum & 255;
  framed[3 + z.length] = (sum >>> 8) & 255;
  framed[4 + z.length] = (sum >>> 16) & 255;
  framed[5 + z.length] = (sum >>> 24) & 255;
  const raw = toBase32(framed);
  return raw.match(/.{1,4}/g)!.join('-');
}

export async function importPassword(code: string): Promise<GameState> {
  const framed = fromBase32(code);
  if (framed.length < 8 || framed[0] !== 0x11) throw new Error('That password is not from this game.');
  // the trailing base-32 padding can leave a byte of slack; find the real end via checksum
  for (let extra = 0; extra < 3; extra++) {
    const end = framed.length - extra;
    const body = framed.slice(2, end - 4);
    const want = (framed[end - 4] | (framed[end - 3] << 8) | (framed[end - 2] << 16) | (framed[end - 1] << 24)) >>> 0;
    if (checksum(body) === want) {
      const json = await pipe(body, new DecompressionStream('deflate-raw'));
      const parsed = JSON.parse(new TextDecoder().decode(json));
      return Array.isArray(parsed) ? decodeState(parsed) : migrate(parsed);
    }
  }
  throw new Error('The password has a typo in it. (Checksum failed.)');
}
