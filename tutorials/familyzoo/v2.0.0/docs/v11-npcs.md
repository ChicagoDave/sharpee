# V11 — Non-Player Characters (NPCs)

## What This Version Teaches

NPCs are characters in your game world that aren't controlled by the player. They can walk around, talk, react to the player, and generally make your world feel alive.

Sharpee's NPC system has three parts:

1. **NpcTrait** — a trait you add to an entity to mark it as an NPC
2. **NpcBehavior** — an object that defines what the NPC does each turn
3. **NpcPlugin** — an engine plugin that gives NPCs their own turn phase

## Key Concepts

### Creating an NPC Entity

An NPC needs three traits: `IdentityTrait` (name and description), `ActorTrait` (marks it as a character), and `NpcTrait` (connects it to a behavior):

```typescript
const zookeeper = world.createEntity('zookeeper', EntityType.ACTOR);

zookeeper.add(new IdentityTrait({
  name: 'zookeeper',
  description: 'A friendly zookeeper in khaki overalls.',
  aliases: ['keeper', 'sam'],
}));

// ActorTrait with isPlayer: false — this is an NPC, not the player
zookeeper.add(new ActorTrait({ isPlayer: false }));

// NpcTrait connects this entity to a registered behavior
zookeeper.add(new NpcTrait({
  behaviorId: 'zoo-keeper-patrol',  // must match behavior's id
  canMove: true,                     // allowed to change rooms
  isAlive: true,
  isConscious: true,
}));

world.moveEntity(zookeeper.id, mainPath.id);
```

### Registering the NPC Plugin

In `onEngineReady()`, register the plugin and behaviors:

```typescript
onEngineReady(engine: GameEngine): void {
  // 1. Create and register the plugin
  const npcPlugin = new NpcPlugin();
  engine.getPluginRegistry().register(npcPlugin);

  // 2. Get the NPC service
  const npcService = npcPlugin.getNpcService();

  // 3. Register behaviors
  npcService.registerBehavior(myBehavior);
}
```

### Built-in Behaviors

Sharpee includes several ready-made behaviors:

| Behavior | What It Does |
|---|---|
| `createPatrolBehavior({ route, loop, waitTurns })` | Walk a fixed route of rooms |
| `createWandererBehavior({ moveChance })` | Move randomly between rooms |
| `createFollowerBehavior({ immediate })` | Follow the player |
| `guardBehavior` | Stand guard, block passage, fight |
| `passiveBehavior` | Do nothing (react-only NPCs) |

### Writing a Custom Behavior

Implement the `NpcBehavior` interface:

```typescript
const parrotBehavior: NpcBehavior = {
  id: 'zoo-parrot',
  name: 'Parrot Behavior',

  onTurn(context: NpcContext): NpcAction[] {
    if (!context.playerVisible) return [];
    if (context.random.chance(0.5)) {
      return [{
        type: 'speak',
        messageId: 'npc.speech',
        data: { npcName: 'parrot', text: 'Polly wants a cracker!' },
      }];
    }
    return [];
  },

  onPlayerEnters(context: NpcContext): NpcAction[] {
    return [{
      type: 'emote',
      messageId: 'npc.emote',
      data: { npcName: 'parrot', text: 'The parrot eyes you with interest.' },
    }];
  },
};
```

### NpcAction Types

| Action | What It Does |
|---|---|
| `{ type: 'move', direction: Direction.NORTH }` | Walk to a connected room |
| `{ type: 'speak', messageId, data }` | Say something (visible text) |
| `{ type: 'emote', messageId, data }` | Do something visible |
| `{ type: 'wait' }` | Do nothing this turn |
| `{ type: 'take', target: entityId }` | Pick up an item |
| `{ type: 'drop', target: entityId }` | Drop an item |

## Commands to Try

```
> examine zookeeper       (see the zookeeper's description)
> wait                    (watch the zookeeper patrol)
> west                    (go to aviary — meet the parrot)
> examine parrot          (see the parrot's description)
> wait                    (the parrot might squawk)
```

## Key Takeaways

- NPCs are entities with `ActorTrait` (isPlayer: false) + `NpcTrait`
- `NpcTrait.behaviorId` must match a registered behavior's `id`
- The `NpcPlugin` must be registered in `onEngineReady()` for NPCs to act
- Use built-in behaviors for common patterns; write custom ones for unique NPCs
- `NpcContext` gives behaviors access to the world, the NPC, and the player
