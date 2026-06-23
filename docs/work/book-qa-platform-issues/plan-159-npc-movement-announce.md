# Plan — #159: Opt-in NPC movement announcements

**Issue:** [#159](https://github.com/ChicagoDave/sharpee/issues/159) — NPC room
changes are silent; the zookeeper's patrol is imperceptible without `look`.

**Branch:** `fix/platform-issues-book-qa`

**Status:** Planned (awaiting implementation).

---

## 1. Problem

When an NPC moves between rooms, `NpcService.executeMove` (`packages/stdlib/src/npc/npc-service.ts`)
emits `npc.moved` with `{ npc, from, to, direction }` but **no `messageId`**, so
the prose pipeline renders nothing. The player sees only "Time passes…" while a
patrolling NPC walks in/out of their room.

### Why authors can't currently handle it

- NPC/plugin events are routed through `GameEngine.processPluginEvents`
  (`game-engine.ts`), which enriches, perception-filters, adds to `turnEvents`
  (text), and re-emits via `config.onEvent` / `engine.emit('event')`. It
  **does not** call `eventProcessor.processEvents()`, so `world.registerEventHandler`
  / `chainEvent` handlers never fire for `npc.moved`.
- The only first-class story seam today is the NPC **behavior** emitting
  `emote`/`speak` actions (e.g. the `wanderer` behavior's `announceEntry`).

### What already exists (so this is mostly wiring)

- Lang templates in `packages/lang-en-us/src/npc/npc.ts`, loaded by the provider
  (`language-provider.ts:12` imports `npcLanguage`):
  - `'npc.leaves'`  → `"{npcName} leaves to the {direction}."`
  - `'npc.enters'`  → `"{npcName} enters from the {direction}."`
  - `'npc.arrives'` → `"{npcName} arrives."`
  - `'npc.departs'` → `"{npcName} departs."`
- Matching stdlib IDs in `packages/stdlib/src/npc/npc-messages.ts`
  (`NPC_ENTERS`, `NPC_LEAVES`, `NPC_ARRIVES`, `NPC_DEPARTS`).
- `getOppositeDirection` in `packages/world-model/src/constants/directions.ts`.
- The prose pipeline's generic handler renders any event whose `type` (or
  `data.messageId`) resolves to a registered message (`prose-pipeline/handlers/generic.ts`).

## 2. Design decisions (agreed)

1. **Announcement is opt-in per NPC**, controlled by `NpcTrait.announcesMovement`
   (default `false`, preserving current silence). The platform does not mandate
   movement prose.
2. **Only player-visible crossings announce** — departures when the move's
   `from === playerLocation`, arrivals when `to === playerLocation`. Moves
   between two rooms the player is not in stay silent (the bare `npc.moved` event
   still fires for data/handlers/save).
3. **Authors can override the default messages** at two levels:
   - **Global:** override `npc.leaves` / `npc.enters` / `npc.arrives` /
     `npc.departs` via `extendLanguage` / `addMessage` (already works; no new
     code). Affects all NPCs using the defaults.
   - **Per-NPC:** optional `NpcTrait.movementMessages` map of message-ID
     overrides, falling back to the platform defaults.
4. **Wording:** arrivals via `npc.enters` use the **opposite** of the move
   direction (the player sees the NPC arrive *from* the direction it came).
   `moveTo` (directionless) uses `npc.arrives` / `npc.departs`.
5. **Params:** both default and custom templates receive `{ npcName, direction }`
   (direction omitted for the directionless moveTo case), so overrides share the
   same placeholders.
6. **Sight and sound are parallel renderings, not primary-and-fallback.** The
   announcement is emitted as a sense-neutral *fact* carrying a per-sense
   `renderings` map — `sight` ("Sam leaves to the east.") and `hearing`
   ("You hear someone leave."). `PerceptionService` *selects* the rendering for
   the player's best available sense; neither is derived from the other. In the
   dark (or when blind) the player perceives the `hearing` rendering — anonymized,
   with no identity or direction (you don't know *who* or *which way* by ear). An
   event with no `hearing` rendering is simply inaudible; one with no `sight`
   rendering is invisible — by absence of a rendering, not by degrading a richer
   line. See the ADR-069 amendment (per-sense rendering selection).

## 3. Changes

### 3.0 core — shared renderings wire-type (`@sharpee/core`)

Per-sense renderings are a contract shared by the emitter (`NpcService`, §3.2) and
the consumer (`PerceptionService`, §3.3). Define it **once**, next to the existing
`Sense` union (ADR-069 Phase 1, `@sharpee/core`), and import it on both sides — never
redeclare per file (root CLAUDE.md rule 8b):

```ts
// @sharpee/core — perception types (alongside `Sense` and `IPerceptionService`)
export interface Rendering {
  messageId: string;
  params: Record<string, unknown>;
}
export type PerSenseRenderings = Partial<Record<Sense, Rendering>>;

/** Fixed selection precedence; a new Sense must declare its rank here. */
export const SENSE_PRECEDENCE: readonly Sense[] = ['sight', 'hearing', 'smell', 'touch'];
```

A witnessable event carries `data.renderings: PerSenseRenderings`. Absent ⇒ not a
witnessable fact (pass through). Present-but-empty `{}` ⇒ perceptible by nothing
(blocked), distinct from absent. See the ADR-069 amendment (Contract).

### 3.1 world-model — `packages/world-model/src/traits/npc/npcTrait.ts`

Add to `INpcData` (and mirror as fields + constructor defaults on `NpcTrait`):

```ts
/** Announce this NPC's movement when it crosses the player's room (default false). */
announcesMovement?: boolean;

/**
 * Per-NPC message-ID overrides for movement announcements. Any key left unset
 * falls back to the platform default (npc.leaves / npc.enters / npc.arrives /
 * npc.departs). Override text receives { npcName, direction } params.
 */
movementMessages?: {
  leaves?: string;   // departure with direction (move)
  enters?: string;   // arrival with direction (move)
  arrives?: string;  // arrival without direction (moveTo)
  departs?: string;  // departure without direction (moveTo)
};
```

Constructor: `this.announcesMovement = data.announcesMovement ?? false;`
and `this.movementMessages = data.movementMessages;`

Root-barrel discipline: `NpcTrait` is already exported; no new trait, so no
barrel changes. Rebuild `dist/` + `dist-esm/` per world-model CLAUDE.md when
building.

### 3.2 stdlib — `packages/stdlib/src/npc/npc-service.ts`

- Import `getOppositeDirection` from `@sharpee/world-model` and the
  `PerSenseRenderings` type from `@sharpee/core` (§3.0) — the helper's returned
  `renderings` map is typed against it, so emitter and consumer share one shape.
- Thread `playerLocation: EntityId` through the action-execution chain:
  - `executeActions(npc, actions, world, random, playerLocation)`
  - `executeAction(npc, action, world, random, playerLocation)`
  - `executeMove(npc, direction, world, playerLocation)`
  - `executeMoveTo(npc, roomId, world, playerLocation)`
- Update the 5 `executeActions` call sites to pass `playerLocation`
  (`tick` line ~218 has it from context; `onPlayerEnters`/`onPlayerLeaves`/
  `onSpokenTo`/`onAttacked` each already compute `world.getLocation(playerId)`).
- In `executeMove`, after the existing `npc.moved` event, when
  `trait.announcesMovement` and the move crosses the player's room, push one
  sense-neutral `npc.moved.witnessed` fact carrying a per-sense `renderings` map:
  - departure (`currentLocation === playerLocation`): `sight` =
    `trait.movementMessages?.leaves ?? NpcMessages.NPC_LEAVES` with
    `{ npcName, direction }`; `hearing` = `NpcMessages.NPC_HEARD_DEPARTS` with `{}`.
  - arrival (`destination === playerLocation`): `sight` =
    `trait.movementMessages?.enters ?? NpcMessages.NPC_ENTERS` with
    `{ npcName, direction: getOppositeDirection(direction) }`; `hearing` =
    `NpcMessages.NPC_HEARD_ARRIVES` with `{}`.
- In `executeMoveTo`, analogously with `NPC_DEPARTS` / `NPC_ARRIVES` for `sight`
  (no `direction` param) and the same heard IDs for `hearing`.

Helper to keep it DRY:

```ts
private announceMovement(
  npc: IFEntity, world: WorldModel, playerLocation: EntityId,
  from: EntityId, to: EntityId, direction?: DirectionType,
): ISemanticEvent[] {
  const trait = npc.get(NpcTrait) as NpcTrait | undefined;
  if (!trait?.announcesMovement) return [];
  const overrides = trait.movementMessages ?? {};

  let sightId: string;
  let hearingId: string;
  let params: Record<string, unknown>;

  if (from === playerLocation) {            // departure
    sightId = direction ? (overrides.leaves ?? NpcMessages.NPC_LEAVES)
                        : (overrides.departs ?? NpcMessages.NPC_DEPARTS);
    hearingId = NpcMessages.NPC_HEARD_DEPARTS;
    params = { npcName: npc.name, ...(direction ? { direction } : {}) };
  } else if (to === playerLocation) {       // arrival
    sightId = direction ? (overrides.enters ?? NpcMessages.NPC_ENTERS)
                        : (overrides.arrives ?? NpcMessages.NPC_ARRIVES);
    hearingId = NpcMessages.NPC_HEARD_ARRIVES;
    const dir = direction ? getOppositeDirection(direction) : undefined;
    params = { npcName: npc.name, ...(dir ? { direction: dir } : {}) };
  } else {
    return [];                              // move the player can't witness
  }

  return [createEvent('npc.moved.witnessed', {
    npc: npc.id,
    renderings: {
      sight:   { messageId: sightId,   params },
      hearing: { messageId: hearingId, params: {} },
    },
  }, npc.id)];
}
```

> Notes:
> - The emitted `npc.moved.witnessed` event is a sense-neutral *fact*; it is not rendered
>   directly. `PerceptionService` (3.3) replaces it with `renderings.sight` or
>   `renderings.hearing` — whichever sense the player has — and the resulting
>   event's **type** is the selected message ID, which the generic prose handler
>   renders via `getMessage(event.type, data)` (the path `npc.spoke`/`npc.emoted`
>   rely on). The bare `npc.moved` event is retained unchanged for handlers/saves.
> - `NpcService` owns both the visual and heard message IDs (it builds the
>   renderings map). `PerceptionService` stays NPC-agnostic — it selects by sense
>   and imports no NPC message IDs.

### 3.3 stdlib — `packages/stdlib/src/services/PerceptionService.ts`

Select the per-sense rendering for any event that carries a `data.renderings`
map. This is generic — it keys off the *presence* of `renderings`, not off NPC or
movement specifics, so future witnessable facts (combat, object sounds, smells)
reuse it unchanged. In `filterEvents`, handle rendering-bearing events before the
existing visual-event path:

```ts
import { type PerSenseRenderings, SENSE_PRECEDENCE } from '@sharpee/core';

return events.map((event) => {
  const renderings = (event.data as { renderings?: PerSenseRenderings })?.renderings;
  if (renderings === undefined) {
    // ... existing visual-event handling unchanged ...
    return event;
  }
  // Witnessable fact: select by fixed sense precedence, not map key order.
  for (const sense of SENSE_PRECEDENCE) {
    const r = renderings[sense];
    if (r && this.canPerceive(actor, location, world, sense)) {
      return { ...event, type: r.messageId, data: r.params };
    }
  }
  // Present but nothing perceivable (incl. empty `{}`) ⇒ imperceptible.
  return this.createPerceptionBlockedEvent(event, actor, location, world);
});
```

No `NpcMessages` import is needed — the message IDs arrive inside the event, so
`PerceptionService` stays NPC-agnostic (this is the coupling the ADR-069
amendment notes it *removes*). Selection uses the shared `SENSE_PRECEDENCE`
(§3.0), so a lit room picks `sight` and the dark picks `hearing` regardless of
map key order. `canPerceive(actor, location, world, 'hearing')`
is currently always `true`, so in a lit room `sight` wins and in the dark
`hearing` wins; the no-available-sense branch is a future-deafness path.

### 3.4 lang-en-us — `packages/lang-en-us/src/npc/npc.ts`

Add two anonymized hearing-rendering templates (no params):

```ts
'npc.heard_arrives': "You hear someone enter.",
'npc.heard_departs': "You hear someone leave.",
```

And the matching IDs in `packages/stdlib/src/npc/npc-messages.ts`:

```ts
NPC_HEARD_ARRIVES: 'npc.heard_arrives',
NPC_HEARD_DEPARTS: 'npc.heard_departs',
```

The visual defaults (`npc.leaves/enters/arrives/departs`) already exist. All four
plus the two heard variants are author-overridable globally via `extendLanguage`.
Per-NPC override of the *heard* variant is deferred (visual per-NPC override is
supported via `movementMessages`); noted as a future extension.

## 4. Behavior Statements (derive tests from these)

**`NpcService.executeMove(npc, direction, world, playerLocation)`**
- DOES: relocates the NPC (`world.moveEntity(npc.id, destination)`) and emits
  `npc.moved` `{ npc, from, to, direction }`; when `trait.announcesMovement` and
  the move crosses `playerLocation`, additionally emits one `npc.moved.witnessed`
  fact carrying `renderings: { sight, hearing }`.
- WHEN: the NPC has a valid exit in `direction` from its current room.
- BECAUSE: world state (NPC location) is the source of truth handlers and saves
  read; `npc.moved` must fire for every move so that announcement/perception is a
  *pure addition* layered on top, never a precondition for the move itself.
- REJECTS WHEN: no exit in `direction` → no relocation, no `npc.moved`, no
  witnessed fact (the move simply does not happen).

**`NpcService.announceMovement(npc, world, playerLocation, from, to, direction?)`**
- DOES: returns a single `npc.moved.witnessed` event whose `renderings.sight`
  messageId is the per-NPC override or platform default, and `renderings.hearing`
  is the matching anonymized heard ID.
- WHEN: `trait.announcesMovement === true` **and** (`from === playerLocation` xor
  `to === playerLocation`).
- BECAUSE: only player-witnessable crossings produce prose; the renderings map
  defers sense choice to `PerceptionService` so no sense is privileged.
- REJECTS WHEN: `announcesMovement` falsy → `[]`; move touches neither the
  player's room → `[]`.

**`PerceptionService.filterEvents` (rendering-selection branch)**
- DOES: for any event carrying `data.renderings`, replaces it with
  `renderings[sense]` (`{ type: messageId, data: params }`) for the perceiver's
  highest-priority available sense.
- WHEN: `data.renderings` is present and at least one listed sense passes
  `canPerceive`.
- BECAUSE: the player perceives one fact through whichever sense is available;
  selection, not transformation, keeps sight and sound co-equal.
- REJECTS WHEN: no listed sense is perceivable → `createPerceptionBlockedEvent`
  (the fact is imperceptible, not rendered).

## 5. Tests

`packages/stdlib/tests/unit/npc/` (or extend an existing npc-service test):

0. **Move mutates world state (the critical assertion):** NPC with
   `announcesMovement: true` moves `east` from the player's room →
   `world.getLocation(npc.id)` changes from the start room to the destination
   (precondition + postcondition per the stdlib "Action Testing" rule), **and**
   `npc.moved` fires. The announcement assertions below are secondary to this.
1. **Default departure:** NPC with `announcesMovement: true` patrols out of the
   player's room → emits one `npc.moved.witnessed` fact whose
   `renderings.sight = { messageId: 'npc.leaves', params: { npcName, direction } }`
   and `renderings.hearing.messageId === 'npc.heard_departs'`.
2. **Default arrival:** NPC moves into the player's room → `renderings.sight`
   messageId is `npc.enters` with the **opposite** direction.
3. **moveTo:** directionless move in/out → `renderings.sight` messageId is
   `npc.departs` / `npc.arrives`, with no `direction` param.
4. **Silent when off:** `announcesMovement` false/undefined → only `npc.moved`,
   no `npc.moved.witnessed` fact.
5. **Silent when not crossing player room:** move between two non-player rooms →
   no `npc.moved.witnessed` fact.
6. **Per-NPC override:** `movementMessages.leaves = 'zoo.sam.leaves'` → the
   fact's `renderings.sight.messageId` is the custom ID; `renderings.hearing`
   is still `npc.heard_departs`.

Perception (`PerceptionService` test, `packages/stdlib/tests/unit/services/`):

7. **Dark departure → hearing:** player in a dark room → `PerceptionService`
   selects `renderings.hearing`, emitting `npc.heard_departs` with empty data
   (no `npcName`/`direction`).
8. **Dark arrival → hearing:** → `npc.heard_arrives`.
9. **Lit room → sight:** `renderings.sight` is selected, emitting `npc.leaves` /
   `npc.enters` with `{ npcName, direction }`.
10. **Override + dark:** a per-NPC custom `sight` ID is irrelevant in the dark —
    `hearing` is still selected → `npc.heard_departs` (selection is per-sense, not
    per-message-ID).

Lang side (optional): `language-provider` tests confirming `npc.leaves` renders
`"{npcName} leaves to the {direction}."` and `npc.heard_departs` renders
`"You hear someone leave."`.

## 6. Risks / edge cases

- **Darkness:** handled (decision 6 / §3.3) — `PerceptionService` selects the
  `hearing` rendering. Note `npc.emoted`/`npc.spoke` are unaffected: they carry no
  `renderings` map, so they pass through unchanged. Giving NPC speech/emotes their
  own per-sense renderings in the dark is a separate, larger question, out of scope.
- **Hearing model:** `canHear` is currently always `true`. The
  `!canSee && !canHear` (deaf + dark → fully blocked) path is wired but inert
  until a deafness/earplug trait exists.
- **Behavior overlap:** the `wanderer`/`follow` behaviors already emit their own
  `emote` when entering the player's room (`behaviors.ts`). An NPC using one of
  those *and* `announcesMovement` could double up. Left as-is (story flavor);
  documented so authors can choose one or the other.
- **Save/restore:** `announcesMovement`/`movementMessages` are plain trait data,
  serialized with the trait; no special handling.
- **Departure timing:** `executeMove` moves the NPC before emitting; gating is by
  the captured `from`/`to` vs `playerLocation`, not the NPC's post-move location,
  so departures still announce correctly.

## 7. Verification

- `pnpm --filter '@sharpee/world-model' test:ci`
- `pnpm --filter '@sharpee/stdlib' test npc`  + full `test:ci`
- `pnpm --filter '@sharpee/lang-en-us' test:ci`
- Manual/transcript: a patrolling NPC with `announcesMovement: true` produces
  "X leaves to the …" / "X enters from the …" as it crosses the player's room;
  in a dark room the same crossing produces "You hear someone leave/enter."

## 8. Out of scope (noted, not done here)

- Routing plugin/NPC events through `eventProcessor.processEvents()` so
  `registerEventHandler` works for them — a broader platform-consistency change
  (the "deeper" half of #159). Tracked separately if desired.
- Reconciling the `wanderer`/`follow` `announceEntry` emotes with the new flag.
