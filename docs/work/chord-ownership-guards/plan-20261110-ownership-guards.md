# Session Plan: Chord refuses noun dispatch in action bodies, and story traits classify

**Created**: 2026-11-10
**Plan Status**: ACTIVE
**Overall scope**: The Chord compiler refuses the shape in which a `define action` body decides what happens by testing which thing the player named, and steers the author to the owner (`on the player <gerund>` on the thing or trait). A story `define trait` name becomes a working classifier after `is a` / `must be a`, so the owner idiom has a test to stand on. Conditions that compile and are always false become compile errors.
**Bounded contexts touched**: Chord Story Language (`packages/chord` compiler, `packages/story-loader` runtime reading of the Story IR); Normative Character Layer as a consumer only (the arbiter's kind scopes share the classification rule).
**Key domain language**: classification (kind or trait after `is a`), composition (a trait a `create` block names), slot (a `define action` grammar binding), owner clause (`on the player <gerund>` on a thing or trait), refusal partition (the leading `refuse` / `must` lines of a body), flag entity.

## References consulted

- `CLAUDE.md` — platform changes to `packages/` are discussed first; never auto-retry a failed build or test; never modify a working transcript; build with `./repokit`; Dungeo is a regression floor and not a Chord design input.
- `docs/core-concepts/README.md` — "Where the work is": a platform change is judged by whether platform and language fit together better; "Testing Patterns": a Chord feature's runtime test belongs in a tree document, a structural invariant in a package unit test, and state-changing behaviour is asserted on world state.
- `docs/context/project-profile.md` — Chord test assertions verify specific diagnostic codes and spans and the shape of emitted IR; "compiled without throwing" is insufficient. Test gates: `pnpm exec turbo run test:ci`, the Dungeo walkthrough chain after `./repokit build dungeo`, story trees through `./sharpee test`.
- `docs/context/session-20261110-1540-main.md` — open items are #671 and #672 (objective wording, an ADR status note); neither bears on this plan. The UNDERGROUND port lives in a separate repository that this plan reads and never edits.
- `docs/architecture/adrs/adr-289-chord-routing-decided-once.md` — D3: a refusal outside the leading partition of a body is a compile error, under two existing codes (`analysis.refusal-after-mutation`, `analysis.refusal-misplaced`). Guard 6 extends that gate; it does not invent a second one.
- `docs/architecture/adrs/adr-389-chord-loader-one-identity-and-a-build-list.md` — D4: a gate that is a fact of the finished IR alone is written once in `packages/chord/src/validate-ir.ts`, so the compile and the loader's backstop report it identically. D6: the three Chord test trees stay byte-identical across a phase that is not meant to move them.
- `docs/architecture/adrs/adr-270-author-alteration-model.md` — `extend action` carries grammar only (behaviour lines are `analysis.alteration-behavior`); `remove from action` removes a standard shape; a story pattern at the story tier outranks the standard one ("shadowing", recorded there as a cost). Guard 2 turns the shadowing shape into an error and must leave `extend action` and `remove from action` working.
- `docs/architecture/adrs/adr-359-every-entity-names-its-kind.md` — D1: classification reads the IR's recorded kinds and widens only `thing`. Ruling 1 widens what classifies; the ADR's text will no longer describe the rule (see the ADR question).
- `docs/architecture/adrs/adr-257-chord-language-version.md` and `packages/chord/tests/language-version.test.ts` — the EBNF file's hash is pinned beside the language version; any byte change to the grammar file needs the pin re-recorded with a dated note. The number moves at publish, not at a landing.
- `docs/architecture/chord-grammar-changes.md` — the owner-approved log: additions, renames and removals of forms are rows; "diagnostics wording" is not.
- `packages/chord/chord.ebnf` — the surface of record; its comments name the analysis gate beside the production it constrains (for example `analysis.holds-owner` at `holds-line`), and "Removed from the top level" records removed forms as fix-it errors with no production.
- ADR consultation was by relevance, not exhaustive: 404 records are on disk, and the ones above were read in the parts that bear on this plan.
- Product ADRs not consulted (no Scope intersection): none (no record on disk carries `**Kind**: product`).

## Rulings on record (David, 2026-11-10)

1. `the item is a treasure` — a story `define trait` name after `is a` / `must be a` — "should 100% work".
2. Guard 1 is an error on any occurrence: a `define action` line (`refuse when`, `must`, or a statement's `when` suffix) that tests one of the action's own slots for identity against a named thing. The diagnostic carries a fix-it naming the owner. `is a <kind or trait>` and `holds the <slot>` stay legal.

Guards 2, 3, 5 and 6 were proposed and discussed without objection. They are planned here as scope.

**Questions 1 to 7 ruled (David, 2026-11-10, "proceed" on the recommendations; recorded in ADR-394):**

1. A platform trait adjective after `is` (`the item is scenery`) reads the composition, through Phase 1's rule. `is a <platform adjective>` is refused: `is scenery` is the one spelling. Phase 3 takes its "read" branch.
2. Guard 1 also refuses `select on the <slot>` with thing-named arms. Named conditions stay legal.
3. Guard 2's fix-it names `on the player <standard gerund>` on the owner first, then `extend action` for new wording. A matching `remove from action` exempts the pattern. A fixed-noun line (`take me`) is not caught.
4. A `refuse when`, `refuse without` or requirement written below a statement in a `define action` is `analysis.refusal-misplaced`, as a placement rule.
5. Guard 3's remedy text stands as proposed.
6. ADR-worthy: yes. `docs/architecture/adrs/adr-394-responses-belong-to-their-owners.md` supersedes ADR-359 D1's classification rule and amends ADR-289 D3 and ADR-270.
7. Incidental fixture hits are not rewritten without asking: each is listed with its proposed rewrite and waits for David's go.

## What was verified while planning (compile probes against `packages/chord/dist`, 2026-11-10)

Each of these compiles with zero diagnostics today:

- `the item must be a treasure: key` where `treasure` is a story trait (and is always false at run time: `classifiesAs` reads kinds only).
- `refuse when the item is the sword: key` and `phrase valued when the item is not the sword` in a `define action`.
- `select on the item` with an arm `when the sword` in a `define action` — the same noun dispatch, spelled as a block.
- `define condition the-sword: it is the sword` with `the item must be any the-sword: key` — the same test behind a named condition.
- A story `define action grabbing` whose grammar is `take the item`.
- A placeless, proseless thing with `states:` used only by `change … to` and `is`.
- `the item must be a flurble: key` (no such kind or trait).
- `refuse when the item is scenery: key`.
- In a `define action`: `phrase valued` followed by a bare `refuse key`.
- In a `define action`: `phrase valued` followed by `refuse when …: key` and `… must …: key`. The compiled action carries one refusal, one requirement and a one-statement body: the parser lifts both lines out of the body wherever they are written, so they do run, before the body.

Two findings change the brief:

- **Guard 6 is half built.** `packages/chord/src/analyzer.ts#checkPhaseOrder` already refuses a dead refusal in every clause body, topic row, timer clause and move clause (ADR-289 D3). `packages/chord/src/analyzer.ts#buildAction` never calls it, so the `define action` body is the one body where a bare `refuse` after a statement compiles and never fires. `refuse when` and `must` lines in a `define action` are not dead: `packages/chord/src/parser.ts#parseActionBlockParts` hoists them. Written below a statement they are evaluated before it, so the source misstates the order.
- **`the <slot> is <declared state>` is already an error** (`analysis.unknown-value`: a slot subject validates against an empty state set). A `define action` cannot ask a slot's thing about its own declared state today. Not planned; listed under open items because it is one of the pressures toward flag entities.

## Decisions this plan makes

- **The EBNF comments move, the hash is re-pinned, the version does not move.** No phase adds syntax. Each phase that closes a form that compiled, or gives a form a meaning it lacked, edits the comment at the production it constrains in `packages/chord/chord.ebnf` (the file's own convention), re-records `ebnfSha256` in `packages/chord/tests/language-version.test.ts` with a dated note, and appends a row to `docs/architecture/chord-grammar-changes.md`: these are removals and one new meaning, which the log counts, not diagnostics wording, which it does not. `CHORD_LANGUAGE_VERSION` stays at 4.0.1; the number moves at publish. Several of these gates are breaking, so the number at the next publish is David's call (open item).
- **Where each gate lives.** A gate that is a fact of the finished IR alone goes in `packages/chord/src/validate-ir.ts` and is thereby the loader's backstop too (ADR-389 D4): the unknown classifier, the slot identity test, the repeated standard grammar, the flag entity. A gate that needs source position or analyzer state stays in the analyzer beside the rule it extends: refusal placement (`checkPhaseOrder`, which reads the block's line order) and the word closure for `the match` (`resolveIsObject`, where `analysis.unknown-value` already lives). Phase 3's unread-trait-word gate, if David rules it an error, is tested against the same rule when it is written: if it can be stated over the IR alone it goes in `validate-ir.ts`, and the phase says which in its report.
- **Grammar-change rows need the owner's approval.** Each row's Decision column cites David's ruling for that guard, or his approval of this plan for the guards it names as scope. No row is written for a guard he has not approved.
- **No IR change.** The IR already records trait compositions beside kinds on every entity. `IR_FORMAT`, the generated IDE protocol types, the stdlib manifest and the alias catalog are untouched.
- **Error messages cite no ADR.** Each new message states the problem and the fix in the removed-`if` fix-it's register; the reference goes in a comment above the gate.
- **Types.** No `unknown` or `any` is introduced; identifiers and diagnostic codes are unabbreviated.

## Census rule (every phase that adds an error)

Guard 1 has a census in hand (163 `define action` blocks in 44 corpus files, zero slot identity tests). No other guard has been censused. Each phase:

1. Writes the gate and its committed failing fixture first, with the gate's own unit test green.
2. Runs the census once before anything is committed: the corpus compile (every `.story` and `.chord` under `stories/`, `branch-stories/`, `packages/`, `tools/`, excluding `node_modules`, `dist`, `_archive`, `archive`, and `docs/unofficial/`), then one run of the `packages/chord` and `packages/story-loader` suites, read as a census of Chord source written inline in tests. That run's failures are the census result, not a failure to retry.
3. Disposes of each hit by where it is:
   - **A platform test fixture or an inline test source that uses the refused shape incidentally** (its own assertion is about something else): listed for David with the old line and the proposed guard-clean line, and the phase waits for his go before rewriting and running the suite once more. CLAUDE.md's rule against fix-and-rerun holds here unless David, approving this plan, says incidental fixture hits may be rewritten without asking.
   - **A test that exists to exercise the refused shape itself**: stop and take it to David with the test named.
   - **A real story under `stories/` or `branch-stories/`**: stop before the gate lands and report the file and line. A corpus story using the shape is evidence about the guard, and for content-held stories the rewrite is not this plan's to make.
   - **Anything that is not a census hit** (a failure the gate does not explain): a product failure. Stop and report; no fix-and-rerun.
4. Records the census counts in the phase's `**Demonstrated**` line.

Phase 5's guard is a warning: its census is a count in the report and never a stop.

## Phases

Phase 1 comes first for a real reason: Guard 1's fix-it steers authors to trait-owned clauses and `is a <trait>`, and that test must work before the guard that points at it lands. Phases 2, 3, 4 and 5 do not depend on one another and may run in any order David prefers; Phase 6 is last.

### Phase 1: Trait classification — a story trait classifies after `is a`, and an unknown classifier is refused
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: Classification. One rule, two sites: the evaluator's `is a` / `must be a`, and the character arbiter's kind scopes, both through `classifiesAs`.
- **Entry state**: David has approved this plan (the `packages/` discussion CLAUDE.md requires). Ruling 1 is on record. Question 1's `is a` half is answered, or the default stands: classifiers are kind nouns and story `define trait` names, and platform trait adjectives are not classifiers.
- **Deliverable**: `packages/story-loader/src/kind-classification.ts#classifiesAs` answers true when the entity composes the story trait the classifier names, reading the trait compositions the IR already records beside the kinds; its header states the widened rule. A classifier naming neither a kind noun (catalog or a used extension's) nor a declared trait is `analysis.unknown-classifier`, an error with a nearest-name suggestion, written in `packages/chord/src/validate-ir.ts`. Real-path tests through the loader asserting world state, and a tree-tested story. Implements Ruling 1 and the `is a` half of Guard 5.
  - A conditionally composed trait (`<trait> while <condition>`) classifies by declaration, whatever its condition says at the moment: classification is a static fact of the block, as a kind is. Stated in the header and pinned by a test.
  - The arbiter's scope classifiers are censused first (`branch-stories/secret-letter`, `branch-stories/ides-of-march`, `stories/character-acceptance`). If every classifier word in the corpus names a kind or a declared trait, the same gate covers scopes; if not, scopes stay ungated and the words are reported.
  - A `define trait` that takes a kind noun's name would make the classifier ambiguous: confirm an existing gate refuses it; if none does, the phase stops and reports instead of choosing a winner.
  - New fixture in the `each-iteration` style: a story trait composed on some things and not others; a `define condition` whose body is `it is a <trait> and …`; a trait-owned `on the player <gerund>` clause running `each <condition>` and moving `the match`; `refuse when no <condition>`; `it must be any <condition>`; an action-level `the <slot> must be a <trait>: <key>`; and `is not a <trait>`.
  - `packages/story-loader/tests/adr-359-d1-thing.test.ts` gains trait rows at both sites (it already asserts the evaluator and the oracle agree).
  - A hand-built IR carrying an unknown classifier is refused at load (one row in `packages/story-loader/tests/adr-389-validate-ir-seam.test.ts`).
  - EBNF: the `predicate` and `infinitive` productions' is-a notes name the classifier set and the code. Hash re-pinned; grammar-changes row.
- **Files**: `packages/story-loader/src/kind-classification.ts`, `packages/story-loader/src/evaluator.ts`, `packages/story-loader/src/build/characters.ts`, `packages/chord/src/validate-ir.ts`, `packages/chord/chord.ebnf`, `packages/chord/tests/language-version.test.ts`, `docs/architecture/chord-grammar-changes.md`, `packages/chord/tests/fixtures/trait-classification.story` (new), `packages/chord/tests/fixtures/gates/unknown-classifier.story` (new), `packages/chord/tests/trait-classification.test.ts` (new), `packages/chord/tests/validate-ir.test.ts`, `packages/story-loader/tests/trait-classification-runtime.test.ts` (new), `packages/story-loader/tests/adr-359-d1-thing.test.ts`, `packages/story-loader/tests/adr-389-validate-ir-seam.test.ts`, `stories/trait-classification-test/` (new)
- **Exit state**: `is a <story trait>` and `must be a <story trait>` hold exactly for the entities that compose the trait, at the evaluator and at the arbiter's scopes, inside a plain condition and inside `each` / `any` / `no` open conditions. A classifier that names nothing fails the compile and the load with `analysis.unknown-classifier`. The three Chord test trees and the Dungeo walkthrough chain are unmoved.
- **Demonstration**: `pnpm --filter ./packages/story-loader test:ci` is green, and in it the new runtime test shows the things composing the trait moved by the each block while a thing of the same kind without the trait stays put, the requirement refusing a thing without the trait, and the arbiter rows agreeing with the evaluator. `pnpm --filter ./packages/chord test:ci` is green, with the unknown-classifier gate fixture reporting exactly that one code. `./repokit build dungeo` then `./sharpee test stories/trait-classification-test/` passes every card; `./sharpee test branch-stories/fernhill`, `./sharpee test branch-stories/ides-of-march` and `./sharpee test branch-stories/secret-letter` report the same counts as before the phase; `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` passes in one run.
- **Demonstrated**: 2026-11-10, session 354c36, on the build from `./repokit build dungeo` after the last source change.
  - `pnpm --filter '@sharpee/chord' test:ci`: 1,817 passing, 0 failures. In it, `tests/trait-classification.test.ts` (12 passing) shows the trait fixture compiling with no diagnostics; the unknown-classifier gate fixture reporting exactly three `analysis.unknown-classifier` errors (a misspelt trait with its suggestion, `is a scenery` with the drop-the-article fix, a character-line scope); the trait-name gate fixture reporting exactly two `analysis.trait-name-taken` errors (a kind name, a platform word); and `validateIR` refusing hand-built IR. [verified: session run output, chord test:ci started 21:43:23 after the last chord edit (21:43:23), "Test Files 114 passed (114), Tests 1817 passed (1817)", trait-classification.test.ts 12 passing; no event-log row, the hook does not log test:ci]
  - `pnpm --filter '@sharpee/story-loader' test:ci`: 1,568 passing, 0 failures, 1 skipped. In it, `tests/trait-classification-runtime.test.ts` (11 passing): [verified: session run output, story-loader test:ci started 21:38:27 after the last loader-relevant edit (validate-ir.ts 21:36:48), "Test Files 196 passed (196), Tests 1568 passed | 1 skipped (1569)"; no event-log row]
    - Sweeping moves the three treasures to the vault and leaves the clay pot in the hall.
    - The appraising requirement refuses the clay pot.
    - A `while` composition classifies while its condition is false.
    - The arbiter's rows agree with the evaluator.
  - `adr-359-d1-thing.test.ts` and `adr-389-validate-ir-seam.test.ts` carry the trait rows and the load refusal.
  - `./sharpee test stories/trait-classification-test`: 7 cards passing, 11 assertions passing. [verified: work-summary-writer re-run 2026-11-10 21:50 on the 21:44 bundle, "7 cards passing, 11 assertions passing"]
  - `./sharpee test` on fernhill, ides-of-march and secret-letter: byte-identical to runs on the pre-change build, timings excluded. Fernhill: 36 / 63 branches, claims 9 of 10 held, 1 violated, as before. Ides of March: 17 / 85. Secret Letter: 959 / 1,657. [verified: session run outputs taken 21:44:39 and 21:48:00 on the 21:44:29 build, compared by the writer against the 21:21 to 21:24 pre-change outputs with timings masked: "fernhill: identical, ides: identical, secret: identical"]
  - `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`: all tests passed (949 passing, 0 failures on this phase's first build). [verified: work-summary-writer re-run 2026-11-10 21:50 on the 21:44 bundle, "Total: 949 tests in 17 transcripts, 949 passed, All tests passed!"]
  - Census: the corpus compile adds diagnostics only in the phase's two new gate fixtures. No story uses a character-line kind scope, and none declares a trait named after a kind or platform word. [verified: census output 21:37:00 against the 21:14 baseline, compared by the writer: 279 files, 4 changed, all new phase files; diagnostics only in gates/trait-name-taken.story (2) and gates/unknown-classifier.story (3)]
  - Census hits rewritten on David's go: `each-compile.story` and `each-package.story` (declare `treasure`; two snapshots updated by one trait entry); three `character-declarations.test.ts` sources (declare `servant`, `woman`); the `define action` guide example (declare `snake`); `adr-289-d5-d6.test.ts` (trait `guard` renamed `sentry`).
  - Scope added by ruling: the trait-name gate. The hand-built IR case lives in `trait-classification.test.ts`, so `validate-ir.test.ts` is unchanged.
- **Status**: DONE

### Phase 2: Action-block guards — a slot identity test is refused, and refusals lead the block
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The `define action` block: what its lines may test (Guard 1) and where its refusal partition sits (Guard 6).
- **Entry state**: Phase 1 is DONE, so the idiom the fix-it names works. Ruling 2 is on record. Question 2 (the `select on` and named-condition spellings) and Question 4 (hoisted lines) are answered, or their defaults stand: the three ruled line forms only; hoisted lines below a statement are an error.
- **Deliverable**: `analysis.slot-identity-test`, an error in `packages/chord/src/validate-ir.ts`, on any `define action` refusal condition, requirement, or statement `when` suffix (at any depth of `and` / `or` / `not`, and in statements nested in the body's blocks) that compares one of the action's own entity slots for identity with a named thing, in either polarity and either order. `packages/chord/src/analyzer.ts#buildAction` runs the existing `packages/chord/src/analyzer.ts#checkPhaseOrder` over the action body, and reports a `refuse when`, `refuse without` or requirement line written below the first body statement under the existing `analysis.refusal-misplaced`. Implements Guard 1 (Ruling 2) and Guard 6.
  - Proposed message, for David's edit: "`the item is the sword` asks which thing the player named. A response that belongs to one thing is written on that thing: in `create the sword`, write `on the player valuing` and put the response there. To ask what sort of thing it is, `the item is a <kind or trait>` is the test." The owner's name and the action's gerund are filled from the IR.
  - Not caught, by the ruling: `is a <kind or trait>`, `holds the <slot>`, a semantic key or direction word compared with a word, and any test in a trait's or thing's own clause.
  - `otherwise refuse` is the dispatch miss, not a partition line; it may sit anywhere in the block.
  - The runtime does not change: `packages/story-loader/src/runtime/statements.ts#findRefusal` already stops at the first statement, which is what makes the misplaced line dead.
  - Census: re-run the slot identity census over inline test sources as well as files; Guard 6's census is new. Both follow the census rule.
  - EBNF: a note at the `define action` lines naming both gates, beside the removed-forms note. Hash re-pinned; grammar-changes row.
- **Files**: `packages/chord/src/validate-ir.ts`, `packages/chord/src/analyzer.ts`, `packages/chord/chord.ebnf`, `packages/chord/tests/language-version.test.ts`, `docs/architecture/chord-grammar-changes.md`, `packages/chord/tests/fixtures/gates/slot-identity-test.story` (new), `packages/chord/tests/fixtures/gates/action-refusal-misplaced.story` (new), `packages/chord/tests/action-block-guards.test.ts` (new), `packages/chord/tests/validate-ir.test.ts`, `packages/story-loader/tests/adr-389-validate-ir-seam.test.ts`
- **Exit state**: A `define action` that tests a slot for identity against a named thing does not compile and does not load, and the diagnostic names the thing and the clause to write on it. A refusal or requirement written below a statement in a `define action` does not compile. The corpus compiles as it did before the phase.
- **Demonstration**: `pnpm --filter ./packages/chord test:ci` is green, and in it the slot identity fixture reports one diagnostic per offending line with that code, the owner's name and the gerund in the message, while the same file's is-a and holds lines report nothing; the refusal placement fixture reports the misplaced code on the bare refuse, the hoisted refuse-when and the hoisted requirement. `pnpm --filter ./packages/story-loader test:ci` is green, with a hand-built IR carrying a slot identity test refused at load. The corpus census reports zero hits for the slot identity code and the count found for refusal placement.
- **Demonstrated**: 2026-11-10, session 354c36.
  - `pnpm exec turbo run test:ci --continue`: 73 of 73 tasks successful; every test task ran fresh (cache bypass), and 26 of the 40 build tasks replayed from cache. Chord 1,826 passing, story-loader 1,569 passing, 1 skipped, character 641 passing, 0 failures anywhere. [verified: session run output saved 23:05:37, started about 23:00:02 after the last source and test edit (adr-389-validate-ir-seam.test.ts 22:59:50): "Tasks: 73 successful, 73 total", chord "Tests 1826 passed (1826)", story-loader "Tests 1569 passed | 1 skipped (1570)", character "Tests 641 passed (641)"; the 33 test:ci tasks ran with cache bypass, while 26 of the 40 build tasks replayed from cache. The EBNF comment (23:05:59) and the hash re-pin (23:06:12) came after it; language-version.test.ts, the only test that reads the EBNF, re-ran at 2026-11-11T05:06:13Z, event log "Tests passed, 2 passed"]
  - `tests/action-block-guards.test.ts` (9 passing), on the slot identity fixture: [verified: event log 2026-11-11T04:59:38Z (22:59:38 CST) "Tests passed, 9 passed", after the test file's last edit (22:59:37) and the fixtures' (22:58:51); the same suite is in the turbo run above]
    - It reports `analysis.slot-identity-test` at lines 16, 17, 20 and 22: the refusal, the requirement, the negated `when` suffix and the `select on`.
    - The messages name the sword and `on the player valuing`.
    - Lines 18, 19, 21, 39 and 58 report nothing: is-a with holds, `must be any` a named condition, is-a in a `when`, a direction slot, the sword's own clause.
    - `validateIR` refuses a clean IR edited to carry the test, naming the clay pot.
  - The same test file, on the refusal placement fixture: `analysis.refusal-misplaced` at lines 14, 15 and 17 (the hoisted `refuse when`, the hoisted requirement, the bare `refuse`). Lines 11, 12 and 16 report nothing (leading refusals, `otherwise refuse`). [verified: the same 22:59:38 run, event log "9 passed"]
  - `adr-389-validate-ir-seam.test.ts`: a hand-built IR whose action tests `the item is the crate` is refused at `createStory` with the gate's message. [verified: event log 2026-11-11T04:59:53Z (22:59:53 CST) "Tests passed, 7 passed", after the file's last edit (22:59:50)]
  - `language-version.test.ts`: 2 passing on the re-pinned hash. [verified: event log 2026-11-11T05:06:13Z (23:06:13 CST) "Tests passed, 2 passed", after the EBNF edit (23:05:59) and the re-pin (23:06:12)]
  - Census: the corpus compile (279 files) adds no diagnostic at all against the Phase 1 census. Zero slot identity hits and zero refusal placement hits in the corpus. The full suite above is the census of inline test sources across every package, also zero. [verified: census output 22:58:21 on the chord source bundle built 22:58:11, after the last gate edit (analyzer.ts 22:58:01), compared by the writer against the Phase 1 census: "files before: 279, after: 279, changed: 0", neither code present]
  - On the rebuilt bundle:
    - `./sharpee test stories/trait-classification-test`: 7 cards passing, 11 assertions passing. [verified: work-summary-writer re-run 2026-11-10 23:13 on the 23:07:25 bundle, "7 cards passing, 11 assertions passing"]
    - fernhill, ides-of-march and secret-letter: byte-identical to the pre-Phase-1 runs, timings excluded. [verified: session run outputs taken 23:07:28 (fernhill, ides-of-march) and 23:10:50 (secret-letter) on the 23:07:25 build, compared by the writer against the 21:21 to 21:24 pre-Phase-1 outputs with timings masked: "fernhill: identical, ides: identical, secret: identical" (36 / 63, 17 / 85, 959 / 1,657 branches)]
    - Dungeo walkthrough chain: 949 passing, 0 failures. [verified: work-summary-writer re-run 2026-11-10 23:13:57 on the 23:07:25 bundle, "949 passed", "All tests passed!"]
  - Coverage: the full suite runs across every package as the census, the lesson from Phase 1's missed `@sharpee/character` hits. `validate-ir.test.ts` is unchanged: the hand-built IR case lives in `action-block-guards.test.ts`.
- **Status**: DONE

### Phase 3: Every `is <word>` has a reader — a word the evaluator never reads is refused
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The `is <word>` state read: the words `resolveIsObject` accepts against the words `symbolHolds` reads.
- **Entry state**: David has answered Question 1: a platform trait adjective after `is` (`the item is scenery`) is an error, or it reads the composition. This phase does not start on a default.
- **Deliverable**: The words `packages/chord/src/analyzer.ts#resolveIsObject` accepts and the words `packages/story-loader/src/evaluator.ts#symbolHolds` reads are the same set, pinned by a conformance test. Today the analyzer accepts every trait adjective in `packages/chord/src/catalog.ts` after `is` and the evaluator reads only `dark`; `the match is <word>` accepts any word at all. Implements the `is <word>` half of Guard 5.
  - If the ruling is **error**: a trait adjective other than `dark` after `is` is `analysis.unread-trait-word`, with a fix-it saying what to write instead (the wording follows from the ruling).
  - If the ruling is **read**: `symbolHolds` answers a trait adjective from the entity's composition, through the same classification rule Phase 1 built, with a runtime test asserting state on both answers and cards added to the Phase 1 test story's tree (a Chord feature's runtime test belongs in a tree). No new error for these words.
  - Either way: `the match is <word>` validates against the union of declared states plus the platform words, the closure an unbound `it` already uses, so a misspelt state is `analysis.unknown-value` instead of a silent false.
  - The conformance test fails when a word is added to the catalog with no reader, which is the instrument's own failing fixture: a test-only word with no reader must make it report.
  - Census per the census rule. A corpus story that tests a trait adjective with `is` has been silently false since it was written: report it as a finding in that story and stop.
  - EBNF: the `predicate` production's `is` note names the readable word classes and the code. Hash re-pinned; grammar-changes row.
- **Files**: `packages/chord/src/analyzer.ts`, `packages/chord/src/validate-ir.ts`, `packages/chord/src/catalog.ts`, `packages/story-loader/src/evaluator.ts`, `stories/trait-classification-test/`, `packages/chord/chord.ebnf`, `packages/chord/tests/language-version.test.ts`, `docs/architecture/chord-grammar-changes.md`, `packages/chord/tests/fixtures/gates/unread-trait-word.story` (new), `packages/chord/tests/is-word-readers.test.ts` (new), `packages/story-loader/tests/is-word-conformance.test.ts` (new)
- **Exit state**: No word the compiler accepts after `is` falls through the evaluator to false. A trait adjective after `is` either fails the compile with a fix-it or reads the composition, as David ruled. A misspelt state on `the match` fails the compile.
- **Demonstration**: `pnpm --filter ./packages/story-loader test:ci` is green, and in it the conformance test lists every accepted word class with its reader and fails on the test-only unread word. `pnpm --filter ./packages/chord test:ci` is green, with the gate fixture reporting the ruled outcome for the scenery line and the unknown-value code for a misspelt state on the match. The corpus census count is recorded.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 4: Standard grammar is extended or answered, not repeated
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: Grammar alteration: a story `define action` whose pattern repeats a standard action's shape (Guard 2).
- **Entry state**: David has answered Question 3: what the fix-it says, whether a matching `remove from action` exempts the pattern, and whether a fixed-noun specialisation (`take me`) is caught. This phase does not start on a default.
- **Deliverable**: `analysis.repeats-standard-grammar`, an error in `packages/chord/src/validate-ir.ts`, on a story `define action` pattern whose shape equals a standard action's (compared with `packages/chord/src/patterns.ts#samePatternShape` against the generated manifest's grammar shapes), naming the standard action in the fix-it. Implements Guard 2.
  - Exempt by construction: a grammar file (the standard grammar is itself `define action` blocks), and `extend action` blocks (restating a standard pattern under another standard action is the recorded way to reorder).
  - Known census hit before the phase starts: `packages/chord/tests/adr-329-d10-perform-step.test.ts` defines `taking` with `take the thing` inline. It is disposed of by the census rule.
  - EBNF: a note at the `define action` grammar lines. Hash re-pinned; grammar-changes row.
- **Files**: `packages/chord/src/validate-ir.ts`, `packages/chord/chord.ebnf`, `packages/chord/tests/language-version.test.ts`, `docs/architecture/chord-grammar-changes.md`, `packages/chord/tests/fixtures/gates/repeats-standard-grammar.story` (new), `packages/chord/tests/repeats-standard-grammar.test.ts` (new), `packages/chord/tests/validate-ir.test.ts`, `packages/chord/tests/adr-329-d10-perform-step.test.ts`
- **Exit state**: A story `define action` that repeats a standard pattern does not compile and does not load, and the diagnostic names the standard action and the ruled remedy. `stories/grammar-alterations` (extend, remove, reorder) compiles and runs as before.
- **Demonstration**: `pnpm --filter ./packages/chord test:ci` is green, and in it the gate fixture reports the code once per repeated pattern with the standard action named, while an extend-action block restating the same pattern, a grammar file, and (if ruled) a pattern whose standard shape the story removed report nothing. `./repokit build dungeo` then `node dist/cli/sharpee.js --test stories/grammar-alterations/tests/transcripts/alter-standard-grammar.transcript` passes as before the phase. The corpus census count is recorded.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 5: Flag entity warning
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: Entity ownership of state: a thing that exists only to hold a state for something else (Guard 3).
- **Entry state**: David has confirmed the warning's wording (Question 5), or the proposed wording stands.
- **Deliverable**: `analysis.flag-entity`, a warning in `packages/chord/src/validate-ir.ts`, on a thing that declares states, has no placement, no description, no clauses of its own, is not playable, worn or carried, and is referenced nowhere in the IR except as the target of `change … to` and the subject of `is`. Implements Guard 3.
  - Proposed message, for David's edit: "`the alarm flag` is never anywhere and is only ever changed and tested: it is holding a state for something else. Put the states on the thing they describe, or on the story (`states:` in the story block)."
  - A warning never fails a compile or a load (the loader throws on errors only), so the census is a count in the report.
  - The warning is not listed in the EBNF (it refuses nothing); no hash motion in this phase.
- **Files**: `packages/chord/src/validate-ir.ts`, `packages/chord/tests/fixtures/gates/flag-entity.story` (new), `packages/chord/tests/flag-entity.test.ts` (new), `packages/chord/tests/validate-ir.test.ts`
- **Exit state**: A flag entity compiles with one warning naming it. A placed thing, a described thing, a thing with a clause, and a thing some other line refers to (a placement, a `move`, a held or worn line) draw no warning.
- **Demonstration**: `pnpm --filter ./packages/chord test:ci` is green, and in it the fixture's flag entity draws exactly one diagnostic of warning severity with that code while the compile still succeeds, and each of the four near-miss things in the same fixture draws none. The corpus count of the warning is recorded.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 6: Noun-dispatch acceptance and the regression floor
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: The whole decision set, read as one behaviour: the refused shape and its owner-clause rewrite.
- **Entry state**: Phases 1 to 5 are DONE (or David has removed one from scope, and the fixture omits its shape).
- **Deliverable**: A paired fixture, written for this purpose in plain story language: one small story in the noun-dispatch shape carrying each refused form once, and the same story rewritten with trait-owned and thing-owned clauses. One test asserts the first reports exactly the expected code list; one loads the second and asserts the same commands leave the same world state the first was written to produce.
  - The UNDERGROUND port's source is compiled read-only with the built compiler and its diagnostic counts by code are reported in the Demonstrated line. Reported, never asserted, and nothing in that repository is edited.
- **Files**: `packages/chord/tests/fixtures/gates/noun-dispatch.story` (new), `packages/chord/tests/fixtures/owner-dispatch.story` (new), `packages/chord/tests/noun-dispatch-acceptance.test.ts` (new), `packages/story-loader/tests/owner-dispatch-runtime.test.ts` (new)
- **Exit state**: The refused shape and its rewrite are both committed and pinned. Every suite, the three Chord trees and the Dungeo walkthrough chain pass on the finished set.
- **Demonstration**: `pnpm exec turbo run test:ci` is green, and in it the noun-dispatch fixture reports the full expected code list and the owner-dispatch fixture compiles with zero diagnostics and reaches the asserted world state. `./repokit build dungeo` then `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` passes in one run; `./sharpee test branch-stories/fernhill`, `./sharpee test branch-stories/ides-of-march` and `./sharpee test branch-stories/secret-letter` report the counts they reported before Phase 1; `./repokit ebnf --check` reports a well-formed grammar.
- **Demonstrated**: 
- **Status**: PENDING

## Questions for David

All ruled 2026-11-10; see "Rulings on record". Kept as asked, for the reasoning.

1. **A platform trait adjective after `is`** (`refuse when the item is scenery`). The analyzer accepts all of them today and its own error text promises "a state … or a known trait", but the evaluator reads only `dark`. Error with a fix-it, as proposed, or make it read the composition (the same mechanism Ruling 1 builds)? If it is an error, an author has no way to ask "is this thing scenery". Blocks Phase 3. Its other half decides Phase 1's vocabulary: may a platform adjective follow `is a` (`is a light-source`)? Phase 1's default is no.
2. **Guard 1's reach.** Two spellings of the same dispatch compile clean today: `select on the <slot>` with arms naming things, and a named condition (`define condition the-sword: it is the sword`) reached through `must be any`. Catch the `select` spelling too? Recommended: yes for `select`, since it is the identity test written as a block; leave named conditions alone, since `it is the <thing>` is legitimate in a trait's own clause. Phase 2's default is the three ruled forms only.
3. **Guard 2's remedy and edges.** (a) `extend action` carries grammar only, and a story action that repeats a standard pattern already has that grammar, so what the author wants is behaviour: should the fix-it name `on the player <standard gerund>` on the owning thing or trait first, and `extend action` only for new wording? (b) Does `remove from action` of the same shape exempt the story's pattern? It has to if replacing a standard action stays possible at all, and it is also the way back to the refused shape. (c) Is a fixed-noun specialisation (`take me`, one action per noun, as in the port's `taking-me`) caught, or only a slot-for-slot repeat? Blocks Phase 4.
4. **Guard 6's premise is partly wrong.** In a `define action`, `refuse when` and requirement lines are hoisted by the parser and do run, before the body, wherever they are written; only a bare `refuse` after a statement is dead. Still an error for all three when written below a statement? Recommended: yes, under the existing misplaced-refusal code, because the source would otherwise misstate the order. This is a placement rule only; the order in which refusal arms and requirements are checked is not touched.
5. **Guard 3's wording.** Is "put the states on the thing they describe, or on the story" the remedy the warning should name?
6. **ADR-worthy?** This set closes forms that compiled, gives `is a` a new meaning, and moves three records: ADR-359 D1 (classification widens beyond kinds), ADR-289 D3 (the refusal gate reaches `define action`), ADR-270 (repeating standard grammar at the story tier becomes an error). One new record in `docs/architecture/adrs/`, superseding or amending those three in the parts named?

## Open items — not planned

- **Action-level ordering.** Every `refuse` arm runs before every requirement regardless of source order (`packages/story-loader/src/runtime/dispatch-verbs.ts`, the validate function). A behaviour change with no ruling.
- **`win` / `lose` do not stop the body.** No ruling.
- **New language.** Membership in a condition (`is any <condition>`), counting, conditional exit destinations, a clause on leaving a room, non-terminal death.
- **A Chord primer for outside projects** (devkit). The guards' fix-its are the only author-facing text this plan writes.
- **`the <slot> is <declared state>` is refused today.** A `define action` cannot test the named thing's own declared state; the test has to live on the owner. Consistent with the owner idiom, and also a reason an author reaches for a flag entity. Worth a ruling of its own.
- **A platform state adjective on a thing that lacks the trait** (`the sword is open`, not openable) is false without a diagnostic when the subject is a named thing. Statically knowable; not in Guard 5 as proposed.
- **Identity tests outside `define action`.** A `when` suffix in a trait's or thing's clause may compare a role or `the match` with a named thing (`packages/chord/tests/fixtures/each-iteration.story` does). Not guarded, by the ruling.
- **The next publish number: ruled.** David, 2026-11-10: "this is a minor bump". The gates land at the current numbers; the next publish moves them by a minor version, not a major one, although several gates refuse source that compiled before.
- **IDE completion after `is a`.** The value dropdown reads kinds; trait names would belong there once Phase 1 lands. An IDE change, not planned here.
- **Other bodies the refusal gate does not reach.** Phase 2 checks the `define action` body only. If its census of body builders finds another body that reaches `findRefusal` unchecked, it is reported, not fixed in passing.
