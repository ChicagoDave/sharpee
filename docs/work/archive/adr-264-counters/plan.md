# Plan: ADR-264 — Chord numeric counters

**Branch**: `adrs-264-265-counters-stdlib-reference` · **Status**: COMPLETE · **Started**: 2026-07-24

Implements ADR-264 (ACCEPTED): `define counter` (story-global) + per-entity `counter`, `raise`/`lower
<counter> by <n>` with silent clamp, counters read in conditions. Core Chord grammar (no `use` gate).

## Verified ground truth (from code scouts)

- **Declarations** mirror `define sequence`/`score`: `parseDefine` switch (parser.ts:1519) for story-global;
  the `parseCreate` body if-chain (parser.ts:801, `states`/`score` branches) for per-entity. AST
  `Declaration`/`CreateDecl`, IR `StoryIR.counters`/`IREntity.counters`, analyzer `buildEntity` +
  a counter-name registry (mirror `scoreNames`/`conditionNames`). **No manifest, no `use` gate** — core.
- **Mutations** mirror `award`/`change`/`set`: `STATEMENT_OPENERS` += `raise`,`lower` (parser.ts:191);
  `parseStatement` switch; AST `Statement` union; IR `IRStatement`; runtime `execStatements` mutations
  phase (runtime.ts:1515) — `case 'change'`/`'set'` are the templates. Clamp is new (two-sided).
- **Storage**: `world.getStateValue/setStateValue` (WorldModel.ts:1117) is a generic bag that round-trips
  via `toJSON`/`loadJSON` (confirmed — `hunger.severity` uses it). Per-entity persists two ways, both
  serialize: entity-keyed bag (`CHORD_STATE_PREFIX + entityId`) or a `ChordDataTrait` field
  (`writeChordTraitField`, runtime.ts:904). New `CHORD_COUNTER_PREFIX` in state-keys.ts.
- **Conditions are the hard part**: no relational operators anywhere. Lexer emits `>` as a lone `punct`
  (no `>=` token). `is` (evaluator.ts:169) is **string equality only**. The possessive/`its` operand
  IS fully plumbed (parser `X's <field>`/`its <field>` → IRValue `field` → `readChordTraitField`, which
  returns numbers). Every condition site funnels through one `Evaluator.evalCondition` — add one
  IRCondition variant + one evaluator `case` and all sites (`when`/`while`/`must`/`kill … when`) light up.
- **hunger severity** (this session) is the end-to-end template: persisted named number + get/set with
  clamp folded into the setter + additive mutation from a lowered daemon (`buildHungerDaemon`, loader.ts:891).
  Caveat: `setHungerSeverity` clamps floor-only; counters need a two-sided clamp helper.

## Design decision (P3) — RESOLVED: both syntaxes

**D-compare — comparison syntax for `when <counter> <op> <n>`. Owner chose BOTH** (2026-07-24):
word-spelling (`is at least`, `is more than`, `is at most`, `is less than`, plain `is` for `==`) AND
symbolic (`>=`, `<=`, `>`, `<`), as aliases lowering to one IR `compare` node (`op ∈ gte|gt|lte|lt|eq`).
So the lexer gains compound `>=`/`<=` tokens (recognize `>`/`<` optionally followed by `=`), plus the
word-forms via the existing word tokenizer. Both live in P3. ADR-264 D3/AC updated to state both.

## Phases

- **P1 — declarations. ✅ DONE.** `define counter <name> [starts n] [between lo and hi]` (story-global)
  + `counter …` in a `create` block (per-entity), both through AST (`DefineCounter`/`CounterDecl`),
  parser (`parseDefineCounter`/`parseCounterLine`/shared `parseCounterSuffix`), IR
  (`IRCounterDef`/`IRCounterDecl`, `StoryIR.counters`/`IREntity.counters`), analyzer (`resolveCounter`:
  default-0, clamp starts into bounds, `analysis.counter-bounds` on empty range). Loader seeds initial
  values into world state via `counterKey` (`chord.counter.<name>` / `chord.counter.<entityId>.<name>`,
  `CHORD_COUNTER_PREFIX` in state-keys.ts). Green: chord 531 (new counter.test.ts 6; 10 golden snapshots
  regenerated for the additive `counters` field), story-loader 363 (new counter-loader.test.ts 3 — seed,
  per-entity independence, save/restore). No registry yet (deferred to P2 when `raise`/reads resolve).
