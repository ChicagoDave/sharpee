# Design: IF-Centric Player-Death Trigger Patterns (Chord-Mirrorable)

> **SUPERSEDED for decisions by ADR-227** (`docs/architecture/adrs/adr-227-death-trigger-patterns.md`).
> This doc's grounding (site inventory, Chord/scheduler/combat surface) stands, but its
> earlier framing invented two mechanisms — a "death-rule registry" and a
> "`createHazardFuse` factory" — which ADR-227 **rejects**. The correct model: death
> triggers use the *existing* prescribed logic surfaces (Trait+Behavior, Capability
> Dispatch, Interceptor, Story Action, Scheduler daemon/fuse, NPC resolver; policy = State
> Machine), each calling `killPlayer`; event handlers are reactions, not triggers. Read
> ADR-227 for the decisions; use the sections below only for the grounding detail.

**Status**: SUPERSEDED by ADR-227 (grounding retained)
**Parent**: ADR-224 (Conditional/Hazard Death). This design resolves what ADR-224 Decision 3 *deferred* as "interceptor/daemon patterns... an implementation-plan decision" — the deferral that made the Dungeo migration bespoke.
**Goal**: The death model must be IF-centric so **Chord mirrors it 1:1**, so Dungeo can eventually be ported to Chord. `killPlayer` (the primitive) is done; this design is about the **triggers**.

---

## 0. The unifying model — everything is a "death rule"

`killPlayer(world, player, {cause, messageId, terminal})` is the single mortality primitive (ADR-224, built). Every death in IF reduces to **a rule that calls it**:

> **Death rule** = `(when: trigger) [if: condition] → killPlayer(cause, messageId)`

This is the Inform-7 rulebook shape ("Instead of &lt;action&gt; when &lt;condition&gt;: end the story"). The 4 patterns below are **specializations of one death-rule concept**, not four unrelated mechanisms — which is the antidote to the bespoke per-site wiring:

| Pattern | Specialization of the death rule | Platform primitive | Chord surface |
|---|---|---|---|
| 1. Deadly room | trigger = "a non-safe verb, in this room"; optional `chance` | `DeadlyRoomTrait` ✅ built | `deadly` room marker (unbuilt) |
| 2. Kill-when-condition | trigger = an action/event; `if` = an arbitrary condition | **death-rule registry** ❌ new | `kill the player when <cond>` (unbuilt) |
| 3. Timed hazard | trigger = "N turns after arming"; `if` = player-in-danger | **hazard fuse** ❌ new | ADR-217 timer + a kill-when clause |
| 4. Combat death | trigger = "an NPC lands a lethal blow" | NPC/combat capability (story-local) | ADR-215/072 (likely deferred) |

**Pattern 1 is a special case of Pattern 2** (a deadly room *is* "kill when the player does a non-safe verb here"). So the core primitive is the **death rule (Pattern 2)**; deadly-room and timed-hazard are ergonomic specializations over it; combat is a genre-specific producer that calls the same `killPlayer`. Designing Pattern 2 as the spine keeps the whole model coherent and Chord-mirrorable.

### IF-standard framing (why this is "IF-centric")
- **Inform 7**: death is a *rule* — `Instead of eating the orange cake: end the story saying "..."`; a deadly room is `Instead of doing something other than looking in the Deadly Room: ...`. Rulebooks = condition→consequence. Pattern 2 is the direct analog.
- **TADS 3**: fuses and daemons are first-class; timed hazards are the fuse/daemon idiom. Sharpee already has fuses/daemons (Pattern 3 builds on them).
- **Combat is genre-specific, not core IF.** Most parser IF has no combat. So Pattern 4 being a story-local capability that merely *calls* `killPlayer` is IF-consistent, and full combat correctly stays out of the core death model.

---

## 1. Deadly room (BUILT — reframe + finish the Chord half)

