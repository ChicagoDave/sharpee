# ADR-148: Concealment Action (HIDE/DUCK BEHIND/UNDER/ON)

## Status: DRAFT

## Date: 2026-04-09

## Context

ADR-144 (Information Propagation) defines three player presence states: `absent`, `present`, and `concealed`. The `concealed` state enables eavesdropping — the player sees full NPC dialogue and learns facts with source `'overheard'`. ADR-142 (Conversation) references this state for dramatic eavesdropping moments.

**The gap:** Nothing in the platform puts the player into the `concealed` state. There is no HIDE action, no concealment trait, and no mechanism for a player to become hidden relative to NPCs in the same location. The `concealed` presence mode exists in code (`packages/character/src/propagation/visibility.ts`) but has no entry point.

### What the Player Should Be Able to Do

```
> hide behind curtain
You slip behind the heavy curtain, pressing yourself against the wall.

> hide under desk
You crawl under the desk, pulling the chair in to conceal yourself.

> hide on balcony
You crouch behind the balcony railing, out of sight from the room below.

> hide inside armoire
You climb into the armoire, pulling the door mostly shut.

> duck behind pillar
You duck behind the stone pillar.
```

While concealed, the player can observe NPC behavior and conversations without being detected. NPCs act as if the player is absent — they follow their schedules, have private conversations, and reveal information they would withhold in the player's presence.

### Design Constraints

- **Not invisibility.** Concealment is location-specific and depends on having something to hide behind/under/on. The player is hidden relative to a specific hiding spot in a specific room.
- **Not permanent.** Moving, taking actions that make noise, or being in the wrong position when an NPC enters can break concealment.
- **NPCs can discover the player.** Some NPCs should be able to detect a hidden player (guards on alert, dogs, suspicious characters). This is NPC-specific, not a universal mechanic.
- **Connects to existing systems.** The `PlayerPresence` type and propagation visibility already handle the downstream effects. This ADR only needs to define the action that transitions the player into and out of concealment.

## Decision

### 1. ConcealmentTrait (world-model)

Entities that can serve as hiding spots carry a `ConcealmentTrait`:

```typescript
interface ConcealmentTrait extends ITrait {
  type: 'if.trait.concealment';

  /** How the player hides: 'behind', 'under', 'on' */
  positions: ConcealmentPosition[];

  /** Capacity — how many actors can hide here (default: 1) */
  capacity?: number;

  /** Quality of concealment — affects NPC detection checks */
  quality: 'poor' | 'fair' | 'good' | 'excellent';
}

type ConcealmentPosition = 'behind' | 'under' | 'on' | 'inside';
```

Story authors add this trait to furniture, architecture, and scenery:

```typescript
const curtain = world.createEntity('curtain', 'object');
curtain.add(new ConcealmentTrait({
  positions: ['behind'],
  quality: 'good',
}));

const desk = world.createEntity('desk', 'object');
desk.add(new ConcealmentTrait({
  positions: ['under'],
  quality: 'fair',
}));

const balcony = world.createEntity('balcony', 'object');
balcony.add(new ConcealmentTrait({
  positions: ['on'],
  quality: 'excellent',  // elevated position, hard to spot from below
}));

const armoire = world.createEntity('armoire', 'object');
armoire.add(new ConcealmentTrait({
  positions: ['inside'],
  quality: 'good',
}));
// Note: entity also needs ContainerTrait if the player can put/find items in it.
// ConcealmentTrait is independent — hiding inside is not the same as entering a container.
```

### 2. ConcealedStateTrait (world-model) — Player State

Concealment state lives on the actor as a dynamic trait. The hiding action adds it; the revealing action (or implicit reveal) removes it. Presence of the trait IS the concealed state — no boolean flag needed.

```typescript
interface IConcealedStateTrait {
  /** The entity the actor is hiding behind/under/on/inside */
  targetId: EntityId;

  /** How the actor is hiding */
  position: ConcealmentPosition;

  /** Snapshot of the hiding spot's quality at time of concealment */
  quality: 'poor' | 'fair' | 'good' | 'excellent';
}

class ConcealedStateTrait implements ITrait, IConcealedStateTrait {
  static readonly type = 'if.trait.concealed_state';
  readonly type = 'if.trait.concealed_state';

  /** Registers the visibility capability — concealed actors block canSee() */
  static readonly capabilities = ['if.scope.visible'] as const;

  targetId: EntityId;
  position: ConcealmentPosition;
  quality: 'poor' | 'fair' | 'good' | 'excellent';

  constructor(data: IConcealedStateTrait) {
    this.targetId = data.targetId;
    this.position = data.position;
    this.quality = data.quality;
  }
}
```

