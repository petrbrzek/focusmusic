# Changelog

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
