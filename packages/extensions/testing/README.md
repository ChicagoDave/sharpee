# @sharpee/ext-testing

Debug and testing tools extension for the Sharpee Interactive Fiction platform.

## Installation

```bash
npm install @sharpee/ext-testing
```

## Overview

This extension provides authoring and QA tooling for Sharpee stories:

- **Debug mode** - interactive GDT-style commands with short codes
- **Test commands** - `$teleport`, `$take`, `$assert`, and friends for transcripts
- **Checkpoints** - save/restore world state to file, memory, or local storage
- **Deterministic testing** - seeded randomness for repeatable transcript runs
- **Annotations** - playtester note capture (ADR-109)

## Usage

```typescript
import { TestingExtension } from '@sharpee/ext-testing';

const testing = new TestingExtension({
  debugMode: { enabled: true, prefix: 'gdt' },
  testMode: { enabled: true, deterministicRandom: true },
  checkpoints: { directory: './saves' }
});

// Execute a GDT debug command
const debugResult = testing.executeGdtCommand('AH west-of-house', world);

// Execute a test command (e.g. in a transcript)
const testResult = testing.executeTestCommand('$teleport west-of-house', world);

// Save and restore checkpoints
await testing.saveCheckpoint('before-troll', world);
await testing.restoreCheckpoint('before-troll', world);
```

Checkpoint stores can be created directly for custom wiring:

```typescript
import {
  createFileStore,
  createMemoryStore,
  createLocalStorageStore,
} from '@sharpee/ext-testing';

const store = createFileStore('./saves');
```

## Related Packages

- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle
- [@sharpee/stdlib](https://www.npmjs.com/package/@sharpee/stdlib) - Standard actions
- [@sharpee/world-model](https://www.npmjs.com/package/@sharpee/world-model) - Entity system

## License

MIT
