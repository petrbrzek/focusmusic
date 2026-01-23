import { describe, it, expect } from 'vitest';
import {
  SCALES,
  midiToFreq,
  freqToMidi,
  midiToName,
  getScaleNotes,
  getChordTones,
  INTERVALS,
} from './scales';

describe('midiToFreq', () => {
  it('converts A4 (MIDI 69) to 440 Hz', () => {
    expect(midiToFreq(69)).toBe(440);
  });

  it('converts A3 (MIDI 57) to 220 Hz', () => {
    expect(midiToFreq(57)).toBeCloseTo(220, 5);
  });

  it('converts A5 (MIDI 81) to 880 Hz', () => {
    expect(midiToFreq(81)).toBeCloseTo(880, 5);
  });

  it('converts C4 (MIDI 60) correctly', () => {
    expect(midiToFreq(60)).toBeCloseTo(261.626, 2);
  });
});

describe('freqToMidi', () => {
  it('converts 440 Hz to MIDI 69 (A4)', () => {
    expect(freqToMidi(440)).toBe(69);
  });

  it('converts 220 Hz to MIDI 57 (A3)', () => {
    expect(freqToMidi(220)).toBeCloseTo(57, 5);
  });

  it('is inverse of midiToFreq', () => {
    for (const midi of [48, 60, 69, 72, 84]) {
      const freq = midiToFreq(midi);
      expect(freqToMidi(freq)).toBeCloseTo(midi, 5);
    }
  });
});

describe('midiToName', () => {
  it('converts MIDI 60 to C4', () => {
    expect(midiToName(60)).toBe('C4');
  });

  it('converts MIDI 69 to A4', () => {
    expect(midiToName(69)).toBe('A4');
  });

  it('converts MIDI 48 to C3', () => {
    expect(midiToName(48)).toBe('C3');
  });

  it('handles sharps correctly', () => {
    expect(midiToName(61)).toBe('C#4');
    expect(midiToName(70)).toBe('A#4');
  });
});

describe('getScaleNotes', () => {
  it('generates minor pentatonic scale from C4', () => {
    const notes = getScaleNotes(60, [...SCALES.minorPentatonic], 1);
    expect(notes).toEqual([60, 63, 65, 67, 70]);
  });

  it('generates two octaves of minor pentatonic', () => {
    const notes = getScaleNotes(60, [...SCALES.minorPentatonic], 2);
    expect(notes).toEqual([60, 63, 65, 67, 70, 72, 75, 77, 79, 82]);
  });

  it('generates dorian mode correctly', () => {
    const notes = getScaleNotes(60, [...SCALES.dorian], 1);
    expect(notes).toEqual([60, 62, 63, 65, 67, 69, 70]);
  });

  it('defaults to 2 octaves', () => {
    const notes = getScaleNotes(60, [...SCALES.minorPentatonic]);
    expect(notes.length).toBe(10);
  });
});

describe('getChordTones', () => {
  it('returns 3 notes for pentatonic scale (1st, 3rd, 5th)', () => {
    const tones = getChordTones(60, [...SCALES.minorPentatonic]);
    expect(tones.length).toBe(3);
    expect(tones).toEqual([60, 65, 70]);
  });

  it('returns 4 notes for full scale (1st, 3rd, 5th, 7th)', () => {
    const tones = getChordTones(60, [...SCALES.dorian]);
    expect(tones.length).toBe(4);
    expect(tones).toEqual([60, 63, 67, 70]);
  });
});

describe('SCALES', () => {
  it('all scales start with 0 (root)', () => {
    for (const [name, scale] of Object.entries(SCALES)) {
      expect(scale[0]).toBe(0);
    }
  });

  it('all scale intervals are within an octave', () => {
    for (const [name, scale] of Object.entries(SCALES)) {
      for (const interval of scale) {
        expect(interval).toBeGreaterThanOrEqual(0);
        expect(interval).toBeLessThan(12);
      }
    }
  });

  it('minor pentatonic has 5 notes', () => {
    expect(SCALES.minorPentatonic.length).toBe(5);
  });

  it('dorian has 7 notes', () => {
    expect(SCALES.dorian.length).toBe(7);
  });
});

describe('INTERVALS', () => {
  it('has correct values for common intervals', () => {
    expect(INTERVALS.unison).toBe(0);
    expect(INTERVALS.minorThird).toBe(3);
    expect(INTERVALS.majorThird).toBe(4);
    expect(INTERVALS.perfectFifth).toBe(7);
    expect(INTERVALS.octave).toBe(12);
  });
});
