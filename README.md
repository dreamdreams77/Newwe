# 11:11 — The Lost Homepage

> A fully playable browser game disguised as an abandoned early-2000s personal homepage.

It looks like someone's terrible GeoCities page: tiled stars, a blinking marquee, a hit counter, a guestbook, an
"Under Construction" sign, a broken link. It plays like a surprisingly serious little RPG: dice-pool
resolution, a card deck built out of your inventory, discovered crafting, a creature you raise, an
ecosystem that remembers what you did to it, puzzle zones, and puzzle-combat against a vending machine.

**The website is the game world.** Every piece of old-web furniture turns out to be a game system:

| It looks like | It actually is |
|---|---|
| Hit counter | A progression system. Thresholds (100 / 250 / 500 / 777 / **1,111**) unlock things |
| Guestbook | The quest interface: entries are clues, gifts, deduction puzzles — and they edit themselves |
| Web ring | The world map. Broken images with alt text are the sites you haven't found yet |
| Fake 404 | A secret dungeon entrance (*"PAGE FOUND."*) |
| "Under Construction" | A zone, a worker named Bob, and a mini fridge that hums |
| The Webmaster's mug | Your stamina economy (Coffee) |
| The address bar | Works. Anything it does not recognise is, of course, a 404 |

The site evolves while you play: flat HTML nostalgia → *something is wrong* → pixel-RPG menus appear →
the page is alive and reacting → *the website renders itself around you*.

## Play it

```bash
npm install
npm run dev          # http://localhost:5173
# or
npm run build && npm run preview
```

Mouse or keyboard (Tab / Enter / Esc). On mobile the browser frame adapts: the toolbar collapses to icons.
Add `?seed=1234` to the URL to replay the exact same dice, `?fresh` to ignore your save, `?debug` to expose
`window.__game` for tests.

## The vertical slice (what is in here)

Five playable zones with a real loop — homepage → guestbook → **Swan-Boat Lake** → **Lighthouse** → the
**fake 404 dungeon** — and one proper puzzle-combat boss. All eleven stats, the 11:11 wish mechanic, the
eight inventory items, discovered crafting (logical / riddle-by-time / chaos), a creature, an NPC cast,
a hit counter that matters, saves (autosave + a password-style export), and a finale teaser.

A plausible first playthrough (the e2e test plays exactly this with real clicks):

1. Enter the homepage. Pour coffee from the webmaster's mug → the inventory appears.
2. The guestbook: read entries, take the swan-boat ticket and the Tasmania postcard.
3. Under Construction: give Bob a coffee (Duct Tape + a Dad Joke card); notice the humming fridge (Observation roll) → **One Extremely Important Yoghurt**. *Do not eat it. (You can. It is a legitimate mistake.)*
4. Around 11:11 on the in-game clock the counter flickers and the first wish arrives. The website changes.
5. Swan-Boat Lake: show Gus the ticket, ride out, listen to the hummed melody, play it back on the lily pads (an audio/memory puzzle) → a card, **The World's Least Useful Key**, and the page becomes a game.
6. Strip the willow bare (the zone remembers). Find and befriend a **Tiny Chocobo** in the reeds. Feed it. Different foods make different chocobos.
7. The guestbook has a new impossible entry. A "who wrote this?" deduction → a memory that becomes a card.
8. Lighthouse: deliver the yoghurt to Marl (or fix the stuck lamp with Dad Energy, Creativity or Courage) → the lamp comes on. Hold the **postcard** under it — nobody tells you to — and a hidden cryptogram appears. The keeper's book has the key if you bookmark it with a **willow leaf**.
9. "404 is an address. Bring the useless key." The broken link now says **PAGE FOUND.** and the key opens it.
10. A small maze (notes in it are *Boss Knowledge*), then **VM-1111, the Vending Machine of Judgment**: a lights puzzle, exact change, a keypad ("the hour that makes a wish"), and a final choice. Spend 11:11 to bend a rule or change a failed roll.
11. The counter reaches 1,111 and the page renders itself.

## Design rules this build follows

