# @sharpee/transcript-tester

Transcript-based integration testing for Sharpee interactive fiction stories. Write tests that read like gameplay transcripts — player commands paired with assertions on text output, semantic events, and world state.

## Quick Start

```bash
# Published stories: build and test in one step
npx sharpee build --test

# Sharpee development: use the pre-built bundle (~170ms load)
node dist/cli/sharpee.js --test stories/my-story/tests/transcripts/*.transcript
```

## Example

```
title: Locked Door
story: my-story
description: Verify the brass key unlocks the cellar door

---

> examine door
[OK: contains "locked"]
[EVENT: true, type="if.event.examined"]

> unlock door with brass key
[OK: contains "unlocked"]
[STATE: true, door.isLocked = false]

> open door
[EVENT: true, type="if.event.opened"]
```

## Features

- **Text assertions** — `[OK: contains "..."]`, `[OK: not contains "..."]`, `[OK: matches /regex/]`
- **Event assertions** — Verify semantic events by type, position, and data
- **State assertions** — Check entity properties and inventory after commands
- **Control flow** — `GOAL/END GOAL`, `IF/END IF`, `WHILE/END WHILE`, `DO/UNTIL`, `RETRY`
- **Save/restore** — Checkpoint world state for walkthrough chaining
- **Navigation** — `[NAVIGATE TO: "Room"]` auto-pathfinds via BFS
- **Test commands** — `$teleport`, `$take`, `$kill`, `$immortal` for quick setup

## Documentation

For the full guide covering syntax, assertions, directives, CLI flags, and best practices:

**[Transcript Testing Guide](../../docs/guides/transcript-testing.md)**

Architecture decisions:
- [ADR-073: Transcript Story Testing](../../docs/architecture/adrs/adr-073-transcript-story-testing.md)
- [ADR-092: Smart Transcript Directives](../../docs/architecture/adrs/adr-092-smart-transcript-directives.md)

## Package Structure

| File | Purpose |
|------|---------|
| `src/parser.ts` | Parses `.transcript` files into structured test data |
| `src/runner.ts` | Executes transcripts against the game engine |
| `src/condition-evaluator.ts` | Evaluates condition expressions for directives |
| `src/navigator.ts` | BFS pathfinding for `NAVIGATE TO` |
| `src/reporter.ts` | Formats test results for terminal output |
| `src/cli.ts` | Standalone CLI entry point |
| `src/fast-cli.ts` | Bundle-optimized CLI (used by `dist/cli/sharpee.js`) |
| `src/types.ts` | TypeScript type definitions for transcripts, assertions, and directives |

## API

The package exports its parser and runner for programmatic use:

```typescript
import { parseTranscript, TranscriptRunner } from '@sharpee/transcript-tester';

const transcript = parseTranscript(fileContents);
const runner = new TranscriptRunner(gameEngine);
const results = await runner.run(transcript);
```
