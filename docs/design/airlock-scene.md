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

## Docking Sequence: The Interstellar Scenario

A ship attempts to dock with a misaligned port. The player can wait for abort, or try to force the override — which blows the hatch and vents everything into space.

### Docking State (Scheduler Daemon)

```typescript
// scheduler/docking-daemon.ts
export const DOCKING_DAEMON_ID = 'station.daemon.docking';

export interface DockingState {
  phase: 'idle' | 'approach' | 'misaligned' | 'abort' | 'docked' | 'catastrophe';
  turnsInPhase: number;
  alignmentDrift: number; // degrees off-center, increases each turn
}

export function createDockingDaemon(world: WorldModel): ScheduledEvent {
  return {
    id: DOCKING_DAEMON_ID,
    interval: 1, // ticks every turn
    callback(context: DaemonContext): ISemanticEvent[] {
      const state = getDockingState(world);
      state.turnsInPhase++;

      switch (state.phase) {
        case 'approach':
          return handleApproach(state, context);
        case 'misaligned':
          return handleMisaligned(state, context);
        case 'catastrophe':
          return handleCatastrophe(state, context);
        default:
          return [];
      }
    },
  };
}
```

### Approach Phase (Ambient Tension)

The ship approaches over several turns. The player hears it through the hull.

```typescript
function handleApproach(state: DockingState, context: DaemonContext): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];

  if (state.turnsInPhase === 1) {
    events.push(createEvent('station.event.docking_ambient', {
      messageId: DockingMessages.APPROACH_VIBRATION,
    }));
  } else if (state.turnsInPhase === 3) {
    events.push(createEvent('station.event.docking_ambient', {
      messageId: DockingMessages.APPROACH_THRUSTERS,
    }));
  } else if (state.turnsInPhase === 5) {
    // Contact — but misaligned
    state.phase = 'misaligned';
    state.turnsInPhase = 0;
    state.alignmentDrift = 2.3;
    events.push(createEvent('station.event.docking_contact', {
      messageId: DockingMessages.CONTACT_MISALIGNED,
    }));
  }
  return events;
}
```

### Misaligned Phase (Escalating Urgency)

Each turn the alignment worsens. The panel warns. After 4 turns, auto-abort.

```typescript
function handleMisaligned(state: DockingState, context: DaemonContext): ISemanticEvent[] {
  state.alignmentDrift += 0.8;
  const events: ISemanticEvent[] = [];

  if (state.turnsInPhase === 1) {
    events.push(createEvent('station.event.docking_warning', {
      messageId: DockingMessages.SEAL_FAILING,
      params: { drift: state.alignmentDrift.toFixed(1) },
    }));
  } else if (state.turnsInPhase === 2) {
    events.push(createEvent('station.event.docking_warning', {
      messageId: DockingMessages.DRIFT_INCREASING,
      params: { drift: state.alignmentDrift.toFixed(1) },
    }));
  } else if (state.turnsInPhase === 3) {
    events.push(createEvent('station.event.docking_warning', {
      messageId: DockingMessages.ABORT_RECOMMENDED,
    }));
  } else if (state.turnsInPhase >= 4) {
    // Auto-abort — ship pulls away safely
    state.phase = 'abort';
    state.turnsInPhase = 0;
    events.push(createEvent('station.event.docking_abort', {
      messageId: DockingMessages.AUTO_ABORT,
    }));
  }
  return events;
}
```

### Override Action: Force the Dock

The player can try to override the safety lockout and force the docking clamps. This is the Interstellar moment — Dr. Mann overriding an imperfect seal.

