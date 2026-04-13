# Dungeo NPM Regression Test

Verifies that Dungeo compiles and runs against the **published** `@sharpee/*` npm packages (not workspace links). This catches API breaking changes that the synthetic regression story (`npm-test/`) might not exercise.

## Why both tests?

| Test | What it proves |
|------|---------------|
| `npm-test/` | Synthetic story covers every platform feature in isolation |
| `npm-test-dungeo/` | Real 191-room story exercises features in combination at scale |

Dungeo uses more API surface area: event processors, media, parser extensions, state machines, NPC behaviors, custom actions, daemons, and browser platform — all wired together in a single story.

## Usage

```bash
# Full run: install, compile, and run 20 transcript tests
./npm-test-dungeo/run.sh

# Quick check: install and compile only (no transcripts)
./npm-test-dungeo/run.sh --quick
```

## How it works

1. Copies Dungeo's `src/` and this directory's `package.json`/`tsconfig.json` to an isolated temp folder
2. Runs `npm install` from the public npm registry (no workspace resolution)
3. Compiles with `npx tsc` — this is the critical step that catches type mismatches
4. Runs a curated set of 20 transcript tests covering major subsystems
5. Cleans up the temp folder on exit

## Transcript selection

The 20 transcripts are chosen to cover major subsystems without depending on RNG (no thief, no carousel randomness):

- **Navigation**: rooms, dark rooms, movement restrictions
- **Water mechanics**: dam drain, dam puzzle
- **Objects**: containers, inflate/deflate, locked doors, mailbox
- **Puzzles**: coal machine, mirror room, cyclops, tiny room
- **NPCs**: robot commands, troll blocking
- **Scoring**: trophy case, room scoring
- **Save/restore**: basic save and restore cycle

## Updating

When new `@sharpee/*` packages are published, bump the version ranges in `package.json`. When new transcript tests are added to Dungeo, consider adding representative ones to the `REGRESSION_TRANSCRIPTS` array in `run.sh`.
