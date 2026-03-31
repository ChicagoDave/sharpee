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

## Docking Catastrophe: The Interstellar Scenario

The player is aboard their ship. Another ship — with broken docking locks — attempts to connect. The incoming ship forces a partial connection, then opens their own airlock, breaking the seal. The incoming ship blows away, its airlock open to space, killing the occupant. The player witnesses this from their side.

The player is not in danger. They watch someone else make the fatal mistake.

### Docking State (Scheduler Daemon)

```typescript
// scheduler/docking-daemon.ts
export const DOCKING_DAEMON_ID = 'station.daemon.docking';

export interface DockingState {
  phase: 'idle' | 'approach' | 'contact' | 'partial_seal' | 'catastrophe' | 'aftermath';
  turnsInPhase: number;
  incomingShipName: string;
  occupantName: string;
}

export function createDockingDaemon(world: WorldModel): ScheduledEvent {
  return {
    id: DOCKING_DAEMON_ID,
    interval: 1,
    callback(context: DaemonContext): ISemanticEvent[] {
      const state = getDockingState(world);
      state.turnsInPhase++;

      switch (state.phase) {
        case 'approach':
          return handleApproach(state, context);
        case 'contact':
          return handleContact(state, context);
        case 'partial_seal':
          return handlePartialSeal(state, context);
        case 'catastrophe':
          return handleCatastrophe(state, context);
        case 'aftermath':
          return handleAftermath(state, context);
        default:
          return [];
      }
    },
  };
}
```

### Approach Phase

The player hears the incoming ship through the hull. Radio contact establishes the situation.

```typescript
function handleApproach(state: DockingState, context: DaemonContext): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];

  if (state.turnsInPhase === 1) {
    events.push(createEvent('station.event.docking_ambient', {
      messageId: DockingMessages.RADIO_CONTACT,
      params: { ship: state.incomingShipName, occupant: state.occupantName },
    }));
  } else if (state.turnsInPhase === 3) {
    events.push(createEvent('station.event.docking_ambient', {
      messageId: DockingMessages.APPROACH_THRUSTERS,
    }));
  } else if (state.turnsInPhase === 4) {
    events.push(createEvent('station.event.docking_ambient', {
      messageId: DockingMessages.LOCKS_BROKEN_WARNING,
      params: { occupant: state.occupantName },
    }));
  } else if (state.turnsInPhase === 5) {
    state.phase = 'contact';
    state.turnsInPhase = 0;
    events.push(createEvent('station.event.docking_contact', {
      messageId: DockingMessages.HARD_CONTACT,
    }));
  }
  return events;
}
```

### Contact Phase

The ships touch. The player's panel shows the incoming ship's locks aren't engaging.

```typescript
function handleContact(state: DockingState, context: DaemonContext): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];

  if (state.turnsInPhase === 1) {
    events.push(createEvent('station.event.docking_warning', {
      messageId: DockingMessages.LOCKS_NOT_ENGAGING,
    }));
  } else if (state.turnsInPhase === 2) {
    // The other pilot forces it
    state.phase = 'partial_seal';
    state.turnsInPhase = 0;
    events.push(createEvent('station.event.docking_warning', {
      messageId: DockingMessages.FORCING_CONNECTION,
      params: { occupant: state.occupantName },
    }));
  }
  return events;
}
```

### Partial Seal Phase

The connection is half-made. The player's panel shows warnings. The other pilot radios that they're going to open their side.

```typescript
function handlePartialSeal(state: DockingState, context: DaemonContext): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];

  if (state.turnsInPhase === 1) {
    events.push(createEvent('station.event.docking_warning', {
      messageId: DockingMessages.PARTIAL_SEAL,
    }));
  } else if (state.turnsInPhase === 2) {
    events.push(createEvent('station.event.docking_radio', {
      messageId: DockingMessages.GOING_TO_OPEN,
      params: { occupant: state.occupantName },
    }));
  } else if (state.turnsInPhase === 3) {
    // The player can try to warn them (SAY action) — but it won't matter
    // The other pilot opens their airlock
    state.phase = 'catastrophe';
    state.turnsInPhase = 0;
    events.push(createEvent('station.event.docking_catastrophe', {
      messageId: DockingMessages.THEY_OPEN_THEIR_SIDE,
    }));
  }
  return events;
}
```