```typescript
// actions/override-dock/override-dock-action.ts
export const OVERRIDE_DOCK_ACTION_ID = 'station.action.override_dock';

export const overrideDockAction: Action = {
  id: OVERRIDE_DOCK_ACTION_ID,
  group: 'interaction',

  validate(context: ActionContext): ValidationResult {
    const state = getDockingState(context.world);

    // Can only override during misalignment
    if (state.phase !== 'misaligned') {
      return { valid: false, error: DockingMessages.NOTHING_TO_OVERRIDE };
    }

    // Must be at the docking panel
    if (context.currentLocation.id !== 'airlock-chamber') {
      return { valid: false, error: DockingMessages.NOT_AT_CONTROLS };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const state = getDockingState(context.world);

    // The override "works" — clamps engage on a bad seal
    state.phase = 'catastrophe';
    state.turnsInPhase = 0;

    // Open the outer hatch by force (bypasses normal interlock)
    const hatch = context.world.getEntity('outer-hatch');
    const openable = hatch.get(OpenableTrait);
    if (openable) openable.isOpen = true;

    // Depressurize violently
    const chamber = context.world.getEntity('airlock-chamber');
    (chamber as any).pressurized = false;
  },

  report(context: ActionContext): ISemanticEvent[] {
    return [context.event('station.event.override_catastrophe', {
      messageId: DockingMessages.CATASTROPHE,
    })];
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('station.event.override_blocked', {
      messageId: result.error,
    })];
  },
};
```

### Catastrophe Phase (Aftermath)

The turn after the override, the daemon delivers consequences.

```typescript
function handleCatastrophe(state: DockingState, context: DaemonContext): ISemanticEvent[] {
  if (state.turnsInPhase === 1) {
    // Player is still alive for one turn — blown against the inner door
    return [createEvent('station.event.docking_catastrophe', {
      messageId: DockingMessages.DECOMPRESSION,
    })];
  } else if (state.turnsInPhase === 2) {
    // Check if player grabbed something or is wearing EVA suit
    const player = context.world.getPlayer();
    const hassuit = /* check if EVA suit is worn */;

    if (hassuit) {
      return [createEvent('station.event.docking_survived', {
        messageId: DockingMessages.SURVIVED_IN_SUIT,
      })];
    }

    // Death
    return [createEvent('player.died', {
      messageId: DockingMessages.BLOWN_INTO_SPACE,
      cause: 'explosive_decompression',
    })];
  }
  return [];
}
```

### Docking Messages

```typescript
export const DockingMessages = {
  // Approach
  APPROACH_VIBRATION: 'station.docking.approach_vibration',
  APPROACH_THRUSTERS: 'station.docking.approach_thrusters',
  CONTACT_MISALIGNED: 'station.docking.contact_misaligned',

  // Misalignment warnings
  SEAL_FAILING: 'station.docking.seal_failing',
  DRIFT_INCREASING: 'station.docking.drift_increasing',
  ABORT_RECOMMENDED: 'station.docking.abort_recommended',
  AUTO_ABORT: 'station.docking.auto_abort',

  // Override
  NOTHING_TO_OVERRIDE: 'station.docking.nothing_to_override',
  NOT_AT_CONTROLS: 'station.docking.not_at_controls',
  CATASTROPHE: 'station.docking.catastrophe',

  // Aftermath
  DECOMPRESSION: 'station.docking.decompression',
  SURVIVED_IN_SUIT: 'station.docking.survived_in_suit',
  BLOWN_INTO_SPACE: 'station.docking.blown_into_space',
};
```

```typescript
// lang-en-us registration
{
  'station.docking.approach_vibration':
    'A low vibration hums through the deck plates beneath your feet.',

  'station.docking.approach_thrusters':
    'Through the outer hatch you hear the staccato firing of attitude thrusters. '
    + 'Something is approaching the docking port.',

  'station.docking.contact_misaligned':
    'A heavy CLANG reverberates through the hull. The docking panel flashes amber. '
    + 'ALIGNMENT FAULT — SEAL INTEGRITY 74%. The ship has made contact, but the '
    + 'docking ring is off-center.',

  'station.docking.seal_failing':
    'The panel reads DRIFT {drift} DEGREES. You can hear a thin whistle — '
    + 'atmosphere leaking through the imperfect seal.',

  'station.docking.drift_increasing':
    'DRIFT {drift} DEGREES. The whistling is louder now. '
    + 'The docking ring groans under lateral stress.',

  'station.docking.abort_recommended':
    'The panel flashes red: ABORT RECOMMENDED. SEAL INTEGRITY 31%. '
    + 'AUTOMATIC ABORT IN 30 SECONDS. The entire airlock shudders.',

  'station.docking.auto_abort':
    'The docking clamps release with a bang. Through the hatch you hear '
    + 'thrusters fire as the ship pulls away. The whistling stops. '
    + 'The panel reads DOCK SEQUENCE ABORTED. Silence returns.',

  'station.docking.nothing_to_override':
    'There is nothing to override right now.',

  'station.docking.not_at_controls':
    'You need to be at the airlock controls to override the docking sequence.',

  'station.docking.catastrophe':
    'You punch the override. The clamps re-engage, grinding against the misaligned ring. '
    + 'For a moment the seal holds.\n\n'
    + 'Then it doesn\'t.\n\n'
    + 'The docking ring shears. The outer hatch blows outward with a sound like '
    + 'a cannon shot. Everything not bolted down — tools, papers, the cycling panel\'s '
    + 'safety cover — whips past you toward the breach.',

  'station.docking.decompression':
    'The wind is a wall. You are pinned against the inner door frame, '
    + 'fingers white on the grab rail. The air tears at your clothes, your lungs. '
    + 'Beyond the shattered hatch: tumbling hull fragments, venting gas, and black.',

  'station.docking.survived_in_suit':
    'The suit holds. The wind dies as the last atmosphere vents. '
    + 'You hang in silence, gripping the rail, looking out through the breach '
    + 'at the ship spinning slowly away. Your radio crackles with nothing.',

  'station.docking.blown_into_space':
    'Your grip fails. The decompression throws you through the breach '
    + 'like a leaf in a hurricane. The station rotates slowly away from you. '
    + 'The stars do not move. Nothing moves. You are the only thing out here '
    + 'and you are not going to stop.',
}
```

### Grammar Extension (Docking)

```typescript
// Add to extendParser()
grammar
  .define('override dock|docking|sequence|lockout|safety')
  .mapsTo(OVERRIDE_DOCK_ACTION_ID)
  .withPriority(150)
  .build();

grammar
  .define('force dock|docking|seal|clamps')
  .mapsTo(OVERRIDE_DOCK_ACTION_ID)
  .withPriority(150)
  .build();
```

### Design Notes (Docking)

**Scheduler-driven tension.** The docking sequence runs as a daemon that ticks every turn regardless of what the player does. The player can ignore it (auto-abort is safe), investigate it (examine panel), or make the fatal choice (override). The tension comes from ambient messages interrupting whatever else the player is doing.

**The override is always wrong.** There is no alignment where forcing the dock succeeds. The player is Dr. Mann — convinced they can make it work, wrong about the physics. The EVA suit is the only out, and the player had to have put it on before the crisis. Preparation, not reaction.

**Deferred death with a grace turn.** The catastrophe doesn't kill instantly. Turn 1 is the decompression — the player is pinned, alive, experiencing it. Turn 2 checks for the suit. This gives the prose room to breathe (ironic) and makes the death feel earned rather than arbitrary.

**The safe path is inaction.** If the player does nothing, the auto-abort fires and the ship pulls away. This is the correct IF design — the dangerous choice requires deliberate action, not failure to act.

---

## Design Notes

**Mutual exclusion without coupling.** The two doors never reference each other. Each checks the chamber's pressurization state independently. The inner door requires pressurized = true. The outer hatch requires pressurized = false. This makes them mutually exclusive by construction — no explicit "if other door is open" checks.

**Capability dispatch for door behavior.** The player types "open hatch" and the stdlib opening action runs, but the airlock door behavior's validate phase intercepts it. The player doesn't need to learn a new verb — standard IF commands work, with domain-specific validation layered on top.

**Sound design in prose.** The depressurization message uses the transition from "roar" to "silence" to convey vacuum through text alone. The hatch opening message ends with "Stars." — a one-word sentence that hits harder than a paragraph of description.

**Deferred death.** Vacuum exposure doesn't kill instantly. It sets a flag that a scheduler daemon checks on the next turn, giving the player one turn of "you can't breathe" before death. This follows the Infocom pattern of giving the player a chance to react.
