# Session Summary: 2026-06-29 (1430) — v2_adr196_optional_choice

## Goals

- Draft, review, and begin implementing **ADR-196 — Optional / Choice Atoms & the Text-State Store** (the next phrase-algebra atom after ADR-195 Slot).
- Land Phases 1–3 (if-domain contract → persistent store → Assembler realization) with green builds/tests at each step.

## Status: IN PROGRESS — Phases 1–5 COMPLETE; Phase 4 committed (`24b9a884`); Phase 5 coded + green (uncommitted)

### Phase 5 — Friendly Zoo consumers C1 (Optional) + C2 (Choice) — DONE (uncommitted)

Story-level (autonomous). Both consumers fire off `if.event.examined` and emit a custom-typed event carrying a phrase-valued param; the prose pipeline realizes it through the textState-backed Assembler (ADR-097 domain-message path).

- **C1 — Optional (S9–S10):** examining the **staff gate** emits `zoo.event.gate_status` → template `"The staff gate is set into the fence{openClause}."` where `openClause` is an `Optional` whose `present` is read from `OpenableBehavior.isOpen(gate)` at emit time. Closed → clause absorbed, clean period (AC-2); open → ", standing wide open" inline (AC-1).
- **C2 — Choice (S12–S14):** examining the **parrot** emits `zoo.event.parrot_flavor` → template `"{parrotCycle}{parrotAside}"`: `parrotCycle` a `cycling` Choice (3 variants), `parrotAside` a `firstTime` Choice (alt[1]=Empty), both keyed `(parrotId, 'parrot-cycle'|'parrot-aside')`. Distinct keys avoid within-turn collision.
- Files: new `src/dynamic-text.ts` (phrase constructors + `registerDynamicText` with **two independent chains**, gate + parrot); `zoo-map.ts` returns `gateId`; `index.ts` captures `gateId` + calls registrar; `language.ts` adds `DynamicTextMessages` + two templates.
- Transcripts: `walkthroughs/wt-04-optional.transcript` (gate 0/1), `wt-05-choice-cycle.transcript` (cycle + **save → restore → resume at variant 2**, AC-8 e2e). Both green; smoke + entrance-initial still green (20/20 across 4 transcripts).
- Verified via `--verbose`: examine shows the base description AND the flavor line as separate lines; exactly one reaction per examine; cycle resumes at "theatrical disdain" after restore (a non-persisted counter would reset to variant 0).

#### Finding A — platform bug, FIXED properly (The Sharpee Way, not worked around)

`WorldEventSystem.wireChainToProcessor` (`packages/world-model/src/world/WorldEventSystem.ts`) was **not idempotent**: `chainEvent` called it once per registration, and each call registered a *new* processor dispatcher that runs `executeChains` over **all** chains for that trigger type. So registering **two chains on the same trigger type after `connectEventProcessor`** made every chain for that type fire **twice** (flagged via `if.event.error` "Multiple game.message reactions"; silently doubled a Choice counter otherwise). No existing story hit it (their chains are on distinct types); it surfaced when wt-04+wt-05 ran in one invocation.

**Fix (platform, user-directed):** added a `wiredChainTriggers: Set<string>` — `wireChainToProcessor` registers at most one dispatcher per trigger type (the dispatcher already fans out to all chains); reset on (re)connect. Regression test `event-chaining.test.ts` "wires ONE dispatcher per trigger type … (idempotent)". world-model **1297 pass**, event-processor 18, engine 457 — all green. The story now registers **two natural, independent chains** (gate + parrot), the way the architecture intends — the earlier single-dispatcher merge was the workaround and is gone.

#### Finding B (design note)

