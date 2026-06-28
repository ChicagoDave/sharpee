# Plan: ADR-195 — Slot Atom & the Contribution Channel

**Created:** 2026-06-28 (session 753ede)
**ADR:** `docs/architecture/adrs/adr-195-phrase-algebra-slot-atom.md` (ACCEPTED)
**Driver:** `docs/work/dynamic-text/adr-195-slot-zoo-targets.md` (Friendly Zoo S1–S4)
**Branch:** `v2_adr195_slot` (cut from `main`, merges back to `main`)
**Scope:** realize the reserved `Slot` kind + the realize-time contribution channel. The
turn-time channel (S4, ADR-163) is OUT — named-and-deferred.

## Why this is additive (no destructive cutover)

The `Slot` kind already exists as a stub; the Assembler currently **throws**
`PhraseNotImplementedError` for `kind: 'slot'` and the engine **drops** contributions. **No
existing template uses `{slot:…}`** (no consumer). So every phase keeps the build + suites
green: Phases 1–3 add capability that nothing yet exercises; Phase 4 is the first consumer. No
red-build cutover (unlike ADR-192 Phase 3b+4).

## References consulted

- ADR-195 (the 9 ACs, §1–§5 contracts, the peek-not-drain decision, producer-staged S2).
- ADR-192 §2/§4/§6 (reserved kind, Assembler authorities, render pipeline); AC-6 (`Empty`
  absorption) is the parent of AC-3/AC-4 here.
- ADR-194 (entity→`NounPhrase` bridge, reused when a contribution is an entity).
- ADR-193 (`getStateAdjectives` contributor-hook shape — the model for the deferred clause registry).
- `engine/src/prose-pipeline/render-context.ts` (per-turn factory + the no-op seam to replace).
- `lang-en-us/src/assembler/english-assembler.ts` (the punctuation/`PhraseList` authority the
  `clause` join reuses); `…/parser/parse-phrase-template.ts` (the `slot:` route + hint parsing).
- `stories/friendly-zoo` (the consumer; see [[friendly-zoo-testing-target]]).

## AC coverage map

| AC | Description | Phase |
|----|-------------|-------|
| 1 | `sentence`-mode join, ordered | 3 |
| 2 | `clause`-mode join (serial comma + `conj`) | 3 |
| 3 | zero contributions → `Empty`, clean stem | 3 |
| 4 | `Empty` contribution absorbed | 3 |
| 5 | determinism `(order, insertion)`, stable across save/restore | 2 (+3) |
| 6 | turn-scoped visibility across messages | 2 |
| 7 | no locale in if-domain; unfilled `{slot:key}` not a parse error | 1 + 3 |
| 8 | Friendly Zoo S1 + S2 render as transcripts | 4 |
| 9 | orphan contribution dropped; keyless `{slot}` → parse error | 2 + 3 |

---

## Phase 1 — if-domain contract (Slot fields + `RenderContext` read seam)

**Tier:** Small · **Domain:** language-neutral type contracts only.

- **Entry:** `Slot` is a bare stub (`{ kind: 'slot' }`); `RenderContext` declares `contribute`
  (write) but no read accessor; `SlotContributionOptions.order` exists.
- **Deliverable** (`packages/if-domain/src/phrase.ts`):
  - `Slot` gains `slotKey: string`, `mode?: 'sentence' | 'clause'`, `conj?: 'and' | 'or'`.
  - `RenderContext` gains `slotContributions?(slotKey: string): Phrase[]` — **optional** (peek;
    ordered by `(order, insertion)`), matching ADR-194's optional-seam precedent so no existing
    `RenderContext` builder or test stub needs editing.
  - `isSlot` guard unchanged (discriminator still `kind === 'slot'`).
  - Barrel exports updated if needed. No locale strings.
- **Test:** type-guard unit test for the enriched `Slot`; a compile check that the new
  `RenderContext` method is structurally present. AC-7 (no-locale) grep guard already exists.
- **Exit:** if-domain exports the enriched contract; all downstream packages still compile
  (purely additive — the accessor is optional, so no stub edits forced). **Build green.**

