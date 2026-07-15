# Session Plan: Implement ADR-218 (Chord Foundations)

**Created**: 2026-07-14
**Overall scope**: Land the three "foundations first" ADR-214 §8 workstreams ADR-218 designs — catalog adjectives (`enterable`/`climbable`), the liquid model (`drinkable`/`liquid`/container liquid contents), and door loading (`between` two-room placement) — each as a dated grammar-ratchet entry with a compiled fixture flipping its row in the parity audit. The fourth workstream, capability-dispatch fallback (§3), is sequenced last; its design blocker is now cleared — **ADR-221 (Capability-Dispatch Fallback Wiring) is ACCEPTED** (designed 2026-07-14) — so Phase 5 is gated only on David's separate platform go-ahead, not on ADR design.
**Bounded contexts touched**: Chord composable vocabulary (`packages/chord/src/catalog.ts`), story loading (`packages/story-loader/src/loader.ts`), world model (`packages/world-model` — one new marker trait, `LiquidTrait`), and the ADR-210 grammar ratchet (`docs/architecture/chord-grammar-changes.md`). No stdlib action-behavior changes.
**Key domain language**: composable vocabulary, trait adjective, grammar ratchet, capability-dispatch verb (ADR-218 Terminology); parity gap / reachable (ADR-214 Terminology).

## Entry gate (read before starting any phase)

This entire plan is **platform work** under CLAUDE.md's discussion gate (`packages/chord`, `packages/story-loader`, and — for Phase 2 — `packages/world-model`). ADR-218 itself *is* the design discussion; it does not substitute for the separate go-ahead CLAUDE.md requires before touching `packages/`. **Do not begin Phase 1 (or any later phase) until David gives explicit sign-off to implement.** The planner writes phases; it does not authorize starting them.

Standing constraints across every phase (CLAUDE.md):
- Never auto-retry a failed build or test — report and wait for explicit instruction.
- Never delete files without confirmation.
- Build via `./repokit build`; test fixtures via the bundle: `node dist/cli/sharpee.js --test <fixture>.story` (never the slow per-package path).
- Every vocabulary/syntax change is a dated entry in `docs/architecture/chord-grammar-changes.md` **before** the implementation that depends on it (ADR-210 ratchet discipline) — write the ratchet entry, then code against it, not the reverse.

## References consulted
- `docs/architecture/adrs/adr-218-chord-foundations.md` — the ACCEPTED design this plan implements: fixes the loader mappings for §1a/§1b/§2, and gates §3 behind ADR-221.
- `docs/architecture/adrs/adr-214-chord-platform-parity.md` — parent umbrella; §8 fixes the "foundations first" ordering (catalog adjectives → door loading → dispatch fallback → timer controls → ADR-215/216) and AC-1..AC-4 this plan's phases must satisfy.
- `docs/architecture/adrs/adr-221-capability-dispatch-fallback-wiring.md` — **now ACCEPTED** (designed 2026-07-14; all three OQs resolved: reuse the clause interpreter, `refuse`-based error path, general arg-binding). The Phase 5 design block is cleared; §3 still awaits David's separate platform go-ahead.
- `docs/architecture/adrs/adr-210-story-language.md` (and its ratchet log `docs/architecture/chord-grammar-changes.md`) — every composable-vocabulary/syntax change in this plan is a dated, owner-approved ratchet entry, precedent-formatted on the existing log.
- `docs/work/stdlib-reference/chord-availability-audit.md` — the parity scoreboard; each phase below names the exact audit row(s) it must flip to reachable (AC-1).
- `docs/context/session-20260714-1746-main.md` — most recent prior session's "Next" section names this exact sequence ("ratchet entries for enterable/climbable/drinkable → door loading → dispatch fallback → timer controls...All platform work gated on sign-off") as the agreed next step; this plan enacts it.
- `docs/context/project-profile.md` — confirms `packages/chord`, `packages/story-loader`, and `packages/world-model` as the touched areas and TypeScript/pnpm-workspace conventions this plan's code changes follow.

## Phases

