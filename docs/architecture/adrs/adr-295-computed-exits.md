# ADR-295: Computed exits — world-model-owned traversal resolution

## Status: ACCEPTED (2026-08-01, session f081ec) — written from the #207 design exchange; seam, Option A keying, and topology posture approved in conversation by David. `adr-review`ed the same day at 11/15 with two BLOCKER findings (interceptor destination-slot consultation undefined for computed directions; source-room reverse-derivation in `going-data.ts` breaks under redirects) and five SMALL, all folded (D7, D3/D4/D5 amendments, Acceptance 5–8, Implementation 2–3). Accepted by David on the folded result; implementation discussion held the same session.

**Platform change, requires this ADR's acceptance before implementation** (project rule: platform changes are discussed first). Packages: `packages/world-model`, `packages/stdlib`. **Story change**: `stories/dungeo`.

## Date: 2026-08-01

## Parent: ADR-090 (capability dispatch — the trait-declares / registry-binds idiom this ADR mirrors), ADR-207/ADR-208 (per-world binding maps, idempotent last-wins, re-registered on story load — the registration shape reused here), ADR-293 (named choice points; D6 gates randomness construction to the engine, which is why the resolver receives its `RandomService`), ADR-228 (action lifecycle; D7.1's post-validate divergence precedent), ADR-051 (four-phase actions). Fixes GH #207; exposes the latent twin bug in the Round Room daemon.

## Context — verified, not assumed

All claims read out of the working tree 2026-08-01, on the repro from GH #207 (`--seed 42`).

### The bug is a boundary violation, not a rendering glitch

Dungeo's Low Room "magnet room" randomization (`stories/dungeo/src/handlers/carousel-handler.ts`) is a scheduler daemon that runs **after** the going action has completed. `> east` runs the full going action against static topology (east → Machine Room): the player is moved there and `going.report()` emits the Machine Room description plus its contents list. The daemon then re-rolls (Tea Room at seed 42), moves the player a second time, and emits a second room description plus the bearings message. One turn, two arrivals. The Round Room handler (`round-room-handler.ts`) has the identical structure and the identical latent bug.

Event handlers react to facts; this daemon retcons one. "The player entered the Machine Room" was emitted and reported as a fact, then un-happened. Every #207 symptom — double description, orphaned contents line, trailing bearings message — is downstream of that violation. (The symptom *ordering* is aggravated by a separate prose-pipeline defect: `engine/src/prose-pipeline/stages/sort.ts` scopes its room-description hoist by `_transactionId`, which no producer in the tree ever writes, so the whole turn compares as one transaction. That is filed separately as GH #208 and is not decided here.)

### MDL canon computes the destination before moving

`MAGNET-ROOM-EXIT` (act3.199) and `CAROUSEL-EXIT` (act1.254) are exit **resolution** functions: the answer to "where does this exit go" is computed before anyone moves, and the move happens once. `CEXIT` entries could also veto with a message. The concept in canon is "computed exit," not "redirect hook."

### Why `getExit` cannot become the seam

`RoomBehavior.getExit` (world-model `roomBehavior.ts:24`) is pure static lookup, and it is called four times inside one going command (`going.ts:148`, `:288`, `:390`; `going-data.ts:36`), plus throwing (`throwing.ts:258,412`), NPC pathfinding (`npc-service.ts:448`), and exit enumeration. A resolver that draws randomness would re-roll at every call site. Resolution therefore needs its own surface with a called-exactly-once contract.

### The plumbing already exists

`ActionContext.random` is threaded (stdlib `enhanced-context.ts:46`, ADR-293 D6). Both carousel draws are already named points (`dungeo.low-room.exit`, `dungeo.round-room.exit`, ADR-293 Phase B). The per-world binding-map registration idiom exists three times over (capability behaviors, interceptors, slot entries).

## Decisions

### D1. Invariant: one traversal, one arrival

A movement command moves the actor at most once, and `report()` describes the room the actor actually ends up in. Post-hoc redirection of completed movement — the daemon-retcon pattern — is retired. Event handlers and daemons observe movement; they do not rewrite it.

### D2. Topology and traversal are distinct surfaces

- **Topology** — `getExit` / `hasExit` / `getAllExits` / `getAvailableExits` — stays pure and static, callable any number of times. Maps, exit listings, NPC pathfinding, throwing, and GDT keep using it.
- **Traversal** — new `RoomBehavior.resolveExit(room, direction, ctx)` — is effectful and called **exactly once per traversal**. It answers "where does this actor actually end up going this way, right now."

While a carousel spins, topology deliberately reports the static map; traversal says otherwise. That divergence is the domain truth, now explicit in the API.

### D3. Existence and enumeration are trait data (Option A: story traits fulfill a platform contract)

world-model ships a computed-exit **contract**, not a concrete shared trait. A story trait (own `type` string, per ADR-090 idiom) declares as serialized data:

