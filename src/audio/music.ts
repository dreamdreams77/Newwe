// A tiny pattern sequencer's song book. 8th-note steps. null = rest.

export interface Track {
  bpm: number;
  lead: Array<string | null>;
  bass: Array<string | null>;
  leadType: OscillatorType;
  bassType: OscillatorType;
  leadVol: number;
  bassVol: number;
}

const NOTE_INDEX: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

export function noteFreq(n: string): number {
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  if (!m) return 440;
  const semis = NOTE_INDEX[m[1]] + (Number(m[2]) + 1) * 12; // MIDI number
  return 440 * Math.pow(2, (semis - 69) / 12);
}

/** arpeggio helper: chord tones cycled over `n` steps */
function arp(tones: string[], pattern: number[], n = 8): Array<string | null> {
  return Array.from({ length: n }, (_, i) => {
    const p = pattern[i % pattern.length];
    return p < 0 ? null : tones[p % tones.length];
  });
}

const homeLead = [
  ...arp(['E5', 'G5', 'C6'], [0, 1, 2, 1, 0, 1, 2, -1]),
  ...arp(['D5', 'G5', 'B5'], [0, 1, 2, 1, 0, 1, 2, -1]),
  ...arp(['C5', 'E5', 'A5'], [0, 1, 2, 1, 0, 1, 2, -1]),
  ...arp(['C5', 'F5', 'A5'], [0, 1, 2, 1, 2, 1, 0, -1]),
];
const homeBass = ['C3', null, 'G3', null, 'C3', null, 'G3', null, 'G2', null, 'D3', null, 'G2', null, 'D3', null, 'A2', null, 'E3', null, 'A2', null, 'E3', null, 'F2', null, 'C3', null, 'F2', null, 'C3', null];

const lakeLead = [
  ...arp(['A4', 'C5', 'E5'], [0, -1, 1, -1, 2, -1, 1, -1]),
  ...arp(['F4', 'A4', 'C5'], [0, -1, 1, -1, 2, -1, 1, -1]),
  ...arp(['C5', 'E5', 'G5'], [0, -1, 1, -1, 2, -1, 1, -1]),
  ...arp(['G4', 'B4', 'D5'], [0, -1, 1, -1, 2, -1, 1, 2]),
];
const lakeBass = ['A2', null, null, null, null, null, null, null, 'F2', null, null, null, null, null, null, null, 'C3', null, null, null, null, null, null, null, 'G2', null, null, null, null, null, null, null];

const lightLead = [
  ...arp(['D5', 'F5', 'A5'], [0, -1, -1, 1, -1, 2, -1, -1]),
  ...arp(['Bb4', 'D5', 'F5'], [0, -1, -1, 1, -1, 2, -1, -1]),
  ...arp(['F5', 'A5', 'C6'], [0, -1, -1, 1, -1, 2, -1, -1]),
  ...arp(['C5', 'E5', 'G5'], [0, -1, -1, 1, -1, 2, -1, -1]),
];
const lightBass = ['D2', null, null, null, 'D2', null, null, null, 'Bb1', null, null, null, 'Bb1', null, null, null, 'F2', null, null, null, 'F2', null, null, null, 'C2', null, null, null, 'C2', null, null, null];

const dungeonLead = [
  ...arp(['E4', 'G4', 'B4'], [0, -1, 0, -1, 1, -1, 0, 2]),
  ...arp(['E4', 'Gb4', 'Bb4'], [0, -1, 0, -1, 1, -1, 0, 2]),
];
const dungeonBass = ['E2', 'E2', null, 'E2', 'E2', null, 'G2', null, 'E2', 'E2', null, 'E2', 'E2', null, 'Bb2', null];

const finaleLead = [
  ...arp(['C5', 'E5', 'G5', 'C6'], [0, 1, 2, 3, 2, 1, 0, -1]),
  ...arp(['D5', 'F5', 'A5', 'D6'], [0, 1, 2, 3, 2, 1, 0, -1]),
  ...arp(['E5', 'G5', 'B5', 'E6'], [0, 1, 2, 3, 2, 1, 0, -1]),
  ...arp(['G5', 'B5', 'D6', 'G6'], [0, 1, 2, 3, 3, 2, 1, 0]),
];
const finaleBass = ['C3', null, null, null, 'D3', null, null, null, 'E3', null, null, null, 'G3', null, null, null];

export const TRACKS: Record<string, Track> = {
  home: { bpm: 112, lead: homeLead, bass: homeBass, leadType: 'square', bassType: 'triangle', leadVol: 0.05, bassVol: 0.1 },
  lake: { bpm: 76, lead: lakeLead, bass: lakeBass, leadType: 'triangle', bassType: 'sine', leadVol: 0.09, bassVol: 0.12 },
  lighthouse: { bpm: 58, lead: lightLead, bass: lightBass, leadType: 'triangle', bassType: 'sine', leadVol: 0.08, bassVol: 0.14 },
  dungeon: { bpm: 104, lead: dungeonLead, bass: dungeonBass, leadType: 'sawtooth', bassType: 'square', leadVol: 0.03, bassVol: 0.07 },
  finale: { bpm: 92, lead: finaleLead, bass: finaleBass, leadType: 'square', bassType: 'triangle', leadVol: 0.05, bassVol: 0.1 },
};