**Primitive** (Phase 2, built): `DeadlyRoomTrait {cause, messageId?, safeVerbs[], chance?}` + a `ParsedCommandTransformer` that redirects a non-safe verb in a deadly room to the generic `if.action.deadly_room_death` action, which calls `killPlayer`. Engine auto-registers the transformer, so every story (TS or Chord) gets it free.

**IF semantics**: "In this room, every verb except the safe list is fatal" (optionally only `chance` of the time). Pure verb-allowlist.

**Dungeo sites it covers**:
- **Falls (Aragain Falls)**: `DeadlyRoomTrait{safeVerbs:['looking'], cause:'aragain_falls', messageId: FALLS_DEATH}` on the fall-risk room(s). Exact fit — replaces the bespoke `createFallsDeathTransformer`/`isSafeAction` global allow-list (the plan's Phase-4 deliverable I shortcut with a raw `killPlayer` re-point).
- **Grue** — *reconsidered*: Zork's grue is **not** a per-room marker. It's a **global rule**: "move in *any* dark room without light → ~75% death." That's Pattern 2 (kill-when-condition: `when moving`, `if room is dark and player has no light`, `chance 0.75`), not a `DeadlyRoomTrait` you'd stamp on hundreds of dark rooms. Keep grue as a single global death rule. (`DeadlyRoomTrait.chance` still validly covers a *specific* probabilistic deadly room if a story wants one.)

**Chord surface** (unbuilt, ADR-224 Decision 5): a `deadly` room marker + `safe: look, examine` + optional `chance <p>`, lowering to `DeadlyRoomTrait`. Fail-fast validation if `deadly` without `safe:` (ADR-226 AC-7 precedent). *(This was plan Phase 5.)*

---

## 3. Timed hazard (NEW primitive — grounded)

**The gap** (grounded): ADR-217 gives Chord the raw fuse/daemon spellings (`in N turns:`, `after N turns as <name>:`, entity-bound timers, `on every N turns`, `reschedule`/`cancel`), but **no hazard-specific primitive** — the "kill the player if they're still in danger when the timer fires" logic is hand-written every time. Dungeo re-derives it in 4 files.

**The shared shape** (grounded — all 4 Dungeo timed deaths collapse to this):
1. **Arm** — an external action starts the timer (button press, interceptor, lighting a fuse).
2. **Countdown N turns** — a `Fuse.turns` (or a daemon counter for periodic ones like the balloon's every-3-turns).
3. **Optional tick-gate** — the hazard only advances while a condition holds (`Fuse.tickCondition`: wire still burning; trapped flag set).
4. **Optional warning ladder** — escalating messages shown *only when the player is present* (gas thickening, water rising).
5. **Fire** — evaluate an `inDanger(ctx)` predicate (player in room / in vehicle / in blast zone) → `killPlayer(cause, messageId)` if in danger, else an ambient near-miss message.

**Proposed platform primitive** — a generic **hazard fuse factory** in stdlib (built on the existing `plugin-scheduler` `Fuse`; `SchedulerContext` already carries `playerLocation`, `playerId`, seeded `random`):

```
createHazardFuse({
  id, turns,
  tickCondition?: (ctx) => boolean,     // hazard advances only while true
  warnings?: { atTurn: number, messageId: string }[],
  inDanger: (ctx) => boolean,           // is the player in the kill zone?
  cause, deathMessageId, safeMessageId?, // fire → killPlayer or ambient
  repeat?, priority?,
}): Fuse
```

The factory's `trigger` internally does the warning-ladder + `inDanger ? killPlayer : safeMessage` branch — so a story (or Chord lowering) supplies only the *declarative* fields, never re-writes the arm→countdown→kill plumbing. All 4 Dungeo daemons collapse onto it:
- cage-poison: `turns:10, tickCondition: trapped, inDanger: player-confined, cause:'cage_poison'`.
- balloon: periodic `every 3`, `inDanger: isPlayerInBalloon`, `cause:'balloon_crash'`.
- flooding: `turns:~8, inDanger: player-in-maintenance-room, cause:'drowning'` (+ water-rising warnings).
- explosion-fuse: 3 cascading hazard fuses (2/5/8), each `inDanger: player-in-blast-zone`.

**Chord surface**: ADR-217 timer syntax + a **kill-when clause** in the fuse body, e.g. (illustrative):
```
after 10 turns as poison-gas:
    warn at 3, 6, 9: "The gas grows thicker..."
    kill the player when here, cause "poison"   # "here" = the danger predicate
```
This reuses ADR-217's already-designed timer surface; the only new Chord vocabulary is the `kill the player when <danger-cond>` clause (shared with Pattern 2) + an optional `warn at …` ladder. **This means Pattern 3's Chord surface is mostly Pattern 2's `kill the player when` applied inside an ADR-217 timer body** — another argument for the unified death-rule spine.

**Open question for the timed-hazard design** (to resolve): trait (`TimedHazardTrait` on the danger room/entity, declarative) vs. factory (`createHazardFuse`, imperative registration). The factory is closer to how the 4 daemons already work and to ADR-217's fuse model; a trait would be more Chord-declarative. *Leaning factory for the Sharpee Way + a thin Chord lowering, but flag for David.*

---

## 2. Kill-when-condition (NEW — THE centerpiece; the spine)

**Key finding**: Chord already has the entire evaluation machinery. `lose when <cond>` parses to a `LoseStmt` carrying an unevaluated `IRCondition` (`chord/src/ir.ts:348`) and lowers to `triggerEnding(world, 'defeat', phrase)` (`runtime.ts:919-926` → `loader.ts:539-548`). The condition is re-evaluated **per turn at runtime** via `whenHolds` → `evaluator.evalCondition` (`runtime.ts:909-910`), and the same `evalCondition` runs inside `after <action>` event clauses (gated at `runtime.ts:258`) and `on every turn while <cond>` daemons (`runtime.ts:650-784`). Chord's condition model (`IRCondition`, `ir.ts:395-428`) already covers everything the Dungeo sites need: `and/or/not`, `chance`, and predicates `is / is-a / is-in / is-here / has / holds / wears / can-see / can-reach`, plus `is <lit|open|on>` state adjectives — all live world reads.

> **Therefore: `kill the player [when <cond>]` is architecturally `lose when <cond>` that routes to `killPlayer(cause, messageId)` instead of `triggerEnding('defeat')`.** The whole per-turn/clause evaluation seam already exists; the only new thing is the *sink*.

**Sharpee-Way primitive** — a **death rule** = a registered `(trigger, condition) → killPlayer`. Two trigger shapes, both already have platform hooks:
- **Action/event-triggered** ("do X [under condition Y] → die"): fires from an event handler / action interceptor on the triggering action. Sites: say-echo (`after say "echo"` when `has platinum-bar`), pray-basin (`after pray` when `is-in basin-room`), melt-glacier (`after melt` when instrument `is lit`/flame), cake eat/throw (`after eat`/`throw` when cake state + room), commanding-robot (when `cage-unsolved`), gas-explosion (`after light flame` when `is-in gas-room`), gas-room-entry (`after entering` when `holds a lit flame`).
- **Per-turn state poll** ("while condition C holds → die"): fires from an every-turn daemon. Sites: **grue** (the global rule: `on every turn`, `if moving && room is dark && no light`, `chance 0.75` → `killPlayer(cause:'grue')`). This is why grue is *not* a `DeadlyRoomTrait` (per §1) — it's the canonical per-turn death rule.

**Chord surface** — a new **`kill the player`** statement, peer to `win`/`lose` (add to the body-statement set `parser.ts:154`, a `KillStmt` AST/IR node mirroring `LoseStmt` but carrying `cause`/`messageId`), usable in exactly the two positions `lose` already is:
```
after saying "echo" when the player has the platinum bar:
    kill the player, cause "echo"
kill the player when moving and here is dark and player has no light, chance 75%, cause "grue"
```
Lowering: identical dispatch to `lose when` (`runtime.ts:919`) except the sink is `killPlayer` (or a redirect to `DEADLY_ROOM_DEATH_ACTION_ID`) rather than `triggerEnding`. **This is the smallest possible new Chord surface for the largest coverage** (≈7 sites + grue), because it reuses the entire condition/evaluation stack.

**Elegance-parity check**: the Sharpee-Way (`killPlayer` from an interceptor/handler/daemon) and the Chord `kill the player when` must produce identical behavior on the same fixture — the ADR-224 AC-2 style check, now generalized to conditional death.

---

## 4. Combat death (death seam small & mostly done; full combat separable)

**Findings**: Combat is **already a platform capability**, not story-invented — `@sharpee/ext-basic-combat` (`CombatService`, `BasicCombatInterceptor` PC→NPC, `basicNpcResolver` NPC→PC) wired by `registerBasicCombat(world)`; `CombatantTrait`/`Behavior` in world-model; the two seams are `registerActionInterceptor(COMBATANT,'if.action.attacking',…)` (PC→NPC) and `registerNpcCombatResolver(resolver)` (NPC→PC, `stdlib/npc/npc-service.ts:34-61`). Dungeo opts *out* of the extension and plugs its own MDL melee engine into the **same seams** — so the seam is real and the engine behind it is swappable. ADR-215 makes combat Chord-reachable via `use combat`; ADR-072 (Proposed) is the fuller skill model but predates the death primitive.

**The one concrete platform gap** (raise to David — platform/extension change): the platform's `basicNpcResolver` still emits legacy **`if.event.death`** on a player kill (`extensions/basic-combat/src/basic-npc-resolver.ts:108-119`) — it does **not** call `killPlayer` and doesn't special-case the player target. Dungeo's melee already routes through `killPlayer({cause:'combat'})` (correct). Migrating `basicNpcResolver`'s player-target branch to `killPlayer` (~10 lines) makes the *platform* combat extension death-correct for both hand-written TS **and** any `use combat` Chord story (which reaches this exact resolver). That is the entire IF-centric death requirement for combat.

**Deliberately deferred**: full *authorable* combat in Chord (the `combatant`/`weapon` `with`-stat vocabulary + the static manifest ADR-215 needs, which does not yet exist) is a genuine vocabulary+manifest capability, cleanly decoupled from death — death routes through `killPlayer`/`if.event.player.died` regardless of which combat engine sits behind the resolver. Combat is genre-specific (not core IF), so this deferral is IF-consistent.

---

## Platform gaps to raise (per `raise-sharpee-api-gaps-for-chord`)
1. **New**: a death-rule primitive (Pattern 2 spine) + Chord `kill the player [when <cond>]` statement. Largest value, smallest surface (reuses the whole condition stack).
2. **New**: a hazard-fuse primitive (Pattern 3) over the existing scheduler `Fuse`, + a Chord kill-when clause inside ADR-217 timer bodies.
3. **New**: a `deadly` room marker in Chord → `DeadlyRoomTrait` (Pattern 1 Chord half; ADR-224 Decision 5 / plan Phase 5).
4. **Fix (platform/extension)**: migrate `basicNpcResolver` player-kill from `if.event.death` → `killPlayer({cause:'combat'})` (Pattern 4).

---

## Sequencing (proposed, once all 4 designed)
1. Finish Pattern 1 Chord half (`deadly` marker) — smallest, primitive already built.
2. Build Pattern 2 death-rule primitive + Chord `kill the player when` — the spine; re-home the ~7 conditional-death sites onto it.
3. Build Pattern 3 hazard fuse over the spine; re-home the 4 timed daemons.
4. Pattern 4: route combat through `killPlayer` (done); defer full combat capability to ADR-215/072.
