import { describe, it, expect, beforeEach } from 'vitest';
import { nodeCounter, getMemoryMB } from './diagnostics';

describe('nodeCounter', () => {
  beforeEach(() => {
    nodeCounter.reset();
  });

  it('starts at zero', () => {
    expect(nodeCounter.getActive()).toBe(0);
    expect(nodeCounter.getStats()).toEqual({
      created: 0,
      cleaned: 0,
      active: 0,
    });
  });

  it('tracks created nodes', () => {
    nodeCounter.create();
    expect(nodeCounter.getActive()).toBe(1);

    nodeCounter.create(5);
    expect(nodeCounter.getActive()).toBe(6);
  });

  it('tracks cleaned up nodes', () => {
    nodeCounter.create(10);
    nodeCounter.cleanup(3);
    expect(nodeCounter.getActive()).toBe(7);
  });

  it('getStats returns full breakdown', () => {
    nodeCounter.create(10);
    nodeCounter.cleanup(4);

    const stats = nodeCounter.getStats();
    expect(stats.created).toBe(10);
    expect(stats.cleaned).toBe(4);
    expect(stats.active).toBe(6);
  });

  it('reset clears all counts', () => {
    nodeCounter.create(100);
    nodeCounter.cleanup(50);
    nodeCounter.reset();

    expect(nodeCounter.getActive()).toBe(0);
    expect(nodeCounter.getStats()).toEqual({
      created: 0,
      cleaned: 0,
      active: 0,
    });
  });

  it('handles cleanup exceeding creation', () => {
    nodeCounter.create(5);
    nodeCounter.cleanup(10);
    // Active can be negative (indicates a bug in real usage, but counter allows it)
    expect(nodeCounter.getActive()).toBe(-5);
  });

  it('defaults to count of 1', () => {
    nodeCounter.create();
    nodeCounter.create();
    nodeCounter.cleanup();
    expect(nodeCounter.getActive()).toBe(1);
  });
});

describe('getMemoryMB', () => {
  it('returns a positive number', () => {
    const mem = getMemoryMB();
    expect(typeof mem).toBe('number');
    expect(mem).toBeGreaterThan(0);
  });

  it('returns an integer', () => {
    const mem = getMemoryMB();
    expect(Number.isInteger(mem)).toBe(true);
  });

  it('returns reasonable memory value', () => {
    const mem = getMemoryMB();
    // Should be at least 1MB and less than 10GB
    expect(mem).toBeGreaterThanOrEqual(1);
    expect(mem).toBeLessThan(10000);
  });
});
