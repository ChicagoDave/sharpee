# Entropy — Game Design Document

**Author**: David Cornelson
**Platform**: Sharpee (port from Inform 6 prototype, ~2009)
**Inspiration**: Dan Simmons' Hyperion Cantos
**Tagline**: An Interactive Fiction Endeavor in Time and Space

---

## Premise

Chrysilya is a female-modeled android — the sole survivor of a thermonuclear war that destroyed the planet Earthangelos. The Tra 'Jan Gore invaded, obliterated everything, and moved on. She wakes on a devastated battlefield with damaged systems, failing power, and fragmented memories.

Through exploration and memory recovery, she learns that a device exists that can reverse entropy in a localized area — undo the destruction. But the device was invented on a neutral planet she once visited as a teacher, and the reversal must happen within an unknown short window (hours or days, not weeks). The window is closing.

She cannot reach the neutral planet in the present — there isn't time. But she can connect her personal Anti-Entropic Field to the wrecked Caledonia's power core and displace herself back to when she was already on that planet. In the past, disguised (because past-Chrysilya is already there), she must ensure the device is transported to Earth's moon. Then she returns to the present, retrieves it from the moon, and triggers it on Earthangelos before the window closes.

Almost nothing survived the war. Every useful object is a miracle find in planetary rubble.

---

## Player Character: Chrysilya

- Female-modeled android with blue mechanical eyes
- Starts severely damaged: disfigured face, bent hip, exposed innards on arms, legs, abdomen
- Internal systems degrade over time without resources
- Has four internal systems (see Mechanics below)
- Was a teacher for children on the neutral planet before the war
- She is the only survivor. Nothing and no one else remains.

---

## Story Arc

### Act 1: Survival (Earthangelos — Present)

Chrysilya wakes on the Lost Battlefield. Her systems are failing. She must find resources (rations) before complete systems failure kills her. The degradation daemon is running from the start.

**Goal**: Stabilize. Find rations in the underground chamber.

**Regions**: Lost Battlefield, Smoking Forest, Scorched Fields, Deep Crater, Riverbed, Underground River, Enemy Bunker, Geyser, Dark Chamber

**Key puzzles**:
- Dig at the geyser to reveal a hidden hatch
- Push the western wall to find the enemy bunker
- Find and consume rations to stop degradation

### Act 2: Memory Recovery (Earthangelos — Present)

As Chrysilya explores, location-triggered flashbacks reveal her past. The memory system is both narrative and functional — flashbacks tell her where things were, and she has to figure out where they are now after the destruction.

**Key memories**:
- **Deep Crater**: Children being killed by Tra 'Jan Gore soldiers
- **Chamber**: Dal MKor explaining the time displacement concept — reversal of entropy in a limited space, within a limited window
- **Spaceport**: Arriving on Earthangelos as a teacher — she was on the neutral planet before
- **Android facility ruins** (new): Remembers where diffusion modules were stored — her "kind" could change shape

**Goal**: Learn about the device. Learn she was on the neutral planet. Find a diffusion module for disguise.

### Act 3: Preparation (Earthangelos — Present)

Before the time jump, Chrysilya needs three things:

1. **Rations** (Act 1) — systems stabilized
2. **Diffusion module** — found in the ruins of whatever remains of an android facility on the destroyed planet. Not in a building — in rubble, half-melted, recognized from a flashback
3. **Caledonia power core** — the wrecked friendly ship at the spaceport. Doesn't need to fly, just needs its core online enough to amplify her AE Field for temporal displacement

**Key puzzles**:
- Navigate the wrecked Caledonia, get the power core functional
- Safety cable mechanics for moving through the damaged ship
- Connect AE Field to power core

**Complication**: The Tra 'Jan Gore ship (Cho 'Tak Ru) is in orbit. An enemy soldier may need to be dealt with before or after the jump — or perhaps the orbital encounter is what makes the jump urgent (the enemy is coming back).

