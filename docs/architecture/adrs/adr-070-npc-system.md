# ADR-070: NPC System Architecture

## Status

Proposed

## Context

Mainframe Zork (and IF generally) requires Non-Player Characters that:

1. **Exist in the world** as entities with inventory, location, and state
2. **Act autonomously** on their own turn (wandering, stealing, reacting)
3. **Interact with player** through conversation, combat, and observation
4. **Maintain state** across turns (health, mood, knowledge, goals)

Zork specifically requires:

- **Thief**: Wanders underground, steals valuables, fights skillfully, has a lair
- **Troll**: Guards a location, fights poorly, blocks passage until defeated
- **Cyclops**: Stationary, responds to specific words, flees when named
- **Spirits**: Block passage, dispellable via ritual
- **Dungeon Master**: Guides player through endgame, follows, assists

These represent a spectrum from simple (spirits: static blocker) to complex (thief: autonomous agent with goals).

### Requirements

1. NPCs must participate in the turn cycle (act after player acts)
2. NPCs must be able to move between rooms
3. NPCs must be able to take/drop/use objects
4. NPCs must be able to initiate and participate in combat
5. NPCs must have observable state (player can see them, their inventory)
6. NPC behavior must be customizable per-NPC
7. NPCs must be able to respond to player actions (speech, presence, attacks)
8. Some NPCs need randomized behavior (thief wandering)

### Design Tensions

1. **Simplicity vs. Power**: Simple NPCs (troll) shouldn't require complex machinery
2. **Authoring burden**: Authors shouldn't need to write AI systems
3. **Performance**: Many NPCs shouldn't slow the game
4. **Determinism**: Testing/saves require reproducible behavior (seeded randomness)
5. **Extensibility**: Authors may want novel NPC behaviors

## Decision

### Core Architecture: Entity + Behavior Component

NPCs are entities with an `NpcTrait` that marks them as autonomous actors. Behavior is defined through composable `NpcBehavior` components.

```typescript
// Core NPC trait - marks entity as autonomous
interface NpcTrait {
  type: 'npc';

  // Current state
  isAlive: boolean;
  isConscious: boolean;
  isHostile: boolean;

  // Combat stats (optional)
  health?: number;
  maxHealth?: number;
  attackSkill?: number;  // 0-100, affects combat

  // Movement constraints
  canMove: boolean;
  allowedRooms?: EntityId[];  // undefined = anywhere
  forbiddenRooms?: EntityId[];

  // Behavior reference
  behaviorId: string;  // References registered behavior
}
```

### Behavior System: Strategy Pattern

NPC behaviors are registered strategies that define autonomous actions:

```typescript
interface NpcBehavior {
  id: string;

  // Called each turn for this NPC
  onTurn(context: NpcContext): NpcAction[];

  // Called when player enters NPC's room
  onPlayerEnters?(context: NpcContext): NpcAction[];

  // Called when player leaves NPC's room
  onPlayerLeaves?(context: NpcContext): NpcAction[];

  // Called when player speaks to/at NPC
  onSpokenTo?(context: NpcContext, words: string): NpcAction[];

  // Called when NPC is attacked
  onAttacked?(context: NpcContext, attacker: Entity): NpcAction[];

  // Called when NPC observes player action
  onObserve?(context: NpcContext, action: SemanticAction): NpcAction[];
}

interface NpcContext {
  npc: Entity;
  world: World;
  random: SeededRandom;  // For deterministic randomness
  turnCount: number;
  playerLocation: EntityId;
  npcLocation: EntityId;
  npcInventory: Entity[];
  playerVisible: boolean;  // Is player in same room?
}

// Actions an NPC can take
type NpcAction =
  | { type: 'move'; direction: Direction }
  | { type: 'moveTo'; roomId: EntityId }
  | { type: 'take'; target: EntityId }
  | { type: 'drop'; target: EntityId }
  | { type: 'attack'; target: EntityId }
  | { type: 'speak'; message: string }
  | { type: 'emote'; description: string }  // "The thief grins menacingly."
  | { type: 'custom'; handler: () => SemanticEvent[] };
```

### Turn Cycle Integration

NPCs act at the end of each player turn, after the player's action completes:

```
1. Player command parsed
2. Player action validated
3. Player action executed
4. Player action reported
5. >>> NPC turn phase <<<
   - For each NPC (deterministic order):
     - Call behavior.onTurn()
     - Execute NPC actions
     - Generate NPC events
6. Daemons run (see ADR-071)
7. Turn complete
```

### Built-in Behaviors

The stdlib provides common behavior patterns:

```typescript
// Stationary guard - blocks passage until defeated
const guardBehavior: NpcBehavior = {
  id: 'guard',
  onTurn: () => [],  // Does nothing on its own
  onPlayerEnters: (ctx) => [{
    type: 'speak',
    message: 'The troll blocks your way, growling menacingly.'
  }],
  onAttacked: (ctx, attacker) => [{
    type: 'attack',
    target: attacker.id
  }]
};

// Wanderer - moves randomly, can be given goals
const wandererBehavior: NpcBehavior = {
  id: 'wanderer',
  onTurn: (ctx) => {
    if (ctx.random.chance(0.3)) {  // 30% chance to move
      const exits = getExits(ctx.npcLocation, ctx.world);
      const validExits = exits.filter(e =>
        !ctx.npc.traits.npc.forbiddenRooms?.includes(e.destination)
      );
      if (validExits.length > 0) {
        const exit = ctx.random.pick(validExits);
        return [{ type: 'move', direction: exit.direction }];
      }
    }
    return [];
  }
};

// Thief - composite behavior (wander + steal + fight)
const thiefBehavior: NpcBehavior = {
  id: 'thief',
  onTurn: (ctx) => {
    const actions: NpcAction[] = [];

    // If player visible with valuables, try to steal
    if (ctx.playerVisible) {
      const playerValuables = getValuables(ctx.world, 'player');
      if (playerValuables.length > 0 && ctx.random.chance(0.4)) {
        const target = ctx.random.pick(playerValuables);
        actions.push({ type: 'take', target: target.id });
        actions.push({ type: 'speak', message: '"My, what a lovely trinket!"' });
      }
    }

    // Otherwise maybe wander
    if (actions.length === 0 && ctx.random.chance(0.25)) {
      // ... wandering logic
    }

    return actions;
  },
  // ... other hooks
};
```

### Authoring NPCs

Authors define NPCs as entities with behavior binding:

```typescript
// Simple guard NPC
const troll = world.createEntity({
  id: 'troll',
  name: 'troll',
  description: 'A large, menacing troll with a taste for adventurers.',
  location: 'troll-room',
  traits: {
    npc: {
      type: 'npc',
      isAlive: true,
      isConscious: true,
      isHostile: true,
      health: 10,
      maxHealth: 10,
      attackSkill: 30,
      canMove: false,  // Stationary
      behaviorId: 'guard'
    }
  }
});

// Complex thief NPC
const thief = world.createEntity({
  id: 'thief',
  name: 'thief',
  description: 'A seedy-looking gentleman with nimble fingers.',
  location: 'thiefs-lair',
  traits: {
    npc: {
      type: 'npc',
      isAlive: true,
      isConscious: true,
      isHostile: false,  // Not hostile until attacked
      health: 20,
      maxHealth: 20,
      attackSkill: 80,  // Very skilled
      canMove: true,
      forbiddenRooms: ['surface-*'],  // Stays underground
      behaviorId: 'thief'
    },
    container: { /* can carry things */ }
  }
});
```

### Custom Behaviors

Authors can register custom behaviors:

```typescript
game.registerNpcBehavior({
  id: 'cyclops',
  onSpokenTo: (ctx, words) => {
    if (words.toLowerCase().includes('odysseus') ||
        words.toLowerCase().includes('ulysses')) {
      // Cyclops flees
      return [
        { type: 'emote', description: 'The cyclops, hearing that name, panics!' },
        { type: 'custom', handler: () => {
          // Remove cyclops, open passage
          ctx.world.removeEntity(ctx.npc.id);
          ctx.world.setConnection('cyclops-room', 'up', 'treasure-room');
          return [{ type: 'world.changed', data: { description: 'The cyclops flees, revealing a stairway!' } }];
        }}
      ];
    }
    return [{ type: 'speak', message: 'The cyclops ignores your words.' }];
  }
});
```

