# Common Helper Patterns for Story Authors

Entity creation in Sharpee is deliberately low-level: `createEntity()`, `entity.add()`, `moveEntity()`. This gives you full control over every trait and property. But for stories with dozens or hundreds of entities, the repetition adds up.

This guide shows helper patterns that story authors have developed to reduce boilerplate. These are **your code** — copy, customize, and extend them to fit your story.

## Room Helper

The most common helper. Every Dungeo region file has a variant of this:

```typescript
function createRoom(
  world: WorldModel,
  name: string,
  description: string,
  isDark = true,
  isOutdoors = false
): IFEntity {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark, isOutdoors }));
  room.add(new IdentityTrait({ name, description, properName: true, article: 'the' }));
  return room;
}

// Usage
const cellar = createRoom(world, 'Cellar', 'A damp stone cellar.');
const garden = createRoom(world, 'Garden', 'A sunny walled garden.', false, true);
```

**Why this works:** Rooms always need `RoomTrait` + `IdentityTrait`, and the name is always duplicated between `createEntity()` and `IdentityTrait`. This eliminates the duplication and gives sensible defaults.

**Exits are set separately** — they depend on other rooms existing first, so they can't be part of the constructor:

```typescript
function setExits(room: IFEntity, exits: Partial<Record<DirectionType, string>>): void {
  const roomTrait = room.get(RoomTrait);
  if (roomTrait) {
    for (const [dir, dest] of Object.entries(exits)) {
      roomTrait.exits[dir as DirectionType] = { destination: dest! };
    }
  }
}
```

## Item Helper

```typescript
function createItem(
  world: WorldModel,
  name: string,
  description: string,
  location: IFEntity | string,
  opts: { aliases?: string[]; article?: string } = {}
): IFEntity {
  const item = world.createEntity(name, EntityType.ITEM);
  item.add(new IdentityTrait({
    name,
    description,
    aliases: opts.aliases ?? [],
    properName: false,
    article: opts.article ?? 'a'
  }));
  world.moveEntity(item.id, typeof location === 'string' ? location : location.id);
  return item;
}

// Usage
const key = createItem(world, 'brass key', 'A small brass key.', cellar, {
  aliases: ['key']
});
```

## Scenery Helper

```typescript
function createScenery(
  world: WorldModel,
  name: string,
  description: string,
  location: IFEntity | string,
  opts: { aliases?: string[]; article?: string } = {}
): IFEntity {
  const entity = world.createEntity(name, EntityType.SCENERY);
  entity.add(new IdentityTrait({
    name,
    description,
    aliases: opts.aliases ?? [],
    properName: false,
    article: opts.article ?? 'a'
  }));
  entity.add(new SceneryTrait());
  world.moveEntity(entity.id, typeof location === 'string' ? location : location.id);
  return entity;
}

// Usage
const fountain = createScenery(world, 'fountain', 'A crumbling stone fountain.', garden, {
  aliases: ['stone fountain'],
  article: 'a'
});
```

## Table-Driven Bulk Creation

When you have many similar entities (especially scenery), a data-driven loop is cleaner than individual calls. The Family Zoo tutorial uses this pattern for 15 scenery objects in one block:

```typescript
const sceneryItems: [string, string, string[], IFEntity][] = [
  ['welcome sign', 'A brightly painted wooden sign.', ['sign'], entrance],
  ['ticket booth', 'A small wooden booth.', ['booth'], entrance],
  ['iron fence', 'A tall wrought-iron fence.', ['fence', 'railing'], entrance],
  ['hay bale', 'A large round bale of golden hay.', ['hay', 'bale'], barn],
];

for (const [name, desc, aliases, room] of sceneryItems) {
  const e = world.createEntity(name, EntityType.SCENERY);
  e.add(new IdentityTrait({
    name,
    description: desc,
    aliases,
    properName: false,
    article: 'a'
  }));
  e.add(new SceneryTrait());
  world.moveEntity(e.id, room.id);
}
```

This scales well. Adding a new scenery object is one line in the array.

If you have a `createScenery` helper, this collapses further:

```typescript
for (const [name, desc, aliases, room] of sceneryItems) {
  createScenery(world, name, desc, room, { aliases });
}
```

## Readable Scenery

Signs, plaques, and books are scenery with `ReadableTrait`:

```typescript
function createReadableScenery(
  world: WorldModel,
  name: string,
  description: string,
  text: string,
  location: IFEntity | string,
  opts: { aliases?: string[]; article?: string } = {}
): IFEntity {
  const entity = createScenery(world, name, description, location, opts);
  entity.add(new ReadableTrait({ text, isReadable: true }));
  return entity;
}

// Usage
const plaque = createReadableScenery(
  world,
  'brass plaque',
  'A weathered brass plaque.',
  'HERE LIE THE ASHES OF THE GREAT IMPLEMENTORS.',
  temple,
  { aliases: ['plaque'] }
);
```

## Composing Helpers

Helpers are just functions — compose them for more complex entities. A locked door needs several traits, but the pattern is always the same:

```typescript
function createLockedDoor(
  world: WorldModel,
  name: string,
  description: string,
  room1: IFEntity | string,
  room2: IFEntity | string,
  keyEntity: IFEntity,
  opts: { aliases?: string[]; article?: string } = {}
): IFEntity {
  const r1 = typeof room1 === 'string' ? room1 : room1.id;
  const r2 = typeof room2 === 'string' ? room2 : room2.id;
  const door = world.createEntity(name, EntityType.DOOR);
  door.add(new IdentityTrait({
    name,
    description,
    aliases: opts.aliases ?? [],
    properName: false,
    article: opts.article ?? 'a'
  }));
  door.add(new DoorTrait({ room1: r1, room2: r2, bidirectional: true }));
  door.add(new OpenableTrait({ isOpen: false }));
  door.add(new LockableTrait({ isLocked: true, keyId: keyEntity.id }));
  door.add(new SceneryTrait());
  world.moveEntity(door.id, r1);
  return door;
}
```

## Where to Put Helpers

**Small stories:** A `helpers.ts` file in your story's `src/` directory is enough.

**Large stories (like Dungeo):** A shared `src/helpers/` directory, with helpers imported by each region file. This avoids the 14-copies-of-createRoom problem.

**Across stories:** If you find yourself copying helpers between stories, consider a shared utility file. But don't over-abstract — story helpers are meant to be simple and disposable. If a helper needs more than 20 lines, it probably belongs as a trait or action instead.

## When Not to Use Helpers

Helpers work best for the common 80% — rooms, scenery, simple items. For entities with complex setup (NPCs with behaviors, containers with initial contents, puzzle objects with custom traits), write the creation code explicitly. The extra lines make the setup visible and debuggable.

```typescript
// This is fine as explicit code — a helper would hide important details
const thief = world.createEntity('thief', EntityType.ACTOR);
thief.add(new IdentityTrait({ name: 'thief', description: '...', aliases: ['man'], properName: false, article: 'a' }));
thief.add(new ActorTrait({ isPlayer: false }));
thief.add(new NpcTrait({ behaviorId: 'thief-behavior', isHostile: true, canMove: true }));
thief.add(new CombatantTrait({ ... }));
thief.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
world.moveEntity(thief.id, treasureRoom.id);
```
