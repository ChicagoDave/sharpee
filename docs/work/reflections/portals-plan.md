# Mirror Portal System for Reflections

## Context

Reflections is a three-character IF tragedy built on mirror portal magic ("Blood of Silver"). The old implementation in `stories/reflections/extensions/blood-magic/` is outdated — wrong patterns, broken serialization (uses Map/Set), and doesn't follow current Sharpee conventions. We're deleting it and rebuilding inline in `stories/reflections/src/`, focused solely on the portal mechanic.

## Pre-work: Delete Old Code

Remove `stories/reflections/extensions/blood-magic/` entirely.

## Core Concepts

All three actors can teleport by using mirrors. The actor needs to establish a connection between two mirrors which is bidirectional. The actor can remove the connection too. Connections remain until the mirror is broken or the connection is removed. Connections are associated with an actor, so if two actors make connections, the connections are atomically associated with the actor that made the connection.

Connections can be chained. The actor can connect two mirrors, then connect a third/fourth, etc and when entering one end of the chain, they emerge from the last in the chain and vice versa. If they enter in the middle of the chain, they travel in the direction of the chain's creation from oldest to newest.

### Chain Travel Rules

**Explicit mirror entry** — `enter mirror`, `walk through mirror`:
Given chain `[A, B, C, D]` (A=oldest, D=newest):
- Enter A (oldest end) → emerge at D (newest end)
- Enter D (newest end) → emerge at A (oldest end)
- Enter B or C (middle) → emerge at D (newest end)

**Destination-based travel** — `go to <place>`:
The actor can name a destination (room name/alias) instead of a specific mirror. The system resolves the route:
1. Find a mirror in the actor's current room that belongs to one of their chains
2. Find a mirror in the named destination room that belongs to one of the actor's chains
3. If both found, teleport directly to that destination room (bypasses chain ordering)
4. If no mirror in current room: "You need a mirror to travel through."
5. If destination not in any chain: "You don't have a connection to that place."
6. If the source and destination mirrors are in different chains, that's fine — destination travel works across chains as long as the actor owns both

This is the primary travel interface for experienced players. `enter mirror` is for explicit single-hop chain traversal; `go to <place>` is the shorthand for "get me there through whatever mirrors I have."

### Data Model

Connections live on the **actor** (MirrorCarrierTrait), NOT on mirrors. Each actor can have **multiple independent chains**. Mirrors themselves only store physical properties.

```
Actor's chains:
  chain 1: [mirrorA, mirrorB, mirrorC]     // A↔C, middle→C
  chain 2: [mirrorX, mirrorY]               // X↔Y
```

### Key Operations
- **CONNECT A to B**: If neither is in a chain, create new chain [A, B]. If A is at the end of an existing chain, extend it with B. If B is at the end of a different chain, merge chains.
- **DISCONNECT A**: Remove A from its chain. If A is in the middle, the chain splits into two.
- **BREAK mirror**: Physical destruction. Removes the mirror from ALL actors' chains. Can be triggered by any entity (player or NPC) at any time. The `removeFromAllChains` operation must iterate every entity with MirrorCarrierTrait in the world and clean up all references to the broken mirror — splitting chains where needed. This is the canonical cleanup function; all code paths that break a mirror (capability behavior, NPC behavior, story scripts) must call it.

## Traits

### MirrorPortalTrait (`traits/mirror-portal-trait.ts`)

Physical properties only — no connection data.

```
type: 'reflections.trait.mirror_portal'
capabilities: ['if.action.breaking']

Properties:
  size: 'small' | 'medium' | 'large'     // small=handheld, medium=reach only, large=enter
  state: 'intact' | 'broken'
  isTaped: boolean                         // covered with tape (blocks reach/entry)
  isBlocked: boolean                       // blocked from the other side
  quality: 'poor' | 'fair' | 'good' | 'excellent'  // affects look-through clarity
```

### MirrorCarrierTrait (`traits/mirror-carrier-trait.ts`)

Actor-centric connection data.

```
type: 'reflections.trait.mirror_carrier'

Properties:
  chains: string[][]             // Array of chains, each chain is ordered mirrorIds (oldest→newest)
  canSenseRipples: boolean       // can detect when mirrors are used nearby
```

Example: `chains: [['mirror-a', 'mirror-b', 'mirror-c'], ['mirror-x', 'mirror-y']]`

All plain types (nested arrays) for serialization safety.

Signatures (who used a mirror) stored on mirror entities as `entity.attributes.signatures: SignatureRecord[]`.

## Actions & Patterns

