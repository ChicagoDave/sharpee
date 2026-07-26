# ADR-269: The standard grammar as Chord source

## Status: IMPLEMENTED (2026-07-26, session f9e069) — all five phases landed same session; all nine acceptance items green (see the Session implementation addendum): the standard grammar lives as `packages/parser-en-us/grammar/standard-en-us.story` (410 rules / 55 blocks; 12 ruled platform-side exception rules in `platform-grammar.ts`), the `repokit grammar` build step emits the generated `src/grammar.ts` (freshness-gated), the equivalence harness shows zero divergences pre- and post-swap, the full corpus is green, startup is measured at zero regression, and the ADR-265 apparatus is deleted (owner-confirmed). Previously ACCEPTED same day. — Third language child of the ADR-266 umbrella, the migration itself. The language prerequisite is met (ADR-267 constructs + ADR-268 ordering; gap report EMPTY against all 422 rules), and the loader's action-centric emission seam exists (ADR-271 D3). All four open questions (Q-1–Q-4, restating inherited Q-12, Q-13, Q-16 per D14, plus the target-naming form) resolved via the open-questions interview 2026-07-26: Q-1 build-time generation (D7), Q-2 distinct `grammar` header (D8), Q-3 locale-generic mechanism (D9), Q-4 name derivation (D10). adr-review 16/16 after five SMALL folds (Modules list, export contract, id-set ownership, freshness gate, acceptance 9).

## Parent: ADR-266 (umbrella — direction (iv), boundary D8, D2/D3/D5/D6/D7; owes umbrella acceptance items 9–14). Consumes ADR-268 (ordering = confidence → tier → specificity → definition order; the 29 file-order-sensitive pairs are migration constraints; its acceptance 3 lands here) and ADR-267 (the construct set the migrated source is written in). Relates to ADR-271 D3 (`fullPattern()` action-centric emission — the story-side precedent), ADR-275 (semantic word binding — unaffected; the migrated `directions` defaults ride it), ADR-210 (**direction rule: no platform package may depend on `@sharpee/chord` or `@sharpee/story-loader`** — `scripts/bundle-entry.js:102-105`), ADR-274 (esbuild stays external to the CLI bundle — the compile-at-boot cautionary precedent), ADR-254 (Chord is dotless — why `if.action.taking` is not currently writable), ADR-251 (imports — the multi-file mechanism available to the source), ADR-248 (RESTART re-runs `boot()` — a startup-cost multiplier), ADR-270 (author alteration — must not be foreclosed here), ADR-272 (docs derive from the shipped source this ADR creates).

## Date: 2026-07-26

## Context

### What must move

`packages/parser-en-us/src/grammar.ts` — 1035 lines, one exported `defineGrammar(grammar)` —
registers **422 rules across 56 actions** (baseline dump:
`docs/work/chord-grammar-ordering/rules.json`). Its surface, measured: 154 `.define()` /
152 `.mapsTo()`, 28 `.forAction()` blocks, 27 `.verbs()`, 21 `.pattern()`, one
`.directions()` block, two `.withDefaultSemantics()` call sites feeding two generated
cross-products (going × direction at `:703-733`, concealment at `:1011-1028`, reveal at
`:1029-1035`), `.instrument()`/`.topic()` typing, and **zero `.where()` calls** — by design
(ADR-231 D2a: stdlib refuses on scope in `validate()`).

Since ADR-268 the file has no priority anywhere. Its definition order is semantic and
already encodes every ordering constraint:

- Three **LOAD-BEARING ORDER** sites (`:123-125` wearing before the generic put forms,
  `:139-141` taking_off before `take up`, `:678-690` `go out` → exiting and
  `move :item to :destination` → putting hoisted above the direction-alias block).
- The **29 statically co-matchable equal-specificity pairs**
  (`docs/work/chord-grammar-ordering/pairs.json`, key `TIE`; 25 are the
  `move :item to :destination` vs `move :target <direction>` family) whose winners ADR-268
  D3 requires the migrated source to keep earlier in definition order.

### The language and the seam are ready; three facts are not

