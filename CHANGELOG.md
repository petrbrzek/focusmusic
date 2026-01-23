# Changelog

## [1.5.0] - 2026-01-23

### Added
- Optional macOS media bridge install (`--install-media`) to enable media keys.
- Media key play/pause support to suspend/resume playback.

## [1.4.0] - 2026-01-23

### Added
- Motif layer for slow, song-like melodic themes.

## [1.3.0] - 2026-01-06

### Added
- Pause/resume functionality with `p` key - suspends audio playback and clock timing

## [1.2.0] - 2026-01-05

### Added
- CLI flags for audio latency (`--latency`) and scheduler diagnostics (`--diagnostics`) to help avoid crackles and inspect timing headroom.

### Changed
- Default audio context latency hint now biases toward playback for smoother output on most systems.

## [1.1.0] - 2026-01-04

### Changed
- Simplified terminal UI - removed OpenTUI framework dependency
- Replaced React-based rendering with plain Node.js terminal output
- Screen now clears and redraws when switching tracks (instead of appending)
- Hidden cursor during playback for cleaner UI

### Removed
- `@opentui/core` and `@opentui/react` dependencies
- `react` dependency
- `src/ui/Player.tsx` component
- `src/simple.ts` (functionality merged into main entry point)

### Fixed
- Reduced package size and complexity
- Faster startup time without React overhead

## [1.0.1] - Initial tracked release

- Deep generative electronic music for focus
- Multiple synth presets and drum kits
- Automatic track advancement (8-15 minute tracks)
- Keyboard controls for next track and quit
