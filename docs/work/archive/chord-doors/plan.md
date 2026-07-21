# Session Plan: Implement ADR-220 (Doors & Portals) — Roadmap W4

> **ARCHIVED 2026-07-18 (David's ruling, session d02586).** This plan was
> written against ADR-218 §2's `between`-form door — a foundation ADR-234
> D1 struck from the grammar entirely ("the `between` word does NOT enter
> the grammar at all"). Basic door loading has since shipped through the
> `through` exit-line form (ADR-234, `docs/work/chord-door-loading/plan.md`,
> all phases DONE 2026-07-18, with ADR-237 one-wiring-path and ADR-238
> two-sided presence). ADR-220 itself remains ACCEPTED; if its richer door
> cases (conditional/computed-destination exits, `when` guards,
> directionless doors) are picked up later, that workstream starts from a
> FRESH plan grounded on the shipped `through` surface — this document is
> kept for historical reference only and must not be executed.

**Created**: 2026-07-14
**Overall scope**: Add two *optional* fields to `IExitInfo` — a `when` traversal guard and a computed `destination` — plus the small `going`-action hook that consults them, so richer doors (conditional, dynamic-destination, concealed, two-doors-on-a-wall, directionless) become expressible without growing the exit data model's shape. Then spell both fields in Chord as ratchet entries and close the loop with compiled fixtures. This is **W4** of the Chord parity roadmap (`docs/work/chord-parity/roadmap.md`) — additive on top of **W1**'s (ADR-218 §2) direct two-room `between` door.
**Bounded contexts touched**: World model exits (`packages/world-model/src/traits/room/roomTrait.ts`, `roomBehavior.ts`), the `going` action (`packages/stdlib/src/actions/standard/going/`), the Chord composable vocabulary and loader's exit-wiring pass (`packages/chord/src/catalog.ts`, `packages/story-loader/src/loader.ts`), and the ADR-210 grammar ratchet. **No** change to `parser-en-us` is expected (door disambiguation is ordinary entity resolution) — Phase 1 confirms this explicitly rather than assuming it.
**Key domain language**: direct exit vs. logic-gated exit, `when` guard, computed destination, `via` entity (the door), blocked-exit message path, grammar ratchet (ADR-210 Terminology); parity gap / reachable (ADR-214 Terminology).

## Entry gate (read before starting any phase)

This is **platform work** under CLAUDE.md's discussion gate (`packages/world-model`, `packages/stdlib`, `packages/chord`, `packages/story-loader`). Per the roadmap's own entry gate, "the ADRs are done; [the roadmap] orders the *building*, it does not authorize starting it." **Do not begin Phase 1 (or any later phase) until David gives explicit sign-off to implement W4 specifically** — this plan is written ahead of that sign-off, per the roadmap's "get its own `docs/work/<slug>/plan.md`... when picked up" guidance, so the workstream is ready the moment it is picked up.

**Hard prerequisite — W1 must be BUILT first, not merely planned.** ADR-220 is purely additive on top of ADR-218 §2's `between` two-room door (`DoorTrait` + `IExitInfo.via` wiring, `world.connectRooms(...)` in `loader.ts:274`). That door does not exist in running code yet — `docs/work/chord-foundations/plan.md` Phase 3 (door loading) is still PENDING behind Phase 1/2, and per the most recent session's Open Items, **no chord-foundations code has been touched at all** as of 2026-07-14. Do not start this plan's Phase 1 until `chord-foundations/plan.md` Phase 3's exit state is reached (its fixture door opens/locks/traverses via the bundle). This plan does not modify `chord-foundations/plan.md` or the `docs/context/.current-plan` pointer, which stays on `docs/work/chord-foundations/plan.md` until W1 completes.

**The invariant every phase must protect (ADR-220's governing principle, AC-4): the exit *data model does not grow in shape*.** `IExitInfo`'s two new fields are optional; the direction-keyed `Partial<Record<DirectionType, IExitInfo>>` map, `DoorTrait { room1, room2, bidirectional }`, the auto-mapper, and serialization for any exit that uses neither field must be provably unchanged. Treat any change to those four surfaces as a stop-and-discuss signal, not a design detail to route around.

Standing constraints across every phase (CLAUDE.md):
- Never auto-retry a failed build or test — report and wait for explicit instruction.
- Never delete files without confirmation.
- Build via `./repokit build`; test fixtures via the bundle: `node dist/cli/sharpee.js --test <fixture>.story` (never the slow per-package path).
- Every vocabulary/syntax change is a dated entry in `docs/architecture/chord-grammar-changes.md` **before** the implementation that depends on it (ADR-210 ratchet discipline).

## References consulted
- `docs/architecture/adrs/adr-220-doors-and-portals.md` — the ACCEPTED design this plan implements: exit data model does not grow (AC-4); two optional `IExitInfo` fields (`when`, computed `destination`) cover all four hard cases; `between` is retained unchanged; no new parser-en-us grammar for door disambiguation.
- `docs/architecture/adrs/adr-218-chord-foundations.md` §2 — the direct two-room `between` door this plan builds additively on top of: `DoorTrait = { room1, room2, bidirectional }`, `IExitInfo = { destination, via, mapHint }` today, `world.connectRooms(...)` at `loader.ts:274` is the exit-wiring seam W4 extends. Confirms ADR-220 keeps this spelling stable, not interim.
- `docs/work/chord-parity/roadmap.md` — sequences W4 after W1 (hard edge: "W1 §2 (door) → W4 (adds optional `IExitInfo.when`/computed-destination on top)"); sizes W4 as S–M; states the per-workstream go-ahead gate applies to every workstream individually.
- `docs/architecture/chord-grammar-changes.md` (ADR-210 ratchet log) — every Chord vocabulary/syntax addition is a dated, owner-approved entry written before the code; this plan's Phase 2 ratchet entries must follow the log's existing format (Date / Form / Rationale / Example / Decision columns).
- `docs/architecture/adrs/adr-113-map-position-hints.md` — Superseded by ADR-115, but its `IExitMapHint` addition is the **direct precedent** for adding an optional field to `IExitInfo` without touching the map shape: `mapHint?: IExitMapHint` shipped as opt-in, direction-based positioning unchanged when absent. AC-4's bar ("no change to the direction-keyed map shape... for exits that use neither field") is the same bar `mapHint` already cleared once.
- `docs/work/stdlib-reference/chord-availability-audit.md` — the parity scoreboard; the `a door` row (line ~43/169) currently reads "does not load in v1" pending W1; this plan's fixtures flip the richer-door cases (conditional/computed) once W1's base row is reachable. Phase 3 names the exact rows to update.
- `docs/context/project-profile.md` — confirms `packages/world-model`, `packages/stdlib`, `packages/chord`, `packages/story-loader` as the touched areas, TypeScript strict-mode conventions, and the Vitest + bundle-transcript test split this plan's fixtures follow.
- `docs/context/session-20260714-2047-chord-foundations.md` (most recent session) — Open Items confirm W1 is still awaiting go-ahead and no code has been touched; explicitly lists ADR-220 as accepted-but-unplanned "out of scope for the chord-foundations plan," which this plan now addresses.

## Phases

### Phase 1: `IExitInfo` gains `when`/computed `destination` + the `going` hook
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: World model exits + the `going` action's exit-resolution step. This is the phase that carries AC-1 and AC-4 — it must be provably additive before any Chord surface is built on top of it.
- **Entry state**: W1 (ADR-218) Phase 3's `between` door fixture passes via the bundle (`DoorTrait` + direct `IExitInfo.via` wiring exist and work). David's go-ahead to implement W4 has been given.
- **Deliverable**:
  - `packages/world-model/src/traits/room/roomTrait.ts`: `IExitInfo` gains two **optional** fields alongside the existing `destination: string`, `via?: string`, `mapHint?: IExitMapHint`:
    - `when?: <condition-expr-or-behavior-type>` — a guard; absent means always-available (today's behavior).
    - a computed-destination form — `destination` itself stays `string` for the direct case; add a distinct optional field (e.g. `computedDestination?: <expr-or-behavior-type>`) rather than widening `destination`'s type, so a direct exit's `destination: string` is untouched and every existing read site (`RoomBehavior.getExit(...).destination`, `going.ts:247/351`) keeps compiling with no cast. Confirm the exact expression/behavior shape against how the existing derived `is blocked while <cond>` mechanism represents a condition (`loader.ts:276-283` — "the runtime recomputes them with dark-while") so `when` reuses that same condition representation rather than inventing a second one.
  - `packages/world-model/src/traits/room/roomBehavior.ts`: `getExit`/`getAllExits`/`getAvailableExits` are read-only pass-throughs today — confirm they need no change (they return the `IExitInfo` as stored; evaluation of `when`/computed-destination is the *consumer's* job, not the accessor's, matching how `isExitBlocked`/`getBlockedMessage` already separate "is there a static block" from the derived recompute the loader does at `loader.ts:280`).
  - `packages/stdlib/src/actions/standard/going/going.ts` `validate()`: after `RoomBehavior.getExit(currentRoom, direction)` resolves an `IExitInfo` (line ~198) and before the door-state check (line ~216), evaluate `when` if present — on failure, fall back to the **existing** `blockedExits`-style rejection (`GoingMessages.MOVEMENT_BLOCKED`, matching the shape at lines 188-195), not a new message path. In `execute()` (line ~350), resolve `destinationId` from the computed field when present, else the static `destination` (line 247/351) — unchanged when absent.
  - A Behavior Statement (rule 12) for the modified `going.validate`/`going.execute` before writing tests, since this is a side-effect-relevant change to an existing mutation path.
  - Unit tests (Vitest, `packages/stdlib` and/or `packages/world-model`) asserting: an `IExitInfo` with neither new field behaves byte-for-byte as before (AC-1 at the unit level); a `when`-guarded exit blocks via the standard `blockedExits` message path pre-flag and traverses post-flag (AC-2 at the unit level); a computed-destination exit resolves to different rooms as state changes (AC-3 at the unit level).
- **Exit state**: `pnpm --filter '@sharpee/world-model' test` and `pnpm --filter '@sharpee/stdlib' test going` pass green. `IExitInfo`'s existing three fields, the direction-keyed map shape, `DoorTrait`, and serialization for exits using neither new field are unchanged (grep-confirm no widening of `destination`'s type, no new required field). No Chord-surface or fixture work yet — this phase is world-model + stdlib only.
- **Status**: CURRENT

### Phase 2: Chord surface — `when`/computed-destination spelling (ratchet)
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: Composable vocabulary + the loader's exit-wiring pass (`loader.ts:273-275`, today a bare `world.connectRooms(...)` per exit). Confirms the "no new parser grammar" claim from ADR-220 rather than assuming it.
- **Entry state**: Phase 1 complete — `IExitInfo`'s two optional fields and the `going` hook exist and are unit-tested.
- **Deliverable**:
  - One or two dated ratchet entries in `docs/architecture/chord-grammar-changes.md`, written **before** the loader code, spelling: (a) a `when <condition>` clause on an exit/door create-line, reusing the existing `is blocked while <cond>` condition grammar rather than a new one; (b) a computed-destination form for a door's far side (e.g. resolving `to <room>` by state/adjective rather than a single fixed room) — grounded in whatever condition-expression syntax Phase 1's `when` field actually took.
  - `packages/chord/src/catalog.ts`: no new kind noun or trait adjective is expected (doors are already `door`/`openable`/`lockable`); confirm and note if a new clause keyword (not an adjective) is needed instead, since ADR-220 is exit-logic, not entity-composition.
  - `packages/story-loader/src/loader.ts` exit pass (`~line 273`): extend the per-exit loop to carry a compiled `when`/computed-destination through to the `IExitInfo` the entity's exits are built from (today `world.connectRooms(...)` — confirm whether it needs a new parameter or whether exits must be set via `RoomBehavior.setExit`/direct trait write for the gated case; do not change the un-gated path).
  - **Parser confirmation (ADR-220 explicit claim)**: grep `packages/parser-en-us` for any existing door-name/adjective disambiguation and confirm ordinary entity resolution already handles "open the red door" with no new grammar pattern (ADR-087). If a gap is found, stop and report — do not silently add parser-en-us grammar under this plan without flagging it, since ADR-220 explicitly scoped parser-en-us out.
- **Exit state**: The two ratchet entries exist, dated and formatted like the log's existing rows. A Chord `.story` snippet with a `when`-gated exit and one with a computed destination compiles through the loader (not yet run as a full fixture — that's Phase 3) with no parser-en-us changes required (or the gap is reported to David, not silently patched).
- **Status**: PENDING

### Phase 3: Fixtures, additivity regression, and audit closure
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: Acceptance — turning Phases 1–2's mechanism into ADR-220's four named ACs, run against the real bundle, and closing the loop on the parity audit.
- **Entry state**: Phases 1–2 complete.
- **Deliverable**:
  - Fixture `.story` files (`docs/work/chord-doors/fixtures/`, following the chord-language-reference compiled-fixture pattern):
    - **AC-1** (direct exits unchanged) — reuse/re-run W1's `between` door fixture plus `cloak.story`/`zoo.story` unmodified, confirming byte-identical behavior with Phases 1-2's code present but unused.
    - **AC-2** (conditional exit) — an exit with `when <flag>` blocked pre-flag (via the `blockedExits` message path), traversable post-flag.
    - **AC-3** (computed destination) — an exit whose destination is computed, resolving to different rooms as state changes; use this same fixture (or a twin) to cover the two-doors-on-a-wall case (two `via` door entities disambiguated by adjective, the wall's exit computed-destination resolving by which is open/chosen).
    - **AC-4** (additivity) — an explicit test/assertion (not just "it still compiles") that the direction-keyed exit map shape, `DoorTrait`, the auto-mapper, and serialization are unchanged for exits using neither new field — mirroring how ADR-113's `mapHint` addition was verified.
  - Update `docs/work/stdlib-reference/chord-availability-audit.md`: flip the relevant row(s) — conditional/dynamic door traversal beyond W1's fixed `between` case — to reachable, referencing the new fixtures.
  - Confirm all fixtures produce `hasHatches: false` (pure-IR, ADR-210 AC-4) consistent with the chord-language-reference fixtures' profile.
- **Exit state**: All fixtures pass via `node dist/cli/sharpee.js --test <fixture>.story` after a full `./repokit build`. `cloak`/`zoo` and W1's `between`-door fixture still pass unchanged. The audit reflects the closed gap. ADR-220's AC-1..AC-4 are each backed by a named, running test — not merely asserted in prose.
- **Status**: PENDING

## Notes for the implementer

- This plan does **not** modify `docs/work/chord-foundations/plan.md` or `docs/context/.current-plan` — the pointer stays on chord-foundations until W1 completes. This file exists so W4 is ready to execute the moment it's picked up, per the roadmap's own guidance ("W3/W4/W5/W6/W7 each get their own plan... when picked up").
- If Phase 1 finds that a plain condition-expression representation does not already exist (i.e. `is blocked while <cond>`'s derived-recompute mechanism at `loader.ts:280` doesn't generalize to `when` the way expected), stop and discuss — that's a platform-model surprise about the grounding this plan assumed, not a phase-internal detail.
- Two-doors-on-a-wall and directionless doors are **not** new mechanisms — they ride the same two fields (computed destination; a non-compass `in`/`out` slot or enterable door entity). Do not introduce a third `IExitInfo` field or a parallel exit channel for either case; if a phase seems to need one, that's a violation of AC-4 and a stop-and-discuss signal.
- Fixture `.story` files belong under `docs/work/chord-doors/fixtures/`, mirroring the pattern `docs/work/chord-language-reference/` and (once it exists) `docs/work/chord-foundations/fixtures/` established — compiled and bundle-run, not hand-verified prose.
