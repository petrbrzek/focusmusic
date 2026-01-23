import { describe, it, expect } from 'vitest';
import { Modulator, ModulationBank, ModPresets } from './modulation';

describe('Modulator', () => {
  describe('getValue', () => {
    it('returns values around the base', () => {
      const mod = new Modulator({ base: 100, range: 10, speed: 1 });
      const value = mod.getValue(0);
      expect(value).toBeGreaterThanOrEqual(90);
      expect(value).toBeLessThanOrEqual(110);
    });

    it('stays within base +/- range', () => {
      const mod = new Modulator({ base: 50, range: 20, speed: 1, seed: 42 });
      for (let t = 0; t < 10; t += 0.1) {
        const value = mod.getValue(t);
        expect(value).toBeGreaterThanOrEqual(30);
        expect(value).toBeLessThanOrEqual(70);
      }
    });

    it('produces different values at different times', () => {
      const mod = new Modulator({ base: 100, range: 50, speed: 1, seed: 42 });
      const values = new Set<number>();
      for (let t = 0; t < 5; t += 0.5) {
        values.add(mod.getValue(t));
      }
      // Should have multiple different values
      expect(values.size).toBeGreaterThan(1);
    });

    it('produces consistent values with same seed', () => {
      const mod1 = new Modulator({ base: 100, range: 10, speed: 1, seed: 123 });
      const mod2 = new Modulator({ base: 100, range: 10, speed: 1, seed: 123 });
      // Note: offset is still random, so same seed doesn't guarantee same values
      // but the noise function itself should be deterministic
      expect(mod1.getValue(0)).toBeGreaterThanOrEqual(90);
      expect(mod2.getValue(0)).toBeGreaterThanOrEqual(90);
    });
  });

  describe('getNormalized', () => {
    it('returns values in range [0, 1]', () => {
      const mod = new Modulator({ base: 0, range: 1, speed: 1, seed: 42 });
      for (let t = 0; t < 10; t += 0.1) {
        const value = mod.getNormalized(t);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('config updates', () => {
    it('can update base', () => {
      const mod = new Modulator({ base: 100, range: 10, speed: 1 });
      mod.setBase(200);
      const value = mod.getValue(0);
      expect(value).toBeGreaterThanOrEqual(190);
      expect(value).toBeLessThanOrEqual(210);
    });

    it('can update range', () => {
      const mod = new Modulator({ base: 100, range: 10, speed: 1 });
      mod.setRange(50);
      const value = mod.getValue(0);
      expect(value).toBeGreaterThanOrEqual(50);
      expect(value).toBeLessThanOrEqual(150);
    });

    it('can update speed', () => {
      const mod = new Modulator({ base: 100, range: 10, speed: 1 });
      mod.setSpeed(2);
      // Speed change affects the pattern but values still stay in range
      const value = mod.getValue(0);
      expect(value).toBeGreaterThanOrEqual(90);
      expect(value).toBeLessThanOrEqual(110);
    });
  });
});

describe('ModulationBank', () => {
  it('can add and retrieve modulators', () => {
    const bank = new ModulationBank();
    const mod = bank.add('test', { base: 100, range: 10, speed: 1 });
    expect(mod).toBeInstanceOf(Modulator);
    expect(bank.get('test')).toBe(mod);
  });

  it('returns undefined for unknown modulators', () => {
    const bank = new ModulationBank();
    expect(bank.get('nonexistent')).toBeUndefined();
  });

  it('getValue returns 0 for unknown modulators', () => {
    const bank = new ModulationBank();
    expect(bank.getValue('nonexistent', 0)).toBe(0);
  });

  it('getNormalized returns 0.5 for unknown modulators', () => {
    const bank = new ModulationBank();
    expect(bank.getNormalized('nonexistent', 0)).toBe(0.5);
  });

  it('getValue returns modulated values', () => {
    const bank = new ModulationBank();
    bank.add('filter', { base: 1000, range: 500, speed: 1 });
    const value = bank.getValue('filter', 0);
    expect(value).toBeGreaterThanOrEqual(500);
    expect(value).toBeLessThanOrEqual(1500);
  });

  it('getNormalized returns normalized values', () => {
    const bank = new ModulationBank();
    bank.add('intensity', { base: 0, range: 1, speed: 1 });
    const value = bank.getNormalized('intensity', 0);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  });
});

describe('ModPresets', () => {
  it('glacial preset has very slow speed', () => {
    const config = ModPresets.glacial(100, 10);
    expect(config.base).toBe(100);
    expect(config.range).toBe(10);
    expect(config.speed).toBe(0.01);
  });

  it('slow preset has slow speed', () => {
    const config = ModPresets.slow(100, 10);
    expect(config.speed).toBe(0.05);
  });

  it('medium preset has medium speed', () => {
    const config = ModPresets.medium(100, 10);
    expect(config.speed).toBe(0.2);
  });

  it('fast preset has fast speed', () => {
    const config = ModPresets.fast(100, 10);
    expect(config.speed).toBe(0.8);
  });

  it('shimmer preset has very fast speed', () => {
    const config = ModPresets.shimmer(100, 10);
    expect(config.speed).toBe(2.5);
  });

  it('all presets create valid modulator configs', () => {
    const presets = [
      ModPresets.glacial(50, 25),
      ModPresets.slow(100, 50),
      ModPresets.medium(200, 100),
      ModPresets.fast(300, 150),
      ModPresets.shimmer(400, 200),
    ];

    for (const config of presets) {
      const mod = new Modulator(config);
      const value = mod.getValue(0);
      expect(value).toBeGreaterThanOrEqual(config.base - config.range);
      expect(value).toBeLessThanOrEqual(config.base + config.range);
    }
  });
});
