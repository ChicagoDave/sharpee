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
./build.sh -s dungeo -c browser               # Build for web browser
./build.sh -s dungeo -c zifmia                # Build Zifmia client (bundle + runner)
./build.sh -s dungeo -c zifmia -t modern-dark # Zifmia with dark theme
./build.sh -s dungeo -c browser -c zifmia     # Build both clients
./build.sh --skip stdlib -s dungeo            # Resume from stdlib package
```

**Available Themes** (for `-t` flag):
- `classic-light` — Literata font, warm light tones (default)
- `modern-dark` — Inter font, Catppuccin Mocha colors
- `retro-terminal` — JetBrains Mono, green phosphor
- `paper` — Crimson Text, high contrast

**Outputs**:
- `dist/cli/sharpee.js` — Platform bundle (CLI, testing)
- `dist/web/{story}/` — Browser client
- `dist/web/{story}-react/` — React client

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
- Current branch `dungeo` → work in `docs/work/dungeo/`.

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
- Actions: `packages/stdlib/src/actions/standard/` (each action has `action.ts`, `action-events.ts`, `action-data.ts`)
- ADRs: `docs/architecture/adrs/`
- Work tracking: `docs/work/`

<!-- devarch:start -->
<!--
  DevArch Agent Lifecycle Rules — Base (v3.2.0)
  Generated by: devarch init
  Activate additional capabilities with: devarch activate <capability>
-->

# Agent Lifecycle Rules

These rules tell you WHEN to invoke agents. The agents handle HOW.
Skip any rule if the user explicitly asks you not to.

## Note on Prompt Literalism

These rules are tuned for Claude Opus 4.7+, which follows instructions literally. Apply that lens:

- **Triggers and overrides.** A trigger fires unless an override states an explicit file/path/scope exclusion. Vague carve-outs ("use judgment") mean *prefer skipping the rule* — when in doubt, skip rather than apply broadly.
- **Templates and required sections.** When a template requires sections, fill each section with one line if the content is sparse. Do not pad to fill the form. "Comprehensive" never means "long."
- **Multi-part user instructions.** Treat each clause as a distinct step in order. Mode transitions do not consume remaining steps.
- **Output discipline.** Default to one sentence per point. Bullets only when a list of three or more peer items earns them. No headers in short replies.

## Session Start

Before doing any work on the user's first request:

1. **Note the Session ID** from the SessionStart hook output: `[Session ID: ...]`. This 6-character hex ID uniquely identifies this session. All session state is stored in `docs/context/.session-state-{id}.json`. The gate file is `docs/context/.devarch-gate-{id}`. Use this ID when passing context to agents (work-summary-writer, commit-remote, etc.).

2. **Read the previous session file** if the SessionStart hook output includes `[Previous session: ...]`. Use the path provided to read the file, then **present a 2-3 line recap** to the user: what was accomplished, current status, and any blockers or next steps. If the file is a stub (just template placeholders), say so briefly and move on.
   > Note: The SessionStart hook injects context at launch, but Claude cannot respond until the user sends a message. The recap is presented as part of handling the first prompt. Users can also type `/recap` at any time.

3. **Run the `pre-session-audit` agent** to surface blockers, type errors, stale artifacts, and context from prior sessions.

4. Check if `docs/context/project-profile.md` exists and is less than 7 days old.
   If missing or stale, run the `dev-context-detector` agent to generate it.

## Planning

5. When the user states a **non-trivial goal** (new feature, cross-cutting change, multi-file refactor), run the `session-planner` agent before starting implementation. The planner decomposes the goal into session-sized phases and writes `docs/context/plan.md`.
   - **Skip planning** for trivial goals: typo fix, config tweak, single-function change, or when the user says "just do it."
   - If `docs/context/plan.md` already exists with a CURRENT phase, resume that phase — do not re-plan.
   - The session-planner archives the plan to `docs/work/` automatically.
   - **Never proceed from planning to implementation without explicit user permission.** After the planner returns, present the plan and ask the user how they want to proceed.

## Coding Discipline

These rules apply whenever you write or modify code. They are not optional — they define the minimum quality bar for all code produced in this project.

### Invariants and Variants

6. Before writing a function, module, or class, **identify its invariants** — conditions that must always hold — and its **variants** — the dimensions that legitimately change.
   - State invariants as assertions, guard clauses, or type constraints in the code. Do not leave them as comments alone.
   - When an invariant is violated by a proposed change, flag the conflict before proceeding. Do not silently weaken the invariant.
   - Variants should be parameters, configuration, or strategy patterns — not conditional branches buried in core logic.

### Cohesive Modularity

7. Each module, class, or function should have **one reason to change**. If you find yourself modifying a unit for two unrelated purposes, split it.
   - Group related data and behavior together. A function that reads data, transforms it, and writes it to a different store is doing three things.
   - Cross-cutting concerns (logging, auth, retry logic) must be explicit — middleware, decorators, or clearly named utility functions. Do not weave them into business logic.

### Clear Boundaries

8. Every module exposes an **intentional public interface**. Internal state and helper functions are not part of that interface.
   - Use the language's visibility mechanisms (private, internal, unexported, `_`-prefixed) to enforce boundaries.
   - When a boundary does not exist and you are adding new code, create one. Do not add to an already-leaking abstraction without tightening it.
   - Dependencies flow inward: domain logic does not import infrastructure. Infrastructure adapts to domain interfaces.

### Boundary Statements

8a. When modifying a file under one of these path patterns, **produce a Boundary Statement** in the conversation before editing:

    - `**/state/**`, `**/stores/**`, `**/store/**`
    - `**/reducers/**`, `**/slices/**`
    - `**/projections/**`, `**/read-models/**`
    - `**/selectors/**`
    - `**/domain/**` (when the project uses DDD — i.e., `docs/ddd/notation.yaml` exists)

    Statement format:

    - OWNER: which layer owns this? (server, browser/per-render, bounded context, infrastructure, etc.)
    - SHARED?: would two consumers in the same context legitimately disagree on this value? If yes, it is per-consumer state and likely belongs out of this module.
    - PROMISE: does the module's header doc or its existing types make a promise this change would break? Quote it.
    - ALTERNATIVES: what is the smallest place this could live instead, and why is this module still the right home?

    Skip when the change is a typo, comment, formatting, import reordering, or rename-only. The `boundary-check` hook fires on Edit/Write to these paths as an advisory reminder. If any answer is fuzzy, stop and discuss the design before editing.

### Co-Located Wire-Type Sharing

8b. When a client and a server share a wire protocol and live in the same repository under the same typed language, they **MUST share the protocol's type definitions via direct import** — not through duplication, hand-synchronized interfaces, runtime JSON schemas, or codegen.
    - **Why:** Protocol drift between co-located client and server is mechanically preventable. A direct import makes a server-side type change either compile the client in the same commit or fail the type checker in the same commit. Any weaker coupling introduces a window in which one side is wrong and CI doesn't know.
    - **How to apply:**
      - Extract wire primitives (message envelopes, event shapes, discriminators, enums) into a file with a documented invariant: **no runtime-specific types** (`Buffer`, `fs.Stats`, `DOMException`, etc.). Both sides must import the file without dragging in a runtime they don't have.
      - Both client and server import from that file. No re-declaration. No re-export chains that could diverge.
      - If client and server live in separate build projects, wire project references or path aliases so a single build step checks both.
    - **Does not apply:** across repository boundaries (use a schema format), across language boundaries (use codegen), or to external-SDK public protocols where explicit versioning is the point.
    - **Fixup:** If you find duplicate wire types during a session, extract them into a shared file and update both sides in one commit.

### Documentation Standards

9. Every file begins with a **header comment** that states: the module's purpose (one sentence), its public interface (what callers use), and its owner context (which bounded context or system area it belongs to).
   - Use the language's standard doc format: JSDoc for JS/TS, docstrings for Python, XML comments for C#, GoDoc for Go.
   - Every public function or method gets a **method header**: a one-line summary of what it does, its parameters and return value, and any exceptions or error conditions.
   - Do not document private internals unless the logic is genuinely non-obvious. Self-explanatory code does not need comments — but interfaces, contracts, and side effects always do.
   - When modifying an existing file that lacks headers, add them to the functions you touch. Do not leave a file worse than you found it.

### Command and Event Definition

10. **Commands** are operations that change state. **Events** are observable facts that something happened. Name them accordingly.
   - Commands: imperative verb phrases — `PlaceOrder`, `CloseAccount`, `AssignDriver`. They express intent.
   - Events: past-tense verb phrases — `OrderPlaced`, `AccountClosed`, `DriverAssigned`. They express outcome.
   - Every command handler should produce at least one event or explicitly reject the command. Silent state changes are bugs.
   - When the project has a notation file (`docs/ddd/notation.yaml`), use its vocabulary. When it does not, use this naming discipline anyway — it clarifies design regardless of whether DDD is in use.

### Architecture Decision Records

11. When a decision **constrains future sessions** — technology choice, boundary placement, pattern adoption, dependency direction, trade-off resolution — ask: "ADR-worthy?" If the user confirms, write it to `docs/adrs/NNNN-title.md` with four sections: **Context** (why we faced this choice), **Decision** (what we chose), **Consequences** (what this constrains going forward), and **Session** (which session produced it). Number sequentially starting from 0001. Link the ADR from the session summary's Key Decisions section.
    - If the user narrows the scope, write the ADR to cover only what they specified.
    - Do not ask for trivial decisions (variable names, formatting, local refactors). The bar is: would a future session need to know this to avoid re-litigating it?

### Behavior Statements, Test Derivation, and Test Grading

12. After writing or modifying a function, command handler, or module with side effects, **produce a Behavior Statement** in the conversation before writing any tests. Use this format:

    **[function/module name]**
    - DOES: [what state it changes — be specific: "persists an Order record with status 'placed' to the database", not "saves the order"]
    - WHEN: [under what conditions — inputs, preconditions, triggering events]
    - BECAUSE: [why this mutation matters — the business rule or invariant it upholds]
    - REJECTS WHEN: [conditions that cause it to refuse or fail — and how it signals rejection]

    This is not a code comment. It is a thinking step performed in the conversation between writing code and writing tests. Every line in the DOES and REJECTS WHEN sections becomes a test assertion. If you cannot state what the code DOES in concrete, assertable terms, the code is unclear and should be revised before testing.

13. **Derive tests directly from the Behavior Statement.** Each DOES line becomes a functional test. Each REJECTS WHEN line becomes a rejection test. Each WHEN condition becomes a scenario boundary.
    - The test MUST assert on the state change named in the DOES line — not on return values alone, not on mocks, not on whether the function threw.
    - If the DOES line says "persists an Order record," the test queries the database after the call and asserts on the persisted record. If it says "emits an OrderPlaced event," the test asserts on the event payload.
    - Every scenario from the session plan gets at least one behavioral test that exercises the full path described in the plan. Behavioral tests express business language and test outcomes, not implementation.

    **After writing the test suite for a behavior, grade the suite once.** Mention only failures — do not narrate passing tests. Categories:

    - **RED** (rewrite immediately): tautological assertions (`expect(true).toBe(true)` or any assertion on a hardcoded value), zero-assertion bodies, console/print debugging leftovers, mock-only assertions that never check state.
    - **YELLOW** (fix before commit): asserts on return value but not on mutated state; asserts on event emission but not on the state change the event represents; "didn't throw" as the primary assertion for a state-mutating function; assertions that cannot fail (testing default state without first changing it).
    - **GREEN** (ships): asserts on actual state mutation; asserts on rejection with specific error conditions; each assertion traces back to a DOES or REJECTS WHEN line.

    Only ship GREEN suites. If a test grades RED or YELLOW, rewrite it inline and continue — do not produce a separate grading report unless asked.

### Integration Reality

13a. When a unit of work is an **integration with an owned dependency** — anything this repository ships, spawns, bundles, migrates, or deploys (subprocess binaries, runtimes, libraries, schema migrations, generated artifacts) — produce an **Integration Reality Statement** in the conversation before declaring the work complete.

    Format:

    **[integration name]**
    - OWNED: dependencies this repo controls — subprocesses it spawns, binaries it bundles, migrations it runs, artifacts it generates
    - EXTERNAL: dependencies outside the repo's control — third-party APIs, cloud SDKs, services called over the network
    - REAL-PATH TEST: for each OWNED entry, name the test that exercises it without injection, override, or stub. If absent for any entry, the integration is **not** complete
    - STUB JUSTIFICATION: tests that use a stub, fake, mock, or echo of an OWNED dependency, with the reason — each must reference a REAL-PATH TEST that backs it

    A test that drives a hand-written replacement for an owned dependency is a *scaffolding* test. Scaffolding tests are useful for fast iteration but cannot serve as the acceptance gate for a phase named after the integration. **A phase whose name contains *integration, engine, runtime, sandbox, subprocess, database, migration, deploy* must have at least one REAL-PATH TEST executed against the production code path.** "Carve-out" is never a valid modifier of "complete."

    If the real path cannot be tested ("too hard to spin up"), fix the harness — ephemeral sandbox, seeded DB, test container, websocat driver — do not swap in a stub. A stub of an owned dependency silently reclassifies the integration risk as "untested." The system under test cannot be the thing you wrote to stand in for the system under test.

14. **Do not commit code without running the existing test suite.** If tests fail, fix them before proceeding. If a test is genuinely obsolete due to an intentional design change, update or remove it — do not skip it.
    - When the `mutation-verification` agent runs, it checks that tests assert on actual state changes. If it reports missing test coverage for a mutation, write the test before moving on.

## During Work

15. After you **Edit or Write a source file containing a side-effect function**, verify you produced a **Behavior Statement** (rule 12) for any new or changed side-effect functions, then run the `mutation-verification` agent on the changed files.
    - **Source files only.** Do NOT fire for paths matching: `*.md`, `*.yaml`, `*.yml`, `*.json`, `*.toml`, `*.txt`, `*.html`, `*.css`, hook scripts under `docs/workflow/hooks/`, or test files (`*.test.*`, `*.spec.*`, `__tests__/**`, `*_test.go`, `*_test.py`).
    - **Function-name signal.** A "side-effect function" is one whose name matches `execute|handle|process|save|update|delete|remove|create|send|dispatch|publish|persist|submit|store` AND lives in a source file per the rule above. Both signals must hold; otherwise skip.
    - Run at most once per logical unit of work — once after implementing a feature, not per individual edit.

16. During **long sessions with significant work**, run the `session-checkpoint` agent roughly every 60 minutes of active development.
    - Signs it's time: multiple features completed, approach pivots, or you notice scope drift.
    - Do not interrupt flow for trivial sessions.

17. If a PostToolUse hook emits a **`[Budget ...]`** message, acknowledge it briefly and adjust behavior:
    - At **70%**: Mention it, assess progress on the current phase.
    - At **90%+**: Prioritize wrapping up over starting new sub-tasks. Begin summarizing and committing.
    - At **100%**: Stop new work. Summarize, commit, and hand off.

## Session End

18. **Session-end signals** — ANY of the following trigger the `work-summary-writer` prerequisite:
    - Explicit: "done", "wrap up", "goodbye", "that's it", "moving on", "end session"
    - Commit/push: "commit", "commit remote", "push", "ship it", "land it"
    - Skills: /finalize, /fin, or any invocation that ends with a git push
    - When triggered: check if a substantive work summary exists for this session. If not, run `work-summary-writer` BEFORE the commit/push. Stage the summary with the commit.
    - Exception: skip if the user says "no summary" or "skip the summary."
    - Also run proactively if context is getting large and compaction is likely.

19. After the work summary is written:
    - The `work-summary-writer` automatically invokes the `capability-sniffer` agent. If it suggests a capability activation, relay the suggestion to the user.
    - Check the summary's **Status** field. If INCOMPLETE or BLOCKED, or if blockers were encountered during the session, run the `pattern-recurrence-detector` agent to check for recurring issues.

## Rules of Engagement

- These agents run in the background where possible. Do not ask permission — just run them.
- If an agent finds nothing notable, mention it briefly and move on. Do not make the developer read empty reports.
- If the user says "skip the audit" or "no summary needed", respect that for the current session.
- Never run the same agent twice for the same trigger in one session unless conditions changed.
- **Honor compound instructions fully.** When the user gives multi-part instructions (e.g., "plan this, but write a work summary before implementing"), treat each part as a distinct step and execute them in order. Mode transitions — entering or exiting plan mode — do not replace or consume remaining steps. If the user says "do X, then Y before Z," complete Y before starting Z.
<!-- devarch:end -->