- **P2 — mutations. ✅ DONE.** `raise`/`lower <target> by <n>` — `STATEMENT_OPENERS` += raise/lower,
  parse (target via `parseValueExpr` stop-at-`by`, reject non-number/negative), AST `CounterMutateStmt`,
  IR `{kind:'raise'|'lower', counter, owner: IRValue|null, amount, stmtWhen}`. Analyzer: counter-name
  registries (`storyCounterNames` + `entityCounterNames`, built in the pre-pass/`collectEntity`),
  target resolution (bare→story-global, possessive→per-entity via owner IRValue), `analysis.unknown-counter`
  + `analysis.duplicate-counter`. Runtime `execStatements` case: resolve key via `counterKey`+`irIdOfValue`,
  read→±amount→**silent two-sided clamp** (`counterBounds` from `this.ir`)→write. Green: chord 534 (counter
  9 — accept/unknown/negative), story-loader 365 (counter-loader 5 — daemon-driven accrual + clamp at
  ceiling & floor, per-entity save/restore).
- **P3 — condition reads. ✅ DONE.** Both spellings. Lexer emits compound `compare` tokens
  (`>=`/`<=`/`>`/`<`); parser recognizes symbolic (a `compare` token after the subject) and word forms
  (`is at least`/`is more than`/`is at most`/`is less than`) in `parsePredicate`. AST `compare` Predicate,
  IR `compare` IRCondition + a `counter` IRValue operand. Analyzer: `resolveValue` reads a bare name in
  `storyCounterNames` or a possessive in `entityCounterNames` as a `counter` operand; the compare
  requires a counter left operand (`analysis.unknown-counter` on a typo). Evaluator: `evalValue` reads
  the counter from world state via `counterKey`; `evalCondition` does the numeric compare — one choke
  point, so every `when`/`while`/`kill … when` site lights up. Green: chord 537 (both spellings compile,
  undeclared rejected), story-loader 367 (counter-loader 7 — `is at least` and `>=` gate `kill the
  player` identically at the right turn). Two AST-Predicate walkers got the `compare` case.
- **P4 — EBNF + version + real-path. ✅ DONE.** chord.ebnf productions added (`define-counter`,
  `counter-line`, `raise`/`lower … by N`, `word-compare`/`compare-op`/`counter-ref` in the predicate);
  `CHORD_LANGUAGE_VERSION` 1.3.0 → **1.4.0** + re-pinned SHA (`57469cd7…`) + doc headers; language-version
  test green; 4 golden IR snapshots regenerated for the version field. **REAL-PATH ✅** through
  `dist/cli/sharpee.js`: new `stories/counter-demo` — `define counter dread`, `raise dread by 20` in an
  `on every turn` clause, `kill the player when dread is at least 100`. Transcript **7/7**: dread rises,
  `$save`/`$restore` preserves the counter (death fires at exactly the right post-restore turn), the
  comparison gates the death event.

## Final state — ADR-264 COMPLETE

All four phases green + real-path validated. chord 537, story-loader 367, world-model 1422. Chord
language **1.4.0**. Counters are core grammar (no `use` gate); story-global + per-entity; `raise`/`lower`
with silent two-sided clamp; readable in conditions via both word and symbolic comparisons. Per ADR-262
D8, per-entity *banding* remains out of scope (counters here serve logic/conditions, not banded narration).

## Process
Per-phase build + test green before the next (no auto-retry on failure; report + wait). Counters are
CORE grammar — no manifest/registry/alias work. Per ADR-262 D8, per-entity *banding* stays out (counters
here serve logic/conditions, not banded narration).