### Catastrophe Phase

The partial seal breaks. The incoming ship's open airlock vents to space. The ship blows away from the player's hull.

```typescript
function handleCatastrophe(state: DockingState, context: DaemonContext): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];

  if (state.turnsInPhase === 1) {
    events.push(createEvent('station.event.docking_catastrophe', {
      messageId: DockingMessages.SEAL_BREAKS,
      params: { ship: state.incomingShipName },
    }));
  } else if (state.turnsInPhase === 2) {
    state.phase = 'aftermath';
    state.turnsInPhase = 0;
    events.push(createEvent('station.event.docking_catastrophe', {
      messageId: DockingMessages.SHIP_GONE,
      params: { ship: state.incomingShipName, occupant: state.occupantName },
    }));
  }
  return events;
}
```

### Aftermath Phase

Silence. The player's airlock is intact. The outer hatch shows vacuum.

```typescript
function handleAftermath(state: DockingState, context: DaemonContext): ISemanticEvent[] {
  if (state.turnsInPhase === 1) {
    // One final message, then the daemon goes idle
    state.phase = 'idle';
    return [createEvent('station.event.docking_aftermath', {
      messageId: DockingMessages.RADIO_SILENCE,
      params: { occupant: state.occupantName },
    })];
  }
  return [];
}
```

### The Player's Choice: Warn or Watch

The player can try to intervene by talking over the radio. It doesn't change the outcome — the other pilot is committed — but it changes the player's relationship to what happens.

```typescript
// Event handler: react to SAY during partial_seal phase
world.registerEventHandler('if.event.said', (event, world) => {
  const state = getDockingState(world);
  if (state.phase !== 'partial_seal') return;

  // The player tried to warn them
  (state as any).playerWarned = true;

  return [createEvent('station.event.docking_radio', {
    messageId: DockingMessages.THEY_IGNORE_WARNING,
    params: { occupant: state.occupantName },
  })];
});
```

### Docking Messages

```typescript
export const DockingMessages = {
  // Approach
  RADIO_CONTACT: 'station.docking.radio_contact',
  APPROACH_THRUSTERS: 'station.docking.approach_thrusters',
  LOCKS_BROKEN_WARNING: 'station.docking.locks_broken_warning',
  HARD_CONTACT: 'station.docking.hard_contact',

  // Contact
  LOCKS_NOT_ENGAGING: 'station.docking.locks_not_engaging',
  FORCING_CONNECTION: 'station.docking.forcing_connection',

  // Partial seal
  PARTIAL_SEAL: 'station.docking.partial_seal',
  GOING_TO_OPEN: 'station.docking.going_to_open',
  THEY_OPEN_THEIR_SIDE: 'station.docking.they_open_their_side',

  // Catastrophe
  SEAL_BREAKS: 'station.docking.seal_breaks',
  SHIP_GONE: 'station.docking.ship_gone',

  // Aftermath
  RADIO_SILENCE: 'station.docking.radio_silence',

  // Player intervention
  THEY_IGNORE_WARNING: 'station.docking.they_ignore_warning',
};
```

```typescript
// lang-en-us registration
{
  'station.docking.radio_contact':
    'The radio crackles. "{occupant} to docking control. Requesting emergency '
    + 'dock. My port-side locks are damaged. Repeat — locks are non-functional. '
    + 'Requesting manual approach."',

  'station.docking.approach_thrusters':
    'Through the outer hatch you hear the staccato firing of attitude thrusters, '
    + 'close now. The docking panel lights up.',

  'station.docking.locks_broken_warning':
    '"{occupant} on approach. I know the locks are gone. I can hold position '
    + 'with thrusters while I cycle through. Done it before."',

  'station.docking.hard_contact':
    'A heavy CLANG shakes the airlock. The docking ring has made contact. '
    + 'Your panel reads CONTACT — EXTERNAL LOCKS: NO SIGNAL.',

  'station.docking.locks_not_engaging':
    'The panel flashes: LOCK ENGAGEMENT FAILED. SEAL INCOMPLETE. '
    + 'The docking ring is seated but nothing is holding it there '
    + 'except the other ship\'s thrusters.',

  'station.docking.forcing_connection':
    'You hear {occupant}\'s thrusters fire in short bursts, pressing the ship '
    + 'harder against the ring. The panel reads SEAL INTEGRITY 41% — '
    + 'DOCK NOT SECURE. The ring groans.',

  'station.docking.partial_seal':
    'The panel holds at 41%. A thin whistle — atmosphere seeping through the '
    + 'imperfect seal. Not a complete breach, but not airtight either.',

  'station.docking.going_to_open':
    '"{occupant} to control. Seal\'s good enough. I\'m cycling my airlock now."',

  'station.docking.they_open_their_side':
    'Through the hatch you hear the muffled clunk of the other ship\'s airlock '
    + 'cycling. Then a different sound — a pressurized hiss that rises in pitch.',

  'station.docking.seal_breaks':
    'The partial seal fails instantly. The pressure differential rips {ship} '
    + 'away from your docking ring with a sound like tearing metal. Through '
    + 'the viewport beside the hatch you see the ship tumbling backward, '
    + 'its airlock door open, atmosphere venting from the breach in a white '
    + 'plume that freezes and scatters into crystals.',

  'station.docking.ship_gone':
    '{ship} spins away, trailing frozen vapor. The open airlock is a dark '
    + 'rectangle against the hull. {occupant} does not appear in the doorway. '
    + '{occupant} does not appear anywhere.\n\n'
    + 'Your own airlock is intact. Your outer hatch held. '
    + 'You are fine.',

  'station.docking.radio_silence':
    'The radio is silent. Your panel reads DOCK SEQUENCE TERMINATED — '
    + 'EXTERNAL CONTACT LOST.',

  'station.docking.they_ignore_warning':
    '"{occupant} here. Copy your concern. Seal reads 41% my side too but '
    + 'I\'ve worked worse. Opening now."\n\n'
    + 'The radio clicks off before you can reply.',
}
```

### Design Notes (Docking)

**The player is a witness, not a victim.** The catastrophe happens to someone else. The player's airlock holds. Their hatch never opens. They are safe the entire time — and that safety is the point. The horror is watching someone die on the other side of a door you cannot open fast enough, from a decision you could not prevent.

**The warning changes nothing.** The player can try to say something during the partial seal phase. The other pilot acknowledges and proceeds anyway. The player's intervention is recorded (`playerWarned`) — a story could use this later for guilt, dialogue, or a journal entry — but it does not alter the outcome. Some things cannot be fixed by typing the right command.

**Scheduler as drama engine.** The entire sequence is driven by a daemon ticking every turn. The player can do whatever they want — examine the panel, pace the corridor, look out the viewport — and the drama unfolds around them. The scheduler is not waiting for player input. It is relentless. This is the key difference from an action-driven puzzle: the player has agency over their own actions but no agency over the incoming pilot's decisions.

**No death for the player.** This scene has no player death state. No EVA suit check, no grab-the-rail moment. The player is never in physical danger. The design choice is that watching is worse.

---

## Design Notes

**Mutual exclusion without coupling.** The two doors never reference each other. Each checks the chamber's pressurization state independently. The inner door requires pressurized = true. The outer hatch requires pressurized = false. This makes them mutually exclusive by construction — no explicit "if other door is open" checks.

**Capability dispatch for door behavior.** The player types "open hatch" and the stdlib opening action runs, but the airlock door behavior's validate phase intercepts it. The player doesn't need to learn a new verb — standard IF commands work, with domain-specific validation layered on top.

**Sound design in prose.** The depressurization message uses the transition from "roar" to "silence" to convey vacuum through text alone. The hatch opening message ends with "Stars." — a one-word sentence that hits harder than a paragraph of description.
