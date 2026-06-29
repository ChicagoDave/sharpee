# Plan: ADR-196 — Optional / Choice Atoms & the Text-State Store

**Created:** 2026-06-29 (session b09711)
**ADR:** `docs/architecture/adrs/adr-196-phrase-algebra-optional-choice-text-state.md` (ACCEPTED 2026-06-29)
**Driver:** `docs/work/dynamic-text/dynamic-text-scenarios.md` S9–S14; `…/phrase-algebra-design.md` §3, §8
**Branch:** `v2_adr196_optional_choice` (cut from `main` after ADR-195 slot merged; merges back to `main`)
**Scope:** realize the two reserved **modifier** kinds (`Optional`, `Choice`) and make the
declared-inert `textState` store live + persistent. A `shuffle` selector and a trait-keyed
conditional registry are OUT — named-and-deferred.

## Progress (session b09711, 2026-06-29)

- **Phase 1** ✅ committed `39a09c59` — if-domain `Optional`/`Choice` fields (if-domain 79/79).
- **Phase 2** ✅ committed `6b930500` — `TEXT_STATE` capability + `WorldTextStateStore` (engine 457/7-skip; REAL-PATH save/restore).
- **Phase 3** ✅ committed `9c5838d2` — Assembler `Optional`/`Choice` + `mulberry32`; `renderList` Empty-absorption (lang-en-us 337/337).
- **Phase 4** ⏳ DESIGNED, not coded — resume notes in `docs/context/session-20260629-1430-v2_adr196_optional_choice.md`.
- **Phase 5** ⏳ pending.
- Branch cut from `main` after `v2_adr195_slot` fast-forwarded in (local, unpushed).

## Why this is additive (no destructive cutover)

`Optional`/`Choice` already exist as field-less stubs (`phrase.ts:212–219`); the Assembler
throws `PhraseNotImplementedError` for both kinds and `EmptyTextStateStore` is a no-op. **No
existing template references a produced `Optional`/`Choice`** (no consumer), and the parser
needs **no new syntax** — a param bound to a pre-built phrase already passes through
`bindNounPhrase` (`parse-phrase-template.ts:93–102`). So every phase keeps the build + suites
green: Phases 1–3 add capability nothing yet exercises; Phases 4–5 are the first consumers.
No red-build cutover.

## References consulted

