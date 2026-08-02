# ADR-247 Actor-Scoped `getContents()` Call-Site Audit

> Companion to `docs/architecture/adrs/adr-247-getcontents-worn-default.md`.
> Acceptance-criteria artifact: the **actor-scoped** audit table that must be
> committed alongside the ADR before the flip lands.

## Scope (amended 2026-07-21, session 99aee6)

ADR-247 flips `WorldModel.getContents()` / `getAllContents()` to include worn
items **unconditionally** and **deletes** `ContentsOptions.includeWorn`. Callers
that need the carried/worn split migrate to the new partition
`world.getCarriedAndWorn(holderId): { carried, worn }`.

The ADR's original Q2 mandated a per-site audit of the **full** census (re-counted
at implementation time as **176 non-test sites across 102 files**). David's
2026-07-21 amendment (ADR Status line + Decision "Audit scope" paragraph)
**superseded** that: worn state exists only on **actors**, so the flip is a no-op
by construction for every room / container / supporter holder. Only
**actor/player/NPC-scoped** `getContents` calls can change behavior, and only
those get the committed per-site table below. The remaining ~136 non-actor sites
are covered by the regression surface (per-package suites, the dungeo walkthrough
chain, the transcript batches) — see "Non-actor sites" at the end.

## Method

- Read each site with surrounding context to judge intent.
- Grepped `getContents(` / `getAllContents(` broadly and eyeballed every holder
  that could resolve to an actor (unusual variable names: `entity.id`,
  `target.id`, `recipient.id`, `observer.id`, `context.actorId`, `npc.id`).
  **This surfaced 20 actor-scoped sites beyond the 40 the caller pre-listed**,
  including one mandatory held-only migration the caller missed (`giving.ts:204`).
- Grepped `canCarry` / `getCarriedWeight` / `getCarriedVolume` /
  `getRemainingCapacity`: **no consumers exist outside `actorBehavior.ts` itself**
  (source-only; the `dist`/`dist-esm` hits are build artifacts). Fixing the
  capacity methods at source therefore fixes every transitive consumer — nothing
  else needs its own migration for the capacity path.

## Disposition legend

- **everything** — wants worn included, or neutral to it (correct-or-better after the flip). No change.
- **held-only** — needs carried-not-worn semantics (capacity / count / weight / volume budgets, or `scope:'carried'` "all"-expansion). Migrate to `getCarriedAndWorn(actorId).carried` to preserve today's filtered behavior.
- **fixed-by-flip** — actually wants worn but doesn't pass `includeWorn` today (latent bug the flip corrects). No code change; the flip does the work.
- **doc-only** — a JSDoc `@example`, not live code.

**Total actor-scoped sites classified: 60**
(everything 40 · fixed-by-flip 10 · held-only 9 · doc-only 1)

---

## HELD-ONLY (9) — migrate to `getCarriedAndWorn(...).carried`

