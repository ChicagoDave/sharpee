# Plan — Honor the `entry:` transcript header in transcript-tester

**Date**: 2026-06-17
**Topic**: transcript-tester per-transcript story-entry selection
**Origin**: Research into familyzoo `v16-scoring` failure (session 90c6c2). The
transcript declares `entry: v16` but no runner consumes it, so it (and every
versioned familyzoo transcript) runs against the default export `index.js` →
`v17`. v16-scoring asserts a perfect score at 75 points; v17 raised the max to
100, so the assertion fails. The walkthrough is correct *for v16* — it is never
run against v16.

**Status**: PROPOSED — platform change (`@sharpee/transcript-tester`). Not yet
approved for implementation.

---

## Goal

Make both transcript runners honor an optional `entry:` header in a transcript:
when present, load the story from `dist/<entry>.js` or `dist/<entry>/index.js`
instead of the default `dist/index.js`. When absent, behavior is unchanged.

After this change:
- `v16-scoring` loads `dist/v16.js` (MAX_SCORE 75), reaches a perfect score, and
  passes.
- `v01`–`v15` continue to pass (they have no `entry:` → default `index.js` → v17,
  which is a cumulative superset, exactly as today).
- Transcripts in other stories (dungeo, etc.) are unaffected — none set `entry:`.

## Background — current wiring (verified)

- `parser.ts:98` stores every header as `transcript.header[key] = value`, so
  `entry` is **already parsed** into `transcript.header.entry`. Nothing reads it.
- `types.ts` `TranscriptHeader` does not declare `entry`.
- Two independent loaders, both hardcode `dist/index.js`:
  - `story-loader.ts` `loadStory(storyPath)` — used by `cli.ts` (slow path).
  - `fast-cli.ts` `loadStoryAndCreateGame(storyPath)` — used by the bundle
    (`dist/cli/sharpee.js --test`, the fast/default path).
- Both runners follow the same loop: load once before the loop, then per
  transcript: `parseTranscriptFile` → (if `!chain`) reload story → `runTranscript`.
  The parsed transcript — hence `header.entry` — is available at the reload point.

## Design

### 1. Shared entry resolution

Add a single resolver (in `story-loader.ts`, exported, reused by both paths) so
the two loaders cannot drift:

```
resolveStoryModulePath(storyPath, entry?) -> string
  no entry      -> <storyPath>/dist/index.js          (current behavior)
  entry given   -> first existing of:
                     <storyPath>/dist/<entry>.js        (file form, e.g. v16)
                     <storyPath>/dist/<entry>/index.js  (dir form, e.g. v17)
                     <storyPath>/src/<entry>.ts         (ts-node fallback)
                     <storyPath>/src/<entry>/index.ts
  none exist    -> throw with the entry name and the paths tried
```

`entry` is validated as a safe relative segment (no `/`, `\`, `..`, or absolute
paths) before being joined, so a transcript header cannot escape the story dir.

### 2. Thread `entry` through both loaders

- `loadStory(storyPath, entry?)` and `loadStoryAndCreateGame(storyPath, entry?)`
  take an optional `entry`, call the resolver, and `require` the resolved path.
  Existing call sites that pass no `entry` keep current behavior.
- In both runners' per-transcript reload (the `if (!options.chain)` branch),
  pass `transcript.header.entry`. This is the load-bearing change for familyzoo.

### 3. `--chain` semantics

In chain mode the story is loaded once and state persists; the story module
cannot change between transcripts. Decision:
- The initial pre-loop load uses the **first** transcript's `entry` (parse the
  first transcript before the initial load, or honor entry only in non-chain and
  ignore-with-warning in chain).
- If any transcript in a chain declares an `entry` different from the loaded
  module, emit a clear warning (or error under `--stop-on-failure`). Mixing
  versions in a stateful chain is unsupported by design.
- familyzoo's versioned transcripts are run individually (non-chain), so this is
  an edge-case guard, not the primary path.

### 4. Type + validation

- `types.ts`: add `entry?: string` to `TranscriptHeader`.
- `parser.ts` `validateTranscript`: optional — warn if `entry` is set but no
  matching module is resolvable (the loader already errors; the warning just
  surfaces it earlier).

## Behavior Statement — `resolveStoryModulePath`

- DOES: returns an absolute path to the story module to `require`, selecting
  `dist/<entry>.js` or `dist/<entry>/index.js` when `entry` is supplied, else
  `dist/index.js`.
- WHEN: called by both loaders before `require`, with the transcript's
  `header.entry` (or undefined).
- BECAUSE: a versioned tutorial (familyzoo) ships multiple story entry points in
  one package; a transcript must be able to pin the version it was authored for.
- REJECTS WHEN: `entry` contains a path separator, `..`, or is absolute (throws,
  not silently sanitized); or no candidate path exists (throws, listing tried
  paths).

## Tests (derived from the Behavior Statement)

Unit (`story-loader` resolver):
- entry `v16` resolves to `dist/v16.js` (file form).
- entry `v17` resolves to `dist/v17/index.js` (dir form).
- no entry resolves to `dist/index.js`.
- entry `../x`, `a/b`, `/etc/x` each throw (traversal rejected).
- nonexistent entry `v99` throws listing tried paths.

Integration (the real-path acceptance gate):
- Run the familyzoo transcript suite via both `cli.ts` and the bundle fast path:
  - `v16-scoring` now **passes** (loads v16, max 75, perfect score).
  - `v01`–`v15` still pass.
- Run dungeo's suite unchanged (no `entry:`) — no regression.
- `npm-test-familyzoo/run.sh` (after rebuilding the npm staging that bundles the
  patched transcript-tester) reports 16/16.

## Files to modify

- `packages/transcript-tester/src/types.ts` — add `entry?: string` to header.
- `packages/transcript-tester/src/story-loader.ts` — add `resolveStoryModulePath`;
  `loadStory(storyPath, entry?)`.
- `packages/transcript-tester/src/fast-cli.ts` — `loadStoryAndCreateGame(storyPath, entry?)`
  using the shared resolver; thread entry at the per-transcript reload.
- `packages/transcript-tester/src/cli.ts` — thread `transcript.header.entry` at
  the per-transcript reload.
- `packages/transcript-tester/src/parser.ts` — optional validation warning.
- Tests under `packages/transcript-tester/tests/` (or `__tests__`).

No familyzoo changes required — once `entry:` is honored, `v16-scoring` loads the
version it was written for. (Optional follow-up: audit other familyzoo
transcripts whose assertions diverge from v17.)

## ADR recommendation

Worth a short ADR (proposed **ADR-180**) — it establishes a test-authoring
contract that constrains future story structure and tooling: *a transcript may
pin a story sub-entry via `entry:`, resolved as `dist/<entry>.js` then
`dist/<entry>/index.js`.* Decision/Context/Consequences are small; recommend
filing alongside implementation.

## Open questions

1. **Chain + differing entries** — warn, or hard error? (Proposed: warn; error
   under `--stop-on-failure`.)
2. **Play mode `--entry` flag** — add a CLI `--entry` so `--play`/`--restore` can
   target a version too? (Proposed: out of scope; add later if needed.)
3. **ADR now or after** — file ADR-180 with the change, or land code first?

## Rollback

Additive and default-preserving: transcripts without `entry:` are byte-for-byte
unaffected. Revert is the commit; no data/state migration.
