# Plan: Entropy Story Scaffold

**Created**: 2026-03-30
**Goal**: Build the Entropy story project structure and port the I6 prototype content into Sharpee. Stub new regions as TODO.
**Source**: `stories/entropy/i6/` (Inform 6 prototype), `stories/entropy/design/design.md`

---

## Phase 1: Project Scaffold
- **Budget**: 100
- Create `stories/entropy/src/` with standard Sharpee story structure
- `index.ts` — Story entry point (config, createPlayer, initializeWorld, extendParser, extendLanguage)
- `tsconfig.json`, `package.json`
- Empty region folders matching the game's geography
- **Status**: PENDING

## Phase 2: Player Character + Systems
- **Budget**: 250
- Port PlayerCharacter (Chrysilya) — android with body parts, damage state, description
- Port 4 internal systems as traits/behaviors:
  - Systems degradation (Health, Resources, Partial/Complete counters)
  - AE Field (slow time / fast time / recharging)
  - Flight Skin (organism, flight enable/disable)
  - Memory system (location-triggered flashbacks)
- Port NeedResources daemon (scheduler)
- Custom verbs: diagnose, systems, activate/deactivate skin, fast time, slow time
- **Status**: PENDING

## Phase 3: Act 1 Rooms + Objects (Battlefield → Chamber)
- **Budget**: 250
- Port from I6: Lost Battlefield, Edge of City, Smoking Forest, Scorched Fields
- Port from I6: Deep Crater, Riverbed, Underground River, Enemy Bunker
- Port from I6: Geyser, Dark Chamber
- Port all scenery objects from I6 source
- Port rations object and eating mechanic
- Port dig puzzle (geyser → hatch)
- Port western wall door puzzle (underground → bunker)
- Connect rooms
- **Status**: PENDING

## Phase 4: Spaceport + Caledonia
- **Budget**: 150
- Port from I6: Spaceport, Main Cabin (Caledonia)
- Port scenery objects
- Port safety cable (dual-endpoint attachment mechanic)
- Port CaledoniaCP (control panel)
- Custom verbs: attach, detach
- **Status**: PENDING

## Phase 5: Orbit + Cho 'Tak Ru
- **Budget**: 250
- Port from I6: Above Lost Battlefield, Planetary Orbit
- Port from I6: Outside Ship, Airlock, Inside Ship, Bridge
- Port SpaceShip daemon (orbital approach/visibility)
- Port airlock button sequence (green/white/red buttons, pressurization)
- Port Tra 'Jan Gore soldier NPC + combat
- Port plasma rifle
- Port window daemon (timed airlock sequence)
- Custom verbs: board, shoot, fly
- **Status**: PENDING

## Phase 6: Stub New Regions
- **Budget**: 50
- Stub Chrysilya's Home region (TODO rooms, diffusion module location)
- Stub Neutral Planet region (TODO rooms)
- Stub Moon region (TODO rooms)
- Stub Ship AI encounter (TODO on bridge)
- **Status**: PENDING

## Phase 7: Build + Walkthrough
- **Budget**: 100
- Wire story into build system
- Create initial walkthrough transcript covering Acts 1-3 (I6 content)
- Build and verify
- **Status**: PENDING
