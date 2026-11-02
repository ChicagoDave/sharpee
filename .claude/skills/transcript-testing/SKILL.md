---
name: transcript-testing
description: Run Sharpee transcript tests and interactive play through the CLI bundle (dist/cli/sharpee.js) — the --test, --chain, --play and --exec invocations, story selection rules (no default story), walkthrough chains and unit transcripts. Use when running, chaining, or probing any .transcript file or playing a story from the terminal.
---

# Transcript Testing — always use the bundle

**CRITICAL**: Always use the bundle (`dist/cli/sharpee.js`) for transcript testing. It loads instantly (~170ms) vs the slow package version (~5+ seconds). Build it first with `./repokit build dungeo` (the `repokit-build` skill has the full build reference).

```bash
# CORRECT — Use bundle for ALL transcript testing
node dist/cli/sharpee.js --test stories/dungeo/walkthroughs/wt-01-get-torch-early.transcript

# Run walkthrough chain (state persists between transcripts)
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript

# Interactive play mode (--story required — there is NO default story)
node dist/cli/sharpee.js --play --story stories/dungeo

# WRONG — Don't use this (5x slower, loads all packages)
# node packages/transcript-tester/dist/cli.js stories/dungeo ...
```

## Story selection (no default)

The old `stories/dungeo` default is removed (2026-07-19). For `--test`, the story is
inferred from the transcript paths' `stories/<name>/` prefix (mixed prefixes = hard
error; a lone `.story` file in that directory is preferred over a compiled dist).
`--play`/`--exec` require an explicit `--story <dir | .story file>`; for Chord stories
pass the `.story` FILE (e.g. `branch-stories/fernhill/fernhill.story`), not the directory.

## Walkthrough testing

Walkthrough transcripts (`wt-*`) must be run with `--chain` to preserve game state.

```bash
# Stop on first failure
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure
```

Chain runs are deterministic at the pinned seed: results are identical run-to-run (only
wall-clock timings vary). A single run is sufficient; never re-run the chain to "check
for flakiness" (ADR-293 Phase D, verified 3× byte-identical 2026-08-02).

## Unit transcript testing

Transcripts live in `stories/{story}/tests/transcripts/*.transcript`.

```bash
# Run single unit test transcript
node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/rug-trapdoor.transcript

# Run all unit test transcripts
node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/*.transcript
```

## Probing for exact command lists

Combat sequences are exact pinned-seed counts, not padding. Derive the required command
list by probing with `--exec`, or pin a specific outcome with the `forces:`/`point-seed:`
header fields (ADR-293 Phase C). Never add surplus attack commands "for safety."

## The rules that stay in the root CLAUDE.md

The Dungeo regression-floor rule and the "Don't modify working transcripts" rules are
always-loaded in the root `CLAUDE.md`; this skill carries only the commands. The full
transcript grammar (syntax, assertions, directives, CLI flags) is
`docs/core-concepts/transcript-testing.md`.
