# Entropy — Game Design Document

**Author**: David Cornelson
**Platform**: Sharpee (port from Inform 6 prototype, ~2009)
**Inspiration**: Dan Simmons' Hyperion Cantos
**Tagline**: An Interactive Fiction Endeavor in Time and Space

---

## Premise

Chrysilya is a female-modeled android — the sole survivor of a thermonuclear war that destroyed the planet Earthangelos. The Tra 'Jan Gore invaded, obliterated everything, and moved on. She wakes on a devastated battlefield with damaged systems, failing power, and fragmented memories.

Through exploration and memory recovery, she learns that a device exists that can reverse entropy in a localized area — undo the destruction. But the device was invented on a neutral planet she once visited as a teacher, and the reversal must happen within an unknown short window (hours or days, not weeks). The window is closing.

She cannot reach the neutral planet in the present — there isn't time. But she can connect her personal Anti-Entropic Field to the Cho 'Tak Ru's power core and project herself back to when she was on that planet. In the past, she has only moments — enough to update her own memory, recording the present situation and the need for the device. When she returns, the memory exchange works both ways: she now remembers her past self burying the device on Earth's moon, preparing for exactly this moment. A closed time loop. She then flies the Cho 'Tak Ru to the moon, retrieves it, and triggers it on Earthangelos before the window closes.

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
- **Chrysilya's home** (new): Remembers her home — using the diffusion module to change appearance for everyday life. When the flashback ends, she knows where home *was*

**Goal**: Learn about the device. Learn she was on the neutral planet. Find the diffusion module (needed to deceive the ship AI).

### Act 3: Take the Ship (Earthangelos Orbit — Present)

The Cho 'Tak Ru — the enemy reconnaissance vessel in orbit — is the only functional spacecraft in the system. The wrecked Caledonia at the spaceport is good for scavenging (safety cable, possibly other tools) but it will never fly again. Chrysilya needs the enemy ship.

**Goal**: Board the Cho 'Tak Ru, eliminate the soldier, take the bridge.

**Key puzzles**:
- Flight skin to orbit, board the ship's hull
- Airlock button sequence (depressurize, open hatches, eject or shoot the soldier)
- Safety cable for surviving the airlock
- Existing I6 puzzle mechanics carry over here

**Complication**: After the soldier is dealt with, Chrysilya reaches the bridge and attempts to interface with the ship's power core to connect her AE Field. The ship's AI — cold, military, loyal to the Tra 'Jan Gore — resists. It is hostile. She cannot simply override a warship-class intelligence.

