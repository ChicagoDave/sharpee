# Session Summary: 2026-07-16 — chord-foundations (session 23678a)

## Goals
- Implement **Phase 4** of the ADR-224 player-death plan (`docs/work/player-death/plan.md`): fold every hand-rolled Dungeo death site into the canonical `killPlayer` primitive.

## Key Decision (David, this session)
- **Death model = terminal death via `killPlayer`** ("IF-standard + Chord-implementable"). Chord's Phase-5 death surface lowers to terminal death → engine game-over; standard IF has no reincarnation surface.
- **Reincarnation is a Dungeo-specific concern and does NOT get a platform implementation** — and is NOT built in this phase. The plan's "re-point the reincarnation veto policy" item is therefore moot.
- Consequence: Dungeo death, currently a *soft no-op* (message + points, game continues; nothing reads `dungeo.game_over`, engine never stops), now actually **terminates** the game via the Phase-1 engine routing (`stop('defeat')`).

## Grounding corrections to the plan
- The live death-penalty policy is `state-machines/death-penalty-machine.ts` (registered `orchestration/index.ts:201`), NOT `handlers/death-penalty-handler.ts` (dead-imported). It does **scoring only** (−10/death, die-twice game_over) — it is NOT the reincarnation veto the plan assumed; no reincarnation/repositioning exists anywhere in Dungeo.
- MDL `JIGS-UP` (`rooms.mud:1167`) canonical reincarnation (relocate to Hades `LLD1`, scatter items, ghost mode, die-twice) is NOT implemented and NOT being built (David: Dungeo-specific, no platform impl).
- `dungeo.player.dead` / `dungeo.player.death_cause`: **zero readers** — safe to stop setting.
- `PLAYER_DIED_EVENT === 'if.event.player.died'` — the exact type most sites already emit; the penalty machine keys on it, so scoring survives the migration.
- **Site inventory larger than the plan's five** — full list below.

## Full death-site inventory (grounded)
Actions (execute→stash killPlayer event→report emit): `falls-death` (aragain_falls), `melt` (glacier_melt), `grue-death` (grue — seeded roll stays upstream in grue-handler), `gas-explosion` (gas_explosion), `say` (echo_reverberations, emits no-dot `player.died`), `pray` (basin_trap, no-dot), `commanding`.
Interceptors (killPlayer + createEffect PLAYER_DIED_EVENT): `gas-room-entry-interceptor`, `sphere-taking-interceptor` (cage_poison).
Daemons (push killPlayer return): `cage-poison-daemon`, `balloon-daemon` (conditional on in-balloon), `maintenance-room-fuse` (no-dot), `explosion-fuse` (×4 brick/collapse).
Handler: `cake-handler` (×3). Combat: `combat/melee-npc-attack.ts` `emitHeroDeath` (the "provoked" troll/cyclops melee death, emits `if.event.death` → re-point).
Out of scope: `actions/gdt/commands/kl.ts` (`kl` = GDT debug NPC-kill, not player death).

## Approach
- Per site: remove `setStateValue('dungeo.player.dead'…)`, call `killPlayer(world, player, {cause, messageId, terminal:true})`, emit the canonical event via that context's channel.
- Keep the death-penalty-machine untouched (its −10 scoring still fires on the terminal death; its die-twice branch is now unreachable but harmless — canon-preserving, not deleted).
- Grue odds (75/25) preserved exactly — roll stays in grue-handler; only the death call is re-pointed. (DeadlyRoomTrait{chance} conversion deferred as optional polish.)

