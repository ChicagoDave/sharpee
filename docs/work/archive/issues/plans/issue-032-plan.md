# Plan: ISSUE-032 — Version transcript needs update for DUNGEON name

## Problem
The version.transcript test expects "DUNGEO v" but the story was renamed to "DUNGEON" (full spelling).

## Scope
- Severity: Low
- Component: test
- Blast radius: Single transcript file

## Steps

1. **Find the transcript file**
   - Locate the version transcript (likely `stories/dungeo/tests/transcripts/version.transcript` or similar)

2. **Update the expected output**
   - Change "DUNGEO v" to "DUNGEON v" in the assertion

3. **Verify the story title**
   - Confirm the story's `StoryInfoTrait` or equivalent uses "DUNGEON" as the display name
   - If not, update the story info to match

4. **Run the transcript test**
   - `node dist/cli/sharpee.js --test <path-to-version-transcript>`
   - Confirm it passes

## Effort Estimate
Trivial — single-line change, < 5 minutes.

## Dependencies
None.

## Risks
None.
