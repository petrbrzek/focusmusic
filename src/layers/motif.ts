import {
  OscillatorNode,
  GainNode,
  BiquadFilterNode,
} from 'node-web-audio-api';
import type { Engine } from '../engine';
import type { ClockListener } from '../clock';
import { Modulator, ModPresets } from '../modulation';
import { nodeCounter } from '../diagnostics';

interface MotifPreset {
  name: string;
  waveformA: OscillatorType;
  waveformB: OscillatorType;
  detuneCents: number;
  octaveOffset: number;
  filterBase: number;
  filterRange: number;
  filterQ: number;
  masterGain: number;
  noteLength: number;
  attack: number;
  release: number;
  velocityRange: [number, number];
}

const MOTIF_PRESETS: MotifPreset[] = [
  {
    name: 'Chimes',
    waveformA: 'sine',
    waveformB: 'triangle',
    detuneCents: 6,
    octaveOffset: 2,
    filterBase: 2200,
    filterRange: 900,
    filterQ: 0.5,
    masterGain: 0.35,
    noteLength: 1.6,
    attack: 0.01,
    release: 0.6,
    velocityRange: [0.08, 0.16],
  },
  {
    name: 'Glass Keys',
    waveformA: 'triangle',
    waveformB: 'sine',
    detuneCents: 4,
    octaveOffset: 1,
    filterBase: 1800,
    filterRange: 700,
    filterQ: 0.6,
    masterGain: 0.28,
    noteLength: 1.3,
    attack: 0.008,
    release: 0.5,
    velocityRange: [0.07, 0.14],
  },
  {
    name: 'Soft Bell',
    waveformA: 'sine',
    waveformB: 'sine',
    detuneCents: 10,
    octaveOffset: 3,
    filterBase: 2600,
    filterRange: 1100,
    filterQ: 0.4,
    masterGain: 0.22,
    noteLength: 1.9,
    attack: 0.015,
    release: 0.7,
    velocityRange: [0.06, 0.12],
  },
];

const MOTIF_PATTERNS: (number | null)[][] = [
  // Long, rising arc
  [0, null, 2, null, 4, null, 5, null, 7, null, 5, null, 4, null, 2, null,
   0, null, 2, null, 4, null, 7, null, 5, null, 4, null, 2, null, null, null],
  // Call and response
  [0, null, 3, null, 5, null, 3, null, 0, null, null, null, 2, null, 4, null,
   6, null, 4, null, 2, null, null, null, 0, null, 3, null, 5, null, null, null],
  // Steady phrasing with small leaps
  [0, null, 2, null, 4, null, 2, null, 5, null, 4, null, 2, null, 0, null,
   2, null, 4, null, 7, null, 5, null, 4, null, 2, null, 0, null, null, null],
  // Sparse motif
  [0, null, null, null, 4, null, null, null, 2, null, null, null, 5, null, null, null,
   0, null, null, null, 4, null, null, null, 7, null, null, null, 2, null, null, null],
];

/**
 * Motif Layer - Occasional long-form themes to add "song-like" motion.
 * 
 * - Plays slow 8th-note motifs over multiple phrases
 * - Alternates between active and resting sections
 * - Uses soft bell-like tones for gentle contrast
 */
export class MotifLayer implements ClockListener {
  private engine: Engine;
  private masterGain: GainNode;
  private filter: BiquadFilterNode;
  private preset: MotifPreset;
  private pattern: (number | null)[] = [];
  private patternStartTick = 0;
  private lastTick = 0;
  private isActive = false;
  private phraseCount = 0;
  private sectionLength = 4;
  private stepTicks = 2; // 8th notes

  private velocityMod: Modulator;
  private filterMod: Modulator;
  private densityMod: Modulator;

