# Session Summary: 2026-07-18 05:01 — chord-foundations (session 80ff54)

## Goals
- Chord Topics workstream (ADR-239): all 3 phases of `docs/work/chord-topics/plan.md`.

## Key decisions
- **Alias separator RULED (David): comma list**, not `or` — `about "treasure", "the hoard": …`. ADR-239 D3 amendment note recorded; ratchet row carries the ruling.
- **seedData platform seam APPROVED (David: "go on the seedData seam")** — the plan's one stdlib touch, landed as ruled.

## Work log
- Recap + pre-session audit clean (all prior-session items already committed/pushed).
- **Phase 1 COMPLETE (`define topics` grammar + compile gates)** — committed 75c5c456:
  - Parser `parseDefineTopics`/`parseTopicRow` (entity tier; free-text tier with comma alias lists; one-line statement via synthetic tail line through the shared `parseStatement`, or indented body; declare-and-emit prose sugar works on rows). Gates `parse.topics-for/-row/-alias/-colon/-response/-empty/-end`.
  - AST `DefineTopics`/`TopicRow`; IR `IRTopicRow` + additive `IREntity.topics` (goldens churn exactly 66 × `"topics": [],`); ide-protocol re-export.
  - Analyzer `applyTopics` post-entity-build: `analysis.duplicate-topic` (normalized, aliases included), `analysis.topic-entity-collision` (per-table, order-independent), `analysis.duplicate-topics-block`, `analysis.topics-host` (person-kind); silent pass-1 owner lookup for owner-scoped inline texts.
  - 19-test suite `packages/chord/tests/topics.test.ts`; chord 357/357.
- **Phase 2 COMPLETE (runtime dispatch)**:
  - stdlib: `askingLifecycle`/`tellingLifecycle` target slot `seedData: (ctx) => ({ topic, topicEntityId })` (approved).
  - chord: `normalizeTopic` EXPORTED — one implementation for analyzer gates AND runtime lookup.
  - story-loader: `buildTopicArm` — entity tier via seeded `topicEntityId`, then free-text via normalized equality; hit runs the row body through the shared statement machinery (mutations postExecute, first phrase = override; catch-all fully suppressed, D5); miss delegates to the `on asking/telling it` catch-all or returns `{}` (stdlib `unknown_topic`/`not_interested` default). Table owners get arms with or without a catch-all (`prepareTopicTarget`).
  - Fixture `topic-basic.story`; `topic-dispatch.test.ts` — 12 REAL-PATH tests (AC-1/2/4/5 + seedData non-effect pin; real asking/telling driven validate→execute→report with live scope/visibility; row-body world mutation asserted on `chord.state.porter`). Gotcha: story-loader tests resolve stdlib/chord from BUILT dist — rebuild before running.
- **Phase 3 COMPLETE (closure) — WORKSTREAM COMPLETE**:
  - chord-grammar.md "Topics" section; chord.ebnf `define-topics`/`topic-row`/`topic-key`; ratchet row verified.
  - Audit: asking/telling ⚠️→✅; **54 ✅ / 0 ⚠️ / 0 ❌ — completely clean action table** (header, §8, scoreboard, gap list all reconciled).
  - Elegance vignette `topic-vignette.story` + `topic-elegance.test.ts` (gamekeeper: entity/alias/body-form-with-state-change/miss, all real asks).
  - Full regression: chord 357, story-loader 274, stdlib 1534, world-model 1381, `./repokit build`, cloak 81/81, zoo 71/71 + chained 56/56. **Gate invocation note: the bundle CLI needs `--story stories/<s>/<s>.story` for chord stories (default is stories/dungeo).**
  - `.current-plan` → chord-go-live; umbrella Phase 5 note updated.

## Status: COMPLETE (Phase 1 committed 75c5c456; Phases 2–3 uncommitted)