| File:Line | Holder | Disposition | Migration action | Notes |
| --- | --- | --- | --- | --- |
| packages/world-model/src/traits/actor/actorBehavior.ts:89 | actor | held-only | `getCarriedAndWorn(actor.id).carried.length` | `canCarry` `maxItems` count. Bare `getContents(actor.id).length` — today excludes worn via the default filter; the flip would inflate the count by worn items. **Mandatory.** |
| packages/world-model/src/traits/actor/actorBehavior.ts:121 | actor | held-only | iterate `getCarriedAndWorn(actor.id).carried` | `getCarriedWeight` — worn items must not count toward the carry-weight budget. **Mandatory.** |
| packages/world-model/src/traits/actor/actorBehavior.ts:131 | actor | held-only | iterate `getCarriedAndWorn(actor.id).carried` | `getCarriedVolume` — worn items must not count toward the carry-volume budget. **Mandatory.** |
| packages/world-model/src/traits/actor/actorBehavior.ts:152 | actor | held-only | `getCarriedAndWorn(actor.id).carried.length` | `getRemainingCapacity` `maxItems` remaining. Same bare-count pattern as :89. **Mandatory.** |
| packages/stdlib/src/actions/standard/giving/giving.ts:204 | recipient actor | held-only | `getCarriedAndWorn(recipient.id).carried` | **CALLER-MISSED.** Recipient inventory-capacity check: `maxItems` via `recipientInventory.length` (line 207) and `maxWeight` via `reduce` (line 216+). Worn items on the recipient would wrongly inflate both budgets. **Mandatory.** |
| packages/stdlib/src/helpers/multi-object-handler.ts:118 | player | held-only | `getCarriedAndWorn(player.id).carried` | `scope:'carried'` "all"-expansion (e.g. `drop all`, `put all in X`). The scope is literally *carried*; IF convention excludes worn from `drop all` (you must remove first). Preserve today's exclude-worn behavior. **Mandatory** (behavior-preserving). |
| packages/stdlib/src/helpers/multi-object-handler.ts:169 | player | held-only | `getCarriedAndWorn(player.id).carried` | Same as :118 — the `scope:'carried'` list-expansion path. **Mandatory** (behavior-preserving). |
| packages/world-model/src/traits/actor/actorBehavior.ts:249 | actor | held-only (already robust) | optional: switch to `.carried`, drop the inline `!WearableBehavior.isWorn` filter | `canTakeItem` `maxItems` count. Already filters worn inline, so it stays correct after the flip. **No change required for correctness**; switch recommended for consistency (filter becomes redundant). |
| packages/stdlib/src/actions/standard/taking/taking.ts:134 | actor | held-only (already robust) | optional: switch to `.carried`, drop the inline worn filter (lines 135–141) | Actor-as-container `maxItems` count. Hand-splits worn out inline already, so correct either way. **No change required for correctness**; switch recommended for consistency. |

---

## FIXED-BY-FLIP (10) — latent bug the flip corrects; NO code change

| File:Line | Holder | Disposition | Migration action | Notes |
| --- | --- | --- | --- | --- |
| packages/stdlib/src/actions/standard/wearable-shared.ts:34 | actor | fixed-by-flip | none | Layering-conflict check looks for `invItem` where `otherWearable.worn`, but never passes `includeWorn` — so today it finds nothing (dead check). The flip makes it work. (Caller-analyzed.) |
| packages/world-model/src/world/VisibilityBehavior.ts:257 | observer actor | fixed-by-flip | none | "Can always see what you're carrying by feel" in the dark. Today filters worn out — a worn item is invisible in a dark room. The flip is exactly ADR-247's intent (issue #8: worn items invisible). |
| packages/world-model/src/world/VisibilityBehavior.ts:315 | observer actor | fixed-by-flip | none | Adds carried items to the visible set. Same latent exclusion of worn as :257; the flip realizes the ADR AC "a worn item appears in LOOK/EXAMINE contents where visibility says it should." |
| packages/world-model/src/world/WorldModel.ts:1564 | actor (`context.actorId`) | fixed-by-flip | none | `default_inventory_visibility` scope rule — "carried items are always in scope." Worn items should be in scope too; the flip corrects it. |
| stories/cloak-of-darkness/src/index.ts:172 | player (`context.actorId`) | fixed-by-flip | none | Darkness scope rule detects whether the player carries the **velvet cloak** — which is the item the player *wears*. Today a worn cloak would not be detected; the flip makes the darkness mechanic robust to worn state. |
| stories/cloak-of-darkness/src/index.ts:208 | player (`context.actorId`) | fixed-by-flip | none | Inventory-visibility scope rule; same worn-cloak detection as :172. |
| packages/stdlib/src/actions/standard/switching-shared.ts:60 | actor | fixed-by-flip | none | "Other active light sources carried" check when switching a light off. A worn lit lantern still illuminates and should count as present light; today it is wrongly excluded. |
| packages/stdlib/src/validation/command-validator.ts:1395 | player | fixed-by-flip | none | `isInPlayerInventory` — a worn item *is* in the player's inventory (and reachable). Today excluded; the flip makes scope/touchable checks recognize worn items. |
| packages/world-model/src/traits/combatant/combatantBehavior.ts:101 | combatant actor | fixed-by-flip | none | `dropsInventory` on death drops all held items to the location; worn items should drop too (currently left on the corpse). |
| packages/extensions/basic-combat/src/combat-service.ts:326 | target actor | fixed-by-flip | none | Same drop-inventory-on-death pattern as combatantBehavior:101, in the basic-combat extension. |

