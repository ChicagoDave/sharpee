# Plan: ISSUE-050 — Consolidate all Dungeo text into dungeo-en-us.ts

## Problem
English text strings in Dungeo are spread across many files (melee-messages.ts, npc-messages.ts, object-messages.ts, etc.). Consolidation would enable future i18n.

## Scope
- Severity: Low
- Component: dungeo (story)
- Blast radius: Story-only refactor, no platform changes

## Steps

1. **Inventory all text sources**
   - Catalog every file that contains player-facing English strings
   - Categories: melee, NPC, action, puzzle, object, scheduler, room descriptions, entity descriptions
   - Count total message IDs and strings

2. **Design the consolidation structure**
   - Option A: Single `dungeo-en-us.ts` file with sections
   - Option B: `dungeo-en-us/` directory with one file per category
   - Decision: Likely Option B given the volume (~7 categories, potentially hundreds of strings)

3. **Create the consolidated module**
   - Create `stories/dungeo/src/dungeo-en-us/` directory
   - Move strings into category files (melee.ts, npcs.ts, actions.ts, puzzles.ts, objects.ts, scheduler.ts, rooms.ts)
   - Export a unified message registry from `index.ts`

4. **Update all imports**
   - Update every file that currently defines inline strings to import from the consolidated module
   - One file at a time per CLAUDE.md rules

5. **Verify no behavioral changes**
   - Run full walkthrough chain: `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`
   - Run all unit transcripts: `node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/*.transcript`
   - All tests must pass unchanged

6. **Document the pattern**
   - Add a note to story organization docs about the `{story}-en-us/` convention
   - This becomes the template for future stories

## Effort Estimate
Large — 2-3 sessions. Mechanical but high volume. Must be done carefully to avoid breaking message references.

## Dependencies
None.

## Risks
- Missing a string reference would cause a runtime error (undefined message)
- Some strings may be computed (template literals with variables) — these need special handling
- Room descriptions may be defined inline in room creation files — need to decide if those move too