  constructor(engine: Engine) {
    this.engine = engine;
    this.preset = MOTIF_PRESETS[Math.floor(Math.random() * MOTIF_PRESETS.length)];

    this.masterGain = new GainNode(engine.ctx, { gain: 0 });
    this.filter = new BiquadFilterNode(engine.ctx, {
      type: 'lowpass',
      frequency: this.preset.filterBase,
      Q: this.preset.filterQ,
    });

    this.filter.connect(this.masterGain);
    this.masterGain.connect(engine.getMainBus());

    this.velocityMod = new Modulator(ModPresets.medium(
      (this.preset.velocityRange[0] + this.preset.velocityRange[1]) / 2,
      (this.preset.velocityRange[1] - this.preset.velocityRange[0]) / 2,
    ));
    this.filterMod = new Modulator(ModPresets.slow(
      this.preset.filterBase,
      this.preset.filterRange,
    ));
    this.densityMod = new Modulator(ModPresets.glacial(0.65, 0.25));

    this.selectPattern();
    this.isActive = Math.random() < 0.6;

    const now = engine.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(this.preset.masterGain, now + 6);
  }

  private selectPattern() {
    this.pattern = MOTIF_PATTERNS[Math.floor(Math.random() * MOTIF_PATTERNS.length)];
  }

  private playNote(noteOffset: number, time: number) {
    const ctx = this.engine.ctx;
    const state = this.engine.state;
    const scale = state.scale;
    const stepDuration = this.engine.clock.tickDuration * this.stepTicks;
    const noteDuration = stepDuration * this.preset.noteLength;

    const scaleDegree = ((noteOffset % scale.length) + scale.length) % scale.length;
    const octaveOffset = Math.floor(noteOffset / scale.length) * 12;
    const midi = state.root + (this.preset.octaveOffset * 12) + scale[scaleDegree] + octaveOffset;
    const freq = this.engine.noteToFreq(midi);

    const oscA = new OscillatorNode(ctx, {
      type: this.preset.waveformA,
      frequency: freq,
    });
    const oscB = new OscillatorNode(ctx, {
      type: this.preset.waveformB,
      frequency: freq,
      detune: this.preset.detuneCents,
    });
    const noteGain = new GainNode(ctx, { gain: 0 });

    oscA.connect(noteGain);
    oscB.connect(noteGain);
    noteGain.connect(this.filter);

    nodeCounter.create(3); // oscA + oscB + noteGain

    const velocity = Math.max(
      this.preset.velocityRange[0],
      Math.min(this.preset.velocityRange[1], this.velocityMod.getValue(time)),
    );

    noteGain.gain.setValueAtTime(0, time);
    noteGain.gain.linearRampToValueAtTime(velocity, time + this.preset.attack);
    noteGain.gain.exponentialRampToValueAtTime(0.001, time + noteDuration - 0.02);
    noteGain.gain.linearRampToValueAtTime(0, time + noteDuration + this.preset.release);

    oscA.start(time);
    oscB.start(time);
    oscA.stop(time + noteDuration + this.preset.release + 0.05);
    oscB.stop(time + noteDuration + this.preset.release + 0.05);

    const cleanupDelay = (noteDuration + this.preset.release + 0.1) * 1000;
    setTimeout(() => {
      oscA.disconnect();
      oscB.disconnect();
      noteGain.disconnect();
      nodeCounter.cleanup(3);
    }, cleanupDelay);
  }

  onTick(tick: number, time: number) {
    this.lastTick = tick;

    if (!this.isActive || this.pattern.length === 0) return;
    if (tick < this.patternStartTick || tick % this.stepTicks !== 0) return;

    const patternIndex = Math.floor((tick - this.patternStartTick) / this.stepTicks) % this.pattern.length;
    const noteOffset = this.pattern[patternIndex];

    if (noteOffset === null) return;
    if (this.densityMod.getNormalized(time) < 0.35) return;

    this.playNote(noteOffset, time);

    const filterFreq = this.filterMod.getValue(time);
    this.filter.frequency.setTargetAtTime(
      Math.max(600, Math.min(5000, filterFreq)),
      time,
      0.08,
    );
  }

  onPhrase(_phrase: number, _time: number) {
    this.phraseCount++;

    if (this.phraseCount % this.sectionLength !== 0) return;

    this.isActive = Math.random() < 0.6;
    if (this.isActive) {
      this.selectPattern();
      this.patternStartTick = this.lastTick;
    }
  }

  stop() {
    const now = this.engine.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + 2);
  }
}
