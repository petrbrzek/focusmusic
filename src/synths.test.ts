import { describe, it, expect } from 'vitest';
import {
  SYNTH_PRESETS,
  NO_ARP_CHANCE,
  getRandomSynthPreset,
  makeDistortionCurve,
} from './synths';

describe('SYNTH_PRESETS', () => {
  it('has at least one preset', () => {
    expect(SYNTH_PRESETS.length).toBeGreaterThan(0);
  });

  it('all presets have required properties', () => {
    for (const preset of SYNTH_PRESETS) {
      expect(preset.name).toBeDefined();
      expect(typeof preset.name).toBe('string');
      expect(preset.description).toBeDefined();
      expect(preset.oscillators).toBeDefined();
      expect(preset.oscillators.length).toBeGreaterThan(0);
    }
  });

  it('all presets have valid envelope parameters', () => {
    for (const preset of SYNTH_PRESETS) {
      expect(preset.attack).toBeGreaterThanOrEqual(0);
      expect(preset.decay).toBeGreaterThan(0);
      expect(preset.sustain).toBeGreaterThanOrEqual(0);
      expect(preset.sustain).toBeLessThanOrEqual(1);
      expect(preset.release).toBeGreaterThanOrEqual(0);
    }
  });

  it('all presets have valid filter parameters', () => {
    for (const preset of SYNTH_PRESETS) {
      expect(['lowpass', 'bandpass', 'highpass']).toContain(preset.filterType);
      expect(preset.filterFreqStart).toBeGreaterThan(0);
      expect(preset.filterFreqEnd).toBeGreaterThan(0);
      expect(preset.filterQ).toBeGreaterThanOrEqual(0);
    }
  });

  it('all presets have valid oscillator layers', () => {
    for (const preset of SYNTH_PRESETS) {
      for (const osc of preset.oscillators) {
        expect(['sine', 'triangle', 'square', 'sawtooth']).toContain(osc.waveform);
        expect(osc.detuneRange).toBeGreaterThanOrEqual(0);
        expect(osc.gainMultiplier).toBeGreaterThanOrEqual(0);
        expect(osc.gainMultiplier).toBeLessThanOrEqual(1);
        expect(osc.octaveOffset).toBeGreaterThanOrEqual(-2);
        expect(osc.octaveOffset).toBeLessThanOrEqual(2);
      }
    }
  });

  it('all presets have valid character parameters', () => {
    for (const preset of SYNTH_PRESETS) {
      expect(preset.distortion).toBeGreaterThanOrEqual(0);
      expect(preset.distortion).toBeLessThanOrEqual(1);
      expect(preset.reverbSend).toBeGreaterThanOrEqual(0);
      expect(preset.reverbSend).toBeLessThanOrEqual(1);
      expect(preset.density).toBeGreaterThan(0);
      expect(preset.density).toBeLessThanOrEqual(1);
    }
  });

  it('all presets have valid velocity range', () => {
    for (const preset of SYNTH_PRESETS) {
      const [min, max] = preset.velocityRange;
      expect(min).toBeGreaterThanOrEqual(0);
      expect(max).toBeLessThanOrEqual(1);
      expect(min).toBeLessThanOrEqual(max);
    }
  });

  it('has unique preset names', () => {
    const names = SYNTH_PRESETS.map(p => p.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});

describe('NO_ARP_CHANCE', () => {
  it('is a valid probability', () => {
    expect(NO_ARP_CHANCE).toBeGreaterThanOrEqual(0);
    expect(NO_ARP_CHANCE).toBeLessThanOrEqual(1);
  });
});

describe('getRandomSynthPreset', () => {
  it('returns a preset or null', () => {
    for (let i = 0; i < 50; i++) {
      const preset = getRandomSynthPreset();
      if (preset !== null) {
        expect(preset.name).toBeDefined();
        expect(preset.oscillators).toBeDefined();
        expect(SYNTH_PRESETS).toContain(preset);
      }
    }
  });

  it('sometimes returns null (no arp)', () => {
    // Run many times to check we get null at least once
    let gotNull = false;
    for (let i = 0; i < 100; i++) {
      if (getRandomSynthPreset() === null) {
        gotNull = true;
        break;
      }
    }
    // With 15% chance, probability of not getting null in 100 tries is very low
    expect(gotNull).toBe(true);
  });

  it('mostly returns presets', () => {
    let presetCount = 0;
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      if (getRandomSynthPreset() !== null) {
        presetCount++;
      }
    }
    // Should get presets most of the time (at least 50%)
    expect(presetCount).toBeGreaterThan(iterations * 0.5);
  });
});

describe('makeDistortionCurve', () => {
  it('returns a Float32Array', () => {
    const curve = makeDistortionCurve(0.5);
    expect(curve).toBeInstanceOf(Float32Array);
  });

  it('returns correct number of samples', () => {
    const curve = makeDistortionCurve(0.5);
    expect(curve.length).toBe(44100);
  });

  it('values are normalized (within -1 to 1 range)', () => {
    const curve = makeDistortionCurve(0.5);
    for (let i = 0; i < curve.length; i++) {
      expect(curve[i]).toBeGreaterThanOrEqual(-1);
      expect(curve[i]).toBeLessThanOrEqual(1);
    }
  });

  it('produces different curves for different amounts', () => {
    const gentle = makeDistortionCurve(0);
    const harsh = makeDistortionCurve(1);

    // Check at quarter point (where input is around -0.5)
    const quarterPoint = Math.floor(44100 / 4);
    // Values should differ
    expect(gentle[quarterPoint]).not.toBeCloseTo(harsh[quarterPoint], 1);
  });
});