**Utility functions** (world-model):

```typescript
/** Check if an actor is concealed */
function isConcealed(entity: IFEntity): boolean {
  return entity.has('if.trait.concealed_state');
}

/** Get the concealment details, or undefined if not concealed */
function getConcealmentState(entity: IFEntity): IConcealedStateTrait | undefined {
  return entity.get('if.trait.concealed_state') as IConcealedStateTrait | undefined;
}
```

**Visibility capability behavior** (world-model):

The `ConcealedStateTrait` registers the `if.scope.visible` capability. This hooks into the existing `VisibilityBehavior.canSee(observer, target, world)` pipeline. When an NPC calls `canSee()` on the player, the capability behavior intercepts:

```typescript
const ConcealedVisibilityBehavior: CapabilityBehavior = {
  validate(entity, world, observerId, sharedData) {
    // A concealed entity is not visible to other actors.
    // The observer can override this at the story level (see NPC detection).
    return { valid: false, error: 'concealed' };
  },
};

registerCapabilityBehavior('if.trait.concealed_state', 'if.scope.visible', ConcealedVisibilityBehavior);
```

This means:
- `VisibilityBehavior.canSee(npc, player, world)` returns `false` while concealed — NPCs can't see the player
- `VisibilityBehavior.getVisible(npc, world)` excludes the player — NPCs act as if the player is absent
- The witness system, scope resolver, and propagation evaluator all already use `canSee()` — concealment propagates automatically through the existing visibility pipeline
- No new `resolvePlayerPresence()` function needed in the character package

**Why a separate trait, not fields on ActorTrait:**
- Presence/absence of the trait is the state signal — clean, no stale booleans
- Serialized automatically with the entity (traits are part of the save format)
- Can be extended to NPCs later — any actor can receive this trait
- Removal on reveal is a clean state transition (`entity.remove('if.trait.concealed_state')`)

### 3. Hiding Action (stdlib)

A standard four-phase action: `if.action.hiding`

**Grammar patterns** (parser-en-us):

Each pattern maps to `if.action.hiding` with a `position` default semantic. The preposition is literal text in the pattern — the action reads `command.semantics.position` to know how the player wants to hide. This is the same mechanism the going action uses for direction (`withDefaultSemantics({ direction: 'north' })`).

```typescript
// In parser-en-us grammar registration
const positions = {
  behind: ['hide behind', 'duck behind', 'crouch behind'],
  under:  ['hide under', 'duck under', 'crouch under'],
  on:     ['hide on'],
  inside: ['hide in', 'hide inside', 'duck inside'],
};

for (const [position, verbs] of Object.entries(positions)) {
  for (const verb of verbs) {
    grammar
      .define(`${verb} :target`)
      .mapsTo('if.action.hiding')
      .withPriority(100)
      .withDefaultSemantics({ position })
      .build();
  }
}
```

The action reads the position from the parsed command:

```typescript
// In hiding action's validate phase
const position = context.command.semantics?.position as ConcealmentPosition;
if (!position) {
  return { valid: false, error: 'no_position' };
}
```

**Validate:**
- Target must be in the current room and visible
- Target must have `ConcealmentTrait`
- Requested position must be in the trait's `positions` array
- Player must not already have `ConcealedStateTrait`
- Concealment spot must have capacity

**Execute:**
- Add `ConcealedStateTrait` to the player entity with `targetId`, `position`, and `quality` from the hiding spot
- Player remains in the same room — concealment is a state, not a location change
- Emit `if.event.player_concealed` with target, position, and quality

**Report:**
- Success message: language layer provides text based on position and target
- Message IDs: `if.action.hiding.behind`, `if.action.hiding.under`, `if.action.hiding.on`, `if.action.hiding.inside`

