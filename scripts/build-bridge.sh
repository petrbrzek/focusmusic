#!/bin/bash

# Exit on error
set -e

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "Skipping media bridge build (not macOS)"
  exit 0
fi

# Check for swiftc
if ! command -v swiftc &> /dev/null; then
  echo "Error: swiftc not found. Please install Xcode Command Line Tools to build the media bridge."
  echo "Run: xcode-select --install"
  exit 1
fi

BRIDGE_SRC="./src/bridge/media-bridge.swift"
BRIDGE_OUT="./src/bridge/media-bridge"

echo "Building media bridge..."
swiftc "$BRIDGE_SRC" -o "$BRIDGE_OUT"
echo "✓ Media bridge built successfully: $BRIDGE_OUT"
