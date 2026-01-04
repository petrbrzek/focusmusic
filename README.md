# focusmusic

Infinite generative focus music for deep work. Brain.fm-style ambient electronic music that runs directly in your terminal.

## Features

- **Infinite generative music** - Never repeats, always evolving
- **Multiple sound layers** - Warm pads, melodic arpeggios, deep beats, ambient textures
- **8 drum kits** - Deep House, Techno, Ambient, EDM, Minimal, Dark, Lo-Fi, Dub
- **8 synth presets** - Warm Pad, Soft Pluck, Glassy, Analog Lead, Sub Pulse, Shimmer, Muted Keys, Hollow
- **Perlin noise modulation** - Smooth, organic parameter changes
- **Auto-advancement** - Tracks automatically transition every 8-15 minutes
- **Terminal UI** - Clean, minimal interface with ANSI colors

## Installation

### Run directly with bunx (recommended)

```bash
bunx focusmusic
```

### Install globally

```bash
bun install -g focusmusic
focusmusic
```

### Clone and run locally

```bash
git clone https://github.com/petrbrzek/focusmusic.git
cd focusmusic
bun install
bun run start
```

## Usage

```bash
# Start with default settings
focusmusic

# Set custom BPM (70-120)
focusmusic --bpm 95

# Set custom volume (0-100)
focusmusic --volume 50

# Show help
focusmusic --help
```

### Controls

| Key | Action |
|-----|--------|
| `n` / `Space` | Next track |
| `q` / `Escape` | Quit |

## Requirements

- [Bun](https://bun.sh) runtime (v1.0+)
- macOS, Linux, or Windows
- Audio output device

### Linux Notes

On Linux, you may need JACK or PipeWire-JACK for audio output. If you experience audio issues, try:

```bash
# Install JACK
sudo apt install jackd2

# Or use PipeWire with JACK compatibility
sudo apt install pipewire-jack
```

## How It Works

focusmusic generates music in real-time using Web Audio API synthesis:

1. **Clock System** - Central timing source keeps all layers synchronized
2. **Pad Layer** - Warm, sustained chords with slow filter sweeps
3. **Arp Layer** - Melodic patterns using various synth presets
4. **Beat Layer** - Kick drums with sidechain compression
5. **Texture Layer** - Filtered brown noise for atmosphere
6. **Perlin Modulation** - All parameters smoothly evolve using simplex noise

Each track randomly selects:
- Musical scale (Minor Pentatonic, Dorian, Phrygian, Aeolian)
- Root note (D2-A2 range for deep bass)
- BPM (randomized within 70-120 range)
- Drum kit style
- Synth preset (15% chance of no arp for minimal tracks)

## Tech Stack

- [Bun](https://bun.sh) - JavaScript runtime
- [node-web-audio-api](https://github.com/ircam-ismm/node-web-audio-api) - Web Audio API for Node.js
- [simplex-noise](https://github.com/jwagner/simplex-noise.js) - Perlin/Simplex noise generation

## License

MIT

## Author

Petr Brzek
