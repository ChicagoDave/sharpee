# Family Zoo: A Progressive Sharpee Tutorial

Welcome to the **Willowbrook Family Zoo** tutorial! This tutorial teaches Sharpee interactive fiction authoring through 16 progressively richer versions of a small family zoo. Each version introduces exactly one new concept, building on everything that came before.

## How to Use This Tutorial

Each version is a **single, self-contained `.ts` file** in `tutorials/familyzoo/src/`. You can read them top-to-bottom — every construct is explained with beginner-friendly comments.

**To build and play any version:**
```bash
./build.sh -s familyzoo
node dist/cli/sharpee.js --story tutorials/familyzoo --play
```

**To run transcript tests:**
```bash
node dist/cli/sharpee.js --story tutorials/familyzoo --test tutorials/familyzoo/tests/transcripts/v01-single-room.transcript
```

**To run all tests:**
```bash
node dist/cli/sharpee.js --story tutorials/familyzoo --test tutorials/familyzoo/tests/transcripts/v*.transcript
```

The default build target is V16 (the complete version). Individual versions are tested via their own transcript files.

---

## V1: A Single Room

**File:** `src/v01.ts` | **Concept:** The minimum viable story

Every Sharpee story needs three things: a `StoryConfig`, a player entity, and at least one room.

```typescript
const config: StoryConfig = {
  id: 'familyzoo', title: 'Family Zoo', author: 'Sharpee Tutorial',
  version: '0.1.0', description: 'A small family zoo.',
};

class FamilyZooStory implements Story {
  config = config;

  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new IdentityTrait({ name: 'yourself', ... }));
    player.add(new ActorTrait({ isPlayer: true }));
    return player;
  }

  initializeWorld(world: WorldModel): void {
    const room = world.createEntity('Zoo Entrance', EntityType.ROOM);
    room.add(new RoomTrait({ exits: {}, isDark: false }));
    room.add(new IdentityTrait({ name: 'Zoo Entrance', description: '...', ... }));
    // Place player
    const player = world.getPlayer();
    if (player) world.moveEntity(player.id, room.id);
  }
}
```

**Try:** `look`, `examine sign`

**Common mistake:** Forgetting to place the player in a room — the game starts in limbo.

---

## V2: Multiple Rooms and Navigation

**File:** `src/v02.ts` | **Concept:** Room exits and the `going` action

Connect rooms with `Direction` exits. The engine's built-in `going` action handles movement.

```typescript
import { Direction } from '@sharpee/world-model';

entrance.get(RoomTrait)!.exits = {
  [Direction.SOUTH]: { destination: mainPath.id }
};
mainPath.get(RoomTrait)!.exits = {
  [Direction.NORTH]: { destination: entrance.id },
  [Direction.EAST]: { destination: pettingZoo.id },
};
```

**Try:** `south`, `east`, `west`, `north`

**Common mistake:** One-way exits — if you add south from A to B, also add north from B to A.

---

## V3: Scenery

**File:** `src/v03.ts` | **Concept:** Non-portable entities with `SceneryTrait`

Scenery entities can be examined but not picked up. Use them for environmental detail.

```typescript
const fence = world.createEntity('iron fence', EntityType.SCENERY);
fence.add(new IdentityTrait({ name: 'iron fence', description: '...', aliases: ['fence'] }));
fence.add(new SceneryTrait());
world.moveEntity(fence.id, room.id);
```

**Try:** `examine fence`, `take fence` (blocked)

**Common mistake:** Forgetting `SceneryTrait` — without it, items are portable by default.

---

## V4: Portable Objects

**File:** `src/v04.ts` | **Concept:** Items the player can take, carry, and drop

Any entity without `SceneryTrait` is portable. The engine provides `taking`, `dropping`, and `inventory` actions.

```typescript
const map = world.createEntity('zoo map', EntityType.ITEM);
map.add(new IdentityTrait({ name: 'zoo map', aliases: ['map', 'zoo map'] }));
world.moveEntity(map.id, room.id);
```

**Try:** `take map`, `inventory`, `drop map`

**Common mistake:** Entity aliases — add common synonyms so players can refer to objects naturally.

---

## V5: Containers and Supporters

