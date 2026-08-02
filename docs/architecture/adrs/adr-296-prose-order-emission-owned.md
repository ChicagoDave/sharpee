# ADR-296: Turn narrative slots — transactions order sources, slots place phrases

## Status: ACCEPTED (2026-08-02, session f081ec, ~02:30 CDT) — accepted by David on the v3.1 fold, after four adversarial review rounds each caught and reshaped a real defect (see history below). Implementation is follow-up work against the D0 contract and the design doc's scenario table; the acceptance-basis predictions (D8) were fixed before acceptance and bind the implementer.

**v3.1 fold record** — round-four fresh-context review (fourth review, fourth real catch) found the §3 audit scoped to chains only, missing the `registerHandler` message-effect class: the wt-13 thief scream is a handler override on messageless `actor_moved`, which D5 would have moved above the room heading. Folded as D4's semantic partition (override requires an existing messageId; messageless-trigger messages are phrase emissions, slot-placed) — the wt-13 non-change now holds by contract, mirror-room's genuine replacement keeps working, no story migration needed. Four SMALL + two NIT findings folded (anchor skip-list, primary-event definition, phrase-only slot stamping, error-branch partition, event-processor tests, channel/save stream note).

Original v3 status: (2026-08-02, session f081ec) — third writing, from the slot-frame design session (`docs/work/prose-order/design-20260802-turn-narrative-slots.md`, David + Claude, in-session). Review history, kept because each round reshaped the design: **v1** proposed deleting the sort's within-transaction machinery as dead code; review caught the implicit-take rule guarding a required feature, and David's authorial-lens review caught the deeper miss — ADR-094's metadata layer encoded an unserved authorial promise. **v2** proposed completing ADR-094's transaction+depth design; a fresh-context review found its central mechanism impossible as specified (chain-produced `game.message` never reaches the sort — override-consumed per ADR-106) and both of its predicted non-changes false. **v3** is built on David's five-slot frame, which dissolves v2's blocker: depth sorting is retired in favor of declared slot placement, and the ADR-106 question resolves to a near-free decision (audit: one dependent in the tree, identical output). Awaiting review and acceptance.

**Platform change, requires this ADR's acceptance before implementation** (project rule). Packages: `packages/engine` (`turn-event-processor.ts`, `game-engine.ts`, `prose-pipeline/stages/sort.ts` + tests), `packages/event-processor` (chain-produced `game.message` exemption, D4), `packages/world-model` (`ChainEventOptions.slot`, dispatch-time slot stamping, D3). **Story change**: re-bless of four dungeo walkthrough goldens (predicted set, D8/Acceptance).

## Date: 2026-08-02

## Parent: ADR-094 (event chaining — Amendment A1 records the intent analysis; this ADR delivers its authorial promise through slots and retires its depth-sort mechanism), ADR-051 (four-phase report emission — the in-transaction base order), ADR-106 (message overrides — narrowed by D4 for chain-produced messages only), ADR-120/070/071 (plugin loop — the non-action sources), ADR-174 (the sort's port site), ADR-227 (save format — D1's version note), ADR-295 (computed exits — resolver narration lands correctly under this ADR). Fixes GH #208. Design source: `docs/work/prose-order/design-20260802-turn-narrative-slots.md` (the scenario table there is this ADR's acceptance basis).

## Vocabulary

**Sources emit phrases.** A phrase — a messageId plus params, rendered by the language layer — is the narration primitive (David, design session §0). `chord.phrase` is its typed carrier; a TS story's `game.message`-with-messageId is the same primitive in ad-hoc clothing. Events that render nothing (moves, state changes) are bookkeeping and are never re-placed. **Transactions order the sources; slots place the phrases; the language layer renders them.**

## Context — verified, not assumed

Verified in-tree 2026-08-01/02 (session f081ec); full evidence trail in the design doc and the session summary.

