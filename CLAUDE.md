# Project Instructions for Claude

## Overview

Sharpee is a parser-based Interactive Fiction authoring tool built in Typescript.

## MAJOR DIRECTIONS

- Never delete files without confirmation. Not even "to get a build working" or "to get the other tests working".
- Never use batch scripts (sed/awk/grep) to modify multiple files. One file at a time.
- We never care about backward compatibility, but discuss code smells or design flaws before changing.

## Current Work: Action Refactoring (as of Sept 2025)

We are systematically refactoring each stdlib action to the three-phase pattern (validate/execute/report).

**Process**: See `/docs/work/phases/action-refactoring-master-plan.md` - one action at a time under a magnifying glass with full analysis, design spec, implementation, review, signoff.

### Actions with Three-Phase Pattern (14 complete):
about, attacking, opening, closing, taking, dropping, putting, inserting, removing, entering, exiting, going, looking, examining

### Taking Action - In Progress
- Checklist: `/docs/work/taking/checklist.md`
- Phase 1-2 complete (analysis and design)
- Phase 3 blocked on ADR-064 (World Events) - needs `world.moveEntity()` to return MoveResult

### Key Issues Being Fixed:
1. **Context pollution**: Actions storing `_previousLocation` etc. directly on context
2. **Direct mutations**: Should use behaviors, not direct world calls
3. **Inconsistent patterns**: Some old two-phase, some incorrect three-phase

### ~33 Actions Still Needing Refactor:
climbing, drinking, eating, giving, help, inventory, listening, locking, unlocking, pulling, pushing, quitting, reading, restarting, restoring, saving, scoring, searching, showing, sleeping, smelling, switching_on, switching_off, taking_off, talking, throwing, touching, waiting, wearing

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
- Logs: `logs/`
- Current branch `refactor/three-phase-complete` → work in `docs/work/phases/`

## Key Locations

- Traits: `packages/world-model/src/traits/`
- Behaviors: `packages/world-model/src/behaviors/`
- Actions: `packages/stdlib/src/actions/standard/` (each action has action.ts, action-events.ts, action-data.ts)
- ADRs: `docs/architecture/adrs/`
- Work tracking: `docs/work/`
