# AC-5 Synthetic Fixture — Spec (Phase 1 prose; `.story` authored in Phase 2)

`cloak.story` uses no random construct, so AC-5 (seeded-RNG determinism:
byte-identical repeated runs with a fixed seed) needs a small synthetic
fixture. The `.story` file cannot be written until the parser exists; this
spec pins what it must exercise so Phase 2 authors it and Phase 5 gates on it.

## Fixture: `packages/chord/tests/fixtures/ac5-random.story`

A two-room story exercising **both** random forms in the closed grammar:

1. **`randomly` phrase strategy** — one `define phrase` with the `randomly`
   adverb and at least three variants, emitted by a `when the player enters
   <room>` rule, so repeated entries draw from the seeded stream.
2. **`one chance in <n>`** — one `when` rule guarded by `one chance in 3`
   (or the design.md canonical form) that emits a distinct phrase, so the
   hit/miss pattern across turns is seed-determined.

Shape (subject to Phase 2 grammar reality): two rooms connected east/west;
each crossing triggers the `randomly` phrase; the chance-guarded rule fires
on a fixed-seed-determined subset of crossings. No states, no ordinals, no
hatches — randomness must be the only nondeterminism source in the file.

## Gate (Phase 5)

With a fixed seed, two runs of the same command script (~20 crossings)
produce **byte-identical** output; both random forms must draw from
`SeededRandom` (`@sharpee/core`, `packages/core/src/random/seeded-random.ts`)
— never `Math.random`. Verified as a Vitest determinism test (run twice,
diff output) and/or a `.transcript` under the fixture directory once Phase 6
wires the CLI.