---

## DOC-ONLY (1) — no live code

| File:Line | Holder | Disposition | Migration action | Notes |
| --- | --- | --- | --- | --- |
| packages/world-model/src/capabilities/action-interceptor.ts:304 | actor (`actorId`) | doc-only | none (optionally refresh example) | Inside a JSDoc `@example` block (the "boat puncture interceptor" illustration), not executable code. |

---

## EVERYTHING (40) — worn inclusion is correct-or-better; no behavior change

Two of these are disposition **everything** but still require an edit purely to
drop the **deleted `includeWorn` option** — flagged **[opt-removal]** and carried
into the migration summary:

| File:Line | Holder | Disposition | Migration action | Notes |
| --- | --- | --- | --- | --- |
| packages/stdlib/src/actions/standard/inventory/inventory.ts:63 | player | everything **[opt-removal + partition]** | replace `getContents(player.id,{includeWorn:true})` **and** the hand-rolled worn/held split (lines 63–80) with `const { carried, worn } = getCarriedAndWorn(player.id)` | Currently opts in explicitly (the documented narrow fix). The flip deletes the option; the split is exactly what `getCarriedAndWorn` returns. |
| packages/transcript-tester/src/condition-evaluator.ts:287 | player | everything **[opt-removal]** | drop the `{ includeWorn:true }` arg — plain `getContents(playerId)` | `inventory contains "X"` assertion genuinely wants worn included (a worn item satisfies "inventory contains"); after the flip that is the default. |
| packages/stdlib/src/npc/npc-service.ts:436 | NPC | everything | none | `npcInventory` passed to NPC behaviors; worn items on an NPC are possessed. |
| packages/world-model/src/world/VisibilityBehavior.ts:315 (carried loop) | — | *(see fixed-by-flip)* | — | listed above under fixed-by-flip. |
| stories/channel-service-test/src/channels.ts:52 | player | everything | none | Debug-stats channel inventory **count**; a raw counter, not a capacity budget — worn inclusion has no correctness impact. |
| stories/cloak-of-darkness/src/debug-runner.ts:86 | player | everything | none | Debug listing of player inventory; wants to show everything incl. the worn cloak. |
| stories/cloak-of-darkness/src/index.ts:147 | player | everything | none | Debug `console.log` of player contents after setup. |
| stories/cloak-of-darkness/src/test-runner.ts:113 | player | everything | none | Debug `debug:location` inventory dump. |
| stories/dungeo/src/actions/break/break-action.ts:50 | player | everything | none | "find breakable item in inventory" — possession check; a worn item is still possessed; dungeo has no worn items in play. |
| stories/dungeo/src/actions/burn/burn-action.ts:89 | player | everything | none | "find burnable item" possession check (neutral — no worn items on this holder in practice; worn is possessed). |
| stories/dungeo/src/actions/deflate/deflate-action.ts:40 | player | everything | none | "find boat in inventory" possession check (neutral). |
| stories/dungeo/src/actions/fill/fill-action.ts:20 | player | everything | none | "find bottle in inventory" possession check (neutral). |
| stories/dungeo/src/actions/gdt/gdt-context.ts:104 | player | everything | none | `getInventory()` for the GDT debug console; wants everything. |
| stories/dungeo/src/actions/incant/incant-action.ts:140 | player | everything | none | Checks whether the player already holds the elvish sword before granting it (neutral). |
| stories/dungeo/src/actions/inflate/inflate-action.ts:50 | player | everything | none | Inventory scan (neutral). *(Second getContents in this file; caller listed :62 only.)* |
| stories/dungeo/src/actions/inflate/inflate-action.ts:62 | player | everything | none | "find boat in inventory" possession check (neutral). |
| stories/dungeo/src/actions/pour/pour-action.ts:20 | player | everything | none | "find water in inventory" possession check (neutral). |
| stories/dungeo/src/actions/ring/ring-action.ts:34 | player | everything | none | "find bell in inventory" possession check (neutral). |
| stories/dungeo/src/actions/say/say-action.ts:90 | player | everything | none | `hasPlatinumBar` possession check (neutral). |
| stories/dungeo/src/actions/tie/tie-action.ts:189 | player | everything | none | "player has rope" possession check (neutral). |
| stories/dungeo/src/actions/turn-bolt/turn-bolt-action.ts:210 | player | everything | none | `playerHasWrench` possession check (neutral). |
| stories/dungeo/src/actions/wind/wind-action.ts:36 | player | everything | none | Possession check (neutral). *(Caller-missed; same pattern.)* |
| stories/dungeo/src/actions/dig/dig-action.ts:36 | player | everything | none | "player has shovel"-style possession check (neutral). *(Caller-missed.)* |
| stories/dungeo/src/actions/wave/wave-action.ts:37 | player | everything | none | Possession check (neutral). *(Caller-missed.)* |
| stories/dungeo/src/handlers/chimney-handler.ts:95 | player | everything | none | `getPlayerInventory` id list for chimney weight/held logic; a possession snapshot (neutral). |
| stories/dungeo/src/handlers/endgame-trigger-handler.ts:61 | player | everything | none | "player has a lit light source" check; a worn lit source would still count — correct-or-better (neutral in dungeo). |
| stories/dungeo/src/handlers/endgame-trigger-handler.ts:101 | player | everything | none | `stripPlayerInventory` moves all items to limbo; stripping worn too is more correct (neutral in dungeo — nothing worn). |
| stories/dungeo/src/handlers/tiny-room-handler.ts:78 | player | everything | none | `findMat` possession check (neutral). |
| stories/dungeo/src/handlers/tiny-room-handler.ts:96 | player | everything | none | `findScrewdriver` possession check (neutral). |
| stories/dungeo/src/interceptors/gas-room-entry-interceptor.ts:39 | actor | everything | none | "carrying a lit flame source" check; a worn lit flame should still trigger the gas explosion — correct-or-better (neutral in dungeo). |
| stories/dungeo/src/interceptors/inflatable-entering-interceptor.ts:80 | actor | everything | none | "carrying a sharp object" boat-puncture check; a worn sharp object still punctures — correct-or-better (neutral). |
| stories/dungeo/src/interceptors/melee-interceptor.ts:308 | actor | everything | none | "has a weapon" unarmed-attack check; a worn weapon would still arm you — correct-or-better (neutral). |
| stories/dungeo/src/scheduler/bank-alarm-daemon.ts:34 | player | everything | none | "carrying bank treasures" check; a worn treasure is still carried — correct-or-better (neutral). |
| packages/stdlib/src/combat/weapon-utils.ts:24 | combatant actor | everything | none | `findWieldedWeapon` scans inventory for weapons; worn weapon inclusion is neutral/better. *(Caller-missed.)* |
| packages/extensions/basic-combat/src/basic-npc-resolver.ts:75 | NPC | everything | none | Finds the NPC's weapon in inventory (neutral). *(Caller-missed.)* |
| packages/stdlib/src/actions/standard/attacking/attacking.ts:223 | player | everything | none | Weapon inference from inventory fallback; neutral. *(Caller-missed.)* |
| stories/friendly-zoo/src/index.ts:186 | player | everything | none | FEED action "has feed?" possession check (neutral). *(Caller-missed.)* |
| stories/friendly-zoo/src/index.ts:234 | player | everything | none | PHOTOGRAPH action "has camera?" possession check (neutral). *(Caller-missed.)* |
| packages/extensions/testing/src/context/debug-context.ts:115 | player | everything | none | Test/debug harness inventory accessor; wants everything. *(Caller-missed.)* |
| packages/extensions/testing/src/annotations/context.ts:21 | player | everything | none | Test annotation inventory snapshot; wants everything. *(Caller-missed.)* |
| packages/engine/examples/basic-demo.ts:143 | player | everything | none | Example script inventory dump; not shipped. *(Caller-missed.)* |

