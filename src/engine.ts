import {
  AudioContext,
  GainNode,
  BiquadFilterNode,
  DelayNode,
  DynamicsCompressorNode,
} from 'node-web-audio-api';
import { Clock, type ClockListener } from './clock';
import { ModulationBank, ModPresets } from './modulation';
import { SCALES, type ScaleName, getScaleNotes, midiToFreq } from './utils/scales';

export interface EngineConfig {
  bpm: number;
  volume: number;
  seed?: number;
  latencyHint?: AudioContextOptions['latencyHint'];
  debug?: boolean;
}

export interface MusicState {
  root: number;
  scale: number[];
  scaleName: ScaleName;
  notes: number[];
  kitName: string;
  synthName: string;
}

export class Engine {
  ctx: AudioContext;
  clock: Clock;
  mods: ModulationBank;
  
  // Audio routing
  master: GainNode;
  compressor: DynamicsCompressorNode;
  mainBus: GainNode;
  reverbSend: GainNode;
  reverbReturn: GainNode;
  
  // Sidechain ducking
  sidechainGain: GainNode;
  private duckAmount = 0.65;
  private duckRelease = 0.12;
  
  config: EngineConfig;
  state: MusicState;
  paused = false;
  
  private layers: ClockListener[] = [];

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = {
      bpm: config.bpm ?? 89,
      volume: config.volume ?? 75,
      seed: config.seed,
      latencyHint: config.latencyHint,
      debug: config.debug,
    };

    this.ctx = new AudioContext({
      // Playback bias gives the audio thread a larger buffer which helps
      // avoid crackles on slower/contended machines.
      latencyHint: this.config.latencyHint ?? 'playback',
    });
    this.clock = new Clock(
      this.config.bpm,
      () => this.ctx.currentTime,
      { debug: !!this.config.debug }
    );
    this.mods = new ModulationBank();
    
    // Initialize music state
    this.state = this.initMusicState();
    
    // Setup modulation sources
    this.setupModulation();
    
    // Build audio graph
    this.master = new GainNode(this.ctx, { gain: this.config.volume / 100 });
    
    this.compressor = new DynamicsCompressorNode(this.ctx, {
      threshold: -18,
      knee: 12,
      ratio: 4,
      attack: 0.003,
      release: 0.15,
    });
    
    // Sidechain gain node - kick will duck this
    this.sidechainGain = new GainNode(this.ctx, { gain: 1 });
    
    // Main bus for melodic content
    this.mainBus = new GainNode(this.ctx, { gain: 1 });
    
    // Simple reverb using delays
    const { reverbSend, reverbReturn } = this.createReverb();
    this.reverbSend = reverbSend;
    this.reverbReturn = reverbReturn;
    
    // Routing
    this.mainBus.connect(this.sidechainGain);
    this.mainBus.connect(this.reverbSend);
    this.reverbReturn.connect(this.sidechainGain);
    this.sidechainGain.connect(this.compressor);
    this.compressor.connect(this.master);
    this.master.connect(this.ctx.destination);
  }

  private createReverb() {
    const reverbSend = new GainNode(this.ctx, { gain: 0.3 });
    const reverbReturn = new GainNode(this.ctx, { gain: 0.5 });
    
    // Multi-tap delay reverb
    const delays = [0.03, 0.05, 0.08, 0.13];
    const feedback = new GainNode(this.ctx, { gain: 0.4 });
    const filter = new BiquadFilterNode(this.ctx, {
      type: 'lowpass',
      frequency: 2000,
      Q: 0.5,
    });
    
    delays.forEach((time, i) => {
      const delay = new DelayNode(this.ctx, { delayTime: time });
      const gain = new GainNode(this.ctx, { gain: 0.3 / (i + 1) });
      reverbSend.connect(delay);
      delay.connect(gain);
      gain.connect(filter);
    });
    
    filter.connect(feedback);
    feedback.connect(reverbSend);
    filter.connect(reverbReturn);
    
    return { reverbSend, reverbReturn };
  }

  private initMusicState(): MusicState {
    // Curated scales for deep electro
    const goodScales: ScaleName[] = [
      'minorPentatonic',
      'dorian',
      'phrygian',
      'aeolian',
    ];
    
    const scaleName = goodScales[Math.floor(Math.random() * goodScales.length)];
    const scale = SCALES[scaleName];
    
    // Deep bass roots (D2-A2 range)
    const roots = [38, 40, 41, 43, 45];
    const root = roots[Math.floor(Math.random() * roots.length)];
    
    const notes = getScaleNotes(root, [...scale], 4);
    
    return { root, scale: [...scale], scaleName, notes, kitName: '', synthName: '' };
  }

  setKitName(name: string) {
    this.state.kitName = name;
  }

  setSynthName(name: string) {
    this.state.synthName = name;
  }

  private setupModulation() {
    // Global modulation sources
    this.mods.add('filterMain', ModPresets.slow(900, 400));
    this.mods.add('intensity', ModPresets.glacial(0.65, 0.15));
    this.mods.add('velocity', ModPresets.medium(0.7, 0.12));
    this.mods.add('detune', ModPresets.fast(0, 6));
    this.mods.add('filterRes', ModPresets.slow(2, 1.5));
  }

  // Trigger sidechain ducking (called by kick)
  // Uses short attack ramp to avoid clicks from instant gain changes
  triggerSidechain(time: number) {
    const attackTime = 0.003; // 3ms attack to avoid clicks
    this.sidechainGain.gain.setValueAtTime(1, time);
    this.sidechainGain.gain.linearRampToValueAtTime(this.duckAmount, time + attackTime);
    this.sidechainGain.gain.linearRampToValueAtTime(1, time + attackTime + this.duckRelease);
  }

  // Main bus for melodic layers (gets sidechained)
  getMainBus(): GainNode {
    return this.mainBus;
  }

  // Drum bus bypasses sidechain
  getDrumBus(): DynamicsCompressorNode {
    return this.compressor;
  }

  registerLayer(layer: ClockListener) {
    this.layers.push(layer);
    this.clock.subscribe(layer);
  }

  start() {
    this.clock.start();
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    this.clock.stop();
    this.ctx.suspend().catch(() => {
      // Ignore suspend errors; audio will be stopped by clock.
    });
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.ctx.resume()
      .then(() => {
        this.clock.start();
      })
      .catch(() => {
        this.clock.start();
      });
  }

  stop() {
    this.clock.stop();
    
    const now = this.ctx.currentTime;
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + 2);
    
    setTimeout(() => {
      this.ctx.close();
    }, 2500);
  }

  noteToFreq(midi: number): number {
    return midiToFreq(midi);
  }

  getTime(): number {
    return this.ctx.currentTime;
  }
}