### NPC Events

NPC actions generate semantic events that flow through the normal event system:

```typescript
type NpcEvent =
  | { type: 'npc.moved'; npc: EntityId; from: EntityId; to: EntityId; direction: Direction }
  | { type: 'npc.spoke'; npc: EntityId; message: string }
  | { type: 'npc.took'; npc: EntityId; target: EntityId }
  | { type: 'npc.dropped'; npc: EntityId; target: EntityId }
  | { type: 'npc.attacked'; npc: EntityId; target: EntityId; result: CombatResult }
  | { type: 'npc.emoted'; npc: EntityId; description: string }
  | { type: 'npc.died'; npc: EntityId; cause: string }
  | { type: 'npc.stateChanged'; npc: EntityId; changes: Partial<NpcTrait> };
```

These events are:
1. Visible to event handlers (author can react)
2. Reported to player if witnessed (same room)
3. Part of the event log for reporting

### Visibility and Perception

NPC actions are only reported if the player can perceive them:

- Player in same room → Full description
- Player in adjacent room → Sound-based hints ("You hear a grunt from the north")
- Player elsewhere → Nothing reported

The `PerceptionService` handles this filtering (see ADR-069).

### Save/Load

NPC state is part of world state and serializes normally:
- Location
- Trait values (health, isAlive, etc.)
- Inventory

Behavior state (if any) must be serializable:

```typescript
interface NpcBehavior {
  // ... existing methods

  // Optional state management
  getState?(npc: Entity): Record<string, unknown>;
  setState?(npc: Entity, state: Record<string, unknown>): void;
}
```

## Consequences

### Positive

1. **Simple cases are simple**: Stationary NPCs need minimal code
2. **Complex cases are possible**: Thief behavior is expressible
3. **Composable**: Behaviors can be combined/extended
4. **Testable**: Seeded randomness enables deterministic tests
5. **Familiar**: Strategy pattern is well-understood
6. **Event integration**: NPC actions flow through existing event system

### Negative

1. **No behavior trees**: Complex decision-making requires custom code
2. **Limited goal-seeking**: No pathfinding or goal planning built-in
3. **Performance unknown**: Many NPCs with complex behaviors untested
4. **Learning curve**: Authors must understand behavior hooks

### Neutral

1. **Behaviors are global**: Registered once, referenced by ID
2. **Turn-based only**: No real-time NPC behavior

## Alternatives Considered

### Alternative 1: Behavior Trees

Full behavior tree system with nodes for conditions, sequences, selectors.

**Rejected because**:
- Overkill for most IF NPCs
- High authoring complexity
- Can be added later if needed

### Alternative 2: State Machines

Explicit state machine with transitions.

**Rejected because**:
- Good for simple NPCs but awkward for complex ones
- Thief behavior doesn't fit clean state machine
- Behaviors can implement FSM internally if desired

### Alternative 3: Scripting Language

Custom DSL or Lua for NPC behavior.

**Rejected because**:
- Adds runtime dependency
- Debugging complexity
- TypeScript is already expressive enough

### Alternative 4: ECS Components

Pure ECS with system that queries components.

**Rejected because**:
- Sharpee isn't pure ECS
- Adds conceptual overhead
- Behavior pattern fits existing architecture

## Implementation Notes

### Phase 1: Minimal Implementation
1. `NpcTrait` definition
2. `NpcBehavior` interface
3. Turn cycle integration (after player action)
4. Basic behaviors: guard, wanderer

### Phase 2: Zork Requirements
1. Thief behavior
2. Combat integration (NPC attacks)
3. Stealing mechanics
4. NPC inventory management

### Phase 3: Polish
1. Sound propagation (hear NPCs in adjacent rooms)
2. Behavior state persistence
3. Performance optimization

## References

- Inform 7 NPC system
- TADS Actor class
- Zork MDL source (actors.mud)
