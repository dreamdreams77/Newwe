import { playSfx, SFX_NAMES } from './sfx';
import { TRACKS, noteFreq, type Track } from './music';

/**
 * All sound is synthesised with the Web Audio API — no files. It should feel
 * like an old computer, not a AAA game: square waves, noise bursts, MIDI-ish loops.
 * The AudioContext is created only after a user gesture (browser autoplay rules).
 */
class AudioManager {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxBus!: GainNode;
  musicBus!: GainNode;
  ambBus!: GainNode;
  private volume = 0.5;
  private muted = false;
  private musicOn = false;
  private trackId: string | null = null;
  private pendingTrack: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;
  private ambience: { stop: () => void } | null = null;
  private ambId: string | null = null;
  private noiseBuf: AudioBuffer | null = null;

  /** call from inside a click/keypress handler */
  init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.ambBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.8;
    this.musicBus.gain.value = 0.35;
    this.ambBus.gain.value = 0.5;
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.ambBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.applyVolume();
    if (this.pendingTrack && this.musicOn) this.setTrack(this.pendingTrack);
    if (this.ambId) this.setAmbience(this.ambId);
  }

  get ready(): boolean {
    return !!this.ctx;
  }

  private applyVolume(): void {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
  }
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyVolume();
  }
  setMuted(m: boolean): void {
    this.muted = m;
    this.applyVolume();
  }
  setMusic(on: boolean): void {
    this.musicOn = on;
    if (!on) this.stopMusic();
    else if (this.pendingTrack) this.setTrack(this.pendingTrack);
  }
  get isMuted(): boolean {
    return this.muted;
  }

  sfx(name: string): void {
    if (!this.ctx || this.muted) return;
    playSfx(this, name);
  }
  /** a single musical note for puzzles (always audible even if music is off) */
  note(freq: number, dur = 0.35, type: OscillatorType = 'triangle', vol = 0.35): void {
    if (!this.ctx || this.muted) return;
    this.tone(freq, dur, type, vol);
  }

  // ------------------------------------------------------------ primitives
  tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.2, when = 0, slideTo?: number, bus?: GainNode): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(bus ?? this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  noise(dur: number, vol = 0.2, when = 0, lo = 200, hi = 6000): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.getNoise();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.sqrt(lo * hi);
    bp.Q.value = 0.8;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.05);
  }
  private getNoise(): AudioBuffer {
    if (this.noiseBuf) return this.noiseBuf;
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    return buf;
  }

  // ----------------------------------------------------------------- music
  setTrack(id: string): void {
    this.pendingTrack = id;
    if (!this.ctx || !this.musicOn) return;
    if (id === this.trackId) return;
    this.stopMusic();
    const track = TRACKS[id];
    if (!track) return;
    this.trackId = id;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(track), 90);
  }
  private stopMusic(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.trackId = null;
  }
  private schedule(track: Track): void {
    if (!this.ctx) return;
    const stepDur = 60 / track.bpm / 2;
    while (this.nextTime < this.ctx.currentTime + 0.35) {
      const i = this.step % track.lead.length;
      const lead = track.lead[i];
      const bass = track.bass[i % track.bass.length];
      const w = this.nextTime - this.ctx.currentTime;
      if (lead) this.tone(noteFreq(lead), stepDur * 1.6, track.leadType, track.leadVol, w, undefined, this.musicBus);
      if (bass) this.tone(noteFreq(bass), stepDur * 1.9, track.bassType, track.bassVol, w, undefined, this.musicBus);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  // -------------------------------------------------------------- ambience
  setAmbience(id: string): void {
    this.ambId = id;
    if (!this.ctx) return;
    this.ambience?.stop();
    this.ambience = null;
    const ctx = this.ctx;
    const nodes: AudioNode[] = [];
    const stops: Array<() => void> = [];
    const makeNoise = (type: BiquadFilterType, freq: number, q: number, vol: number, lfoHz = 0, lfoDepth = 0) => {
      const src = ctx.createBufferSource();
      src.buffer = this.getNoise();
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.value = vol;
      src.connect(f);
      f.connect(gain);
      gain.connect(this.ambBus);
      src.start();
      nodes.push(src, f, gain);
      stops.push(() => src.stop());
      if (lfoHz) {
        const lfo = ctx.createOscillator();
        const lg = ctx.createGain();
        lfo.frequency.value = lfoHz;
        lg.gain.value = lfoDepth;
        lfo.connect(lg);
        lg.connect(gain.gain);
        lfo.start();
        stops.push(() => lfo.stop());
      }
    };
    const makeHum = (freq: number, vol: number) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = vol;
      o.connect(gain);
      gain.connect(this.ambBus);
      o.start();
      stops.push(() => o.stop());
    };
    let interval: ReturnType<typeof setInterval> | null = null;
    switch (id) {
      case 'hum':
        makeHum(60, 0.03);
        makeNoise('highpass', 5000, 0.5, 0.004);
        break;
      case 'lake':
        makeNoise('lowpass', 500, 0.7, 0.05, 0.18, 0.04);
        makeNoise('bandpass', 2200, 1, 0.01, 0.05, 0.01);
        interval = setInterval(() => {
          if (Math.random() < 0.5) this.tone(1800 + Math.random() * 900, 0.08, 'sine', 0.05, 0, 2600 + Math.random() * 600, this.ambBus);
        }, 2600);
        break;
      case 'wind':
        makeNoise('bandpass', 700, 0.6, 0.06, 0.08, 0.04);
        makeNoise('lowpass', 250, 0.5, 0.05, 0.03, 0.03);
        interval = setInterval(() => {
          if (Math.random() < 0.18) this.tone(98, 2.4, 'sine', 0.05, 0, 92, this.ambBus);
        }, 5200);
        break;
      case 'static':
        makeNoise('highpass', 3000, 0.3, 0.012, 0.9, 0.01);
        makeHum(50, 0.025);
        break;
      case 'hammer':
        makeHum(60, 0.02);
        interval = setInterval(() => this.noise(0.06, 0.06, 0, 400, 2400), 1700);
        break;
    }
    this.ambience = {
      stop: () => {
        if (interval) clearInterval(interval);
        stops.forEach((s) => {
          try {
            s();
          } catch {
            /* already stopped */
          }
        });
        nodes.forEach((n) => n.disconnect());
      },
    };
  }
}

export const audio = new AudioManager();
export { SFX_NAMES };