### Phase 1: Catalog adjectives — `enterable` and `climbable` (§1a)
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: Movement bounded context — closing the `entering` and object-`climbing` action gaps via two one-to-one trait-adjective mappings. No new traits; `EnterableTrait` (`packages/world-model/src/traits/enterable/`) and `ClimbableTrait` (`.../climbable/`) already exist.
- **Entry state**: David's explicit go-ahead to implement ADR-218 has been given (see Entry gate above). ADR-218 is ACCEPTED.
- **Deliverable**:
  - Two dated entries in `docs/architecture/chord-grammar-changes.md` (ratchet), written before the code: `enterable` and `climbable` added to `TRAIT_ADJECTIVES`, each noting "`enterable` is always explicit — no per-kind default enterability" (ADR-218 §1a interview note).
  - `packages/chord/src/catalog.ts`: add `enterable`, `climbable` to `TRAIT_ADJECTIVES` (currently 12 words, `catalog.ts:27`).
  - `packages/story-loader/src/loader.ts` trait switch (~line 638): two new `case` arms composing `EnterableTrait`/`ClimbableTrait` with default config, following the existing arm shape (e.g. the `openable`/`switchable` arms).
  - Two fixture `.story` files (new, under `docs/work/chord-foundations/fixtures/`): an enterable thing the player can `enter`; a climbable object the player can `climb`.
- **Exit state**: Both fixtures compile and run via `node dist/cli/sharpee.js --test <fixture>.story` after `./repokit build`. The `entering` and object-`climbing` rows in `chord-availability-audit.md` flip from ❌/⚠️ to ✅ reachable, with a note pointing at the fixture. `cloak.story` and `zoo.story` still compile unchanged (AC-4 spot check — this phase is purely additive).
- **Status**: CURRENT

