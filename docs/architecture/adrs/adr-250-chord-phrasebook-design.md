# ADR-250: Chord phrasebook design — grammar, IR, resolution seam, variant state

## Status: ACCEPTED (2026-07-21 — David, "proceed", closing the Phase 3 gate of docs/work/adr-245-phrasebooks/plan.md: ACCEPTED flip + platform-change go-ahead in one. Zero Open Questions: the ADR-245 Q-2 dotted-key question was re-confirmed NOT legal ("we're not surfacing Sharpee constructs in Chord"); intent clarified (easier phrase blocks + predicated authorial voice; `use phrasebook` retained; default-phrasebook case named); adr-review clean after the used-book manifest-keys gap fix.)

## Date: 2026-07-21

## Parent: ADR-245 (phrasebooks — ruled intent, ACCEPTED). Contracts honored: ADR-240 (live derived state — the predicate seam), ADR-230 D5 (dotted-key replace semantics being layered), ADR-215/235 (`use` distribution surface; ADR-235's "zero implementation" claims are stale — the S3 slice landed in commits 7ff300ac/ca688adb), ADR-243 (story-person, DRAFT — the `{You}` slot family is designed but unimplemented), ADR-033 + ADR-196 (snapshot save + world-capability persistence: `TEXT_STATE`), ADR-210 Givens 6/7, ADR-249 (comments — book fragment files may carry them).

## Context

ADR-245 rules what a phrasebook IS — a named, predicated collection of
ordinary phrase definitions, arbitrated first-match-in-declaration-order
per key, sitting between the story's `define phrase` table and the
platform default — and explicitly stops at intent: "Implementation
requires a follow-up design-level companion … Nothing may be built from
this ADR alone." This is that companion. It pins the grammar, the IR
and registry shapes, the exact resolution seam, the variant-state save
shape, the diagnostics, the affected-module list, and the E2E spine.

Three facts about the shipped platform (verified against source,
2026-07-21) shape every decision below:

1. **Every text-resolution level today is a single-slot map.** Platform
   defaults and story `define phrase` overrides share ONE
   `EnglishLanguageProvider.messages: Map<string,string>`
   (`language-provider.ts:36`); the ADR-230 D5 override is a plain
   `Map.set` at load (`loader.ts:611` → `addMessage`,
   `language-provider.ts:641`). Per-entity precedence is not a map
   layer at all — it is emit-time key-mangling in the Chord runtime
   (`runtime.ts:1805`: prefer `<entityId>.<key>` over `<key>`). A book
   layer with render-time predicates cannot be pre-flattened into that
   map; it must be a live lookup.
2. **The platform already has the two seams the books need.** ADR-240's
   one generic derived-state registry
   (`world.registerEvaluator(key, fn)` / `world.evaluate(key)` — one
   registry, key conventions owned by each read point, closures
   re-registered per load and never serialized) is exactly the shape a
   render-time book walk wants. And variant counters already persist in
   the `TEXT_STATE` world capability keyed `(entityId, messageKey)`
   (`game-engine.ts:237`, `english-assembler.ts:584` `selectChoice`),
   which saves/undoes with the world for free (ADR-033/196).
3. **Rendering is post-turn** (Given 6): `ProsePipeline.processTurn`
   renders the turn's events after execution. "Render time" for a book
   predicate therefore means "during the post-turn render pass, against
   the turn's final world state."

## Decision

### D1 — Block grammar: `define phrasebook`

```story
define phrasebook winter while the season is winter
  cold-returns, first-time:
    The cold finds you the moment you step out, and means it.
  or
    The cold again, familiar now.

  hearth-call, cycling:
    Somewhere behind you, the fire is still lit.
  or
    The house holds its warmth like a grudge.
end phrasebook
```

- Production: `define phrasebook NAME [ "while" condition ] NL … "end" "phrasebook" NL`.
  `NAME` is a single kebab-case WORD (ADR-245 ruling — same form as
  extension names; `while` is a structural word, so no name-boundary
  ambiguity). The block is `end`-terminated (the `define phrase` /
  `define trait` family).
- Entries are today's per-entity phrase-override grammar verbatim:
  `<key>[, strategy]:` + indented prose + same-indent `or` variants,
  all five strategies (`randomly, cycling, stopping, sticky,
  first-time`), parsed with the existing `parsePhraseOverride`
  machinery (`parser.ts:1019`) — one parser, not a re-implementation.
  `verbatim` entries are legal exactly as in `define phrase`.
