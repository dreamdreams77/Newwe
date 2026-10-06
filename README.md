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


## The hidden layers (what is underneath)

There are three games stacked here, and the player discovers each one themselves:

1. **The surface**: an abandoned 2001 homepage. Click around.
2. **The RPG**: dice, cards, crafting, a creature, puzzle-combat.
3. **The machine**: the website behaves like a small computer system, and you can poke at it.

Everything in layer 3 is a *view over one table*, the **World Model** (`src/data/world.ts`): named objects with a
readable state and a list of dependencies. The Inspector, Handbook, page source, terminal, the `/dev/` gate and
the final SYSTEM STATUS all read it; none has its own copy of the truth.

| You find it by | What it is |
|---|---|
| View → Page Source | The HTML behind the page. At stage 2 it leaks `about:inspector` (badge: I READ THE SOURCE) |
| `about:inspector` (or a note behind a tower brick) | **The Inspector.** Starts blind (`??? = ?`). Probe to look deeper; how deep depends on your Observation. Inspect mode turns every object on the page into a clickable readout |
| Help → Handbook | Encyclopedia that never fills itself in. Unknown entries say UNKNOWN; recipes you haven't made are never listed |
| Clicking things repeatedly | "Chair." … "Still a chair." … and a few pay off once (a floppy disk, a note about XOR) |
| `/dev/` (typed, never linked) | Guarded by a **pseudo-code lock with an XOR**: exactly one of two things must be true. No coding required |
| The developer room | `debug.cfg` (the Inspector sees further, for free), a Broken Mouse, a prototype creature, todo.txt |
| `about:terminal` | WHOAMI, LOOK, MAP, INSPECT, HISTORY… plus commands that are never documented |
| `about:version` | Site version history. Old versions remember things before they happen |
| File → Save Files | HOMEPAGE.HTML, FINAL.HTML (New Game+), a playable **corrupted save**, and UNKNOWN |