- ADR-196 (the 13 ACs; §1–§6 contracts; the storeless-`Optional` / persistent-`Choice` split;
  the stored-number encoding; the seeded-PRNG determinism rule; the de-fanged "no in-string
  control flow" guarantee).
- ADR-192 §2 (reserved `Optional`/`Choice` kinds), §3 (`textState` seam), §7 (purity contract),
  AC-6 (`Empty` absorption — parent of AC-2 here), AC-8 (legacy-syntax rejection — parent of AC-11).
- ADR-195 (the sibling pattern: a declared-inert seam made live; the lang/engine boundary split
  reused verbatim — lang owns grammar, engine owns the store).
- ADR-193 (`getStateAdjectives` producer-hook shape — the model for the deferred conditional registry).
- `packages/if-domain/src/phrase.ts` (the `Optional`/`Choice` stubs, `TextStateStore`,
  `isOptional`/`isChoice` guards already present at `:452–459`).
- `packages/engine/src/prose-pipeline/render-context.ts` (`EmptyTextStateStore` at `:93` to replace;
  the per-turn factory; the "nothing here mutates world state" header to amend).
- `packages/world-model/src/world/capabilities.ts` (`StandardCapabilities`, `ICapabilityData`);
  `…/world/WorldModel.ts:986–996` (`getSerializableState` already includes `capabilities`).
- `packages/lang-en-us/src/assembler/english-assembler.ts` (the `PhraseNotImplementedError` map +
  punctuation authority); `…/parser/parse-phrase-template.ts:93–102` (phrase pass-through).
- `packages/stdlib/src/actions/standard/looking/looking-data.ts:103,301` (hardcoded `firstVisit`);
  `packages/world-model/src/traits/room/roomTrait.ts` (`visited`, `initialDescription`).
- `stories/friendly-zoo` (the consumer; see [[friendly-zoo-testing-target]]).

## AC coverage map

| AC | Description | Phase |
|----|-------------|-------|
| 1 | `Optional` present → child in place | 3 |
| 2 | `Optional` absent → `Empty`, no dangling punctuation | 3 |
| 3 | `Choice` cycling (wraps) | 3 |
| 4 | `Choice` stopping (sticks on last) | 3 |
| 5 | `Choice` firstTime / once-only | 3 |
| 6 | `Choice` random determinism (seeded, no clock/random) | 3 |
| 7 | `Choice` sticky (persist chosen index) | 3 |
| 8 | persistence: trigger K → save → restore → resume at K | 2 (store) + 5 (transcript) |
| 9 | old-save default: absent capability → counter 0, no crash | 2 |
| 10 | boundary: no locale/selection logic in if-domain | 1 + 3 |
| 11 | no in-string control flow: `{?…}`/`{#…}` → `PhraseParseError` | 3 |
| 12 | room first-visit bugfix | 4 |
| 13 | Friendly Zoo C1 (`Optional`) + C2 (`Choice` round-trip) transcripts | 5 |

---

## Phase 1 — if-domain contract (Optional + Choice fields)

**Tier:** Small · **Domain:** language-neutral type contracts only.

- **Entry:** `Optional`/`Choice` are bare stubs (`kind` only); `isOptional`/`isChoice` guards
  already present; `TextStateStore` declared.
- **Deliverable** (`packages/if-domain/src/phrase.ts`):
  - `Optional` gains `child: Phrase`, `present: boolean`.
  - `Choice` gains `alternatives: Phrase[]`, `selector: 'cycling' | 'stopping' | 'sticky' |
    'random' | 'firstTime'`, `entityId: EntityId`, `messageKey: string`.
  - Guards unchanged (discriminators still `kind === 'optional'` / `'choice'`). No locale strings.
  - Barrel exports updated if needed.
- **Test:** type-guard unit tests for the enriched kinds; compile check that downstream packages
  still build (purely additive). The no-locale grep guard (AC-10) already exists.
- **Exit:** if-domain exports the enriched contract; all downstream compiles. **Build green.**

## Phase 2 — world-model + engine: the persistent text-state store

**Tier:** Medium · **Domain:** world-model capability + engine prose-pipeline runtime.
**⚠ Platform change — gated on ADR acceptance + user OK.**

- **Entry:** Phase 1 merged; `EmptyTextStateStore` is a no-op; no `TEXT_STATE` capability exists.
- **Deliverable:**
  - **world-model** (`…/world/capabilities.ts`): add `TEXT_STATE: 'textState'` to
    `StandardCapabilities`; register it (schema: an object map, `initialData: {}`). Data shape
    `{ [entityId: string]: { [messageKey: string]: number } }`.
  - **engine** (`…/prose-pipeline/render-context.ts`): replace `EmptyTextStateStore` with
    `WorldTextStateStore` — `get(entityId, messageKey)` reads the capability map; `set(...)` writes
    it. Bind it in `createRenderContextFactory` in place of the no-op. Amend the module header:
    `textState` is the **one sanctioned realize-time write** (ADR-196 §4); everything else stays
    read-only.
  - **Persistence falls out free:** `WorldModel.getSerializableState()` already serializes
    `capabilities` (`:994`); no new save path. Absent capability ⇒ empty map ⇒ counter 0.
- **Behavior Statement** — `WorldTextStateStore.set`: DOES persist a per-`(entityId, messageKey)`
  counter into the `textState` capability map; WHEN the Assembler advances a `Choice` at realize
  time; BECAUSE variation position must survive turns and save/restore (S13); REJECTS WHEN never
  (it is a plain upsert). `get`: pure read, `undefined` when unset.
- **Test** (`engine/tests/prose-pipeline/text-state.test.ts` + a world-model capability test):
  set→get round-trip; **save→restore round-trip** (serialize world with counters, `loadJSON`,
  assert counters survived — AC-8 store half); absent capability → `get` returns `undefined`,
  no crash (AC-9); two entities / two keys isolated.
- **Exit:** the store is live and persists; nothing realizes `Choice` yet (Assembler still
  throws, but no template uses it). **Build + suites green.**

## Phase 3 — lang-en-us Assembler: Optional + Choice realization + seed helper

**Tier:** Medium · **Domain:** English realization.
**⚠ Platform change — gated.**

- **Entry:** Phases 1–2 merged; the store serves/persists counters; the Assembler throws for
  `optional`/`choice`.
- **Deliverable** (`packages/lang-en-us/src/assembler/`):
  - **`Optional` case:** `present ? realize(child) : Empty`. Stateless. `Empty` is absorbed by the
    enclosing combinator (AC-2, ADR-192 AC-6 parity).
  - **`Choice` case:** `n = ctx.textState.get(entityId, messageKey) ?? 0`; select an alternative
    per the §2 selector table; realize it (absorbing `Empty`); advance/encode the counter via
    `ctx.textState.set(...)`. Stored-number encoding: trigger-count for
    cycling/stopping/firstTime/random; **chosen index + 1** sentinel for sticky.
  - **`mulberry32` seed helper** (Assembler-internal): seed from a stable hash of
    `entityId + '\0' + messageKey + '\0' + n`. Drives `random` (and `sticky`'s first pick). **No
    `Math.random`, no `Date.now`.**
  - Remove `optional`/`choice` from the `PhraseNotImplementedError` map. Assembler stays the sole
    punctuation/selection authority; no locale logic leaves it (AC-10).
  - **No parser route added.** Confirm (test) that `{?A|B}` / `{#cycle|…}` are rejected at parse
    time as unbound-param `PhraseParseError` (AC-11) via existing ADR-192 AC-11 machinery — assert,
    don't add code.
- **Behavior Statement** — `Choice` realize: DOES select an alternative deterministically from the
  persisted counter and advance it; WHEN a `Choice` node is realized in `processTurn`; BECAUSE
  repeated triggers must vary and resume after restore (S12–S14); REJECTS WHEN never (always emits
  one alternative or `Empty`).
- **Test** (`…/tests/assembler/optional.test.ts`, `…/choice.test.ts`):
  - AC-1/2: `Optional` present renders child; absent → no dangling comma/space inside a `Sequence`.
  - AC-3 cycling wraps `[0,1,…,N-1,0]`; AC-4 stopping sticks on last; AC-5 firstTime flips, and
    `alt[1]=Empty` ⇒ once-only; AC-6 random fixed-seed → identical pick across runs; AC-7 sticky
    replays the same alternative.
  - AC-11: `{?…}`/`{#…}` template → `PhraseParseError`.
  - Determinism: repeated `realize` against a fixed counter snapshot → byte-identical.
- **Exit:** both kinds realize end-to-end at the unit level; ACs 1–7, 10, 11 covered. Full
  lang-en-us suite green. **Build green.**

## Phase 4 — room first-visit bugfix (S14)

**Tier:** Small · **Domain:** stdlib looking action + world-model `RoomTrait`.
**⚠ Platform change — gated. Independent of the atoms (world-read, not `textState`).**

- **Entry:** Phases 1–3 merged. `looking-data.ts:103,301` hardcode `firstVisit = true`;
  `RoomTrait.visited` persists but never drives description selection; `initialDescription` is
  stored but never rendered.
- **Deliverable:**
  - **stdlib** (`…/looking/looking-data.ts`): derive `firstVisit` from the room's
    `RoomTrait.visited` (the room not yet marked visited at look time) instead of the hardcoded
    `true`; delete the two TODOs. Select `initialDescription`/`initialDescriptionId` on first
    visit, standard description on re-entry. (This is an `Optional`-shaped **world read** — it
    does **not** touch `textState`, keeping the two mechanisms unconflated per ADR §6.)
  - **world-model** (`roomTrait.ts`): confirm/ensure `visited` is set by the look/enter path so
    re-entry sees `visited: true`. No schema change (`visited` already serializes).
- **Behavior Statement** — looking first-visit: DOES choose the initial vs. standard room
  description by `RoomTrait.visited`; WHEN the player looks/enters a room; BECAUSE initial-vs-revisit
  text is a real authoring need (S14) and was half-wired; REJECTS WHEN no room (handled upstream).
- **Test:** a Friendly Zoo (or stdlib looking) transcript: enter a room with `initialDescription`
  → see it; re-enter → see standard description (AC-12). Unit test on `looking-data` selection if
  feasible.
- **Exit:** the `looking-data.ts` TODO is closed; `initialDescription` renders. **Build + suites
  green.** (Could ship independently of Phase 5 if you want the bugfix early.)

## Phase 5 — Friendly Zoo consumers (C1 Optional + C2 Choice) + transcripts (AC-8/13)

**Tier:** Medium · **Domain:** story-level (autonomous per CLAUDE.md).

- **Entry:** Phases 1–3 merged (4 optional-but-recommended); platform realizes both kinds and
  persists `Choice` state; `stories/friendly-zoo` baseline green.
- **Deliverable** (`stories/friendly-zoo/src`):
  - **C1 — `Optional` (S9–S10):** a producer reads a world-state predicate (e.g. an enclosure
    gate open/closed) and stages an `Optional { child, present }` bound to a description param;
    template references it by name. Proves appear/disappear with clean punctuation at 0 and 1.
  - **C2 — `Choice` persistent (S12–S14):** a producer stages a `Choice` for a repeatable line —
    a `cycling` flavor line and a `firstTime` aside — keyed `(entityId, messageKey)`. Bound by
    name; no template syntax.
  - **Transcripts:**
    - `walkthroughs/wt-04-optional.transcript` — C1 0/1 cases.
    - `walkthroughs/wt-05-choice-cycle.transcript` — C2 cycling sequence + **save → restore →
      re-trigger**, asserting the counter resumed (AC-8 end-to-end). Use the existing
      save/restore transcript verbs.
- **Test:** `node dist/cli/sharpee.js --test stories/friendly-zoo/walkthroughs/wt-04-*.transcript`
  and `wt-05-*` green (AC-13, AC-8). Rebuild lang-en-us + bundle first (`./repokit build` then the
  bundle; `--skip` to resume).
- **Exit:** C1 + C2 render correctly through the live pipeline; `Choice` state round-trips across
  save/restore as a transcript. Merge `v2_adr196_optional_choice` → `main`. Update
  `docs/context/plan.md` roadmap (Optional/Choice done; remaining atoms: Pronoun 197, Numeral 198,
  Verb 199, Verbatim 200).

---

## Out of scope (named, deferred)

- **Trait-keyed conditional-contributor registry** — the ergonomic layer (parallels ADR-195 §3 /
  ADR-193) that removes per-conditional boilerplate from story producers. Producers stage
  `Optional`/`Choice` directly for the first cut.
- **A `shuffle` selector distinct from seeded `random`** — folded into `random` over a seeded
  order (a permutation is derivable from the seed; one `number` suffices). ADR §Options.
- **Per-node within-turn de-dupe of a shared `messageKey`** — documented limitation (ADR §3);
  authors use distinct keys per choice site.
- **Any in-string conditional/variation grammar** (`{?…}`, `{#…}`) — explicitly never (ADR §5).

## Risks / watch-items

- **Phases 2–4 are platform changes** — world-model capability, engine store, lang Assembler,
  stdlib looking. The ADR (once ACCEPTED) authorizes them; keep each minimal and resist scope
  creep toward the deferred registry. Per CLAUDE.md, confirm with the user before starting Phase 2.
- **Purity tension (ADR §4).** Advancing the counter at realize time contradicts
  `render-context.ts`'s "nothing here mutates world state." This is the *declared* `textState`
  exception (ADR-192 §7) — confine the write to the counter map, never entities/relationships, and
  amend the header. Do not let any other realize-time write creep in behind it.
- **Render-once invariant.** The counter advance assumes `processTurn` renders each turn exactly
  once. Before Phase 5, verify no path re-renders a turn (preview/double-render would
  double-advance). If one exists, it must use a read-only `textState` view (ADR open question 2).
- **Within-turn shared-key advance (ADR §3).** Two `Choice` nodes sharing `(entityId, messageKey)`
  in one turn advance twice. Give the Friendly Zoo consumers distinct keys; document in the story.
- **`Optional` redundancy (design taste).** `Optional` ≈ a producer returning `Empty`. If the user
  prefers to drop the kind, Phase 1 omits `Optional` fields and Phase 3/5 handle S9–S10 via bare
  producers — revisit at acceptance (ADR Options + review flag).
- **Old-save compatibility.** A pre-ADR save has no `textState` capability; `loadJSON` must yield
  an empty store, not a crash (AC-9). Test explicitly in Phase 2.
- **Bundle rebuild for transcripts.** Phase 5 transcripts run against the bundle — rebuild
  lang-en-us + bundle after Assembler changes, per CLAUDE.md transcript-testing rules.