- **The defect (GH #208)**: the prose sort's within-transaction rules are scoped by a `_transactionId` no origin ever stamps (`executeChains` inherits it, but from triggers that never carry one), so they apply turn-globally across sources — daemon room descriptions hoist over earlier output, emitters' phrase order is overridden by type-based hoists. The engine's own test enshrines the defective scope (`sort.test.ts:134`).
- **The hoists fire against intent where they fire at all** (v1 probe, 5 goldens / 18 lines / zero assertion-tier changes): transition phrases the emitter placed before the description are sunk below it (wt-02, wt-10 bearings, wt-14); a daemon's description hoists above a `wait` turn's own prose (wt-17).
- **Two narration positions are both legitimate**: transition phrases (before the description — the emitter's story of the act) and consequence phrases (after it — a reaction's story about the act). One flat order serves only one; type-based hoists serve neither on principle.
- **Chained narration has no placement mechanism today**: chain-produced `game.message` is consumed as a messageId override on its trigger (ADR-106 path, event-processor `processor.ts:269-329`) and renders at the trigger's position; other chain-produced events are appended at the end of the action batch (`command-executor.ts:433-438`). Both positions are accidents of dispatch, currently corrected — sometimes — by the hoist being deleted here.
- **The override-retirement audit is done and near-free** (design doc §3): the only chain-produced `game.message` in the entire tree is dungeo's carousel entry message (ADR-295, added this session), and its rendered position is identical under D4. Chord narration is already standalone typed phrases; Chord's `on` clauses override deliberately via the lifecycle engine's explicit surface, untouched here.
- **Save impact is real**: events — including stamped metadata — serialize via `serializeEventSource` (`save-restore-service.ts:369-382`). Stamps land in save files (v2 review finding 3).

## Decisions

### D0. The authorial ordering contract

Stated in author terms; every mechanism below exists to implement exactly this:

1. **Phrases you emit in your own report render in the order you emit them**, within your transaction.
2. **Phrases you chain render at your declared slot** in the triggering transaction's frame — default `afterRoomDescription` — regardless of which internal event triggered you.
3. **Sources render in occurrence order**: the player action's transaction, then each plugin batch (NPC phase, state machines, scheduler) in plugin-priority order.
4. Platform fixtures: the banner renders first in the turn; implicit takes render first in their action.

### D1. Transactions: one per source, stamped at the engine's two funnels

- **Player action**: the enrichment pass over `result.events` — `processEvent` in `packages/engine/src/turn-event-processor.ts` (NOT `src/events/`; v2 review finding 4) — stamps `data._transactionId = "txn:{turn}:action"` when absent. Stamping creates the `data` object when the event has none (v2 finding 5: the current enrichment guard skips data-less events; that guard is corrected as part of this change). The unused duplicate `TurnEventProcessor` class in the same module gets the same stamping or a deprecation note (v2 finding 12).
- **Plugin sources**: `processPluginEvents` gains the plugin id in its signature (v2 finding 9) and stamps `"txn:{turn}:plugin:{plugin.id}"` per batch (one batch per plugin per turn today; an invocation counter is added only if that changes).
- **Unstamped and proud**: sound dispatch, meta-command output, platform-op completions (v2 finding 10) — all safe under the never-group rule below.
- **Missing id never groups**: the sort treats an absent `_transactionId` as equal to nothing, including another absent id — closing #208's defect class structurally rather than by stamping coverage. `executeChains`' inheritance is retained but is NOT the mechanism (it runs before the funnel stamps; v2 finding 6) — the funnel stamp is authoritative and idempotent over it.
- **Save note (ADR-227 posture)**: stamps and slot marks (D3) ride `data` into the event-source save stream. Additive opaque fields — no reader change required — but the save-format changelog records them (per the save-format versioning convention). D4 also shifts the *event stream itself*, beyond prose (round-four NIT): a phrase-emission message now appears as its own event in `turnEvents`, channel packets, and saves, while its formerly-overridden trigger keeps no injected messageId — channel consumers see the same data reorganized, recorded in the same changelog entry.

### D2. The slot frame and its anchor

Within a transaction, the base order is the emission stream (contract rule 1). The frame's anchor is the transaction's `if.event.room.description` event; the **anchor cluster** is that event plus the following `if.event.list.contents` events, skipping non-rendering interleaved types — the skip list is exactly `if.event.illustrated` today (looking emits illustrations between description and contents; round-four finding), extended only by named addition. "After the room description" means after the player has been told what they see, list included. Slots, no abbreviations:

- `beforeEverything` — platform lifecycle only; not author-reachable.
- `beforeRoomDescription` — realized by emission position before the anchor; chains MAY declare it (D3), default off.
- `roomDescription` — the anchor cluster; never declared, identified by event type.
- `afterRoomDescription` — insertion point after the anchor cluster; the chained-phrase default.
- `afterEverything` — transaction-final.

A transaction with no anchor (a TAKE turn, a blocked movement) collapses the frame around its **primary report event, defined as the transaction's first phrase-bearing event** (first event whose `data.messageId` is set — "Taken.", the blocked refusal, the `too_dark` message): declared `afterRoomDescription` phrases insert after it; `afterEverything` stays transaction-final. A second room-description event in one transaction is a defect: warned, first one anchors (ADR-295 D1 already guarantees the known case cannot recur).

### D3. Chains declare their slot

```typescript
world.chainEvent('if.event.actor_moved', handler, {
  key: 'dungeo.carousel.entry-message',
  slot: 'afterRoomDescription',   // the default — shown for clarity
});
```

`ChainEventOptions` (world-model) gains `slot?: 'beforeRoomDescription' | 'afterRoomDescription' | 'afterEverything'`. Dispatch stamps the registration's slot onto each produced **phrase event only** (`game.message` / `chord.phrase` — the phrase carriers, per Vocabulary); typed non-phrase events a chain produces (`if.event.revealed`, `zoo.event.*`) keep their stream position and are never re-placed (round-four finding: `revealed` is prose-rendered and must not move). The stamp is `data._narrativeSlot`, alongside the existing provenance stamps. The sorter's insertion pass places slot-stamped events at their transaction's frame boundary; unstamped events keep stream position. Per-event slot override is deferred until a scenario needs it. Chord's authoring surface for slots is deferred (substrate first, ADR-293 posture) — its chained phrases get the default, which matches their current effective position.

### D4. Reaction narration is slot-placed; overrides require something to override

Round-four review found the v3 audit scoped too narrowly: besides chains, story handlers registered via `eventProcessor.registerHandler` produce `message` effects that the ADR-106 path consumes as overrides — and where the trigger is a messageless bookkeeping event (the wt-13 thief scream rides `if.event.actor_moved`), "override" was always a narration hack whose rendered position depended on the hoists D5 deletes. The decision therefore partitions on a semantic line rather than a mechanism line:

- **A `game.message` produced by a reaction whose trigger has NO `messageId` is a phrase emission**: it becomes a standalone event, slot-placed (`afterRoomDescription` default; a chain registration's declared slot wins). You cannot override a message that does not exist.
- **A `game.message` targeting a trigger that HAS a `messageId` remains an ADR-106 override** — genuine replacement, rendering at the trigger's position (dungeo's mirror rumble replacing the touch response is the living example, and keeps working unchanged).
- **Chain-produced messages (`_chainedFrom` present) are always phrase emissions** — chains are reactions with placement; replacement semantics live on the lifecycle engine's explicit override surface (ADR-228 / Chord `on` clauses), untouched here.
- The processor's multiple-`game.message` error branch counts only the override partition — phrase emissions leave the consumption set before the count (round-four SMALL finding).

Audit (design doc §3, extended in round four): phrase-emission dependents are dungeo's carousel entry message (chain) and the treasure-room scream (handler; its after-description golden position is now delivered by the slot default instead of by hoist accident — the predicted non-change HOLDS under this partition). Mirror-room stays an override. `death-penalty-handler`'s one message effect is classified at implementation time under the same partition rule (its turns have no description anchor; the collapse rule applies). This narrows ADR-106; a dated pointer note is added there.

### D5. The type-based hoists and the depth comparator are deleted

Room-description hoist (sort.ts:71-78), `action.*` hoist (sort.ts:80-84), chain-depth comparator (sort.ts:86-89) — all deleted; the comparator's terminal statement becomes an explicit `return 0`. Slot placement (D2/D3) is what depth sorting was groping at, stated in author terms; the hoists have no contract behind them and the probe proved them harmful. ADR-094 Amendment A1's closing paragraph is updated: the promise is delivered via slots; the depth-sort mechanism is retired, the provenance stamps remain.

### D6. Fixtures kept

Lifecycle-first (banner) and implicit-take-first, unchanged — the latter doubly guaranteed (emission-side prepend convention, verified in reading/putting/giving, plus the sort rule; v1 review lesson: required feature, never single-guaranteed).

### D7. Tests are rewritten to the contract

- `sort.test.ts`: the defect-enshrining test (:134) is replaced by its inverse (absent ids never group). New: emission order within a transaction survives (rule 1); a slot-stamped phrase inserts after the anchor cluster (rule 2); anchor-less collapse; two transactions keep occurrence order (rule 3); fixtures (rule 4).
- Engine integration: action events and each plugin batch carry distinct transaction ids (v2 finding 8 — the daemon funnel gets a direct test, not just a golden); a chained phrase produced during command execution carries its slot stamp.
- Event-processor unit tests (round-four finding): the D4 partition — messageless-trigger message becomes a standalone phrase; messageId-bearing trigger still overridden; chain-stamped message always standalone; the multiple-message error branch counts only the override partition.
- End-to-end: a dedicated test story (test-story isolation rule — not dungeo) chains a phrase off `actor_moved` and asserts it renders after the description and contents — ADR-094's founding trap scenario, demonstrated.

### D8. Acceptance basis is the design doc's scenario table

Every golden diff must map to a predicted Δ in design doc §4; the predicted **non**-changes are equally binding.

## Implementation

1. `packages/engine/src/turn-event-processor.ts` + `game-engine.ts` — D1 stamping (both funnels, data-object creation, plugin-id signature).
2. `packages/world-model` — `ChainEventOptions.slot` + dispatch-time `_narrativeSlot` stamping in `executeChains`.
3. `packages/event-processor` — D4 exemption for `_chainedFrom`-stamped `game.message`.
4. `packages/engine/src/prose-pipeline/stages/sort.ts` — D5 deletions; D2/D3 slot insertion pass; missing-id never-groups; header restates the D0 contract.
5. Tests per D7.
6. Re-bless dungeo goldens per D8: predicted Δ — wt-02 (disoriented above description), wt-10 (bearings above description ONLY), wt-14 (climb line above description), wt-17 (daemon transaction unscrambled from the wait turn). Predicted non-changes — carousel entry message and wt-13 thief scream keep their current after-description positions (now by D3 default instead of by accident).
7. Dated pointer notes: ADR-106 (D4 narrowing), ADR-094 Amendment A1 (D5), save-format changelog (D1), GH #208 (fix design).

## Acceptance

1. Full dungeo unit suite: no new failures in the assertion tier (v2 finding 11: byte-comparison belongs to goldens; the assertion tier has known clock-seed flakes out of scope here).
2. Golden diffs are exactly Implementation §6's predicted set — every hunk maps to a design-doc scenario Δ, and both predicted non-changes hold. **Any unmapped diff or failed non-change is an abort criterion: stop, revert, revisit — never bless a surprise.**
3. Walkthrough chain green at pinned seeds after re-bless; every other in-repo story corpus green (no `.golden` files exist outside dungeo today; classification duty extends to any that exist at implementation time).
4. wt-10 shows both orders at once: bearings (report-emitted, rule 1) above the Tea Room description; entry message (chained, rule 2) below it.
5. D7's test suite green, including the direct plugin-funnel transaction test and the end-to-end trap scenario in the dedicated test story.
6. `./repokit verify`-level check that stamped fields ride saves without reader changes; save-format changelog entry present.
7. Rollback: revert the engine/event-processor/world-model commits and re-bless — additive data fields mean old saves remain readable throughout.

## Consequences

- Authors get the D0 contract; "where does my phrase land" has a stated answer for emission and chaining both, and Chord's future slot surface is a syntax question, not a design question.
- ADR-094's founding promise (walk in, read the room, *then* the trap bangs shut) is deliverable for the first time — by declaration, not by hoist accident.
- ADR-106 narrows but keeps its designed role; the one migrated dependent renders identically.
- `_transactionId` becomes real, minimal metadata (equality-only contract); `_narrativeSlot` joins the provenance stamps; both additive in saves.
- GH #208 closes; ADR-295's rendering note resolves; #207's fix renders fully MDL-faithful.
- The sort shrinks to: fixtures, never-group, slot insertion, stability. A future emitter with wrong phrase order is a bug in that emitter.

## Risks — stated for review, not buried

- **Three drafts, three humbling reviews** — v3's factual claims were verified in-session against code (funnels, dispatch append site, override path, save serialization, the full chain census), and D8 binds acceptance to predictions made before implementation. The reviewer never gets to rationalize a surprise; neither does the author.
- **The D4 seam is the rug seam** (ISSUE-074/ADR-157: override-vs-append regressed silently once). Mitigations: the audit is complete with one known dependent; the exemption keys on provenance stamps, not event type alone; D7's end-to-end test locks the new semantics.
- **Slot insertion is new sort behavior**, not just deletion: the insertion pass must be stable and cheap (turn event counts are small; no complexity concern, but the pass gets its own unit tests per D7).

## Session

Designed across session f081ec (2026-08-01/02): #207 investigation → ADR-295 → #208 probe → three ADR-296 drafts and reviews → David's slot frame and phrase vocabulary → the design doc this ADR is built on.
