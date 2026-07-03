# Version 10: Switchable Devices

## What This Version Does

A battered radio in the supply room can be switched on and off. It plays zoo-themed music when on, and powers down when off. It's bolted to the shelf so you can't take it.

## What's New (Compared to V9)

V8 introduced SwitchableTrait alongside LightSourceTrait for the flashlight. V10 shows SwitchableTrait on its own — a device with on/off state that isn't a light source.

## What You'll Learn

### SwitchableTrait Standalone

SwitchableTrait gives any entity a toggleable on/off state:

```typescript
radio.add(new SwitchableTrait({
  isOn: false,   // Starts off
}));
```

The player uses `switch on radio` or `turn on radio` to toggle it. The stdlib handles the switching action automatically.

### SwitchableTrait vs OpenableTrait

These two traits look similar but serve different semantic purposes:

| Trait | Verb | Models | Examples |
|-------|------|--------|---------|
| `SwitchableTrait` | switch on / switch off | Devices, electronics | Radio, flashlight, alarm, fan |
| `OpenableTrait` | open / close | Physical barriers | Door, container, book, lid |

The parser routes `switch on X` to SwitchableTrait and `open X` to OpenableTrait. You'd never "switch on" a door or "open" a radio.

### Trait Combinations with SwitchableTrait

SwitchableTrait combines naturally with other traits:

| Combination | What It Creates |
|------------|----------------|
| SwitchableTrait alone | Simple device (radio, alarm) |
| SwitchableTrait + LightSourceTrait | Flashlight, lamp, lantern |
| SwitchableTrait + SceneryTrait | Fixed device (wall switch, panel) |

### Common Verbs

All of these work for SwitchableTrait:
- `switch on radio`
- `switch off radio`
- `turn on radio`
- `turn off radio`

## Commands to Try

```
> take keycard; south; unlock gate with keycard; open gate; south
> examine radio           See the radio
> switch on radio         Turn it on
> switch off radio        Turn it off
> take radio              Can't — scenery
```

## The Code

See `src/v10.ts` for the complete, commented source.

## Key Takeaway

SwitchableTrait gives entities an on/off toggle. It works standalone for simple devices (radio) or combined with LightSourceTrait for lights (flashlight). The `switch on/off` and `turn on/off` verbs are handled by stdlib automatically.
