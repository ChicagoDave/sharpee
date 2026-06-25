# Light & Dark: What the Player Can See

South of the supply room lies a nocturnal animals exhibit, and it is pitch black.
Walk in without a light and you can't see a thing: no description, no animals,
nothing to interact with but the way back out. The fix is sitting in the supply
room: a flashlight. Switch it on, carry it in, and the darkness lifts to reveal
sugar gliders, bush babies, and a barn owl.

Darkness is one of the oldest mechanics in interactive fiction, and it's really
two ideas working together: rooms that can be dark, and objects that can light
them.

## Dark rooms

Any room becomes dark by setting `isDark: true` on its `RoomTrait`. Here's the one
line that matters on the nocturnal exhibit (we build the whole room at the end of
the chapter):

```typescript
nocturnalExhibit.add(new RoomTrait({
  exits: {},
  isDark: true,     // this room is pitch black
}));
```

Enter a dark room with no light and the player sees a darkness message instead of
the room description. They can't examine, take, or touch anything; the only move
available is to leave. The objects are still there; they're just unreachable until
there's light.

## LightSourceTrait

`LightSourceTrait` marks an entity as something that can illuminate a dark room:

```typescript
flashlight.add(new LightSourceTrait({
  brightness: 8,    // how powerful, 1–10
  isLit: false,     // starts unlit
}));
```

When the player is carrying an entity whose `isLit` is `true`, dark rooms light
up: the description appears normally and every object becomes accessible again.

## SwitchableTrait

`SwitchableTrait` gives an entity an on/off state and the `switch on` / `switch
off` actions:

```typescript
flashlight.add(new SwitchableTrait({
  isOn: false,      // starts off
}));
```

On its own it just tracks on/off. Combined with `LightSourceTrait`, flipping the
switch is what lights the device.

## The flashlight pattern

A flashlight is three traits stacked, the composability lesson from earlier
chapters applied again:

| Trait | What it provides |
|---|---|
| `SwitchableTrait` | On/off toggle via `switch on` / `switch off` |
| `LightSourceTrait` | Illumination for dark rooms |
| `IdentityTrait` | Name, description, aliases |

When the player switches it on:

1. `SwitchableTrait.isOn` becomes `true`.
2. `LightSourceTrait.isLit` becomes `true`; the engine links the two.
3. Any dark room the player carries it into is now lit.

```typescript
const flashlight = world.createEntity('flashlight', EntityType.ITEM);
flashlight.add(new IdentityTrait({
  name: 'flashlight',
  description: 'A heavy rubberized flashlight with a bright halogen bulb.',
  aliases: ['flashlight', 'torch', 'light'],
}));
flashlight.add(new SwitchableTrait({ isOn: false }));
flashlight.add(new LightSourceTrait({ brightness: 8, isLit: false }));
world.moveEntity(flashlight.id, supplyRoom.id);
```

> **The mistake everyone makes once:** expecting `SwitchableTrait` alone to banish
> the dark. A switch with no `LightSourceTrait` just toggles on and off and lights
> nothing, and a `LightSourceTrait` with no switch is *always* lit. A controllable
> light needs both.

## Other light-source patterns

The flashlight is the simplest case. The same trait covers others by changing
which pieces you include:

**Always-on light** (a glowing gem, an enchanted sword): no switch, just lit:

```typescript
gem.add(new LightSourceTrait({ isLit: true, brightness: 5 }));
```

**Consumable light** (a candle or torch that burns down):

```typescript
candle.add(new LightSourceTrait({
  isLit: false,
  brightness: 3,
  fuelRemaining: 50,        // burns for 50 turns
  fuelConsumptionRate: 1,   // one fuel per turn
}));
```

**Adjustable light** (a lantern with a dimmer): set `brightness` high and let
story code change it dynamically:

```typescript
lantern.add(new LightSourceTrait({ brightness: 10 }));
```

## Darkness as a gate

Objects inside a dark room exist the whole time; they're simply inaccessible
until there's light. That makes darkness a natural gating mechanism: put something
worth finding behind it, and the light source becomes the key that opens it. The
flashlight here, a candle elsewhere, a magic spell in another game: same shape,
different flavor.