### Act 4: The Past (Neutral Planet — Past)

Chrysilya arrives on the neutral planet during the time she was already there as a teacher. She is disguised via the diffusion module — different appearance, can't be recognized.

Past-Chrysilya is somewhere on this planet. Present-Chrysilya must avoid her.

**Goal**: Find the entropy reversal device (or its prototype/plans) and arrange for it to be transported to Earth's moon. She can't take it herself — she needs it to be there in the present, which means it had to travel there through normal channels.

**Puzzle nature**: Social and logistical. Convince the right people, forge documents, arrange shipment, protect the plan from interference — all while maintaining cover. This is not a combat section. This is an infiltration.

**Constraint**: She can't change too much. Causality is fragile. The device needs to arrive at the moon through a chain of events that doesn't create paradoxes.

### Act 5: Return and Retrieval (Moon — Present)

Chrysilya returns to the present and reaches Earth's moon. The device should be where past-her ensured it would be.

**Goal**: Find the device. It's been sitting there for however long — hidden, stored, possibly degraded. Retrieve it.

**Puzzle nature**: Mechanical. Locate the storage, deal with whatever state the device is in after years of neglect.

### Act 6: Trigger (Earthangelos — Present)

Bring the device to Earthangelos. Find the right location — the reversal is localized, so placement matters. Activate it before the window closes.

**Goal**: Undo the destruction. Win.

**Constraint**: The degradation clock is still ticking. The window for reversal is closing. She may not have many turns left.

---

## Mechanics

### 1. Systems Degradation

Chrysilya's internal systems fail over time when she has no resources.

- **Resources**: 0 = degrading, 1 = stable (after rations)
- **Partial failure**: Countdown from 17. Warning messages. Non-fatal.
- **Complete failure**: Countdown from 52. When it hits 0, game over.
- **Diagnosis command**: Reports current system status
- **Stopped by**: Consuming rations

### 2. Anti-Entropic Field (AE Field)

Personal-scale entropy manipulation. Two modes:

- **Slow Time**: Normal mode. Default after rations.
- **Fast Time**: Player's time is accelerated relative to environment. Everything appears frozen. Blocks many actions (eating, dropping inventory, deactivating flight skin). 30-turn recharge after use.

The AE Field is the small-scale version of what the planetary device does. Connecting it to the Caledonia's power core amplifies it to temporal displacement range.

### 3. Flight Skin

A living organism resident in Chrysilya's skull. On activation, it flows from the skull and envelops her body.

- Provides atmospheric protection and oxygen
- Enables flight (up/down navigation from outdoor locations)
- Cannot be active while safety cable is attached to belt
- Cannot eat while flight skin is on
- Status shown in status bar: [FLIGHT SKIN]

### 4. Memory System

Location-triggered flashbacks that reveal backstory and provide puzzle hints.

- Each memory fires once per location
- Memories are the only hint system — they tell Chrysilya where things *were*
- She has to figure out where they *are now* in the ruins
- The bridge memory (on the enemy ship) was the original endgame trigger — in the full game, this becomes one memory among several

### 5. Diffusion Module (New)

Shapeshifting technology for Chrysilya's kind of android.

- Found in ruins on Earthangelos (recognized from a flashback)
- Allows her to assume a different appearance
- Required before the time jump — past-Chrysilya is on the neutral planet
- Maintains the disguise for the duration of Act 4
- May have limited charges or duration

### 6. Safety Cable

Dual-endpoint tether puzzle.

- Two attachment points (a and b)
- Can attach to: player's belt, control panels, other attachable surfaces
- Prevents ejection during airlock/ship sequences
- 1 meter length
- Must be detached before dropping

---

## Regions

### Earthangelos — Present (from I6 prototype)