## Phase 2 — engine contribution store (turn-scoped)

**Tier:** Medium · **Domain:** engine prose-pipeline runtime.

- **Entry:** Phase 1 merged; `render-context.ts` `contribute` is a no-op; world-less stubs
  return `[]` for `slotContributions`.
- **Deliverable** (`packages/engine/src/prose-pipeline/render-context.ts` + `pipeline.ts`):
  - Per-turn store in `createRenderContextFactory`: `SlotContribution { phrase, order, seq }`;
    `contribute` pushes `{ phrase, order: opts?.order ?? 0, seq: next++ }`; `slotContributions`
    returns the key's contributions sorted `(order asc, seq asc)` — **peek, non-destructive**.
  - Store is turn-scoped (one per factory call); `createRenderContextFactory` is already invoked
    per turn inside `processTurn` (`pipeline.ts:84–99`, verified), so the store clears between
    turns by construction; never serialized.
  - **Render-loop slot-contributor hook (the pinned realize-time staging seam, ADR-195 §3):**
    `ProsePipeline` accepts registered `SlotContributor = (ctx: RenderContext) => void` and runs
    each — once, in registration order — at the **top of `processTurn`**, after the per-turn
    factory is built and **before** the event→render loop, against `makeRenderContext({})` (whose
    `contribute` writes the shared turn store). Expose `GameEngine.registerSlotContributor(fn)` so
    stories register via the existing `onEngineReady` — **no new `Story` method**. This is the
    seam that makes S1/S2 contributions visible before the host message realizes, without any
    turn-time channel.
  - `createRenderWorld` / world-less paths: `slotContributions` simply absent (optional).
- **Behavior Statement** — `contribute`: DOES push a contribution into the turn store keyed by
  `slotKey`; WHEN a producer/handler calls it during tree-building this turn; BECAUSE the slot
  must collect from independent sources; REJECTS WHEN never (best-effort; orphans dropped at
  read). `slotContributions`: pure read, ordered, non-consuming.
- **Test** (`engine/tests/prose-pipeline/render-context.test.ts`): contribute→read ordered by
  `(order, insertion)` (AC-5); two reads of same key identical (peek); contributions staged for
  message A visible at A within the turn, gone next turn (AC-6); world-less → `[]`; orphan key
  read → `[]` (AC-9 read side).
- **Exit:** the channel is live and ordered; nothing realizes slots yet (Assembler still throws,
  but no template uses slot). **Build + suites green.**

## Phase 3 — parser + Assembler `Slot` realization (lang-en-us)

**Tier:** Medium · **Domain:** English realization + parse.

- **Entry:** Phases 1–2 merged; the channel stores + serves contributions; the Assembler still
  throws for `kind: 'slot'`.
- **Deliverable:**
  - **Parser** (`…/parser/parse-phrase-template.ts`): `{slot:key}` → `Slot { slotKey: 'key' }`;
    trailing hints `{slot:key clause}` → `mode: 'clause'`, `{slot:key clause or}` → `conj: 'or'`.
    A keyless `{slot}` → `PhraseParseError` (AC-9). An **unfilled** `{slot:key}` is valid (AC-7).
  - **Assembler** (`…/assembler/english-assembler.ts`): `Slot` case —
    `ctx.slotContributions?.(slotKey) ?? []` → realize each, **absorb `Empty`** (AC-4); zero
    survivors → `Empty` (AC-3); `mode: 'sentence'` join with a sentence break after the stem terminator (AC-1);
    `mode: 'clause'` join through the existing punctuation authority (serial comma + final `conj`,
    before the terminator) (AC-2). Remove the `slot` entry from the `PhraseNotImplementedError`
    map. Assembler stays the sole punctuation authority.
- **Test** (`…/tests/assembler/slot.test.ts` + parser test additions): AC-1 (sentence join,
  ordered), AC-2 (clause join, `and`/`or`), AC-3 (zero → clean stem, no dangling space/comma),
  AC-4 (`Empty` absorbed), AC-9 (keyless parse error; orphan render no-op). Determinism across
  repeated `realize` (AC-5).
