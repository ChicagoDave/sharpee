# Session Plan: Parser review step 1 — the small ship-breaking fixes

**Created**: 2026-10-22
**Plan Status**: DONE
**Overall scope**: Step 1 of `docs/work/parser-review/review-20261022.md` Recommendation only: delete the going direction scan (C3), bind every entity slot at dispatch by the matched rule's slot names (C1), make `→` a compile error (B2), lowercase pattern words at lowering (B3), fix `slot-unused` and the standard grammar's `furl` (G1-G3), remove the `throw` log. Steps 2-7 (structured seam, declared roles, ranking, noun matcher, search, language/state) and the code organization review are NOT in this plan.
**Bounded contexts touched**: English parser (`packages/parser-en-us`); Chord language and analyzer (`packages/chord`); story-loader dispatch and lowering (`packages/story-loader`); repokit grammar generation (`tools/repokit`)
**Key domain language**: matched rule, slot, direct/indirect object seat, passage, phrase placeholder, grammar-file mode

## References consulted
- `docs/architecture/adrs/adr-268-chord-grammar-rule-ordering.md` — definition order is semantic and reordering grammar lines can change resolution; the confidence/tier ranking itself (D1, D2) is step 4 and must not be touched here.
- `docs/architecture/adrs/adr-380-a-passage-is-a-block-with-a-grammar.md` — a passage's grammar lowers to exits and an article is free in a pattern (D2); D2a's `slot-unused` warning is what G1 corrects; C3 must leave passage commands with compass words reaching the passage, not going. D2a's definition of a used slot was amended 2026-10-22 (plan-review STALE ADR finding) to count a phrase read, which Phase 3's G1 implements, and AC-2a gained the matching case.
- `docs/architecture/adrs/adr-267-chord-grammar-pattern-constructs.md` — the pattern language; its `pattern-line` carries `→` cardinality, and D3 says each construct lands whole (EBNF → parser → analyzer → IR → loader → builder). `→` never landed whole: the loader drops the pattern (review B2), so B2's compile error is D3's rule applied until it does.
- `docs/architecture/adrs/adr-381-connectors-replace-attachment.md` — accepted 2026-10-22: stock tying and untying are removed (D1). No phase demonstrates with `tie`.
- `docs/context/project-profile.md` — stack and conventions.
- `docs/work/parser-review/review-20261022.md` — the findings, evidence lines and order this plan carries.
- Most recent session `docs/context/session-20261022-1735-chord-4-0.md` — alignment-fixes Phase 11 closed; no open items bearing on this scope.
- Proposals: none with ACCEPTED unplanned items consulted.
- Product ADRs not consulted (no Scope intersection): none classified; the ADR directory is `docs/architecture/adrs/` and only ADRs 268 and 380 were read.

## Out of scope
- GH #621 (devkit `claim` duplicate-name check reads `claim <name>` text instead of Chord's claims reader in `chord/src/claims.ts`): touches `packages/devkit` and Chord's claims owner, none of C1, C3, B2, B3, G1-G3. It was held for the parser review but belongs to step 2's "slots/readers come from structured sources, not re-split strings" family at the earliest. Leave open; re-raise when step 2 is planned.
- C2 (per-rule seat of the direct object), C4-C8, A, D, E, F, B1, B4-B7, G4-G5, H cleanup beyond the `throw` log: steps 2-7.
- The alignment-fixes plan and `docs/work/chord-4-0` are not archived or moved.

## Standing constraints (every phase)
- Each phase touching `packages/` needs David's go before editing; stop and ask at phase entry.
- A failed build or test is reported, never auto-retried.
- Tests come from Behavior Statements; each fix gets a real-path test (the parser or the CLI bundle, not a stub).
- Dungeo walkthrough chain stays green, one run (deterministic at the pinned seed); one run of each touched package suite.
- Chord and IDE alignment is two-sided: any change to what Chord accepts is checked against the IDE's grammar/EBNF consumers.

## Phases

