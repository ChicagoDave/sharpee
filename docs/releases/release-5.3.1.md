# 5.3.1 — the refactoring survey

**Status**: PUBLISHED
**Published**: 2026-09-10
**Chord language**: 3.6.0
**Traces to**: ADR-334 · ADR-335 · ADR-336 · ADR-337 · ADR-338 · ADR-339 · ADR-340 · ADR-342 · [#376](https://github.com/ChicagoDave/sharpee/issues/376)

## What shipped

A patch release carrying a structural survey of the platform: seven ADRs, each naming one package's
shape and fixing it. No author-visible syntax moved, which is why Chord stayed at 3.6.0 and this went
out as a patch rather than a minor.

## Notes

- ADR-334: the turn is a stage list. `game-engine.ts` gave up its turn helpers, one platform
  dispatcher and one enrichment funnel replaced duplicated pairs, and the package reorganized into
  `command/`, `install/`, `session/`, `ports/` and `introspection/`.
- ADR-342: the engine's root barrel narrows to a contract — 31 named exports, no `export *`. A type
  reachable only through a kept export's signature stays internal.
- ADR-337: the interceptor lifecycle has exactly one call site, the executor's phase runner, and one
  validation pipeline replaced two.
- ADR-338: `AuthorModel` became a proxy view of the live world rather than a parallel one.
- ADR-339: the character tick's seven sub-steps live beside the subsystems they belong to, as a list
  with per-step requirements, pinned by a test.
- ADR-340: `transcript-tester` and `branch-tester` share one assertion core instead of 1,129
  identical forked lines.
- Chord Writer 1.4.0 ships alongside.
