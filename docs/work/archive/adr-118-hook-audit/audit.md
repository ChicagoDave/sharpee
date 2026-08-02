# ADR-118 Interceptor Hook Audit

**Date**: 2026-07-16 (session c39d83, branch chord-foundations)
**Trigger**: parked follow-up from session accf8b — the eating/throwing silent-seam class: which stdlib actions lack ADR-118 hooks vs. what Chord routes to interceptors.
**Method**: 8 parallel read-only agents (4 grading the 14 wired actions, 4 classifying the 19 unwired object-verbs) + direct verification of pushing/putting/reading/switching_on, Chord routing, and registered-interceptor exposure. Findings only — no code changed.

## The Chord seam (why every gap is author-visible)

- The loader routes ANY entity clause `on <gerund> it` that is not an EVENT_TRIGGERS verb (`entering` only — `packages/story-loader/src/event-contract.ts:22`) and not a Chord-declared action to `world.registerActionInterceptor(trait, 'if.action.<gerund>', ...)` (`packages/story-loader/src/runtime.ts:149-155`).
- Routing is decided solely by `actionSlots.has(clause.action)` (`packages/chord/src/analyzer.ts:1055`) — **no validation that the gerund names a stdlib action that consults interceptors, or any action at all**. A clause targeting an unwired action registers and is never consulted: silently dead.
- Current `.story` exposure is safe: only `examining` and `reading` (both wired) plus Chord-declared `feeding`/`petting` (capability path).

## A. Unwired actions — Chord `on <gerund> it` is silently dead (19)

| Action | ID | Mutates? | Author plausibility | Notes |
|---|---|---|---|---|
| drinking | if.action.drinking | yes (consume, liquid, implicit take) | VERY HIGH | sibling `eating` IS wired |
| pulling | if.action.pulling | yes (pullable state) | VERY HIGH | file header says "story authors handle specific pulling logic" |
| touching | if.action.touching | no (sensory) | VERY HIGH | hot stove / cursed idol staple |
| switching_off | if.action.switching_off | yes | HIGH | **asymmetric**: switching_on wired (switching_on.ts:109), switching_off not; switching-shared.ts gives no coverage |
| searching | if.action.searching | yes (reveals concealed) | HIGH | haystack/desk staple |
| unlocking / locking | if.action.unlocking / .locking | yes (LockableBehavior) | HIGH | opening/closing wired; lock family not |
| wearing / taking_off | if.action.wearing / .taking_off | yes (WearableBehavior) | HIGH | cursed-ring staple; taking_off already has ad-hoc trait-flag refusals (taking-off.ts:122-128) |
| climbing | if.action.climbing | yes (moveEntity ×2) | HIGH | |
| giving | if.action.giving | yes (moveEntity) | HIGH | recipient has an execute-phase-only ADR-090 capability seam (giving.ts:204); the ITEM side is fully dead; no validate-phase block possible |
| showing | if.action.showing | no | HIGH | NPC reactions today = legacy `customProperties.reactions` string-matching (showing.ts:85-104) — exactly what an interceptor should replace |
| talking | if.action.talking | no | HIGH | NPC greeting/plot trigger |
| removing | if.action.removing | yes | HIGH | see delegation seams below |
| inserting | if.action.inserting | yes (via putting) | MEDIUM | see delegation seams below |
| smelling | if.action.smelling | no | MED-HIGH | no interceptor AND no trait-driven custom scent — no clean seam at all |
| listening | if.action.listening | no | MEDIUM | |
| hiding | if.action.hiding | yes (ConcealedStateTrait) | MEDIUM | |
| exiting | if.action.exiting | yes (moveEntity) | MEDIUM | affected entity is implicit (current container) — never a parsed object; wiring would need a design decision |

**Exempt (correctly so)**: lowering, raising — `createCapabilityDispatchAction` full delegation (ADR-090/118 by design). BUT Chord still accepts `on lowering it` and registers a dead interceptor — Chord should reject or re-route those gerunds.
**Exempt (meta/no entity)**: about, again, help, inventory, looking, quitting, restarting, restoring, saving, scoring, sleeping, undoing, version, waiting; deadly-room-death (internal redirect target).
**Note**: constants.ts also declares IDs with no implemented action (tasting, kissing, waving, turning, setting, emptying, consulting, jumping, ...) — a Chord clause on those is equally dead, one layer earlier.

## B. Wired actions (14) — path and entity gaps

All 14 resolve interceptors and invoke all 5 hooks on their happy single-object path. The gaps are per-path and per-entity:

### B1. Multi-object command bypass (worst class)
- **putting**: validate returns into `validateMultiObject` BEFORE interceptor resolution (putting.ts:357 vs :384); execute multi path returns before postExecute (:458 comment "don't support interceptors currently"); report multi path returns before postReport (:503-511). **ALL 5 hooks dead for "put all in X"**.
  - **LIVE DUNGEO BUG (code-verified)**: `TrophyCasePuttingInterceptor` is postExecute-only → `world.awardScore()` (trophy-case-putting-interceptor.ts:5,18). "put all in case" / "put X and Y in case" deposits treasures with **no score awarded**. Needs a transcript to confirm parser accepts multi-put, then a fix decision.
- **dropping**: multi path skips all 5 hooks (validateMultiObject :113-144, execute :345-353, report :383-396); `reportSingleBlocked` (:246-262) emits per-item blocked without onBlocked.
- **taking**: pre/postValidate/postExecute/postReport DO run per item, but **onBlocked never fires on any multi path** — per-item failures go through `reportSingleBlocked` (taking.ts:341-356) and the all-fail path deleted `_interceptor` from sharedData (:200-201) before blocked() checks it (:497). "take all" loses e.g. the white-hot axe custom message (block itself still holds).