| Region | Rooms | Status |
|--------|-------|--------|
| Lost Battlefield | Lost Battlefield, Edge of City, Smoking Forest, Scorched Fields | Implemented in I6 |
| Underground | Deep Crater, Riverbed, Underground River, Enemy Bunker | Implemented in I6 |
| Geyser/Chamber | Geyser, Dark Chamber | Implemented in I6 |
| Spaceport | Spaceport, Main Cabin (Caledonia) | Implemented in I6 |
| City Ruins | Android facility ruins, collapsed structures | New — diffusion module location |
| Above/Orbit | Above Lost Battlefield, Planetary Orbit | Implemented in I6 |

### Earthangelos Orbit (from I6 prototype)

| Region | Rooms | Status |
|--------|-------|--------|
| Cho 'Tak Ru | Outside Ship, Airlock, Inside Ship, Bridge | Implemented in I6 |

### Neutral Planet — Past (New)

| Region | Rooms | Status |
|--------|-------|--------|
| TBD | Settlement, research facility, transport hub, storage | New — Act 4 |

### Earth's Moon — Present (New)

| Region | Rooms | Status |
|--------|-------|--------|
| TBD | Landing area, storage vault, device chamber | New — Act 5 |

---

## Score System (Revised)

The original had 5 points. The full game expands this.

| Action | Points | Act |
|--------|--------|-----|
| Find hatch (dig at geyser) | +1 | 1 |
| Find rations / stabilize | +1 | 1 |
| Find diffusion module | +1 | 2 |
| Get Caledonia core online | +1 | 3 |
| Survive orbital encounter | +1 | 3 |
| Complete time jump | +1 | 3→4 |
| Arrange device transport (past) | +1 | 4 |
| Retrieve device (moon) | +1 | 5 |
| Trigger reversal | +1 | 6 |
| **Total** | **9** | |

Rank system TBD based on final score range.

---

## Tone and Writing

The game is bleak but not nihilistic. Chrysilya is damaged, alone, and racing against time — but she is methodical, determined, and capable. She processes the horror around her through mechanical eyes that see radiation levels and structural integrity, not grief. The grief comes through the flashbacks — human memories in an android frame.

The destruction is total. Almost nothing survived. Every discovery is a small miracle. The prose should reflect this: sparse, precise, occasionally devastating.

The neutral planet section is a tonal shift — from post-apocalyptic survival to social infiltration. Chrysilya is pretending to be someone she's not, in a place she remembers being happy. The tension is different: not "will I die" but "will I be discovered."

---

## Open Questions

- **How does she reach the moon in the present?** Flight skin to orbit, then what? Another ship? The Caledonia repaired enough to make the trip? The enemy ship captured?
- **What does the reversal look like?** Does time visually rewind? Does she witness it? Is there a cost?
- **How much of the neutral planet needs to be built?** Minimum viable: 5-8 rooms with social puzzles. Full vision: a small settlement with characters.
- **Does the enemy soldier encounter still happen?** It could be an obstacle before the time jump, or after (blocking her return).
- **Duration of the diffusion module?** Limited charges adds tension. Unlimited simplifies Act 4 design.
- **What happens to past-Chrysilya?** Does present-Chrysilya see her? Avoid her? Is there a near-miss scene?

---

## I6 Source Reference

Original Inform 6 prototype source is in `stories/entropy/i6/`. Key game-specific files:

- `entropy.inf` — main file, initialization, battlefield rooms
- `variables.h` — constants, globals, attributes
- `classes.h` — PC, room, system, object classes
- `daemons.h` — resource degradation daemon
- `player.h` — Chrysilya character and body parts
- `systems.h` — AE Field, Flight Skin, Memory, Main Systems
- `riverbed.h` — underground region
- `geyser.h` — geyser/chamber region
- `spaceport.h` / `spaceport2.h` — spaceport region
- `spaceship.h` — orbital/enemy ship region
- `grammarfunctions.h` — custom verbs
- `memorysystems.h` — memory flashback system