---

## Migration summary (Phase 4–5 work)

Everything that requires a real code edit. Nothing else in the table changes.

### Mandatory — preserve today's carried-not-worn behavior (`→ .carried`)

1. `packages/world-model/src/traits/actor/actorBehavior.ts:89` — `canCarry` item count.
2. `packages/world-model/src/traits/actor/actorBehavior.ts:121` — `getCarriedWeight`.
3. `packages/world-model/src/traits/actor/actorBehavior.ts:131` — `getCarriedVolume`.
4. `packages/world-model/src/traits/actor/actorBehavior.ts:152` — `getRemainingCapacity` item count.
5. `packages/stdlib/src/actions/standard/giving/giving.ts:204` — recipient `maxItems`/`maxWeight` capacity check. **(Caller-missed — the only mandatory migration outside the pre-listed 40.)**
6. `packages/stdlib/src/helpers/multi-object-handler.ts:118` — `scope:'carried'` all-expansion.
7. `packages/stdlib/src/helpers/multi-object-handler.ts:169` — `scope:'carried'` list-expansion.

> Fixing 1–4 at source (`actorBehavior`) transitively fixes every capacity
> consumer; the grep confirmed there are **no capacity-method callers outside
> `actorBehavior` itself**, so no other capacity migration is needed.