### B2. Second-entity gaps (the original throwing-bug class)
- **attacking**: weapon (instrument/indirectObject, attacking.ts:98) never interceptor-checked; inferred weapon likewise (and inference happens post-validate).
- **going**: the DOOR (`exitConfig.via`, going.ts:217) never checked — door refusals can only come from Lockable/Openable state. Source room (GOING) and destination room (ENTERING_ROOM, ADR-126) are both fully wired.
- **putting**: container/supporter only (by documented design, putting.ts:383) — a trait on the ITEM being put is dead (interceptorData carries itemId/itemName to the container's interceptor instead).
- **throwing**: single-winner rule — target-keyed wins and the item is not even resolved (throwing.ts:178-179). Item interceptor works only when the target has none.
- **dropping**: drop destination (container/supporter player is inside) never checked.

### B3. Phase skips on specific paths
- **throwing**: when the target has an ADR-090 capability behavior (glacier/troll), execute and report return early (:334, :503) — an item-keyed interceptor's postExecute/postReport are dead for that command. validate/blocked hooks still fire.
- **attacking**: postExecute only fires on the COMBATANT branch (:213); postReport skipped when a non-combat attack fails (early return :352-361).
- **going**: dark-destination success path returns early (:439-448) BEFORE both postReport hooks — the exact path that emits `if.event.went`, so darkness-message overrides can never fire.
- **eating/reading/entering/switching_on**: postReport guarded on re-read `directObject?.entity` truthiness — silently skipped if absent at report time (minor).

### B4. Semantic inconsistencies across the 14 (author-visible contract drift)
- **pre/postValidate guard split**: canonical `result !== null && !result.valid` (taking, eating, examining, reading, closing, opening) vs **short-circuit on ANY non-null** including `{valid:true}` — skipping remaining standard validation and later hooks (dropping, entering, pushing, putting, switching_on, throwing-preValidate, attacking, going-postValidates). In going, a source postValidate `{valid:true}` also skips the destination hook; in attacking it skips visibility/reach/self-attack checks.
- **onBlocked semantics split**: REPLACE standard blocked event (dropping, eating, entering, going, opening, closing, pushing, putting, switching_on, throwing) vs APPEND after it (taking, examining, reading). examining also treats `[]` as append-nothing while replace-actions treat `[]` as suppress.
- Cosmetic: examining/reading hardcode `'if.action.examining'`/`'if.action.reading'` instead of IFActions constants; sharedData key naming `_interceptor` vs `interceptor`; opening has a dead local sharedData object (:163-165).

### B5. Delegation seams (registry-key mismatches)
- **inserting → putting**: inserting delegates all phases to puttingAction (inserting.ts:133/:159/:192) — so hooks fire, but keyed on `if.action.putting` on the container. `on inserting it` registers under `if.action.inserting`: dead. `on putting it` on the container fires for INSERT commands.
- **removing ≠ taking**: removing implements its own take (moveEntity, removing.ts:414-428) and emits `if.event.taken`, but consults NEITHER `if.action.removing` NOR `if.action.taking` interceptors. A taking interceptor (TrollAxe pattern) is bypassable via "REMOVE X FROM Y" when the item sits in a container/on a supporter. Needs transcript verification per-case, but the code path is unambiguous.

## C. Registered-interceptor exposure today

- **Dungeo** (16 registrations, index.ts + cake-handler.ts): all target wired actions (taking ×3, talking… — note TrollTalkingInterceptor targets `if.action.talking` which is **UNWIRED** — see below, eating, throwing ×2, entering, entering_room, putting ×2, dropping, opening, closing, pushing, attacking).
  - **ACTIVE dead registration — canon regression**: `TrollTalkingInterceptor` on `if.action.talking` (index.ts:273-278) — talking.ts never consults interceptors. The interceptor is preValidate-only and implements MDL canon: "Unfortunately, the troll can't hear you" when the troll is incapacitated (troll-capability-behaviors.ts:93-114). Dead → TALK TO TROLL while it's unconscious gets the standard talking response instead. No transcript covers talk-to-troll, which is why it never surfaced. (Registration comment says these were converted from capability behaviors for ISSUE-052 — taking/attacking got wired actions, talking didn't.)
  - **ACTIVE path bug**: trophy case multi-put scoring (B1).
  - Latent: melee weapon slot (B2), take-all axe message (B1), remove-from bypass (B5).
- **Chord stories**: examining/reading only — currently safe.

## D. Recommendation sketch (for discussion — platform changes need approval)

1. **Chord loader fail-fast** (cheapest, closes the authoring trap): validate the gerund at load time against a published wired-action list (or at minimum against implemented action IDs); reject `lowering`/`raising` toward capability routing. Mirrors the existing role-clause "not wired yet" precedent.
2. **Wire the high-plausibility unwired set** (drinking, pulling, touching, switching_off, searching, locking/unlocking, wearing/taking_off) using the eating.ts pattern.
3. **Fix the multi-object bypass** in putting (live bug) and dropping/taking-onBlocked.
4. **Decide the contract** for the B4 splits (guard semantics; onBlocked replace-vs-append) and write it into ADR-118 as an amendment; then align outliers.
5. **Delegation seams**: removing should consult taking interceptors (or its own + taking's); inserting is arguably fine but should be documented; TrollTalkingInterceptor registration needs a decision (wire talking or re-home the logic).