### Phase 2: The liquid model — `drinkable`, `liquid`, container liquid contents (§1b)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Consumption-mode split on `EdibleTrait` (drink vs. eat) plus a new standalone Liquid concept the world model does not yet have. This is the one platform-side addition in ADR-218 — grep confirms no `LiquidTrait` exists today.
- **Entry state**: Phase 1 complete (fixture/ratchet pattern proven). David's go-ahead explicitly covers the new `packages/world-model` trait this phase adds (re-confirm before writing world-model code — this is the platform addition ADR-218 flagged as carrying the discussion gate, §4 Governance).
- **Deliverable**:
  - Three dated ratchet entries (`drinkable`, `liquid`, `container containing liquid <type>`), written before the code.
  - New **marker-only** `LiquidTrait` in `packages/world-model/src/traits/liquid/` (own directory, following the shape of `edible`/`enterable`/`climbable` sibling traits): no state beyond trait identity, no new behavior, no new action. Serializes as a bare trait per the world-serialization contract — no migration needed.
  - `catalog.ts`: add `drinkable` and `liquid` to `TRAIT_ADJECTIVES` (12 → 16 total with Phase 1's two); add the `container containing liquid <type>` composition form.
  - `loader.ts` trait switch: `drinkable` → compose `EdibleTrait` with `liquid: true` (`edibleTrait.ts:17`) **AND** the new `LiquidTrait` — per ADR-219 (ACCEPTED), **`drinkable` implies `liquid`** (a drink is by definition a liquid; `LiquidTrait` is the single source of truth for liquid-ness, so a `drinkable` entity is also pourable once ADR-219's pouring lands). `liquid` → compose the new `LiquidTrait`; `container containing liquid <type>` → set `ContainerTrait.containsLiquid = true` + `liquidType = <type>` (`containerTrait.ts:41,44`) — the existing `drinking` action container branch (`drinking.ts:101`) already consumes this, so no stdlib change.
  - Conflict rejection (AC-3): loading an entity with both `edible` and `drinkable` is a `LoadError` naming the conflict (they are the two consumption-modes of one trait, not stackable); `drinkable`/`liquid` on a non-`thing` kind rejected the same way other adjective misuse is today.
  - Three fixture `.story` files: a `drinkable` item that routes to `drinking`, is refused by `eat`, **and carries `LiquidTrait`** (assert both traits present — drinkable-implies-liquid, ADR-219); a `liquid` substance (`create the acid, liquid`) refused by `drink` (no `EdibleTrait`); a `container containing liquid water` the player can drink from via the container branch.
- **Exit state**: All three fixtures pass via bundle test. The `drinkable` fixture entity is asserted to carry **both** `EdibleTrait.liquid` and `LiquidTrait`. The `edible`+`drinkable` conflict and non-thing misuse both produce the expected `LoadError` (a rejection test, not just a passing fixture). The `drinking` row in `chord-availability-audit.md` flips to ✅ reachable for both the edible-liquid and container-liquid paths. `LiquidTrait` round-trips through save/load unchanged (bare-trait serialization). `cloak`/`zoo` still compile unchanged.
- **Status**: PENDING

### Phase 3: Door loading — `between` two-room placement (§2)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Closing the `a door` construct for exactly the door shape the current world model supports — a fixed two-room, directionally-placed door. No world-model change: `DoorTrait` is already `{ room1, room2, bidirectional }` (`doorTrait.ts:17,20,23`) and room exits are already direction-keyed (`IExitInfo = { destination, via }`).
- **Entry state**: Phase 1 complete (ratchet/fixture pattern proven; Phase 2 need not block this — liquids and doors are independent surfaces, sequenced here per ADR-214 §8's stated order and because this phase is larger).
- **Deliverable**:
  - One dated ratchet entry for the `between the RoomA (dir) and RoomB (dir)` create-line placement syntax, explicitly noting it is **interim** — ADR-220 (Doors & Portals, informal, full-vision) may revise this spelling once directionless/multi-door/portal/dynamic-destination doors are designed; this ADR ships only the fixed directional door.
  - Remove the `loader.ts:600` throw (`` `${irEntity.name}`: doors need `between` placement... ``).
  - Implement the `between` placement: parse the two room names + reciprocal directions off the door's create-line, build one `DoorTrait { room1, room2 }` entity, and set both rooms' `exits[direction] = { destination: <other room>, via: <door> }`. `openable`/`lockable` compose onto `door` exactly as they already do (no change) — a closed/locked door blocks passage via the existing `going`-action/exit machinery, no new blocking mechanism.
  - One fixture `.story`: a two-room door (openable, lockable with a key) that opens, locks/unlocks, and blocks/permits passage from both sides.
- **Exit state**: The fixture compiles and runs via the bundle: open, lock with the right key, attempt-and-fail passage while locked, unlock, then traverse succeeds from both rooms. The `a door` row in `chord-availability-audit.md` flips to ✅ reachable. `cloak`/`zoo` still compile unchanged (neither uses `a door` today, so this is a pure addition).
- **Status**: PENDING

### Phase 4: Cross-cutting closure — AC-1/AC-2/AC-4 sweep and audit finalization
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: Governance and verification across Phases 1–3 — not new feature surface. ADR-218's acceptance bar is inherited per-fixture (AC-1/AC-3) in each phase above; this phase checks the criteria that only make sense read across all three workstreams together.
- **Entry state**: Phases 1–3 complete; six fixtures exist (enterable, climbable, drinkable, liquid, container-liquid, door) and each has flipped its row.
- **Deliverable**:
  - AC-2 pure-IR check: confirm all six fixtures produce `hasHatches: false` and load in the same profile the chord-language-reference fixtures used (no story-hatch was needed for any of these six surfaces).
  - AC-4 additivity regression: `cloak.story` and `zoo.story` both still compile unchanged after all three workstreams (run once at the end, not per-phase, to catch any cross-phase catalog collision Phases 1–3 individually missed).
  - Confirm all six `chord-grammar-changes.md` ratchet entries (2 from Phase 1, 3 from Phase 2, 1 from Phase 3) are present, dated, and owner-approved-formatted consistent with the existing log's convention.
  - Update `chord-availability-audit.md`'s "Parity scoreboard" summary table to reflect the six flipped rows and the composable-vocabulary count (12 → 16 adjectives + the `a door` construct now loading).
- **Exit state**: The audit's own scoreboard section reads correctly against the six new ✅ rows; no stray hatch usage; `cloak`/`zoo` green. This closes ADR-218 workstreams 1–3 (§1a, §1b, §2) as fully implemented and inheritance-tested against ADR-214's umbrella AC-1/AC-2/AC-4.
- **Status**: PENDING

### Phase 5: [GATED — do not start] Capability-dispatch fallback — `on <verb> it` (§3)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Capability dispatch (ADR-090) fallback wiring — a synthesized `CapabilityBehavior` from an entity's compiled `on lowering it` / `on raising it` clause when no TypeScript behavior is registered.
- **Entry state — design block CLEARED; now gated only on platform go-ahead**:
  1. ~~ADR-221 must move from DRAFT stub to ACCEPTED.~~ **DONE (2026-07-14)** — ADR-221 is ACCEPTED with all three OQs resolved: **effect replay** reuses the existing clause interpreter (`behavior.execute = runtime.runClause(clauseIR, dispatchCtx)`, one path); **error path** is `refuse` inside the clause, with the no-handler case falling back to the dispatch action's default blocked message; **args** use a general arg-binding mechanism (`on <verb> it [<extra-slots>]`, slot vocab from the verb's parser grammar). See ADR-221 §Decision + AC-1..AC-4.
  2. **David's separate platform go-ahead** for this specific workstream (it touches `packages/story-loader` and possibly a small `packages/stdlib` capability-dispatch touch, per ADR-221's Consequences) — the remaining gate.
  3. A ratchet entry admitting the capability-dispatch gerunds (`lowering`, `raising`, and any future `turn`/`wave`/`wind`) to the catalog's `EVENT_VERBS` so `on <verb> it` parses for them.
  - **Do not scope-creep Phases 1–4 to "unblock" this phase.** With ADR-221 done, the only remaining gate is David's go-ahead.
- **Deliverable (once unblocked)**: the `EVENT_VERBS` ratchet entry; the loader change that synthesizes a `CapabilityBehavior` by reusing the clause interpreter (ADR-221's resolved design); the precedence rule (a registered TypeScript `CapabilityBehavior` always wins over the synthesized fallback) as an explicit test (ADR-218 AC-4 / ADR-221 AC-3); a `refuse`-in-clause rejection fixture (ADR-221 AC-2); one fixture — an entity with `on lowering it` and no TS behavior, lowered via the `lower` verb, asserting the on-clause effects ran through the capability-dispatch path (ADR-221 AC-1).
- **Exit state**: The fixture passes; the precedence test passes; the `lowering`/`raising` rows in `chord-availability-audit.md` flip to ✅ reachable.
- **Status**: PENDING — ADR-221 design block CLEARED (ACCEPTED 2026-07-14); now gated only on David's platform go-ahead

## Notes for the implementer

- Phases 1–4 are Chord-surface-plus-one-marker-trait work; none require a stdlib action-behavior change (the `drinking` action's container-liquid branch already exists). Phase 5 is the only workstream that may touch `packages/stdlib`, and only after ADR-221 exists.
- ADR-214 §8's later roadmap items — ADR-217 (timer controls), ADR-215 (extensions/combat), ADR-216 (emit/media), plus the ADR-218-spawned ADR-219 (liquids & pouring) and ADR-220 (doors & portals) — are **now all ACCEPTED** (designed 2026-07-14) but remain **out of scope for this plan**; each gets its own implementation plan. Do not fold them in here. (Note: ADR-219's pouring subsystem builds on the `LiquidTrait` this plan's Phase 2 introduces; ADR-220 builds additively on Phase 3's door.)
- Fixture `.story` files this plan creates should live under `docs/work/chord-foundations/fixtures/`, following the compiled-fixture pattern the chord-language-reference work established (`docs/work/chord-language-reference/`), not hand-verified-only prose.
- If any phase discovers the current `EnterableTrait`/`ClimbableTrait`/`DoorTrait`/`ContainerTrait` shape does not actually support what ADR-218 assumed (i.e. the grounding in ADR-218's Context section is stale), stop and discuss — that is a platform-model surprise, not a doc-fixup, and changes the ADR's own premise.
