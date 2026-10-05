import type { Game } from '../core/game';
import { QUESTS, type QuestDef } from '../data/quests';
import { test } from './conditions';
import { applyEffects } from './effects';

export type QuestStatus = 'locked' | 'active' | 'done' | 'failed';

export function questStatus(g: Game, q: QuestDef): QuestStatus {
  const st = g.state.quests[q.id];
  if (!st) return 'locked';
  if (st.failed) return 'failed';
  if (st.done !== null) return 'done';
  return 'active';
}

export function currentStepIndex(g: Game, q: QuestDef): number {
  const i = q.steps.findIndex((s) => !test(g, s.done));
  return i === -1 ? q.steps.length : i;
}

/** Start quests whose trigger fired, finish those whose steps are all done. Idempotent. */
export function updateQuests(g: Game): void {
  const s = g.state;
  for (const q of QUESTS) {
    let st = s.quests[q.id];
    if (!st) {
      if (!test(g, q.start)) continue;
      st = s.quests[q.id] = { started: s.clock.minutes, done: null };
      g.reveal('journal');
      if (!q.hidden) g.toast(`New quest: ${q.title}`, 'magic');
      else g.toast(`A quest started on its own: ${q.title}`, 'magic');
      g.sfx('quest');
      g.log(`Quest started: ${q.title}.`);
      g.changed();
    }
    if (st.done !== null || st.failed) continue;
    if (q.failIf && test(g, q.failIf)) {
      st.failed = true;
      g.toast(`Quest changed: ${q.title}`, 'funny');
      g.changed();
      continue;
    }
    if (currentStepIndex(g, q) >= q.steps.length) {
      st.done = s.clock.minutes;
      g.toast(`Quest complete: ${q.title}`, 'good');
      g.sfx('questDone');
      g.log(`Quest complete: ${q.title}.`);
      applyEffects(g, q.reward);
      g.changed();
    }
  }
}

export function activeQuestHints(g: Game): string[] {
  const out: string[] = [];
  for (const q of QUESTS) {
    if (questStatus(g, q) !== 'active') continue;
    const i = currentStepIndex(g, q);
    const h = q.steps[i]?.hint;
    if (h) out.push(h);
  }
  return out;
}
