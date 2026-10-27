import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// A static content-graph check. The game is data-driven: gates test flags and knowledge, effects set them.
// If a gate tests something nothing ever sets, that content is permanently locked. This finds those.

const SRC = path.resolve(__dirname, '../src');
function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith('.ts') ? [path.join(dir, d.name)] : []));
}
const files = walk(SRC);
const text = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

/** flags that exist by construction (dynamic prefixes, set through generic helpers or the engine) */
const DYNAMIC = /^(visited_|has_had_|read_|taken_|hits_|maze_loot_|rumor_heard_|rumor_checked_|seen_|poke_|met_|fx:)/;

function names(re: RegExp): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(re)) out.add(m[1]);
  return out;
}

const reads = new Set<string>([
  ...names(/\bflag:\s*'([A-Za-z0-9_]+)'/g),
  ...names(/\bnotFlag:\s*'([A-Za-z0-9_]+)'/g),
  ...names(/\bg\.has\('([A-Za-z0-9_]+)'\)/g),
  ...names(/\bs\.has\('([A-Za-z0-9_]+)'\)/g),
  ...names(/\bflags\.([A-Za-z0-9_]+)\b(?!\s*=[^=])/g),
]);
const writes = new Set<string>([
  ...names(/\bflags\.([A-Za-z0-9_]+)\s*=[^=]/g),
  ...names(/\bflags\['([A-Za-z0-9_]+)'\]\s*=[^=]/g),
  ...names(/\bt:\s*'flag',\s*key:\s*'([A-Za-z0-9_]+)'/g),
  ...names(/\bkey:\s*'([A-Za-z0-9_]+)'/g),
  ...names(/\bflag:\s*'([A-Za-z0-9_]+)',\s*value/g),
]);
// flags written through a data table (zone `done`/`when` aside) are listed here with the reason
const ENGINE_SET = new Set(['finale_ready', 'game_started', 'intro_seen', 'terminal_on', 'inspector_on', 'source_read', 'creature_met', 'maze_seen_mask']);

describe('content graph', () => {
  it('every flag a gate reads is set somewhere (no permanently locked content)', () => {
    const orphans = [...reads].filter((f) => !writes.has(f) && !DYNAMIC.test(f) && !ENGINE_SET.has(f)).sort();
    expect(orphans, `flags read but never set: ${orphans.join(', ')}`).toEqual([]);
  });
  it('every knowledge id that is learned or required is defined', () => {
    const defined = new Set([...text.matchAll(/^ {2}([a-z0-9_]+): '/gm)].map((m) => m[1]));
    const used = names(/\bknow:\s*'([a-z0-9_]+)'/g);
    const learned = new Set([...names(/\blearn\(g,\s*'([a-z0-9_]+)'\)/g), ...names(/\bt:\s*'know',\s*id:\s*'([a-z0-9_]+)'/g)]);
    const missing = [...new Set([...used, ...learned])].filter((k) => !defined.has(k));
    expect(missing, `knowledge ids used but not defined: ${missing.join(', ')}`).toEqual([]);
  });
});
