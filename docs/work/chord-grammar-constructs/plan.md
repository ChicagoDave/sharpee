# Session Plan: Implement ADR-267 (Chord grammar pattern constructs)

**Created**: 2026-07-25
**Overall scope**: Land the six Chord-language constructs ADR-267 owns (slot spelling, alternation,
optional words, greedy slot, typed slots, semantic defaults + direction map) in the four landing
groups D6 orders them into, so the Chord grammar can express everything the 422-rule standard grammar
uses except rule ordering (ADR-268's). Each group is one EBNF → parser → analyzer → IR → loader
emission → builder change, landed whole (D3), with its own `chord-grammar-changes.md` row(s) and
ADR-257 version bump (D4), and is not "done" until D7's gap report zeroes its rows. Ordering (ADR-268)
and the standard-grammar-as-Chord-source migration (ADR-269) are explicitly out of scope here.
**Bounded contexts touched**: N/A — this is compiler/platform engineering (Chord parser → analyzer →
IR → story-loader → `if-domain` grammar builder), not domain business logic. No
`docs/ddd/notation.yaml` exists in this project. Phase names use the codebase's and ADR-267's own
precise vocabulary (slot, pattern-elem, `TEXT_GREEDY`, `SlotType`, `defaultSemantics`, `directions`
block) because that vocabulary is exact, not because DDD framing applies.
**Key domain language**: N/A (see above) — technical/language vocabulary only: slot, pattern-elem,
alternation, optional element, greedy slot, typed slot (`instrument`/`topic`), semantic default,
direction map, landing group, gap report.

## References consulted
- `docs/architecture/adrs/adr-267-chord-grammar-pattern-constructs.md` — primary source, ACCEPTED
  (14/14 READY); D1–D15, acceptance items 1–8, and D6's four-landing-group order are this plan's
  direct input. Every phase boundary below is one of D6's groups.
- `docs/architecture/adrs/adr-266-grammar-definition-parity.md` — umbrella (ACCEPTED, never
  implemented directly); D8 boundary (grammar defs are dual-surface Chord/Sharpee, traits/behaviors
  stay Sharpee-only — no phase here may introduce a trait or behavior), D12′ (the required-construct
  set and rule counts this plan sizes phases from), D14 sequencing (ADR-267 follows ADR-271, precedes
  ADR-268/269/270/272).
- `docs/architecture/adrs/adr-257-chord-language-version.md` — D2's semver rule: a construct that
  makes previously-valid syntax unparseable (group 1 — parens/colon removed) is a **major** bump; a
  purely additive construct (groups 2–4) is a **minor** bump. `packages/chord/src/version.ts` is
  currently `1.4.0` (ADR-264's counters); D5's `chord.ebnf` surface pin fails the build on any grammar
  change until the constant and pinned hash move together.
- `docs/architecture/adrs/adr-271-chord-grammar-compiler-pass-through.md` — sibling, ACCEPTED and
  fully implemented (all 5 phases DONE per its plan). Established the wiring precedent D3 explicitly
  inherits: a construct is landed when the loader emits it onto the real `GrammarBuilder`/
  `ActionGrammarBuilder` surface and a test asserts the emitted rule shape — not when it merely parses.
  Also delivered `fullPattern()` and action-centric `forAction()` emission, which every phase below
  reuses rather than re-inventing.
- `docs/architecture/chord-grammar-changes.md` — the owner-approval governance log (ADR-210 Open
  Question 4); confirms no D15 row exists yet (it is "owed immediately" per D4) and gives the exact
  row format (Date / Form / Rationale / Example / Decision) each phase's rows must follow.
- `docs/work/grammar-parity/sharpee-chord-grammar-syntax.md` — the input analysis (sections A1–A6, C,
  D) ADR-267 is grounded in; Part C confirms the corrected seven-construct set and rule counts, Part D
  lists ADR-267's specific open items (slot spelling first; A6/A3.2 designed together).
- `docs/context/project-profile.md` — chord package test convention: assert on emitted-rule shape /
  IR shape and specific diagnostic codes, never "parse succeeded" alone; project uses
  `pnpm --filter '@sharpee/<pkg>' test <name>` (no `2>&1`).
- `docs/context/session-20260725-1900-main.md` — most recent session; wrote and got ADR-267 ACCEPTED
  same session, immediately after ADR-274 shipped. Its "Next steps" names exactly this planning task
  ("Plan + implement ADR-267 (4 landing groups...)") as what comes next — no other in-flight work
  conflicts with this plan.
- `/Users/david/repos/sharpee_v2/CLAUDE.md` — never auto-retry failed builds/tests (report and wait);
  platform changes under `packages/` require discussion first (satisfied — ADR-267 is the discussion
  record); use `./repokit build` + `dist/cli/sharpee.js --test --chain` for transcripts, never the
  package-loaded path; never modify a working transcript's assertions to make it pass; never delete
  files without confirmation (relevant here — ADR-266 D2 retires `docs/reference/stdlib-chord/`, but
  that deletion belongs to ADR-269, not this plan).
- `docs/reference/chord.ebnf` (lines 365–412) — current productions this plan's Phase 1 converges:
  `define-verb`'s `pattern = { WORD | "(" WORD ")" }` (line ~372) and `define-action`'s
  `pattern-line = ( WORD | ":" WORD )+` (line ~408) are the two productions D1 collapses into one.

## Phase-ordering note

The four phases below are **not** independent — D6 orders them explicitly and each later group
assumes the previous group's spelling and wiring precedent are settled: Phase 1 fixes the slot
spelling every later pattern-line depends on; Phase 3's typed-slot declarative-line idiom
(`the <slot> is an instrument`) is the same line family Phase 4's `means`/`directions` lines extend;
Phase 4 cannot start before every other spelling is fixed (D6: "lands last with every spelling
settled"). Run them in the order below — this is a real dependency chain, not an artifact of
planning convenience.

## Phases

### Phase 1: Landing group 1 — slot spelling convergence, reserved-surface audit, shadow warning (D1, D2, D6.1)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: `packages/chord` (EBNF, `parser.ts`, `analyzer.ts`, `ir.ts`), `packages/story-loader`
  (the `the animal` → `:animal` mechanical translation at load), every shipped `.story` file and docs
  example carrying the old spellings.
- **Entry state**: ADR-267 ACCEPTED. `packages/chord` builds clean on main.
  `docs/architecture/chord-grammar-changes.md` carries no D15 row yet (confirmed above). No prior
  changes to `parser.ts`/`analyzer.ts`/`ir.ts` from this work.
- **Deliverable**:
  - `chord-grammar-changes.md` row for D15 (slot spelling `the <name>`), owner-approved, written
    **before** implementation begins (D4 — this row is owed immediately with the ADR's acceptance).
  - EBNF converged per D1: `pattern = pattern-elem { pattern-elem }`,
    `pattern-elem = WORD | "the" WORD`, one `pattern-line` production shared by `define-verb` and
    `define-action`; `define-verb`'s `(something)` parens and `define-action`'s `:slot` colon are
    both **removed** (a colon or paren slot becomes a parse error, not a legacy spelling) — no
    deprecation period, no back-compat shim, per project policy.
  - Parser + analyzer updated to the converged production; IR carriage unchanged in shape (the slot
    *name* was always carried, only the pattern spelling changes).
  - Loader translation: `the animal` in a pattern compiles to `:animal` in the emitted pattern string
    passed to the real `GrammarBuilder` — nothing downstream of the loader changes.
  - **Reserved-surface audit** (acceptance 2 — covers all four words this ADR family makes
    structurally significant, run together since the scan infrastructure is shared): confirm, against
    all 422 standard-grammar rules, every shipped story (`cloak-of-darkness`, `fernhill`,
    `friendly-zoo`, `dungeo`, `thealderman`, and the rest under `stories/`), and every docs example,
    that no pattern needs a literal `the` or `or`, no pattern begins with `means`, and no pattern line
    is bare `directions`. Record the audit's result (pass, or named exceptions with a diagnostic
    plan) — this gates every later phase, since D8/D12 (`or`, `means`, `directions`) are ruled here
    but land in Phases 2 and 4.
  - `analysis.slot-shadows-entity` warning diagnostic (D2): fires when a declared slot name collides
    with a single-word entity name referenced in the same block; message names both the slot and the
    shadowed entity; slot-first resolution behavior is unchanged (verified against
    `analyzer.ts:3149-3193`).
  - Migrate every shipped `.story` file using the old spellings to `the <name>` — confirmed sites:
    `stories/fernhill/fernhill.story` and `stories/friendly-zoo/zoo.story` (colon slots in `grammar`
    blocks), `stories/cloak-of-darkness/*.story` (`define verb hang or hook means put (something) on
    (something)`), plus any other shipped story or docs example the audit turns up. Migration is
    mechanical (same construct, new spelling) — no behavior change expected.
  - Tests: EBNF/parser/analyzer unit tests asserting the converged production accepts `the <name>` and
    rejects both old forms with a named parse error (not silence); `analysis.slot-shadows-entity` test
    asserting the warning fires on the collision case with both names in the message and that
    resolution is unchanged (acceptance 3); a loader test asserting the emitted pattern string
    translation (`the animal` → `:animal`) against a real `EnglishGrammarEngine` (D3's bar).
  - ADR-257 bump to the next **major** (D2: removed/renamed construct — parens and colon syntax that
    parsed before no longer does) — currently `1.4.0`, so `2.0.0` — with the `chord.ebnf` pin updated
    in the same change (D5).
- **Exit state**: One slot production in the EBNF; `chord`, `story-loader`, and every shipped story's
  test/transcript suite green on the new spelling; reserved-surface audit result recorded (pass or
  named exceptions resolved); `analysis.slot-shadows-entity` live and tested; `chord-grammar-changes.md`
  carries the D15 row; `CHORD_LANGUAGE_VERSION` at the next major. `./repokit build` succeeds and
  affected shipped-story transcript suites pass unchanged in behavior.
- **Acceptance coverage**: Acceptance items 1 (one pattern production), 2 (reserved-surface audit,
  all four words), 3 (shadow warning), and the D15 slice of item 7 (cloak's `define verb` migrates).
- **Test gate**: `pnpm --filter '@sharpee/chord' test <name>`; `pnpm --filter '@sharpee/story-loader'
  test <name>`; `node dist/cli/sharpee.js --test --chain stories/fernhill/... stories/friendly-zoo/...
  stories/cloak-of-darkness/...` after `./repokit build`.
- **Status**: DONE (2026-07-25, session 2d5bc7). Audit PASS recorded
  (`reserved-surface-audit.md`); chord 545/545 (8 new slot-spelling tests), story-loader 384/384,
  devkit 83+1 skip; friendly-zoo units 76/76 + chain 56/56, fernhill 494/494 + wt 76, cloak 81/81.
  Implementation finding: cloak.story's hatch path `./extras.ts` was story-dir-relative-broken
  (file lives at `src/extras.ts`) — pre-existing latent break surfaced by the acceptance run,
  fixed story-side to `./src/extras.ts`. Pre-existing, untouched: `bar-darkness.transcript`
  excluded by transcript-lint (3 unasserted commands).

### Phase 2: Landing group 2 — alternation, optional words, greedy slot (D8, D9, D10, D6.2)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: `packages/chord` (EBNF, parser, analyzer, IR for three independent pattern-line
  constructs), `packages/if-domain` / `packages/story-loader` (loader emission onto the real
  `GrammarBuilder`).
- **Entry state**: Phase 1 done — slot spelling converged, reserved-surface audit passed (in
  particular, no rule needs a literal `or`), `analysis.slot-shadows-entity` live. `CHORD_LANGUAGE_VERSION`
  at the post-Phase-1 major.
- **Deliverable**:
  - **Alternation (D8)**: `look in or inside the target` — adjacent literals joined by `or` are
    alternates of one rule. Loader emission: one pattern string with `|`-alternation, **one**
    registered rule (never N split rules — this would break rule identity under ADR-268's future
    ordering work). `or` binds between single elements; D15's `the`-marked slots keep line structure
    unambiguous.
  - **Optional words (D9)**: `look [carefully] at the target` — bracketed elements. Loader emission:
    the element is marked optional in the emitted pattern string (`[word]`), one registered rule.
    Composes with alternation and slots (`[in or inside]`, `[the target]`).
  - **Greedy slot (D10)**: a declarative line, `the <slot> takes the rest of the line`, under the
    `grammar` block (same line family as `must be`/`refuse without`). Loader emission: the slot
    compiles to `:slot...` in the emitted pattern string (a `TEXT_GREEDY` rule). Analyzer: the named
    slot must exist in at least one of the action's patterns, else `analysis.unknown-slot` (the
    existing diagnostic, reused — same treatment as constraint lines).
  - Each construct's own EBNF production, parser/analyzer support, IR carriage, and loader emission —
    landed independently per D6 ("small, independent, pure pattern-line structure"), but may be
    implemented in any order within this phase.
  - `chord-grammar-changes.md` row per construct (three rows: alternation, optional words, greedy
    slot), each owner-approved before its own implementation begins.
  - Tests per construct asserting the emitted rule **shape** against a real `EnglishGrammarEngine`:
    alternation emits one rule (not N), optional marks the element optional, greedy produces a
    `TEXT_GREEDY`-consuming rule; a malformed form (e.g. a greedy line naming a slot absent from every
    pattern) produces the named diagnostic, never silence.
- **Status**: DONE (2026-07-25, session 2d5bc7, "Proceed"). Three rows written before
  implementation; chord 569/569 (16 new pattern-construct tests; IR golden churn =
  languageVersion only, AST goldens gain the additive `greedy: []` field), story-loader
  389/389 (5 new emission-shape tests: one-rule alternation `look in|inside :target`,
  `[carefully]`, `:message...`); ADR-257 minor bump 2.0.0 → 2.1.0 with ebnf pin; transcript
  regression unchanged (friendly-zoo 76+56, fernhill 494+76, cloak 81).
- **Exit state**: All three constructs landed whole (D3) with passing shape-asserting tests;
  `chord-grammar-changes.md` carries the three rows; ADR-257 bumped one **minor** for this landing
  group (additive constructs, D2). `pnpm --filter '@sharpee/chord' test` and the affected package
  suites green.
- **Acceptance coverage**: Acceptance item 4 (alternation/optional/greedy slices), item 5
  (`chord-grammar-changes.md` rows + ADR-257 bump for this group).
- **Test gate**: `pnpm --filter '@sharpee/chord' test <name>`; loader/if-domain tests asserting emitted
  `GrammarRule` shape.
- **Status**: PENDING

### Phase 3: Landing group 3 — typed slots, `instrument` and `topic` (D11, D6.3)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: `packages/chord` (new declarative-line idiom under `action-line`),
  `packages/if-domain` (`.slotType(slot, type)` emission — already exists on the builder per ADR-266's
  audit, zero call sites today).
- **Entry state**: Phase 2 done — alternation/optional/greedy landed; the `grammar` block's
  declarative-line family (`must be`, `takes the rest of the line`) is the established idiom this
  phase extends.
- **Deliverable**:
  - `the <slot> is an instrument` / `the <slot> is a topic` as declarative lines under `action-line`,
    grouped with `must be reachable` and `takes the rest of the line` — pattern lines carry only what
    the player types (D11's stated design goal).
  - Only these two types exist in Chord (the narrowed set, per ADR-266's D12′ narrowing from nine
    unused `SlotType`s to the two with real call sites). An unknown type word is a named analyzer
    error listing the supported set (`instrument`, `topic`) — the ADR-271 D11 closed-set precedent
    reused here, not reinvented.
  - Loader emission: `.slotType(slot, INSTRUMENT | TOPIC)` on the emitted rule, via the real
    `GrammarBuilder`/`ActionGrammarBuilder` surface (not just carried to the IR and dropped — the
    ADR-235 D2 / ADR-271 wiring bar).
  - Analyzer: the named slot must exist in the action's patterns (reuses `analysis.unknown-slot`, same
    treatment as the greedy-slot and constraint lines from Phases 1–2).
  - `chord-grammar-changes.md` row (one row covering both `instrument` and `topic`, since they are one
    construct — "typed slots" — narrowed to two type words).
  - Tests asserting the emitted rule's `SlotType` against a real `EnglishGrammarEngine` for both
    `instrument` and `topic`; a test asserting the unknown-type-word diagnostic lists exactly the two
    supported words.
- **Exit state**: Typed slots landed whole; `chord-grammar-changes.md` carries the row; ADR-257
  bumped one **minor**. `pnpm --filter '@sharpee/chord' test` and affected package suites green.
- **Status**: DONE (2026-07-25, session 2d5bc7). chord 574/574 (5 new typed-slot tests),
  story-loader 390/390, if-domain 95/95; version 2.2.0 + pin; transcripts green
  (friendly-zoo 76+56, fernhill 503 — one non-reproducing RNG flake on first run, per-file
  all green — cloak 81). Implementation finding, fixed in-gate: if-domain
  `grammar-engine.ts` `applySlotType` had no `SlotType.TOPIC` case — a declared TOPIC
  slot silently dropped (the ADR-235 D2 class); one case added. Observation surfaced,
  not changed: that switch's `default` still silently drops unmapped types
  (e.g. QUOTED_TEXT).
- **Acceptance coverage**: Acceptance item 4 (typed-slots slice), item 5 (row + bump for this group).
- **Test gate**: `pnpm --filter '@sharpee/chord' test <name>`.
- **Status**: PENDING

### Phase 4: Landing group 4 — semantic defaults + direction map, ship-directions fixture, final gap-report closure (D5, D12, D6.4, D7)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: `packages/chord` (`means <key> <value>` static-default line, `directions` block
  bound to the `direction` slot), `packages/if-domain`/`packages/story-loader`
  (`.withDefaultSemantics({…})` emission, direction-alias × semantic-direction cross-product), a new
  nautical-direction fixture story, and the ADR-266 D5 gap report itself.
- **Entry state**: Phase 3 done — every other spelling (slots, alternation, optional, greedy, typed
  slots) is settled, satisfying D6's precondition that this group "lands last with every spelling
  settled." This is the largest and most coupled group (D5: semantic defaults and the direction map
  are one design, not two).
- **Deliverable**:
  - **`means <key> <value>`** (general static-defaults form, D12): an indented line under a pattern
    line, e.g. `hide behind the target` / `  means position behind`. Only static key/value defaults —
    the three `withSemantic*` mapping methods stay unported (D12′: `SemanticMapping.compute` is a
    function, unportable to a declarative language).
  - **`directions` block bound to the `direction` slot** (D12): `the direction` is a slot (D15
    spelling), not a keyword — plain pattern spelling; the block gives it expansion semantics.
    `north or n` / `south or s` / … declares the canonical set with `or`-joined aliases (D8's word, in
    exactly its ruled meaning). Every pattern using the slot expands across the set with
    `direction: <canonical>` as that rule's semantic default. A bare `the direction` pattern line
    registers the standalone forms (`north`, `n`, …).
  - **Not compass-hardcoded** (owner ruling, must hold for ship directions): a `directions` block is
    per-action vocabulary — any action can declare its own aliased set and get the same expansion,
    defaults, and standalone forms.
  - Loader emission: cross-product rules carrying `.withDefaultSemantics({direction})` (or the `means`
    key/value pair) via the real builder surface; standalone-direction rules for the bare pattern.
    A `means`/`directions` line naming a slot absent from every pattern is `analysis.unknown-slot`.
  - **The ship-directions test (acceptance 8, owner condition)**: a fixture story defines a sailing
    action with a nautical `directions` block (`port or p`, `starboard or sb`, `fore`, `aft`) —
    expansion, per-rule `direction` defaults, and standalone bare-direction commands all hold exactly
    as for the compass block. A transcript proves `sail port` and bare `starboard` reach the action
    with the right direction.
  - `chord-grammar-changes.md` rows for semantic defaults and the direction map — **two rows**, one
    per construct (owner ruling 2026-07-25, matching D12′'s table and acceptance item 5's "one row
    per construct"; D5 unifies the design, not the paper trail).
  - **Final gap-report closure (D7, acceptance 6)**: run ADR-266 D5's gap report against the 422-rule
    baseline. This ADR is done when the report is empty **except the ordering rows** (ADR-268's, out
    of scope here). Any non-ordering row remaining at this point is a defect in one of Phases 1–4, not
    a new finding to defer.
  - **Full regression (acceptance 7)**: chord package tests, story-loader tests, and every shipped
    story's transcript suite (`fernhill`, `friendly-zoo`, `dungeo`, `thealderman`, `cloak-of-darkness`,
    the ship-directions fixture) green via `./repokit build` + `dist/cli/sharpee.js --test --chain`.
    Review every diff individually — an unexpected behavior change is a finding to surface, not to
    accommodate.
- **Exit state**: Semantic defaults and direction map landed whole; ship-directions transcript passes;
  gap report empty except ordering; every existing suite green; `chord-grammar-changes.md` carries the
  final two rows; ADR-257 bumped one **minor** (the fourth and last group bump for ADR-267 — the ADR's
  own "up to six bumps, or fewer" allows this since group 1 already absorbed one major and groups 2–4
  are three additive minors, i.e. `2.0.0 → 2.1.0 → 2.2.0 → 2.3.0`, unless owner rulings during
  implementation combine any of them). ADR-267 is ACCEPTED-and-implemented; ADR-268 (ordering) is the
  next child in the umbrella's sequence.
- **Acceptance coverage**: Acceptance items 4 (semantic-defaults/direction-map slice), 5 (final rows +
  bump), 6 (gap report empty except ordering), 7 (existing suites green), 8 (ship-directions fixture).
- **Test gate**: `pnpm --filter '@sharpee/chord' test <name>`; `node dist/cli/sharpee.js --test --chain
  stories/*/walkthroughs/*.transcript` (per-story, per CLAUDE.md conventions) plus the new
  ship-directions fixture's transcript; the gap-report generator run against `grammar.ts`.
- **Status**: PENDING
