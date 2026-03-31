# Airlock Scene Design

A three-room scene demonstrating Sharpee patterns for stateful mechanical puzzles: mutual exclusion, safety interlocks, environmental hazard, and wearable equipment.

## Rooms

### Inner Corridor

```typescript
// regions/airlock/rooms/inner-corridor.ts
export function createInnerCorridor(world: WorldModel): IFEntity {
  const room = world.createEntity('inner-corridor', 'room');
  room.add(new IdentityTrait({
    name: 'Inner Corridor',
    description: 'A sterile corridor ending at a heavy airlock door to the east. '
      + 'Warning stripes frame the doorway. A status panel glows beside it.',
  }));
  return room;
}
```

### Airlock Chamber

```typescript
// regions/airlock/rooms/airlock-chamber.ts
export function createAirlockChamber(world: WorldModel): IFEntity {
  const room = world.createEntity('airlock-chamber', 'room');
  room.add(new IdentityTrait({
    name: 'Airlock Chamber',
    description: 'A cramped cylindrical chamber barely large enough for two people. '
      + 'The inner door is to the west, the outer hatch to the east. '
      + 'A cycling panel with a large red button is mounted on the wall.',
  }));
  // Track pressurization state on the room
  (room as any).pressurized = true;
  return room;
}
```

### Outer Space

```typescript
// regions/airlock/rooms/outer-space.ts
export function createOuterSpace(world: WorldModel): IFEntity {
  const room = world.createEntity('outer-space', 'room');
  room.add(new IdentityTrait({
    name: 'Outer Space',
    description: 'You float in the void, tethered to the hull. '
      + 'The station curves away beneath you, its lights tracing the outline '
      + 'of solar panels against absolute black. The airlock hatch is to the west.',
  }));
  return room;
}
```

## Objects

### Inner Door

```typescript
// regions/airlock/objects/index.ts
export function createInnerDoor(world: WorldModel): IFEntity {
  const door = world.createEntity('inner-door', 'object');
  door.add(new IdentityTrait({
    name: 'inner airlock door',
    aliases: ['inner door', 'airlock door'],
    description: 'A reinforced steel door with a rubber gasket seal. '
      + 'A green light means it can be opened.',
  }));
  door.add(new OpenableTrait({ isOpen: false }));
  door.add(new SceneryTrait());
  door.add(new DoorTrait({
    connectsRooms: ['inner-corridor', 'airlock-chamber'],
    direction1: 'east',
    direction2: 'west',
  }));
  // Blocks opening when depressurized
  door.add(new AirlockDoorTrait({ requiresPressurized: true }));
  return door;
}
```

### Outer Hatch

```typescript
export function createOuterHatch(world: WorldModel): IFEntity {
  const hatch = world.createEntity('outer-hatch', 'object');
  hatch.add(new IdentityTrait({
    name: 'outer hatch',
    aliases: ['outer door', 'hatch', 'exterior hatch'],
    description: 'A massive hatch with three locking bolts. '
      + 'A red light means the chamber is still pressurized.',
  }));
  hatch.add(new OpenableTrait({ isOpen: false }));
  hatch.add(new SceneryTrait());
  hatch.add(new DoorTrait({
    connectsRooms: ['airlock-chamber', 'outer-space'],
    direction1: 'east',
    direction2: 'west',
  }));
  // Blocks opening when pressurized (opposite of inner door)
  hatch.add(new AirlockDoorTrait({ requiresPressurized: false }));
  return hatch;
}
```

### Cycling Panel and Button

```typescript
export function createCyclingPanel(world: WorldModel): IFEntity {
  const panel = world.createEntity('cycling-panel', 'object');
  panel.add(new IdentityTrait({
    name: 'cycling panel',
    aliases: ['panel', 'control panel', 'airlock controls'],
    description: 'A wall-mounted panel with a large red button labeled CYCLE. '
      + 'A pressure gauge reads {pressureReading}.',
  }));
  panel.add(new SceneryTrait());
  return panel;
}

export function createCycleButton(world: WorldModel): IFEntity {
  const button = world.createEntity('cycle-button', 'object');
  button.add(new IdentityTrait({
    name: 'red button',
    aliases: ['button', 'cycle button'],
    description: 'A large red button under a safety guard.',
  }));
  button.add(new SceneryTrait());
  return button;
}
```