| Command                    | Pattern                 | Rationale                                                                                 |
| -------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| CONNECT mirror TO mirror   | **Story Action**        | New verb, no stdlib equivalent                                                            |
| DISCONNECT mirror          | **Story Action**        | New verb, removes mirror from actor's chain                                               |
| ENTER/WALK THROUGH mirror  | **Story Action**        | Teleportation, not stdlib "entering" a container. Follow `walk-through-action.ts` pattern |
| TOUCH mirror               | **Interceptor**         | Adds sensing info to stdlib touch response                                                |
| EXAMINE mirror             | **Interceptor**         | Shows chain endpoint room when connected                                                  |
| BREAK mirror               | **Capability Behavior** | Extends stdlib breaking with mirror-specific logic                                        |
| TAPE mirror                | **Story Action**        | New verb                                                                                  |
| UNTAPE mirror              | **Story Action**        | New verb                                                                                  |
| GO TO place                | **Story Action**        | Destination-based travel — resolves route through actor's chains automatically            |
| SENSE MIRRORS              | **Story Action**        | Phone mirror "map" — list chains and their states                                         |

## Implementation Steps (in order)

### Step 1: Traits + Static Behaviors

- `src/traits/mirror-portal-trait.ts` — MirrorPortalTrait class (physical properties only)
- `src/traits/mirror-carrier-trait.ts` — MirrorCarrierTrait class (chains data)
- `src/traits/mirror-behaviors.ts` — Static helper methods:
  - `findChainContaining(carrier, mirrorId)` → chain index or -1
  - `getExitMirrorId(chain, entryMirrorId)` → destination mirror ID (chain traversal logic)
  - `addToChain(carrier, mirrorA, mirrorB)` → creates/extends/merges chains
  - `removeFromChain(carrier, mirrorId)` → removes mirror, splits chain if middle
  - `removeFromAllChains(world, mirrorId)` → removes mirror from ALL actors' chains (for breaking)
  - `getAllKnownMirrorIds(carrier)` → flat list of all mirrors across all chains
  - `findMirrorInRoom(carrier, world, roomId)` → first mirror ID in that room belonging to any of actor's chains
  - `findRoomByName(world, name)` → resolve a text name/alias to a room entity (for go-to)
- `src/traits/index.ts` — barrel export

### Step 2: CONNECT Action

- `src/actions/connect/types.ts` — CONNECT_ACTION_ID, ConnectMessages
- `src/actions/connect/connect-action.ts` — 4-phase action
  - validate: actor has MirrorCarrierTrait, both targets have MirrorPortalTrait, neither broken, both accessible (touchable/visible)
  - execute: call `addToChain(carrier, mirrorA, mirrorB)`, add signature to both mirrors
  - report: success message describing the connection
  - blocked: specific error per failure case (no Blood, not a mirror, broken, etc.)

### Step 3: ENTER MIRROR Action (explicit chain traversal)

- `src/actions/enter-mirror/types.ts` — ENTER_MIRROR_ACTION_ID, EnterMirrorMessages
- `src/actions/enter-mirror/enter-mirror-action.ts` — 4-phase action
  - validate: target has MirrorPortalTrait, not broken, not taped, large size, mirror is in one of actor's chains
  - execute: call `getExitMirrorId()` to find destination, get dest room via `world.getLocation()`, call `world.moveEntity(player.id, destRoomId)`, add signatures
  - report: travel message + `player.moved` + `if.event.room.description` (follow walk-through-action.ts:219-244)
  - blocked: specific error per case (not connected, too small, taped, broken dest, etc.)

### Step 3b: GO TO Action (destination-based travel)

- `src/actions/go-to/types.ts` — GO_TO_ACTION_ID, GoToMessages
- `src/actions/go-to/go-to-action.ts` — 4-phase action
  - validate: actor has MirrorCarrierTrait, find a mirror in current room belonging to actor's chains (source mirror must be large, not broken, not taped), resolve destination text to a room, find a mirror in that room belonging to actor's chains (dest mirror must not be broken/blocked)
  - execute: `world.moveEntity(player.id, destRoomId)`, add signatures to both source and dest mirrors
  - report: travel message + `player.moved` + `if.event.room.description`
  - blocked: no mirror here, destination unknown, destination not in chains, source/dest mirror broken/taped/blocked
- Note: works across chains — source mirror in chain 1 and dest mirror in chain 2 is valid

### Step 4: BREAK Capability Behavior + NPC-safe API

- `src/traits/mirror-breaking-behavior.ts` — CapabilityBehavior for `if.action.breaking`
  - validate: mirror intact
  - execute: state='broken', call `MirrorBehavior.breakMirror(world, mirrorId)` — the single entry point
  - report: shatter message