## Umbrella Phase 6 (G2 author pipeline) — started this session (post-finalize)
- **ADR-233 G1 asking/telling line CONFIRMED SATISFIED (David)** — amendment in ADR-233; topics workstream committed 75c5c456 + 902df2b7 and pushed.
- David: "phase 6" — the platform-change go-ahead. session-planner wrote `docs/work/chord-author-pipeline/plan.md` (4 phases; plan-review 1 advisory tension, dissolved by the proof ruling); `.current-plan` → chord-author-pipeline.
- **Three rulings (David, this session)**: (1) `sharpee init` scaffolds Chord by default, `--ts` opt-out; (2) **compiler ships client-side — the browser bundle carries the `.story` SOURCE and compiles at boot** (against recommendation, deliberate; build still runs the compiler as a fail-fast gate); (3) G2 proof = scripted, run locally (no CI gate — ADR-180 tension dissolves).
- **Phase 1 COMPLETE**: `sharpee test`/`play` implemented (shared `standalone/author-game.ts`: one-root-`.story` → chord→createStory→assembleGame, else bootstrap module story; `requireHatchModule` unified, compose refactored). 7 REAL-PATH tests. Doc sweep: testing.mdx's `{story}-test.js` flow was FICTION — rewritten to real `sharpee build --test` + `sharpee test`; creating-stories.mdx fixed. Global-install artifact verified (bin/shebang/npm-pack/--help). ADR-180 needs NO further amendment (ADR-187 R1 line 174 sanctions test/play). devkit 33 passed/1 skipped. Gotcha: vite can't resolve `@sharpee/ext-testing` statically — devkit commands lazy-`require` transcript-tester/bootstrap (compose pattern).
- **Phase 2 COMPLETE (Chord-first scaffold + build)**: `templates/story-chord/` + `chord-browser-entry.ts.template` (fetch story.story → compile in-browser → createStory → client wiring); chord scaffold ships browser-ready (init → init-browser, chord template + deps auto-selected on root `.story`); `runChordBuild` (compile = fail-fast gate, hatch lint, `.sharpee` deferred legibly); build-browser chord branch (validate, refuse hatched stories, ship source verbatim as dist/web/story.story); `runTranscriptTests` on the shared author-game loader. `chord-build.test.ts` 6 REAL-PATH tests (compiler proven IN game.js via the `story language 1` stamp). TS path preserved behind `--ts` (init/browser-build tests re-pinned). devkit 39/1sk.
- **Mid-phase gap from David ("there may be a gap with sharpee build. the IDE will want the IR") CLOSED**: both chord build paths emit `dist/<story>.ir.json` (tooling artifact beside the page; the page still ships SOURCE per ruling 2). Asserted in tests + proof.
- **Phase 3 COMPLETE (clean-machine proof, PASS)**: `scripts/g2-clean-machine-proof.mjs` + `docs/work/chord-author-pipeline/proof/g2-proof-run.log`. Staged tarball install (fresh `tsf build --npm`; run via `node /Users/david/repos/tsf/dist/cli/index.js build --npm`) → bare `sharpee` → init (Chord) → npm install (@sharpee staged, registry for public deps) → build --browser → served page BOOTS in real Chromium (playwright chromium-headless-shell downloaded via `npx playwright install chromium` in tools/zifmia; script falls back to system Chrome channel) → story compiles in-browser → inventory + examine turns asserted on rendered text. Named deferral: public-registry `npm i -g` waits for Phase 8 (G4 publish). Gotchas: `sharpee --help` exits 1 by design (use `help`); playwright unhoisted under pnpm (resolve via tools/zifmia createRequire).
- **Phase 4 regression green**: devkit 39, chord 357, story-loader 274, stdlib 1534, repokit build, cloak 81/81, zoo 71/71 + 56/56.

- **Phase 4 COMPLETE — WORKSTREAM COMPLETE; ADR-233 G2 CONFIRMED SATISFIED (David)**: amendment note in ADR-233 (proof linked; public-registry `npm i -g` deferral named, rides on Phase 8/G4); umbrella Phase 6 SHIPPED note; `.current-plan` → chord-go-live.

## G3 started (post-G2, same session)
- **Pattern selection RULED (David)**: the ☆ spine + G4/G5, canonical playthrough BROWSER-FIRST — recorded in the catalog's SELECTION section (32 patterns; C4 topics shipped earlier this session, no platform work rides on it).
- session-planner wrote `docs/work/chord-tutorial-story/plan.md` (10 phases, 2,700 budget; review clean, one advisory on Phase 9 doc shape). `.current-plan` → chord-tutorial-story.
- **Phase 1 design doc WRITTEN**: `docs/work/chord-tutorial-story/story-design.md` — "The Folly at Fernhill" (slug `fernhill`, stories/fernhill/ in-repo canonical + devkit-taught outside path recorded); 13 rooms/2 regions, 3 NPCs (Kettle guard, Tobias patrol+topics, Smoke follower/feedable), coupled D5→A5+E1 boiler/greenhouse chain as the logic centerpiece, fuse finale, 8 scores, two endings, all 32 patterns checklisted. **AWAITING DAVID'S SIGN-OFF (the Phase 1 blocking checkpoint) — no story prose at scale until it clears.**

