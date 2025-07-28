#!/bin/bash
# Check if all trait index files exist

TRAIT_DIRS=(
  "crank"
  "dial"
  "fragile"
  "knob"
  "moveable-scenery"
  "pushable"
  "turnable"
  "valve"
  "wheel"
)

BASE_DIR="C:/repotemp/sharpee/packages/world-model/src/traits"

for dir in "${TRAIT_DIRS[@]}"; do
  index_file="$BASE_DIR/$dir/index.ts"
  if [ ! -f "$index_file" ]; then
    echo "Missing: $index_file"
  else
    echo "Found: $index_file"
  fi
done
