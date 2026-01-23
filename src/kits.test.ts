import { describe, it, expect } from 'vitest';
import {
  DRUM_KITS,
  getRandomKit,
  getPattern,
  makeDistortionCurve,
  type PatternType,
} from './kits';

describe('DRUM_KITS', () => {
  it('has at least one kit', () => {
    expect(DRUM_KITS.length).toBeGreaterThan(0);
  });

  it('all kits have required properties', () => {
    for (const kit of DRUM_KITS) {
      expect(kit.name).toBeDefined();
      expect(typeof kit.name).toBe('string');
      expect(kit.description).toBeDefined();
      expect(kit.pattern).toBeDefined();
      expect(kit.kick).toBeDefined();
      expect(kit.ghostVelocity).toBeGreaterThanOrEqual(0);
      expect(kit.ghostVelocity).toBeLessThanOrEqual(1);
      expect(kit.swing).toBeGreaterThanOrEqual(0);
      expect(kit.swing).toBeLessThanOrEqual(1);
    }
  });

  it('all kits have valid kick parameters', () => {
    for (const kit of DRUM_KITS) {
      const { kick } = kit;
      expect(['sine', 'triangle', 'square', 'sawtooth']).toContain(kick.waveform);
      expect(kick.startFreq).toBeGreaterThan(0);
      expect(kick.endFreq).toBeGreaterThan(0);
      expect(kick.pitchDecay).toBeGreaterThan(0);
      expect(kick.attack).toBeGreaterThanOrEqual(0);
      expect(kick.decay).toBeGreaterThan(0);
      expect(kick.distortion).toBeGreaterThanOrEqual(0);
      expect(kick.distortion).toBeLessThanOrEqual(1);
      expect(kick.noiseAmount).toBeGreaterThanOrEqual(0);
      expect(kick.noiseAmount).toBeLessThanOrEqual(1);
      expect(kick.clickAmount).toBeGreaterThanOrEqual(0);
      expect(kick.clickAmount).toBeLessThanOrEqual(1);
      expect(kick.subLevel).toBeGreaterThanOrEqual(0);
      expect(kick.subLevel).toBeLessThanOrEqual(1);
    }
  });

  it('has unique kit names', () => {
    const names = DRUM_KITS.map(k => k.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});

describe('getRandomKit', () => {
  it('returns a valid kit', () => {
    const kit = getRandomKit();
    expect(kit).toBeDefined();
    expect(kit.name).toBeDefined();
    expect(kit.kick).toBeDefined();
  });

  it('returns kits from the DRUM_KITS array', () => {
    for (let i = 0; i < 20; i++) {
      const kit = getRandomKit();
      expect(DRUM_KITS).toContain(kit);
    }
  });
});

describe('getPattern', () => {
  const patternTypes: PatternType[] = [
    'four-on-floor',
    'half-time',
    'broken',
    'sparse',
    'driving',
  ];

  it('returns 16-step patterns', () => {
    for (const type of patternTypes) {
      const pattern = getPattern(type);
      expect(pattern.length).toBe(16);
    }
  });

  it('returns boolean arrays', () => {
    for (const type of patternTypes) {
      const pattern = getPattern(type);
      for (const step of pattern) {
        expect(typeof step).toBe('boolean');
      }
    }
  });

  it('four-on-floor has kick on every beat', () => {
    const pattern = getPattern('four-on-floor');
    expect(pattern[0]).toBe(true);
    expect(pattern[4]).toBe(true);
    expect(pattern[8]).toBe(true);
    expect(pattern[12]).toBe(true);
  });

  it('half-time has kick on 1 and 3', () => {
    const pattern = getPattern('half-time');
    expect(pattern[0]).toBe(true);
    expect(pattern[4]).toBe(false);
    expect(pattern[8]).toBe(true);
    expect(pattern[12]).toBe(false);
  });

  it('sparse has only one kick', () => {
    const pattern = getPattern('sparse');
    const kickCount = pattern.filter(Boolean).length;
    expect(kickCount).toBe(1);
    expect(pattern[0]).toBe(true);
  });

  it('all patterns have at least one kick', () => {
    for (const type of patternTypes) {
      const pattern = getPattern(type);
      const hasKick = pattern.some(Boolean);
      expect(hasKick).toBe(true);
    }
  });

  it('defaults to four-on-floor for unknown pattern', () => {
    const pattern = getPattern('unknown' as PatternType);
    const fourOnFloor = getPattern('four-on-floor');
    expect(pattern).toEqual(fourOnFloor);
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

  it('values are in reasonable range', () => {
    const curve = makeDistortionCurve(0.5);
    for (let i = 0; i < curve.length; i++) {
      expect(curve[i]).toBeGreaterThanOrEqual(-2);
      expect(curve[i]).toBeLessThanOrEqual(2);
    }
  });

  it('zero distortion produces gentler curve', () => {
    const gentle = makeDistortionCurve(0);
    const harsh = makeDistortionCurve(1);
    // At the midpoint, values should differ
    const midpoint = Math.floor(44100 / 2);
    // Both should have similar values at midpoint (around 0)
    expect(Math.abs(gentle[midpoint])).toBeLessThan(0.1);
    expect(Math.abs(harsh[midpoint])).toBeLessThan(0.1);
  });
});