### EVA Suit

```typescript
export function createEvaSuit(world: WorldModel): IFEntity {
  const suit = world.createEntity('eva-suit', 'object');
  suit.add(new IdentityTrait({
    name: 'EVA suit',
    aliases: ['suit', 'spacesuit', 'space suit'],
    description: 'A bulky extravehicular activity suit with magnetic boots '
      + 'and a four-hour oxygen supply.',
  }));
  suit.add(new WearableTrait());
  return suit;
}
```

### Safety Tether

```typescript
export function createTether(world: WorldModel): IFEntity {
  const tether = world.createEntity('tether', 'object');
  tether.add(new IdentityTrait({
    name: 'safety tether',
    aliases: ['tether', 'cable', 'line'],
    description: 'A retractable steel cable clipped to a rail beside the hatch.',
  }));
  tether.add(new SceneryTrait());
  return tether;
}
```

## Custom Trait: Airlock Door

The airlock door trait intercepts the stdlib `opening` action via capability dispatch. Each door checks the chamber's pressurization state independently — the two doors never reference each other.

```typescript
// traits/airlock-door-trait.ts
export class AirlockDoorTrait implements ITrait {
  static readonly type = 'station.trait.airlock_door';
  static readonly capabilities = ['if.action.opening'] as const;

  requiresPressurized: boolean;

  constructor(config: { requiresPressurized: boolean }) {
    this.requiresPressurized = config.requiresPressurized;
  }
}
```

```typescript
// traits/airlock-door-behaviors.ts
export const AirlockDoorOpenBehavior: CapabilityBehavior = {
  validate(entity, world, actorId, sharedData) {
    const chamber = world.getEntity('airlock-chamber');
    const pressurized = (chamber as any).pressurized;

    if (this.requiresPressurized && !pressurized) {
      return {
        valid: false,
        error: AirlockMessages.VACUUM_SAFETY,
      };
    }
    if (!this.requiresPressurized && pressurized) {
      return {
        valid: false,
        error: AirlockMessages.PRESSURE_SAFETY,
      };
    }
    return { valid: true };
  },

  execute(entity, world, actorId, sharedData) {
    // Standard open — OpenableTrait handles isOpen mutation
  },

  report(entity, world, actorId, sharedData) {
    const isInner = entity.id === 'inner-door';
    return [
      createEffect(isInner
        ? 'station.event.inner_door_opened'
        : 'station.event.outer_hatch_opened', {
        messageId: isInner
          ? AirlockMessages.INNER_OPENS
          : AirlockMessages.HATCH_OPENS,
      }),
    ];
  },

  blocked(entity, world, actorId, error, sharedData) {
    return [
      createEffect('station.event.door_open_blocked', {
        messageId: error,
      }),
    ];
  },
};
```

## Story Action: Cycle Airlock

Triggered by PUSH BUTTON. Toggles pressurization. Both doors must be closed.

```typescript
// actions/cycle-airlock/cycle-airlock-action.ts
export const CYCLE_AIRLOCK_ACTION_ID = 'station.action.cycle_airlock';

export const cycleAirlockAction: Action = {
  id: CYCLE_AIRLOCK_ACTION_ID,
  group: 'interaction',

  validate(context: ActionContext): ValidationResult {
    // Must be in the airlock chamber
    if (context.currentLocation.id !== 'airlock-chamber') {
      return { valid: false, error: AirlockMessages.NOT_IN_AIRLOCK };
    }
    // Both doors must be closed
    const innerDoor = context.world.getEntity('inner-door');
    const outerHatch = context.world.getEntity('outer-hatch');
    const innerOpen = innerDoor.get(OpenableTrait)?.isOpen;
    const outerOpen = outerHatch.get(OpenableTrait)?.isOpen;
    if (innerOpen || outerOpen) {
      return { valid: false, error: AirlockMessages.DOORS_OPEN };
    }
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const chamber = context.world.getEntity('airlock-chamber');
    const wasPressurized = (chamber as any).pressurized;
    (chamber as any).pressurized = !wasPressurized;

    context.sharedData.wasPressurized = wasPressurized;
    context.sharedData.nowPressurized = !wasPressurized;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { nowPressurized } = context.sharedData;
    const messageId = nowPressurized
      ? AirlockMessages.PRESSURIZED
      : AirlockMessages.DEPRESSURIZED;

    return [context.event('station.event.airlock_cycled', {
      messageId,
      params: { state: nowPressurized ? 'pressurized' : 'depressurized' },
    })];
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('station.event.airlock_cycle_blocked', {
      messageId: result.error,
    })];
  },
};
```

