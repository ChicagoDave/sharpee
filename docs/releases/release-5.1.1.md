# 5.1.1 — the ESM build, repaired

**Status**: PUBLISHED
**Published**: 2026-08-19
**Chord language**: 3.3.0
**Traces to**: [#276](https://github.com/ChicagoDave/sharpee/issues/276) · [#277](https://github.com/ChicagoDave/sharpee/issues/277) · [#279](https://github.com/ChicagoDave/sharpee/issues/279) · [#280](https://github.com/ChicagoDave/sharpee/issues/280)

## What shipped

A patch release almost entirely about the build. The ESM target was not being produced whole-tree,
which broke vitest's ability to resolve `dist-esm/` packages and, with it, the Chord Writer release
pipeline. The fix makes the ESM build default-on and derives vitest's workspace aliases instead of
requiring a prior `dist-esm` build.

## Notes

- Chord Writer 1.3.1 ships alongside, with its release pipeline working again.
- [#280](https://github.com/ChicagoDave/sharpee/issues/280): an opening card that could never be claimed.
- Full card sets and walkthroughs for the conversation stories, and The Ides of March moves.
- Author documentation for characters and conversation on sharpee.net, written against the syntax
  5.1.0 had just shipped.
