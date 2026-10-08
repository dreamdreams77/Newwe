// Bundle budget: fail the build if the gzipped JavaScript or CSS grows past its limit.
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const LIMITS = { js: 160 * 1024, css: 40 * 1024 }; // gzipped bytes
const dir = new URL('../dist/assets/', import.meta.url);
let bad = false;
for (const [ext, limit] of Object.entries(LIMITS)) {
  const files = readdirSync(dir).filter((f) => f.endsWith(`.${ext}`));
  const total = files.reduce((n, f) => n + gzipSync(readFileSync(new URL(f, dir))).length, 0);
  const pct = ((total / limit) * 100).toFixed(0);
  console.log(`${ext.padEnd(4)} ${(total / 1024).toFixed(1)} kB gzipped of ${(limit / 1024).toFixed(0)} kB budget (${pct}%)`);
  if (total > limit) bad = true;
}
process.exit(bad ? 1 : 0);
