# Session Summary: 2026-07-20 ~22:10 - chord-foundations (session 99aee6)

## Goals
- Plan the ADR-245 phrasebook work (David's direction, correcting an
  open-items-sweep misread): design-level companion ADR (grammar, IR/registry
  shapes, save shape, diagnostics, unreliable-narrator E2E spine) then
  implementation phases, per ADR-245's own gate.

## Completed
- **Plan written**: docs/work/adr-245-phrasebooks/plan.md (7 phases:
  companion ADR draft → review/interview → David gate → Chord surface →
  rendering seam → E2E → docs); .current-plan repointed; plan-review
  advisory-only (ADR-235 stale re: `use` implementation — amendment
  candidate).
- **ADR-249 authored (DRAFT)**: Chord comments — raised by David before
  phrasebook work. Final ruled shape after in-session iteration:
  `##` comment lines only, between top-level constructs only
  (structural — "create is a block, no comments in blocks"),
  blank-line-delimited on both sides (hard rule); NO EOL comments; no
  block construct (stacked ## lines); prose renders #/## verbatim.
  Diagnostics: lex.comment-blank-lines, parse.comment-inside-block.
  adr-review run: 3 gaps folded (edge case, diagnostic ids, AC/tests).
  Grammar-changes log row added (approved in-session).

## Completed (cont.)
- **ADR-249 re-review clean (13/13)** after David's final rulings folded:
  structural "no comments in blocks", blank-line delimitation hard rule,
  file-top exception; Decision-4/AC diagnostic mismatch unified on
  parse.comment-inside-block at any indent.
- **ADR-249 plan written + plan-review clean** (docs/work/
  adr-249-chord-comments/plan.md, 3 phases) and **MERGED into the 245
  plan as Phases 0a–0c** at David's direction; companion ADR renumbered
  ADR-250 (249 taken by comments); single CURRENT = Phase 0a gate.

## Completed (cont. 2)
- **Phase 0a gate closed** (David "go" = ACCEPTED flip + platform go-ahead).
- **Phase 0b COMPLETE**: lexer `Line.comment` flag + blank-delimitation
  (`lex.comment-blank-lines`, one per run, file start/end = blank); parser
  top-level skip + `parse.comment-inside-block` via reportCommentInsideBlock/
  skipCommentInsideBlock + looksLikeComment guards at 10 body-loop sites
  (trait/action/sequence/topics/channel/pronouns/machine/statements/
  trait-fields/define-phrase[flag-only — indented ## is prose there]);
  create split handled by parseFile lookahead + recover. 18 new tests in
  packages/chord/tests/comments.test.ts; chord 416 green; full
  `./repokit build dungeo` clean.
- **Phase 0c COMPLETE**: comments-golden.story (commented cloak twin) IR-
  identical modulo spans — spans legitimately shift past comments; ADR AC 3
  amended to say "modulo source spans". fernhill.story annotated live
  (file header + between-constructs): wt-01 walkthrough 76 PASS, unit
  transcripts 483/483. Docs: chord-language.md §1.3 (example-first),
  chord-grammar.md Comments section + story-file production, chord.ebnf
  comment-run production. Grammar-log row marked implemented.

## Completed (cont. 3)
- **Phase 1 COMPLETE (2026-07-21)**: ADR-250 (chord-phrasebook-design)
  drafted from three parallel grounding audits. Load-bearing design:
  resolution = ONE ADR-240 evaluator per book-covered-not-story-defined
  key (`phrasebook.template.<K>`), read at phrase-render before the
  getTemplate fork (lang-en-us gains only renderTemplate()); story-beats-
  book decided statically at load; per-entity free via existing emit-time
  key-mangling; variant counters reuse TEXT_STATE with entityId
  `phrasebook.<book>` (no new capability); whole-turn voice coherence
  stated (post-turn rendering refinement of ADR-245's mid-turn wording);
  world-model + runtime.ts + messages-map all UNTOUCHED. `use phrasebook`
  two-word branch beside untouched one-word use; `import phrasebook` via
  host importResolver hook (browser-safe), shaped to generalize. 13
  diagnostics; fernhill midnight-voice E2E spine; Q-1 (dotted keys in
  books, ADR-245 Q-2) sole Open Question.

## Completed (cont. 4)
- **Q-2 ruled by David directly** (no interview): dotted platform IDs NOT
  legal in books — "we're not surfacing Sharpee constructs in Chord."
  Folded into ADR-250 (D1 rule + analysis.phrasebook-dotted-key + AC/
  Consequences rewrites, Open Questions emptied) and ADR-245 (amendment
  note + Decision-1 SUPERSEDED annotation).
- **Phase 2 COMPLETE**: multi-ADR review (245+250) — 1 contradiction
  (245 D1 "any key" vs new ruling — amended), 2 small (evaluator return
  `{book, entry}` pinned in 250 D4.3; 245 mid-turn Consequence gains the
  whole-turn-coherence refinement pointer). All fixed same session.

## Completed (cont. 5)
- **Final ADR-250 review pass** (David-requested): found+fixed the
  used-book manifest-keys gap (PHRASEBOOK_REGISTRY carries {name, keys[]}
  — ADR-215 names-vs-mappings split — else used-book-only keys fail the
  missing-phrase gate), ADR-249 comment-guard note, community-framing
  wording removal. Late rulings folded: use phrasebook RETAINED (intent
  correction was framing-only — memory updated re: over-escalation);
  default-phrasebook naming (predicate-less book).
- **Phase 3 gate CLOSED** ("proceed"): ADR-250 ACCEPTED + go-ahead.
- **Phase 4 (chord surface) compile side DONE**: ast (DefinePhrasebook,
  UsePhrasebookDecl, ImportPhrasebookDecl, StoryHeader.usePhrasebooks),
  ir (IRPhrasebook, StoryIR.phrasebooks), parser (define phrasebook block
  w/ ADR-249 guard + phrase-override entry reuse; use two-word branch;
  import phrasebook top-level; TOP_KEYWORDS+import), analyzer (pass-1
  collection + 8 gates + bookKeys coverage into requirePhrase +
  partial-coverage warning + checkPhraseMarkers refactor + pass-2
  condition resolution into ir.phrasebooks), phrasebooks.ts registry,
  index.ts compile(options.importResolver) + fragment splicing.
  28 new tests (phrasebooks.test.ts); goldens updated (+usePhrasebooks/
  +phrasebooks empty keys only, verified); chord 444/444 green.
  Story-state condition form is bare state name (`while midnight`).

## Completed (cont. 6)
- **Phase 5 (ADR-250 rendering seam) — code complete, build clean, STOPPED
  by David mid-phase** ("stop before moving forward") before test execution:
  - if-domain: optional `renderTemplate` added to `LanguageProvider`.
  - lang-en-us: `renderTemplate(template, params, ctx)` extracted from
    `renderMessage` — the messages map itself untouched.
  - engine: `WorldModelLike.evaluate?` + `HandlerContext.world`, pipeline
    now passes world through; `phrase-render.ts` gains the phrasebook read
    point — exported `phrasebookTemplateKey()` + `PhrasebookResolution`
    (re-exported from engine root) — book hit consulted before the
    existing `getTemplate` fork, rendered via `renderTemplate` with merged
    params.
  - story-loader: new `phrasebook-data.ts` (`PHRASEBOOK_DATA` registry,
    exported). `runtime.ts` gains `resolvedBooks()` (use-book data +
    manifest conformance LoadErrors + dotted-key load validation),
    `registerPhrasebookEvaluators` (one ADR-240 evaluator per
    book-covered-not-story-defined key, called beside
    `registerDerivedEvaluators`), `resolvePhrasebook` (first-match walk;
    Choice keyed `phrasebook.<book>`/key), and a `phraseEvent` fix for
    book-only keys (bare-key emit + book-entry hatch staging replaces the
    prior LoadError throw).
  - Full `./repokit build dungeo` clean with all of the above landed.
  - **Written but NOT executed**: `packages/story-loader/tests/
    phrasebooks-runtime.test.ts` (registration set, arbitration + live
    flip, fallback-through, Choice keying, used-book conformance).
- **Two ADR-250 deviations found during implementation** — disclosed to
  David in-conversation, **not yet folded into the ADR text** (open item):
  1. D8's "runtime.ts NO change" claim was wrong: `phraseEvent` threw
     `LoadError` on book-only keys; fixed as described above.
  2. Evaluator return shape implemented as `{ book, key, template,
     params? }` — the loader derives template/Choice so the engine never
     learns Chord IR shapes (ADR-210 direction rule) — instead of the
     pinned `{ book, entry: IRPhrase }`.

## Key Decisions
- ADR-249 comment syntax rulings (David, this session): # EOL draft →
  superseded by simplification; ## whole-line always; top-level only,
  structural sense; blank-delimited hard rule.
- ADR-249 authored, ACCEPTED, and implemented (Phases 0a–0c) in the same
  session.
- ADR-250 authored and ACCEPTED, all David's rulings folded: Q-2 dotted
  keys ruled NO; `use phrasebook` retained after intent-clarification
  (framing-only correction, not a scope cut); default-phrasebook naming
  (predicate-less book) settled; used-book manifest-keys gap fixed in
  final review pass.
- ADR-249's companion ADR renumbered ADR-250 (249 already taken by the
  comments ADR raised mid-work).
- The ADR-249 plan was merged into the ADR-245 phrasebook plan as Phases
  0a–0c at David's direction, producing a single 7-phase plan (docs/work/
  adr-245-phrasebooks/plan.md) covering comments-as-prerequisite through
  phrasebook rendering; Phases 0a–0c and Phase 4 are COMPLETE, Phase 5 is
  CURRENT (in progress, stopped mid-phase per this session's stop point).

## Open Items / Next
- Run `packages/story-loader/tests/phrasebooks-runtime.test.ts` (written,
  unexecuted) and write the engine read-point unit test for
  `phrase-render.ts`'s new phrasebook consult.
- Amend ADR-250 for the two deviations found during Phase 5 implementation
  (runtime.ts change despite D8; evaluator return shape `{book, key,
  template, params?}` vs the pinned `{book, entry: IRPhrase}`).
- Phase 6 (fernhill unreliable-narrator E2E transcript) and Phase 7
  (docs/cookbook sweep) still pending, per plan.
- Full-suite regression sweep (engine, story-loader, lang-en-us,
  platform-browser) has not been run since the Phase 5 seam edits landed.
- Post-ADR-248 open-items sweep still parked (royal-puzzle RNG gate ruling
  etc.) — unrelated to this session's thread, carried forward.

## Session Metadata
- **Status**: IN PROGRESS — STOPPED at David's request mid-Phase-5 (code
  complete, build clean, tests unrun). Work was uncommitted at finalize
  time; this finalize commits it.
- **Test state**: chord 444/444 green (Phase 4 baseline); story-loader and
  engine suites NOT re-run after the Phase 5 seam edits; fernhill 483/483
  unit transcripts + wt-01 walkthrough green (ADR-249 comment annotation,
  Phase 0c); full `./repokit build dungeo` clean x4 across the session
  (Phases 0b, 0c, 4, 5).
- **Rollback safety**: safe to revert — no commit made yet this session;
  all Phase 5 changes are working-tree only.