### Phase 1: Going direction scan removed, `throw` log removed
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: English parser — role of a matched rule (C3); leftover debug output
- **Entry state**: `chord-4-0` clean; David's go on the `packages/parser-en-us` edit. Baseline run of `parser-en-us` suite and Dungeo chain recorded.
- **Deliverable**: Implements C3: the `if.action.going && !directObject` special case at `english-parser.ts:1038-1056` no longer scans the input for the first DIRECTION-tagged token; the direction comes from the matched rule's own semantics (`means`/extras) and standard `go north` / `north` / `n` still yield the Direction constant. The `console.log('Failed to convert match')` at `:768-770` is deleted. **Added 2026-10-22 (David: "add it to phase 1"):** in a room with the author's `out to …` exit, `go out`, `exit` and `leave` refused "You're not inside anything." and only bare `out` took it (probed on the bundle). This predates C3: those words are exiting's grammar, and exiting refused in any room not aboard a vehicle (`stdlib/src/actions/standard/exiting/exiting.ts:144`). The fix: exiting in a plain room delegates to going with `OUT`, as climbing and pushing delegate, so traversal's gates and going's refusals apply. Exiting from inside a container, a supporter or a vehicle is unchanged. Tests: `climb down the ladder` and `climb up the rope` against a passage story reach the passage (not `DOWN`/"You can't go that way"); `go north`, `n`, `go out`, `throw` input prints nothing to console.
- **Exit state**: parser-en-us suite green; Dungeo chain green with no transcript edits; if a standard going rule depended on the scan, the finding is recorded in the plan and the fix sits in the rule's semantics, not the scan.
- **Demonstration**: new parser test run showing passage `climb down the ladder` parsed with the passage's action and no `direction`; `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` result recorded as "N passing, 0 failures".
- **Demonstrated**: 2026-10-22, session 289aa0.
  - **C3:** going's input scan, the candidate `direction` field and its `best.direction` branch are removed (`parser-en-us/src/english-parser.ts`); the `throw` `console.log` is gone; `metadata.supportedPatterns` drops `DIRECTION_ONLY`. All 144 standard going rules carry their direction as semantics, so nothing depended on the scan. The obsolete `DIRECTION_ONLY` assertion in `tests/unit/english-parser.test.ts` was dropped.
  - **Exiting (added by David):** in a plain room, exiting delegates to going with `OUT` (`stdlib/src/actions/standard/exiting/exiting.ts`, joining `DELEGATING_ACTIONS` in `lifecycle-call-site.test.ts`). Probed on the bundle before the fix: `go out`, `exit` and `leave` in a room with `out to the Yard` all said "You're not inside anything."; after the fix, `go out` and `exit` reach the Yard.
  - **Tests:** `parser-en-us/tests/going-direction-from-rule.test.ts`: passage keys survive `climb down the ladder` / `climb up the rope`; `go north`, `north`, `n`, `out` and `d` yield the constant; `throw` prints nothing. `story-loader/tests/passage-block-runtime.test.ts`, real engine, 15 passing: the passages move the player to the Cellar and the Loft; `out`, `go out`, `exit` and `leave` reach the Yard; a blocked `out` speaks its phrase and stays; going's move is recorded and no `exited` event; a room with other ways but no `out`, and one with none, keep "You're not inside anything." and stay.
  - **Suites,** one run each: parser-en-us 379, stdlib 1889, story-loader 1377 passing and 1 skipped (1379 with the two cases added after mutation verification, run once as a file, 15 of 15), 0 failures.
  - **Dungeo:** `./repokit build dungeo` exit 0, then `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` 952 passed, 17 of 17 golden recordings matched. `./repokit grammar --check` fresh.
  - **Mutation verification:** two gaps (a room with ways but none out; the event check), both closed.
  - `[reported by session; counts read from this session's run output]`
- **Status**: DONE

