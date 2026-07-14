# Zoo `.story` Draft — Gaps Report

Companion to `zoo-story-draft.story` (2026-07-11). Every friendly-zoo TS
behavior the draft could NOT express in the current Chord grammar (Phase A +
Phase B declarations per `docs/reference/chord-grammar.md`), one line each.
Source of truth: `stories/friendly-zoo/src/*.ts`.

## Inexpressible — omitted entirely

1. **Victory daemon** (`events.ts` `createVictoryDaemon`): fires on
   `score >= MAX_SCORE` — no score-comparison condition in the condition kit
   (comparisons are Phase C); `win` exists but nothing can trigger it. The
   `victory` text is transcribed as an unused phrase entry.
2. **Zookeeper patrol** (`index.ts` `createPatrolBehavior` route Main Path →
   Petting Zoo → Aviary, waitTurns 1): no NPC-movement construct; the
   behavior hatch binds `CapabilityBehavior`, not `NpcBehavior`.
3. **Presence slot contributors** (ADR-195 `{slot:here}`, `index.ts`
   `registerSlotContributor` + `PresenceMessages`): no Chord construct for
   realize-time slot contribution; the four presence clauses are transcribed
   as unused phrase entries (`presence-*`).
4. **Gift-shop `{snippet:pins}` snippet** (ADR-209, `zoo-items.ts`
   `RoomTrait.snippets`): no snippet construct; the room description is
   transcribed without the marker, losing the cycling texts and the
   `mentions` presence gate.
5. **Entrance `initialDescription`** (first-visit flavor, `zoo-map.ts`): no
   first-visit description construct, and `enters` never fires for the
   starting room at turn 0, so an ordinal when-rule can't emulate it.
6. **Collect-map score** (`if.event.taken` chain): event verb `takes` is not
   in the when-rule verb set (`enters` + author-defined action verbs only);
   an `on taking it` interceptor would replace stdlib taking, not augment it.
7. **Penny press** (`if.event.put_in` chain: destroy penny, create pressed
   penny in inventory, award, CLUNK message): needs a `puts-in` event verb
   plus runtime entity create/destroy — none exist. `collect-pressed-penny`
   score is declared but unawardable.
8. **Goats-eat-feed drop chain** (`if.event.dropped` chain + `goats-fed`
   flag + reaction text): event verb `drops` not in the verb set.
9. **Dynamic-text C1 gate status** (`dynamic-text.ts` `gateStatusEvent`,
   `GATE_STATUS` template): the examined-chain reaction with a
   producer-resolved Optional `{openClause}` has no Chord consumer construct,
   and transcribing the template would leave `{openClause}` an unbound
   marker (load gate). Omitted.
10. **NPC speech framing**: TS parrot lines go through `npc.speech` /
    `npc.emote` message formatting; Chord `phrase` emits the raw line.
11. **Runtime keeper removal** (`world.removeEntity`): no destroy statement —
    approximated by moving the zookeeper to an added off-map **Staff Parking
    Lot** room (the `zoo-timeline.story` fixture precedent); that room and
    its one-line description are authored glue, not in the TS.
12. **Flashlight `detailWhenLit` / `detailWhenOn`, radio `detailWhenOn`**
    (ADR-195 S2 examine detail slots): no config keys for these in the trait
    catalog; `light-source`/`switchable` composed without them.
13. **Player inventory capacity** (`maxItems: 10` ContainerTrait on the
    player): no player composition/config surface in `create the player`.
14. **`SCORE_GAINED` message id** (`scoring.ts`): declared in TS constants
    but never registered with text — nothing to transcribe.

## Approximations — expressed, but not behavior-identical

15. **Staff gate as a door**: `a door … between` is not in the implemented
    grammar, so the gate is lockable/openable **scenery in the Main Path**
    plus a `gate-closed` flag driving conditional blocked exits on both
    sides (Main Path south, Supply Room north). Unverified: whether the
    `on opening it`/`on closing it` clauses compose with (or replace) the
    stdlib openable/lockable pipeline, and whether `lockable with key …`
    starts locked (TS: `isLocked: true`). The `staff-gate-blocked` phrase
    text is authored glue — TS used stdlib door messaging. From the Supply
    Room side the gate entity itself is out of scope (it lives in Main
    Path), unlike a real two-sided door.
16. **Feeding-time fuse** (`turns: 10, repeat, originalTurns: 8`): `every 8
    turns` cannot express the first-fire-at-10 offset; and the
    `bleat_turns_remaining = 3` countdown has no numeric-counter equivalent —
    bleating instead runs while `feeding-time-active` until the goats are
    fed (TS also self-expires after 3 bleats).
17. **Goat bleating room check**: TS gates output on the player being in the
    Petting Zoo; the `restless` trait uses `the player can see it`
    (equivalent while the goats stay scenery in that room).
18. **After-hours parrot chance 0.6**: only `one chance in <n>` exists —
    approximated as `one chance in 2` (0.5), same as daytime.
19. **Keeper-departure witness award**: TS compares the keeper's room id to
    the player's; the once-rule uses `the player can see the zookeeper`.
20. **Feeding refusal order**: TS checks feed-in-inventory (`no-feed`)
    before target validity (`not-an-animal`); Chord dispatch resolves the
    target first, so a feedless `feed goats` yields `no-feed` but `feed
    bench` yields `not-an-animal` regardless of feed possession.
21. **Targetless `photograph`** (TS falls back to "the scenery" and still
    awards): grammar patterns require the `:target` slot; and the TS
    `{target}` raw-name param became the `{the target}` formatter form.
22. **Snake pettable kind**: TS defines the `snake` kind and the
    `zoo.petting.snake_glass` message id but registers **no snake entity and
    no message text** — the kind is kept in the trait's `one of` enum with
    no `select` arm and no entity (the after-hours snake voice needs none).
23. **Dynamic-text C2 parrot flavor hatch**: bound as `define text flavor
    from "./dynamic-text.ts"` with `{flavor}` in the parrot's description,
    but `dynamic-text.ts` currently exports only `registerDynamicText`
    (chain wiring) — it needs a named `PhraseProducer` export (like Cloak's
    `extras.garbled`) carrying the cycling `parrotCycle` Choice + firstTime
    `parrotAside`; the description-marker placement also renders inline
    rather than as the TS per-examine reaction line.
24. **Dotted message ids**: `define phrases` entry keys are single WORDs (no
    dots), so TS ids like `zoo.petting.goats` became hyphenated keys; only
    declare-and-emit `phrase` statements carry the dotted `zoo.*` keys.
25. **Verb surface**: index.ts registers `pet`/`stroke` (not `pat`) — the
    draft follows the TS (`pet :animal` / `stroke :animal`).