```typescript
interface IComputedExitDeclaration {
  /** Room entity ids the resolver may return for this direction. */
  candidates: string[];
}
// on the trait, one of:
computedExits: Partial<Record<DirectionType, IComputedExitDeclaration>>;
computedExitsAll: IComputedExitDeclaration;   // every compass direction the room exposes
```

- **Existence**: an exit exists in a direction iff a static exit is defined **or** a computed-exit trait declares the direction. Pure data check — `validate` never executes resolver code and never draws. Existence is **declaration alone**: it does not consult the resolver registry. A declared direction whose trait has no registered resolver still exists at validate time; at traversal time it warns loudly and falls back to static topology — and when no static exit is defined either, it blocks with the standard can't-go-that-way message. A declaration without a registration is a story wiring defect, surfaced at the first traversal, never a crash.
- **Enumeration**: topology tools see a computed exit exactly as declared — the candidate set, honestly ("east → Machine Room | Tea Room"). No single `nominalDestination` fiction.
- A resolution outside the declared candidate set is a defect: warned loudly, honored (render-graceful posture). Candidates are what make the outcome space finite and enumerable (ADR-293 D4).

### D4. Resolvers bind through a per-world registry keyed by trait type

```typescript
world.registerExitResolver(traitType: string, resolver: ExitResolver): void;

type ExitResolver = (
  room: IFEntity,
  trait: ITrait,                    // the declaring trait instance — its data parameterizes the resolver
  direction: DirectionType,
  staticExit: IExitInfo | null,
  ctx: { world: WorldModel; actorId: EntityId; random: RandomService },
) => ExitResolution;

type ExitResolution =
  | { kind: 'exit'; destination: string; via?: string; events?: ISemanticEvent[] }
  | { kind: 'blocked'; messageId: string; params?: Record<string, unknown> }
  | undefined;                      // defer to static topology
```

Same posture as ADR-207/208: per-world binding map, idempotent last-wins, never serialized, re-registered every story load. `resolveExit` scans the room's traits for a registered resolver (the `findTraitWithCapability` lookup shape), calls it once, and falls back to the static exit when no resolver exists or it returns `undefined`. `kind: 'exit'` may carry narration events (the bearings message) as messageId-bearing events — no English below lang. Narration events are forwarded **verbatim** into going's report; their event type is the story's choice (dungeo uses `game.message`).

`kind: 'blocked'` is scoped to conditions knowable **only at resolution time** (draw-dependent or otherwise effectful). Blocking that is pure and pre-known stays on the existing blocked-exit surfaces — the `exitBlockedKey` registered evaluator (going.ts:128-138, the Chord `north is blocked:` seam) and `RoomTrait.blockedExits` — which act at validate time. One condition, one seam; a resolver duplicating a pure block is a smell.

The `RandomService` is passed in; world-model never constructs randomness (ADR-293 D6). Resolution is deterministic given its inputs.

### D5. Going resolves once, in execute, cached in sharedData

The draw mutates the RNG stream, so it is an effect: it belongs in `execute`, not `validate` (which stays pure and re-callable against existence data per D3). Going's `execute` calls `resolveExit` exactly once, stores the `ExitResolution` in sharedData, and moves the actor once (or not at all on `blocked`). `report()` already reads `sharedData.currentLocation`, so the single-arrival invariant needs no report restructuring; resolver narration events are emitted ahead of the arrival description (MDL prints bearings before the room). A `blocked` resolution routes through the action's existing blocked reporting — post-validate divergence has precedent (`too_dark`, ADR-228 D7.1).

Note: MDL-faithful *rendered* order (bearings before room name) additionally requires the sort-scoping fix tracked in GH #208; this ADR emits events in the correct order and does not redesign the sort.

### D6. Scope: player traversal through the going action

NPC pathfinding, thrown-object trajectories, and exit enumeration stay on static topology. MDL scrambled only the player; nothing in dungeo needs more. Extending resolution to NPC movement is deferred, not precluded.

> **Amended 2026-08-25 (ADR-326 D6, session 8ae644).** One extension landed: the Chord adjacent-room draw (`move … to a random adjacent room`) consults a computed direction's resolver through `RoomBehavior.resolveExit` — once per direction per draw, a distinct question from the traversal's own once-per-going consult, so the called-exactly-once invariant holds per question — and takes the answer as "where would going take the mover right now" (inactive → static destination, `exit` → its destination with narration dropped, `blocked` → nothing). Going's own resolution is unchanged; NPC pathfinding and thrown objects stay static.

### D7. Interceptor consultation on computed directions: source and door consult; destination does not

The going lifecycle (`goingLifecycle`, going.ts:162-192) consults three slots pre-execute, first-veto-wins: source room (`if.action.going`), destination room (`if.action.entering_room`), door (`if.action.going`). The destination slot resolves through static `getExit` — but for a computed direction the true destination is unknown until the execute-phase draw, so pre-execute consultation would target a room the actor may never enter (a guard on the real destination bypassed; one on the static room fired spuriously).

