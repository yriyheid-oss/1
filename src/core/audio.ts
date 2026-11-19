import type { MusicZone } from '../data/i18n';

export type SoundName =
  | 'paw'
  | 'jump'
  | 'land'
  | 'chime'
  | 'unlock'
  | 'checkpoint'
  | 'splash'
  | 'alert'
  | 'bark'
  | 'chirp'
  | 'purr'
  | 'meow'
  | 'steal'
  | 'story'
  | 'wheel'
  | 'echo'
  | 'letter'
  | 'sleep'
  | 'pail'
  | 'feather'
  | 'claw'
  | 'flare'
  | 'dash'
  | 'glide'
  | 'sense'
  | 'bell_toll'
  | 'wall_kick'
  | 'flow_chime'
  | 'ui';

export type PawSurfaceType = 'stone' | 'wood' | 'roof' | 'water' | 'metal';

export function resolvePawSurfaceType(
  surfaceId: string | null,
  swimming: boolean,
  surfaceKind?: 'roof' | 'pipe' | 'bridge' | 'gear' | 'hidden_echo' | null
): PawSurfaceType {
  if (swimming) return 'water';
  if (
    surfaceKind === 'pipe' ||
    surfaceKind === 'gear' ||
    surfaceKind === 'hidden_echo' ||
    (surfaceId && (surfaceId.includes('pipe') || surfaceId.includes('viaduct') || surfaceId.includes('gear')))
  ) {
    return 'metal';
  }
  if (
    surfaceKind === 'bridge' ||
    (surfaceId &&
      (surfaceId.includes('skiff') ||
        surfaceId.includes('bridge') ||
        surfaceId.includes('board') ||
        surfaceId.includes('step_')))
  ) {
    return 'wood';
  }
  if (surfaceId && (surfaceId.includes('roof') || surfaceId.includes('dist_') || surfaceId.includes('awning'))) {
    return 'roof';
  }
  return 'stone';
}

interface ZoneMusicTheme {
  stepSec: number;
  bassFreqs: readonly number[];
  leadNotes: readonly number[];
  arpNotes: readonly number[];
  padVol: number;
  leadVol: number;
}

