# Project Instructions for Claude

## Overview

Sharpee is a parser-based Interactive Fiction authoring tool built in Typescript.

## MAJOR DIRECTIONS

CLAUDE CODE BUG: ESC Interupt is currently broken so you need to STOP at any decision point.

- **One step at a time.** Do NOT queue up multiple steps or plan ahead. Complete one thing, show the result, then ask what's next.
- Never delete files without confirmation. Not even "to get a build working" or "to get the other tests working".
- Never use batch scripts (sed/awk/grep) to modify multiple files. One file at a time.
- We never care about backward compatibility, but discuss code smells or design flaws before changing.
- **Platform changes require discussion first.** Any changes to packages/ (engine, stdlib, world-model, parser-en-us, etc.) must be discussed with the user before implementation. Story-level changes (stories/) can proceed autonomously.

## Architecture Principles

### Item Portability

**Items are portable by default.** There is no `PortableTrait` - all items can be taken unless explicitly blocked. To make something non-portable, use `SceneryTrait` or handle it in the taking action's validation.

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
| TAKE/GET      | Move to inventory      | PortableTrait                 |
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

- Traits: `packages/world-model/src/traits/`
- Behaviors: `packages/world-model/src/behaviors/`
- Actions: `packages/stdlib/src/actions/standard/` (each action has action.ts, action-events.ts, action-data.ts)
- ADRs: `docs/architecture/adrs/`
- Work tracking: `docs/work/`
