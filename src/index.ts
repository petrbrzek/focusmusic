#!/usr/bin/env bun
/**
 * focusmusic - Infinite generative focus music for deep work
 */

import { parseArgs } from 'util';
import * as readline from 'readline';
import { Engine, type EngineConfig } from './engine';
import { PadLayer } from './layers/pad';
import { ArpLayer } from './layers/arp';
import { BeatLayer } from './layers/beat';
import { TextureLayer } from './layers/texture';

// ANSI escape codes
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Cursor
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  
  // Colors
  purple: '\x1b[38;5;141m',
  green: '\x1b[38;5;78m',
  yellow: '\x1b[38;5;221m',
  red: '\x1b[38;5;203m',
  blue: '\x1b[38;5;117m',
  pink: '\x1b[38;5;218m',
  gray: '\x1b[38;5;245m',
  darkGray: '\x1b[38;5;239m',
  white: '\x1b[38;5;253m',
};

// Track length range (8-15 minutes, randomized per track)
const MIN_TRACK_LENGTH = 8 * 60;
const MAX_TRACK_LENGTH = 15 * 60;

function getRandomTrackLength(): number {
  return Math.floor(MIN_TRACK_LENGTH + Math.random() * (MAX_TRACK_LENGTH - MIN_TRACK_LENGTH));
}

// Convert MIDI note to readable name
function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const note = noteNames[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

// Format seconds to MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function printHelp() {
  console.log(`
  ${c.bold}${c.purple}focusmusic${c.reset} - deep generative electronic music

  ${c.dim}Usage:${c.reset} focusmusic [options]

  ${c.dim}Options:${c.reset}
    --bpm <number>      Set tempo (70-120, default: 89)
    --volume <number>   Master volume (0-100, default: 75)
    --latency <mode>    Audio latency: interactive | balanced | playback (default: playback)
    --diagnostics       Print scheduler headroom warnings (helps debug crackles)
    --help, -h          Show this help message

  ${c.dim}Controls:${c.reset}
    p                   Pause / Resume
    n / Space           Next track
    q / Escape          Quit

  ${c.dim}Examples:${c.reset}
    focusmusic              # Start with default settings
    focusmusic --bpm 95     # Slightly faster tempo
    focusmusic --volume 50  # Quieter for background listening
  `);
}

interface AudioLayers {
  engine: Engine;
  pad: PadLayer;
  texture: TextureLayer;
  arp: ArpLayer;
  beat: BeatLayer;
}

function createLayers(config: Partial<EngineConfig>): AudioLayers {
  const engine = new Engine(config);

  const pad = new PadLayer(engine);
  engine.registerLayer(pad);

  const texture = new TextureLayer(engine);
  engine.registerLayer(texture);

  const arp = new ArpLayer(engine);
  engine.registerLayer(arp);

  const beat = new BeatLayer(engine);
  engine.registerLayer(beat);

  engine.start();

  return { engine, pad, texture, arp, beat };
}

function stopLayers(layers: AudioLayers): Promise<void> {
  return new Promise((resolve) => {
    layers.pad.stop();
    layers.texture.stop();
    layers.arp.stop();
    layers.beat.stop();
    layers.engine.stop();
    
    setTimeout(resolve, 2500);
  });
}

function clearScreen() {
  // Clear screen and move cursor to top-left
  process.stdout.write('\x1b[2J\x1b[H');
}

function hideCursor() {
  process.stdout.write(c.hideCursor);
}

function showCursor() {
  process.stdout.write(c.showCursor);
}

function printTrackInfo(layers: AudioLayers, trackLength: number, status: 'playing' | 'paused' | 'switching' | 'stopping' = 'playing') {
  const state = layers.engine.state;
  const config = layers.engine.config;

  const statusIcon = status === 'playing' ? `${c.green}▶${c.reset}`
                   : status === 'paused' ? `${c.yellow}⏸${c.reset}`
                   : status === 'switching' ? `${c.yellow}◆${c.reset}`
                   : `${c.red}■${c.reset}`;
  const statusText = status === 'playing' ? 'Playing'
                   : status === 'paused' ? 'Paused'
                   : status === 'switching' ? 'Switching...'
                   : 'Stopping...';

  clearScreen();
  
  console.log(`
  ${c.bold}${c.purple}focusmusic${c.reset}
  ${c.darkGray}────────────────────────────────${c.reset}

  ${statusIcon} ${c.gray}${statusText}${c.reset}

  ${c.gray}Scale:${c.reset}  ${c.white}${state.scaleName}${c.reset}
  ${c.gray}Root:${c.reset}   ${c.white}${midiToNoteName(state.root)}${c.reset} ${c.dim}(${state.root})${c.reset}
  ${c.gray}BPM:${c.reset}    ${c.white}${config.bpm}${c.reset}
  ${c.gray}Kit:${c.reset}    ${c.blue}${state.kitName || 'Loading...'}${c.reset}
  ${c.gray}Synth:${c.reset}  ${c.pink}${state.synthName || 'Loading...'}${c.reset}

  ${c.darkGray}────────────────────────────────${c.reset}
  ${c.darkGray}[${c.purple}p${c.darkGray}]${c.reset} ${c.gray}Pause${c.reset}  ${c.darkGray}[${c.purple}n${c.darkGray}]${c.reset} ${c.gray}Next${c.reset}  ${c.darkGray}[${c.purple}q${c.darkGray}]${c.reset} ${c.gray}Quit${c.reset}
`);
}