- `MirrorBehavior.breakMirror(world, mirrorId)` is the **canonical break function** (in mirror-behaviors.ts):
  1. Set mirror's `state = 'broken'` on MirrorPortalTrait
  2. Find ALL entities in the world with MirrorCarrierTrait
  3. For each carrier, call `removeFromChain(carrier, mirrorId)` — which removes the mirror and splits any chain it was in the middle of
  4. Return list of affected actor IDs (for reporting/ripple events)

- This function is callable from:
  - The capability behavior (player breaks a mirror via stdlib BREAK action)
  - NPC behavior code (e.g., Old Man smashes a mirror during his turn)
  - Story scripts / daemons (timed events, cutscene logic)
  - No action context required — pure world model operation

### Step 5: Interceptors

- `src/interceptors/mirror-touching-interceptor.ts` — Adds sensing info when touching a mirror (for carriers: which chain it's in, what mirrors are connected, signatures; for non-carriers: cold glass)
- `src/interceptors/mirror-examining-interceptor.ts` — If mirror is in a chain, shows the exit room (quality affects detail level)

### Step 6: DISCONNECT/TAPE/UNTAPE Actions

- `src/actions/disconnect/` — Removes mirror from actor's chain (may split chain)
- `src/actions/tape/` — Set isTaped=true (requires tape item in inventory)
- `src/actions/untape/` — Set isTaped=false

### Step 7: SENSE MIRRORS Action

- `src/actions/sense-mirrors/` — List all actor's chains, showing mirror names, locations, and chain order

### Step 8: Grammar

- `src/grammar/mirror-grammar.ts` — All patterns
  - `connect :mirror1 to :mirror2` (150)
  - `enter/go through/step through/walk through :mirror` (155, beats stdlib entering)
  - `go to :destination`, `travel to :destination` (155, text slot — room name resolution)
  - `disconnect :mirror` (150)
  - `tape/cover :mirror` (150), `untape/uncover :mirror` (150)
  - `sense mirrors`, `list mirrors`, `list chains`, `check phone` (150)

### Step 9: Messages

- `src/messages/mirror-messages.ts` — English text for all message IDs

### Step 10: Story Index

- `src/index.ts` — Story class implementing StoryDefinition
  - initializeWorld: register capability behaviors + interceptors, create test rooms + mirrors
  - extendParser: register grammar
  - extendLanguage: register messages
  - getCustomActions: return all story actions

### Step 11: Test Transcripts

- `tests/transcripts/mirror-connect.transcript` — connecting, chaining, chain extension
- `tests/transcripts/mirror-enter.transcript` — entering, chain traversal (ends and middle), room description
- `tests/transcripts/mirror-disconnect.transcript` — disconnecting, chain splitting
- `tests/transcripts/mirror-size.transcript` — small/medium/large restrictions
- `tests/transcripts/mirror-tape.transcript` — taping, blocking
- `tests/transcripts/mirror-break.transcript` — breaking, removal from all chains

## Key Reference Files

- `stories/dungeo/src/actions/walk-through/walk-through-action.ts` — Teleportation action pattern (enter-mirror follows this)
- `stories/dungeo/src/traits/basket-elevator-trait.ts` — Story trait + capability behavior registration pattern
- `stories/dungeo/src/interceptors/` — Interceptor patterns
- `stories/dungeo/src/grammar/` — Grammar registration pattern
- `stories/dungeo/src/index.ts` — Story initialization lifecycle

## File Structure

```
stories/reflections/src/
  traits/
    mirror-portal-trait.ts
    mirror-carrier-trait.ts
    mirror-behaviors.ts
    mirror-breaking-behavior.ts
    index.ts
  actions/
    connect/
      types.ts, connect-action.ts, index.ts
    disconnect/
      types.ts, disconnect-action.ts, index.ts
    enter-mirror/
      types.ts, enter-mirror-action.ts, index.ts
    go-to/
      types.ts, go-to-action.ts, index.ts
    tape/
      types.ts, tape-action.ts, index.ts
    untape/
      types.ts, untape-action.ts, index.ts
    sense-mirrors/
      types.ts, sense-mirrors-action.ts, index.ts
    index.ts
  interceptors/
    mirror-touching-interceptor.ts
    mirror-examining-interceptor.ts
  grammar/
    mirror-grammar.ts
    index.ts
  messages/
    mirror-messages.ts
    index.ts
  index.ts
stories/reflections/tests/
  transcripts/
    mirror-connect.transcript
    mirror-enter.transcript
    mirror-disconnect.transcript
    mirror-size.transcript
    mirror-tape.transcript
    mirror-break.transcript
```

## Verification

1. Build: `./build.sh -s reflections`
2. Run transcript tests: `node dist/cli/sharpee.js --test stories/reflections/tests/transcripts/*.transcript`
3. Interactive test: `node dist/cli/sharpee.js --play` (select reflections story)
4. Verify serialization: save/restore cycle doesn't break chain data
