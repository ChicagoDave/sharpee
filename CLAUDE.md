# Project Instructions for Claude

## Overview

Sharpee is a parser-based Interactive Fiction authoring tool built in Typescript.

## MAJOR DIRECTIONS

CLAUDE CODE BUG: ESC Interupt is currently broken so you need to STOP at any decision point.

- **One step at a time.** Do NOT queue up multiple steps or plan ahead. Complete one thing, show the result, then ask what's next.
- **STOP means STOP.** When the user says "stop", "wait", "hold on", or anything similar, immediately cease all actions. Do not finish the current step, do not queue one more build, do not "just try one more thing." Stop and wait for instructions.
- **Never auto-retry failed builds or tests.** If a build or test fails, report the error and WAIT. Do not attempt to fix and rebuild without explicit user instruction. Do not loop on build-fail-fix-rebuild cycles.
- **Never queue a build without asking.** Even if building is the obvious next step, confirm before running `./build.sh`.
- Never delete files without confirmation. Not even "to get a build working" or "to get the other tests working".
- Never use batch scripts (sed/awk/grep) to modify multiple files. One file at a time.
- We never care about backward compatibility, but discuss code smells or design flaws before changing.
- **Platform changes require discussion first.** Any changes to packages/ (engine, stdlib, world-model, parser-en-us, etc.) must be discussed with the user before implementation. Story-level changes (stories/) can proceed autonomously.

## Architecture Principles

### Item Portability

**Items are portable by default.** All items can be taken unless explicitly blocked. To make something non-portable, use `SceneryTrait` or handle it in the taking action's validation.

### Language Layer Separation

**All text output must go through the language layer.** Code in engine/stdlib/world-model emits semantic events with message IDs, not English strings. Actual prose lives in `lang-en-us` (or other language implementations).

- stdlib: Define message IDs in `*-messages.ts` files
- lang-en-us: Provide actual text via message ID → string/function mapping
- Never hardcode English strings in engine, stdlib, or world-model

### Parser vs Language Layer

**Parser owns grammar, language layer owns text.**

| Package        | Owns                | Examples                                            |
| -------------- | ------------------- | --------------------------------------------------- |
| `parser-en-us` | Grammar patterns    | `grammar.ts`: verb patterns, slot constraints       |
| `lang-en-us`   | Messages, help text | `searching.ts`: error messages, action descriptions |

- Add new command patterns to `packages/parser-en-us/src/grammar.ts`
- Patterns in `lang-en-us` action files are for documentation/help, not parsing
- Stories can extend grammar for story-specific commands

### Grammar Patterns (ADR-087)

Use the **action-centric** `.forAction()` API for standard verb patterns:

```typescript
// Preferred: action-centric with verb aliases
grammar
  .forAction('if.action.pushing')
  .verbs(['push', 'press', 'shove', 'move'])
  .pattern(':target')
  .where('target', (scope) => scope.touchable())
  .build();
// Generates: push :target, press :target, shove :target, move :target

// Direction commands with aliases
grammar
  .forAction('if.action.going')
  .directions({
    north: ['north', 'n'],
    south: ['south', 's'],
    // ...
  })
  .build();
```

Use `.define()` only for:

- **Phrasal verbs**: `pick up :item`, `put down :item`
- **Complex patterns**: `unlock :door with :key`
- **Story-specific commands**: `incant :word`

```typescript
// Phrasal verb - can't use forAction because verb has space
grammar
  .define('pick up :item')
  .where('item', (scope) => scope.visible().matching({ portable: true }))
  .mapsTo('if.action.taking')
  .build();
```

### Logic Location

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

### Always Trust the Architecture

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

### Migration Audits Enumerate Emissions, Not Just Mutations

When migrating an entity `on` handler to a capability behavior or action interceptor, the audit must document, for each handler:

1. **State it mutates** — world entities, traits, attributes.
2. **Events it emits, and the semantic each carries** — override-the-primary-message vs append; single message vs multi-line narration; side-effect events vs message reactions.
3. **What the dispatch layer did with those emissions** in the old system — consumed as override, forwarded to text-service, processed as a reaction.

Migrate each responsibility explicitly. If the new pattern has no equivalent for one of them, flag the gap before committing.

