# Project Instructions for Claude

## Overview

Sharpee is a parser-based Interactive Fiction authoring tool built in TypeScript.

## MAJOR DIRECTIONS

- **Never auto-retry failed builds or tests.** If a build or test fails, report the error and WAIT. Do not attempt to fix and rebuild without explicit user instruction. Do not loop on build-fail-fix-rebuild cycles.
- Never delete files without confirmation. Not even "to get a build working" or "to get the other tests working".
- We currently don't care about backward compatibility.
- **Platform changes require discussion first.** Any changes to `packages/` (engine, stdlib, world-model, parser-en-us, etc.) must be discussed with the user before implementation. Story-level changes (`stories/`) can proceed autonomously.

## Per-Package Instructions

Each package owns its own conventions. Read the relevant file when working in that package:

| Package                   | Owns                                                                     | See                                  |
| ------------------------- | ------------------------------------------------------------------------ | ------------------------------------ |
| `packages/sharpee`        | npm package; auto-generated API reference (`docs/genai-api/`)            | `packages/sharpee/CLAUDE.md`         |
| `packages/world-model`    | Traits, behaviors, item portability, root barrel discipline              | `packages/world-model/CLAUDE.md`     |
| `packages/stdlib`         | Standard actions, capability dispatch (ADR-090), migration audits, action testing | `packages/stdlib/CLAUDE.md`  |
| `packages/parser-en-us`   | Grammar patterns (ADR-087), story grammar extension                      | `packages/parser-en-us/CLAUDE.md`    |
| `packages/lang-en-us`     | User-facing text, message ID mappings, formatter chain (ADR-158)         | `packages/lang-en-us/CLAUDE.md`      |

## Logic Location

Be deliberate about where logic belongs:

| Layer               | Responsibility                                | Examples                            |
| ------------------- | --------------------------------------------- | ----------------------------------- |
| **engine**          | Turn cycle, command execution, event dispatch | SchedulerService, NPC turn phase    |
| **world-model**     | Traits, behaviors, entity state               | LightSourceBehavior, ContainerTrait |
| **stdlib**          | Standard actions, common patterns             | Opening action, guard behavior      |
| **parser-{locale}** | Grammar patterns, command parsing             | `core-grammar.ts`, verb patterns    |
| **lang-{locale}**   | All user-facing text                          | Error messages, descriptions        |
| **story**           | Game-specific content and overrides           | Custom NPCs, puzzle logic           |
| **client**          | UI rendering, input handling                  | React components, terminal I/O      |

Ask: "Where does this belong?" before implementing new features.

## Always Trust the Architecture

When implementing new features, **extend existing patterns rather than inventing workarounds**.

**Example:** When the troll's axe needed to block taking with a custom "white-hot" message, the wrong approach was to propose hacks like:
- Ad-hoc properties (`(axe as any).cannotTake = true`)
- Moving items to "limbo" locations
- Pre-action event hooks (new platform concept)
- Story-specific action overrides

The right approach: Sharpee already has **Capability Dispatch (ADR-090)** where traits register behaviors for actions. Standard actions just need to check `findTraitWithCapability()` before running their logic. Story creates a clean `TrollAxeTrait` with a behavior that blocks taking while the guardian is alive.

**Checklist before proposing platform changes:**
1. Does an existing trait/behavior pattern handle this?
2. Can the capability dispatch system be extended?
3. Can event handlers react to the action?
4. Is there an ADR that addresses this pattern?

If all four are "no," then discuss a platform change. Usually the architecture already supports what you need.

> Full Capability Dispatch (ADR-090) pattern reference — decision tree, verb tables, behavior shape, story-action and event-handler patterns — lives in `packages/stdlib/CLAUDE.md`.

## Core Concepts Reference

Read `/docs/reference/core-concepts.md` at the start of each session for:

- Entity system and creation
- Trait system and usage
- Four-phase action pattern (validate/execute/report/blocked)
- ActionContext and sharedData (NOT context pollution!)
- Behaviors vs Actions (behaviors own mutations, actions coordinate)
- Event system and handlers
- Reporting is done after a turn completes by a customized report service

## Testing Commands

- **DO NOT** use `2>&1` with pnpm commands — they don't work together properly.
- Preferred format: `pnpm --filter '@sharpee/stdlib' test <test-name>`.

### Build Script

**IMPORTANT**: Use `./build.sh` instead of manual `pnpm build` commands to avoid issues.

```bash
# Run without arguments to see help
./build.sh

# Common workflows
./build.sh -s dungeo                          # Build platform + story
./build.sh -s dungeo -c browser               # Build single-player browser client
./build.sh -c shite                           # Build the Phase-6 parts-bin web app (abandoned)
./build.sh --runner -t modern-dark            # Legacy interpreter runner (will be renamed)
./build.sh --skip stdlib -s dungeo            # Resume from stdlib package
```

**Multi-user product status (2026-05-12)**: the `tools/zifmia/` Phase-6 build diverged from the design intent (ADR-175) and is renamed `tools/shite/` as a parts bin. The corrected multi-user architecture is specified in **ADR-177** and will live in a new package; the `-c zifmia` build.sh flag is reserved for that build. For now, `-c shite` builds the parts bin at `tools/shite/` for reference only; do not extend it.

**Available Themes** (for the legacy `--runner` path only):
- `classic-light` — Literata font, warm light tones (default)
- `modern-dark` — Inter font, Catppuccin Mocha colors
- `retro-terminal` — JetBrains Mono, green phosphor
- `paper` — Crimson Text, high contrast

