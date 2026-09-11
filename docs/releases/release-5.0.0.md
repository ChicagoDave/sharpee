# 5.0.0 — the testing surface is the tree

**Status**: PUBLISHED
**Published**: 2026-08-11
**Chord language**: 3.0.0
**Traces to**: ADR-307 · ADR-309 · [#248](https://github.com/ChicagoDave/sharpee/issues/248)

## What shipped

A new model for testing a story. ADR-307 replaced the transcript-shaped testing UX with a
tree document — one `<story-id>.tests.json` per story, where the tree *is* the model rather
than a view over something else — and `@sharpee/branch-tester` is the greenfield walker that
replays it against a real engine. Chord Writer's Testing tab became the play surface itself
rather than a panel beside one.

## Notes

- The tree document is a wire format with a schema, round-trip tests and discovery, shared by
  two consumers — the walker and the IDE — whose parity was signed off before the cutover.
- JSON is the source of truth for a story's tests; the old transcript-shaped IDE artifacts went
  away rather than being kept in parallel.
- ADR-309 made the IFID tool-owned: minted at story creation into `<story-name>.config.json`
  and rendered into the Chord header on save and build, so the compiler stopped asking authors
  for one.
- `@sharpee/transcript-tester` stays, and keeps owning the `.transcript` grammar for Sharpee's
  own hand-authored suites. The two runtimes are for different audiences.