### Mandatory — deleted-option removal / partition adoption

8. `packages/stdlib/src/actions/standard/inventory/inventory.ts:63` — replace `getContents(..,{includeWorn:true})` + hand-rolled worn/held split with `getCarriedAndWorn(player.id)` (disposition *everything*).
9. `packages/transcript-tester/src/condition-evaluator.ts:287` — drop the now-deleted `{includeWorn:true}` arg (disposition *everything*; worn stays included by default).

### Recommended (optional) — already correct, cleaned up for consistency

10. `packages/world-model/src/traits/actor/actorBehavior.ts:249` — `canTakeItem` count; switch to `.carried`, drop redundant inline worn filter.
11. `packages/stdlib/src/actions/standard/taking/taking.ts:134` — actor-as-container count; switch to `.carried`, drop redundant inline worn filter (lines 135–141).

### No code change (verification only)

- All 10 **fixed-by-flip** sites — the flip corrects them for free. New ADR-247
  tests should assert the corrected behavior at the visibility sites
  (`VisibilityBehavior.ts:257/315`) and the cloak-of-darkness scope rules
  (`index.ts:172/208`), which directly realize the ADR's "worn item appears in
  LOOK/EXAMINE contents" acceptance criterion.
- `action-interceptor.ts:304` — doc-only; refresh the `@example` if desired.

---

## Non-actor sites

~136 non-actor `getContents` / `getAllContents` sites (rooms, containers,
supporters) are **no-ops under the flip** — worn state exists only on actors, so
the returned set is identical before and after. Per the 2026-07-21 amendment
these are **not tabulated**; they are covered by the regression surface
(per-package suites, the dungeo walkthrough chain, and the transcript batches).