const ZONE_THEMES: Record<MusicZone, ZoneMusicTheme> = {
  title: {
    stepSec: 0.48,
    bassFreqs: [146.83, 146.83, 130.81, 164.81], // D3 - C3 - E3 warm dawn modal
    leadNotes: [293.66, 349.23, 440.0, 523.25, 440.0, 392.0, 349.23, 0],
    arpNotes: [440.0, 523.25, 587.33, 659.25],
    padVol: 0.028,
    leadVol: 0.036,
  },
  rooftops: {
    stepSec: 0.36,
    bassFreqs: [164.81, 146.83, 196.0, 146.83], // E3 - D3 - G3 sunlit Venetian roofs
    leadNotes: [329.63, 392.0, 493.88, 587.33, 659.25, 587.33, 493.88, 392.0],
    arpNotes: [493.88, 587.33, 659.25, 783.99],
    padVol: 0.025,
    leadVol: 0.038,
  },
  waterfront: {
    stepSec: 0.38,
    bassFreqs: [130.81, 174.61, 196.0, 130.81], // C3 - F3 - G3 gentle canal waltz
    leadNotes: [523.25, 659.25, 587.33, 523.25, 440.0, 523.25, 587.33, 392.0],
    arpNotes: [392.0, 523.25, 659.25, 783.99],
    padVol: 0.026,
    leadVol: 0.038,
  },
  swimming: {
    stepSec: 0.52,
    bassFreqs: [110.0, 130.81, 146.83, 110.0], // A2 - C3 - D3 drifting tide shimmer
    leadNotes: [440.0, 0, 523.25, 659.25, 0, 587.33, 440.0, 0],
    arpNotes: [523.25, 659.25, 783.99, 987.77],
    padVol: 0.03,
    leadVol: 0.032,
  },
  stealth: {
    stepSec: 0.32,
    bassFreqs: [123.47, 130.81, 116.54, 123.47], // B2 tension minor
    leadNotes: [246.94, 293.66, 0, 369.99, 349.23, 0, 293.66, 233.08],
    arpNotes: [493.88, 587.33, 622.25, 739.99],
    padVol: 0.024,
    leadVol: 0.035,
  },
  chase: {
    stepSec: 0.19,
    bassFreqs: [146.83, 146.83, 174.61, 196.0], // D3 lively staccato dock pursuit
    leadNotes: [440.0, 523.25, 587.33, 698.46, 659.25, 587.33, 523.25, 440.0],
    arpNotes: [587.33, 698.46, 880.0, 1046.5],
    padVol: 0.022,
    leadVol: 0.042,
  },
  dam_summit: {
    stepSec: 0.34,
    bassFreqs: [174.61, 196.0, 220.0, 261.63], // F3 -> G3 -> A3 -> C4 radiant carillon
    leadNotes: [587.33, 659.25, 783.99, 880.0, 1046.5, 880.0, 783.99, 659.25],
    arpNotes: [783.99, 880.0, 1046.5, 1174.66],
    padVol: 0.028,
    leadVol: 0.042,
  },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxMuted = false;
  private musicMuted = false;
  private musicZone: MusicZone = 'title';
  private musicTimer = 0;
  private musicStep = 0;

  // Persistent single-node looping ambient harbor surf & rain filter bed (zero per-frame alloc)
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientPhase = 0;

  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
  }

  private ensureAmbientLoop(): void {
    if (!this.ctx || this.ctx.state !== 'running' || this.ambientSource) return;
    try {
      const rate = this.ctx.sampleRate;
      const len = Math.floor(rate * 2.5);
      const buffer = this.ctx.createBuffer(1, len, rate);
      const data = buffer.getChannelData(0);
      // Smooth looping pink-ish harbor noise (3-pole lowpass random walk)
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.95 * b2 + white * 0.048;
        data[i] = (b0 + b1 + b2) * 0.45;
      }
      // Crossfade seams so 2.5s loop has zero click
      const fadeSamples = Math.min(2000, Math.floor(len * 0.1));
      for (let i = 0; i < fadeSamples; i++) {
        const k = i / fadeSamples;
        data[i] = data[i] * k + data[len - fadeSamples + i] * (1 - k);
      }

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 340;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.0001;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();

      this.ambientSource = src;
      this.ambientFilter = filter;
      this.ambientGain = gain;
    } catch {
      // Ignore WebAudio creation failures on constrained hosts
    }
  }

  updateAmbient(
    dt: number,
    options: { active: boolean; weather: 'clear' | 'mist' | 'rain'; swimming: boolean; altitude: number }
  ): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (this.sfxMuted || !options.active) {
      if (this.ambientGain) {
        this.ambientGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15);
      }
      return;
    }
    this.ensureAmbientLoop();
    if (!this.ambientGain || !this.ambientFilter) return;

    this.ambientPhase += dt * 0.65;
    const waveSwell = 0.5 + 0.5 * Math.sin(this.ambientPhase);
    const nearWaterBoost = Math.max(0.25, 1.0 - Math.max(0, options.altitude - 0.6) * 0.11);
    const rainMult = options.weather === 'rain' ? 2.45 : options.weather === 'mist' ? 1.2 : 1.0;
    const swimMult = options.swimming ? 1.65 : 1.0;
    const targetGain = Math.min(0.042, (0.0065 + waveSwell * 0.0055) * nearWaterBoost * rainMult * swimMult);
    const targetCutoff =
      options.weather === 'rain'
        ? 980 + waveSwell * 320
        : options.swimming
          ? 520 + waveSwell * 160
          : 280 + waveSwell * 180;

    const now = this.ctx.currentTime;
    this.ambientGain.gain.setTargetAtTime(targetGain, now, 0.25);
    this.ambientFilter.frequency.setTargetAtTime(targetCutoff, now, 0.25);
  }

  setSfxMuted(muted: boolean): void {
    this.sfxMuted = muted;
  }

  isSfxMuted(): boolean {
    return this.sfxMuted;
  }

  toggleSfx(): boolean {
    this.sfxMuted = !this.sfxMuted;
    return this.sfxMuted;
  }

  setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
  }

  isMusicMuted(): boolean {
    return this.musicMuted;
  }

  toggleMusic(): boolean {
    this.musicMuted = !this.musicMuted;
    return this.musicMuted;
  }

  setMuted(muted: boolean): void {
    this.sfxMuted = muted;
    this.musicMuted = muted;
  }

  isMuted(): boolean {
    return this.sfxMuted && this.musicMuted;
  }

  toggleMute(): boolean {
    const next = !(this.sfxMuted && this.musicMuted);
    this.sfxMuted = next;
    this.musicMuted = next;
    return next;
  }

  setMusicZone(zone: MusicZone): void {
    if (this.musicZone !== zone) {
      this.musicZone = zone;
      this.musicTimer = Math.min(this.musicTimer, 0.08);
    }
  }

  getMusicZone(): MusicZone {
    return this.musicZone;
  }

  stepMusic(dt: number): void {
    if (this.musicMuted || !this.ctx || this.ctx.state !== 'running') return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;

    const theme = ZONE_THEMES[this.musicZone];
    this.musicTimer = theme.stepSec;
    const now = this.ctx.currentTime + 0.015;
    const step = this.musicStep++;

    // Warm bar pad bass on every 4th beat
    if (step % 4 === 0) {
      const bassIdx = Math.floor(step / 4) % theme.bassFreqs.length;
      const bassFreq = theme.bassFreqs[bassIdx];
      this.musicVoice(now, 'sine', bassFreq, theme.stepSec * 3.8, theme.padVol, 420);
      this.musicVoice(now, 'triangle', bassFreq * 2, theme.stepSec * 2.6, theme.padVol * 0.45, 720);
    }

    // Melodic plucked lute / celesta lead
    const leadFreq = theme.leadNotes[step % theme.leadNotes.length];
    if (leadFreq > 0) {
      const voiceType: OscillatorType = this.musicZone === 'chase' ? 'triangle' : 'sine';
      this.musicVoice(now, voiceType, leadFreq, theme.stepSec * 1.45, theme.leadVol, 1800);
      // Subtle sympathetic overtone for crystal-like Venetian bell warmth
      if (step % 2 === 0) {
        this.musicVoice(
          now + 0.01,
          'sine',
          leadFreq * 2,
          theme.stepSec * 0.9,
          theme.leadVol * 0.25,
          2800
        );
      }
    }

    // Off-beat shimmer arpeggio in calmer zones
    if (step % 2 === 1 && this.musicZone !== 'chase') {
      const arpFreq = theme.arpNotes[Math.floor(step / 2) % theme.arpNotes.length];
      this.musicVoice(now, 'sine', arpFreq, theme.stepSec * 1.25, theme.leadVol * 0.36, 2200);
    }
  }

  playPawStep(surface: PawSurfaceType, intensity = 1): void {
    if (this.sfxMuted || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const p = 0.92 + Math.random() * 0.16;
    const vol = Math.max(0.35, Math.min(1.15, intensity));

    switch (surface) {
      case 'water':
        this.noiseBurst(now, 0.09, 0.038 * vol, 720);
        this.tone(now, 'sine', 240 * p, 140 * p, 0.065, 0.025 * vol);
        break;
      case 'wood':
        this.tone(now, 'triangle', 145 * p, 82 * p, 0.06, 0.042 * vol);
        break;
      case 'roof':
        this.tone(now, 'sine', 310 * p, 190 * p, 0.042, 0.032 * vol);
        break;
      case 'metal':
        this.tone(now, 'sine', 640 * p, 520 * p, 0.075, 0.026 * vol);
        this.tone(now, 'triangle', 195 * p, 120 * p, 0.045, 0.022 * vol);
        break;
      case 'stone':
      default:
        this.tone(now, 'triangle', 185 * p, 105 * p, 0.045, 0.032 * vol);
        break;
    }
  }

  play(name: SoundName, pitchScale = 1): void {
    if (this.sfxMuted || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const jitter = 0.94 + Math.random() * 0.12;
    const p = pitchScale * jitter;

    switch (name) {
      case 'paw':
        this.tone(now, 'triangle', 175 * p, 95 * p, 0.055, 0.055);
        break;
      case 'jump':
        this.noiseBurst(now, 0.045, 0.032, 1300);
        this.tone(now, 'sine', 235 * p, 485 * p, 0.13, 0.09);
        break;
      case 'land':
        this.noiseBurst(now, 0.05, 0.036, 750);
        this.tone(now, 'triangle', 135 * p, 56 * p, 0.10, 0.11);
        break;
      case 'chime': {
        this.tone(now, 'sine', 660 * pitchScale, 656 * pitchScale, 0.95, 0.16);
        this.tone(now, 'sine', 1320 * pitchScale, 1316 * pitchScale, 0.65, 0.08);
        this.tone(now, 'triangle', 1984 * pitchScale, 1980 * pitchScale, 0.42, 0.04);
        break;
      }
      case 'bell_toll': {
        this.tone(now, 'sine', 293.66 * pitchScale, 291 * pitchScale, 2.2, 0.09);
        this.tone(now, 'sine', 587.33 * pitchScale, 584 * pitchScale, 1.5, 0.045);
        this.tone(now + 0.02, 'triangle', 880 * pitchScale, 876 * pitchScale, 0.9, 0.02);
        break;
      }
      case 'unlock': {
        this.tone(now, 'sine', 523.25, 523.25, 0.35, 0.13);
        this.tone(now + 0.09, 'sine', 659.25, 659.25, 0.45, 0.13);
        this.tone(now + 0.18, 'sine', 783.99, 783.99, 0.7, 0.14);
        break;
      }
      case 'checkpoint':
        this.tone(now, 'sine', 440, 554.37, 0.38, 0.11);
        this.tone(now + 0.1, 'sine', 880, 880, 0.52, 0.07);
        break;
      case 'splash':
        this.noiseBurst(now, 0.24, 0.14, 650);
        this.tone(now, 'sine', 220, 90, 0.18, 0.08);
        break;
      case 'alert':
        this.tone(now, 'sawtooth', 320, 480, 0.18, 0.075);
        break;
      case 'bark':
        this.tone(now, 'sawtooth', 260 * p, 145 * p, 0.09, 0.085);
        this.tone(now + 0.11, 'triangle', 290 * p, 130 * p, 0.11, 0.075);
        break;
      case 'chirp':
        this.tone(now, 'sine', 1950 * p, 2650 * p, 0.07, 0.045);
        this.tone(now + 0.09, 'sine', 2400 * p, 1780 * p, 0.08, 0.04);
        break;
      case 'purr':
        this.tone(now, 'triangle', 54 * p, 48 * p, 0.22, 0.085);
        this.tone(now + 0.05, 'sine', 108 * p, 96 * p, 0.2, 0.045);
        this.tone(now + 0.24, 'triangle', 52 * p, 46 * p, 0.22, 0.075);
        break;
      case 'meow':
        this.tone(now, 'triangle', 520 * p, 780 * p, 0.14, 0.08);
        this.tone(now + 0.12, 'sine', 760 * p, 430 * p, 0.22, 0.075);
        break;
      case 'steal':
        this.tone(now, 'triangle', 380 * p, 690 * p, 0.09, 0.085);
        this.noiseBurst(now, 0.1, 0.06, 1200);
        break;
      case 'story':
        this.tone(now, 'sine', 587.33, 587.33, 0.42, 0.1);
        this.tone(now + 0.1, 'sine', 739.99, 739.99, 0.48, 0.1);
        this.tone(now + 0.22, 'sine', 880, 880, 0.65, 0.11);
        break;
      case 'wheel':
        this.tone(now, 'triangle', 110, 145, 0.28, 0.1);
        this.tone(now + 0.08, 'sine', 330, 440, 0.35, 0.09);
        break;
      case 'echo':
        this.tone(now, 'sine', 784, 780, 0.55, 0.08);
        this.tone(now + 0.08, 'sine', 1046.5, 1042, 0.6, 0.07);
        break;
      case 'letter':
        this.noiseBurst(now, 0.12, 0.05, 1600);
        this.tone(now + 0.04, 'sine', 523.25, 659.25, 0.34, 0.08);
        this.tone(now + 0.14, 'sine', 783.99, 1046.5, 0.42, 0.075);
        break;
      case 'sleep':
        this.tone(now, 'sine', 392, 330, 0.4, 0.075);
        this.tone(now + 0.15, 'triangle', 58, 52, 0.45, 0.07);
        break;
      case 'pail':
        this.noiseBurst(now, 0.18, 0.1, 900);
        this.tone(now, 'triangle', 210, 120, 0.16, 0.09);
        break;
      case 'feather':
        this.noiseBurst(now, 0.16, 0.08, 2200);
        this.tone(now, 'sine', 1650 * p, 2400 * p, 0.12, 0.05);
        break;
      case 'claw':
        this.noiseBurst(now, 0.18, 0.12, 2600);
        this.tone(now, 'sawtooth', 720 * p, 220 * p, 0.19, 0.095);
        this.tone(now + 0.04, 'sine', 1120 * p, 540 * p, 0.22, 0.06);
        break;
      case 'flare':
        this.tone(now, 'sine', 440, 1174.66, 0.34, 0.11);
        this.tone(now + 0.08, 'sine', 880, 1318.5, 0.52, 0.09);
        this.noiseBurst(now, 0.22, 0.06, 3000);
        break;
      case 'dash':
        this.noiseBurst(now, 0.16, 0.11, 2400);
        this.tone(now, 'triangle', 580 * p, 220 * p, 0.16, 0.09);
        this.tone(now + 0.02, 'sine', 880 * p, 1240 * p, 0.12, 0.05);
        break;
      case 'glide':
        this.noiseBurst(now, 0.22, 0.06, 1150);
        this.tone(now, 'sine', 340 * p, 480 * p, 0.22, 0.045);
        break;
      case 'sense':
        this.tone(now, 'sine', 784, 1568, 0.45, 0.09);
        this.tone(now + 0.06, 'sine', 1174.66, 1170, 0.62, 0.075);
        this.tone(now + 0.12, 'triangle', 1567.98, 1564, 0.55, 0.045);
        break;
      case 'wall_kick':
        this.noiseBurst(now, 0.065, 0.075, 1650);
        this.tone(now, 'triangle', 310 * p, 640 * p, 0.12, 0.09);
        this.tone(now + 0.02, 'sine', 620 * p, 920 * p, 0.11, 0.055);
        break;
      case 'flow_chime':
        this.tone(now, 'sine', 784, 780, 0.24, 0.055);
        this.tone(now + 0.05, 'sine', 1174.66, 1170, 0.30, 0.045);
        break;
      case 'ui':
        this.tone(now, 'sine', 520, 620, 0.08, 0.06);
        break;
    }
  }

  private musicVoice(
    start: number,
    type: OscillatorType,
    freq: number,
    duration: number,
    peakGain: number,
    cutoffHz: number
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffHz, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peakGain, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  private tone(
    start: number,
    type: OscillatorType,
    freqStart: number,
    freqEnd: number,
    duration: number,
    peakGain: number
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peakGain, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private noiseBurst(start: number, duration: number, peakGain: number, cutoffHz: number): void {
    if (!this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffHz, start);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peakGain, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(start);
  }
}

export const soundEngine = new SoundEngine();

export function playSound(name: SoundName, pitchScale = 1): void {
  soundEngine.play(name, pitchScale);
}

