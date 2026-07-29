# Chord Compiler & Language Review

**Scope:** all 35 source files in the Chord Review project — the `@sharpee/chord` front end (lexer, parser, AST, analyzer, IR, catalogs, extension manifests) and the `@sharpee/story-loader` back half (loader, runtime, evaluator, contract maps, registries).
**Date:** 2026-07-29 · Chord language version 2.1.0 · IR format `story language 1`

---

## 1. Overall assessment

This is an unusually disciplined codebase. The design philosophy — "never guess, never a silent no-op" — is not just stated but visibly enforced: closed vocabularies with nearest-match suggestions, fix-it diagnostics that name the replacement for every removed construct, atomic loads, two-layer gates (compile diagnostic + rogue-IR loader backstop), and conformance tests pinning the names-vs-mappings split between the platform-free compiler and the platform-binding loader. The ADR cross-referencing in comments is exemplary; almost every decision is traceable to a ruling and a date.

That said, the review found a handful of real correctness defects, several of which are exactly the class the language promises to prevent — constructs that compile clean and then silently do nothing or do the wrong thing at runtime. Most cluster around one architectural seam: the **two-pass statement execution model** (a `mutations` pass followed by a `reports` pass over the same body), whose routing snapshot covers `select-on` and `each` but not `select-strategy` or statement `when` suffixes. The findings below are ordered by severity.

---

## 2. Correctness findings

### High severity

**H1. `select-strategy` advances twice per firing and can route the two passes differently** — `runtime.ts`
`execStatements` runs a clause body twice inside interceptors and capability behaviors (`'mutations'` then `'reports'`). Each pass calls `decideStrategy`, which unconditionally reads *and increments* the world-state counter (or draws the RNG for `randomly`). Consequences: a `cycling` select inside an `on`/`after` clause advances by **two** per firing, so players see every other alternative; and because the reports pass reads the already-bumped counter, the mutations pass can execute alternative *n* while the reports pass emits alternative *n+1* — mutations from one branch, narration from another. `randomly` additionally draws the seeded stream twice, desyncing AC-5 determinism against single-pass contexts. `snapshotDecisions` walks `select-strategy` alternatives but records no decision for them (only `select-on` and `each` are pinned). Fix: snapshot the strategy decision at validate time exactly as `select-on` decisions are snapshotted, and consume the counter once.

**H2. Open conditions cannot reference declared states — `analysis.unknown-value` false positive** — `analyzer.ts`
`define condition hungry: it is hungry` resolves in `TOP_SCOPE`, where `scope.owner` and `scope.ownStates` are both null. In `resolveIsObject`, `validStates` therefore collapses to `[]`, and unless the word happens to be a catalog trait/state adjective or an entity name, the analyzer errors with `analysis.unknown-value`. The same happens for `its state is hungry`. But top-level `define condition` blocks that reference `it` are precisely the *open conditions* that power `any`, `no`, `each`, and `must be any` — the E1/E2/E3 centerpiece. As written, an open condition can only test catalog adjectives (`open`, `locked`, `lit`, …), never a trait-declared or entity-declared state. Either the gate should accept any state name declared by *some* trait/entity (the union, with the runtime resolving per candidate — the same stance already taken for `the match`: "its state set is statically unknowable"), or the restriction is intended and needs a much more instructive diagnostic. Given the zoo examples in the comments (`hungry`/`content` on `feedable`), this looks like an oversight.