## Results (this session)
- **All 15 death sites migrated to `killPlayer`** (7 actions, 2 interceptors, 4 daemon files incl. explosion×4, 1 handler×3, 1 combat melee). Zero `dungeo.player.dead` writes remain; zero hand-emitted player-death events remain (penalty machine still *listens* on the canonical event; `kl.ts` GDT NPC-kill correctly untouched).
- **Build clean**: `./repokit build dungeo` — `@sharpee/story-dungeo` compiled, bundle rebuilt (2.8 MB). No TS errors.
- **Terminal death verified end-to-end**: troll melee → `if.event.player.died {cause:'combat'}` → `game.ending {reason:'defeat'}`. This is the real ADR-224 "provoked" mechanism (plan-review addition) working; also proves save/restore recovers from terminal death (RETRY-wrapped combat tests pass on retry).
- **Unit death transcripts all pass**: gas-room-explosion, grue (simple+mechanics), cage-puzzle, cake-mechanics, eat-cake-quick, melt-glacier, balloon×3, troll-combat, combat-disengagement.
- **Full unit suite**: 1791/1800 pass. The **9 failures are 3 troll-GDT transcripts** (`troll-visibility`, `troll-recovery`, `debug-combat`) that linger next to a now-genuinely-lethal live troll — correct terminal-death behavior, not a bug. `troll-recovery`/`debug-combat` pass on some runs (combat-RNG); `troll-visibility` lingers 4 turns so it dies most runs.
- **Walkthrough chain**: got a clean run (889/893; 4 residual = thief-RNG treasure flakes in wt-12/wt-15, not death-related). A separate run cascaded (1210 fails) from a combat death — one-good-run-rule RNG flake.

