import { game } from '../core/runtime';
import { RECIPES } from '../data/recipes';
import { ITEMS } from '../data/items';
import { SPECIES } from '../data/creatures';
import { test } from '../systems/conditions';
import { combine, discoveredRecipes, undiscoveredCount, describeInputs } from '../systems/crafting';
import { activeCreature, feedCreature, reactionFor } from '../systems/creatures';
import { freshness, inventoryList, totalWeight, itemDef } from '../systems/inventory';
import { runUse, visibleUses } from '../systems/itemUse';
import { carryCapacity } from '../systems/stats';
import { audio } from '../audio/audioManager';
import { alertWindow } from './windows';
import { h, btn, type Child } from './dom';
import { setHeld } from './held';
import { toast } from './notifications';
import { icon } from './sprites';
import { openWindow, type WinHandle } from './windows';

let selected: string | null = null;
let combineMode = false;
let picks: string[] = [];
let lastCraft: { text: string; tier: string; label?: string } | null = null;

const RARITY_LABEL: Record<string, string> = { junk: 'Junk', common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' };

export function openInventory(): WinHandle {
  const g = game();
  g.reveal('inventory');
  return openWindow({
    id: 'inventory',
    live: true,
    title: g.state.stage >= 3 ? 'Item' : 'My Downloads',
    icon: 'folder',
    className: 'inv-win',
    width: 'min(900px, 98vw)',
    render: (body, win) => render(body, win),
  });
}

function render(body: HTMLElement, win: WinHandle): void {
  const g = game();
  const list = inventoryList(g);
  if (selected && !g.state.inventory[selected]) selected = null;
  if (!selected && list.length) selected = list[0].def.id;
  picks = picks.filter((p) => g.state.inventory[p]);

  const weight = totalWeight(g);
  const cap = carryCapacity(g);
  const over = weight > cap;

  const grid = h('div', { class: 'inv-grid', role: 'list', ariaLabel: 'Items' });
  if (!list.length) grid.append(h('p', { class: 'empty' }, 'Nothing yet. Poke around. Take things. Everything on this page is a bit suspicious.'));
  list.forEach(({ def, stack }) => {
    const fresh = freshness(g, def.id);
    const picked = picks.includes(def.id);
    grid.append(
      h(
        'button',
        {
          type: 'button',
          role: 'listitem',
          class: `inv-item rar-${def.rarity} ${selected === def.id ? 'sel' : ''} ${picked ? 'picked' : ''} ${fresh ? `fresh-${fresh}` : ''}`,
          dataset: { fk: `item-${def.id}`, item: def.id },
          ariaLabel: `${def.name}${stack.qty > 1 ? ', ' + stack.qty : ''}`,
          onclick: () => {
            audio.sfx('click');
            if (combineMode) {
              const i = picks.indexOf(def.id);
              if (i >= 0) picks.splice(i, 1);
              else if (picks.length < 3) picks.push(def.id);
              else toast('Three things at a time. You only have two hands and a hopeful attitude.', 'info');
              selected = def.id;
            } else selected = def.id;
            win.refresh();
          },
        },
        icon(def.icon, 36),
        h('span', { class: 'ii-name' }, def.name),
        stack.qty > 1 ? h('span', { class: 'ii-qty' }, `×${stack.qty}`) : null,
        picked ? h('span', { class: 'ii-pick' }, String(picks.indexOf(def.id) + 1)) : null,
      ),
    );
  });

  // ---------------- detail
  const detail = h('div', { class: 'inv-detail' });
  const sel = selected ? itemDef(selected) : null;
  if (sel) {
    const fresh = freshness(g, sel.id);
    const stories = (sel.story ?? []).filter((s) => test(g, s.when)).map((s) => s.text);
    detail.append(
      h('div', { class: 'det-head' }, icon(sel.icon, 64), h('div', {}, h('h3', {}, sel.name), h('div', { class: `rarity r-${sel.rarity}` }, RARITY_LABEL[sel.rarity]))),
      h('p', { class: 'det-desc' }, sel.description),
      sel.perishable && fresh ? h('p', { class: `det-fresh fresh-${fresh}` }, sel.perishable.notes[fresh]) : '',
      ...stories.map((t) => h('p', { class: 'det-story' }, t)),
      h('div', { class: 'det-tags' }, sel.tags.map((t) => h('span', { class: 'tag' }, t)), h('span', { class: 'tag w' }, `weight ${sel.weight}`)),
    );
    const actions = h('div', { class: 'det-actions' });
    if (!combineMode) {
      for (const u of visibleUses(g, sel.id)) {
        actions.append(
          btn(u.label, async () => {
            audio.sfx('click');
            await runUse(g, sel.id, u.id);
            win.refresh();
          }, u.id === 'eat' && sel.id === 'yoghurt' ? 'warn' : ''),
        );
      }
      actions.append(
        btn('Use on something…', () => {
          setHeld(sel.id);
          toast(`Holding ${sel.name}. Click something on the page. (Esc to put it away.)`, 'info');
          win.close();
        }, 'small', { title: 'Your cursor becomes the item. Click a hotspot on the page.' }),
      );
      const pet = activeCreature(g);
      if (pet) {
        const sp = SPECIES[pet.species];
        const r = reactionFor(sp, sel.id);
        if (r !== sp.confused) {
          actions.append(
            btn(`Feed ${pet.name}`, () => {
              const res = feedCreature(g, pet.id, sel.id);
              toast(res.text, res.ok ? 'funny' : 'info');
              if (res.learned) toast(`${pet.name} learned something: ${SPECIES[pet.species].abilities[res.learned]?.label ?? res.learned}!`, 'magic');
              audio.sfx('chirp');
              win.refresh();
            }, 'small'),
          );
        }
      }
    }
    detail.append(actions);
  } else {
    detail.append(h('p', { class: 'empty' }, 'Select something.'));
  }

  // ---------------- combine
  const bench = h('div', { class: 'bench' });
  bench.append(
    h(
      'label',
      { class: 'bench-toggle' },
      h('input', { type: 'checkbox', checked: combineMode, on: { change: (e) => ((combineMode = (e.target as HTMLInputElement).checked), (picks = []), win.refresh()) } }),
      ' Tinker mode: try combining things',
    ),
  );
  if (combineMode) {
    bench.append(
      h('div', { class: 'bench-slots', attrs: { 'aria-live': 'polite' } }, picks.length ? picks.map((p) => h('span', { class: 'bench-slot' }, icon(ITEMS[p].icon, 24), ITEMS[p].name)) : h('em', {}, 'Pick two or three items above…')),
      btn('Combine!', () => {
        if (picks.length < 2) return toast('You need at least two things.', 'info');
        const res = combine(g, picks);
        lastCraft = { text: res.text, tier: res.outcome?.tier ?? res.kind, label: res.outcome?.label };
        if (res.kind === 'made') {
          picks = [];
          toast(res.firstTime ? `You made something: ${res.outcome!.label}!` : `Made: ${res.outcome!.label}`, 'magic');
        }
        win.refresh();
      }, 'go', { disabled: picks.length < 2 }),
    );
    if (lastCraft) bench.append(h('div', { class: `craft-result tier-${lastCraft.tier}`, attrs: { role: 'status' } }, lastCraft.label ? h('b', {}, lastCraft.label) : null, h('p', {}, lastCraft.text)));
    const made = discoveredRecipes(g);
    const mysteries = undiscoveredCount(g);
    bench.append(
      h(
        'details',
        { class: 'tinkerings' },
        h('summary', {}, `Things you have figured out (${made.length})`),
        made.length ? h('ul', {}, made.map((r) => h('li', {}, h('b', {}, r.name), ` — ${describeInputs(r)}${r.window ? ' (at the right moment)' : ''}`))) : h('p', {}, 'Nothing yet. Try putting things together.'),
        h('p', { class: 'mystery' }, mysteries > 0 ? `${mysteries} combination${mysteries > 1 ? 's' : ''} still out there. They don't come with instructions.` : 'You have found every combination there is. Probably.'),
      ),
    );
    void RECIPES;
  }

  const footer: Child = h('div', { class: `inv-foot ${over ? 'over' : ''}` }, `Carrying ${weight} / ${cap}`, over ? ' — ENCUMBERED: everything takes longer' : '');
  body.append(h('div', { class: 'inv-layout' }, h('div', { class: 'inv-left' }, grid, bench), detail), footer);
}

/** let other modules explain an item in a pop-up */
export function examineItem(id: string): void {
  const g = game();
  const def = itemDef(id);
  const stories = (def.story ?? []).filter((s) => test(g, s.when)).map((s) => h('p', {}, s.text));
  void alertWindow(def.name, h('div', {}, h('p', {}, def.description), stories));
}
