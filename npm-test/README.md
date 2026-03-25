# Sharpee NPM Regression Test

Verifies that the published `@sharpee/*` npm packages work correctly in
isolation. The test story and transcripts live in this directory; at test time
everything is copied to a temp folder outside the repo, installed from the npm
registry, compiled, and run.

## Prerequisites

- Node.js 18+
- npm (comes with Node)

## Running

```bash
./run.sh
```

The script will:

1. Create a temp directory (via `mktemp -d`)
2. Copy `package.json`, `tsconfig.json`, `src/`, and `tests/` into it
3. `npm install` from the public registry
4. `npx tsc` to compile the story
5. Run every transcript test via `npx transcript-test`
6. Report pass/fail
7. Delete the temp directory

Exit code is 0 if all tests pass, 1 if any fail.

## What's Tested

| # | Transcript | Platform Feature |
|---|-----------|-----------------|
| 01 | `01-navigation.transcript` | Rooms, cardinal direction exits |
| 02 | `02-scenery.transcript` | SceneryTrait — non-portable fixed objects |
| 03 | `03-portables.transcript` | Take, drop, examine, inventory |
| 04 | `04-containers.transcript` | ContainerTrait, OpenableTrait, LockableTrait, put in, take from |
| 05 | `05-light-dark.transcript` | Dark rooms, LightSourceTrait, SwitchableTrait |
| 06 | `06-readable.transcript` | ReadableTrait, read action |
| 07 | `07-switchable.transcript` | SwitchableTrait, switch on/off |
| 08 | `08-wearable.transcript` | WearableTrait, wear/remove |
| 09 | `09-supporter.transcript` | SupporterTrait, put on surface |
| 10 | `10-npc.transcript` | NpcPlugin, NpcBehavior, autonomous NPC |
| 11 | `11-event-handler.transcript` | Event chain handlers (chainEvent) |
| 12 | `12-custom-action.transcript` | Story-specific Action + grammar extension |
| 13 | `13-capability-dispatch.transcript` | Custom trait, CapabilityBehavior, capability routing |
| 14 | `14-timed-events.transcript` | SchedulerPlugin — daemon (every 5 turns) + fuse (after 8) |
| 15 | `15-scoring.transcript` | awardScore, setMaxScore, score command |

## The Story

"The Maintenance Facility" — four rooms, purpose-built to exercise every
feature:

```
Control Room (start) ──east──▶ Server Room
      │                              │
    south                          south
      │                              │
Supply Closet (dark) ──east──▶ Rooftop
```

- **Control Room**: workbench (supporter), monitors (scenery), clipboard
  (portable + readable), hard hat (wearable), flashlight (switchable + light
  source), small key
- **Server Room**: server rack (inspectable — capability dispatch), maintenance
  bot (NPC)
- **Supply Closet**: dark room, locked toolbox (container + openable + lockable)
  containing a wrench
- **Rooftop**: antenna (scenery), PING custom action

## Adding New Tests

1. Add the feature to `src/index.ts`
2. Create a new transcript in `tests/transcripts/`
3. Run `./run.sh` to verify

Transcript format:
```
title: Test Name
story: regression
author: Sharpee Regression Suite
description: What this tests

---

# Comment
> player command
[OK: contains "expected text"]
```

## Troubleshooting

**npm install fails**: Check that `@sharpee/sharpee` is published at the
expected version. Run `npm view @sharpee/sharpee version` to check.

**tsc fails**: The story imports from individual packages (`@sharpee/engine`,
`@sharpee/world-model`, etc.) which are dependencies of the umbrella package.
If a type is missing, the individual package may need updating.

**transcript-test can't find story**: The tester looks for `dist/index.js`.
Make sure `tsc` completed successfully.
