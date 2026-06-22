# @sharpee/plugin-state-machine

State machine plugin for the Sharpee engine: declarative puzzle and narrative orchestration (ADR-119, ADR-120).

## Installation

```bash
npm install @sharpee/plugin-state-machine
```

## Overview

This package implements the `TurnPlugin` contract from `@sharpee/plugins` with declarative, data-driven state machines:

- **`StateMachinePlugin`** - Runs at priority 75, after NPCs (100) and before the scheduler (50); evaluates every machine each turn (ADR-119, ADR-120).
- **`StateMachineDefinition`** - States with transitions, `onEnter`/`onExit` effects, and terminal states.
- **Triggers** - Transitions fire on an `action`, an `event` (with optional data filter), or a `condition`.
- **Guards** - Entity, state, location, inventory, composite (`and`/`or`/`not`), and custom predicates gate transitions.
- **Effects** - Declarative `move`, `remove`, `set_trait`, `set_state`, `message`, `emit_event`, and custom effects run on transitions and state entry/exit.
- **`StateMachineRegistry`** - Reachable via `getRegistry()`; binds machine roles (`$door`) to entities and serializes machine state for save/load.

## Usage

```typescript
import { StateMachinePlugin, StateMachineDefinition } from '@sharpee/plugin-state-machine';

const smPlugin = new StateMachinePlugin();
engine.plugins.register(smPlugin);

const lock: StateMachineDefinition = {
  id: 'vault-lock',
  initialState: 'locked',
  states: {
    locked: {
      transitions: [
        {
          target: 'open',
          trigger: { type: 'action', actionId: 'unlock', targetEntity: '$door' },
          guard: { type: 'inventory', entityRef: '$key' },
          effects: [{ type: 'set_trait', entityRef: '$door', trait: 'openable', property: 'isOpen', value: true }]
        }
      ]
    },
    open: { terminal: true }
  }
};

// Bind roles to concrete entities and register the machine
smPlugin.getRegistry().register(lock, { $door: doorId, $key: keyId });
```

## Related Packages

- [@sharpee/plugins](https://www.npmjs.com/package/@sharpee/plugins) - Turn-plugin contracts
- [@sharpee/world-model](https://www.npmjs.com/package/@sharpee/world-model) - Entity system the effects and guards operate on
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT
