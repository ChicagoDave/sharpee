# Plan: ADR-262 / 261-amendment / 263 — banded-scalar crossing engine + hunger meter

**Branch**: `hatch-scoring` · **Status**: COMPLETE · **Started**: 2026-07-24

Implements three lined-up ADRs, in dependency order:

1. **ADR-262** (ACCEPTED) — the internal banded-scalar crossing engine.
2. **ADR-261 amendment** (ACCEPTED) — reconcile the already-IMPLEMENTED scoring/rank
   code with the engine: full-span event, report-each-elevation, overridable fallback,
   `announce silent`.
3. **ADR-263** (ACCEPTED) — `use hunger` as consumer #2 (ADR-262's real-path forcing
   function). **Sanity is deferred** — 263 marks it blocked on ADR-264 (unwritten
   numeric-counter primitive). Hunger only.

## References consulted

- ADR-262, ADR-263, ADR-261 (incl. the 2026-07-24 D7 amendment), ADR-260.
- ADR-120 (TurnPlugin model), ADR-215 (trusted extensions), ADR-097 (messageId render path).
- Session summary `session-20260724-0327-hatch-scoring.md`.

## Verified ground truth (from code map, branch hatch-scoring)

- `@sharpee/plugins` exists; `TurnPlugin` = one hook `onAfterAction(ctx): ISemanticEvent[]`
  + optional `getState`/`setState`. `TurnPluginContext.actionEvents` is a frozen pre-loop
  snapshot → plugins re-derive crossings from world state (they cannot observe each other).
- Dependency graph: both `story-loader` and `ext-scoring` already depend on `@sharpee/plugins`
  and `@sharpee/world-model`. `bandOf`→world-model, factory→plugins introduce **no new deps,
  no cycle**.
- `ScoreLedger.getRank()` (`world-model/src/world/ScoreLedger.ts:182`) is the ascending walk
  `bandOf` replaces. `setRanks` already rejects duplicate thresholds (acceptance 1a).
- `RANK_RISEN` (`if-domain/src/events.ts:132`) has **zero runtime consumers** — two test files
  only (`ext-scoring/tests/rank-watcher-plugin.test.ts`, `story-loader/tests/rank-ladder.test.ts`).
  Safe to retire. **DELETION — confirm with user before removing the constant + `RankRisenData`.**
- Current scoring topology = **two** plugins: ext-scoring `RankWatcherPlugin` (data `rank_risen`)
  + story-loader `buildPromotionNarrator` (spoken `rank_narrated`, Chord-only, silent when no
  `says`). Both hand-roll the same `findIndex` crossing walk and both collapse multi-band jumps.
- Chord already at **1.1.0**; EBNF SHA pinned in `chord/tests/language-version.test.ts`.
- Eating: `if.event.eaten` carries `nutrition?` but **omits it when nutrition === 1**
  (`stdlib/.../eating/eating.ts:199`) — edge case for the hunger phase (see Open Question O-2).

## Design decisions (within the ADR envelope)

- **D-topology (Fork A): keep the two-plugin split, rebuilt on a shared engine (option A2).**
  The **data event** `if.event.band_crossed` (full span, no messageId) is the always-on part,
  emitted by the concept's watcher — works for TS stories (ADR-261 explicitly keeps TS stories
  on the raw event + DIY rendering). The **narration** (spoken lines under the 4 modes, author
  phrase or overridable fallback) stays the Chord narrator, now speaking the fallback instead of
  returning `[]`. Dedup is achieved by both consuming shared helpers (`bandOf` + a span helper +
  a render helper), not by hand-rolled walks. Rationale: faithful to D7 ("watcher and narrator
  rebuilt"), preserves the TS-story contract, lowest-risk (no registration re-architecture).
- **D-events**: `band_crossed` = pure data (concept, from, to, bandsCrossed[], value), NO
  messageId → never double-renders. Narration events carry `messageId` + params via the ADR-097
  path. `band_crossed` **replaces** `rank_risen` as the data event.
- **D-fallback**: platform default promotion line in lang-en-us, registered as an overridable
  alias (mirrors combat `combat.attack.missed`). A crossed rung with no `says` renders it; only
  `announce silent` suppresses.

## Phases

### ADR-262 — the engine (additive; no deletion until Phase 5)

- **P1 — `bandOf` in world-model. ✅ DONE.** `world/band.ts`; `getRank` delegates to it; barrel
  export; `band.test.ts` (6 cases). world-model 1422 green; CJS+ESM rebuilt.
- **P2 — `if.event.band_crossed` + the crossing-watcher factory. ✅ DONE.** `BAND_CROSSED` added to
  if-domain (RANK_RISEN kept, marked deprecated). `@sharpee/plugins/src/band-crossing.ts`:
  concept-agnostic `createBandDataWatcher` (emits full-span data event) + `createBandNarrator`
  (four modes, fallback, `paramsFor` override) over a shared rise-only detector (seed baseline,
  derive-not-store, save/restore). Added vitest to the plugins package; `band-crossing.test.ts`
  13 green. world-model/if-domain/plugins all build CJS+ESM. **Decisions confirmed with owner:**
  A2 topology (Chord-only fallback, two plugins, dungeo untouched); retire rank_risen at P5.
- **P3 — overridable fallback message. ✅ DONE.** `if.action.scoring.promotion` added to
  lang-en-us; `scoring-promotion` alias added to BOTH `message-alias-map.ts` and the chord
  catalog. Bijection tests green (story-loader alias-map 8/8, chord override 8/8, lang-en-us 430).
  (Pre-existing unrelated failure `dotted-phrase-keys.test.ts` remains — documented last session.)

### ADR-261 — reconcile scoring onto the engine

- **P4 — rebuild scoring on the factory. ✅ DONE (plugins + narrator).** ext-scoring
  `RankWatcherPlugin` → `createRankWatcher()` (a `createBandDataWatcher` over the score) emitting
  `band_crossed` full span. story-loader `buildPromotionNarrator` → `createBandNarrator`: `all`
  mode (report each elevation), `if.action.scoring.promotion` fallback when no `says`; narrator
  now registers whenever a ladder exists.
- **P4b — `use scoring, announce <mode>` grammar. ✅ DONE.** `, announce <mode>` suffix on a `use`
  line: parser (comma suffix) → AST `UseDecl.announce` → analyzer (`analysis.invalid-announce-mode`,
  builds `ir.announceModes`) → loader threads `announceModes.scoring` to the narrator. EBNF +
  `CHORD_LANGUAGE_VERSION` 1.1.0 → **1.2.0** + re-pinned SHA + doc headers. Green: chord 519 (new
  `announce-mode.test.ts` 5; 4 golden IR snapshots regenerated for the additive field), story-loader
  rank-ladder 20 (silent/collapsed/all threaded end-to-end). **ADR-262 + ADR-261 COMPLETE.**
- **P5 — retire `rank_risen`. ✅ DONE.** `RANK_RISEN` + `RankRisenData` removed; both tests
  migrated to `band_crossed`; `rank-watcher-plugin.test.ts` "skips intermediate rungs" rewritten to
  assert the full span (ADR-262 #6). Stale chord doc-comments updated. Green: ext-scoring 14,
  story-loader rank-ladder 17, stdlib scoring-golden 15. **REAL-PATH ✅** through a rebuilt
  `dist/cli/sharpee.js`: fernhill walkthrough 76/76 (Chord, authored ranks + promotions render —
  262 #6, 261 #10); dungeo chain 882/882 across 17 transcripts (TS story untouched, confirming A2).

### ADR-263 — hunger (consumer #2)

- **O-2 resolved (owner: option 3).** `stdlib` eating now **always emits `nutrition`** (dropped the
  `!== 1` omission in `eating.ts`) so the hunger handler reads the true value. No runtime consumer
  read the field before; eating-golden 23 green. ✅
- **P6 — `use hunger` grammar + IR. ✅ DONE.** Body-bearing `use hunger`: `grows N each turn`,
  bareword `<band> at <n> [says <key>]` rungs, `fatal at N`. AST (`HungerDecl`/`MeterRung`), parser
  (`parseHungerBody`/`parseMeterRungLine`), IR (`IRHungerDef`/`IRMeterRung`), analyzer (dedup/sort +
  `analysis.duplicate-hunger-threshold`), `HUNGER_MANIFEST`. EBNF + `CHORD_LANGUAGE_VERSION`
  1.2.0 → **1.3.0** + re-pinned SHA + doc headers. `announce <mode>` works for hunger via the shared
  P4b suffix. Green: chord 525 (new `hunger.test.ts` 6; IR snapshots regenerated for the version bump).
- **P7 — the hunger runtime. ✅ DONE.** New `packages/extensions/hunger` (`@sharpee/ext-hunger`):
  severity accessors (world-state `hunger.severity`, save-persisted), `registerHunger` (the
  `if.event.eaten` handler), `createHungerCrossingWatcher` (ADR-262 consumer #2). Loader lowers
  `ir.hunger`: decay+death daemon (`grows`/`fatal` via `killPlayer`), the crossing watcher, and the
  narrator (author phrase or `if.action.hunger.crossed` fallback, under `announce`). Registry entry +
  workspace membership + lang-en-us `crossed` fallback + `hunger-crossed` alias (both tables). Green:
  ext-hunger 5, story-loader hunger-loader 6 + manifest-conformance 7 + alias-map 8; lang/chord/loader
  all build.
- **P8 — hunger REAL-PATH (through `dist/cli/sharpee.js`). ✅ DONE.** New `stories/hunger-demo/`
  (`hunger-demo.story` + `tests/starve.transcript`): a `use hunger` meter played through the real
  bundle — severity grows 3/turn and crosses each band, narrating the author `says` phrases
  (peckish/hungry) then the **platform fallback** for a phraseless rung (starving → "The hunger
  sharpens."), and reaching `fatal at 12` fires `if.event.player.died`. Transcript **4/4** (262 #7 /
  263 #6 — the engine proven scalar-agnostic through the bundle). Severity save/restore (263 #4a)
  covered by hunger-loader 7/7 (`world.toJSON`/`loadJSON` round-trip). Eating recovery is
  unit-tested in ext-hunger (default Chord `edible` = nutrition 1, so with `grows ≥ 1` the net is
  not transcript-observable — proven at unit level instead).
  - Fallback wording note: the platform `if.action.hunger.crossed` line is deliberately generic
    (no `{band}` interpolation) — the assembler articles a bare word param ("a hungry"), the same
    cosmetic quirk scoring's `{rank}` has; band-specific prose belongs in the author's `says`.

## Language-layer completeness — all prose routes through lang-en-us

No hardcoded English in any new engine/plugin/loader/stdlib code (audited). Every user-facing line
is a message id resolved by lang-en-us, and every platform line is `override message`-able:
- scoring crossing fallback → `if.action.scoring.promotion` (`scoring-promotion`)
- hunger crossing fallback → `if.action.hunger.crossed` (`hunger-crossed`)
- hunger death → `if.action.hunger.starved` (`hunger-starved`) — routed through `killPlayer`'s
  `messageId` (like combat's `combat.player_died`); previously fell through to the generic death
  line, now hunger-specific and overridable. Renders "You have starved to death." (demo asserts it)
- author `says` phrases → the story's own phrase namespace
All three new platform messages carry aliases in both the loader map and the chord catalog (the
bijection test keeps them in lockstep).

## Regression validation (through rebuilt `dist/cli/sharpee.js`)

- **fernhill** walkthrough 76/76 (Chord scoring, unchanged).
- **dungeo** scoring correct: `rank-survives-ceiling-change` passes; score display + `bandOf` rank
  derivation verified at 373/441/493. The dungeo **combat walkthrough chain is pre-existing flaky**
  (same bundle → 872-pass / 5-fail / 350-fail across runs; combat RNG), and its `$save wt-13` rewrites
  the gitignored `saves/wt-13.json` — running the flaky chain corrupts that save, failing the two
  score unit transcripts that `$restore wt-13`. A clean chain run restores it. **Not caused by this
  work** (nothing here touches combat); flagged as a separate pre-existing test-infra fragility.

## Open questions

- **O-1 (Fork A)**: confirm the two-plugin A2 topology vs. full unification into one plugin.
  Proceeding with A2 unless the user prefers unification.
- **O-2**: eating omits `nutrition` when it equals 1. Under ADR-263 "missing = zero", a
  1-nutrition food would not reduce hunger. Confirm intent (treat 1 as 1, or as omitted) when
  building P7.
- **O-3 (DELETION)**: `RANK_RISEN` constant + `RankRisenData` removal — confirm at P5.

## Process

One logical change per phase; build both tsf targets (`--target esm` separately — the ESM target
does NOT refresh on a plain `tsf build`) and run affected suites green before the next. Per root
CLAUDE.md: no auto-retry on failure (report + wait); no deletions without confirmation.