**Blocked:**
- No valid hiding spot: `if.action.hiding.nothing_to_hide`
- Wrong position: `if.action.hiding.cant_hide_there`
- Already hidden: `if.action.hiding.already_hidden`

### 3. Revealing (Breaking Concealment)

Concealment breaks when:

| Trigger | How |
|---------|-----|
| Player types `stand up`, `come out`, `reveal`, `unhide` | Explicit reveal action (`if.action.revealing`) |
| Player moves, takes items, attacks, etc. | Pre-action hook (`if.hook.before_action`) checks concealment |
| NPC detects the player | Story-level capability override on `if.scope.visible` |

#### Pre-Action Hook (engine)

The engine emits `if.hook.before_action` after command parsing but before the action's validate phase. This is a general-purpose hook point — concealment is the first consumer, but other systems (status effects, paralysis, stun) will use it too.

**Injection point** in `command-executor.ts`, after `createActionContext()` and before `action.validate()`:

```typescript
// Emit pre-action hook — listeners can modify world state before validation
// Example: concealment system removes ConcealedStateTrait for revealing actions
this.emitHook('if.hook.before_action', {
  actionId: command.actionId,
  actorId: context.playerId,
  directObject: command.directObject?.entity?.id,
});
```

**Concealment listener** (registered by stdlib during engine setup):

```typescript
engine.onHook('if.hook.before_action', (hookData, world) => {
  const player = world.getPlayer();
  if (!player?.has('if.trait.concealed_state')) return;

  // Actions that don't break concealment
  const silentActions = new Set([
    'if.action.looking',
    'if.action.examining',
    'if.action.waiting',
    'if.action.listening',
    'if.action.smelling',
    'if.action.hiding',      // already hidden
    'if.action.revealing',   // handled by its own execute phase
    'if.action.inventory',
    'if.action.help',
    'if.action.saving',
    'if.action.restoring',
    'if.action.quitting',
    'if.action.scoring',
  ]);

  if (!silentActions.has(hookData.actionId)) {
    // Noisy action — break concealment
    player.remove('if.trait.concealed_state');
    world.emit('if.event.player_revealed', {
      reason: 'action',
      revealingAction: hookData.actionId,
    });
  }
});
```

This is an allowlist of silent actions — everything else reveals. This is safer than a denylist because new actions default to revealing (the conservative choice).

#### Explicit Reveal Action

The **revealing action** (`if.action.revealing`) is the deliberate counterpart:

**Grammar:** `stand up`, `come out`, `reveal myself`, `unhide`, `stop hiding`

**Execute:** Remove `ConcealedStateTrait` from the player entity. Emit `if.event.player_revealed { reason: 'explicit' }`.

#### Event Payloads

```typescript
/** Emitted when an actor becomes concealed */
interface PlayerConcealedEvent extends ISemanticEvent {
  type: 'if.event.player_concealed';
  data: {
    targetId: EntityId;           // the hiding spot
    position: ConcealmentPosition; // 'behind' | 'under' | 'on' | 'inside'
    quality: 'poor' | 'fair' | 'good' | 'excellent';
  };
}

/** Emitted when concealment breaks */
interface PlayerRevealedEvent extends ISemanticEvent {
  type: 'if.event.player_revealed';
  data: {
    reason: 'explicit' | 'action' | 'detected';
    revealingAction?: string;     // action ID if reason is 'action'
    detectorId?: EntityId;        // NPC ID if reason is 'detected'
  };
}
```

### 4. Player Presence Resolution (via Existing Visibility)

The propagation system (ADR-144) needs to distinguish `absent`, `present`, and `concealed`. With the visibility capability approach, this resolves through the existing pipeline:

```typescript
function resolvePlayerPresence(world: WorldModel, playerId: string, npcId: string): PlayerPresence {
  const player = world.getEntity(playerId);
  const npc = world.getEntity(npcId);
  if (!player || !npc) return 'absent';

  // Different room → absent
  const playerRoom = world.getContainingRoom(playerId);
  const npcRoom = world.getContainingRoom(npcId);
  if (!playerRoom || !npcRoom || playerRoom.id !== npcRoom.id) return 'absent';

  // Same room but concealed → concealed (eavesdropping)
  if (player.has('if.trait.concealed_state')) return 'concealed';

  // Same room and visible → present (witnessed)
  return 'present';
}
```

