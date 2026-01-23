import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Clock, type ClockListener } from './clock';

describe('Clock', () => {
  let mockTime: number;
  let getTime: () => number;

  beforeEach(() => {
    mockTime = 0;
    getTime = () => mockTime;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('timing calculations', () => {
    it('calculates tick duration correctly at 120 BPM', () => {
      const clock = new Clock(120, getTime);
      // At 120 BPM, one beat = 0.5s, one tick (16th note) = 0.125s
      expect(clock.tickDuration).toBeCloseTo(0.125, 5);
    });

    it('calculates tick duration correctly at 60 BPM', () => {
      const clock = new Clock(60, getTime);
      // At 60 BPM, one beat = 1s, one tick = 0.25s
      expect(clock.tickDuration).toBeCloseTo(0.25, 5);
    });

    it('calculates beat duration correctly', () => {
      const clock = new Clock(120, getTime);
      expect(clock.beatDuration).toBeCloseTo(0.5, 5);
    });

    it('calculates bar duration correctly', () => {
      const clock = new Clock(120, getTime);
      // 4 beats per bar at 120 BPM = 2 seconds
      expect(clock.barDuration).toBeCloseTo(2, 5);
    });
  });

  describe('BPM control', () => {
    it('can change BPM', () => {
      const clock = new Clock(120, getTime);
      clock.setBpm(100);
      expect(clock.getBpm()).toBe(100);
    });

    it('clamps BPM to minimum of 60', () => {
      const clock = new Clock(120, getTime);
      clock.setBpm(30);
      expect(clock.getBpm()).toBe(60);
    });

    it('clamps BPM to maximum of 140', () => {
      const clock = new Clock(120, getTime);
      clock.setBpm(200);
      expect(clock.getBpm()).toBe(140);
    });
  });

  describe('subscription', () => {
    it('can subscribe listeners', () => {
      const clock = new Clock(120, getTime);
      const listener: ClockListener = {
        onTick: vi.fn(),
      };
      clock.subscribe(listener);
      clock.start();

      // Advance past initial schedule
      vi.advanceTimersByTime(50);

      expect(listener.onTick).toHaveBeenCalled();
      clock.stop();
    });

    it('can unsubscribe listeners', () => {
      const clock = new Clock(120, getTime);
      const listener: ClockListener = {
        onTick: vi.fn(),
      };
      clock.subscribe(listener);
      clock.unsubscribe(listener);
      clock.start();

      vi.advanceTimersByTime(50);

      expect(listener.onTick).not.toHaveBeenCalled();
      clock.stop();
    });
  });

  describe('events', () => {
    it('fires onTick events', () => {
      const clock = new Clock(120, getTime);
      const listener: ClockListener = {
        onTick: vi.fn(),
      };
      clock.subscribe(listener);
      clock.start();

      vi.advanceTimersByTime(50);

      expect(listener.onTick).toHaveBeenCalled();
      clock.stop();
    });

    it('fires onBeat at the start of each beat', () => {
      const clock = new Clock(120, getTime);
      const listener: ClockListener = {
        onBeat: vi.fn(),
      };
      clock.subscribe(listener);
      clock.start();

      vi.advanceTimersByTime(50);

      // First beat should fire immediately
      expect(listener.onBeat).toHaveBeenCalled();
      clock.stop();
    });

    it('fires onBar at the start of each bar', () => {
      const clock = new Clock(120, getTime);
      const listener: ClockListener = {
        onBar: vi.fn(),
      };
      clock.subscribe(listener);
      clock.start();

      vi.advanceTimersByTime(50);

      // First bar should fire immediately
      expect(listener.onBar).toHaveBeenCalled();
      clock.stop();
    });

    it('fires onPhrase at the start of each phrase', () => {
      const clock = new Clock(120, getTime);
      const listener: ClockListener = {
        onPhrase: vi.fn(),
      };
      clock.subscribe(listener);
      clock.start();

      vi.advanceTimersByTime(50);

      // First phrase should fire immediately
      expect(listener.onPhrase).toHaveBeenCalled();
      clock.stop();
    });
  });

  describe('position tracking', () => {
    it('tracks current position', () => {
      const clock = new Clock(120, getTime);
      clock.start();

      const pos = clock.getPosition();
      expect(pos).toHaveProperty('tick');
      expect(pos).toHaveProperty('beat');
      expect(pos).toHaveProperty('bar');
      expect(pos).toHaveProperty('phrase');

      clock.stop();
    });

    it('starts at position 0', () => {
      const clock = new Clock(120, getTime);
      clock.start();

      vi.advanceTimersByTime(10);
      const pos = clock.getPosition();
      expect(pos.tick).toBeGreaterThanOrEqual(0);

      clock.stop();
    });
  });

  describe('stop', () => {
    it('stops the clock', () => {
      const clock = new Clock(120, getTime);
      const listener: ClockListener = {
        onTick: vi.fn(),
      };
      clock.subscribe(listener);
      clock.start();

      vi.advanceTimersByTime(50);
      const callsBeforeStop = (listener.onTick as ReturnType<typeof vi.fn>).mock.calls.length;

      clock.stop();
      vi.advanceTimersByTime(500);

      // No new calls after stop
      expect((listener.onTick as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsBeforeStop);
    });
  });
});
