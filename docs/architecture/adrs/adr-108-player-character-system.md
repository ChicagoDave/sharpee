# ADR-108: Player Character System

## Status: PROPOSED

## Date: 2026-01-21

## Context

Sharpee currently creates a player entity during story initialization, but the approach is ad-hoc:
- Each story manually creates a player entity
- Player identity ("Adventurer", "you") is baked in
- No mechanism to switch player characters mid-game
- No default implementation for simple stories

Different stories have different player character needs:

1. **Anonymous protagonist** - Classic IF "you" with no specific identity (Zork)
2. **Named protagonist** - Specific character ("Mrs. Marple", "The Thief")
3. **Multiple protagonists** - Switch between characters throughout the game (Reflections)

The WIP story "Reflections" involves three player characters:
- Start: Each character in separate storylines
- Middle: Stories begin to intersect
- Finale: All three in the same scene, rapid switching to build suspense

When you're controlling Alice, Bob and Carol are NPCs with their own behaviors. When you switch to Bob, Alice becomes an NPC. This requires the same entity to transition between PC (player-controlled) and NPC (behavior-driven) states.

### Requirements

1. **Default player** - Works out-of-the-box if story doesn't customize
2. **Customizable identity** - Name, description, pronouns, any trait
3. **Story override** - Story can customize or replace the default player
4. **Mid-game switching** - Change which entity is the player character
5. **PC↔NPC transitions** - Non-active protagonists run as NPCs
6. **State continuity** - Inventory, location, traits persist across switches
7. **Perspective alignment** - Text output reflects current PC's point of view

### Design Tensions

1. **Simplicity vs. Power**: Simple stories shouldn't need to think about player switching
2. **Entity consistency**: A character that can be PC or NPC is still one entity
3. **Behavior continuity**: What was an NPC doing while you weren't controlling them?
4. **Scope resolution**: Parser must know who "I" and "me" refer to
5. **Perspective**: Text service must know whose viewpoint to render from

## Decision

### Core Concept: Player Identity as Runtime State

The "current player" is a runtime reference that can change, not a fixed entity type. Any entity with the right traits can become the player character.

```typescript
// Engine maintains current player reference
interface GameState {
  currentPlayerId: EntityId;
  // ... other state
}

// Change the active player
world.setCurrentPlayer(entityId: EntityId): void;
world.getCurrentPlayer(): Entity;
world.getCurrentPlayerId(): EntityId;
```

### PlayerTrait: Minimal Requirements

An entity needs `PlayerTrait` to be eligible as a player character:

```typescript
interface PlayerTrait {
  type: 'if.trait.player';

  // Identity
  name: string;           // "Adventurer", "Mrs. Marple", "Alice"
  description?: string;   // For EXAMINE SELF

  // Pronouns (for text generation)
  pronouns: PronounSet;   // { subject: 'you', object: 'you', possessive: 'your', reflexive: 'yourself' }

  // PC/NPC state
  isPlayerControlled: boolean;  // true = PC, false = NPC

  // Optional NPC behavior when not controlled
  npcBehaviorId?: string;  // References NpcBehavior if entity can act autonomously
}

interface PronounSet {
  subject: string;      // "you", "she", "he", "they"
  object: string;       // "you", "her", "him", "them"
  possessive: string;   // "your", "her", "his", "their"
  reflexive: string;    // "yourself", "herself", "himself", "themselves"
}
```

### Default Player Factory

The stdlib provides a factory for the common case:

```typescript
// In stdlib
function createDefaultPlayer(world: WorldModel, options?: PlayerOptions): Entity {
  const defaults: PlayerOptions = {
    id: 'player',
    name: 'Adventurer',
    description: 'As good-looking as ever.',
    pronouns: secondPersonPronouns,  // you/your/yourself
    startLocation: undefined,  // Story must set this
  };

  const opts = { ...defaults, ...options };

  const player = world.createEntity(opts.id, EntityType.ACTOR);

  player.addTrait(TraitType.PLAYER, {
    name: opts.name,
    description: opts.description,
    pronouns: opts.pronouns,
    isPlayerControlled: true,
  });

  player.addTrait(TraitType.CONTAINER, {
    isOpen: true,  // Inventory is accessible
    capacity: Infinity,
  });

  if (opts.startLocation) {
    world.moveEntity(player.id, opts.startLocation);
  }

  world.setCurrentPlayer(player.id);

  return player;
}

// Pronoun presets
const secondPersonPronouns: PronounSet = {
  subject: 'you', object: 'you', possessive: 'your', reflexive: 'yourself'
};

const thirdPersonFeminine: PronounSet = {
  subject: 'she', object: 'her', possessive: 'her', reflexive: 'herself'
};

const thirdPersonMasculine: PronounSet = {
  subject: 'he', object: 'him', possessive: 'his', reflexive: 'himself'
};

const thirdPersonNeutral: PronounSet = {
  subject: 'they', object: 'them', possessive: 'their', reflexive: 'themselves'
};
```

### Story Customization