### Phase 2: Every entity slot bound at dispatch by the matched rule's slot names
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: story-loader dispatch (`runtime/dispatch-verbs.ts` `buildDispatchAction`, `bindings`); Chord `primarySlotOf` (`chord/src/ir.ts`)
- **Entry state**: Phase 1 DONE. David's go on any `packages/` change. First task is a read: establish whether the parsed command exposes the matched rule's slot names to dispatch (parsed `pattern`/extras/slot map), and what reads `primarySlotOf` (ir.ts, analyzer.ts, dispatch-verbs.ts).
- **Deliverable**: Implements C1: `bindings` binds the direct object under its slot name and the indirect object (`command.indirectObject`) under its slot name, by the matched rule's slots rather than one slot per action. A probe `define action hanging` with the pattern `hang the item on the peg` and a phrase "You hang {the item} on {the peg}." renders both nouns. Stock tying is not used, since ADR-381 removes it. The per-action `primarySlotOf` stays the consult/refuse slot (C2's per-rule seat is step 3, not fixed here; a test pins today's behavior for a two-pattern action so step 3 sees the change). If the matched rule's slot names are not on the parsed command, STOP and bring David the contract change (if-domain/parser) as a decision before editing. **Read 2026-10-22: they are not.** The parser seats slots positionally and drops their names (`english-parser.ts:962-1000`), and `IParsedCommand` records none. David chose option (a): `INounPhrase` gains `slot?: string`, set by the parser as it seats each phrase, and dispatch binds the direct and indirect objects by it. The validated command keeps the whole parsed command, so no validator change is needed. Option (b), a seat map on `IParsedCommand`, was declined. Behavior Statement written first; mutation-verification run.
- **Exit state**: a Chord action with two nouns binds both in phrase, `must`, refusal and body reads; unbound-read error ("param 'peg' is not bound") gone for the two-noun shape; story-loader suite and Chord trees green; Dungeo chain green.
- **Demonstration**: the probe story's `hang coat on peg`, via `./sharpee test` or the bundle, shows "You hang the coat on the peg."; the story-loader suite result and Dungeo chain result recorded.
- **Demonstrated**: 2026-10-22/23, session 289aa0.
  - **Contract (David chose (a)):** `INounPhrase.slot` (`world-model/src/commands/parsed-command.ts`) is set by the parser for every seated phrase, instrument included (`parser-en-us/src/english-parser.ts`).
  - **Dispatch:** `buildDispatchAction` binds the direct and the indirect object by their slot names, declared entity slots only, falling back to the primary slot when there are no names. `refuse without <slot>` reads the named binding (`story-loader/src/runtime/dispatch-verbs.ts`).
  - **Found and fixed with David's go:** Chord phrase params passed an entity as its bare name, so a proper name got the template's "the" ("to the Bob"). Slot and `with` params now pass `nounPhraseFor(entity)` (`story-loader/src/runtime/phrases.ts`). `action-body.test.ts`'s two assertions on the old string shape moved to the noun-phrase shape.
  - **Tests, real engine** (`story-loader/tests/dispatch-slot-names.test.ts`, 5 of 5): `hang coat on peg` → "You hang the coat on the peg."; `hang coat` → "Hang it on what?"; `offer coin to Bob` and `present Bob with coin` → "You give the coin to Bob."; `wave` with `with who = Bob` → "You wave to Bob.". `parser-en-us/tests/noun-phrase-slot.test.ts`, 3 of 3: `item`/`hook`, `give :recipient :item`, the instrument `blade`.
  - **Not pinned, for step 3:** which entity the action consults and refuses on is still the direct object, the per-action primary seat (C2). These tests pin only which noun binds to which slot.
  - **Suites,** one run each: world-model 1663, parser-en-us 379, stdlib 1889, story-loader 1383 passing and 1 skipped, branch-tester 381, devkit 204 passing and 1 skipped, 0 failures. Branch-tester and devkit render Chord phrases; no text changed. The two gap-closing files were then run once each.
  - **Dungeo:** `./repokit build dungeo` exit 0, then `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` 952 passed, 17 of 17 golden recordings matched.
  - **Mutation verification:** two gaps, the parser's `slot` and the proper-named `with`, both closed.
  - `[reported by session; counts read from this session's run output]`
- **Status**: DONE

