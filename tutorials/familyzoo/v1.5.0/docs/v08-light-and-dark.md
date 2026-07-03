# Version 8: Light & Dark

## What This Version Does

A nocturnal animals exhibit lies south of the supply room. It's pitch black inside — you can't see a thing. A flashlight in the supply room solves the problem: switch it on, carry it in, and the exhibit comes alive with sugar gliders, bush babies, and a barn owl.

## What's New (Compared to V7)

V7 introduced locked doors. V8 introduces darkness and light sources — a fundamental IF mechanic where certain areas are inaccessible without illumination.

## What You'll Learn

### Dark Rooms

Any room can be made dark by setting `isDark: true` on its `RoomTrait`:

```typescript
nocturnalExhibit.add(new RoomTrait({
  exits: {},
  isDark: true,     // This room is dark!
}));
```

When the player enters a dark room without a light source, they see a darkness message instead of the room description. They can't examine things, take things, or interact with anything — all they can do is leave.

### LightSourceTrait

LightSourceTrait marks an entity as something that can illuminate dark rooms:

```typescript
flashlight.add(new LightSourceTrait({
  brightness: 8,       // How powerful (1-10)
  isLit: false,        // Starts unlit
}));
```

When the player carries an entity with `LightSourceTrait` where `isLit` is true, dark rooms become illuminated. The room description appears normally, and all objects in the room become accessible.

### SwitchableTrait

SwitchableTrait gives an entity an on/off state:

```typescript
flashlight.add(new SwitchableTrait({
  isOn: false,         // Starts off
}));
```

The player uses `switch on flashlight` and `switch off flashlight` to toggle it. When combined with LightSourceTrait, switching on the device lights it up.

### The Flashlight Pattern

A flashlight combines three traits:

| Trait | What It Provides |
|-------|-----------------|
| `SwitchableTrait` | On/off toggle via "switch on/off" |
| `LightSourceTrait` | Illumination for dark rooms |
| `IdentityTrait` | Name, description, aliases |

When the player switches on the flashlight:
1. `SwitchableTrait.isOn` → `true`
2. `LightSourceTrait.isLit` → `true` (linked to switch state)
3. Any dark room the player enters is now illuminated

### Other Light Source Patterns

The flashlight is the simplest pattern, but Sharpee supports others:

**Always-on light** (glowing gem, enchanted sword):
```typescript
gem.add(new LightSourceTrait({ isLit: true, brightness: 5 }));
// No SwitchableTrait — it's always lit
```

**Consumable light** (candle, torch):
```typescript
candle.add(new LightSourceTrait({
  isLit: false,
  brightness: 3,
  fuelRemaining: 50,        // Burns for 50 turns
  fuelConsumptionRate: 1,    // Uses 1 fuel per turn
}));
```

**Adjustable light** (lantern with dimmer):
```typescript
lantern.add(new LightSourceTrait({
  brightness: 10,    // Full brightness
}));
// Story code can adjust brightness dynamically
```

### Dark Room Design

Objects inside dark rooms exist even when the player can't see them. They're just inaccessible without light. Once the player brings a light source, everything works normally — examine, take, interact.

This makes light sources a natural gating mechanism: you put valuable content behind darkness, and the flashlight (or candle, or magic spell) is the key.

## Commands to Try

```
> take keycard                        Get the key
> south                               Main Path
> unlock gate with keycard            Unlock staff gate
> open gate                           Open it
> south                               Supply Room
> take flashlight                     Get the flashlight
> south                               Nocturnal Exhibit — dark!
> look                                "It is pitch dark"
> north                               Retreat to Supply Room
> switch on flashlight                Let there be light
> south                               Nocturnal Exhibit — now lit!
> look                                See the animals
> examine owl                         Look at the barn owl
> examine gliders                     Look at the sugar gliders
> switch off flashlight               Darkness returns
> look                                Dark again
> switch on flashlight                Light it back up
> north                               Back to Supply Room
```

## The Code

See `src/v08.ts` for the complete, commented source.

## Key Takeaway

`isDark: true` on a room makes it pitch black. `LightSourceTrait` lets entities illuminate dark rooms. `SwitchableTrait` adds on/off toggle. A flashlight is just an item with both traits — switch it on, carry it in, and the darkness lifts.