- **Everything connects.** A yoghurt is a quest item, creature food, a card, a clue, a memory trigger, a joke, and it perishes in game time. A guestbook entry can start a quest, hand you an item, reveal a web-ring site, carry a deduction "tell", or change after you do something.
- **Stats do not auto-solve puzzles.** *Puzzle Sense* nudges (a faint glow, a bolder letter); *Memory* buys replays; *Observation* makes hidden visitors glint; *Boss Knowledge* (a literal count of things you have learned) reveals encounter details; *Creativity* unlocks alternate approaches.
- **Luck raises the floor; Chaos widens the spread.** (Luck re-rolls your lowest die. Chaos turns dice into wild d12−3 dice: same average, bigger swings, more crits and more disasters.) Both are unit-tested.
- **11:11 is rare and specific, never an undo button.** It rerolls a *failed* roll with a bonus, bends one puzzle rule, opens one jammed flap, or opens the unlabelled button. It is gained from the in-game clock hitting 11:11, the *real* clock hitting 11:11, snake eyes, a counter coincidence, or a finished memory.
- **Content is data.** Items, cards, creatures, recipes, quests, dialogue, guestbook entries, encounters, zones and puzzles live in `src/data/`. Tuning lives in one file (`src/config/balance.ts`).
- **Nostalgia is visual and mechanical, not bad UX.** Marquees, bevels and blinking text are real, but every interactive thing is a keyboard-reachable button with a visible focus ring, there is a reduced-motion switch (and `prefers-reduced-motion` is honoured), text scaling, an "outline clickable things" option, and a Squint button.

## Architecture

```
src/
  core/       gameState (Game), eventBus, seeded random, saveSystem + saveCodec, timeSystem, progression, runtime
  config/     balance.ts   <- every difficulty/pacing number
  systems/    stats inventory cards cardPlay dice crafting creatures quests memories(effects) ecosystem
              elevenEleven hits combat maze guestbook itemUse travel actions conditions effects hints
  data/       items cards creatures recipes quests dialogue guestbook encounters puzzles zones memories knowledge personal
  world/      homepage guestbook construction lake lighthouse e404 dungeon mypage finale + pageKit, ticket, sniff
  ui/         browserFrame router windows scene dice dialogue inventory cards panels memories settings
              combat splash sprites scenes puzzle/ (lilyChime deduction cryptogram)
  audio/      audioManager sfx music    (Web Audio only: no sound files)
  styles/     base browser homepage windows rpg scenes puzzles combat stages
```

Layers only point downwards: `systems` never import `ui`; `world` composes data + systems + ui. Systems are plain
functions of a `Game`, so they are tested without a DOM. State is centralised in one serialisable object.
A small declarative language of **Conditions** (`{has:'key'}`, `{flag:'lamp_lit'}`, `{stat:'courage',gte:4}` …) and
**Effects** (`{t:'item'}`, `{t:'hits'}`, `{t:'memory'}` …) is shared by items, cards, dialogue, quests and memories, which is
what lets the systems keep talking to each other.

### Randomness
One seeded RNG (mulberry32) whose state lives in the save. Chaos is learnable variance, not noise: the dice
math is in `src/systems/dice.ts` and tuned in `src/config/balance.ts`.

### Saves
Autosaves to `localStorage` after any change. **File → Save Password** (or *Options*) produces a compact,
checksummed, Crockford-base32 password like `2418-AMJX-HYDK-047W-…` (positional codec + deflate); paste it back to load. It
tolerates `O/0` and `I/L/1` typos.

### Personal content
`personal/*.json` overrides placeholder memories/photos/voice clips/notes (`MEMORY_001`, `MEMORY_002`,
`PHOTO_001`, `VOICE_001`, `NOTE_001`, `OWNER`) with no code change. See `personal/README.md`. A stranger can play the
placeholder version; someone who knows the private context finds more.

## Tests

```bash
npm test                 # 47 unit tests: dice (luck vs chaos), crafting, cards, creatures, ecology, quests, saves, content integrity
npm run build && (npx vite preview --port 4173 &) \
  && PLAYWRIGHT_PATH=<path>/playwright/index.mjs node tests/e2e/playthrough.mjs
```

The e2e script plays the whole slice with real clicks in a real browser, adapts to dice outcomes (so it works for any seed),
reloads to prove saves persist, and fails on any console error or warning.

## What is deliberately not here yet

Four more web-ring zones (Terminal, Forest, Vending Machine Dungeon, Tasmania) appear as broken tiles with
alt-text. The 11:11 Room is a finale *preview*. The homepage customiser is a slot-based trophy shelf rather than free placement.
Those are the next builds; the data layer and systems were written so they slot in without rewrites.
