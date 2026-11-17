# Plan: ISSUE-059 — Transcript tester `story:` header field is metadata-only

## Problem
The `story:` field in transcript headers is not used by the runner to load the story. Authors must always pass `--story <path>` on the CLI.

## Scope
- Severity: Low (DX)
- Component: transcript-tester
- Blast radius: CLI behavior change — backward compatible (--story flag still works)

## Steps

1. **Read the transcript parser**
   - `packages/transcript-tester/src/parser.ts` — how headers are parsed
   - `packages/transcript-tester/src/runner.ts` or `fast-cli.ts` — how --story is handled
   - Confirm `story:` is parsed but unused

2. **Design the resolution logic**
   - When `--story` flag is provided: use it (existing behavior, takes precedence)
   - When `--story` is not provided: read `story:` from transcript header
   - Resolution: `story: dungeo` -> `stories/dungeo`, `story: familyzoo` -> `tutorials/familyzoo`
   - Need a mapping or convention for story name -> path

3. **Implement**
   - In the CLI entry point, after parsing the transcript header, check for `story:` field
   - If present and no `--story` flag, resolve the story path
   - Pass resolved path to the runner

4. **Handle edge cases**
   - Multiple transcripts with different `story:` values in the same run — error or use first?
   - `story:` value doesn't match any known story path — clear error message
   - Chained transcripts — all must have same story (or story from first transcript is used)

5. **Test**
   - Run a transcript without `--story` flag, relying on `story:` header
   - Verify `--story` flag still overrides header
   - Verify error message when `story:` path is invalid

## Effort Estimate
Small — < 1 session. Straightforward CLI enhancement.

## Dependencies
None.

## Risks
- Story name -> path mapping might be fragile if stories move
- Need to handle the case where story: value is a full path vs a short name