**File:** `src/v05.ts` | **Concept:** `ContainerTrait` and `SupporterTrait`

Containers hold items inside them. Supporters hold items on top of them.

```typescript
const backpack = world.createEntity('backpack', EntityType.CONTAINER);
backpack.add(new ContainerTrait({ capacity: { maxItems: 5 } }));

const bench = world.createEntity('park bench', EntityType.SUPPORTER);
bench.add(new SupporterTrait({ capacity: { maxItems: 3 } }));
bench.add(new SceneryTrait()); // Can't be picked up
```

**Try:** `put map in backpack`, `look in backpack`, `put penny on bench`

**Common mistake:** Capacity limits — containers/supporters without `capacity` have no limit.

---

## V6: Openable Things

**File:** `src/v06.ts` | **Concept:** `OpenableTrait` for doors, boxes, and containers

Openable entities can be opened and closed. Closed containers hide their contents.

```typescript
lunchbox.add(new OpenableTrait({ isOpen: false }));
lunchbox.add(new ContainerTrait({ capacity: { maxItems: 3 } }));
```

**Try:** `open lunchbox`, `look in lunchbox`, `close lunchbox`

**Common mistake:** Placing items in closed containers during `initializeWorld()` — the engine enforces game rules. Temporarily open the container, place items, then close it.

---

## V7: Locked Doors and Keys

**File:** `src/v07.ts` | **Concept:** `LockableTrait` and `DoorTrait` with key entities

Locked doors block movement until unlocked with the right key.

```typescript
const gate = world.createEntity('staff gate', EntityType.DOOR);
gate.add(new DoorTrait({ room1: mainPath.id, room2: supplyRoom.id, bidirectional: true }));
gate.add(new OpenableTrait({ isOpen: false }));
gate.add(new LockableTrait({ isLocked: true, keyId: keycard.id }));
gate.add(new SceneryTrait());

// Connect rooms through the door
mainPath.get(RoomTrait)!.exits = {
  [Direction.SOUTH]: { destination: supplyRoom.id, via: gate.id }
};
```

**Try:** `unlock gate with keycard`, `open gate`, `south`

**Common mistake:** Forgetting `via: gate.id` in the exit — without it, the door isn't checked.

---

## V8: Light and Dark

**File:** `src/v08.ts` | **Concept:** Dark rooms and `LightSourceTrait`

Rooms with `isDark: true` are pitch black. The player needs a light source to see.

```typescript
nocturnalExhibit.add(new RoomTrait({ exits: {}, isDark: true }));

const flashlight = world.createEntity('flashlight', EntityType.ITEM);
flashlight.add(new SwitchableTrait({ isOn: false }));
flashlight.add(new LightSourceTrait({ brightness: 8, isLit: false }));
```

