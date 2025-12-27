# Project Instructions for Claude

## Overview

Sharpee is a parser-based Interactive Fiction authoring tool built in Typescript.

## MAJOR DIRECTIONS

- Never delete files without confirmation. Not even "to get a build working" or "to get the other tests working".
- Never use batch scripts (sed/awk/grep) to modify multiple files. One file at a time.
- We never care about backward compatibility, but discuss code smells or design flaws before changing.

## Architecture Principles

### Language Layer Separation
**All text output must go through the language layer.** Code in engine/stdlib/world-model emits semantic events with message IDs, not English strings. Actual prose lives in `lang-en-us` (or other language implementations).

- stdlib: Define message IDs in `*-messages.ts` files
- lang-en-us: Provide actual text via message ID → string/function mapping
- Never hardcode English strings in engine, stdlib, or world-model

### Logic Location
Be deliberate about where logic belongs:

| Layer | Responsibility | Examples |
|-------|---------------|----------|
| **engine** | Turn cycle, command execution, event dispatch | SchedulerService, NPC turn phase |
| **world-model** | Traits, behaviors, entity state | LightSourceBehavior, ContainerTrait |
| **stdlib** | Standard actions, common patterns | Opening action, guard behavior |
| **story** | Game-specific content and overrides | Custom NPCs, puzzle logic |
| **lang-{locale}** | All user-facing text | Error messages, descriptions |
| **client** | UI rendering, input handling | React components, terminal I/O |

Ask: "Where does this belong?" before implementing new features.

## Current Work: Project Dungeo (Dec 2025)

Dog-fooding Sharpee by implementing full Mainframe Zork (~191 rooms).

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

All 43 stdlib actions now follow three-phase pattern (validate/execute/report):
about, attacking, climbing, drinking, eating, opening, closing, pulling, pushing, taking, dropping, putting, inserting, removing, entering, exiting, going, looking, examining, waiting, locking, unlocking, switching_on, switching_off, wearing, taking_off, giving, throwing, touching, smelling, listening, talking, searching, reading, showing, sleeping, help, inventory, quitting, scoring, restarting, restoring, saving

## Core Concepts Reference

Read `/docs/reference/core-concepts.md` at the start of each session for:
- Entity system and creation
- Trait system and usage
- Three-phase action pattern (validate/execute/report)
- ActionContext and sharedData (NOT context pollution!)
- Behaviors vs Actions (behaviors own mutations, actions coordinate)
- Event system and handlers
- Reporting is done after a turn completes by a customized report service

## Testing Commands

- **DO NOT** use `2>&1` with pnpm commands - they don't work together properly
- Preferred format: `pnpm --filter '@sharpee/stdlib' test <test-name>`

## Project Structure

- Uses pnpm workspace with multiple packages
- Main packages: engine, stdlib, world-model, parser-en-us
- Actions follow validate/execute/report pattern (ADR-051)
- Event handlers for custom logic (ADR-052)

## Work Patterns

- Planning docs: `docs/work/{target}/`
- Work summaries: `docs/work/{target}/context/`
- **Plans**: Write plans to the current work target (NOT to ~/.claude/plans/)
- Logs: `logs/`
- Current branch `refactor/three-phase-complete` → work in `docs/work/phases/`

## Autonomous Work Flow

### Context Management
When context usage reaches ~15% remaining:
1. Write work summary to `docs/work/{target}/context/`
2. Commit and push all changes
3. Send ntfy: "Context low - work saved, need /compact to continue"
4. STOP and wait for user to run `/compact`
5. After compact, read the work summary back and continue

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
