# Findings — @sharpee/story-runtime-baseline

## Author-relevance
Platform-internal (ADR-178). A two-symbol manifest declaring which packages a `.sharpee` story bundle may import. The book would reference it only conceptually — "these are the packages guaranteed available to a bundled story" — not as an API authors call.

## Naming
Clean. `STORY_RUNTIME_BASELINE`, `BASELINE_VERSION` — fully spelled out, SCREAMING_SNAKE_CASE appropriate for module-level constants, no abbreviations.

## Should-be-internal
None obvious — both exports are the package's entire reason to exist. The whole package is build-pipeline infrastructure, but its surface is intentionally minimal.

## API shape
Minimal and well-typed. `STORY_RUNTIME_BASELINE: ReadonlyArray<string>` (correctly immutable), `BASELINE_VERSION = 1` (literal-typed const). No `any`, no functions, nothing loose. The string-array baseline could arguably be a typed union of known package names rather than `string[]`, but that would couple it tightly to the package set — `ReadonlyArray<string>` is a defensible choice.

## Documentation (TSDoc)
**100%** — the package header documents both constants, the amendment/bump procedure, and the ADR linkage. Nothing undocumented.

## Book highlights
n/a — internal. Could appear in a "what ships with a story bundle" reference table, citing `STORY_RUNTIME_BASELINE` as the authoritative list, but it is not a programmer-layer API.
