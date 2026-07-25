# @sharpee/ext-hunger

A depleting satiety meter for the Sharpee Interactive Fiction platform — hunger
rises each turn, announces itself in stages, and kills the player if ignored.
Eating recovers it.

## Installation

```bash
npm install @sharpee/ext-hunger
```

## Overview

Hunger is a severity counter stored in world state (`hunger.severity`), so it is
saved and restored with the game. Built on the banded-scalar crossing engine
(ADR-262), the same machinery behind `@sharpee/ext-scoring`:

- A decay daemon raises severity every turn (rate set by the story)
- Crossing a named band emits `if.event.band_crossed` and narrates it
- Reaching the `fatal` band kills the player
- Eating lowers severity by the food's `nutrition`, via stdlib's standard
  eating action — no custom actions needed

## Usage (Chord stories)

Declare the meter in the story header with `use hunger`:

```
story "The Long Cold" by "You"
  id: long-cold
  version: 1.0.0
  use hunger
    grows 3 each turn
    peckish at 3 says feeling-peckish
    hungry at 6 says stomach-tightens
    starving at 9
    fatal at 12

define phrases en-US
  feeling-peckish:
    A hollow ache settles behind your ribs.
  stomach-tightens:
    Your stomach knots and will not let go.
```

- `grows N each turn` — the decay rate
- `<band> at N [says phrase-id]` — announce bands, lowest to highest; `says`
  narrates the crossing with a phrase from `define phrases`
- `fatal at N` — death threshold

Any `edible` thing nourishes when eaten; give it a `nutrition` value to control
by how much. The story-loader lowers the daemon and narration from this block —
no TypeScript required.

## Usage (TypeScript API)

The package exports the config-free world pieces; the config-dependent daemon
and narration are lowered by the story-loader:

```typescript
import {
  registerHunger,            // install the eating-recovery handler on a world
  createHungerCrossingWatcher, // ADR-262 band watcher over the severity scalar
  getHungerSeverity,         // read current severity (0 = fully sated)
  setHungerSeverity,         // set severity (clamped at 0)
  HUNGER_SEVERITY_KEY,       // 'hunger.severity' world-state key
  HUNGER_WATCHER_ID,         // the crossing-watcher plugin id
} from '@sharpee/ext-hunger';

// In world setup:
registerHunger(world);
```

## License

MIT
