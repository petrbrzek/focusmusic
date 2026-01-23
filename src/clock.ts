/**
 * Central Clock - Single source of timing truth
 * 
 * All layers subscribe to clock events for tight synchronization.
 * Uses a high-resolution timer with lookahead scheduling.
 */

export type ClockEvent = 'tick' | 'beat' | 'bar' | 'phrase';

export interface ClockListener {
  onTick?(tick: number, time: number): void;
  onBeat?(beat: number, time: number): void;
  onBar?(bar: number, time: number): void;
  onPhrase?(phrase: number, time: number): void;
}

export class Clock {
  private bpm: number;
  private ticksPerBeat = 4; // 16th notes
  private beatsPerBar = 4;
  private barsPerPhrase = 4;
  private lookahead = 0.2; // seconds of scheduling headroom
  private intervalMs = 25;
  private warningThreshold = 0.03; // warn if scheduling closer than 30ms
  private debug = false;
  private lastWarning = 0;
  
  private currentTick = 0;
  private currentBeat = 0;
  private currentBar = 0;
  private currentPhrase = 0;

  private listeners: ClockListener[] = [];
  private intervalId?: Timer;
  private startTime = 0;
  
  // Audio context for precise timing
  private getTime: () => number;
  
  constructor(
    bpm: number,
    getTime: () => number,
    options: { debug?: boolean; lookahead?: number } = {},
  ) {
    this.bpm = bpm;
    this.getTime = getTime;
    if (options.lookahead) this.lookahead = options.lookahead;
    this.debug = !!options.debug;
  }

  get tickDuration(): number {
    return 60 / this.bpm / this.ticksPerBeat;
  }

  get beatDuration(): number {
    return 60 / this.bpm;
  }

  get barDuration(): number {
    return this.beatDuration * this.beatsPerBar;
  }

  subscribe(listener: ClockListener) {
    this.listeners.push(listener);
  }

  unsubscribe(listener: ClockListener) {
    const idx = this.listeners.indexOf(listener);
    if (idx >= 0) this.listeners.splice(idx, 1);
  }

  setBpm(bpm: number) {
    this.bpm = Math.max(60, Math.min(140, bpm));
  }

  getBpm(): number {
    return this.bpm;
  }

  start() {
    this.startTime = this.getTime();
    this.currentTick = 0;
    this.currentBeat = 0;
    this.currentBar = 0;
    this.currentPhrase = 0;

    // Use setInterval for the main loop, but calculate precise times
    const scheduleAhead = this.lookahead; // Look ahead 200ms by default
    let lastScheduledTick = -1;

    const schedule = () => {
      const now = this.getTime();
      const elapsed = now - this.startTime;
      
      // Calculate which tick we should be at
      const tickTime = this.tickDuration;
      const currentTickFloat = elapsed / tickTime;
      const targetTick = Math.floor(currentTickFloat + scheduleAhead / tickTime);

      // Schedule any ticks we haven't scheduled yet
      for (let tick = lastScheduledTick + 1; tick <= targetTick; tick++) {
        const tickStartTime = this.startTime + tick * tickTime;
        const headroom = tickStartTime - now;
        
        // Calculate beat/bar/phrase from tick
        const tickInBeat = tick % this.ticksPerBeat;
        const beat = Math.floor(tick / this.ticksPerBeat);
        const beatInBar = beat % this.beatsPerBar;
        const bar = Math.floor(beat / this.beatsPerBar);
        const barInPhrase = bar % this.barsPerPhrase;
        const phrase = Math.floor(bar / this.barsPerPhrase);

        if (this.debug && headroom < this.warningThreshold) {
          // Warn once per second at most to avoid spamming.
          if (now - this.lastWarning > 1) {
            const msHeadroom = Math.max(0, Math.round(headroom * 1000));
            console.log(
              `  [audio] scheduling tight: ${msHeadroom}ms headroom at tick ${tick} (bpm=${this.bpm})`
            );
            this.lastWarning = now;
          }
        }

        // Fire events
        this.listeners.forEach(l => {
          l.onTick?.(tick, tickStartTime);
          
          if (tickInBeat === 0) {
            l.onBeat?.(beat, tickStartTime);
          }
          if (tickInBeat === 0 && beatInBar === 0) {
            l.onBar?.(bar, tickStartTime);
          }
          if (tickInBeat === 0 && beatInBar === 0 && barInPhrase === 0) {
            l.onPhrase?.(phrase, tickStartTime);
          }
        });

        this.currentTick = tick;
        this.currentBeat = beat;
        this.currentBar = bar;
        this.currentPhrase = phrase;
      }

      lastScheduledTick = targetTick;
    };

    // Run scheduler frequently for tight timing
    this.intervalId = setInterval(schedule, this.intervalMs);
    schedule(); // Run immediately
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  // Get current position info
  getPosition() {
    return {
      tick: this.currentTick,
      beat: this.currentBeat,
      bar: this.currentBar,
      phrase: this.currentPhrase,
    };
  }
}