function updateProgress(elapsed: number, trackLength: number) {
  const progress = Math.min(1, elapsed / trackLength);
  const barWidth = 24;
  const filledWidth = Math.floor(progress * barWidth);
  const progressBar = `${c.purple}${'━'.repeat(filledWidth)}${c.darkGray}${'─'.repeat(barWidth - filledWidth)}${c.reset}`;
  
  // Overwrite the progress line
  process.stdout.write(`\r  ${progressBar} ${c.gray}${formatTime(elapsed)}${c.darkGray} / ${c.gray}${formatTime(trackLength)}${c.reset}  `);
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      bpm: { type: 'string' },
      volume: { type: 'string' },
      latency: { type: 'string' },
      diagnostics: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const config: Partial<EngineConfig> = {};

  if (values.bpm) {
    const bpm = parseInt(values.bpm, 10);
    if (isNaN(bpm) || bpm < 70 || bpm > 120) {
      console.error('Error: BPM must be between 70 and 120');
      process.exit(1);
    }
    config.bpm = bpm;
  }

  if (values.volume) {
    const volume = parseInt(values.volume, 10);
    if (isNaN(volume) || volume < 0 || volume > 100) {
      console.error('Error: Volume must be between 0 and 100');
      process.exit(1);
    }
    config.volume = volume;
  }

  if (values.latency) {
    const latency = values.latency.toLowerCase();
    const allowedLatencies: AudioContextOptions['latencyHint'][] = [
      'interactive',
      'balanced',
      'playback',
    ];
    if (allowedLatencies.includes(latency as AudioContextOptions['latencyHint'])) {
      config.latencyHint = latency as AudioContextOptions['latencyHint'];
    } else {
      const latencyMs = Number(values.latency);
      if (!isNaN(latencyMs) && latencyMs > 0) {
        // Accept numeric values in milliseconds for advanced tuning
        config.latencyHint = latencyMs / 1000;
      } else {
        console.error('Error: Latency must be interactive | balanced | playback or a positive number (ms)');
        process.exit(1);
      }
    }
  }

  if (values.diagnostics) {
    config.debug = true;
  }

  // Create initial layers
  let layers = createLayers(config);
  let trackLength = getRandomTrackLength();
  let startTime = Date.now();
  let isQuitting = false;
  let isTransitioning = false;
  let pausedTime = 0; // Accumulated time spent paused

  // Setup raw keyboard input
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  
  // Hide cursor for cleaner UI
  hideCursor();

  // Print initial info (with small delay for layer names to populate)
  setTimeout(() => {
    printTrackInfo(layers, trackLength, 'playing');
  }, 150);

  // Progress update interval
  const progressInterval = setInterval(() => {
    if (isQuitting || isTransitioning || layers.engine.paused) return;

    const elapsed = Math.floor((Date.now() - startTime - pausedTime) / 1000);
    updateProgress(elapsed, trackLength);

    // Auto-advance when track ends
    if (elapsed >= trackLength) {
      handleNext();
    }
  }, 1000);

  async function handleNext() {
    if (isQuitting || isTransitioning) return;
    isTransitioning = true;

    printTrackInfo(layers, trackLength, 'switching');

    await stopLayers(layers);

    layers = createLayers(config);
    trackLength = getRandomTrackLength();
    startTime = Date.now();
    pausedTime = 0;
    isTransitioning = false;

    setTimeout(() => {
      printTrackInfo(layers, trackLength, 'playing');
    }, 150);
  }

  let pauseStartTime = 0;
  function handlePause() {
    if (isQuitting || isTransitioning) return;

    if (layers.engine.paused) {
      // Resume
      pausedTime += Date.now() - pauseStartTime;
      layers.engine.resume();
      printTrackInfo(layers, trackLength, 'playing');
      const elapsed = Math.floor((Date.now() - startTime - pausedTime) / 1000);
      updateProgress(elapsed, trackLength);
    } else {
      // Pause
      pauseStartTime = Date.now();
      layers.engine.pause();
      printTrackInfo(layers, trackLength, 'paused');
      const elapsed = Math.floor((Date.now() - startTime - pausedTime) / 1000);
      updateProgress(elapsed, trackLength);
    }
  }

  async function handleQuit() {
    if (isQuitting) return;
    isQuitting = true;
    
    clearInterval(progressInterval);
    printTrackInfo(layers, trackLength, 'stopping');
    
    await stopLayers(layers);
    
    // Restore terminal
    showCursor();
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    
    clearScreen();
    console.log(`\n  ${c.purple}Goodbye!${c.reset}\n`);
    process.exit(0);
  }

  // Handle keypresses
  process.stdin.on('keypress', (_str, key) => {
    if (isQuitting) return;

    if (key.name === 'q' || key.name === 'escape' || (key.ctrl && key.name === 'c')) {
      handleQuit();
    } else if (key.name === 'n' || key.name === 'space') {
      handleNext();
    } else if (key.name === 'p') {
      handlePause();
    }
  });

  // Handle process signals
  process.on('SIGINT', handleQuit);
  process.on('SIGTERM', handleQuit);
}

main();
