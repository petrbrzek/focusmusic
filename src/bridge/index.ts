import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export type BridgeStatus = 'playing' | 'paused';

export interface BridgeCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onToggle: () => void;
  onNext: () => void;
}

export interface TrackInfo {
  title: string;
  artist: string;
  duration: number;
  elapsed: number;
  status: BridgeStatus;
}

export class MediaBridge {
  private child: ChildProcess | null = null;
  private callbacks: BridgeCallbacks;

  constructor(callbacks: BridgeCallbacks) {
    this.callbacks = callbacks;
    if (MediaBridge.isAvailable()) {
      this.start();
    }
  }

  static getBridgePath(): string {
    const dir = dirname(fileURLToPath(import.meta.url));
    return join(dir, 'media-bridge');
  }

  static isAvailable(): boolean {
    return process.platform === 'darwin' && existsSync(MediaBridge.getBridgePath());
  }

  private start() {
    try {
      const bridgePath = MediaBridge.getBridgePath();
      this.child = spawn(bridgePath, [], { stdio: ['pipe', 'pipe', 'ignore'] });

      this.child.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            this.handleMessage(msg);
          } catch {
            // Ignore partial/invalid JSON
          }
        }
      });

      this.child.on('error', () => {
        this.child = null;
      });

      this.child.on('exit', () => {
        this.child = null;
      });
    } catch {
      // Fail silently if bridge not found or fails
    }
  }

  private handleMessage(msg: { event?: string }) {
    switch (msg.event) {
      case 'play':
        this.callbacks.onPlay();
        break;
      case 'pause':
        this.callbacks.onPause();
        break;
      case 'toggle':
        this.callbacks.onToggle();
        break;
      case 'next':
        this.callbacks.onNext();
        break;
      default:
        break;
    }
  }

  update(info: TrackInfo) {
    if (!this.child || !this.child.stdin) return;

    const payload = {
      title: info.title,
      artist: info.artist,
      duration: info.duration,
      elapsed: info.elapsed,
      isPlaying: info.status === 'playing',
    };

    try {
      this.child.stdin.write(`${JSON.stringify(payload)}\n`);
    } catch {
      // Ignore write errors
    }
  }

  stop() {
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
  }
}