The key difference from the previous version: `canSee()` handles NPC-to-player visibility (guards, scope, witness system), while `resolvePlayerPresence()` handles the player's observation mode (what the player sees of NPC behavior). These are two different directions:

| Direction | System | Question |
|-----------|--------|----------|
| NPC → Player | `VisibilityBehavior.canSee(npc, player, world)` | Can the NPC see the player? (No — capability blocks it) |
| Player → NPC | `resolvePlayerPresence()` | What does the player observe? (Concealed — full eavesdropping) |

The concealed player can see and hear NPCs (eavesdropping). NPCs cannot see the concealed player (visibility capability). Both use existing systems.

### 5. NPC Detection (Story-Level, via Capability Override)

The platform's default `ConcealedVisibilityBehavior` blocks all visibility. Stories override this for specific NPCs that should be able to detect hidden players. This uses the existing capability dispatch override pattern:

```typescript
// Story-level: register a detection behavior for guard NPCs
const GuardDetectionBehavior: CapabilityBehavior = {
  validate(entity, world, observerId, sharedData) {
    // entity = player (the concealed target)
    // observerId = the NPC trying to see the player
    const guard = world.getEntity(observerId);
    const concealment = entity.get('if.trait.concealed_state') as IConcealedStateTrait | undefined;

    if (!guard || !concealment) return { valid: false, error: 'concealed' };

    // Alert guards can see through poor/fair concealment
    const guardTrait = guard.get('story.trait.guard') as { alertLevel: number } | undefined;
    if (guardTrait && guardTrait.alertLevel >= 2 && 
        (concealment.quality === 'poor' || concealment.quality === 'fair')) {
      // Guard sees the player — reveal them
      entity.remove('if.trait.concealed_state');
      return { valid: true };  // canSee() returns true → NPC reacts
    }

    return { valid: false, error: 'concealed' };
  },
};

// Register override for guard entities (story init)
registerCapabilityBehavior('story.trait.guard', 'if.scope.visible', GuardDetectionBehavior);
```

The platform does not implement automatic detection. It provides:
- The `ConcealedStateTrait` with quality rating
- The `if.scope.visible` capability hook point
- The `canSee()` pipeline that stories can intercept

Stories decide which NPCs can detect, under what conditions, and what happens when they do.

## Consequences

### Positive

- Completes the `concealed` → eavesdropping pipeline defined in ADR-144
- Gives authors a standard verb for stealth/observation gameplay
- Concealment quality provides a graduated system for detection without hardcoding detection rules
- Hooks into existing `VisibilityBehavior.canSee()` via capability dispatch — no new visibility system, no parallel presence-resolution path
- NPC detection uses the same capability override pattern as other entity behaviors — stories extend, platform provides the hook
- Witness system, scope resolver, and propagation evaluator all get concealment for free via existing `canSee()` calls

### Negative

- Requires a new engine hook (`if.hook.before_action`) — small platform addition, but a platform addition nonetheless
- Testing concealment requires NPC presence and propagation setup — heavier test fixtures
- Authors must remember to add ConcealmentTrait to appropriate entities
- The capability behavior receives `observerId` but no structured "alertness" data — stories must look up NPC state themselves in the override

### Neutral

- Save/restore must include player concealment state (stored on player entity, serialized with world state)
- Concealment is room-scoped — if the hiding spot is destroyed or moved, concealment breaks

## Implementation

### Packages Affected

1. **engine**: `if.hook.before_action` hook point in `command-executor.ts` — emitted after context creation, before `action.validate()`. General-purpose; concealment is the first consumer. Hook infrastructure: `emitHook()` method on engine, `onHook()` registration API.
2. **world-model**: `ConcealmentTrait` (hiding spots), `ConcealedStateTrait` (player state with `if.scope.visible` capability), `ConcealedVisibilityBehavior` (default: blocks visibility), `isConcealed()` / `getConcealmentState()` utility functions
3. **stdlib**: `hiding` action (four-phase), `revealing` action (four-phase), concealment-break hook listener (allowlist of silent actions)
4. **parser-en-us**: Grammar patterns for hide/duck/crouch behind/under/on/inside, reveal/unhide/stand up/come out
5. **lang-en-us**: Messages for hiding, revealing, and detection
6. **character**: `resolvePlayerPresence()` uses room check + `ConcealedStateTrait` presence to determine eavesdropping mode. No new visibility logic — NPC-to-player visibility is handled by the capability behavior in world-model.

