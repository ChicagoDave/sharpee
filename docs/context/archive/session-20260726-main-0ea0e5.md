# Session Summary: 2026-07-26 - main [0ea0e5]

**Goal**: Draft ADR-270 — the author alteration model (umbrella ADR-266 child; inherits
Q-14 and Gap 3(c); owes umbrella acceptance 15 — the I7-bar transcript test: remove a
standard verb, add a synonym to a standard action, reorder two competing rules).

**Status**: ADR-270 drafted, interviewed (5 rulings), reviewed 16/16, ACCEPTED, and
**IMPLEMENTED same session** (all five phases). Not yet committed.

## Work done

- Pre-session audit clean (repo green, ADR-269 committed at 6d8ec8fe; parked items don't gate).
- Grounding reads: ADR-266 (umbrella, full), ADR-269 (full), ADR-271 (full — D4 narrowed
  `define verb`, forward-noted to ADR-270); grammar-parity Part D; shipped
  `standard-en-us.story` inspected.
- Two code explorations. Load-bearing facts:
  - Engine has NO per-rule removal/disable/mask (only total untiered `clear()`, never called);
    rule identity is de-facto shape (ids nondeterministic, never read); comparator =
    confidence → tier (story unconditional at equal confidence) → specificity → definition order.
  - Story-side `define action` can only mint `chord.action.*` (loader.ts:1102); no path binds
    `if.action.*` grammar from a story; grammarFile IR marker read only by repokit.
  - Three `if.action.${gerund}` derivation precedents (interceptors validated, SM triggers
    unvalidated, repokit D10 validated); story-loader already depends on stdlib → id set
    available at load time.
  - `define verb` stub's consumption path is DEAD (registerDynamicVerbs only; addVerb never
    called; 'VERB NOUN PREP NOUN' vs 'VERB_NOUN_PREP_NOUN' format mismatch); cloak example
    works via vocabulary side effect.
  - Dead hook: IParser.setVerbEnabled?() declared, implemented nowhere.
- **ADR-270 DRAFT written** (`docs/architecture/adrs/adr-270-author-alteration-model.md`):
  D1 load-time composition over pristine base + loud-failure invariant; D2 extension by name
  derivation (story-first resolution), story tier, no conveniences, grammar surfaces only;
  D3 removal = new dual-surface engine primitive identified by shape; D4 reorder is
  compositional (no ordering syntax — ADR-268 stands); D5 EBNF paper trail, docs to ADR-272.
  Open: Q-1 (inherited Q-14) composition model (rec: incremental override), Q-2 spelling
  (rec: `extend action` + `remove from action` blocks), Q-3 upgrade severity (rec: load
  error), Q-4 `define verb` fate (rec: delete + migrate cloak), Q-5 container (rec: story
  constructs + spliced fragments).

## Key decisions

- ADR-270 interview (all five ruled by David, each the presented recommendation):
  - **Q-1 → D1** (inherited Q-14): incremental override — story-scoped alterations compose at
    load time over the pristine shipped base; wholesale replacement rejected.
  - **Q-2 → D6**: two dedicated blocks — `extend action <name>` / `remove from action <name>`.
  - **Q-3 → D1**: load error both directions (unknown name, unmatched removal shape);
    warning and split-severity rejected.
  - **Q-4 → D7**: `define verb` deleted — EBNF, stub, page; cloak.story migrates to
    `extend action`; completes ADR-271 D4's forward note.
  - **Q-5 → D8**: alterations live in the story file + spliced `.chord` fragments;
    grammar-file kind stays the base artifact's; ADR-269 D8's override-file hook resolved
    against.
- adr-review: 13/16 → three SMALL findings folded (Modules list; removal primitive =
  diagnostic-free `removeRules(...): number`, loader owns LoadError; extension validation
  against FULL IFActions id set, not interceptorConsultingActionIds) → 16/16.

## Open items

- Parked from last session (not this session's scope): migration-script deletion ruling
  (`chord-gap-report.cjs`, `generate-standard-grammar-chord.cjs`); `stories/thealderman`
  pre-existing tsc failure.

## Implementation (begun on David's "begin"; plan docs/work/author-alteration-model/plan.md)

- **Phase 0**: baseline green (chord 595, if-domain 95, story-loader 392,
  parser-en-us 285, cloak 81/81).
- **Phase 1 (Chord 2.5.0)**: extend/remove blocks parsed (parseActionBlockParts refactor
  shared with define action); analyzer gates by name (alteration-behavior, removal-shape,
  empty-extension; grammar files reject both); IR additive grammarExtensions/grammarRemovals;
  EBNF + pin + changes-row; 20 new chord tests; 615/615 (4 IR goldens re-recorded on
  David's OK — languageVersion-only diffs).
- **Phase 2**: GrammarEngine.removeRules(action, pattern, tier='standard'): number +
  builder delegation; diagnostic-free; shape identity; if-domain 102/102 (7 new).
- **Phase 3**: loader wiring — registerActionGrammar extracted (bare-verb forms gated to
  dispatch actions only); story-first resolution; FULL IFActions validation (not
  interceptorConsultingActionIds) with bounded-Levenshtein did-you-mean; removal LoadError
  on 0 listing actual patterns; harness gained captureGrammarEngine(seedStandard);
  8 new tests assert registered rule shape.
- **Phase 4 (Chord 3.0.0 MAJOR)**: define verb deleted everywhere (EBNF, parser →
  parse.removed-define-verb fix-it, DefineVerb AST, IRVerbDef + StoryIR.verbs, loader
  stub + getCustomVocabulary, website page + nav/links, own changes-row); cloak.story +
  chord fixture migrated to `extend action putting` / `hook the item on the hook` —
  verified live ("hook cloak on hook" → real stdlib putting; the old stub's path was
  dead); docs-examples-load narrowed to define-action; ide-protocol IRVerbDef re-export
  swapped for the alteration types; 5 snapshots re-recorded (fixture migration + version).
- **Phase 5**: stories/grammar-alterations/ + alter-standard-grammar.transcript 6/6
  (get removed → "I don't understand"; snag → taking asserted on inventory; read book
  flips reading → examining). Dual-surface: real EnglishParser getStoryGrammar()
  removeRules tests (parser-en-us 287). Root tsc clean; repokit 40 / devkit 83; corpus
  sanity green (cloak 81/81, fernhill, friendly-zoo, go-out-exiting 7/7, dungeo units
  1787 + accepted classes). **ADR-270 flipped IMPLEMENTED.**

## Flagged for David (not blocking)

- **Acceptance 1(iii) wording nuance**: the 29 static TIE pairs never co-match one
  runtime command, so the transcript's reorder leg demonstrates D4's stated mechanism
  (restate `read the target` under examining; story tier flips the winner) rather than
  literally restating a TIE-pair loser. Recorded in the ADR addendum and plan.
- Dungeo walkthrough CHAIN not re-run (units green; chain is the RNG-flaky long run —
  one-good-run baseline unchanged; changes touch chord/story-loader/if-domain additive
  paths only).
- Two Chord version bumps landed in one session (2.5.0 additive, then 3.0.0 for the
  define-verb removal) — per ADR-257 D2's rules, each with its own changes-row.

## Next steps

1. Commit (on go-ahead — not yet committed).
2. Remaining umbrella child: ADR-272 (docs surfaces) — now with the alteration
   constructs to document (extend/remove pages are explicitly 272's).