**Try:** Go to dark room (can't see), get flashlight, `switch on flashlight`, re-enter (lit)

**Common mistake:** A light source needs both `SwitchableTrait` and `LightSourceTrait`. The engine links them automatically when switched on.

---

## V9: Readable Objects

**File:** `src/v09.ts` | **Concept:** `ReadableTrait` for signs, books, and plaques

Readable entities respond to the `read` command with their text content.

```typescript
const brochure = world.createEntity('zoo brochure', EntityType.ITEM);
brochure.add(new ReadableTrait({ text: 'WILLOWBROOK FAMILY ZOO — Your Guide\n...' }));
```

**Try:** `read brochure`, `read plaque`

**Common mistake:** Long text without newlines — use `\n` for line breaks in readable text.

---

## V10: Switchable Devices

**File:** `src/v10.ts` | **Concept:** `SwitchableTrait` for devices and machines

Switchable entities respond to `switch on` and `switch off`.

```typescript
const radio = world.createEntity('radio', EntityType.ITEM);
radio.add(new SwitchableTrait({ isOn: false }));
```

**Try:** `switch on radio`, `switch off radio`

**Common mistake:** Not all switchable entities are light sources. `SwitchableTrait` alone just tracks on/off state.

---

## V11: Non-Player Characters (NPCs)

**File:** `src/v11.ts` | **Concept:** `NpcPlugin`, `NpcTrait`, and `NpcBehavior`

NPCs are actors with behaviors that run each turn. Behaviors define what the NPC does.

```typescript
import { NpcPlugin } from '@sharpee/plugin-npc';
import { createPatrolBehavior, NpcBehavior } from '@sharpee/stdlib';

// Create NPC entity
const zookeeper = world.createEntity('zookeeper', EntityType.ACTOR);
zookeeper.add(new NpcTrait({
  behaviorId: 'zoo-keeper-patrol',
  canMove: true, isAlive: true, isConscious: true
}));

// In onEngineReady():
const npcPlugin = new NpcPlugin();
engine.getPluginRegistry().register(npcPlugin);
const npcService = npcPlugin.getNpcService();

// Built-in patrol behavior
const patrol = createPatrolBehavior({
  route: [room1.id, room2.id, room3.id],
  loop: true, waitTurns: 1
});
patrol.id = 'zoo-keeper-patrol';
npcService.registerBehavior(patrol);
```

**Try:** `examine zookeeper`, `wait` (watch them move)

**Common mistake:** The `behaviorId` on `NpcTrait` must match the `id` on the registered behavior.

---

## V12: Event Handlers

**File:** `src/v12.ts` | **Concept:** `world.chainEvent()` for reacting to game events

Event handlers react to actions after they succeed. Use them for puzzle logic.

```typescript
world.chainEvent('if.event.dropped', (event, w) => {
  const data = event.data as Record<string, any>;
  if (data.itemId !== feedId) return null;  // Not our item
  w.setStateValue('goats-fed', true);
  return {
    id: `goats-${Date.now()}`,
    type: 'zoo.event.goats_react',
    timestamp: Date.now(), entities: {},
    data: { text: 'The goats rush to eat!' }
  };
}, { key: 'zoo.chain.goats-eat-feed' });
```

**Try:** Go to petting zoo, `drop feed` (goats react)

**Common mistake:** Using `game.message` as the event type in chain handlers — it gets consumed as an override. Use custom event types like `zoo.event.goats_react`.

---

## V13: Custom Story Actions

**File:** `src/v13.ts` | **Concept:** Creating new verbs with the `Action` interface

When stdlib doesn't have the verb you need, create a story-specific action.

```typescript
const feedAction: Action = {
  id: 'zoo.action.feeding', group: 'interaction',
  validate(context: ActionContext): ValidationResult { /* check preconditions */ },
  execute(context: ActionContext): void { /* mutate world state */ },
  report(context: ActionContext): ISemanticEvent[] { /* emit events */ },
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] { /* error */ },
};

// Register in getCustomActions()
getCustomActions(): any[] { return [feedAction]; }

// Add grammar in extendParser()
grammar.define('feed :thing').mapsTo('zoo.action.feeding').withPriority(150).build();

// Add messages in extendLanguage()
language.addMessage('zoo.feeding.fed_goats', 'The goats eat the feed.');
```

**Try:** `feed goats`, `photograph toucan`

**Common mistake:** Forgetting one of the three registration steps — action, grammar, AND language messages must all be set up.

---

## V14: Capability Dispatch

**File:** `src/v14.ts` | **Concept:** Same verb, different behavior per entity

When a verb means different things for different entities, use capability dispatch: a trait declares which verbs it responds to, and a behavior defines what happens.

```typescript
class PettableTrait implements ITrait {
  static readonly type = 'zoo.trait.pettable' as const;
  static readonly capabilities = ['zoo.action.petting'] as const;
  readonly type = PettableTrait.type;
  readonly animalKind: 'goats' | 'rabbits' | 'parrot';
  constructor(kind: string) { this.animalKind = kind; }
}

const pettingBehavior: CapabilityBehavior = {
  validate(entity, world, actorId, sharedData) { return { valid: true }; },
  execute(entity, world, actorId, sharedData) { /* mutations */ },
  report(entity, world, actorId, sharedData) { /* effects */ },
  blocked(entity, world, actorId, error, sharedData) { /* error effects */ },
};

registerCapabilityBehavior(PettableTrait.type, 'zoo.action.petting', pettingBehavior);
```

**Try:** `pet goats` (affectionate), `pet rabbits` (fuzzy), `pet parrot` (bites!)

**Common mistake:** The capability registry allows ONE behavior per trait type + capability. Use the trait's custom data (like `animalKind`) to dispatch internally.

---

## V15: Timed Events (Daemons and Fuses)

**File:** `src/v15.ts` | **Concept:** `SchedulerPlugin` for timed events

Daemons run every turn. Fuses count down and trigger after N turns.

```typescript
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';

// In onEngineReady():
const schedulerPlugin = new SchedulerPlugin();
engine.getPluginRegistry().register(schedulerPlugin);
const scheduler = schedulerPlugin.getScheduler();

// Daemon — runs when condition is true
scheduler.registerDaemon({
  id: 'zoo.daemon.pa', name: 'PA Announcements',
  condition: (ctx) => ctx.turn % 5 === 0 && ctx.turn > 0,
  run: (ctx) => [/* announcement events */],
});

// Fuse — fires after 10 turns, repeats every 8
scheduler.setFuse({
  id: 'zoo.fuse.feeding', name: 'Feeding Time',
  turns: 10, repeat: true, originalTurns: 8,
  trigger: (ctx) => [/* feeding time events */],
});
```

**Try:** `wait` (repeat 5 times — PA announcement), continue waiting for feeding time

**Common mistake:** Fuses skip their first tick after being set. A fuse with `turns: 10` fires ~11 ticks after registration.

---

## V16: Scoring and Endgame

**File:** `src/v16.ts` | **Concept:** `world.awardScore()` and victory conditions

The score ledger tracks achievements with idempotent awards. A victory daemon watches for the win condition.

```typescript
// Set max score
world.setMaxScore(75);

// Award points (unique ID prevents double-scoring)
world.awardScore('zoo.visit.aviary', 5, 'Visited the Aviary');

// Check score
const score = world.getScore();

// Victory daemon
scheduler.registerDaemon({
  id: 'zoo.daemon.victory', name: 'Victory Check',
  priority: 100,
  condition: (ctx) => ctx.world.getScore() >= 75,
  run: (ctx) => {
    ctx.world.setStateValue('game.victory', true);
    return [/* victory message events */];
  },
});
```

**Try:** Visit all exhibits, feed animals, collect items, check `score`, reach 75/75!

**Common mistake:** Non-unique score IDs cause silent double-scoring prevention. Use descriptive, unique IDs for every achievement.

---

## Appendix: Sharpee Authoring Cheat Sheet

| # | Concept | Key Import / API | One-Line Summary |
|---|---------|-----------------|-----------------|
| V1 | Single Room | `Story`, `WorldModel`, `RoomTrait` | Every story needs a config, player, and room |
| V2 | Navigation | `Direction`, `RoomTrait.exits` | Connect rooms with directional exits |
| V3 | Scenery | `SceneryTrait` | Non-portable entities for environmental detail |
| V4 | Portables | `EntityType.ITEM` | Items without SceneryTrait are pickable |
| V5 | Containers | `ContainerTrait`, `SupporterTrait` | Hold items inside or on top |
| V6 | Openable | `OpenableTrait` | Open/close for doors, boxes, containers |
| V7 | Locked | `LockableTrait`, `DoorTrait` | Lock doors with keys, connect rooms via doors |
| V8 | Light/Dark | `LightSourceTrait`, `isDark: true` | Dark rooms need light sources to see |
| V9 | Readable | `ReadableTrait` | Text content for signs, books, plaques |
| V10 | Switchable | `SwitchableTrait` | On/off devices |
| V11 | NPCs | `NpcPlugin`, `NpcTrait`, `NpcBehavior` | Autonomous characters with behaviors |
| V12 | Events | `world.chainEvent()` | React to game events for puzzle logic |
| V13 | Actions | `Action`, `extendParser()` | New verbs with grammar and messages |
| V14 | Capabilities | `registerCapabilityBehavior()` | Same verb, different behavior per entity |
| V15 | Timed Events | `SchedulerPlugin`, `Daemon`, `Fuse` | Background processes and countdown timers |
| V16 | Scoring | `world.awardScore()`, `setMaxScore()` | Idempotent achievements and win conditions |
