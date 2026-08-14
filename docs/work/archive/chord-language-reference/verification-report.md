# Chord Language Reference — Verification Report

This report backs the central claim of `docs/reference/chord-language.md`:
**every example in the reference actually compiles (or fails exactly as
documented) against the real v1 Chord parser, and no example is hand-typed
drift.** It is reproducible — the two harness scripts below run against the
built `@sharpee/chord` package and the doc itself, so anyone can re-check the
claim rather than trust it.

Last run: 2026-07-14 (Phase 6 of `plan.md`), against `@sharpee/chord`
`packages/chord/dist/index.js` (chord v1, locked 2026-07-14, shipped npm 3.0.0).

## How to reproduce

```bash
# 1. Compile sweep — every fixture compiles clean, or fails with its asserted code
node docs/work/chord-language-reference/verify-examples.mjs

# 2. Traceability — every doc code block is a verbatim fixture excerpt (doc→fixture),
#    and every fixture is referenced by the doc (fixture→doc)
node docs/work/chord-language-reference/verify-traceability.mjs
```

Both exit `0` only when clean. `verify-examples.mjs` requires the built
compiler (`./repokit build`, or `pnpm --filter @sharpee/chord build`);
`verify-traceability.mjs` reads only the doc and the fixtures.

## Results

| Check | Script | Result |
|---|---|---|
| Fixtures compile as documented | `verify-examples.mjs` | **40 / 40** match expectation |
| Doc code blocks are verbatim excerpts | `verify-traceability.mjs` | **57 / 57** blocks verbatim |
| Fixtures are all referenced (no orphans) | `verify-traceability.mjs` | **40 / 40** referenced |

## Fixture inventory

40 fixtures under `docs/work/chord-language-reference/fixtures/`, one set per
chapter. 31 compile clean; 9 are expected-to-fail proofs asserting a specific
load-time gate fires.

| Directory | Chapter | Count | Kind |
|---|---|---|---|
| (root) `smoke.story` | §1 Reading a .story file | 1 | clean |
| `world/` | §2 Building your world | 9 | clean |
| `behavior/` | §3 Giving things behavior | 8 | 7 clean + 1 expected-fail |
| `flow/` | §4 Branching, iteration, progression | 7 | clean |
| `define/` | §5 Defining vocabulary and text | 7 | clean |
| `migration/` | §6.3 Migrating from removed constructs | 8 | expected-fail |

### Expected-fail fixtures (9)

Each asserts, via `fixtures/manifest.json`, that the compiler reports the named
diagnostic code. These are the reference's proof that a removed or misused
construct fails loudly with a fix-it, not silently.

| Fixture | Asserted code | Doc section |
|---|---|---|
| `behavior/closed-condition.story` | `analysis.closed-condition-selection` | §3.4, §5.1 |
| `migration/removed-when.story` | `parse.removed-when` | §6.3 |
| `migration/removed-once.story` | `parse.removed-once` | §6.3 |
| `migration/removed-every.story` | `parse.removed-every` | §6.3 |
| `migration/removed-flag.story` | `parse.removed-flag` | §6.3 |
| `migration/removed-flag-field.story` | `parse.removed-flag-field` | §6.3 |
| `migration/removed-if.story` | `parse.removed-if` | §6.3 |
| `migration/removed-score.story` | `parse.removed-score` | §6.3 |
| `migration/retired-ordered.story` | `parse.phrase-strategy-retired` | §6.3 |

## Conventions the traceability check enforces

- **doc → fixture.** Every ```` ```story ```` code block in the reference is
  immediately preceded by a `<!-- fixture: <relpath> -->` marker and is a
  verbatim excerpt of that fixture. "Verbatim" allows a uniform indentation
  shift, so a block nested inside a Markdown list (e.g. the inline-prose example
  in §3.7) still counts — relative structure is preserved, only the common
  leading indent differs.
- **fixture → doc.** Every fixture is referenced. A clean fixture is referenced
  by a `<!-- fixture: -->` marker on a code block. An expected-fail fixture is
  referenced instead by its diagnostic code appearing in the doc prose — the
  §6.3 migration table and the §3.4 gate discussion cite these by code, because
  a failing story is never shown as a passing code block. All 9 expected-fail
  fixtures' codes appear in the doc.

## Documented verification limitation

Hatch **binding** is out of scope for a pure-`compile()` harness (§5.5). The
compiler validates a `define text|action|behavior … from "<module>"` line and
its marker binding, but does not load the referenced TypeScript module — that
happens at story-load time under the author's own build. So the `.story` side of
every hatch example is verified here; the TypeScript stubs shown in §5.5–§5.6 are
illustrative and checked by the author's toolchain, not by this harness. This is
the only construct in the reference whose runtime behavior the sweep does not
exercise end-to-end.