Design rules for this layer: real consequences (how you lit the lamp changes the guestbook, the homepage news and
whether you still have a token for the boss), several ways through every major block (the 404 door opens with the key,
a jimmied lock, a typed address, or a Broken Mouse), controlled bugs the game acknowledges ("That shouldn't have
worked."), and NPC rumours that disagree and have verdicts the world can check.


## Status effects and equipment

Both are data (`src/data/ailments.ts`, `equip` blocks on items) and both change what you can DO, not only a number.

**Status effects.** JITTERY (too much coffee: faster, chaotic, now and then your hand jerks and you misclick), CRASHED
(coffee at zero: Puzzle Sense down, slower, careful options off; the first crash costs twenty minutes and something kind
happens), CORRUPTED (the Inspector garbles one line and admits it), LOST (the maze map forgets, the web ring stops naming
things), OUT OF SYNC (the clock lies by seven minutes), OVERWRITTEN (your strongest stat reverts to its starting value),
INSPIRED, LUCKY. They come from things that happen: eating the yoghurt, tasting the sludge, a warm cola from the
vending machine, rolling the Golden Dice just after 11:11 (its version history warned you), wandering the maze,
entering the 404 without goggles. They expire on the in-game clock and show on the HUD, the Status window, the page
itself, the terminal and the Handbook (which only lists the ones you have had).

**Equipment** (Head / Body / Hands / Accessory / Tool / Website Badge, plus your Companion): CRT Monitor Goggles (immune to
CORRUPTED, the Inspector sees deeper), Duct-Tape Gloves (from Bob, but only if your Dad Energy earns them), the Keeper's Coat
(never LOST, coffee lasts longer), the Lighthouse Lens (hidden things glint, Squint lasts longer), the Webmaster Badge (NPCs
admit whether their own rumours are true), the Broken Mouse (clicks things the page considers inaccessible, including a
second way past the `/dev/` gate) and a junk Receipt for Nothing that turns out to be lucky.

## Playstyle identity and weaknesses

Your playstyle is derived from how far you have grown stats past the start, never picked from a menu and never saved. Tinkerer (Creativity + Puzzle Sense), Gambler (Luck + Chaos), Daredevil (Courage + Dad Energy), Scholar (Curiosity + Observation) and Keeper (Nurture + Memory) each carry one small perk that plugs into an existing system (boss fury, crafting odds, hit damage, Inspector depth, companion energy). Until one pair clearly leads you are a Drifter. Bosses can have a weakness you only get by learning it in the world: VM-1111 cannot bear a pun, and once you know that, calming cards hit harder.

## The Dead Link Salesman and the Glitch Sprite

Once the 404 page is open, a man stands in the link. He deals only in things that no longer work: a Glitch Sprite in a jar for a Floppy Disk and a Receipt (or just the Floppy, if you can haggle with Luck), and VM-1111's weakness for a Suspicious Snack. The Sprite is not a pet. It lives in the new Familiar equipment slot, and once per boss fight it makes the machine miss a frame (the next hit passes through). The glitch splashes CORRUPTED on you, unless you are wearing the CRT goggles. Relics (the Edge Coin, the Stopped Clock, the Chain Letter) sit in their own slot, and each one trades a strength for a weakness: the coin gives Luck and takes Courage, the clock slows time and dulls Observation, the letter makes rare crafting results (and disasters) likelier. A merchant, a status effect, equipment and the fight system all meet in one choice.

## Knacks

There is no XP bar and no level number. How far you have grown since the start (total stat points gained) earns you a pick at 2, 5 and 9: choose one of two permanent Knacks from the Status window. Steady Hands forgives the first mistake of every boss fight, Quick Study counts as one more thing known about the boss, Second Wind heals on a solved phase, Night Owl shaves a tenth off all time, Lucky Streak gives +2 Luck, Archivist makes Inspector probes free. They are stored as one flag, so saves and passwords carry them with no format change.

## The second boss, the Terminal, and a few throwbacks

Beating the Vending Machine opens **The 11:11 Room** on the web ring: *The Broken Homepage*, a five-phase puzzle boss that matches the original brief. A banner pattern to memorise (always left-right symmetrical), a corrupted guestbook with one entry from the future, a cryptogram shifted by W's favourite number, a four-key memory sequence, and a final choice that is not labelled correct (restore it, rebuild it, or leave it broken on purpose; each changes a stat, an item and the finale text). Observation buys extra looks at the banner, Memory buys extra replays of the keys, Puzzle Sense rules things out, and everything the room teaches you shows up in Boss Knowledge. Its weakness is kindness, not cleverness.

**The Terminal** is a retro-RPG menu page on the ring: a strategy guide that only fills in what you have actually learned (everything else is `???`), and a crossword whose answers it will only accept if the world has already told you. And there is a Konami code.

Retro polish: fights open with the classic flash-and-bars battle wipe (skipped under reduced motion) and a falling-beeps sound, a boss win plays a da-da-da-DAAA fanfare, the ▶ menu cursor appears on every choice, fights and the Terminal get a faint CRT scanline sheen, and toasts get out of the way (and click-through) while a fight is open.

Note for anyone with an old save password: zones and items are part of the compact save codec's flag dictionary, so passwords from before these additions will not decode. Autosave in the same browser is unaffected.

## The Whispering Woods

The web ring's Forest (it unlocks when the lake is solved) is a nature fan page by a hermit called Fern. It has an ecosystem (a mushroom ring that shrinks when you pick and regrows with the clock), a hermit with rumours you can verify, a quest, a memory, a card, and a puzzle that uses the game clock: the trail has three forks, the right way is a fair coin flip from your world seed, and the foxfire only shows it at dusk and at night. By day, a sharp eye (Observation) can read the moss one fork at a time. Guess wrong and you are LOST, back at the first fork, which the Ring of the Old Oak (the reward at the end, counted one ring at a time) cures for good. Mushrooms nibbled raw make you INSPIRED, and Foxfire Tea (mushroom plus coffee) is a crafting discovery.

## Pacing notes (measured, not guessed)

A natural full run of the original slice (no shortcuts for stats) ends around 14:48 on day 1 with about 1,350 visitors, so the 1,111 finale gate arrives without grinding, and all the extras (second boss, Forest, crossword) are surplus. Total stat growth over that run is only about 5 points, which is why Knack tiers sit at 2, 5 and 9 (they were 4, 10 and 18, and the last two were out of reach). The Forest's foxfire needs dusk, so the stump by Fern's lantern lets you wait for it (costing the time and the coffee that goes with it) instead of leaving you stuck at midday.

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


## Giving it as a gift

The game is one static page: no accounts, no server, no tracking. Saves live in the player's own browser, so the person
you give it to has their own game.

1. **Get a link.** Pushing to `main` deploys automatically via `.github/workflows/pages.yml`. In the GitHub repo,
   Settings → Pages → Source: *GitHub Actions* (the workflow tries to switch this on itself). The link is
   `https://<your-user>.github.io/<repo>/`. Add `?fresh` if you want to test without touching your own save.
   Alternatively `npm run build` and put the `dist/` folder on any web host, or open it from any static file server.
2. **Make it theirs (optional).** Copy `personal/gift.json.example` to `personal/gift.json` and edit it: a dedication
   (shown on the title screen and again at the end), the webmaster's handle, and the sticky-note text. Photos, voice
   clips and private memories drop into the same file; see `personal/README.md`. Leave the folder empty and the game is
   the fully fictional version, which a stranger can play.
3. **Let them start cold.** The first thing they see is a fake 28.8k modem loader and an ENTER button, then a
   homepage that is a little wrong. There is no tutorial on purpose. If they get stuck, the Handbook (Help menu, after the
   first 11:11) and `Options → Always outline clickable things` help; Tab and Enter work everywhere.
4. **Sound** is off until they press ENTER (browsers insist) and music is off by default. Headphones recommended.
5. **Their progress** saves automatically. File → Save Password gives a copyable code if they ever switch devices.

## Tests

```bash
npm test                 # 76 unit tests: dice (luck vs chaos), crafting, cards, creatures, ecology, quests, saves, content integrity
npm run build && (npx vite preview --port 4173 &) \
  && PLAYWRIGHT_PATH=<path>/playwright/index.mjs node tests/e2e/playthrough.mjs   # also: tests/e2e/systems.mjs, tests/e2e/hidden.mjs, tests/e2e/gear.mjs
```

The e2e script plays the whole slice with real clicks in a real browser, adapts to dice outcomes (so it works for any seed),
reloads to prove saves persist, and fails on any console error or warning.

## What is deliberately not here yet

Four more web-ring zones (Terminal, Forest, Vending Machine Dungeon, Tasmania) appear as broken tiles with
alt-text. The 11:11 Room is a finale *preview*. The homepage customiser is a slot-based trophy shelf rather than free placement.
Those are the next builds; the data layer and systems were written so they slot in without rewrites.