### Story-Level

1. Add `ConcealmentTrait` to entities that serve as hiding spots
2. Optionally implement NPC detection logic via behaviors
3. Design puzzles around observation (hide → watch NPC → learn information → act on it)

## Test Requirements

### Behavior Statements

**hiding action (if.action.hiding)**
- DOES: Adds `ConcealedStateTrait` to the player entity with `targetId`, `position`, and `quality` from the hiding spot's `ConcealmentTrait`
- WHEN: Player executes `hide behind/under/on/inside :target` and target has `ConcealmentTrait` with matching position
- BECAUSE: The player must be able to enter the `concealed` presence state to observe NPC behavior without detection (ADR-144 eavesdropping pipeline)
- REJECTS WHEN: Target has no `ConcealmentTrait` (nothing_to_hide); target doesn't support the requested position (cant_hide_there); player already has `ConcealedStateTrait` (already_hidden)

**revealing action (if.action.revealing)**
- DOES: Removes `ConcealedStateTrait` from the player entity
- WHEN: Player executes `stand up`, `come out`, `unhide`, or `stop hiding` while concealed
- BECAUSE: The player must be able to voluntarily end concealment
- REJECTS WHEN: Player is not concealed (not_hidden)

**concealment-break hook listener**
- DOES: Removes `ConcealedStateTrait` from the player entity before noisy actions execute
- WHEN: `if.hook.before_action` fires for an action not in the silent-actions allowlist while player is concealed
- BECAUSE: Physical actions (moving, taking, attacking) would realistically reveal the player's position

**ConcealedVisibilityBehavior**
- DOES: Blocks `VisibilityBehavior.canSee()` — returns `{ valid: false }` so NPCs cannot see the concealed player
- WHEN: Any entity calls `canSee(observer, concealedPlayer, world)`
- BECAUSE: Concealment must make the player invisible to NPCs for the observation mechanic to work

### End-to-End Test

```
Setup:
  - Create room with player and NPC
  - Create curtain entity in room with ConcealmentTrait({ positions: ['behind'], quality: 'good' })

Test: Full concealment → eavesdropping pipeline
  1. Execute hiding action: target=curtain, position=behind
  2. Assert player.has('if.trait.concealed_state') === true
  3. Assert getConcealmentState(player).targetId === curtain.id
  4. Assert getConcealmentState(player).position === 'behind'
  5. Assert getConcealmentState(player).quality === 'good'
  6. Assert VisibilityBehavior.canSee(npc, player, world) === false
  7. Call resolvePlayerPresence(world, player.id, npc.id)
  8. Assert result === 'concealed'
```

### State Transition Tests

```
Test: Concealed → movement reveals
  1. Hide behind curtain → assert concealed
  2. Execute going action (go north)
  3. Assert player.has('if.trait.concealed_state') === false
  4. Assert if.event.player_revealed emitted with reason: 'action'

Test: Concealed → noisy action reveals
  1. Hide behind curtain → assert concealed
  2. Execute taking action (take lamp)
  3. Assert player.has('if.trait.concealed_state') === false
  4. Assert if.event.player_revealed emitted with reason: 'action', revealingAction: 'if.action.taking'

Test: Concealed → silent action preserves
  1. Hide behind curtain → assert concealed
  2. Execute looking action
  3. Assert player.has('if.trait.concealed_state') === true
  4. Assert no if.event.player_revealed emitted

Test: Concealed → explicit reveal
  1. Hide behind curtain → assert concealed
  2. Execute revealing action (stand up)
  3. Assert player.has('if.trait.concealed_state') === false
  4. Assert if.event.player_revealed emitted with reason: 'explicit'

Test: Concealed → NPC detection via capability override
  1. Hide behind curtain (quality: 'poor') → assert concealed
  2. Register GuardDetectionBehavior for story.trait.guard capability
  3. Call VisibilityBehavior.canSee(alertGuard, player, world)
  4. Assert result === true (guard sees through poor concealment)
  5. Assert player.has('if.trait.concealed_state') === false
```

