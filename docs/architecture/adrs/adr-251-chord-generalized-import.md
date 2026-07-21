# ADR-251: Chord generalized `import` — multi-file story sources

## Status: ACCEPTED + IMPLEMENTED (2026-07-21 — all five decisions ruled by David directly, session eb743f: story block main-file-only; imports carry complete declarations only, no partials; `.chord` extension assumed; no nested imports; single bare `import "<file>"` folding `import phrasebook`; compiler appends `.chord`, resolver stays dumb. No Open Questions. adr-review 13/15 same-session → both FAILs closed by the `## Acceptance` worked-example section added before the flip. Supersedes ADR-250 D2 in part; ADR-250 carries a supersession pointer here. IMPLEMENTED same session via `docs/work/adr-251-generalized-import/plan.md` Phases 1–4, David-gated per phase: chord parser/AST/splice/diagnostics + devkit fs resolver + browser inline-bundle resolver; regression green — chord 452, devkit 45, dungeo `--browser` clean, fernhill 496/496. One correction folded back mid-implementation: the "both hosts already wire `importResolver`" claim in Consequences was false — neither did; both were wired in Phases 2–3.)

## Date: 2026-07-21

## Parent: ADR-245 (phrasebooks — parked the generalized `import` for its own ADR: "Once `import phrasebook <file>` exists, `import <file>` for any story source … is the obvious generalization … it wants its own ADR when taken up"). Supersedes ADR-250 D2 in part (see Consequences). Contracts honored: ADR-210 (Chord `.story` author language; interpreter-primary, IR-centric), ADR-249 (comments — fragment files may carry them).

## Context

ADR-245 introduced phrasebooks and, alongside them, `import phrasebook
"<file>"` as the author's file-organization axis. It deliberately parked
the *general* case — importing any story source, not just phrasebook
blocks — for a dedicated ADR, and required the phrasebook design to
"shape `import` so the keyword generalizes rather than becoming a
one-off." ADR-250 D2 did exactly that: it made `import` a `TOP_KEYWORD`,
parsed the typed sub-word form `import phrasebook "<file>"`, and
explicitly **reserved bare `import "<file>"`** for this ADR (its
`parse.import-form` diagnostic points here).

So this is not greenfield. The shipped seam (verified against source,
2026-07-21):

1. **`import` is already a live top-level keyword.**
   `TOP_KEYWORDS` in `packages/chord/src/parser.ts:115` includes
   `import`; the `case 'import'` branch (line 270) parses today's
   `import phrasebook "<file>"` into an `ImportPhrasebookDecl`
   (`ast.ts:136`).
