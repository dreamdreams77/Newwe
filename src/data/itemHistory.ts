import type { Cond } from '../core/types';

// Items sometimes remember being patched. Lines appear as you learn them.
export interface HistoryLine {
  v: string;
  text: string;
  when?: Cond;
}

export const ITEM_HISTORY: Record<string, HistoryLine[]> = {
  golden_dice: [
    { v: '1.0', text: '"Just a dice."' },
    { v: '1.1', text: '"Added luck modifier."' },
    { v: '1.4', text: '"WHY IS IT DOING THAT?"', when: { flag: 'golden_fumbled' } },
    { v: '2.0', text: '"Do not roll after 11:11."', when: { flag: 'eleven_first' } },
  ],
  key: [
    { v: '1.0', text: '"Opens: nothing. (Intentional.)"' },
    { v: '1.2', text: '"Opens: one thing. Not telling."', when: { flag: 'clue_404' } },
    { v: '1.3.7', text: '"Removed from game. Re-added. Do not ask."', when: { flag: 'inspector_on' } },
  ],
  yoghurt: [
    { v: '1.0', text: '"Dairy."' },
    { v: '1.3', text: '"Extremely important. (Do not eat.)"', when: { flag: 'marl_asked_yoghurt' } },
    { v: '1.3.1', text: '"Fixed: eating it no longer crashes the quest. It does ruin the afternoon."', when: { flag: 'ate_yoghurt' } },
  ],
  postcard: [
    { v: '1.3', text: '"Ink: glossy. Reason: unknown."' },
    { v: '1.3.2', text: '"Ink reacts to mercury-vapour lamps. (Not a bug.)"', when: { flag: 'postcard_uv' } },
  ],
  token_mended: [
    { v: '1.3.7', text: '"Both halves welded by Dad. Accepted by machine. Still don’t know why."', when: { flag: 'inspector_on' } },
  ],
};