## Wiring it into the zoo

Two new traits arrive this chapter, so add them to your world-model import:

```typescript
import { LightSourceTrait, SwitchableTrait } from '@sharpee/world-model';
```

The dark exhibit hangs off the Supply Room from Chapter 7. Build the room in full,
connect it south of the supply room (with the way back north), and populate it with
the animals the flashlight will reveal:

```typescript
const nocturnalExhibit = world.createEntity('Nocturnal Animals Exhibit', EntityType.ROOM);
nocturnalExhibit.add(new RoomTrait({ exits: {}, isDark: true }));
nocturnalExhibit.add(new IdentityTrait({
  name: 'Nocturnal Animals Exhibit',
  description:
    'A hushed, cavern-like hall lit by faint blue moonlight panels. Sugar ' +
    'gliders leap between branches, wide-eyed bush babies cling to a rope, ' +
    'and an enormous barn owl perches motionless on a stump.',
  aliases: ['nocturnal exhibit', 'nocturnal animals', 'dark exhibit', 'exhibit'],
  article: 'the',
}));

// Connect it south of the Supply Room, with the way back north. This adds the
// south passage to the Supply Room exits from Chapter 7.
supplyRoom.get(RoomTrait)!.exits = {
  [Direction.NORTH]: { destination: mainPath.id, via: staffGate.id },
  [Direction.SOUTH]: { destination: nocturnalExhibit.id },
};
nocturnalExhibit.get(RoomTrait)!.exits = {
  [Direction.NORTH]: { destination: supplyRoom.id },
};

// The animals: scenery, examinable only once the room is lit.
const sugarGliders = world.createEntity('sugar gliders', EntityType.SCENERY);
sugarGliders.add(new IdentityTrait({
  name: 'sugar gliders',
  description: 'A family of tiny sugar gliders with enormous dark eyes, gliding between branches.',
  aliases: ['sugar gliders', 'gliders', 'sugar glider'],
  article: 'some',
}));
sugarGliders.add(new SceneryTrait());
world.moveEntity(sugarGliders.id, nocturnalExhibit.id);

const bushBabies = world.createEntity('bush babies', EntityType.SCENERY);
bushBabies.add(new IdentityTrait({
  name: 'bush babies',
  description: 'Two bush babies with impossibly large round eyes, clinging to a rope.',
  aliases: ['bush babies', 'bush baby', 'galagos'],
  article: 'some',
}));
bushBabies.add(new SceneryTrait());
world.moveEntity(bushBabies.id, nocturnalExhibit.id);

const barnOwl = world.createEntity('barn owl', EntityType.SCENERY);
barnOwl.add(new IdentityTrait({
  name: 'barn owl',
  description: 'An enormous barn owl with a heart-shaped white face, watching you without blinking.',
  aliases: ['barn owl', 'owl'],
  article: 'a',
}));
barnOwl.add(new SceneryTrait());
world.moveEntity(barnOwl.id, nocturnalExhibit.id);
```

The flashlight from earlier in the chapter sits in the Supply Room, ready to
carry in, so `examine owl` and `examine gliders` in the walkthrough below both
resolve once the light is on.

## Try it

```
> take keycard                Get the key
> south                       Main Path
> unlock gate with keycard    Unlock the staff gate
> open gate                   Open it
> south                       Supply Room
> take flashlight             Grab the flashlight
> south                       Nocturnal Exhibit — dark!
> look                        "It is pitch dark…"
> north                       Retreat to the Supply Room
> switch on flashlight        Let there be light
> south                       Nocturnal Exhibit — now lit!
> examine owl                 Look at the barn owl
> examine gliders             Look at the sugar gliders
> switch off flashlight       Darkness returns
> look                        Dark again
```

## Key takeaway

`isDark: true` on a `RoomTrait` makes a room pitch black, locking out interaction
until light arrives. `LightSourceTrait` lets an entity illuminate the dark, and
`SwitchableTrait` adds the on/off control. A flashlight is just an item carrying
both: switch it on, take it in, and the darkness lifts. Vary which traits you
include for always-on, consumable, or adjustable lights.