2. **Splice-at-site already exists.** `compile(source, { importResolver
   })` in `packages/chord/src/index.ts` runs `resolvePhrasebookImports`
   *before* analysis: each import is replaced in place by the imported
   file's `define phrasebook` blocks — "import site = arbitration
   position." The host provides `importResolver: (path) => string |
   null` (fs for `sharpee compose`, a bundle map for the browser's
   compile-at-boot).
3. **The narrow rules are diagnostics, not architecture.** Today a
   fragment must contain *only* `define phrasebook` blocks
   (`analysis.import-fragment-content`); a missing file is
   `analysis.import-unresolved`; the imported file uses `.story`. These
   are the exact constraints this ADR widens.

The generalization ADR-245 flagged has real questions — what a fragment
may contain, ordering across files, cross-file diagnostics, and how the
two compile hosts handle multiple sources. David ruled all of them
directly (below); the result is a single, small widening of the existing
splice seam rather than a new subsystem.

## Decision

### D1 — One bare `import "<file>"`; `import phrasebook` folds in

The general spelling is the reserved bare form:

```story
import "winter-voice"
import "regions/harbor"
```

`import phrasebook "<file>"` is **removed** as a distinct form. A
phrasebook block is just one more complete declaration the importer
splices, so a file of `define phrasebook` blocks imports through the same
bare `import` — its blocks land at the import site and take their
arbitration position there, exactly as before. There is one `import`
keyword and no typed sub-words: a fragment file is not "one kind," so
typing the import by kind never fit the general case (a single `.chord`
may mix rooms, people, and phrasebooks).

`TOP_KEYWORDS` keeps `import`. The parser's `case 'import'` now expects
`STRING NL` directly (`"import" STRING NL`); `import` followed by a bare
word (the old `phrasebook` sub-word, or anything else) is
`parse.import-form`.

### D2 — `.chord` extension, assumed; compiler appends, resolver stays dumb

Importable fragment files are named `<name>.chord`. This is a distinct
extension from the main `.story` file — `.story` = the story (has the
`story` header, may import); `.chord` = an importable fragment (no
header, cannot import). **The extension is assumed and never spelled in
source:** `import "winter-voice"` on disk is `winter-voice.chord`.

The **compiler appends `.chord`** to the import string before calling the
host, so `importResolver` receives the full `"winter-voice.chord"` and
does nothing but map name → text. `.chord` is thus a language fact, not a
host convention; both hosts (`sharpee compose` fs, browser bundle map)
stay dumb. Paths resolve relative to the importing story file's
directory (unchanged from ADR-250).

### D3 — Imports carry complete declarations only; no partials; no `story`; no `import`

A `.chord` fragment may contain **any complete top-level declaration** a
story file may — `create`, `define phrase`, `define phrasebook`,
`when`/`once`/`every` rules, comments (ADR-249) — with three hard
exclusions:

- **No `story` block** — the story header lives only in the main `.story`
  file (single home for story identity/config). A `story` block in a
  fragment is a diagnostic.
- **No `import` line** — imports do not nest (D5). An `import` inside a
  fragment is a diagnostic.
- **No partials** — a fragment holds *whole* declarations; a declaration
  is never split across files. (The parser already rejects a half-block,
  so this is enforced by construction plus an explicit content check.)

This widens ADR-250's phrasebook-only `analysis.import-fragment-content`
to "complete declarations, minus `story`, minus `import`."

### D4 — Splice-in-place before analysis is the whole semantic model

The compiler replaces each `import "x"` line in the main file with the
complete declarations from `x.chord`, **at that exact position**, then
analyzes and builds IR from the assembled whole. Downstream, everything
behaves *exactly as if the author had pasted the fragment's contents at
the import line*. This is the existing `import phrasebook` mechanism,
now general. It settles three would-be questions with no new rule:

- **Ordering / arbitration** is inherited per kind: phrasebooks arbitrate
  by spliced position (ADR-245/250), `when`/`once`/`every` rules fire in
  spliced order, `create` declarations stay order-independent.
- **Collisions** reuse the existing analyzer: a duplicate entity id
  across a fragment and the main story is the *same* duplicate-declaration
  error as within one file — caught post-splice, no cross-file special
  case.
- **Cross-file references** are free: spliced in place, a fragment and the
  main story share one namespace, so a fragment references story
  entities/states with no binding rules of its own. (This generalizes
  ADR-250's existing "fragments may reference story entities" allowance.)

### D5 — Flat only; no nested imports; cycles impossible by construction

Only the main `.story` file may carry `import` lines. A `.chord` fragment
cannot import (D3). Import is therefore one level deep and **cycles
cannot arise** — no cycle detection, no `analysis.import-cycle`. Nesting
was rejected in favor of a model an author can hold in their head: the
main file lists its imports, and that list is the whole graph.

### D6 — Diagnostics

| id | when | severity |
| -- | ---- | -------- |
| `parse.import-form` | `import` not followed by `STRING NL` (bare word, missing string) | error |
| `analysis.import-unresolved` | resolver returned null for `<name>.chord` (or no resolver provided) | error |
| `analysis.import-fragment-story` | fragment contains a `story` block | error |
| `analysis.import-fragment-nested` | fragment contains an `import` line | error |
| `analysis.import-fragment-content` | fragment contains anything but complete story declarations + comments | error |

Cross-file span attribution keeps ADR-250's approach: fragment
diagnostics prefix the message with `[<name>.chord]` and carry the
fragment's own span; the unresolved-import diagnostic carries the import
line's span in the main file.

## Acceptance

**Worked example.** Main `harbor.story`:

```story
story ...
import "regions/harbor"
create lighthouse ...
```

`regions/harbor.chord`:

```story
create pier ...
create gull ...
when the player arrives at the pier ...
```

→ the compiler appends `.chord`, resolves `regions/harbor.chord` via the
host, and splices its three declarations at the `import` line before
analysis. The assembled story compiles exactly as if `pier`, `gull`, and
the `when` rule were written between `import` and `create lighthouse`:
all three entities/rules exist, the rule fires in its spliced order, and
the fragment freely references `lighthouse` or any story state (one
namespace, D4).

**Rejection cases** (one per D6 diagnostic — each a rejection test):

- import of a missing file → `analysis.import-unresolved`
- fragment containing a `story` block → `analysis.import-fragment-story`
- fragment containing its own `import` line → `analysis.import-fragment-nested`
- fragment containing a partial or non-declaration content → `analysis.import-fragment-content`
- `import` not followed by a string → `parse.import-form`

**Done when**: bare `import "<file>"` parses and splices any complete
fragment; `import phrasebook` no longer parses; the compiler resolves a
name it has appended `.chord` to; each rejection case above fires its
named diagnostic with correct cross-file span attribution; and the
existing phrasebook stories are migrated `.story`→`.chord` with the
extension dropped from the import string.

## Consequences

- **ADR-250 D2 is superseded in part.** Its typed `import phrasebook
  "<file>"` grammar (D1 here folds it into bare `import`) and its
  `.story` extension for imported fragments (D2 here makes it `.chord`)
  no longer hold. ADR-250 gets a supersession pointer to ADR-251 on
  acceptance; its remaining D2 content (splice-at-site, resolver seam,
  relative resolution) stands and is what this ADR generalizes.
- **The `import phrasebook` migration surface is tiny** (audited
  2026-07-21, plan Grounding): **no story** uses `import phrasebook` yet —
  the live sites are one test file (`packages/chord/tests/phrasebooks.test.ts`)
  plus two doc sections. Migration is: change `import phrasebook
  "x.story"` → `import "x"` (drop extension), rename any fixture fragment
  `.story` → `.chord`. Find-and-replace scale, not a redesign; the
  implementation plan owns it.
- **The parser/analyzer change is small**: one keyword branch narrows to
  `STRING NL`, one AST node generalizes (`ImportPhrasebookDecl` →
  `ImportDecl`), one splice function widens its content check, and two
  diagnostics split out of `analysis.import-fragment-content`. The host
  `importResolver` contract is unchanged except that it now receives a
  name already carrying `.chord`.
- **Author mental model gains multi-file stories cheaply**: a large story
  splits into a thin main `.story` (header + `import` manifest) plus
  region/character/voice `.chord` files, with zero new semantics to
  learn — "an import is a paste."
- **`sharpee compose` and browser compile-at-boot both need an
  `importResolver` wired** (corrected 2026-07-21 after a source audit —
  the earlier "already drive it" claim was wrong): today all four devkit
  `compile()` call sites and the browser template pass **zero** options,
  and `importResolver` is exercised only in `packages/chord`'s own tests.
  So the hosts gain real, unbuilt work — an fs-backed resolver for
  `sharpee compose`/devkit and a bundle-map resolver for the browser
  (plan Phases 2–3), not no-op verification. Neither needs recursion (D5);
  each resolves a `.chord` name the compiler hands it.
- This ADR **decides language + compile semantics only**. It authorizes
  no implementation — a separate plan, gated on David's go-ahead, owns
  the code change, the `import phrasebook` migration audit, and the E2E
  spine (per the ADR-first workflow).

## Session

Session eb743f (2026-07-21, branch chord-foundations). Authored directly
from David's five rulings in conversation (D1–D6), no interview skill
run — every open question ADR-245 parked was resolved in the same
session. Follows ADR-247's completion (session 99aee6) as the next parked
Open Item taken up.