## Death Handler: Vacuum Exposure

```typescript
// handlers/vacuum-handler.ts
export function registerVacuumHandler(world: WorldModel): void {
  world.registerEventHandler('if.event.moved', (event, world) => {
    if (event.data.destinationId !== 'outer-space') return;

    const player = world.getEntity(event.data.entityId);
    const hassuit = /* check if EVA suit is worn */;

    if (!hassuit) {
      // Deferred death — give the player one turn of gasping
      (player as any).vacuumExposure = true;
    }
  });
}
```

## Messages

```typescript
// actions/cycle-airlock/airlock-messages.ts
export const AirlockMessages = {
  PRESSURIZED: 'station.airlock.pressurized',
  DEPRESSURIZED: 'station.airlock.depressurized',
  VACUUM_SAFETY: 'station.airlock.vacuum_safety',
  PRESSURE_SAFETY: 'station.airlock.pressure_safety',
  NOT_IN_AIRLOCK: 'station.airlock.not_in_airlock',
  DOORS_OPEN: 'station.airlock.doors_open',
  INNER_OPENS: 'station.airlock.inner_opens',
  HATCH_OPENS: 'station.airlock.hatch_opens',
};
```

```typescript
// lang-en-us registration
{
  'station.airlock.pressurized':
    'You press the button. The chamber hisses as atmosphere floods back in. '
    + 'The pressure gauge climbs to green. The inner door light turns green.',

  'station.airlock.depressurized':
    'You press the button. A klaxon sounds twice. Air rushes out through '
    + 'the floor vents with a diminishing roar that fades to absolute silence. '
    + 'The outer hatch light turns green.',

  'station.airlock.vacuum_safety':
    'The inner door won\'t budge — the chamber is depressurized. '
    + 'The safety interlock prevents opening.',

  'station.airlock.pressure_safety':
    'The outer hatch is locked. The chamber is still pressurized. '
    + 'You\'ll need to cycle the airlock first.',

  'station.airlock.doors_open':
    'The panel buzzes angrily. Both doors must be sealed before cycling.',

  'station.airlock.inner_opens':
    'The inner door slides open with a pneumatic hiss.',

  'station.airlock.hatch_opens':
    'The locking bolts retract with three heavy clunks. '
    + 'The outer hatch swings outward into nothing. Stars.',
}
```

## Grammar Extension

```typescript
extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar();

  // "push button" / "press button" cycles the airlock
  grammar
    .define('push :target')
    .where('target', (scope) => scope.visible().matching({ id: 'cycle-button' }))
    .mapsTo(CYCLE_AIRLOCK_ACTION_ID)
    .withPriority(150)
    .build();
}
```

## Design Notes

**Mutual exclusion without coupling.** The two doors never reference each other. Each checks the chamber's pressurization state independently. The inner door requires pressurized = true. The outer hatch requires pressurized = false. This makes them mutually exclusive by construction — no explicit "if other door is open" checks.

**Capability dispatch for door behavior.** The player types "open hatch" and the stdlib opening action runs, but the airlock door behavior's validate phase intercepts it. The player doesn't need to learn a new verb — standard IF commands work, with domain-specific validation layered on top.

**Sound design in prose.** The depressurization message uses the transition from "roar" to "silence" to convey vacuum through text alone. The hatch opening message ends with "Stars." — a one-word sentence that hits harder than a paragraph of description.

**Deferred death.** Vacuum exposure doesn't kill instantly. It sets a flag that a scheduler daemon checks on the next turn, giving the player one turn of "you can't breathe" before death. This follows the Infocom pattern of giving the player a chance to react.
