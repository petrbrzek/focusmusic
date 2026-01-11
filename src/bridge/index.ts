import { spawn, type ChildProcess } from 'child_process';
import { join } from 'path';

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
        if (process.platform === 'darwin') {
            this.start();
        }
    }

    private start() {
        try {
            const bridgePath = join(import.meta.dir, 'media-bridge');

            this.child = spawn(bridgePath);

            this.child.stdout?.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const msg = JSON.parse(line);
                        this.handleMessage(msg);
                    } catch (e) {
                        // Ignore partial/invalid JSON
                    }
                }
            });

            this.child.stderr?.on('data', () => { }); // Ignore stderr

            this.child.on('exit', () => {
                this.child = null;
            });
        } catch (e) {
            // Fail silently if bridge not found or fails
        }
    }

    private handleMessage(msg: any) {
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
        }
    }

    update(info: TrackInfo) {
        if (!this.child || !this.child.stdin) return;

        const payload = {
            title: info.title,
            artist: info.artist,
            duration: info.duration,
            elapsed: info.elapsed,
            isPlaying: info.status === 'playing'
        };

        try {
            this.child.stdin.write(JSON.stringify(payload) + '\n');
        } catch (e) {
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