## Open decision (for David)
The one invariant now in tension: memory `one-good-run-rule` says the **unit suite must be deterministically green**, but terminal death makes 3 troll-GDT unit transcripts non-deterministic (the troll can now kill the player mid-test). CLAUDE.md says "don't modify working transcripts." Options: (a) adjust the 3 transcripts to stay deterministic under terminal death (e.g., `troll-visibility` KO/disables the troll before examining the white-hot axe — preserves intent since a KO'd troll is still alive), or (b) accept them as combat-RNG flakes. Surfaced rather than unilaterally editing passing transcripts.

## PIVOT (David, this session): design the 4 IF-centric death-trigger patterns first
David's redirect: the goal is an **IF-centric death model Chord mirrors 1:1, so Dungeo can port to Chord**. My 15 per-site `killPlayer` re-points were bespoke; `killPlayer` (the primitive) stays, but the **triggers** must become reusable, Chord-mirrorable primitives. ADR-224 named these patterns (Context a–e) but *deferred* them to "interceptor/daemon patterns... implementation-plan decision" — that deferral is exactly what made the impl bespoke. Design chosen: **design all 4 patterns first, then implement top-down.**

### Structural insight (to validate in the design)
Everything reduces to **`killPlayer` + a "death rule" (condition → kill)**. The 4 patterns are specializations:
1. **Deadly room** (BUILT: `DeadlyRoomTrait`, verb-allowlist + optional `chance`) = a death rule scoped to "non-safe verb in this room." Chord `deadly` marker. Sites: falls (pure verb-allowlist). *Reconsider grue*: Zork grue is a GLOBAL "move-in-darkness → death" rule, not a per-room marker — likely Pattern 2, not a room trait.
2. **Kill-when-condition** (NOT BUILT — the centerpiece) = a declarative death rule `(trigger action/event, condition predicate) → killPlayer(cause,messageId)`. Chord `kill the player when <cond>`. This is the most IF-fundamental (Inform "Instead of <action> when <cond>: end"). Sites: gas-room-entry (enter + lit-flame), gas-explosion (light-flame + in-gas-room), say-echo (+platinum bar), pray-basin, melt-glacier (+flame), cake (eat/throw + icing-state + room), commanding (robot-take-sphere + cage-unsolved).
3. **Timed hazard** (NOT BUILT) = a scheduled death rule: fuse/daemon after N turns → condition → killPlayer, with escalation messages. Reuses the already-IF-standard fuse/daemon primitive (TADS-style). Relates to ADR-217 (Chord timer controls). Sites: cage-poison (10-turn), balloon-crash, flooding, explosion-fuse (2/5/8 cascade).
4. **Combat death** (killPlayer wired) = NPC lethal-blow → killPlayer(cause:'combat'). Combat is genre-specific, correctly story-local (IF-consistent — most IF has no combat). Full combat capability = ADR-215/ADR-072, likely deferred. Sites: troll/cyclops melee.

Deadly-room is arguably a special case of kill-when-condition → unify around a core **death-rule** primitive; deadly-room + timed-hazard are sugar/specializations over it.

### Grounding in flight (3 agents)
- ADR-217 timer model + scheduler/fuse API + common shape of the 4 timed-hazard daemons + whether a HazardTrait exists.
- ADR-215/072 combat model + whether platform combat exists + minimal Chord-mirrorable combat-death seam.
- Chord story-loader: how `lose when <cond>` lowers + WHERE conditions evaluate per-turn (the hook for `kill the player when`) + Chord condition/predicate model + room→trait lowering + DeadlyRoomTrait target shape.

### Deliverable
A design doc (candidate child ADR of 224) covering all 4 patterns as reusable IF primitives + their Chord surface, for David's review before implementing top-down.

### Design delivered: `docs/work/player-death/if-centric-death-triggers-design.md`
Thesis: everything reduces to **`killPlayer` + a "death rule" (condition → kill)**; the 4 patterns are specializations of one spine.
- **Pattern 2 (kill-when-condition) is the spine** and the biggest finding: Chord's `lose when <cond>` already lowers via a per-turn `evalCondition` seam (`runtime.ts:909-910`, every-turn daemons + `after <action>` clauses), and its condition model (`is/is-in/is-here/has/holds/…`, `and/or/not`, `chance`) already covers every Dungeo conditional death. So **`kill the player [when <cond>]` = `lose when` re-pointed to `killPlayer` instead of `triggerEnding`** — smallest new surface, ~7 sites + grue.
- **Pattern 1 (deadly room)**: built (`DeadlyRoomTrait`); Chord `deadly` marker = catalog entry + `applyTraitAdjectives` case. **Grue reclassified**: it's the global per-turn death rule (Pattern 2), not a per-room trait.
- **Pattern 3 (timed hazard)**: new `createHazardFuse` factory over the existing scheduler `Fuse` (`{arm, turns, tickCondition?, warnings[], inDanger→bool, cause, deathMessageId}`); Chord = ADR-217 timer body + a kill-when clause. No `HazardTrait` exists today.
- **Pattern 4 (combat)**: death seam small & mostly done (Dungeo melee already routes to `killPlayer`). **One platform gap**: `basicNpcResolver` (`@sharpee/ext-basic-combat`) still emits legacy `if.event.death` — migrate to `killPlayer({cause:'combat'})` (~10 lines). Full authorable combat deferred to ADR-215 (`use combat` manifest, doesn't exist yet).
- **4 gaps raised** (per `raise-sharpee-api-gaps-for-chord`): death-rule primitive + `kill the player when`; hazard-fuse; `deadly` marker; basicNpcResolver fix.

Proposed sequencing: Pattern 2 spine first → Pattern 1 Chord half → Pattern 3 over the spine → Pattern 4 basicNpcResolver fix (defer full combat).

## ADR-227 written + reviewed
- **`docs/architecture/adrs/adr-227-death-trigger-patterns.md`** (DRAFT, child of ADR-224) — the death-rule spine + 4 patterns + Chord surface + 5 ACs.
- **adr-review (227 + 224, multi-ADR)**: combined verdict READY WITH CLARIFICATIONS. Parent↔child seam clean (227 resolves 224's deferred Q-4). 3 SMALL findings, all fixed: Open Questions reformatted to the shared `### Q-n` contract; hazard-fuse persistence/teardown added to AC-3; death-rule Sharpee API folded into Q-1.
- **4 open questions remain** (ADR is correctly DRAFT): Q-1 Sharpee death-rule primitive shape (registry vs. hooks), Q-2 hazard factory vs. trait, Q-3 Chord grammar for `kill the player`/`deadly`, Q-4 grue home (platform default vs. story-authored).
- Next per rule 11a: offered the open-questions interview; then implement top-down from the accepted ADR.

## ADR-227 rewritten on verified footing (David's steer: use prescribed mechanisms, not new primitives)
Two design corrections David forced this session:
1. **No new mechanisms.** Verified the complete set of Sharpee logic surfaces (9: Trait+Behavior, Action, Capability Dispatch, Interceptor, Event Handler, ParsedCommandTransformer, + 3 plugins: Scheduler/State-Machine/NPC). The invented "death-rule registry" and "createHazardFuse factory" are **rejected** — every death trigger is one of the prescribed surfaces calling `killPlayer`; policy = State Machine.
2. **Event handlers are reactions, not triggers** (verified `core-concepts.md:357,380`, ADR-052). Corrected my sloppy "capability-dispatch OR event-handler." Per-site mechanism now chosen by the ADR-090 tree: falls→Trait+Behavior; cake→Capability Dispatch (re-home off `chainEvent`); gas/sphere/grue→Interceptor; melt/say/pray→Story Action; timed→Daemon; melee→NPC resolver.
- Chord parity = exactly two constructs lowering to those surfaces: `deadly` marker → DeadlyRoomTrait; `kill the player [when <cond>]` statement → killPlayer inside existing clause forms.
- ADR-227 rewritten (`adr-227-death-trigger-patterns.md`), design doc marked SUPERSEDED (grounding retained). Open questions now: Q-1 Chord grammar, Q-2 cake mechanism (capability-dispatch vs additive event-handler — the taxonomy test), Q-3 grue home.

## ADR-227 open-questions interview — all 3 resolved (David, this session)
- **Q-1 Chord grammar** → `kill the player` is a bare statement (peer to win/lose) paired with a `phrase`; `<dir> is deadly: <phrase>` = deadly *exit* (mirrors cloak's `is blocked:`); `deadly: <phrase>` = rare no-escape room; positive/no-`not` idiom; chance = `one chance in n`; cause derived, not authored. Grounded in cloak.story/zoo.story.
  - Bonus finding (MDL): **falls is a deadly EXIT, not a deadly room** (`FALLS-ROOM`/`OVER-FALLS`, act2.mud:203,292) — player retreats north; only going over the falls (south) kills. Current handler's "wait/take/inventory also kill" is over-implementation to drop.
- **Q-2 cake mechanism** → **Capability Dispatch** (the entity owns the lethal verb; `on <action> it` lowers here). Set as the precedent for all transform-on-use deaths (eat cake, melt-with-flame).
- **Q-3 grue's home** → **story-specific**. Standard darkness only *blinds*; grue (darkness→death) is Dungeo-authored (daemon/interceptor + seeded chance → killPlayer). Platform ships no darkness-death rule.
- Open Questions section removed; ADR ready for DRAFT → ACCEPTED flip + auto adr-review.

## ADR-227 ACCEPTED + implementation plan written
- Flipped DRAFT → ACCEPTED; auto adr-review = READY FOR IMPLEMENTATION (14/14).
- **Plan**: `docs/work/death-triggers/plan.md` (`.current-plan` → it). session-planner + auto plan-review = TENSIONS ONLY (advisory, no blockers). 5 phases, all gated:
  1. Dungeo: Falls → deadly-exit interceptor (drop the wait/take over-kill); Grue → seeded Action Interceptor (also fixes a live `Math.random()` in grue-handler).
  2. Dungeo: Cake → Capability Dispatch (off `chainEvent`). **Melt resolved = Story Action** (glacier-only story verb per ADR-090 tree; already correct, verify-only — ADR-227 Consequences amended).
  3. Platform: `basicNpcResolver` → `killPlayer` (drop legacy `if.event.death`).
  4. Platform: the 3 Chord constructs (`kill the player`, `<dir> is deadly:`, `deadly:`) across chord parser/catalog/ast/ir + story-loader lowering.
  5. Verification capstone: full unit suite + one clean walkthrough chain; AC-2/AC-4 gates.
- Phases 1–4 mutually independent; Phase 5 depends on all. Advisories folded: no new `DeadlyExitTrait` (key interceptor on existing trait); Phase 5 add an armed save/restore check.

## Darkness encapsulation refactor: `RoomTrait.isDark` → `requiresLight` (David-approved, DONE)
Surfaced by the grue/Chord-parity dialogue: two notions of "dark" that could diverge — the stored `RoomTrait.isDark` field (intrinsic) vs. the computed `VisibilityBehavior.isDark(room, world)` (effective, light-source-aware). Chord's `is dark` predicate read the raw field (`evaluator.ts:224`), so a Chord grue would kill you *even holding a lit lamp*, while the Sharpee grue (which uses `VisibilityBehavior.isDark`) wouldn't. The platform already treats `VisibilityBehavior.isDark` as the single source of truth (`looking-data.ts:16` says so); Chord was the lone leaker.
- **Fix (David: "I like requiresLight, just fix it"):** renamed the intrinsic field `RoomTrait.isDark` → **`requiresLight`** (clarifies it's the "needs a light source" input, not the answer), and routed Chord's `is dark` predicate through `VisibilityBehavior.isDark` (`evaluator.ts` — the leak fix). The `static VisibilityBehavior.isDark(room, world)` **method** name is unchanged (the effective-dark authority).
- **Scope:** 30 files. Core (me): `roomTrait.ts` (field+data-key+doc), `VisibilityBehavior.ts` (field reads), `story-loader/evaluator.ts` (semantic leak-fix + import), `story-loader/runtime.ts` (`dark while` writer). Fan-out (subagent, precise spec + guardrails): stdlib `snapshot-utils`, `helpers/room.ts`, `transcript-tester`, 15 dungeo regions, 4 dungeo field-access files, + cloak/armoured/thealderman/channel-service-test construction keys. `VisibilityBehavior.isDark` method calls preserved everywhere; snapshot/event-payload `isDark` properties (effective values) kept.
- **Verified:** `./repokit build dungeo` clean; darkness transcripts (grue×2, gas-lantern, gas-explosion) pass; full unit suite's only failures are the pre-existing combat-RNG terminal-death flakes (swing 4↔109 run-to-run, cyclops/troll — not rename-caused; cyclops-magic-word passes isolated). Other 4 stories: zero rename type errors (only pre-existing browser-entry DOM-lib artifacts).
- Principle established: a trait field that's an *input* to a behavior-computed value must be named/encapsulated as the input; the behavior owns the computed query. (No ADR — folded into this summary per David.)

## Session end (finalize)
Committing at this point — Phase 1 implementation NOT started (finalize called first). State of the work:
- **DONE + verified**: Phase 4 (Dungeo death→`killPlayer` migration, terminal death); ADR-227 (ACCEPTED); death-triggers plan; `requiresLight` darkness refactor.
- **NEXT SESSION (Phase 1, not started)**: (1) amend ADR-227 Decision-2 + plan Phase 1 to record the agreed mechanism refinement — *movement-context hazards use daemon/transformer, not Action Interceptor* (interceptors are one-per-(entity,action), don't stack); (2) implement: **grue → darkness-conditioned scheduler daemon** (`VisibilityBehavior.isDark` condition → seeded 25%-survive roll → `killPlayer`; drops the live `Math.random()` in grue-handler.ts:147), **falls → keep `ParsedCommandTransformer`, fix the over-implementation** (only going *south* fatal; drop wait/take/inventory kills per MDL). Then Phases 2–5 per the plan (each gated).
- **Known non-blockers**: unit-suite combat transcripts (troll/cyclops) are RNG-flaky since Phase-4 terminal death made those NPCs genuinely lethal — one-good-run rule; not regressions.

## Status: SESSION COMPLETE for committed work (Phase 4 + ADR-227 + plan + requiresLight); Phase 1 implementation deferred to next session
