# Session Plan: Map the Character Model (ADR-141/142/144/145/146) into Chord

**Created**: 2026-08-11
**Plan Status**: ACTIVE
**Superseded by**: `docs/work/adr-312-cli-test-recording/plan.md` (2026-08-12) —
on hold at David's direction until Saturday 2026-08-15. Phase 1 remains CURRENT
and every phase status is untouched; this plan resumes exactly where it stands.
**Overall scope**: Give `@sharpee/character` — 301 tests, zero consumers — its
first consumer, by mapping all six subsystems (personality, mood/disposition,
cognitive profile, goals, influence/resistance, information propagation) onto
Chord source, building the ADR-102 conversation seam that was never wired, and
proving the whole thing in play against a David-authored skeleton story.
**Bounded contexts touched**: Character Model domain (`packages/character`,
`packages/world-model`'s `character-model` trait), Chord Compiler Frontend
(`packages/chord`: lexer/parser/analyzer/IR), Story Runtime (`packages/story-loader`,
`packages/engine`), Dialogue/Conversation seam (`packages/if-domain`,
`packages/stdlib`'s asking actions — ADR-102).
**Key domain language**: personality, mood, disposition, cognitive profile,
goal, influence, resistance, propagation, phrasebook, `DialogueExtension`,
`ResponseAction` (the one conversation vocabulary — `tell`, `omit`, `lie`,
`deflect`, `refuse`, `ask back`, `confess`, `confabulate`, plus `misdirect`),
and the belief-outcome triple `(version, source, confidence)`.

## References consulted
- `docs/architecture/adrs/adr-310-character-model-in-chord.md` — the ACCEPTED source of all 21 decisions this plan implements; its Session section names four SMALL review findings (no ACs, no Implementation section, unowned ADR-141/144 amendments, D11a's normalization pass has no step list) that this plan exists to close.
- `docs/architecture/adrs/adr-102-dialogue-extension-architecture.md` — Status: `Proposed`. Defines the `DialogueExtension` interface and thin-shell action pattern (ASK/TELL/SAY/TALK TO delegate to a registered extension) that D19a requires stdlib to actually implement; this plan's Phase 2 is that implementation, and flips this ADR's status in the same commit per D19a's explicit ownership rule.
- `docs/architecture/adrs/adr-141-character-model.md` — Status: `DRAFT`. Owns the preset-name table (`stable`/`obsessive`/`dementia`/…) that D5 renames and the builder vocabulary D11a normalizes; this plan assigns its amendment to Phase 3, the phase that executes D5.
- `docs/architecture/adrs/adr-144-information-propagation.md` — Status: `DRAFT`. Owns `SpreadsVersion` (`'truth' | 'lie'`), the `selective` tendency value, and `vague` coloring — all three retired by D10/D17; this plan assigns its amendment to Phase 6, the phase that executes D10/D16/D17.
- `docs/context/project-profile.md` — Chord's package structure is a strict lexer → parser → analyzer → IR pipeline with mutation-signature test bar "assert on emitted IR shape and specific diagnostic codes, not just that parse/analyze returned without throwing"; TypeScript strict mode + CommonJS across the platform. Phase ACs below are written to that bar.
- `docs/context/session-20260810-2232-chord-writer-screenshots.md` — most recent session's Open Items (Chord Writer DMG blocked on notarization, ADR-308 testing-navigation interview not started, `package.sh` accepted→staple→DMG path untested) are unrelated to this plan's scope; recorded here so this plan does not silently reopen or ignore them.

**Plan review (2026-08-11, session c28ea0)**: `/devarch:plan-review` ran against
these six references and returned CONFLICTS FOUND — four contradictions, all
applied above. (1) Phase 7 routed dialogue per NPC, contradicting ADR-102's *One
Extension Per Story*; it now registers one extension that routes internally, and
ADR-310 D19a was reworded to match. (2) Phase 2 registered the dialogue extension
through `@sharpee/plugins`; ADR-102 specifies `world.registerDialogueExtension`,
and the plugins seam is now scoped to the save/tick-phase wiring D21 actually
names. (3) Four grammar phases added author-visible surface with no
`CHORD_LANGUAGE_VERSION` or `chord.ebnf` movement — now a standing requirement
below. (4) ADR-144's `selective`/`vague` amendment lagged its code change by
three phases; it moved to Phase 3. One advisory tension was also folded in and
has since been **resolved**: D17's proposed five-stage truthiness scale overlapped
the shipped eight-value `ResponseAction`. David ruled one vocabulary — D17 is a
view over the eight, not a rival to them — and D17 plus Phase 6 were rewritten
accordingly (2026-08-11).

**A note on ADR status vs. the plan**: both ADR-141 and ADR-144 currently read
`Status: DRAFT`, not `Accepted` — consistent with this codebase's standing
note that ADR status lines are unreliable and are verified against code, not
trusted. This plan amends both regardless of their header status, because the
constraints they record (the preset table, the propagation vocabulary) are
load-bearing on shipped code either way.

**Platform-change constraint (CLAUDE.md).** Every phase below except Phase 1
and Phase 9 touches `packages/`. Each such phase must be discussed with David
before implementation begins, per CLAUDE.md's "Platform changes require
discussion first." Behavior Statements (rule 12) are required before writing
any test for a new side-effect function in these phases, and Boundary
Statements (rule 8a) are required before editing anything under
`**/domain/**` or a trait/state module the phase touches.

**Chord language version (ADR-257 D2/D5) — applies to Phases 4, 5, 6 and 8.**
Every one of those phases adds author-visible grammar, and the project profile
names it as a reporting-without-mutation anti-pattern to claim a construct
"compiles" without moving the language's own surface markers. So each grammar
phase's exit state includes: bump `CHORD_LANGUAGE_VERSION`
(`packages/chord/src/version.ts:181`, currently `3.0.0`) and update the
`chord.ebnf` surface pin plus its recorded hash. `version.ts`'s own header rules
the case — *"the next additive construct after a 3.x publish takes an ordinary
minor by D2"* — so the first grammar phase to land takes `3.0.0` → `3.1.0` and
subsequent phases continue from there. **Both copies of the grammar file move
together**: `docs/reference/chord.ebnf` and `website/public/chord.ebnf`.

## Phases

### Phase 1: Elicit and draft the skeleton demonstration story (D14)
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: Story authoring — the acceptance fixture for the whole
  plan, not a bounded context of its own.
- **Entry state**: ADR-310 is ACCEPTED. No grammar work has started.
- **Deliverable**: A new Chord story file (location to settle with David in
  this phase — `stories/` per this plan's first draft, but Fernhill, the
  pure-Chord story this one most resembles, lives in `branch-stories/`; name
  TBD) that **does not compile yet** — written as the specification for the
  grammar D2–D13 describe. Content (setting, cast, what each character knows
  and hides) is elicited from David in conversation, never invented. The
  skeleton demonstrates: every construct in D2–D13 at least once; goals,
  influence/resistance, and propagation wired across the cast (not one NPC);
  and one phrasebook per psychological state for at least one character
  (D13/D12's cost test).
- **Exit state**: Skeleton story committed as a fixture. It is not expected to
  parse — later phases make it compile incrementally, and Phase 9 is the pass
  where it must fully play.
- **Status**: CURRENT (since 2026-08-11)

### Phase 2: Wire the greenfield seams — ADR-102 registration and save/restore (D19a, D21)
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: Dialogue/Conversation seam; Character Model persistence.
- **Entry state**: Phase 1's skeleton exists as a target (not a dependency —
  this phase can start in parallel with Phase 1). `DialogueExtension`
  currently lives inside `@sharpee/character`; stdlib has no registration
  point (`asking.ts:8` calls it "a future conversation extension");
  `CharacterPhaseRegistry.toJSON`/`fromJSON` and the three tick-phase
  factories (`createGoalPhase`, `createInfluencePhase`,
  `createPropagationPhase`) are unwired — `@sharpee/engine` does not depend on
  `@sharpee/character`.
- **Deliverable**:
  1. Move the `DialogueExtension` interface and `DialogueResult` type from
     `@sharpee/character/src/conversation/dialogue-types.ts` to
     `@sharpee/if-domain` (stdlib already depends on if-domain; no new
     dependency for stdlib, one new inward-pointing dependency for
     `@sharpee/character`, matching CLAUDE.md rule 8's dependency direction).
     **`DialogueResult` becomes generic** — `DialogueResult<TIntent = unknown>`
     in if-domain, `DialogueResult<ResponseIntent>` in character. This is
     required, not stylistic: `ResponseIntent` needs `Mood`/`Coherence` from
     `@sharpee/world-model`, and `world-model` already depends on `if-domain`,
     so moving the concrete type would close a cycle. David's ruling
     2026-08-11 after a full options comparison; the deciding factor was the
     `LanguageProvider`/`lang-en-us`/stdlib precedent, which is the same
     relation in the same direction. `ResponseIntent` itself stays in
     `@sharpee/character`.
  2. Build the stdlib registration point **exactly as ADR-102 specifies it**:
     `world.registerDialogueExtension(ext)` / `world.getDialogueExtension()`,
     with ASK/TELL/SAY/TALK TO delegating to the registered extension and
     falling back to today's behavior when none is registered. Flip ADR-102
     `Proposed` → `Accepted` in the same commit (owned by this phase per D19a).
     **Do not** route this through `@sharpee/plugins` — D19a implements
     ADR-102, it does not amend it, so the registration mechanism is ADR-102's.
  3. Register `CharacterModelDialogue` (the existing, only implementation) as
     that one world-level extension. Note this is registration only — a
     dialogue extension is not save state, and conflating it with item 4 was a
     plan-review finding.
  4. **Separately**, wire `CharacterPhaseRegistry`'s save/restore participation
     and the three tick-phase factories through `@sharpee/plugins`, so a
     mid-story save/restore preserves goal progress, active influences, and
     already-told records (today it silently resets them while personality/
     mood/beliefs survive). `@sharpee/plugins` is the right seam here and only
     here — it is the one ADR-310 D21 names, and it keeps `@sharpee/engine`
     free of a `@sharpee/character` dependency.
- **Exit state**: `pnpm --filter '@sharpee/engine' test` and
  `pnpm --filter '@sharpee/character' test` green. A round-trip test
  (save → restore) demonstrates goal step, an active influence, and an
  already-told record all surviving restore — extending the existing
  `tests/tick-phases/save-restore.test.ts` coverage to go through the actual
  engine save path rather than calling `CharacterPhaseRegistry` directly
  (Integration Reality Statement required: this is exactly the "owned
  dependency, real-path test" case CLAUDE.md rule 13a names). ADR-102 reads
  `Accepted`.
- **Status**: PENDING

### Phase 3: Normalize `@sharpee/character` to the Chord vocabulary (D5, D11a) — amend ADR-141
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: Character Model domain — personality, mood, cognitive
  profile, propagation vocabulary, and the predicate language shared across
  goals/influence/phrasebooks/transitions.
- **Entry state**: Phase 2 complete (so normalization does not fight the seam
  work over the same files). `@sharpee/character` is greenfield — zero
  consumers, verified 2026-08-11 (301 tests, 19 files, all passing) — so this
  is the only session this rename is free.
- **Deliverable** (the D11a step list this plan owes, per the ADR's review
  finding):
  1. Rename `COGNITIVE_PRESETS` keys and `CognitivePresetName` per D5's table
     (`stable`→`clear-headed`, `obsessive`→`fixated`, `dissociative`→`elsewhere`,
     `intoxicated`→`loosened`, `tbi`→`fogged`, `ptsd`→`braced`,
     `dementia`→`unmoored`, `schizophrenic`→`unquiet`); update every internal
     reference and the umbrella re-export at
     `packages/sharpee/src/index.ts:74-82`.
  2. Audit builder-API naming against the Chord forms D11a names as worse on
     the TypeScript side (`resistsInfluence('seduction')` vs. `resists
     seduction`, `.propagation({tendency:'selective',...})` vs. `spreads … to
     anyone`) and rename to match.
  3. Drop vocabulary the mapping proves redundant: remove `selective` from
     the propagation tendency enum (D10 — listing what an NPC spreads already
     is selectivity) and `vague` from `PropagationColoring` (D17 — it is
     `obfuscation` on the wrong axis). **Amend ADR-144's tendency table and
     coloring table in this phase, not Phase 6** — the record must not document
     vocabulary the code has already dropped (plan-review finding). Do not yet
     replace `SpreadsVersion` with D17's five-stage scale — that is Phase 6,
     alongside the fact registry it depends on, and it carries the rest of
     ADR-144's amendment with it.
  4. Design and implement one predicate language, used by D8's `active when`,
     D9's `except`, D13's `while`, and D3's transitions — a single
     AST/type shared across all four call sites, not four condition syntaxes
     that happen to look alike.
  5. Design the fact structure D16 needs on the TypeScript side: a
     first-class, story-level fact registry with a name, a true version, a
     false version (feeding D17's `the lie`), and internal parts (feeding
     D17's `omission`, which is "not free" precisely because it needs a fact
     to *have* parts). Chord-side `define fact … end fact` parsing is Phase 6;
     this step is the runtime structure it targets.
  6. Re-derive the 301 tests against the ADRs — new Behavior Statements per
     rule 12 for every touched module, not a mechanical rename-to-keep-green
     (the ADR is explicit that this is the cost being paid deliberately).
  7. Amend `docs/architecture/adrs/adr-141-character-model.md`: replace the
     preset table with D5's names, and note the vocabulary this phase drops.
- **Exit state**: `pnpm --filter '@sharpee/character' test` green with
  re-derived tests. `CognitivePresetName`/`COGNITIVE_PRESETS` exported from
  the umbrella use the new names. `docs/architecture/adrs/adr-141-character-model.md`
  reflects the shipped vocabulary, and ADR-144's tendency/coloring tables no
  longer document `selective` or `vague`.
- **Status**: PENDING

### Phase 4: Chord grammar — personality, mood, disposition, cognitive profile (D2–D7, D15)
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: Chord Compiler Frontend, entity-level declarative
  constructs.
- **Entry state**: Phase 3's vocabulary and predicate language are final.
- **Deliverable**: Lexer/parser/analyzer/IR support for: personality as an
  adjective-list extension (D2, unknown-trait compile error in the existing
  diagnostic shape); `mood`/`feels`/`knows` declarations and `change mood to
  X` / `change feeling toward Y to Z` transitions reusing the `change` verb
  (D3); `cognitive-profile` with named `define profile … end profile` blocks,
  partial-override manifest syntax (`cognitive-profile clear-headed with
  coherence drifting`), and the eight renamed presets as defaults (D4–D5);
  entity-to-entity disposition (`the Maid trusts the Cook`) as a pure grammar
  widening (D15, no new runtime — verify no runtime change was needed, don't
  add one); D7's opt-in invariant (`a person` with no personality line
  compiles identically to today) as a regression test against an existing
  Fernhill/Dungeo NPC.
- **Exit state**: Round-trip tests — Chord source in, `CharacterModelTrait`
  out, matching the (normalized) builder's own output — exist per construct
  above, asserting on IR shape and diagnostic codes per the project's Chord
  mutation-signature bar, not just "parsed without throwing." An unknown
  personality trait, mood word, or profile dimension value produces a named
  compile error. `CHORD_LANGUAGE_VERSION` and both `chord.ebnf` copies updated
  per the standing language-version requirement above.
- **Status**: PENDING

### Phase 5: Chord grammar — goals and influence/resistance (D8–D9)
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: Chord Compiler Frontend, block-structured constructs.
- **Entry state**: Phase 3's predicate language is final. (Independent of
  Phase 4's output — both depend only on Phase 3 — so these two phases may be
  reordered or interleaved if that suits session scheduling.)
- **Deliverable**: `goal <name>, <priority> / active when … / <step verbs:
  seek, acquire, wait for, move to, act, say, give, drop> / end goal` (D8),
  compiling to ADR-145's builder shape, deactivation implicit via re-evaluated
  `active when`; `influence <name>, <mode>, <range> / <effect lines: clouds,
  makes, phrase … on witnessed|resisted> / end influence` and single-line
  `resists <name>, except <condition>` on the target (D9), compiling to
  ADR-146's builder shape. Step-verb and effect-key vocabulary is reserved
  per the Consequences section's warning about `act`/`say` collisions with
  ordinary authored prose — the analyzer must diagnose the collision, not
  silently prefer one reading.
- **Exit state**: Round-trip tests per construct (goal step ordering
  preserved, priority parsed, influence mode/range/effect-key validated,
  resistance `except` conditional evaluated) asserting on IR shape and
  diagnostic codes. Colonel Mustard's goal block and Ginger's influence block
  from the ADR's own examples compile and produce the documented IR.
  `CHORD_LANGUAGE_VERSION` and both `chord.ebnf` copies updated per the standing
  language-version requirement above.
- **Status**: PENDING

### Phase 6: Chord grammar — propagation, facts, and the truthiness scale (D10, D16, D17) — amend ADR-144
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: Chord Compiler Frontend + Story Runtime (information
  graph).
- **Entry state**: Phase 3's fact-structure design (step 5) exists. Phase 4
  is complete (propagation coloring interacts with mood; facts are
  referenced by `knows` declarations from Phase 4).
- **Deliverable**: `define fact <name> … end fact` at story level, a compile
  error for any `knows`/`spreads` reference to an undeclared fact name
  (D16); `spreads <fact> <tendency> to <audience>, except <exclusion>` /
  `spreads nothing` manifest syntax, with `selective` gone as a keyword
  entirely (D10).

  **Truthiness — one vocabulary** (David's ruling 2026-08-11, superseding the
  five-stage scale D17 first proposed). `ResponseAction`'s eight values are the
  vocabulary; D17 is a **view over them**, not a rival set. Retire
  `SpreadsVersion` and implement D17's **belief-outcome table** instead: each
  conversational action determines the `(version, source, confidence)` triple the
  listener records. Today `propagation/fact-transfer.ts` hardcodes
  `addFact(topic, 'told', 'believes', …)` for every transfer — the `version`
  field is carried and then ignored at the landing site, which is the actual
  defect D17 found. Add the ninth action `misdirect` (false version landing with
  source `inferred`) — the one thing the eight cannot express — and spell the
  eight/nine `ResponseAction` words on the Chord surface, never a second set.
  Amend `docs/architecture/adrs/adr-144-information-propagation.md` to retire
  `SpreadsVersion` (its `selective`/`vague` amendment landed in Phase 3,
  alongside the code change).
- **Exit state**: The Maid/Butler/Cook examples from D10 compile. A round-trip
  test exists **per `ResponseAction` row of D17's belief-outcome table**,
  asserting the correct `(version, source, confidence)` triple lands on the
  listener — not just that the keyword parsed. The `deflect`/`refuse`/`ask back`
  rows assert that nothing is transferred and the listener's confidence is
  unchanged. `docs/architecture/adrs/adr-144-information-propagation.md`
  reflects the shipped `SpreadsVersion` replacement (its `selective`/`vague`
  amendment landed in Phase 3). `CHORD_LANGUAGE_VERSION` and both `chord.ebnf`
  copies updated per the standing language-version requirement above.
- **Status**: PENDING

### Phase 7: Conversation routing — one syntax, two engines (D19, D19a)
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: Dialogue/Conversation seam; Story Runtime load-time
  wiring.
- **Entry state**: Phase 2 (ADR-102 registration point exists, `Accepted`)
  and Phase 4 (personality/mood exist as psychological predicates for
  gating) are both complete.
- **Deliverable**: The Chord frontend emits IR recording which NPCs carry a
  character model (no runtime dependency added to `@sharpee/chord` — it
  emits a fact, per D19a's browser-safety requirement that
  `packages/chord/package.json` carry no `@sharpee/*` dependency).

  **One extension, routing internally** (plan-review finding). ADR-102's
  "One Extension Per Story" rules that a story registers exactly one dialogue
  extension and that per-NPC variation is handled *inside* it — and D19a
  implements ADR-102 rather than amending it. So `story-loader` registers a
  single extension at load time; that extension reads the IR fact per NPC and
  dispatches character-model NPCs to `CharacterModelDialogue`'s path and the
  rest to the stdlib topic table. This is strictly less machinery than
  selecting between two registered extensions, and it keeps ADR-102's
  invariant intact.

  `about "<topic>" when <psychological predicate>` compiles for NPCs with a
  character model and is a compile error (in the standard unknown-name
  diagnostic shape) on NPCs without one.
- **Exit state — the strict-superset acceptance test (lifted from D19)**:
  Fernhill's two `define topics` blocks (source lines 693 and 705) — which
  use no psychological predicate — produce **identical play** whether
  Fernhill's NPCs carry a character model or not. This is written as an
  automated transcript/round-trip test, run against both engine paths, before
  this phase is considered done. If the property does not hold, D19 says the
  decision collapses back to coexistence — stop and report that to David
  rather than forcing the test green.
- **Status**: PENDING

### Phase 8: Phrasebook psychological gating and resolution semantics (D13, D18, D20, D20a)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Story Runtime — phrasebook arbitration.
- **Entry state**: Phase 3 (predicate language) and Phase 4 (mood/state exist
  as gate-able predicates) are complete.
- **Deliverable**: `while`/per-line `when` widened to accept entity-scoped
  psychological predicates (`while the Colonel is panicked`), reusing the
  same predicate language as D8/D9 rather than a fifth condition syntax
  (D13); mood and Chord `states:` remain two mechanisms with one spelling —
  `change mood to X` stays distinct from `change it to Y`, and no merge is
  attempted (D18); resolution stays the existing flat, source-ordered list
  with **no specificity ladder** — a gated-out entry falls through to the
  next book in declaration order rather than stopping resolution (D20); the
  analyzer warns when an unconditional book is declared ahead of a
  conditional book covering any of the same keys (D20's named footgun
  guard).
- **Exit state — D20a's counter semantics as an acceptance criterion**: a
  `first-time`/`cycling`/`sticky` counter on a `(book, key)` pair advances
  **only when that entry actually emits** — a gated-out entry (its `when`
  failed) must leave the counter untouched. Write this as a direct test
  against `story-loader/src/runtime.ts`'s counter state: hold an NPC out of
  the triggering psychological state for several turns, assert the
  state-book's `first-time` entry is still unconsumed when the state is
  finally reached. The `mustard-cornered` scenario from D20a's own worked
  example is the fixture.
- **Status**: PENDING

### Phase 9: Skeleton story compiles and plays — the D14 acceptance pass
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Whole-system acceptance — no single bounded context.
- **Entry state**: Phases 2–8 complete. Phase 1's skeleton story exists as
  written spec/fixture and has not yet been required to compile.
- **Deliverable**: Make Phase 1's skeleton story compile against the grammar
  built in Phases 4–8, iterating the story source (not the grammar, absent a
  genuine grammar gap surfaced only now) until it plays. Re-run Phase 7's
  strict-superset regression against Fernhill as a final check that nothing
  in Phases 4–8 broke it. Take a first, deliberately rough measurement of the
  Consequences section's open performance question — passive influence
  evaluation per NPC per turn, propagation audience walks, goal activation
  checks — against the skeleton's cast size, since "nobody has measured this"
  is currently true and this is the first story ever to exercise the path.
- **Exit state**: The skeleton story compiles with zero diagnostics and plays
  a full walkthrough transcript exercising every construct from D2–D13 at
  least once, goals/influence/propagation wired across the cast (not one
  NPC), and the one-phrasebook-per-state character's voice audibly changing
  across states in the transcript output — this is the D14 acceptance
  fixture, and it is the plan's definition of done. `@sharpee/character`
  has its first consumer.
- **Status**: PENDING