- **Exit:** slots realize end-to-end at the unit level; all 9 ACs except AC-8 covered. Full
  lang-en-us suite green. **Build green.**

## Phase 4 — Friendly Zoo consumer (S1 + S2) + transcripts (AC-8)

**Tier:** Medium · **Domain:** story-level (autonomous per CLAUDE.md).

- **Entry:** Phases 1–3 merged; the platform realizes slots **and exposes the render-loop
  contributor hook** (`registerSlotContributor`, Phase 2); `stories/friendly-zoo` baseline green.
- **Deliverable** (`stories/friendly-zoo/src`):
  - **One story `SlotContributor`**, registered in `onEngineReady` via
    `engine.registerSlotContributor(stageZooSlots)`. `stageZooSlots(ctx)` reads the live world and:
    - **S1 occupants** — for the player's room, `ctx.contribute('here', nounPhraseFor(npc))` for
      each present NPC (Sam, parrot). The room-description template carries `{slot:here}`
      (`sentence` mode).
    - **S2 object detail** — for the in-scope describable object (radio / flashlight),
      `ctx.contribute('detail', clause)` for each `SwitchableTrait`/`LightSourceTrait`/low-battery
      state clause. Its description template carries `{slot:detail clause}` (`clause` mode).
  - This is the realize-time seam pinned in ADR-195 §3 — the contributor holds a `RenderContext`
    and runs before the host message realizes; no turn-time channel.
  - Transcripts `walkthroughs/wt-02-slot-occupants.transcript`, `…/wt-03-slot-detail.transcript`
    asserting the 0/1/N joined output from the zoo-targets doc.
  - **Watch (first-cut limitation, ADR-195 §3):** `'detail'` is a shared key — only stage it for a
    single described object per turn (examine targets one); revisit with `detail:<entityId>` keys
    if multi-object description in one turn becomes real.
- **Test:** `node dist/cli/sharpee.js --test --story stories/friendly-zoo …` green for both
  (AC-8). Rebuild lang-en-us + bundle first (`./repokit bundle`).
- **Exit:** S1 + S2 render correctly through the live pipeline. Merge `v2_adr195_slot` → `main`.
  Update `docs/context/plan.md` roadmap (Slot done; `Optional`/`Choice` ADR-196 next).

---

## Out of scope (named, deferred)

- **Turn-time channel (S4)** — daemons/behaviors contributing without a `RenderContext`; sits on
  ADR-163. The PA/ambient feature drives its shape later.
- **Clause-contributor registry** (§3) — the trait-keyed ergonomic layer mirroring ADR-193. S2
  ships **producer-staged** without it.
- Nested slots; slot-to-slot contribution.

## Risks / watch-items

- **Phase 2 is a platform change** — the render-loop `SlotContributor` hook adds engine surface
  (`ProsePipeline` registration, `processTurn` invocation, `GameEngine.registerSlotContributor`).
  The ACCEPTED ADR §3 authorizes it; still, keep it minimal (one hook, registration via existing
  `onEngineReady`) and resist letting it grow toward the deferred turn-time channel (S4). If S1
  staging starts to want mid-turn/daemon contribution, stop — that's the channel, out of scope.
- **`RenderContext.slotContributions` is optional** — no constructor edits forced (resolves the
  earlier compile-break risk). The Assembler reads `?.(key) ?? []`; an unwired context yields an
  empty slot, not a crash.
- **`clause`-mode placement before the terminator** must reuse the punctuation authority, not a
  second join — verify against the whitespace/terminator handling added in the ADR-192 cutover.
- **Ordering inside `processTurn`** — the contributor hook must run *before* the event→render loop
  so the store is populated when the room/object message realizes; verify the hook is invoked at
  the top of `processTurn`, not lazily per message.
- Friendly Zoo room-description currently has no `{slot:here}` seam — Phase 4 adds the template
  hole; keep the baseline `wt-01-smoke` assertions stable (they don't assert on the slot).