### Negative Tests

```
Test: Hide with no ConcealmentTrait → blocked
  1. Create table entity in room (no ConcealmentTrait)
  2. Execute hiding action: target=table, position=behind
  3. Assert validation fails with error: 'nothing_to_hide'
  4. Assert player.has('if.trait.concealed_state') === false

Test: Hide with wrong position → blocked
  1. Create desk with ConcealmentTrait({ positions: ['under'], quality: 'fair' })
  2. Execute hiding action: target=desk, position=behind
  3. Assert validation fails with error: 'cant_hide_there'
  4. Assert player.has('if.trait.concealed_state') === false

Test: Hide when already concealed → blocked
  1. Hide behind curtain → assert concealed
  2. Execute hiding action: target=desk, position=under
  3. Assert validation fails with error: 'already_hidden'
  4. Assert getConcealmentState(player).targetId === curtain.id (original concealment unchanged)

Test: Reveal when not concealed → blocked
  1. Assert player.has('if.trait.concealed_state') === false
  2. Execute revealing action
  3. Assert validation fails with error: 'not_hidden'
```

### Save/Restore Test

```
Test: Concealment state survives save/restore
  1. Hide behind curtain → assert concealed
  2. Save game state
  3. Restore game state
  4. Assert player.has('if.trait.concealed_state') === true
  5. Assert getConcealmentState(player).targetId === curtain.id
  6. Assert getConcealmentState(player).position === 'behind'
  7. Assert VisibilityBehavior.canSee(npc, player, world) === false
```

## Acceptance Criteria

This ADR is complete when:

1. **Player can hide:** `hide behind curtain` adds `ConcealedStateTrait` to the player with correct targetId, position, and quality
2. **NPCs can't see concealed player:** `VisibilityBehavior.canSee(npc, player, world)` returns `false` while player has `ConcealedStateTrait`
3. **Eavesdropping works:** `resolvePlayerPresence()` returns `'concealed'` for a hidden player in the same room as an NPC — propagation system delivers full dialogue and `playerLearns: true`
4. **Silent actions preserve concealment:** `look`, `examine`, `wait`, `listen`, `inventory` do not remove `ConcealedStateTrait`
5. **Noisy actions break concealment:** `go`, `take`, `drop`, `attack` trigger `if.hook.before_action` listener which removes `ConcealedStateTrait` and emits `if.event.player_revealed`
6. **Explicit reveal works:** `stand up` / `unhide` removes `ConcealedStateTrait` via the revealing action
7. **Negative cases blocked:** No trait → `nothing_to_hide`; wrong position → `cant_hide_there`; already hidden → `already_hidden`; not hidden → `not_hidden`
8. **Save/restore round-trips:** `ConcealedStateTrait` persists across save and restore
9. **All four positions work:** `behind`, `under`, `on`, `inside` each produce correct `ConcealedStateTrait.position`
10. **Grammar parses all verb forms:** `hide`, `duck`, `crouch` with all applicable prepositions resolve to `if.action.hiding` with correct `position` semantic

## Open Questions

1. **Should concealment affect the `look` command?** When hidden behind a curtain, does the room description change? Probably yes — "From behind the curtain, you can see..." — but this is a language layer concern, not an action concern.

2. **Can NPCs also hide?** This ADR covers player concealment only, but the architecture supports NPC concealment naturally — adding `ConcealedStateTrait` to an NPC would make them invisible to the player via the same `canSee()` pipeline. NPC ambush/surprise scenarios would use the same trait with different reveal triggers. Out of scope for this ADR but the design doesn't block it.

3. **Multi-room concealment?** Hiding on a balcony overlooking a room below — the player is technically in a different room but observing another. This might be better modeled as a scope/visibility rule rather than concealment.

## References

- ADR-141: Character Model (knowledge, personality, observation)
- ADR-142: Conversation System (eavesdropping mechanic)
- ADR-144: Information Propagation (PlayerPresence, visibility modes, `concealed` state)
- ADR-145: NPC Goal Pursuit (concealed observation of NPC schedule behavior)
- ADR-090: Entity-Centric Action Dispatch (capability pattern for hiding spots)