- **Entry-level `while` is a compile error** (`analysis.phrasebook-entry-gate`,
  fix-it: "the book's own `while` is the gate — move the condition to
  the `define phrasebook` header, or split the entry into a second
  book"). Same rule-shape as the existing `analysis.override-gate`.
- **Entry keys are story keys only** (David, 2026-07-21, resolving
  ADR-245's flagged Q-2: "we're not surfacing Sharpee constructs in
  Chord"): a key is a single kebab-case word in the story's own phrase
  namespace. Dotted platform message IDs are rejected with
  `analysis.phrasebook-dotted-key` (fix-it: "phrasebooks voice the
  story's own keys — to override a platform message, use a story-level
  `define phrase <dotted-id>`," the shipped ADR-230 D5 path, which
  this ruling leaves untouched).
- A predicate-less book is the **default phrasebook** (David,
  2026-07-21): it means `always` — the base voice, naturally declared
  last (ADR-245 D3). The simplest use of the whole feature is one
  named book with no predicate anywhere — inherently the default (and
  only) phrasebook, serving pure grouping/organization with no
  predication involved.
- The book's `while` condition is an ordinary §3.4 condition resolved
  by the analyzer in pass 2 exactly like the `define phrase` trailing
  gate (`analyzer.ts:523-530`), lowered to `IRCondition`.
- The block's body loop carries the ADR-249 comment guard
  (`skipCommentInsideBlock`) like every other `end`-terminated body —
  a `##` line inside a book is `parse.comment-inside-block`.

### D2 — Header grammar: `use phrasebook` and `import phrasebook`

```story
story "The Folly at Fernhill" by "The Sharpee Project"
  use state-machines
  use phrasebook candlewick-gothic while the player holds the locket
  use phrasebook plain-country

import phrasebook "winter-voice.story"
```

- **`use phrasebook <name> [while <condition>]`** lives where `use`
  lives: the story-header body (`parser.ts:394` branch). The existing
  strict one-word `use <extension>` grammar is untouched: the branch
  peeks the word after `use`; exactly the word `phrasebook` selects the
  two-word form (name, then optional `while` tail); anything else
  follows today's one-name-token-only rule. Any number of
  `use phrasebook` lines may stack, each with its own predicate;
  without `while` the book is `always`. AST: a new `UsePhrasebookDecl
  { name, condition, span }` beside (not inside) `UseDecl`, so the
  ADR-215 contract stays byte-identical for extensions. Note the
  reconciliation with ADR-215's "static, unconditional `use`": the
  *admission* of a used book is still static (the analyzer sees the
  name at compile time); only its *activity* is predicated — the same
  compile-time/derived split as `define`d books.
- **`import phrasebook "<file>"`** is a top-level line (its position IS
  the book's arbitration position — ADR-245 ruling). Grammar:
  `"import" "phrasebook" STRING NL`. `TOP_KEYWORDS` gains `import`
  (recovery + dispatch). The sub-word shape (`import phrasebook …`,
  mirroring `use phrasebook …`) is deliberately how the keyword
  generalizes later: a future `import <other-kind> "<file>"` adds a
  sub-word, and bare `import "<file>"` stays unparsed/reserved for the
  PARKED generalized-import ADR. Nothing here forecloses it.
- **Import resolution**: the file path is resolved relative to the
  importing story file's directory; the fragment must use the `.story`
  extension. `@sharpee/chord` stays browser-safe and filesystem-free:
  `compile()` gains an optional host hook —
  `compile(source, { importResolver?: (path: string) => string | null })` —
  the devkit/`sharpee compose`/repokit hosts supply an fs-backed
  resolver; the browser client supplies a bundle-map resolver. A
  fragment may contain ONLY `define phrasebook` blocks, blank lines,
  and `##` comments (ADR-249); anything else is
  `analysis.import-fragment-content`. Missing/unresolvable file:
  `analysis.import-unresolved`. Fragments may reference story entities
  and states in their predicates (they are part of the story project);
  resolution happens in the analyzer's normal pass-2 alongside every
  other condition — an import is spliced as if its blocks were declared
  at the import site.

### D3 — IR shapes and the competing-definitions registry

`StoryIR` gains one additive list (every existing golden gains
`phrasebooks: []` and nothing else changes):

```ts
/** Ordered by arbitration position: file order of use/import/define alike. */
phrasebooks: IRPhrasebook[];

interface IRPhrasebook {
  name: string;                       // single kebab word
  source: 'define' | 'use';           // import-spliced blocks lower as 'define'
  condition: IRCondition | null;      // null = always
  /** Present for 'define'; absent for 'use' (resolved at load from the registry). */
  entries?: Record<string, IRPhrase>; // same IRPhrase as ir.phrases (ir.ts:292)
  span: IRSpan;
}
```

- Entries reuse `IRPhrase` unchanged — strategy, optional `verbatim`,
  variants with markers. The book's gate lives on the book, never on
  the entry (D1).
- The **arbitration order is the array order**, period. The analyzer
  appends `use phrasebook` declarations (header) and
  `define phrasebook` / spliced-import blocks (body) in file-appearance
  order. First predicate-match in that order, per key, wins (ADR-245
  D3); anything unresolved falls through per the D4 chain.
- **Packaged-book registry** (the ADR-215 names-vs-mappings split,
  applied): `use phrasebook <name>` resolves against a compile-time
  MANIFEST registry in `@sharpee/chord` (`PHRASEBOOK_REGISTRY`, sibling
  of `EXTENSION_MANIFESTS` — initially EMPTY; no books ship in this
  gate) carrying `{ name, keys: string[] }` — the key list is manifest
  data because the analyzer needs it: **a key supplied by a used book
  counts as declared for the missing-phrase-key gate** (D4.6), which a
  names-only registry could not support. The load-time data registry in
  `story-loader` maps name → `{ entries: Record<key, IRPhrase> }`; at
  load, manifest keys must equal data keys (conformance mismatch =
  `LoadError`, the ADR-215 manifest-conformance pattern), and used-book
  entries are validated against the same key rules as authored books
  (dotted/reserved keys rejected at load — the story compiler never saw
  this data). A packaged book is pure DATA, never code — a book-using
  story stays pure IR (ADR-215's browser-safety property).
  `use phrasebook <unknown>` is the compile error
  `analysis.unknown-phrasebook` with a nearest-match suggestion
  (mirror of `analysis.unknown-extension`); a name known at compile
  but missing from the load registry is a `LoadError`. Registering test
  books through both seams is how AC-5 exercises `use` before any real
  book ships.

### D4 — The resolution seam (the one new lookup layer)

The chain ADR-245 rules — **per-entity → story `define phrase` →
active book (first match, per key) → platform default** — lands with
exactly one new lookup, at the render-path read point, built entirely
on ADR-240's existing registry:

1. **Per-entity: unchanged, free.** Emit-time key-mangling
   (`runtime.ts:1805`) already resolves `<entityId>.<key>` before the
   message reaches rendering. A message that arrives with an
   entity-scoped id was never a book's to voice.
2. **Story-beats-book: enforced statically at load.** The loader knows
   the story's `define phrase` table. For each key K covered by at
   least one declared book **and not defined by the story**, the loader
   registers ONE evaluator under the new key convention
   `phrasebook.template.<K>`:

   ```ts
   world.registerEvaluator('phrasebook.template.' + K, (world) =>
     walkBooks(K, world));   // first book whose predicate holds and covers K
   ```

   Keys the story defines get NO evaluator — the story wins without a
   single predicate ever being evaluated, exactly as D2 of the parent
   requires ("swapping books never changes text the author wrote").
   The key-builder function is exported by the read point's module and
   pinned by a test (ADR-240 D6 convention).
3. **The read point** is the engine's render path
   (`phrase-render.ts` / `renderViaPhrase`): before the existing
   `getTemplate(messageId)` fork it asks
   `world.evaluate('phrasebook.template.' + messageId)`. The
   evaluator's return contract is pinned:
   `{ book: string, entry: IRPhrase } | undefined` — the first
   declaration-order match, or `undefined` when no active book covers
   the key.
   - A **match** = an active book covers the key: the read point
     derives the template from the entry exactly as `templateFor`
     does today (verbatim / single text / `{variants}`) and renders it
     via a small additive
     `EnglishLanguageProvider.renderTemplate(template, ctx)` — the body
     of `renderMessage` minus the `messages.get`; the provider's
     single-slot map and every existing behavior stay untouched.
   - **`undefined`** (no evaluator, or no book's predicate held) =
     fall through to today's exact behavior: `getTemplate` →
     `renderMessage` (platform default) or the inline fallback.
   This closes the "getTemplate is context-free" tension the seam
   audit found: the world-consulting question is asked by the read
   point (which has the world), not by the language provider (which
   stays world-free).
4. **Predicates are derived, never stored** (ADR-245 D3 / ADR-240 D1):
   `walkBooks` evaluates each candidate book's `IRCondition` through
   the loader's existing `Evaluator.evalCondition`
   (`evaluator.ts:108`) at the moment of the render-path read. No
   active-book state exists anywhere; nothing serializes; closures
   re-register on every load (AC-5 of ADR-240). No new invalidation
   list, no new registry API.
5. **Timing, stated precisely** (refining ADR-245's Consequence with
   implementation truth): rendering is post-turn, so every message of
   a turn renders against the turn's FINAL world state — a turn that
   flips a book predicate renders its entire output, including
   messages emitted before the flip, in the new voice. Voice is
   coherent within a turn and can shift between turns. (The parent's
   "mid-turn shift between two rendered messages" can arise only if a
   predicate reads state mutated during the render pass itself —
   e.g. text-state counters — which book predicates, being ordinary
   §3.4 conditions, cannot express. Docs state the whole-turn-coherence
   property.)
6. **Coverage semantics**: an empty-prose book entry is still coverage
   (it renders blank — same contract as every registered phrase; the
   known empty-template footgun is not multiplied by books, and the
   compile-side blank-text gates apply to book entries as to any
   phrase). A key covered only by predicated books, referenced by the
   story, compiles (book coverage counts as declaration for the
   missing-phrase-key gate) but earns the WARNING
   `analysis.phrasebook-partial-coverage` ("`<key>` is only defined in
   conditional phrasebooks — when no book is active it renders
   nothing") unless some `always` book or story/entity definition
   covers it. (Book keys are story keys per D1, so there is never a
   platform default beneath them — the fall-through floor is the
   render path's inline fallback.) Warning, not error: ADR-245 is
   explicit that no completeness claim exists.

### D5 — Variant state per (book, key)

Book entries with strategies render through the existing `Choice`
machinery, and their counters live in the existing `TEXT_STATE`
capability — **no new capability, no schema change**:

- When `walkBooks` resolves key K to book B's multi-variant entry, the
  read point stages the `Choice` atom exactly as the Chord runtime does
  today (`runtime.ts:1854`), but keyed
  `entityId: 'phrasebook.<B>', messageKey: K`.
- `TEXT_STATE`'s shape is `{ [entityId]: { [messageKey]: number } }`;
  namespacing the entityId as `phrasebook.<book>` gives every (book,
  key) pair its own counter — `winter`'s `first-time` on
  `cold-returns` and `springtime`'s counter on the same key are
  distinct rows, never cross-contaminating (the ADR-245 ruling), and
  both round-trip with save/undo for free (ADR-033/196), old saves
  defaulting to 0 exactly as Choice already documents.
- The `phrasebook.` entityId prefix is reserved: it can never collide
  with a world entity id (ids are loader-assigned without dots into
  that namespace) — asserted by a unit test.

### D6 — Person-orthogonality (ADR-243 adjacency)

Book text speaks of the player through the `{You}` realization-slot
family (ADR-245 D4). Dependency status, stated plainly: ADR-243 is
DRAFT and its marker-realization seam is unimplemented — today
`{You}`-family markers in the 382 platform rows realize second-person
only. Book text written with the slots is therefore correct today and
becomes person-mobile when ADR-243 lands; nothing in this design
depends on it landing first. The deferred declared-person diagnostic
stays deferred (ADR-245 Q-5).

### D7 — Diagnostics (all load-time, fail-loud, with spans — ADR-210 AC-3)

| Code | Condition | Severity |
|---|---|---|
| `parse.phrasebook-header` | malformed `define phrasebook` header (missing/multi-word name; trailing junk after the condition) | error |
| `parse.phrasebook-entry` | entry line that is not `<key>[, strategy]:` (existing entry-parse errors reused) | error |
| `parse.phrasebook-end` | missing `end phrasebook` | error |
| `parse.use-phrasebook` | malformed `use phrasebook` line (missing name; junk after condition) | error |
| `parse.import-form` | `import` not followed by `phrasebook "<file>"` (bare `import "<file>"` reserved — points at the parked generalization) | error |
| `analysis.phrasebook-entry-gate` | entry-level `while` inside a book | error |
| `analysis.duplicate-phrasebook` | same book name declared/used twice | error |
| `analysis.unknown-phrasebook` | `use phrasebook <name>` not in the compile-time registry (nearest-match suggestion) | error |
| `analysis.import-unresolved` | import file missing / host resolver returned null | error |
| `analysis.import-fragment-content` | fragment contains anything but `define phrasebook` blocks + comments | error |
| `analysis.phrasebook-reserved-key` | `br` / reserved channel keys as entry keys (same rule as `registerPhrase`) | error |
| `analysis.phrasebook-duplicate-key` | same key twice within ONE book (across books is the whole point and is legal) | error |
| `analysis.phrasebook-dotted-key` | a dotted platform message ID as a book entry key (D1 — fix-it points at story-level `define phrase`) | error |
| `analysis.phrasebook-partial-coverage` | story-referenced key covered only by predicated books (D4.6) | warning |

### D8 — Affected modules

| Module | Change |
|---|---|
| `packages/chord` — `parser.ts` | `define phrasebook` block (entry parsing reuses `parsePhraseOverride`); `use` branch two-word form; `import phrasebook` top-level; `TOP_KEYWORDS` + `import` |
| `packages/chord` — `ast.ts` | `DefinePhrasebook`, `UsePhrasebookDecl`, `ImportPhrasebookDecl` |
| `packages/chord` — `analyzer.ts` | lowering + ordering (file-appearance arbitration list), pass-2 condition resolution, D7 gates, book-coverage input to the missing-phrase-key gate |
| `packages/chord` — `ir.ts` | `IRPhrasebook`, `StoryIR.phrasebooks` (additive; goldens gain `phrasebooks: []`) |
| `packages/chord` — `index.ts` / `manifests` | `compile(source, { importResolver })`; `PHRASEBOOK_REGISTRY` (names; initially empty) |
| `packages/story-loader` — `loader.ts` | evaluator registration per covered-not-story-defined key (`phrasebook.template.<K>` builder exported + test-pinned); load-time data registry for `use`d books; `walkBooks` |
| `packages/story-loader` — `runtime.ts` | NO change (emit path untouched — verified: bare-key emission already falls through correctly) |
| `packages/engine` — `prose-pipeline/phrase-render.ts` (+ handler ctx) | the read point: `world.evaluate('phrasebook.template.' + id)` before the `getTemplate` fork; Choice staging keyed `phrasebook.<book>` |
| `packages/lang-en-us` — `language-provider.ts` | ONE additive method `renderTemplate(template, ctx)`; `messages` map and all existing behavior untouched |
| `packages/world-model` | NO change (existing `registerEvaluator` + `TEXT_STATE`) |
| `packages/devkit` / repokit / browser client | host `importResolver` wiring (fs / bundle map) |

### D9 — E2E spine: the fernhill unreliable narrator

Fernhill already carries the perfect predicate substrate — story states
`evening, midnight`. The acceptance story adds:

- `define phrasebook midnight-voice while the story is midnight` — the
  house turns hostile: re-voices at least `distant-bell` (an existing
  story key) plus one shared key below;
- `define phrasebook evening-voice` (predicate-less base) — covers the
  same shared key with a warmer text, plus one key `midnight-voice`
  does NOT cover (fallback-through demonstration);
- one story-level `define phrase` for a key both books also cover —
  proving the story text wins in both states;
- a `first-time` entry present in BOTH books on the same key — proving
  per-(book, key) counter independence across the state flip;
- `import phrasebook "voices/midnight.story"` variant of the same
  content behind a fixture flag, exercising import + arbitration
  position (compile-level test; the transcript uses in-file books).

Transcript (`stories/fernhill/tests/transcripts/phrasebooks.transcript`):
trigger the same phrases in evening, cross the midnight transition,
trigger them again — asserting the voice flip, the story-override
stability, the fallback-through key, and (via save/restore mid-scene)
that the `first-time` counters survive a round-trip independently.

## Acceptance criteria

1. **Grammar/compile**: fixtures for every D1/D2 form compile; every
   D7 diagnostic fires from a `gates/` fixture with correct span +
   fix-it; `use <extension>` one-word behavior byte-identical
   (existing suites green untouched).
2. **IR**: goldens gain exactly `phrasebooks: []`; a book story's IR
   pins name/source/condition/entries and array order = file order
   (header `use` lines first by position, then import/define blocks in
   body order).
3. **Resolution unit tests** (loader + engine): story `define phrase`
   beats an always-book (and: NO evaluator is registered for a
   story-defined key — asserted, not inferred); first-match-in-
   declaration-order per key across two active books; a key one book
   does not cover falls through to the next matching book;
   no-book-active falls through to the inline fallback (story keys
   have no platform default — D1 ruling); the key-builder string is
   pinned; predicates evaluate at the read (a state flip between two
   turns flips the rendered voice with NO intervening
   re-registration).
4. **Variant state**: two books, same key, `first-time` both — each
   fires its own "first"; TEXT_STATE rows keyed
   `phrasebook.<book>`/`<key>`; save/restore round-trips both counters;
   the `phrasebook.` entityId prefix collision test.
5. **`use`/`import`**: a test book registered through both seams
   (compile manifest + load data) activates via `use phrasebook` with a
   `while` bound at the use site; a story key supplied only by the used
   book passes the missing-phrase-key gate via the manifest key list;
   manifest/data key mismatch is a `LoadError`; stacking order
   respected; `analysis.unknown-phrasebook` nearest-match; import
   resolves relative to the story file, splices at position, and every
   `analysis.import-*` gate fires.
6. **E2E**: the D9 fernhill transcript passes; full fernhill suite and
   walkthrough remain green; whole-turn voice coherence demonstrated
   (a turn containing the midnight flip renders wholly in the new
   voice).
7. **No-regression floor**: chord, story-loader, engine, lang-en-us,
   platform-browser suites green; full `./repokit build dungeo
   --browser` clean; dungeo walkthrough chain green (one-good-run
   rule).

## Consequences

- The single-slot world stays single-slot: the provider's `messages`
  map, `addMessage`, and ADR-230 D5 replace semantics are untouched.
  The "registry of competing definitions" is realized as the ordered
  `IRPhrasebook[]` walked by ONE registered evaluator per eligible key
  — not as a provider list, so ADR-158's param realization and the
  assembler see no change.
- Story-beats-book is decided at load, not render: a story-defined key
  never pays predicate evaluation. Only book-eligible keys pay one
  `world.evaluate` per render.
- Voice is whole-turn-coherent (D4.5) — docs must state this, and the
  parent ADR's mid-turn wording is refined accordingly.
- A distributed book is data; stories using books remain pure IR and
  browser-runnable. The compile-time book-name registry starts empty —
  `use phrasebook` is fully built and fully gated, with no shipped
  books, until a distribution story exists.
- The docs rename sweep (ADR-245 Q-6) must land before or with the
  first implementation phase — tracked as plan Phase 7; the remaining
  loose ends are enumerated there.
- `import` enters the language pointing only at `phrasebook`; the
  generalized `import <file>` stays parked and unforeclosed (D2).
- **Books voice the story, never the platform** (Q-2 ruling,
  2026-07-21): dotted platform message IDs are rejected as entry keys.
  Platform-message overrides remain the story-level ADR-230 D5
  `define phrase <dotted-id>` path, one-shot and unconditional. A
  packaged book ships story-namespace keys that the consuming story
  references — its manifest key list is the book's documented surface.

## Session

session 99aee6, 2026-07-21
(`docs/context/session-20260720-2210-chord-foundations.md`) — Phase 1
of docs/work/adr-245-phrasebooks/plan.md. Grounding: three parallel
source audits (Chord phrase pipeline; render-path fallback chain;
sibling-ADR contract extraction) verified every file:line cited above
against HEAD (c864b3c1 + the ADR-249 comment implementation). The
ADR-245 Q-2 dotted-key question was answered directly by David on
first presentation ("no - we're not surfacing Sharpee constructs in
Chord") — no interview needed; ruling folded same session.