- **Phase 1 SIGNED OFF (David)**; B4 + red-herring cheap wins folded pre-sign-off (from the 124-pattern web-save design-catalog comparison; ifwiki renumbering pending — no external ids referenced).
- **Phase 2 COMPLETE**: `stories/fernhill/fernhill.story` A-group skeleton (13 rooms/2 regions, 3 doors, dark cellar+lamp, live-state frost seal, crossing reactions, 2 daemons, first-time gates). 4 transcripts 62/62. Gotchas: additive `containing` lines (no trailing-comma continuation); negative assertions are `[OK: not contains "…"]` (`[NOT:]` silently dropped); first `look` = first visit; boiler switch-on line is "hums to life".

- **Phase 3 COMPLETE (B-group)**: trunk/mantel with capacities, crowbar→crate→opener→tin R3 tool chain (explicit instrument), concealed keys (mat + overcoat pocket), curtains hiding-spot, both readable forms (clause prose + `with text` config), 15-entity scenery pass. 7 transcripts 129/129; cloak/zoo re-proven.
- **PLATFORM FIX (David-approved)**: loader placement pass → `AuthorModel.moveEntity` (closed-container contents were silently dropped from `.story`; TS path always used AuthorModel). `closed-container-contents.test.ts`; story-loader 275/275; bundle rebuilt.
- Gotchas: placement lines need article form (possessive entity names misparse as trait adjectives); container/supporter takes say "You take X from Y"; tool-openables need `open X with Y`.

## ADR-240 detour (live derived state) — COMPLETE this session
- Tutorial Phase 4's Kettle beat exposed the recompute-staleness class; David: "Remove the urgency… rethink" → elegance pass → **principle ruled: "Mutations are instant. Anything checking state should get the most current results."** ADR-240 drafted → reviewed 8/15 → fixed (D6 contract, D7 ACs, Q-format) → interview 3/3 (ONE generic per-world evaluator registry in world-model, David's "why not one?"; ALL blocks through the seam; audit-complete deletions) → ACCEPTED, review 15/15 → 3-phase plan → **implemented same session**.
- Landed: `registerEvaluator`/`evaluate` (WorldModel/AuthorModel); `darkKey` + 3 visibility sites; `exitBlockedKey`/`exitMessageKey` + 2 going sites; loader registers ALL blocks + dark-whiles; blocked messages resolved AT REFUSAL TIME with all five strategies; recomputeDerived + trigger list + stamping DELETED. 15 new tests + 10 legacy tests moved to live reads.
- Regression: world-model 1390, stdlib 1537, story-loader 278, chord 357, engine 513, repokit build, cloak 81/81 (incl. save/restore + re-darkening = AC-5 real-path), zoo both, fernhill 175/175. **ACs flagged to David, awaiting confirmation.**
- Fernhill Phase 4 (C-group) went fully green en route: npcs 41/41 (guard block lifts LIVE on the softened state — ADR-240's AC-1; both topics tables; patrol caught via `[DO]…[UNTIL "enters from the"]`; entity-tier boiler ask; folly unjam). Story: Tobias `wait-turns 5 and announces-movement true`.
- Gotchas: transcript UNTIL needs a `[DO]` opener; NPC announcements default OFF (`announces-movement true`); arrival text is "enters from the <dir>", and **"The Tobias enters…" article bug on proper-named NPCs (entityInfoFrom class) — cosmetic platform flag, not fixed**.

## Tutorial Phases 4-5 closed (post-ADR-240)
- Phase 4 DONE (gate met by the ADR-240 AC-1 run). **Phase 5 DONE**: boiler machine (3-stage, order-enforced, states mirrored via on-enter `change`), fuse both branches (incl. real `kill`), `at turn 14` timeline + story states, cellar drip + once-startle. Fernhill: 12 transcripts, 254/254. Phase 6 (E-group) CURRENT.

## Next session
- David confirms ADR-240 ACs → mark tutorial plan Phase 4 DONE (its gate is met) → Phase 5 (time/machine chain) or 6. Then 7, 8 (browser/media), 9 (docs+site), 10 (closure → G3 confirmation).
- Remaining after G3: **G4** (Phase 8 umbrella: version bump + `repokit verify` + publish; unlocks the deferred public-registry install proof step).
- Commit backlog: everything since 9a400668 (G3 phases 1-4 content, ADR-240 + implementation, loader AuthorModel fix) is uncommitted.
- Open item for David (carried): actor `article: undefined` quirk.
- Untracked noise: `docs/context/.devarch-events-*.jsonl` (a .gitignore entry would quiet them); `packages/sharpee/docs/genai-api/index.md` auto-regenerated by repokit builds (uncommitted, harmless).
- No pre-G4 child workstreams remain. Umbrella Phase 6+ (G2 devkit/U2 pipeline) awaits its platform-change go-ahead; tutorial pattern-catalog spine selection (umbrella Phase 7 step 2) still awaits David.
- Open item for David (carried): actor `article: undefined` quirk.