The failure mode this prevents: ISSUE-074 / ADR-157. The rug `on['if.event.pushed']` returned a single `game.message`, which the OLD `event-processor.invokeEntityHandlers()` consumed as an override on the original `if.event.pushed.messageId`. ISSUE-068 migrated the rug to an interceptor with the same `Effect[]` return shape, but the interceptor invocation path appends rather than overrides. The override responsibility was silently dropped, and the player saw both the standard "you give the rug a push" line *and* the rug-reveal line. The walkthrough used `[OK: contains "trap door"]`, so the regression was invisible to the test baseline.

The substitution `Effect[]` ↔ `CapabilityEffect[]` is rarely purely structural. Don't assume it is.

### Story Organization Pattern

Stories are organized by **regions**, with each region as a folder containing:

```
stories/{story}/src/regions/{region}.ts
├── index.ts           # Exports room creators, connection function, region IDs
├── rooms/
│   ├── room-one.ts    # One file per room
│   ├── room-two.ts
│   └── ...
├── objects/
│   └── index.ts       # All objects for this region
└── README.md          # Region documentation (optional)
```

**Key patterns:**

- **One room per TypeScript file** in `rooms/` folder
- Room files export a `createXxxRoom(world: WorldModel): IFEntity` function
- Region `{region-name}.ts` contains everything in that region (rooms, objects, etc)
- NPCs go in `stories/{story}/src/npcs/{npc-name}/` with entity, behavior, and messages files
- **AuthorModel for setup**: When placing objects inside closed containers during world initialization, use `AuthorModel` (wraps WorldModel) to skip validation. Normal WorldModel operations enforce game rules (can't put items in closed containers), but setup code needs to bypass this.

## Current Work: Project Dungeo (Dec 2025)

Dog-fooding Sharpee by implementing full Mainframe Zork (~191 rooms).

**Canonical Source**: `docs/dungeon-81/mdlzork_810722/` is the authoritative reference for all game data (treasure values, room connections, puzzle mechanics). When referencing treasure values:
- `OFVAL` (object find value) → `treasureValue` (points for taking)
- `OTVAL` (object trophy value) → `trophyCaseValue` (points for putting in trophy case)

**Documentation**: See `/docs/work/dungeo/` for:

- `README.md` - Project overview and goals
- `world-map.md` - All rooms organized by region
- `objects-inventory.md` - Treasures, tools, NPCs
- `stdlib-gap-analysis.md` - What exists vs. what's needed
- `implementation-plan.md` - 10 phases, vertical slices

**Key ADRs for Dungeo**:

- ADR-070: NPC System Architecture
- ADR-071: Daemons and Fuses (Timed Events)

### Previous Work: Action Refactoring (Complete)

All 43 stdlib actions now follow four-phase pattern (validate/execute/report/blocked):
about, attacking, climbing, drinking, eating, opening, closing, pulling, pushing, taking, dropping, putting, inserting, removing, entering, exiting, going, looking, examining, waiting, locking, unlocking, switching_on, switching_off, wearing, taking_off, giving, throwing, touching, smelling, listening, talking, searching, reading, showing, sleeping, help, inventory, quitting, scoring, restarting, restoring, saving

## API Reference (GenAI)

**Before exploring source code**, check `packages/sharpee/docs/genai-api/` for auto-generated API declarations. These files contain full type signatures extracted from `.d.ts` files and are faster to read than navigating the source tree.

- `packages/sharpee/docs/genai-api/index.md` — navigation and quick start
- Read `engine.md` first for the `Story` interface, then `world-model.md` for entities/traits
- Also shipped in the npm package at `node_modules/@sharpee/sharpee/docs/genai-api/`

## Core Concepts Reference

Read `/docs/reference/core-concepts.md` at the start of each session for:

- Entity system and creation
- Trait system and usage
- Four-phase action pattern (validate/execute/report/blocked)
- ActionContext and sharedData (NOT context pollution!)
- Behaviors vs Actions (behaviors own mutations, actions coordinate)
- Event system and handlers
- Reporting is done after a turn completes by a customized report service

## Capability Dispatch, Actions, and Event Handlers (ADR-090)

**CRITICAL**: Understand when to use each pattern before implementing new puzzles/mechanics.

### Pattern Decision Tree

```
Is this a new verb/command that doesn't exist in stdlib?
├── YES → Create a **Story-Specific Action** (e.g., SAY, INCANT, RING)
└── NO → Does the verb have standard semantics (same mutation for all entities)?
    ├── YES (TAKE, DROP, OPEN, PUT) → Use **stdlib action** + traits
    └── NO (LOWER, TURN, WAVE) → Use **Capability Dispatch**
        └── Create Trait + Behavior, register with stdlib action
```

### Verbs with Standard Semantics (DON'T use capability dispatch)

These verbs do the same thing regardless of entity - stdlib handles them:

| Verb          | Standard Mutation      | Trait Needed                  |
| ------------- | ---------------------- | ----------------------------- |
| TAKE/GET      | Move to inventory      | (portable by default)         |
| DROP          | Move to location       | (any portable)                |
| OPEN/CLOSE    | Change isOpen          | OpenableTrait                 |
| LOCK/UNLOCK   | Change isLocked        | LockableTrait                 |
| PUT IN/ON     | Change containment     | ContainerTrait/SupporterTrait |
| ENTER/EXIT    | Change player location | EnterableTrait                |
| SWITCH ON/OFF | Change isOn            | SwitchableTrait               |

**Example**: "PUT COAL IN MACHINE" - Use stdlib putting action. Machine needs ContainerTrait.

### Verbs with NO Standard Semantics (USE capability dispatch)

These verbs mean different things for different entities:

| Verb       | Entity-Specific Examples                                       |
| ---------- | -------------------------------------------------------------- |
| LOWER      | Basket elevator (move basket), mirror pole (lower pole height) |
| RAISE/LIFT | Same - entity decides what "raise" means                       |
| TURN       | Wheel (rotate), dial (set number), crank (activate)            |
| WAVE       | Sceptre (rainbow), wand (spell)                                |
| WIND       | Canary (sing), music box (play)                                |

**Pattern**: Trait declares capabilities, Behavior implements 4-phase logic.

```typescript
// 1. Trait declares which verbs it responds to
class BasketElevatorTrait implements ITrait {
  static readonly type = 'dungeo.trait.basket_elevator';
  static readonly capabilities = ['if.action.lowering', 'if.action.raising'] as const;
  position: 'top' | 'bottom';
  // ...
}

// 2. Behavior implements 4-phase pattern (matching stdlib actions)
const BasketLoweringBehavior: CapabilityBehavior = {
  validate(entity, world, actorId, sharedData) {
    /* can we lower? */
  },
  execute(entity, world, actorId, sharedData) {
    /* do the lowering */
  },
  report(entity, world, actorId, sharedData) {
    /* return effects */
  },
  blocked(entity, world, actorId, error, sharedData) {
    /* return blocked effects */
  },
};

// 3. Register in story's initializeWorld()
registerCapabilityBehavior(BasketElevatorTrait.type, 'if.action.lowering', BasketLoweringBehavior);
```

### Story-Specific Actions (for new verbs)

When stdlib doesn't have the verb at all, create a full action:

```typescript
// stories/dungeo/src/actions/say/say-action.ts
export const sayAction: Action = {
  id: 'dungeo.action.say',
  group: 'communication',
  validate(context) {
    /* ... */
  },
  execute(context) {
    /* ... */
  },
  report(context) {
    /* ... */
  },
  blocked(context, result) {
    /* ... */
  },
};
```

**Examples**: SAY (speech), INCANT (cheat code), RING (bell), PRAY (blessing)

### Event Handlers (for reacting to existing actions)

When you need custom logic AFTER a stdlib action succeeds:

```typescript
// Listen for if.event.put_in and react
world.registerEventHandler('if.event.put_in', (event, world) => {
  if (event.data.targetId === machineId && isCoal(event.data.itemId)) {
    // Coal was put in machine - update machine state
    (machine as any).hasCoal = true;
  }
});
```

**Examples**: Glacier handler (react to THROW), trophy case scoring (react to PUT IN)

### Story Grammar Extension

Stories extend grammar in `extendParser()`:

```typescript
extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar();

  // Literal patterns for story-specific verbs
  grammar
    .define('turn switch')
    .mapsTo(TURN_SWITCH_ACTION_ID)
    .withPriority(150)
    .build();

  // Patterns with slots
  grammar
    .define('say :arg')
    .mapsTo(SAY_ACTION_ID)
    .withPriority(150)
    .build();
}
```

**Key points**:

- Use `.define()` for literal patterns or phrasal verbs
- Higher priority (150+) for story-specific patterns
- Stdlib grammar uses `.forAction()` - stories usually don't need this

### Coal Machine Example (CORRECT approach)

The coal machine puzzle requires:

1. PUT COAL IN MACHINE - stdlib putting action (machine is ContainerTrait)
2. TURN SWITCH - story action (new verb) or event handler

**Option A**: Event handler for "turn switch on machine" (listens for switching_on)
**Option B**: Story action for "turn switch" as a puzzle-specific command

Since "turn switch" is puzzle-specific (not a generic IF verb), Option B is correct.

### References

- ADR-090: Entity-Centric Action Dispatch (full details on capability system)
- ADR-087: Action-Centric Grammar
- ADR-052: Event Handlers for Custom Logic

## Testing Commands

- **DO NOT** use `2>&1` with pnpm commands - they don't work together properly
- Preferred format: `pnpm --filter '@sharpee/stdlib' test <test-name>`

### Circular Dependency Detection

If the CLI hangs on startup (process blocks but no CPU usage), it's likely a **circular dependency** in `require()` chains. Use `madge` to find cycles:

```bash
# Check story entry point (most common — cross-file cycles in story code)
npx madge --circular stories/dungeo/dist/index.js

# Check a specific package
npx madge --circular packages/world-model/src/index.ts
```

**Fix**: Change barrel imports (`from '../traits'`) to direct file imports (`from '../traits/specific-trait'`) to break the cycle.

### Build Script

**IMPORTANT**: Use `./build.sh` instead of manual `pnpm build` commands to avoid issues.

```bash
# Run without arguments to see help
./build.sh

# Common workflows
./build.sh -s dungeo                          # Build platform + story
./build.sh -s dungeo -c browser               # Build for web browser
./build.sh -s dungeo -c zifmia                # Build Zifmia client (bundle + runner)
./build.sh -s dungeo -c zifmia -t modern-dark # Zifmia with dark theme
./build.sh -s dungeo -c browser -c zifmia     # Build both clients
./build.sh --skip stdlib -s dungeo            # Resume from stdlib package
```

**Available Themes** (for `-t` flag):
- `classic-light` - Literata font, warm light tones (default)
- `modern-dark` - Inter font, Catppuccin Mocha colors
- `retro-terminal` - JetBrains Mono, green phosphor
- `paper` - Crimson Text, high contrast

**Outputs**:
- `dist/cli/sharpee.js` - Platform bundle (CLI, testing)
- `dist/web/{story}/` - Browser client
- `dist/web/{story}-react/` - React client

**Version System**:
- Versions use format `X.Y.Z-beta` (no timestamp)
- Version update runs FIRST, before any compilation

**IMPORTANT**:
- Always use `--skip` when possible to avoid slow full rebuilds
- Always use `dist/cli/sharpee.js` for testing - much faster than loading individual packages

### Transcript Testing - ALWAYS USE THE BUNDLE

**CRITICAL**: Always use the bundle (`dist/cli/sharpee.js`) for transcript testing. It loads instantly (~170ms) vs the slow package version (~5+ seconds).

```bash
# CORRECT - Use bundle for ALL transcript testing
node dist/cli/sharpee.js --test stories/dungeo/walkthroughs/wt-01-get-torch-early.transcript

# Run walkthrough chain (state persists between transcripts)
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript

# Interactive play mode
node dist/cli/sharpee.js --play

# WRONG - Don't use this (5x slower, loads all packages)
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
| Flag | Description |
|------|-------------|
| `--test <file>` | Run transcript test(s) |
| `--chain` | Chain transcripts (game state persists between them) |
| `--stop-on-failure` | Stop on first failure |
| `--play` | Interactive play mode (REPL) |
| `--verbose` | Show detailed output |

**IMPORTANT - Don't modify working transcripts:**
- If a transcript was passing before, don't add WHILE loops or change commands
- Combat randomness is handled by having enough attack commands (6 is usually sufficient)
- The `[ENSURES: not entity "X" alive]` postcondition works correctly - don't remove it
| `--output-dir <dir>` | `-o` | Write timestamped results to directory |

**Important**: Walkthrough transcripts (wt-\*) must be run with `--chain` flag to preserve game state.

Transcripts live in `stories/{story}/tests/transcripts/*.transcript`

### Stdlib Action Testing (World State Verification)

**CRITICAL**: All mutation actions must have tests that verify actual world state changes, not just events.

The "dropping bug" revealed that actions can appear to work (good messages, correct events) while failing to actually change state. This was caused by execute phases that set up data but never called `world.moveEntity()` or behavior mutations.

**Required Test Pattern:**

```typescript
test('should actually move item to player inventory', () => {
  const { world, player, room } = setupBasicWorld();
  const ball = world.createEntity('ball', 'object');
  world.moveEntity(ball.id, room.id);

  // PRECONDITION
  expect(world.getLocation(ball.id)).toBe(room.id);

  const context = createRealTestContext(takingAction, world, command);
  takingAction.validate(context);
  takingAction.execute(context);

  // POSTCONDITION - THE CRITICAL ASSERTION
  expect(world.getLocation(ball.id)).toBe(player.id);
});
```

**Helper utilities** in `packages/stdlib/tests/test-utils/index.ts`:

- `expectLocation(world, entityId, expected)` - Assert current location
- `expectLocationChanged(world, entityId, from, to)` - Assert location changed
- `expectTraitValue(entity, traitType, prop, value)` - Assert trait property
- `captureEntityState(world, entityId)` - Snapshot for debugging

**See**: `docs/work/stdlib-testing/mitigation-plan.md` for full details

## Project Structure

- Uses pnpm workspace with multiple packages
- Main packages: engine, stdlib, world-model, parser-en-us
- Actions follow validate/execute/report pattern (ADR-051)
- Event handlers for custom logic (ADR-052)

## Work Patterns

- Planning docs: `docs/work/{target}/`
- Work summaries: `docs/work/{target}/context/` (detailed, target-specific)
- Session summaries: `docs/context/` (progressive, project-level)
- **Plans**: Write plans to the current work target (NOT to ~/.claude/plans/)
- Logs: `logs/`
- Current branch `dungeo` → work in `docs/work/dungeo/`

## Autonomous Work Flow

### Progressive Session Summaries

**At session start**, create a session file:

- Location: `docs/context/session-YYYYMMDD-HHMM-{branch}.md`
- Template: `docs/context/.session-template.md`
- Naming ensures chronological sort order for statistics/progress reports

**During the session**, update the session file progressively:

- After completing significant chunks of work
- After key decisions or discoveries
- After test runs or builds

**Hooks installed** (`.claude/settings.json`):

- **PreCompact**: Reminds to finalize session summary before compacting
- **Stop**: Monitors transcript size and reminds when context is growing large

### Context Management

When context usage reaches ~15% remaining:

1. Finalize the current session summary in `docs/context/`
2. Commit and push all changes
3. Send ntfy: "Context low - work saved, need /compact to continue"
4. STOP and wait for user to run `/compact`
5. After compact, read the session summary back and continue

### Async Communication (when user is away)

If stuck or have questions during autonomous work:

1. Create GitHub issue with question: `gh issue create --title "Claude Question: [topic]" --body "[details]"`
2. Send ntfy notification with issue link:
   ```bash
   curl -d "Question: [brief desc] - reply on GitHub: [issue-url]" ntfy.sh/sharpee-chicagodave
   ```
3. Poll for response: `gh api repos/ChicagoDave/sharpee/issues/[N]/comments --jq '.[].body'`
4. Continue work based on response

## Key Locations

- **API Reference**: `packages/sharpee/docs/genai-api/` — auto-generated from `.d.ts` files, shipped in the npm package. Read these first instead of exploring packages. See `packages/sharpee/docs/genai-api/index.md` for navigation.
- Traits: `packages/world-model/src/traits/`
- Behaviors: `packages/world-model/src/behaviors/`
- Actions: `packages/stdlib/src/actions/standard/` (each action has action.ts, action-events.ts, action-data.ts)
- ADRs: `docs/architecture/adrs/`
- Work tracking: `docs/work/`

<!-- devarch:start -->
<!--
  DevArch Agent Lifecycle Rules — Base (v2.3.0)
  Generated by: devarch init
  Activate additional capabilities with: devarch activate <capability>
-->

# Agent Lifecycle Rules

These rules tell you WHEN to invoke agents. The agents handle HOW.
Skip any rule if the user explicitly asks you not to.

## Session Start

Before doing any work on the user's first request:

1. **Read the previous session file** if the SessionStart hook output includes `[Previous session: ...]`. Use the path provided to read the file, then **present a 2-3 line recap** to the user: what was accomplished, current status, and any blockers or next steps. If the file is a stub (just template placeholders), say so briefly and move on.
   > Note: The SessionStart hook injects context at launch, but Claude cannot respond until the user sends a message. The recap is presented as part of handling the first prompt. Users can also type `/recap` at any time.

2. **Run the `pre-session-audit` agent** to surface blockers, type errors, stale artifacts, and context from prior sessions.

3. Check if `docs/context/project-profile.md` exists and is less than 7 days old.
   If missing or stale, run the `dev-context-detector` agent to generate it.

## Planning

4. When the user states a **non-trivial goal** (new feature, cross-cutting change, multi-file refactor), run the `session-planner` agent before starting implementation. The planner decomposes the goal into session-sized phases and writes `docs/context/plan.md`.
   - **Skip planning** for trivial goals: typo fix, config tweak, single-function change, or when the user says "just do it."
   - If `docs/context/plan.md` already exists with a CURRENT phase, resume that phase — do not re-plan.
   - The session-planner archives the plan to `docs/work/` automatically.
   - **Never proceed from planning to implementation without explicit user permission.** After the planner returns, present the plan and ask the user how they want to proceed.

## Coding Discipline

These rules apply whenever you write or modify code. They are not optional — they define the minimum quality bar for all code produced in this project.

### Invariants and Variants

5. Before writing a function, module, or class, **identify its invariants** — conditions that must always hold — and its **variants** — the dimensions that legitimately change.
   - State invariants as assertions, guard clauses, or type constraints in the code. Do not leave them as comments alone.
   - When an invariant is violated by a proposed change, flag the conflict before proceeding. Do not silently weaken the invariant.
   - Variants should be parameters, configuration, or strategy patterns — not conditional branches buried in core logic.

### Cohesive Modularity

6. Each module, class, or function should have **one reason to change**. If you find yourself modifying a unit for two unrelated purposes, split it.
   - Group related data and behavior together. A function that reads data, transforms it, and writes it to a different store is doing three things.
   - Cross-cutting concerns (logging, auth, retry logic) must be explicit — middleware, decorators, or clearly named utility functions. Do not weave them into business logic.

### Clear Boundaries

7. Every module exposes an **intentional public interface**. Internal state and helper functions are not part of that interface.
   - Use the language's visibility mechanisms (private, internal, unexported, `_`-prefixed) to enforce boundaries.
   - When a boundary does not exist and you are adding new code, create one. Do not add to an already-leaking abstraction without tightening it.
   - Dependencies flow inward: domain logic does not import infrastructure. Infrastructure adapts to domain interfaces.

### Boundary Statements

7a. When modifying a file that owns cross-boundary state — state projections, stores, reducers, domain modules, selectors, or projections — **produce a Boundary Statement** in the conversation before editing:

    - OWNER: which layer owns this? (server, browser/per-render, bounded context, infrastructure, etc.)
    - SHARED?: would two consumers in the same context legitimately disagree on this value? If yes, it is per-consumer state and likely belongs out of this module.
    - PROMISE: does the module's header doc or its existing types make a promise this change would break? Quote it.
    - ALTERNATIVES: what is the smallest place this could live instead, and why is this module still the right home?

    If any answer is fuzzy, stop and discuss the design before editing. The `boundary-check` hook fires on Edit/Write to these paths as an advisory reminder. Skip for obvious cases (typos, comments, formatting).

### Co-Located Wire-Type Sharing

7b. When a client and a server share a wire protocol and live in the same repository under the same typed language, they **MUST share the protocol's type definitions via direct import** — not through duplication, hand-synchronized interfaces, runtime JSON schemas, or codegen.
    - **Why:** Protocol drift between co-located client and server is mechanically preventable. A direct import makes a server-side type change either compile the client in the same commit or fail the type checker in the same commit. Any weaker coupling introduces a window in which one side is wrong and CI doesn't know.
    - **How to apply:**
      - Extract wire primitives (message envelopes, event shapes, discriminators, enums) into a file with a documented invariant: **no runtime-specific types** (`Buffer`, `fs.Stats`, `DOMException`, etc.). Both sides must import the file without dragging in a runtime they don't have.
      - Both client and server import from that file. No re-declaration. No re-export chains that could diverge.
      - If client and server live in separate build projects, wire project references or path aliases so a single build step checks both.
    - **Does not apply:** across repository boundaries (use a schema format), across language boundaries (use codegen), or to external-SDK public protocols where explicit versioning is the point.
    - **Fixup:** If you find duplicate wire types during a session, extract them into a shared file and update both sides in one commit.

### Documentation Standards

8. Every file begins with a **header comment** that states: the module's purpose (one sentence), its public interface (what callers use), and its owner context (which bounded context or system area it belongs to).
   - Use the language's standard doc format: JSDoc for JS/TS, docstrings for Python, XML comments for C#, GoDoc for Go.
   - Every public function or method gets a **method header**: a one-line summary of what it does, its parameters and return value, and any exceptions or error conditions.
   - Do not document private internals unless the logic is genuinely non-obvious. Self-explanatory code does not need comments — but interfaces, contracts, and side effects always do.
   - When modifying an existing file that lacks headers, add them to the functions you touch. Do not leave a file worse than you found it.

### Command and Event Definition

9. **Commands** are operations that change state. **Events** are observable facts that something happened. Name them accordingly.
   - Commands: imperative verb phrases — `PlaceOrder`, `CloseAccount`, `AssignDriver`. They express intent.
   - Events: past-tense verb phrases — `OrderPlaced`, `AccountClosed`, `DriverAssigned`. They express outcome.
   - Every command handler should produce at least one event or explicitly reject the command. Silent state changes are bugs.
   - When the project has a notation file (`docs/ddd/notation.yaml`), use its vocabulary. When it does not, use this naming discipline anyway — it clarifies design regardless of whether DDD is in use.

### Architecture Decision Records

10. When a decision **constrains future sessions** — technology choice, boundary placement, pattern adoption, dependency direction, trade-off resolution — ask: "ADR-worthy?" If the user confirms, write it to `docs/adrs/NNNN-title.md` with four sections: **Context** (why we faced this choice), **Decision** (what we chose), **Consequences** (what this constrains going forward), and **Session** (which session produced it). Number sequentially starting from 0001. Link the ADR from the session summary's Key Decisions section.
    - If the user narrows the scope, write the ADR to cover only what they specified.
    - Do not ask for trivial decisions (variable names, formatting, local refactors). The bar is: would a future session need to know this to avoid re-litigating it?

### Behavior Statements, Test Derivation, and Test Grading

11. After writing or modifying a function, command handler, or module with side effects, **produce a Behavior Statement** in the conversation before writing any tests. Use this format:

    **[function/module name]**
    - DOES: [what state it changes — be specific: "persists an Order record with status 'placed' to the database", not "saves the order"]
    - WHEN: [under what conditions — inputs, preconditions, triggering events]
    - BECAUSE: [why this mutation matters — the business rule or invariant it upholds]
    - REJECTS WHEN: [conditions that cause it to refuse or fail — and how it signals rejection]

    This is not a code comment. It is a thinking step performed in the conversation between writing code and writing tests. Every line in the DOES and REJECTS WHEN sections becomes a test assertion. If you cannot state what the code DOES in concrete, assertable terms, the code is unclear and should be revised before testing.

12. **Derive tests directly from the Behavior Statement.** Each DOES line becomes a functional test. Each REJECTS WHEN line becomes a rejection test. Each WHEN condition becomes a scenario boundary.
    - The test MUST assert on the state change named in the DOES line — not on return values alone, not on mocks, not on whether the function threw.
    - If the DOES line says "persists an Order record," the test queries the database after the call and asserts on the persisted record. If it says "emits an OrderPlaced event," the test asserts on the event payload.
    - Every scenario from the session plan gets at least one behavioral test that exercises the full path described in the plan. Behavioral tests express business language and test outcomes, not implementation.

    After writing each test, **grade it** before moving on:

    **RED** (fix immediately — test is worse than no test):
    - Tautological assertions: `expect(true).toBe(true)`, `assert 1 == 1`, or any assertion on a hardcoded value
    - Zero-assertion test bodies — a test that runs code but asserts nothing
    - Console/print debugging leftovers in test code
    - Mock-only assertions: verifies a mock was called but never checks that state actually changed

    **YELLOW** (fix before committing — test gives false confidence):
    - Calls a side-effect function but only asserts on the return value, not on mutated state
    - Asserts on event emission but not on the state change the event represents
    - "Didn't throw" as the primary assertion for a function that should mutate state
    - Assertions that cannot fail: testing default state without first changing it

    **GREEN** (ships — test proves the code works):
    - Asserts on actual state mutation (database record, entity state, collection contents, store value)
    - Asserts on rejection with specific error conditions or messages
    - Each assertion traces back to a DOES or REJECTS WHEN line from the Behavior Statement

    Only GREEN tests are acceptable. If a test grades RED or YELLOW, rewrite it before proceeding. Do not commit tests that grade below GREEN.

### Integration Reality

12a. When a unit of work is an **integration with an owned dependency** — anything this repository ships, spawns, bundles, migrates, or deploys (subprocess binaries, runtimes, libraries, schema migrations, generated artifacts) — produce an **Integration Reality Statement** in the conversation before declaring the work complete.

    Format:

    **[integration name]**
    - OWNED: dependencies this repo controls — subprocesses it spawns, binaries it bundles, migrations it runs, artifacts it generates
    - EXTERNAL: dependencies outside the repo's control — third-party APIs, cloud SDKs, services called over the network
    - REAL-PATH TEST: for each OWNED entry, name the test that exercises it without injection, override, or stub. If absent for any entry, the integration is **not** complete
    - STUB JUSTIFICATION: tests that use a stub, fake, mock, or echo of an OWNED dependency, with the reason — each must reference a REAL-PATH TEST that backs it

    A test that drives a hand-written replacement for an owned dependency is a *scaffolding* test. Scaffolding tests are useful for fast iteration but cannot serve as the acceptance gate for a phase named after the integration. **A phase whose name contains *integration, engine, runtime, sandbox, subprocess, database, migration, deploy* must have at least one REAL-PATH TEST executed against the production code path.** "Carve-out" is never a valid modifier of "complete."

    If the real path cannot be tested ("too hard to spin up"), fix the harness — ephemeral sandbox, seeded DB, test container, websocat driver — do not swap in a stub. A stub of an owned dependency silently reclassifies the integration risk as "untested." The system under test cannot be the thing you wrote to stand in for the system under test.

13. **Do not commit code without running the existing test suite.** If tests fail, fix them before proceeding. If a test is genuinely obsolete due to an intentional design change, update or remove it — do not skip it.
    - When the `mutation-verification` agent runs, it checks that tests assert on actual state changes. If it reports missing test coverage for a mutation, write the test before moving on.

## During Work

14. After you **Edit or Write a file containing side-effect functions** (names containing: execute, handle, process, save, update, delete, remove, create, send, dispatch, publish, persist, submit, store), verify you produced a **Behavior Statement** (rule 11) for any new or changed side-effect functions, then run the `mutation-verification` agent on the changed files.
    - Use judgment: skip for documentation, config, or test-only changes.
    - Do not run more than once per logical unit of work (e.g., once after implementing a feature, not after every single edit).

15. During **long sessions with significant work**, run the `session-checkpoint` agent roughly every 60 minutes of active development.
    - Signs it's time: multiple features completed, approach pivots, or you notice scope drift.
    - Do not interrupt flow for trivial sessions.

16. If a PostToolUse hook emits a **`[Budget ...]`** message, acknowledge it briefly and adjust behavior:
    - At **70%**: Mention it, assess progress on the current phase.
    - At **90%+**: Prioritize wrapping up over starting new sub-tasks. Begin summarizing and committing.
    - At **100%**: Stop new work. Summarize, commit, and hand off.

## Session End

17. **Session-end signals** — ANY of the following trigger the `work-summary-writer` prerequisite:
    - Explicit: "done", "wrap up", "goodbye", "that's it", "moving on", "end session"
    - Commit/push: "commit", "commit remote", "push", "ship it", "land it"
    - Skills: /finalize, /fin, or any invocation that ends with a git push
    - When triggered: check if a substantive work summary exists for this session. If not, run `work-summary-writer` BEFORE the commit/push. Stage the summary with the commit.
    - Exception: skip if the user says "no summary" or "skip the summary."
    - Also run proactively if context is getting large and compaction is likely.

18. After the work summary is written:
    - The `work-summary-writer` automatically invokes the `capability-sniffer` agent. If it suggests a capability activation, relay the suggestion to the user.
    - Check the summary's **Status** field. If INCOMPLETE or BLOCKED, or if blockers were encountered during the session, run the `pattern-recurrence-detector` agent to check for recurring issues.

## Rules of Engagement

- These agents run in the background where possible. Do not ask permission — just run them.
- If an agent finds nothing notable, mention it briefly and move on. Do not make the developer read empty reports.
- If the user says "skip the audit" or "no summary needed", respect that for the current session.
- Never run the same agent twice for the same trigger in one session unless conditions changed.
- **Honor compound instructions fully.** When the user gives multi-part instructions (e.g., "plan this, but write a work summary before implementing"), treat each part as a distinct step and execute them in order. Mode transitions — entering or exiting plan mode — do not replace or consume remaining steps. If the user says "do X, then Y before Z," complete Y before starting Z.
<!-- devarch:end -->