**The AI confrontation**: This is the central gate for the second half of the game. Chrysilya must find a way to gain control — negotiate, trick (diffusion module to impersonate an officer?), subvert (AE Field entropy reversal on the AI's memory?), or reach a compromise. The AI wants something too. The nature of this encounter is TBD but the outcome must give her both ship control and temporal displacement capability.

**Result**: Chrysilya now has a ship. Connecting her AE Field to the core through the interface gives her two capabilities: she *is* the navigation computer (flying the ship through her neural connection), and the amplified AE Field enables temporal displacement.

### Act 4: The Projection (Cho 'Tak Ru Bridge — Present → Past)

Chrysilya uses the Cho 'Tak Ru's power core to amplify her AE Field and project herself back in time — not physically traveling, but connecting to her past self on the neutral planet. The projection is brief: roughly two turns before the connection collapses.

In those two turns, she must `UPDATE MEMORY` — recording the current devastation of Earthangelos and the urgent need for the entropic field time displacement device. When she does, the response is immediate: *"You record the current situation on Earthangelos, including the need for the entropic field time displacement machine."*

When the projection ends and she returns to the present, the memory exchange completes in both directions. *"Returning to the present, the memory of a device hidden on the moon's surface unfolds..."* A flashback plays: *"You are standing at an unused portion of the moon, preparing the burial of the entropic time device, hoping it survives until needed."*

A closed time loop. Past-Chrysilya received the message, understood the need, and buried the device on the moon — because future-Chrysilya told her to.

**Goal**: Update her past self's memory before the projection collapses.

**Key verb**: `UPDATE MEMORY` — the single critical action. Miss the 2-turn window and the projection fails.

**Result**: Chrysilya now knows the device is buried on the moon. She needs fuel from the Cho 'Tak Ru to fly there — and must recharge the AE Field first.

### Act 5: Retrieval (Moon — Present)

After recharging the AE Field using the Cho 'Tak Ru's core, Chrysilya flies to the moon. The device is where her past self buried it — an unused portion of the lunar surface, hidden and waiting.

**Goal**: Find the device, dig it up, retrieve it.

**Puzzle nature**: Mechanical. Locate the burial site, deal with whatever state the device is in after years of neglect.

### Act 6: Trigger (Earthangelos — Present)

Chrysilya flies the Cho 'Tak Ru from the moon back to Earthangelos. She brings the device to the surface. The reversal is localized, so placement matters — she needs to find the right location.

Activate it before the window closes.

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

The AE Field is the small-scale version of what the planetary device does. Connecting it to the Cho 'Tak Ru's power core amplifies it for two purposes: temporal projection (connecting to her past self across time) and neural control of the ship's navigation. The connection requires interfacing with the ship — which means getting past the hostile AI first.

The temporal projection is extremely brief (~2 turns) even with the ship's power amplifying it. She cannot physically travel — only connect to her past self's consciousness long enough to exchange memories.

Additionally, fast-time mode compresses interstellar travel — Chrysilya experiences minutes while the ship traverses light-years. This keeps space travel playable without thousands of empty turns.

The Cho 'Tak Ru serves three purposes: power the AE projection, fuel the flight to the moon, and serve as her ship. She must recharge the AE Field between the projection and the moon flight.

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

- Found in the ruins of Chrysilya's home (recognized from a flashback of everyday life)
- Allows her to assume a different appearance
- **Primary purpose**: spoof the Cho 'Tak Ru's AI identity checks (impersonate a Tra 'Jan Gore officer)
- May have limited charges or duration
- No longer needed for neutral planet infiltration (the projection replaces physical travel)

### 6. Ship AI — Cho 'Tak Ru Intelligence

The enemy ship has an onboard AI. Cold, military, loyal to the Tra 'Jan Gore. It is the second-half antagonist.

- Activates when Chrysilya attempts to interface with the ship's core
- Refuses commands, may actively resist (lock systems, vent atmosphere, maneuver)
- Cannot be brute-force overridden — she's an android, not a warship intelligence
- Must be overcome through some combination of:
  - **Negotiation** — the war is over, its crew is dead, there's no one to be loyal to
  - **Deception** — diffusion module to impersonate a Tra 'Jan Gore officer
  - **Subversion** — AE Field entropy reversal on the AI's memory (revert to pre-war state?)
  - **Compromise** — the AI wants something. Maybe it wants to go home.
- Once overcome, Chrysilya gains both ship control and temporal displacement
- The AI may remain a presence throughout the rest of the game — a reluctant ally, a prisoner, or a ghost in the machine

### 7. Safety Cable

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
| Chrysilya's Home | Ruins of her home, rubble, personal belongings | New — diffusion module location |
| Above/Orbit | Above Lost Battlefield, Planetary Orbit | Implemented in I6 |

### Earthangelos Orbit (from I6 prototype)

| Region | Rooms | Status |
|--------|-------|--------|
| Cho 'Tak Ru | Outside Ship, Airlock, Inside Ship, Bridge | Implemented in I6 |

The Cho 'Tak Ru becomes Chrysilya's ship for Acts 4-6. The bridge and core interface are the site of the AI confrontation.

### Neutral Planet — Past (CUT)

No longer a playable region. The temporal projection replaces physical travel to the neutral planet. The player experiences the past only through a brief 2-turn projection and a flashback of burying the device on the moon.

### Earth's Moon — Present (TODO)

| Region | Rooms | Status |
|--------|-------|--------|
| TODO | Landing area, storage vault, device chamber | New — Act 5 |

Rooms and retrieval puzzles TBD.

---

## Score System (Revised)

The original had 5 points. The full game expands this.

| Action | Points | Act |
|--------|--------|-----|
| Find hatch (dig at geyser) | +1 | 1 |
| Find rations / stabilize | +1 | 1 |
| Find diffusion module | +1 | 2 |
| Eliminate Tra 'Jan Gore soldier | +1 | 3 |
| Overcome ship AI | +1 | 3 |
| Update memory (projection) | +1 | 4 |
| Recharge AE Field | +1 | 4→5 |
| Retrieve device (moon) | +1 | 5 |
| Trigger reversal | +1 | 6 |
| **Total** | **9** | |

Rank system TBD based on final score range.

---

## Tone and Writing

The game is bleak but not nihilistic. Chrysilya is damaged, alone, and racing against time — but she is methodical, determined, and capable. She processes the horror around her through mechanical eyes that see radiation levels and structural integrity, not grief. The grief comes through the flashbacks — human memories in an android frame.

The destruction is total. Almost nothing survived. Every discovery is a small miracle. The prose should reflect this: sparse, precise, occasionally devastating.

The projection sequence is a tonal shift — a brief, desperate moment of connection to her past self, followed by the flashback of burying the device. The tension is compressed: she has two turns to do the one thing that matters.

---

## Open Questions

### Resolved
- ~~How does she reach the moon?~~ → She uses the Cho 'Tak Ru (enemy ship) for all space travel.
- ~~Does the enemy soldier encounter still happen?~~ → Yes, it's Act 3. The soldier is between her and the ship she needs.

### Ship AI (TODO)
- **How exactly does Chrysilya overcome the AI?** Negotiation, deception (diffusion module), subversion (AE Field), compromise, or some combination? This is a major puzzle design decision.
- **Does the AI remain present after?** Reluctant ally? Prisoner? Silent? Does it comment during the rest of the game?
- **How does she physically interface?** Android data/power port? Incompatible connection that's a puzzle in itself?

### Projection Sequence (TODO)
- **What happens if she misses the 2-turn window?** Game over? Can she recharge and try again?
- **Is the projection a special room/mode?** Or does it happen on the bridge with different available commands?

### Device and Endgame (TODO)
- **What does the reversal look like?** Does time visually rewind? Does she witness it? Is there a cost?
- **Where on Earthangelos does she place it?** Does the location matter narratively? (The battlefield where she woke up? The crater where the children died?)
- **Is there a cost to triggering it?** Does Chrysilya survive? Does the reversal undo *her* too?

### Mechanics (TODO)
- **Duration of the diffusion module?** Limited charges adds tension. Unlimited simplifies AI deception.
- **How does fast-time space travel feel to the player?** Brief narrative passage? A few compressed turns? Instant?
- **Does the degradation clock pause during the projection?** Or does it keep ticking?
- **How does AE Field recharge work mechanically?** A RECHARGE verb? Automatic after N turns? A puzzle involving the ship's core?

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