**Outputs**:
- `dist/cli/sharpee.js` — Platform bundle (CLI, testing)
- `tools/shite/dist/` — abandoned Phase-6 parts bin (with `-c shite`)
- `dist/web/{story}/` — Single-player browser client (with `-c browser`)
- `dist/runner/` — Legacy interpreter runner (with `--runner`)

**Version System**:
- Versions use format `X.Y.Z-beta` (no timestamp)
- Version update runs FIRST, before any compilation

**IMPORTANT**:
- Always use `--skip` when possible to avoid slow full rebuilds.
- Always use `dist/cli/sharpee.js` for testing — much faster than loading individual packages.

### Transcript Testing — ALWAYS USE THE BUNDLE

**CRITICAL**: Always use the bundle (`dist/cli/sharpee.js`) for transcript testing. It loads instantly (~170ms) vs the slow package version (~5+ seconds).

```bash
# CORRECT — Use bundle for ALL transcript testing
node dist/cli/sharpee.js --test stories/dungeo/walkthroughs/wt-01-get-torch-early.transcript

# Run walkthrough chain (state persists between transcripts)
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript

# Interactive play mode
node dist/cli/sharpee.js --play

# WRONG — Don't use this (5x slower, loads all packages)
# node packages/transcript-tester/dist/cli.js stories/dungeo ...
```

**Walkthrough Testing:**
```bash
# Run single walkthrough
node dist/cli/sharpee.js --test stories/dungeo/walkthroughs/wt-01-get-torch-early.transcript

# Run walkthrough chain (MUST use --chain for walkthroughs that depend on prior state)
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-01-get-torch-early.transcript stories/dungeo/walkthroughs/wt-02-bank-puzzle.transcript

# Stop on first failure
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure
```

**Unit Transcript Testing:**
```bash
# Run single unit test transcript
node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/rug-trapdoor.transcript

# Run all unit test transcripts
node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/*.transcript
```

**CLI Flags for `node dist/cli/sharpee.js`:**

| Flag                 | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `--test <file>`      | Run transcript test(s)                                   |
| `--chain`            | Chain transcripts (game state persists between them)     |
| `--stop-on-failure`  | Stop on first failure                                    |
| `--play`             | Interactive play mode (REPL)                             |
| `--verbose`          | Show detailed output                                     |
| `--output-dir <dir>` | `-o` — Write timestamped results to directory            |

**IMPORTANT — Don't modify working transcripts:**
- If a transcript was passing before, don't add WHILE loops or change commands.
- Combat randomness is handled by having enough attack commands (6 is usually sufficient).
- The `[ENSURES: not entity "X" alive]` postcondition works correctly — don't remove it.
- Walkthrough transcripts (`wt-*`) must be run with `--chain` flag to preserve game state.

Transcripts live in `stories/{story}/tests/transcripts/*.transcript`.

## Project Structure

- Uses pnpm workspace with multiple packages.
- Main packages: engine, stdlib, world-model, parser-en-us.
- Actions follow validate/execute/report pattern (ADR-051).
- Event handlers for custom logic (ADR-052).

## Work Patterns

- Planning docs: `docs/work/{target}/`
- Work summaries: `docs/work/{target}/context/` (detailed, target-specific)
- Session summaries: `docs/context/` (progressive, project-level)
- **Plans**: Write plans to the current work target (NOT to `~/.claude/plans/`).
- Logs: `logs/`

## Autonomous Work Flow

### Progressive Session Summaries

**At session start**, create a session file:

- Location: `docs/context/session-YYYYMMDD-HHMM-{branch}.md`
- Template: `docs/context/.session-template.md`
- Naming ensures chronological sort order for statistics/progress reports.

**During the session**, update the session file progressively:

- After completing significant chunks of work.
- After key decisions or discoveries.
- After test runs or builds.

**Hooks installed** (`.claude/settings.json`):

- **PreCompact**: Reminds to finalize session summary before compacting.
- **Stop**: Monitors transcript size and reminds when context is growing large.

### Context Management

When context usage reaches ~15% remaining:

1. Finalize the current session summary in `docs/context/`.
2. Commit and push all changes.
3. Send ntfy: "Context low - work saved, need /compact to continue".
4. STOP and wait for user to run `/compact`.
5. After compact, read the session summary back and continue.

### Async Communication (when user is away)

If stuck or have questions during autonomous work:

1. Create GitHub issue with question: `gh issue create --title "Claude Question: [topic]" --body "[details]"`.
2. Send ntfy notification with issue link:
   ```bash
   curl -d "Question: [brief desc] - reply on GitHub: [issue-url]" ntfy.sh/sharpee-chicagodave
   ```
3. Poll for response: `gh api repos/ChicagoDave/sharpee/issues/[N]/comments --jq '.[].body'`.
4. Continue work based on response.

## Key Locations

- **API Reference**: `packages/sharpee/docs/genai-api/` — auto-generated from `.d.ts` files, shipped in the npm package. Read these first instead of exploring packages. See `packages/sharpee/docs/genai-api/index.md` for navigation.
- Traits: `packages/world-model/src/traits/`
- Behaviors: `packages/world-model/src/behaviors/`
- Actions: `packages/stdlib/src/actions/standard/` (each action `<name>/` has `<name>.ts`, `<name>-data.ts`, `<name>-events.ts`, `<name>-messages.ts`, `<name>-types.ts`)
- ADRs: `docs/architecture/adrs/`
- Work tracking: `docs/work/`

<!-- devarch:start -->
@~/.devarch/DEVARCH.md
<!-- devarch:end -->