Decision: for a direction governed by a computed-exit declaration, the destination slot resolves to **no entity** — `entering_room` interceptors are not consulted for that traversal. Source-room and door slots consult exactly as today, so guard-style logic for a scrambling room lives on the source room. Consulting candidate-room interceptors (all candidates, first veto wins) is deferred, not decided — no current story places an `entering_room` guard on a computed candidate.

## Implementation

1. **world-model**: computed-exit contract types; `registerExitResolver` binding map on `WorldModel` (ADR-207/208 shape); `RoomBehavior.resolveExit`; existence checks (D3) folded into `hasExit`-style consultation used by going's validate. Root barrel discipline applies.
2. **stdlib/going**: existence check in `validate` per D3; single `resolveExit` call in `execute` with sharedData caching; `blocked` path; resolver events emitted in `report` ahead of the room description; destination-slot resolution per D7. **going-data.ts**: `findSourceRoomAndExit` (lines 26-44) currently derives `fromRoom` by scanning static topology for an exit leading to the arrival room — unanswerable after a redirect (it silently falls back to the arrival room itself and drops `mapHint`). The event-data builders switch to `sharedData.previousLocation`, which execute already stores; the reverse scan is deleted.
3. **dungeo**: one `CarouselExitTrait` (story type), two instances — Round Room (`computedExitsAll`, candidates = its eight static destinations, point `dungeo.round-room.exit`) and Low Room (`computedExitsAll`, candidates = Machine Room + Tea Room, point `dungeo.low-room.exit`, bearings message id) — parameterized by trait data; one resolver registered for the type. Gate on the existing spin state (`RoundRoomTrait.isFixed`, `dungeo.carousel.active`): when not spinning, return `undefined` (static topology governs). The Low Room entry "compass spinning" message converts to an `if.event.actor_entered` event handler — a legitimate reaction to a completed arrival, and one that needs no location tracking. All five daemons then go: both exit daemons, both prev-location tracking daemons, and the entry daemon, along with the `dungeo.carousel.prevLocation` and `dungeo.round_room.prevLocation` state keys.
4. **Transcripts**: `carousel.transcript` (drop the #207 TODO) and any walkthrough crossing a spinning room re-recorded at their pinned seeds — the goldens currently encode the franken-turn.

## Acceptance

1. The #207 repro at seed 42 produces one arrival: bearings narration, one room description, contents of the actual arrival room. No Machine Room text when the player lands in the Tea Room.
2. `validate` performs no draw and executes no resolver code; probing existence repeatedly does not advance any stream.
3. Round Room behavior is preserved through the resolver (same point name, same candidate set) with its daemon deleted.
4. Full dungeo unit suite and walkthrough chain green at pinned seeds after re-recording the affected transcripts.
5. A resolver returning `kind: 'blocked'` produces the blocked report and **no movement** — the actor's location is asserted unchanged (world-state assertion, not message-only).
6. A resolver returning a destination outside its declared candidate set warns loudly and the traversal completes to the returned room (warn-and-honor, D3).
7. A declared computed direction with no registered resolver: exists at validate, warns at traversal, falls back to static topology — and blocks with the standard message when no static exit is defined.
8. Under a redirect, `if.event.actor_moved` data carries `fromRoom` = the room actually departed (`sharedData.previousLocation`), not the arrival room (going-data.ts fix).

## Consequences

- Conditional/randomized exits have one sanctioned home: trait data + registered resolver. Future CEXIT-style needs (flag-gated destinations, blocked-with-message) use this seam; daemons that move the player after an action reports are a review-rejectable smell.
- Topology tools gain an honest enumeration of nondeterministic exits, which feeds ADR-293's coverage/forcing surfaces (finite candidate sets are enumerable outcome spaces).
- Five dungeo daemons (two exit, two tracking, one entry) and both prev-location state keys are deleted; the entry message becomes an `actor_entered` event handler; the story loses its largest remaining retcon pattern.
- Golden transcripts that encoded the double-description turn change by design.
- The prose-pipeline sort's dead `_transactionId` scoping remains a separate platform bug (GH #208); until fixed, rendered order within the arrival turn may differ from emission order.

## Deferred, not decided

- **Chord authoring surface** for computed exits — the Sharpee substrate comes first (same posture as ADR-293).
- **Stock resolver library selected by id** (the "Option B" layering) — an authoring convenience over this seam, not a seam change.
- **NPC traversal through resolvers** — static topology until a story needs otherwise.
- **`entering_room` interceptor consultation on computed candidates** (D7) — all-candidates-first-veto is the likely shape if a story ever guards a candidate room; not designed here.

## Session

Designed and written in session f081ec (2026-08-01), from the investigation of GH #207 recorded there.