### Phase 3: Chord lowering and analysis — `→` rejected, pattern words lowercased, `slot-unused` and `furl` fixed
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Chord analyzer and loader lowering of grammar patterns; repokit grammar generation; the standard grammar (`parser-en-us/grammar/standard-en-us.story`)
- **Entry state**: Phase 2 DONE. David's go on `packages/chord`, `packages/story-loader`, `packages/parser-en-us` and `tools/repokit` edits.
- **Deliverable**: Implements B2: a `→` cardinality on an action pattern is a compile error (named, with span) until the engine-owned expansion is real; `hoover the room → banana split sundae` no longer compiles clean. B3: pattern words lowercased at lowering (`loader.ts:3198` renderer and the analyzer's literal handling at `analyzer.ts:195`), so `Zap the target` matches `zap book`; TS-story `define('XYZZY')` literals noted and fixed in the same place if the same renderer serves them, otherwise recorded for step 2. G1: `analysis.slot-unused` counts a phrase placeholder (`{the anchor}`) as a use and its fix-it no longer suggests `[the] anchor`. G2: grammar-file mode (repokit `compileStandardGrammarRules`) no longer emits the 21 false `slot-unused` warnings and still surfaces the true case. If telling the true case apart from the false ones in grammar-file mode is not small, the fallback is the review's plain "skip it in grammar-file mode" (plan-review TENSION, advisory). G3: `furl the sails` becomes `furl [the] sails`; `./repokit grammar` regenerates `src/grammar.ts`, both files committed, `./repokit grammar --check` clean. Chord EBNF/IDE consumers checked for the `→` rejection (two-sided).
- **Exit state**: Chord, story-loader, parser-en-us and repokit suites green (one run each); `./repokit grammar --check` passes; Dungeo chain and golden recordings green; no stale `slot-unused` noise on the standard grammar.
- **Demonstration**: compile of a probe story shows the `→` error and no `slot-unused` on a `{the anchor}`-only slot; `zap book` with `Zap the target` parses; `furl sails` and `furl the sails` run; `./repokit grammar --check` exit 0; per-package suite and Dungeo chain results recorded.
- **Demonstrated**: 2026-10-23, session 289aa0.
  - **B2:** `checkGrammarSurfaceLines` refuses `→ …` on any `define action` or `extend action` pattern, in a story or a grammar file (`analysis.cardinality-unsupported`, `chord/src/analyzer.ts`). The `traits-basic` fixture's `nap → each quiet corner` became `nap`, its parser snapshot was re-recorded (only `cardinality` and `endColumn` moved), and the parse of `→` is pinned inline. The published `define action` guide taught `→` as working (`website/.../define-action/content.mdx`). With David's go its example and explanation were corrected, the Docs tab regenerated, and a grammar-changes row added. No IDE code reads `cardinality`.
  - **B3:** the English pattern compiler lowercases every literal and alternate, optional ones included, with slot names kept, so Chord's `Zap the target` and a TS story's `define('XYZZY')` match. The old compiler test asserting preserved case was rewritten with David's go.
  - **G1:** `slot-unused` counts a slot that a phrase the action speaks reads (its own `phrases` entries and spoken keys; a marker's last token, `:` handled), per ADR-380 D2a as amended.
  - **G2:** the check is skipped in grammar-file mode, using the plan's recorded fallback. The manifest carries no "takes a noun" fact to tell the one true warning from the 21 false ones, and G3 fixes that true case.
  - **G3:** `furl [the] sails` replaces `furl sails` / `furl the sails`. `./repokit grammar` and `./repokit manifest` regenerated; only steering's shapes moved.
  - **Tests:** chord `grammar-alterations` (B2), `grammar-file` (B2, G2), `action-pattern-articles` (G1, colon marker), `parser-phase-b`; parser-en-us `literal-case` (10, new), `english-pattern-compiler`, `vehicle-commands` (`furl the sails` is steering; `furl the cat` is not); story-loader `dispatch-slot-names` (`zap coat` → "You zap the coat.", real engine).
  - **Suites,** one run each: chord 1653, parser-en-us 390, story-loader 1385 passing and 1 skipped, repokit 138 passing and 1 skipped, 0 failures. Three gap-closing files were then run once each: 10 of 10, and 31 of 31.
  - **Dungeo:** `./repokit build dungeo` exit 0, then `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` 952 passed, 17 of 17 golden recordings matched. `grammar`, `manifest` and `aliases` `--check` all fresh.
  - **Mutation verification:** three gaps, all closed.
  - **Correction:** a bare `proper` line is not ignored, as reported during Phase 2. A probe shows it parses as the `proper` trait; "the Bob" was the phrase-parameter defect Phase 2 fixed.
  - `[reported by session; counts read from this session's run output]`
- **Status**: DONE