Returning `type: 'game.message'` from a chain triggers ADR-106 **message-override** semantics (the reaction replaces the triggering event's messageId) and conflicts when there are 2+. Use a **custom event type** (`zoo.event.*`) + `{messageId, params}` to render as a separate line via the ADR-097 domain-message path — that's the idiomatic story pattern and preserves the examine description.

### Phase 4 — room first-visit bugfix (S14) — DONE (uncommitted)

- `looking.ts` execute: captures `context.sharedData.isFirstVisit = !RoomBehavior.hasBeenVisited(room)` BEFORE marking visited; marks via `RoomBehavior.markVisited` only on first visit (mirrors `going`). Removed now-unused `RoomTrait` import.
- `looking-data.ts` `buildRoomDescriptionData`: `firstVisit` now reads `sharedData.isFirstVisit`; on first visit prefers `roomTrait.initialDescription`/`initialDescriptionId` over identity/location description for `roomDescription`/`roomDescriptionId`.
- `looking-data.ts` `determineLookingMessage`: same `firstVisit`-from-sharedData; `params.description` swaps to initial description on first visit; removed duplicate `const firstVisit = true`.
- **Test (AC-12):** 3 new tests in `looking-golden.test.ts` (first visit → initial desc + room marked visited; re-visit → standard; no-initial → standard fallback). REAL-PATH (real WorldModel + real action, no stubs).
- stdlib **1285 pass / 27 skip**; typecheck clean.
- **No regression risk:** `useInitial` is gated on a room having an `initialDescription`; `verbose`/`messageId` unchanged (verbose mode still hardcoded true).

#### Finding: snapshot shadows the top-level description field

The first cut only set the top-level `roomDescription`/`roomDescriptionId`, but the engine room handler (`room.ts:96,104-105`) resolves from the **snapshot** first (`data.room.descriptionId` / `data.room.description`), falling back to the top-level fields only if the snapshot is empty. Since `captureRoomSnapshot` always fills `description` from identity, the top-level field was shadowed and the initial description never reached the player — caught only by the friendly-zoo e2e, not the original unit test (which asserted the event payload, not the rendered field). **Fix:** on first visit, `buildRoomDescriptionData` now also overrides `roomSnapshot.description`/`descriptionId`. Unit tests strengthened to assert on `event.data.room.description` (the field the handler actually renders).

### Phase 5 (started) — Friendly Zoo consumer: entrance initialDescription

- `stories/friendly-zoo/src/zoo-map.ts`: entrance room gets a first-visit `initialDescription` (set on the trait post-`.build()` — the `RoomBuilder` helper has no `initialDescription()` method; adding one is a deferred platform change).
- New demo transcript `stories/friendly-zoo/tests/transcripts/entrance-initial-description.transcript`: first `look` → initial flavor; second `look` → standard, initial absent. **Passes** through the rebuilt bundle; friendly-zoo smoke still 6/6.
- Verified via `--play`: first look shows "Your family piles out of the car…"; second look shows standard only.

### Note: dungeo walkthroughs pre-existing broken (NOT this change)

`--chain stories/dungeo/walkthroughs/wt-*.transcript` fails heavily on **both** the baseline (changes stashed: 653 fail) and with my changes (103 fail) — combat/chain-state failures ("attack troll" after troll dead → "can't see any such thing"). dungeo has no `initialDescription`, so Phase 4 cannot affect it. Pre-existing; flagged for separate investigation.

## What happened

### ADR + plan (accepted)

- Discovered **ADR-196 did not exist** — it was only forward-referenced by ADR-192/195. Drafted it from the contracts those ADRs pin on it (the `Optional`/`Choice` modifier kinds + the `textState` seam).
- `/adr-review` → **15/15 READY**; `/devarch:plan-review` → **TENSIONS ONLY** (one advisory: the realize-time counter write, pre-authorized by ADR-192 §7).
- ADR accepted (`docs/architecture/adrs/adr-196-phrase-algebra-optional-choice-text-state.md`, Status: ACCEPTED).
- Plan written: `docs/work/dynamic-text/adr-196-optional-choice-plan.md` (5 phases).

### Branch setup

- Merged `v2_adr195_slot` → `main` (fast-forward; **local only, NOT pushed**), then cut `v2_adr196_optional_choice` from the updated `main`.

### Phase 1 — if-domain contract (commit `39a09c59`)

- `packages/if-domain/src/phrase.ts`: filled the field-less `Optional` (`child`, `present`) and `Choice` (`alternatives`, `selector`, `entityId`, `messageKey`) stubs.
- Tests + contract block; if-domain **79/79**; typecheck clean.

### Phase 2 — persistent text-state store (commit `6b930500`)

- `world-model/capabilities.ts`: `StandardCapabilities.TEXT_STATE = 'textState'`.
- `engine/game-engine.ts`: registers `TEXT_STATE` at setup (mirrors `COMMAND_HISTORY`).
- `engine/render-context.ts`: `WorldTextStateStore` replaces the no-op `EmptyTextStateStore`; reads/writes the capability, self-registers defensively, degrades to empty-store on a capability-less world. `WorldModelLike` gained **optional** capability accessors. Factory gained optional 4th `textState` param; `pipeline.ts` wires it.
- REAL-PATH test against a real `WorldModel` (set/get, isolation, **toJSON→loadJSON round-trip** AC-8, absent-capability default AC-9). Engine **457 pass / 7 skip**; typecheck clean.

### Phase 3 — Assembler Optional/Choice realization (commit `9c5838d2`)

- `lang-en-us/english-assembler.ts`: `Optional` case (`present ? child : Empty`); `Choice` case via `selectChoice` (5 selectors, stored-number encoding, advances `ctx.textState`). Determinism via seeded `mulberry32` (FNV-1a seed) — no `Math.random`/`Date.now`.
- **`renderList`**: extended Empty-absorption to drop items realizing to `""` (Optional-absent / Choice→Empty) — fixes a latent dangling-comma gap in shared ADR-190 list code.
- `errors.ts`: stub map emptied; `PhraseNotImplementedError` is now a defensive guard (throw casts past the proven-exhaustive `never`).
- No parser route (ADR §5): asserted `{?…}`/`{#…}` and `{optional:…}`/`{choice:…}` reject at parse time; code-built phrases pass through.
- lang-en-us **337/337**; typecheck clean.

## Key build note (cross-package .d.ts)

Workspace packages resolve each other from compiled `.d.ts`, not source. After editing if-domain / world-model **source**, you must `pnpm --filter <pkg> build` so dependents typecheck against the new declarations. This bit twice this session (world-model in Phase 2, if-domain in Phase 3). `dist`/`dist-esm` are gitignored — they don't pollute commits.

## Next: Phase 4 — room first-visit bugfix (S14), DESIGNED, ready to code

**Root cause:** `looking-data.ts:103` and `:301` hardcode `const firstVisit = true`. And `looking.ts` execute sets `roomTrait.visited = true` **before** `report` builds data, so reading `visited` in report always sees `true`.

**Fix (mirror `going`, which already does this correctly — `going.ts:350–353`, `going-data.ts:84`):**

1. `looking.ts` execute: `const isFirstVisit = !RoomBehavior.hasBeenVisited(room)`; `context.sharedData.isFirstVisit = isFirstVisit`; then mark visited only if first. Import `RoomBehavior` from `@sharpee/world-model`.
2. `looking-data.ts`: replace both `const firstVisit = true` (lines 103, 301) with `const firstVisit = context.sharedData?.isFirstVisit === true`.
3. **initialDescription rendering:** in `buildRoomDescriptionData` (return object at lines 109–129), on first visit prefer `roomTrait.initialDescriptionId` / `roomTrait.initialDescription` over `identity?.descriptionId` / `location.description` for the `roomDescriptionId` / `roomDescription` fields. The engine room handler (`engine/prose-pipeline/handlers/room.ts:96–105`) reads `data.roomDescriptionId ?? data.room?.descriptionId`, then `data.room?.description ?? data.roomDescription`. RoomTrait fields live at `roomTrait.ts:53,57`.
   - Also check `determineLookingMessage` line 267 (`params.description = location.description`) — decide if it needs the same initial-vs-standard swap.
4. **Test (AC-12):** stdlib looking transcript/unit test — enter a room with `initialDescription` → see it; re-enter → standard description.

**Watch:** stdlib + world-model are platform — gated, user-authorized for ADR-196. `visited` is already set (`looking.ts:57`, `going.ts:367` via `RoomBehavior.markVisited`); no roomTrait schema change needed.

## Then: Phase 5 — Friendly Zoo consumers (C1 Optional + C2 Choice) + transcripts (AC-8 e2e / AC-13)

Story-level (autonomous). C2 must include a save→restore→re-trigger transcript proving the counter resumes. Rebuild lang-en-us + bundle before transcript tests.

## Git state at pause

- On `v2_adr196_optional_choice`, working tree **clean**. Phases 1–3 committed.
- `main` is ahead of `origin/main` (the slot fast-forward) — **unpushed**. Nothing on this branch is pushed.

## Post-merge follow-ups (after ADR-196 pushed to `origin/main` @ `1fd7453e`)

### ADR-197 (Pronoun) and the rest of the atom roadmap — ALREADY DONE

Checked before starting "197": the entire ADR-192 phrase-algebra atom roadmap is already implemented and on `main`. ADR-197 Pronoun (`8e5ba02a`, merged `1db7404c` via `v2_adr197_pronoun`; parser `{pronoun:case}` rule, engine `TurnReferenceContext`, assembler `PRONOUNS` table + `note()` last-mentioned, tests 5/5), ADR-198 Numeral (`2b8ae771`), ADR-199 Verb/subject-agreement (`6ba3b37d`,`d829d14a`), ADR-200 Verbatim (`bc70dd10`). The ADR-196 plan's "remaining atoms" line was stale — nothing to build. The assembler header confirms all kinds are realized; `PhraseNotImplementedError` is now only a defensive guard.

### Fix: NUL byte in `english-assembler.ts`

`hashSeed`'s seed template literal (line 478) contained two **raw NUL bytes** (the `'\0'` ADR-196 mulberry32 separators written literally, not escaped), which tripped binary-file detection in grep/tools (rg flagged a `\0` at offset 21072). Replaced each raw NUL with the `\0` escape: `` `${entityId}\0${messageKey}\0${counter}` ``. Identical runtime seed (so seeded `random`/`sticky` Choice output is byte-identical) but pure-ASCII source. Verified: 0 NUL bytes remain, typecheck clean, lang-en-us **337/337** (incl. AC-6 random / AC-7 sticky).

### Documentation planning for declarative output (dynamic text)

- `docs/work/dynamic-text/prompts/` — Nano Banana Pro image-prompt storyboard, rebuilt
  around **dynamic wins** with verified syntax after a critique pass (the first cut used
  invalid inline `{optional:…}` and oversold static cases). Opener `00-catalog-migration.md`
  frames the real scope: the **53-file lang-en-us catalog** was migrated from the colon-chain
  formatter (`{the:cap:item}`, `{is:item}`) to phrase grammar (`{capitalize the item}`,
  `{verb:is item}`), legacy formatter chain deleted (ADR-192 W7–W9).
- `docs/work/dynamic-text/author-guide-outline.md` — Layer-2 author guide outline
  (custom dynamic messages), each section led by the failure it prevents, all examples
  dynamic; boundary drawn against code-bound Optional/Choice (Layer 3).
- **Delimiter discussion** (`:` / `{}` / `[]` / `()` / `{{}}`): explored, **no change** —
  current grammar kept as-is.

#### Findings (verified against source, while resolving guide open items)

- **Pronoun capitalization gap.** `{capitalize …}` is a NounPhrase-only hint;
  `{capitalize pronoun:subject}` throws; no auto sentence-start capitalization. The
  `{pronoun:case}` atom therefore cannot be capitalized — ADR-197's "compose `{capitalize}`
  over the pronoun" prose is aspirational. **Platform follow-up:** add a pronoun capitalize
  path or auto-cap sentence starts.
- **Perspective is a pre-pass.** `renderMessage` runs `resolvePerspectivePlaceholders`
  (ADR-089: `{You}`/`{take}`) on the raw string *before* `parsePhraseTemplate`. Two verb
  mechanisms coexist: perspective `{take}` (agrees with player) vs atom `{verb:…}` (agrees
  with subject param).

## Session Metadata

- **Status**: COMPLETE — ADR-196 Phases 1–5 merged + pushed; atom roadmap confirmed complete;
  NUL-byte hygiene fix; dynamic-text documentation planning (prompts + author-guide outline).
- **Blocker**: none
- **Open items**: (1) dungeo walkthroughs pre-existing broken (combat/chain-state; baseline
  653 fail) — unrelated. (2) Pronoun-capitalization platform gap (above) — decide a fix.
- **Rollback Safety**: safe — all changes additive / behavior-preserving; no schema migration (absent `textState` capability ⇒ counter 0)