**H3. The player's `states:` and per-entity counters are never seeded** — `loader.ts`
`initializeWorld` pass 2 seeds `chord.state.<id>` from `states[0]` and each counter's `starts` — but only for entities in `built`, and the player is deliberately excluded from passes 1–2. `finalizePlayer` applies trait adjectives, `starts` states, carries, and wears, but never seeds state or counters. A `create the player` block with `states: fresh, exhausted` or `counter stamina starts 10` compiles clean and loads clean, but `the player is fresh` evaluates false and `the player's stamina` reads 0 — a silent wrong-answer of the kind the design forbids. Either seed them in `finalizePlayer` or gate `states:`/`counter` on the player block at compile.

**H4. Refusals outside the leading flat run are silently dead** — `runtime.ts` + `analyzer.ts`
`findRefusal` scans the body in source order and **breaks at the first non-refusal statement**; it never descends into `select-on` arms, `select-strategy` alternatives, `ordinal` blocks, or `each` bodies. The execute/report passes explicitly skip `refuse`/`must`/`refuse-when` ("consumed by findRefusal"). So a refusal placed inside a select arm, an ordinal block, or after any non-refusal statement (e.g. after a `phrase`) compiles without complaint and never fires anywhere. The compile-side gate (`analysis.refusal-after-mutation`) covers only the refusal-after-*mutation* case — a refusal after a `phrase`, or nested in branching, sails through. The parser's `after`-clause refusal ban has the same blind spot: `blockKeyword` is replaced by `'select'`/`'ordinal'` when descending, so `reportRefusalInAfter` misses nested refusals too. Recommended: an analyzer gate that rejects (or at minimum warns on) any refusal statement not in the leading validate partition — this is a "silently dead construct," the exact class ADR-228 D5 exists to kill.

### Medium severity

**M1. `select-strategy` persistence key collides across files and instances** — `runtime.ts`
The counter key is `chord.occurrence.select.<line>` — the span's *line number only*. Spans carry no file dimension, and `import` splices fragments that keep their own line numbers, so two selects on line 40 of two different fragments share one counter. Separately, a select inside a *trait* clause uses one global counter across every entity composing the trait, unlike phrase `Choice` atoms, which key per `(entityId, messageKey)`. Key by a stable statement identity (owner id + clause index + statement path), not a line number.

**M2. `raise`/`lower` are not counted as mutations by the phase-order gate** — `analyzer.ts`
`checkPhaseOrder` marks `set`/`change`/`move`/`remove`/`award` as mutations but not `raise`/`lower`, which the runtime executes in the mutations pass. `raise the innkeeper's suspicion by 1` followed by `refuse when …` passes compile, yet the refusal is dead at runtime (H4). One-line fix: add the two kinds to the mutation case.

**M3. Statement `when` suffixes on report statements observe post-mutation state** — `runtime.ts`
`execStatements`' comment asserts "mutations and reports agree because the suffix runs before either phase's own mutations of this statement" — true for the statement's *own* mutation, false when an *earlier* statement in the same body mutates state the suffix reads. `phrase warning when its state is armed` followed by `change it to disarmed`: the reports pass evaluates the suffix after the mutations pass already disarmed, so the phrase is silently skipped despite being true at its source position. The `select-on`/`each` decision snapshot exists precisely to prevent this class of divergence; `stmtWhen` deserves the same treatment (or the semantics should be documented as "post-mutation" and the comment corrected).

**M4. No duplicate-name gate for `define action` or `define trait`** — `analyzer.ts`
Machines, channels, phrasebooks, pronoun sets, counters, assets, scores, and entities all have duplicate gates; actions and traits do not. A second `define action petting` silently overwrites the first's slot registry (`actionSlots.set`), emits two IR actions with the same `chord.action.petting` id, and registers grammar twice; a second `define trait guard` registers two interceptors under the same keyed `(traitType, actionId)` registry — where the second registration *replaces* the first, the exact silent-mask the duplicate-clause gate exists to prevent one level down.

**M5. Player placement written `in <room>` is silently ignored** — `loader.ts`
Pass 2 (which applies `in`/`on` placement) excludes the player; `finalizePlayer` honors only `relation === 'starts-in'`, else falls back to the first declared room. So `create the player` / `in the Kitchen` compiles and loads clean but starts the player in whatever room was declared first. Either honor it or gate it (`analysis.player-placement` suggesting `starts in`).

**M6. Exits on non-room entities are ungated** — `analyzer.ts` / `loader.ts`
Nothing prevents `north to the Hall` inside a non-room `create` block. The loader will call `world.connectRooms(thing, hall, north)` on a plain object — behavior depends on the platform (likely a throw without a span, possibly silent). Every comparable host rule (`containing` on non-regions, `first time` on non-rooms, `deadly` phrasing) has an analyzer gate; exits and blocked/deadly exits should get one too.

**M7. `checkPhaseOrder` shares its `mutated` flag across mutually exclusive `select` arms** — `analyzer.ts`
Arms of one `select-on` are alternatives, but the gate threads a single `{mutated}` object through all of them in declaration order. A `set` in arm one falsely triggers `refusal-after-mutation` for a refusal in arm two, though the two can never co-execute. (In practice H4 makes such refusals dead anyway, but the diagnostic is still wrong about *why*.)

### Low severity / polish

- **L1.** `recoverToTopLevel`'s `TOP_KEYWORDS` set omits `extend` and `remove`, so after a parse error the recovery skips a following `extend action` / `remove from action` block entirely — cascading loss of diagnostics, though the compile already fails. (`parser.ts`)
- **L2.** The `lex()` doc comment promises "unterminated strings" diagnostics; the tokenizer deliberately treats a lone quote as prose punctuation and never reports. Comment drift. (`lexer.ts`)
- **L3.** A phrasebook entry whose key is literally `phrase` misparses: `parsePhraseOverride`'s `matchWord('phrase')` consumes it as the keyword and the entry key becomes the next token (or null). (`parser.ts`)
- **L4.** `isNegationOf`'s fused prefixes `in`/`im`/`dis` invite false positives on unrelated state pairs (`side`/`inside`, `tact`/`intact`, `press`/`impress`). Requiring the hyphenated form for those three (as already done for `no-`) would keep ring 3 honest. (`analyzer.ts`)
- **L5.** Trait double-add guards are inconsistent in `applyTraitAdjectives`: `scenery`, `openable`, `edible`, `pushable`, etc. are guarded with `entity.has(...)`, while `wearable`, `switchable`, and `light-source` add unconditionally — a duplicated adjective behaves differently per trait. (`loader.ts`)
- **L6.** `emit clock tick` (multiple words) is accepted and joined into the event id `'clock tick'` with a space, though the grammar comment says an event id is one dotless token; such an event can never match a channel's single-word `from <event>`. A parse gate on multi-word event ids would close the gap. (`parser.ts` / `analyzer.ts`)
- **L7.** Hunger body: duplicate band *ids* are allowed (only thresholds are deduped), and nothing checks `fatal` sits above the top rung despite the doc saying so. (`analyzer.ts` `buildHunger`)
- **L8.** `registerPresentEntries`' gate uses `getContainingRoom(ownerWorldId)`, which is undefined for a room owner — a gated `present` block on a room can never pass its gate. Rare authoring shape, but silently false. (`loader.ts`)
- **L9.** Two independent Levenshtein implementations (`analyzer.ts` `nearest`, `loader.ts` `editDistance` with different budgets) — worth unifying so suggestion behavior is identical across compile and load diagnostics.
- **L10.** Project housekeeping: three docs share the name `index.ts`, which makes them ambiguous to reference in this knowledge base — consider path-prefixed names (`manifests/index.ts`, etc.).

---

## 3. Language design

**What works well.** Chord's core bet — prose is opaque, structure comes from indentation and a small closed keyword set, and *all* vocabulary is closed and validated — pays off in diagnostics quality: nearly every mistake produces a named, spanned error with the fix spelled out, often citing the ADR that made the rule. Standout decisions:

- **Ownership everywhere.** Removing floating `when`/`once`/`every` rules and forcing behavior onto owners (`on <action> it` on the entity it concerns) gives every clause a home, a presence-scoped narration default, and a natural `it` binding. The removal diagnostics that name the replacement are the right way to evolve a language.
- **No booleans, anywhere.** The three-ring boolean-state gate (literal booleans, platform-pair shadows, negation-shaped names) pushes authors toward states that *name what the thing is* — a genuinely good modeling discipline, well enforced.
- **Positive requirements vs. present hazards.** The `must` / `refuse when` polarity split (with `must not` and `refuse when not` both refused) is an elegant piece of language ergonomics: it makes refusal text and condition polarity line up by construction.
- **The IR as the product.** Pure-JSON IR, spans throughout, format stamp, a separate hand-ruled language version, and the pure-IR loader profile that refuses hatch-bearing stories before touching author code — this is a clean, auditable trust boundary.
- **Determinism as a contract.** Seeded RNG with its cursor in world state, occurrence counters in world state, `each` iteration pinned to declaration order — save/restore/undo need no bespoke plumbing, which is rare and valuable.

**Design concerns.**

1. **The prose/statement boundary is heuristic.** `isStatementLine` distinguishes inline phrase prose from statements by lowercase keyword openers, deliberately case-sensitive. It works for English-style prose, but a body paragraph legitimately opening with a lowercase `set`, `clear`, `move`, or `at` will be misread as a statement and error confusingly. This is an accepted tradeoff, but the diagnostic when it bites ("Unknown statement…") won't tell the author the real problem; a hint ("if this was prose, capitalize the first word or quote it") would soften the sharpest edge of the design.
2. **Two execution passes are a leaky abstraction.** The mutations/reports split with snapshot-pinned routing is clever, but findings H1, H4, M2, and M3 are all consequences of the snapshot covering some routing constructs and not others. The model would be more robust if *every* routing decision (select-on value, strategy index, each match set, stmtWhen truth, ordinal occurrence) were resolved exactly once, pre-mutation, into one decision record — making "the report phase sees the same routing the execute phase did" a structural invariant rather than a per-construct discipline.
3. **`select-strategy` identity.** More broadly than M1: the language has a clear identity convention for phrase counters — `(owner, key)` — but select blocks fall back to a positional key. Giving select blocks a compiler-assigned stable id in the IR would fix M1 and make the save-file semantics explicit.
4. **Grammar size vs. parser architecture.** The line-based recursive descent works, but the grammar has grown far past "Phase A subset": the single `Parser` class handles ~40 constructs with substantial per-construct lookahead. The vocabulary-free principle (parser collects words, analyzer resolves) is consistently honored and is the right call; still, the dispatch logic in `parseCreate` (a 10-way `else if` chain keyed on first words and token shapes) is where future grammar additions will be most error-prone. A table-driven line-dispatcher (first word → handler, with shape guards) would reduce the risk of ordering bugs among the branches.
5. **`1.x → 2.0.0 → 2.1.0` version history.** The hand-maintained version file with recorded owner overrides is honest and traceable — a model for language governance — though the double-use of "2.0.0/2.1.0" (once as interim landing numbers, once as the consolidated public numbers) will confuse future readers; a table mapping landing history to public versions would help.

---

## 4. Architecture

The package split is exactly right and rigorously held: `@sharpee/chord` is platform-free (names only — kind nouns, adjectives, aliases, the generated stdlib manifest) and browser-safe; `@sharpee/story-loader` owns every dotted platform id, trait mapping, and registry (`event-id-map`, `chain-map`, `message-alias-map`, `extension-registry`, `setting-schema`). Each seam is pinned by a conformance test on both sides, and the ADR-276 "compile gate + loader backstop" two-layer pattern is applied uniformly — the loader's defensive throws all cite the compile diagnostic that should have fired first. The generated `stdlib-manifest.ts` (platform-free but not platform-ignorant) is a particularly good resolution of the tension between early diagnostics and clean layering.

Suggested structural improvements, in rough priority order:

1. **Split the monoliths.** `parser.ts`, `analyzer.ts`, `runtime.ts`, and `loader.ts` are each 1,500–3,000 lines. Natural fracture lines already exist in the comments: parser → header/create/define/statements/conditions modules; analyzer → collect (pass 1), resolve (pass 2), and the whole-IR post-pass gates (`checkRegions`/`checkDoors`/`checkCompositionLegality`/…); runtime → interceptor building, dispatch actions, scheduler daemons, phrase emission.
2. **Centralize the decision snapshot** (see design concern 2) into one module both the interceptor and capability paths consume — this fixes H1/M3 once instead of per call site.
3. **Unify identity/key derivation.** `kebabId`, entity-id slugging (`words.join('-')`), sequence slugs (`replace(/\s+/g,'-')`), and select keys are four ad-hoc conventions; one `identity.ts` would prevent drift (e.g., a machine named with punctuation currently slugs differently from a rank).
4. **Duplicate-declaration gates as a table.** The analyzer implements the same "name → first-span, error-on-second" pattern seven times, each slightly differently, and misses two constructs (M4). One helper (`registerUnique(namespace, name, span, code)`) would make omissions impossible.
5. **The `Scope` object is doing a lot.** Seven fields plus two optional ones, with three factory constants and spread-based derivation. It works, but scope construction is where subtle binding bugs live (H2 is one); a small builder with explicit named variants (`storyScope()`, `traitScope(def)`, `actionScope(def)`, `entityScope(sym)`) would document which bindings each context legally has.

---

## 5. Code quality

Very high overall. TypeScript usage is strict and idiomatic — discriminated unions for AST/IR/statements, `Extract<>` narrowing, exhaustive switches with `never` checks where drift matters (`applyScopePredicate`), structural typing at engine seams to keep the dependency surface honest. Comments are the best I've seen in a compiler this size: they explain *why*, cite the ruling and date, and record known limitations in place (the `each`-inside-snapshot caveat, the hatch-lint imprecisions). Diagnostics are consistently actionable.

A few recurring nits beyond the findings above: non-null assertions after implicit invariants (`this.readLabelKey(c)!` in `parsePhraseOverride`, `line.tokens[colonIndex + 1].span`) would be safer as checked reads; `parseConfigSettings` and `parseEmitFields` share near-identical "last-token-is-the-value" heuristics that could be one helper; the `as never` casts on `span: unknown` in the pending-entity-ref plumbing trade type safety for convenience where a typed `Span | undefined` would do; and `Evaluator.isWithin` can loop forever on a (rogue) containment cycle in world data — a visited-set guard is cheap insurance in a method that runs on every `has` predicate.

---

## 6. Recommended next steps

In priority order: fix H1 (snapshot select-strategy decisions) and M2 (one-line phase-order fix) together, since they share a test surface; decide the intended semantics for H2 (open-condition state vocabulary) and either widen the gate or improve the diagnostic; seed player state/counters (H3); add the analyzer gate for dead nested refusals (H4) and the missing duplicate gates (M4); then the placement/exit host gates (M5, M6). All are small, well-localized changes — a testament to how well-factored the gate architecture already is. A regression suite addition worth making alongside: a golden test that runs every statement construct through an interceptor body (the two-pass path) and asserts mutations-pass and reports-pass routing agree — that single harness would have caught H1, M2, and M3.