**Ready.** ADR-267's constructs cover every rule (`the <name>` slots, `or` alternation,
`[optional]`, greedy/typed-slot declarative lines, per-pattern `means`, the `directions`
block); the gap report reads EMPTY full stop. ADR-271 D3 built action-centric emission
(`forAction().fullPattern()` at `story-loader/src/loader.ts:1178-1207`), ADR-273 fixed the
scope-resolver path, ADR-275 made semantic defaults reach dispatch. The migrated source is
*writable* today.

**Not ready — fact 1: the id binding.** A Chord `define action` always mints
`chord.action.<name>` (`loader.ts:1112`, hardcoded); `IRActionDef` has no id-override field
(`chord/src/ir.ts:468-511`), and a dotted id is not even lexable — `.` is punctuation
(`chord/src/lexer.ts:67`; ADR-254, deliberately dotless). The standard grammar's rules must
map to `if.action.taking` and its 55 siblings. Precedent exists for loader-side
*derivation* rather than author-written dotted ids: state-machine triggers derive
`` `if.action.${name}` `` from a bare gerund (`loader.ts:1864`). This is the
**target-naming form** `docs/work/grammar-parity/sharpee-chord-grammar-syntax.md` Part D
assigns this ADR (resolved in D10).

**Not ready — fact 2: the load path is constrained on both ends.** `defineGrammar` runs in
the `EnglishParser` constructor (`english-parser.ts:145-146`) — 422 pattern compiles per
construction — at CLI boot (`bootstrap/src/index.ts:142`), per browser `handleStart`
(`runtime/src/bridge.ts:157`), again on ADR-248 RESTART, and **per invocation in zifmia's
turn executor** (`tools/zifmia/src/engine/turn-executor.ts:74`). No measurement of this
cost exists anywhere in the repo (the only boot number is CLAUDE.md's whole-process
~170ms). And the obvious "parse Chord at parser startup" path is blocked by a standing
rule: **no platform package may depend on `@sharpee/chord` or `@sharpee/story-loader`**
(ADR-210; `bundle-entry.js` requires them by literal path precisely to keep the edge out of
the package graph). parser-en-us today depends only on core, if-domain, lang-en-us,
world-model. The CLI bundle embeds no non-JS assets (no esbuild loader flags; every data
file is read from a caller-supplied path); the repo's precedent for static tables is
data-as-code (chord's extension manifests are TS modules); the browser client already
fetches `./story.story` and compiles at boot. ADR-274 stands as the caution for what
compile-at-boot does to the bundled CLI.

**Not ready — fact 3: the file kind is undecided, and the reference-era apparatus is still
live.** The EBNF's story header is optional (`chord.ebnf:57`), no analyzer gate requires a
room or player, and a file containing only `define action` blocks compiles and constructs a
`ChordStory` today (verified empirically against the built dist: `ok=true`, empty
diagnostics, `config.id=""`). `.chord` exists only as the import-fragment extension
(ADR-251). Meanwhile ADR-265's enforcement design — the `reference-only` loader refusal
(`loader.ts:255-261`), the 57-file `docs/reference/stdlib-chord/` set, its generator
`scripts/generate-stdlib-chord.js`, and the pinning test
(`story-loader/tests/stdlib-chord-reference.test.ts`) — still exists and is slated for
deletion, not relaxation (umbrella D2/D6).

### Two generators, not one

The umbrella's D3/D7 generator reads the rules the TS builder registers and emits the
initial Chord source — it runs **once** and retires with `grammar.ts` (D7). Separately,
the load path (ruled in D7) needs a **standing build step** in the opposite
direction (Chord → the artifact the runtime consumes). Conflating them was easy while both
were hypothetical; this ADR keeps them distinct because their lifetimes, directions, and
owners differ.

One mechanical wrinkle for any equivalence tooling: registered rule ids are
nondeterministic (`` `rule_${Date.now()}_${Math.random()}` ``,
`if-domain/src/grammar/grammar-engine.ts:131`) — equivalence must compare shape, never ids.

## Decision (settled parts)

### D1 — The migration generator: recorded rules in, action-first Chord out, order preserved

The one-shot generator (umbrella D3) reads the registered rule table — the
`engine.createBuilder()` → `defineGrammar()` → `getRules()` recording idiom the sync tests
already use — **not** the `grammar.ts` text, and emits Chord in ADR-267's constructs:

- **Action-first grouping** (umbrella D3 mandates capturing the action-centric shape; the
  A2 analysis calls it better than `grammar.ts`'s layout): one `define action` block per
  stdlib action, its rules as grammar lines in their current relative order. Verb
  cross-products emit as one line per verb (longhand is the ruled spelling); the going ×
  direction and concealment cross-products collapse into `directions` blocks and `means`
  lines (~120 rules back into ~15 lines); `.instrument()`/`.topic()` become
  `is an instrument` / `is a topic` lines; alternation and optionals use `or` / `[word]`.
- **No ordering annotations** (ADR-268 acceptance 3): definition order is the only ordering
  statement. The generator orders the 56 action blocks by a topological sort over the
  **29 TIE pairs plus the three LOAD-BEARING sites** — each pair's current winner earlier
  in the emitted file — and carries the existing LOAD-BEARING comments across as Chord
  comments. Whether the pair constraints admit a contiguous-block ordering (they are
  cross-action; a cycle would force splitting an action's grammar across two blocks) is
  **verified against `pairs.json` before emission is designed final; a cycle is a finding
  to surface, not a thing to silently accommodate.**
- Output is real Chord an author could have written (umbrella D4) — readable sentences,
  not machine-shaped dumps.
- **Platform-side exceptions (owner ruling, 2026-07-26): 12 of the 422 rules stay TS.**
  The `?` → `if.action.help` rule (punctuation Chord cannot lex — ruled platform-side
  2026-07-25, the gap report's one exception) and the 11 `trace …` → `author.trace`
  rules (the author/debug meta-command — `author.*` namespace, tooling grammar, never
  story vocabulary, outside D10's derivation by design). Both live in a small
  hand-maintained platform-side registration beside the generated module, registered at
  the same standard tier after the Chord-derived rules (they collide with nothing — safe
  at any position). The Chord source carries the other **410 rules across 55 actions**;
  the equivalence baseline splits accordingly: 422 = 410 Chord-derived + 12 enumerated
  platform-side. This does not weaken acceptance 8: the exceptions duplicate nothing in
  the Chord source.

### D2 — Equivalence is counted, by shape, with divergences ruled individually

The migration's gate (umbrella acceptance 9) is an automated comparison harness, not
review: the rule set registered by today's `defineGrammar` versus the rule set the migrated
source produces, compared on **pattern shape, action id, tier, slot types, semantic
defaults, scope constraints, and pairwise order over the 29-pair list** — ids excluded
(nondeterministic), count exact (422/56). Any shape the Chord constructs reproduce
differently (e.g. a `directions` block attaching `direction` defaults to a rule family that
lacks them today) is **enumerated and individually ruled — never silently absorbed in
either direction.** After the shape gate: the full transcript corpus green unchanged
(umbrella acceptance 10), including `go-out-exiting.transcript` (ADR-268 acceptance 3) and
the existing grammar-vocabulary/lang sync tests.

### D3 — The standard grammar registers at tier `standard`; the story layer is untouched

D7's load path enters the engine through a standard-tier registration point
(ADR-268's tier contract is set at the entry point — `createBuilder()` defaults
`'standard'`). The migrated source gets none of the story-loader dispatch conveniences:
**no `chord.action.*` minting, no automatic bare-verb prefix rules, no refusal ladder, no
dispatch action** — it registers exactly the rules it states, nothing more. The story
grammar surface (`extendParser` / `getStoryGrammar()`, tier `'story'`) keeps its signature
and capability; `stories/thealderman`, the devkit `basic-story` fixture, and every
TS-story suite are the regression set (umbrella D8, acceptance 11).

### D4 — Grammar only; no behavior crosses (umbrella D8 restated as a file constraint)

The standard-grammar source carries `define action` **grammar surfaces only**: pattern
lines, slot lines (`must be`, `is an instrument`, `is a topic`,
`takes the rest of the line`), `directions`, `means`. Bodies, refusal ladders, phrases,
score lines — anything that defines behavior — are out of scope for this artifact; every
`if.action.*` implementation stays TypeScript (umbrella acceptance 12). The enforcement
mechanism is D8's grammar-file mode: analyzer gates scoped to the `grammar` header.

### D5 — The ADR-265 apparatus goes at implementation, with confirmation

`docs/reference/stdlib-chord/` (57 files), `scripts/generate-stdlib-chord.js`, the
`reference-only` refusal at `loader.ts:255-261`, the pinning test
`stdlib-chord-reference.test.ts`, and every reference to them (including the website MDX
the pinning test checks) are deleted — removed, not disabled (umbrella D2/D6; acceptance
13–14). Per project policy the `rm` itself happens at implementation time with explicit
confirmation; this ADR records the decision.

### D6 — Startup cost is measured before the load path is implemented

No grammar-construction measurement exists. Before D7's build step is implemented, the
cost of today's 422 builder registrations is measured in the three real contexts — CLI
boot, browser `handleStart`, zifmia per-invocation — and re-measured after the swap, so
the "zero startup delta" claim D7 rests on is verified, not asserted. (The measurement is
cheap; guessing wrong on the zifmia path is not.)

### D7 — Load path: build-time generation; `grammar.ts` is replaced by a generated module (Q-1 resolved 2026-07-26, inherited Q-12 answered)

A repokit build step compiles the Chord standard-grammar source and emits a **generated**
registration module — data-as-code, the repo's precedent — which replaces `grammar.ts` in
parser-en-us. The Chord file is the editable source; the generated module is marked
generated, never hand-edited, and regenerating it is part of the platform build (sequenced
before parser-en-us compiles). Consequences:

- **Zero startup delta**: the runtime still runs plain builder registrations; CLI boot,
  browser `handleStart`, ADR-248 restart, and zifmia's per-invocation constructor are
  untouched.
- **No new package-graph edge**: the build tool uses `@sharpee/chord` the way
  `bundle-entry.js` already does — outside the runtime graph. The ADR-210 direction rule
  stands unmodified; parser-en-us's dependency list is unchanged.
- **A bare `new EnglishParser()` keeps the standard grammar** (unit tests, embeddings) —
  the breaking semantic change of the runtime-compile route is avoided.
- An edit to the Chord source takes effect at the next platform build. Author runtime
  alteration of the standard grammar is ADR-270's seam and is not foreclosed: the story
  layer (`getStoryGrammar()`, Chord stories) already composes at load time, and ADR-270
  designs the override/edit model on top of the base artifact this ADR ships.
- Umbrella acceptance 10's "loads and drives the parser" is satisfied at build time: the
  shipped parser is *derived from* the Chord source, with D2's equivalence harness plus
  the transcript corpus proving derivation fidelity.
- **The generated module keeps `defineGrammar(grammar: GrammarBuilder)` as its export** —
  the parser constructor (`english-parser.ts:146`) and the grammar-vocabulary/lang sync
  tests consume it unchanged; the swap is invisible to every importer.
- **The generated module is committed, and freshness is gated** (review fix, 2026-07-26):
  builds run from committed sources, so the module is checked in like any source file —
  and a build/verify check regenerates it from the Chord source and fails on any diff. A
  stale generated module is a build error, never a silent divergence (the recurring
  "artifact diverges from what CI claims" class, closed by construction here).

*Modules (review fix, 2026-07-26):* chord package — EBNF (`grammar` header production),
`parser.ts` (new top-level form), `analyzer.ts` (grammar-file mode + D4/D10 gates);
the standing build step — a repokit command (home decided at implementation alongside
repokit's sequencing), consuming `@sharpee/chord` outside the runtime graph; parser-en-us —
the Chord source file and the generated module replacing `src/grammar.ts`, plus the two
sync tests' import path if the filename changes; the one-shot migration generator —
`scripts/` (retires with the migration, D1); story-loader — the D5 deletions only.

**Rejected** (Q-1 interview): runtime compile at boot (violates or relocates around
ADR-210; pays parse+emission per construction site; leaves a bare parser grammarless) and
build-time IR with runtime emission (a second emitter to maintain for no startup win —
registration cost stays either way).

### D8 — File kind: a distinct top-level `grammar` header (Q-2 resolved 2026-07-26, inherited Q-13 answered)

The standard-grammar file is a **grammar file**, declared by a new top-level form — a
`grammar` header where a story carries its `story` header (spelling of the header line
finalized at implementation against the EBNF, e.g. `grammar "standard-en-us"`). One EBNF
addition with the usual paper trail: an approved `chord-grammar-changes.md` row and an
ADR-257 version bump. The header is the discriminator everything else keys off:

- It switches the analyzer into **grammar-file mode**: D4's grammar-only gates (bodies,
  refusal ladders, phrases, score lines are named analyzer errors in this mode) and D10's
  id binding apply; story-only declarations (rooms, entities, player) are likewise
  rejected in this mode — a grammar file declares grammar and nothing else (umbrella D6).
- A grammar file **needs no story scaffolding** and gets none: no title/author fields, no
  rooms, no player (already true empirically; the header makes it intentional rather than
  accidental).
- ADR-270 inherits the natural hook: an author's override file can be the same kind
  (distinguished from the base by content/placement — ADR-270's design), rather than
  needing a discriminator invented later.
- The file stays `.story`-extension-agnostic at this ADR's level: the build step consumes
  it at a known path; whether the on-disk extension is `.story` or a new one is an
  implementation detail recorded with the EBNF row (the header, not the extension, is the
  authoritative discriminator).

**Rejected** (Q-2 interview): a bare `.story` containing only `define action` blocks
(works today but self-describes nothing — D4 and D10 would hang on a path convention, and
ADR-270 would have to invent the discriminator anyway) and promoting `.chord` (overloads
ADR-251's fragment mechanism — pastes, deliberately not entry points — with a second
meaning).

### D9 — The mechanism is locale-generic; each locale ships its own source (Q-3 resolved 2026-07-26, inherited Q-16 answered)

The grammar-file mechanism (D7's build step, D8's header and grammar-file mode, D10's id
binding) is **locale-independent**; the *content* is locale-owned. The en-US Chord source
and its generated module live in `parser-en-us`; a future `parser-{locale}` ships its own
grammar file and generated module through the same build step. Chord's keywords stay
English while pattern content is locale-owned — the relationship every `.story` already
has. This preserves the single-source property (iv) was adopted for: no locale keeps a
hand-maintained TS grammar path.

Direction, not code: en-US is the only locale in the tree, so nothing multi-locale lands
under this ADR — the ruling binds how the mechanism is *shaped* (nothing en-US-specific
hardcoded into the build step or the grammar-file mode). The known en-US leak in the
generic layer (`if-domain`'s `.directions()` reading lang-en-us's `directionMap`,
`grammar-engine.ts:445`) is recorded as related but pre-existing; fixing it is not this
ADR's scope.

**Rejected** (Q-3 interview): an en-US-only mechanism with future locales keeping the TS
path — the source-of-truth split the umbrella warns undoes (iv).

### D10 — Id binding by name derivation, scoped to grammar-file mode (Q-4 resolved 2026-07-26)

In a grammar file (D8's mode), the block's name **is** the binding:
`define action taking` binds `if.action.taking` — the `loader.ts:1864` gerund-derivation
precedent, promoted to the grammar-file kind. All 56 stdlib action names (`taking`,
`taking_off`, `switching_on`, …) are single lexable WORDs, so nothing new is lexed; no
dotted id enters the language and ADR-254 stands.

- **Validated, never minted**: in grammar-file mode the derived id is checked against the
  stdlib action-id set at build time — an unknown name is a named error (with the
  usual did-you-mean suggestion), never a silent `chord.action.*` mint and never a silent
  no-op registration.
- **The id set is supplied by the build step, not learned by chord** (review fix,
  2026-07-26): `@sharpee/chord` has zero runtime dependencies and stays stdlib-ignorant —
  the analyzer's grammar-file mode validates *structure*; the build step, which may read
  stdlib's exported action ids freely (it lives outside the runtime graph, like
  `bundle-entry.js`), validates the *names*. Whether that check rides a compile option or
  a post-compile pass is an implementation detail; the ownership split is the contract.
- **Story files are unaffected**: `define action` in a story still mints
  `chord.action.<name>`. The derivation is a property of grammar-file mode, not of
  `define action`.
- The *story-side* general target-naming form (Gap 3(b) — a story adding `snag the item`
  to standard taking) remains **ADR-270's**, per the umbrella's sequencing note; ADR-270
  inherits this derivation as prior art.

**Rejected** (Q-4 interview): an explicit per-block binding line — it either needs dotted
ids (breaking ADR-254) or restates what the block's own name already derives, at 56
blocks' worth of boilerplate.

## Acceptance

Restating umbrella items 9–14 plus ADR-268 acceptance 3, made concrete:

1. The migration generator produces the Chord source mechanically from the recorded rule
   table, and the **equivalence harness passes**: 422 rules / 56 actions by count and
   shape (pattern, action id, tier, slot types, defaults, constraints), ids excluded, with
   every intentional divergence enumerated and ruled. *(D1, D2; umbrella 9)*
2. The 29-pair order constraint holds in the emitted source (each winner earlier), the
   three LOAD-BEARING comments survive as Chord comments, and the source contains **no
   ordering annotations**. `go-out-exiting.transcript` stays green. *(D1; ADR-268 D3 +
   acceptance 3)*
3. **The Chord form drives the parser** via D7's build-time path: a stock story parses every
   command it parses today — the full transcript corpus (dungeo units + walkthrough chain,
   fernhill, friendly-zoo, cloak, nautical) green unchanged. *(D2, D3; umbrella 10)*
4. TS stories are unaffected: `extendParser`/`getStoryGrammar` signatures and capability
   unchanged; `stories/thealderman` and the devkit fixture pass unchanged. *(D3; umbrella
   11)*
5. No action implementation moves: every `if.action.*` remains TypeScript; the Chord
   source names ids (per D10's derivation) and defines no behavior, enforced by D4's gates.
   *(D4; umbrella 12)*
6. The ADR-265 apparatus is gone — files, generator script, `reference-only` refusal,
   pinning test, doc references — deleted with confirmation, not disabled. *(D5; umbrella
   13–14)*
7. D6's startup measurements exist and are recorded in the work docs **before** D7's build
   step is implemented, and post-swap numbers confirm zero startup regression. *(D6, D7)*
8. `grammar.ts` is replaced by the marked generated module keeping the `defineGrammar`
   export; the repokit step regenerates it from the Chord source before parser-en-us
   compiles; the freshness gate fails the build on a stale module; nothing hand-maintained
   duplicates the Chord source. *(D7; umbrella D7)*
9. The grammar-file mode's rejections are tested by name: a behavior declaration (body,
   refusal ladder, phrase, score line) or story declaration (room, entity, player) in a
   grammar file produces its named analyzer error; an unknown action name produces the
   D10 error with its suggestion — each asserted by a test, not demonstrated by review.
   *(D4, D8, D10)*

## Consequences

**Gained (when ACCEPTED + implemented).** The artifact the feedback asked for: the standard
grammar readable — and, with ADR-270, alterable — in the language authors write, as I7's
Standard Rules are. The umbrella's central risk (the migration's equivalence) is
discharged by a counted harness rather than assertion. ADR-272 gets the single source its
derived docs need; ADR-270 gets a base artifact to build the alteration model on.

**Cost.** A migration touching the file every story depends on — the equivalence harness is
the load-bearing test of the entire program (umbrella's own words). A new build step (under
D7) that repokit must sequence before parser-en-us. A new file kind with its header,
mode gates, and id derivation (D8/D10) — one EBNF addition, one ADR-257 bump, one
`chord-grammar-changes.md` row. The 29-pair topological constraint
makes the emitted file's block order semantic — a property tooling and future editors must
respect (formatters must not reorder, already ADR-268's consequence).

**Rejected (by the settled parts).** Emitting the flattened 422-rule list without
action-first grouping (loses the shape that maps onto Chord — umbrella D3). Transcribing
priorities or inventing ordering annotations (ADR-268 D1/D4). Letting the standard file
ride the story-loader dispatch path (`chord.action.*` ids, auto bare-verb rules — D3).
Keeping any ADR-265 apparatus as a disabled fallback (D5).

## Session

Session of 2026-07-26 (f9e069). Drafted immediately after ADR-268's implementation landed
(9fc5b914), as the next child in the umbrella's sequencing. Grounded before drafting:
both prior siblings and ADR-271/273/274/275 read in full; the 29-pair list inspected
(`pairs.json` — 65 AGREE / 29 TIE / 0 REVERSE); `grammar.ts`'s post-268 shape, the
per-construction `defineGrammar` call graph (including zifmia's per-invocation
constructor), the ADR-210 direction rule at `bundle-entry.js:102-105`, the bundle's
no-asset property, and the dotless-id and `chord.action.*` hardcode facts all verified
against the working tree; the define-action-only load behavior verified by executing
`compile()`/`createStory()` against the built dist rather than by code reading.

Open-questions interview run the same session, immediately after drafting: Q-1 → build-time
generation (D7), Q-2 → distinct `grammar` header (D8), Q-3 → locale-generic mechanism
(D9), Q-4 → id derivation by name (D10) — each the presented recommendation, ruled by the
owner.

**Implementation addendum (2026-07-26, same session, on the owner's "begin").** Phases
0–4 landed:

- **Phase 0/D6**: baseline measured — 422 registrations ≈ 2.0 ms cold / 0.3 ms warm; CLI
  boot 0.08 s (`docs/work/standard-grammar-chord-source/measurements.md`).
- **Phase 1/D8**: chord grammar-file kind (header, mode gates, IR marker); Chord 2.4.0;
  EBNF + pin + `chord-grammar-changes.md` row; 14 new tests; chord 595/595.
- **Mid-implementation ruling**: 12 of 422 rules are platform-side TS exceptions —
  `?` → help (ruled 2026-07-25) + the 11 `trace …` → `author.trace` rules (author/debug
  tooling, ruled 2026-07-26) — now `src/platform-grammar.ts`, folded into D1.
- **Phase 3/D1–D2**: one-shot generator (`scripts/generate-standard-grammar-chord.cjs`)
  emitted `packages/parser-en-us/grammar/standard-en-us.story` (483 lines, 55 blocks,
  410 rules; going collapses to one `directions` block; LOAD-BEARING comments carried);
  equivalence harness zero divergences (422 = 410 + 12; 29 pair-order checks green;
  post-swap re-check against the frozen baseline also zero).
- **Phase 2/D7**: `repokit grammar` command (compile → D10 validation vs stdlib
  constants source → emit generated `src/grammar.ts` keeping `defineGrammar`;
  `--check` freshness gate wired into `repokit verify` and the build loop before
  parser-en-us; 8 repokit tests incl. the acceptance-9 D10 error assertion).
- **Phase 4**: swap landed — grammar.ts now generated (433 lines); parser-en-us 285
  green incl. sync tests; story-loader 399, devkit 83, repokit 40; full corpus green
  (dungeo 1788 units + chain 883 all-pass one-good-run — two thief-RNG cascade runs
  preceded it, the known accepted class; fernhill, friendly-zoo, cloak-of-darkness,
  nautical); `go-out-exiting.transcript` 7/7; **zero startup regression** measured.
- Pre-existing, unrelated finding surfaced: `stories/thealderman` fails tsc on
  `CharacterBuilder.topic` (character-package API drift, not grammar).
- **Phase 5 (owner-confirmed "phase 5")**: D5 deletions executed —
  `docs/reference/stdlib-chord/` (57 files), `scripts/generate-stdlib-chord.js`, the
  loader `reference-only` refusal, the `stdlib-chord-reference` and `reference-only`
  test files, repokit's `generateStdlibChord()` and its build call. The website
  `stdlib/reference/content.mdx` keeps its content (umbrella D9) with a frozen-provenance
  note pending ADR-272's rederivation. Post-deletion: story-loader 392/392, repokit
  40, root tsc clean, bundle rebuilt, sanity transcripts green, and a source-tree sweep
  finds zero remaining references (acceptance 13–14). Status flipped IMPLEMENTED.
  ADR-272 (docs surfaces) and ADR-270 (alteration model) are the remaining umbrella
  children.

adr-review run same session at the owner's request: 11/16, five SMALL findings, all folded
— Modules list and generated-module export contract on D7, the id-set ownership split on
D10 (build step validates names; chord stays stdlib-ignorant), the committed-plus-
freshness-gated generated module on D7 (closing the recorded "artifact silently diverges"
recurring class by construction), and acceptance 9 (rejection diagnostics tested by name).
Re-scored 16/16 after the folds.