Stories can customize the player at various levels:

#### Level 1: Simple Override (name only)

```typescript
// stories/mystery/src/index.ts
initializeWorld(world: WorldModel) {
  createDefaultPlayer(world, {
    name: 'Mrs. Marple',
    startLocation: 'drawing-room',
  });
}
```

#### Level 2: Full Custom Player

```typescript
// stories/dungeo/src/index.ts
initializeWorld(world: WorldModel) {
  createDefaultPlayer(world, {
    id: 'adventurer',
    name: 'Adventurer',
    description: 'A brave explorer of dangerous places.',
    pronouns: secondPersonPronouns,
    startLocation: 'west-of-house',
  });
}
```

#### Level 3: Named Third-Person Protagonist

```typescript
// stories/noir/src/index.ts
initializeWorld(world: WorldModel) {
  createDefaultPlayer(world, {
    id: 'detective',
    name: 'Sam Spade',
    description: 'A hard-boiled detective with a nose for trouble.',
    pronouns: thirdPersonMasculine,
    startLocation: 'office',
  });
}
```

#### Level 4: Multiple Protagonists (Reflections)

```typescript
// stories/reflections/src/index.ts
initializeWorld(world: WorldModel) {
  // Create all three protagonists
  const alice = createProtagonist(world, {
    id: 'alice',
    name: 'Alice',
    pronouns: thirdPersonFeminine,
    startLocation: 'alice-apartment',
    npcBehaviorId: 'alice-autonomous',  // What Alice does when not controlled
  });

  const bob = createProtagonist(world, {
    id: 'bob',
    name: 'Bob',
    pronouns: thirdPersonMasculine,
    startLocation: 'bob-office',
    npcBehaviorId: 'bob-autonomous',
  });

  const carol = createProtagonist(world, {
    id: 'carol',
    name: 'Carol',
    pronouns: thirdPersonFeminine,
    startLocation: 'carol-lab',
    npcBehaviorId: 'carol-autonomous',
  });

  // Start controlling Alice
  world.setCurrentPlayer(alice.id);
}

// Helper for creating switchable protagonists
function createProtagonist(world: WorldModel, options: ProtagonistOptions): Entity {
  const player = world.createEntity(options.id, EntityType.ACTOR);

  player.addTrait(TraitType.PLAYER, {
    name: options.name,
    pronouns: options.pronouns,
    isPlayerControlled: false,  // Will be set true when switched to
    npcBehaviorId: options.npcBehaviorId,
  });

  player.addTrait(TraitType.CONTAINER, { isOpen: true });

  // Also add NPC trait for when they're not controlled
  if (options.npcBehaviorId) {
    player.addTrait(TraitType.NPC, {
      isAlive: true,
      isConscious: true,
      behaviorId: options.npcBehaviorId,
    });
  }

  world.moveEntity(player.id, options.startLocation);

  return player;
}
```

### Player Switching Mechanism

```typescript
// WorldModel method
setCurrentPlayer(entityId: EntityId): void {
  const newPlayer = this.getEntity(entityId);
  if (!newPlayer.hasTrait(TraitType.PLAYER)) {
    throw new Error(`Entity ${entityId} cannot be a player (no PlayerTrait)`);
  }

  // Deactivate current player (becomes NPC if they have behavior)
  const currentId = this.state.currentPlayerId;
  if (currentId && currentId !== entityId) {
    const current = this.getEntity(currentId);
    const playerTrait = current.getTrait<PlayerTrait>(TraitType.PLAYER);
    playerTrait.isPlayerControlled = false;

    // Emit event for story handlers
    this.emitEvent({
      type: 'player.deactivated',
      data: { entityId: currentId }
    });
  }

  // Activate new player
  const newPlayerTrait = newPlayer.getTrait<PlayerTrait>(TraitType.PLAYER);
  newPlayerTrait.isPlayerControlled = true;
  this.state.currentPlayerId = entityId;

  // Emit event
  this.emitEvent({
    type: 'player.activated',
    data: { entityId }
  });
}
```

### Turn Cycle Integration

The NPC phase (ADR-070) checks `isPlayerControlled` to skip the active player:

```typescript
// In NPC turn phase
for (const npc of npcsInWorld) {
  const playerTrait = npc.getTrait<PlayerTrait>(TraitType.PLAYER);

  // Skip if this entity is currently player-controlled
  if (playerTrait?.isPlayerControlled) {
    continue;
  }

  // Run NPC behavior
  const npcTrait = npc.getTrait<NpcTrait>(TraitType.NPC);
  if (npcTrait && npcTrait.behaviorId) {
    const behavior = getBehavior(npcTrait.behaviorId);
    const actions = behavior.onTurn(createNpcContext(npc, world));
    executeNpcActions(npc, actions, world);
  }
}
```

### Parser Integration

The parser uses `getCurrentPlayerId()` to resolve commands:

```typescript
// Parser scope resolution
function resolveScope(world: WorldModel): ScopeContext {
  const playerId = world.getCurrentPlayerId();
  const player = world.getEntity(playerId);
  const location = world.getLocation(playerId);

  return {
    actor: player,
    actorId: playerId,
    location: world.getEntity(location),
    // ... scope calculation based on current player's perspective
  };
}
```

### Perspective in Text Output

The language layer uses current player's pronouns for text generation:

```typescript
// In text-service or formatters
function getPlayerPronouns(world: WorldModel): PronounSet {
  const player = world.getCurrentPlayer();
  const trait = player.getTrait<PlayerTrait>(TraitType.PLAYER);
  return trait.pronouns;
}

// Message with perspective
// "You pick up the sword." vs "Alice picks up the sword."
language.addMessage('if.action.taking.taken', (params, context) => {
  const pronouns = context.getPlayerPronouns();
  if (pronouns.subject === 'you') {
    return 'Taken.';
  } else {
    return `${context.getPlayerName()} takes the ${params.item}.`;
  }
});
```

### Story-Controlled Switching

Stories control when switching occurs:

```typescript
// Event-based switching (chapter transitions)
world.registerEventHandler('chapter.completed', (event, world) => {
  if (event.data.chapter === 3) {
    world.setCurrentPlayer('bob');
    world.emitEvent({
      type: 'narrative.perspective_shift',
      data: { messageId: 'reflections.switch_to_bob' }
    });
  }
});

// Command-based switching (player choice)
grammar
  .define('switch to :character')
  .mapsTo('reflections.action.switch_character')
  .build();

// Automatic switching (dramatic pacing)
registerDaemon({
  id: 'perspective-escalation',
  condition: (world) => world.getTurnCount() > finaleStartTurn,
  onTurn: (world) => {
    // Rotate through characters every few turns
    const chars = ['alice', 'bob', 'carol'];
    const current = world.getCurrentPlayerId();
    const next = chars[(chars.indexOf(current) + 1) % 3];
    world.setCurrentPlayer(next);
  }
});
```

### Events

```typescript
// Player system events
type PlayerEvent =
  | { type: 'player.activated'; data: { entityId: EntityId } }
  | { type: 'player.deactivated'; data: { entityId: EntityId } }
  | { type: 'player.identity_changed'; data: { entityId: EntityId; changes: Partial<PlayerTrait> } };
```

### Reflections Finale Example

```typescript
// The finale has all three in the same room, rapid switching
const finaleSequence = [
  { character: 'alice', turns: 3, message: 'Alice sees the door begin to open...' },
  { character: 'bob', turns: 2, message: 'Bob hears footsteps behind him...' },
  { character: 'carol', turns: 2, message: 'Carol realizes the truth...' },
  { character: 'alice', turns: 1, message: 'Alice!' },
  { character: 'bob', turns: 1, message: 'Bob!' },
  { character: 'carol', turns: 1, message: 'Carol!' },
  // Rapid switching builds to climax
];

// During non-controlled turns, characters act autonomously
// Alice: investigating, moving cautiously
// Bob: working through clues, following leads
// Carol: piecing together the scientific evidence

// All three converge on the same room for the climax
// Each gets brief moments of control as tension builds
```

## Consequences

### Positive

1. **Simple cases stay simple** - Default player works with zero configuration
2. **Full customization** - Any aspect of player identity can be changed
3. **Mid-game switching** - Multi-character stories are fully supported
4. **Unified entity model** - PC and NPC are the same entity, different states
5. **Narrative flexibility** - Stories control pacing and switching mechanics
6. **State continuity** - Switching doesn't lose inventory or progress

### Negative

1. **Complexity for multi-character** - Reflections-style games require careful behavior design
2. **Perspective management** - Text must adapt to whose POV we're in
3. **Testing complexity** - Multi-protagonist games need more test coverage

### Neutral

1. **NPC behavior required** - Switchable protagonists need defined autonomous behavior
2. **No automatic "catch up"** - Story decides what happens off-screen

## Implementation

### Phase 1: Core Infrastructure

1. Add `PlayerTrait` to world-model
2. Add `currentPlayerId` to game state
3. Add `setCurrentPlayer()`, `getCurrentPlayer()` to WorldModel
4. Add player events

### Phase 2: Default Factory

1. Create `createDefaultPlayer()` in stdlib
2. Add pronoun presets
3. Update existing stories to use factory

### Phase 3: Parser/Text Integration

1. Update parser scope to use current player
2. Add pronoun context to formatters
3. Test perspective in text output

### Phase 4: NPC Transition

1. Integrate with NPC turn phase
2. Support `npcBehaviorId` for switchable protagonists
3. Test PC↔NPC transitions

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| ADR-070 | NPC system for autonomous behavior when not controlled |
| ADR-071 | Daemons for automatic switching triggers |
| ADR-089 | Perspective placeholders use player pronouns |
| ADR-095 | Formatters need pronoun context |

## References

- Photopia (multiple protagonists, perspective shifts)
- Spider and Web (unreliable narrator, identity revelation)
- Suspended (controlling multiple robots)
- Trinity (perspective shifts between time periods)
