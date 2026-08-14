# Person / Automation split — itemized blast radius

Itemized from a five-slice read-only audit, 2026-07-15 (automation, character/memory,
visibility/conversation, combat/creature-state, Chord+stories). Feeds the graduating
ADR (ADR-222 seam **FZ-P1**). **No code changed.** Companion to
`person-npc-character-notes.md` (the model) and `animaltrait-design-notes.md`.

## Headline: it's a FOUR-layer split, and the personhood layer is The Alderman's in-progress work

The audit turned the three-layer model into **four** — the evidence for a distinct
**CREATURE-STATE** layer is overwhelming (a live sync bug, a vestigial field, and the
player carrying creature-state without being an NPC). And a large **PERSONHOOD** stack
(`@sharpee/character`, ADRs 141/142/144/145/146) already exists but isn't yet wired at
story runtime — **not** abandoned or speculative: it is **The Alderman's personhood
implementation, mid-realization**. The character models, conversation, propagation and
influence were built *for that story*; the runtime wiring is incomplete because The
Alderman itself is unfinished. So **The Alderman is the driving/reference story for the
personhood layer** (as the dungeo thief is for automation), and this split must *serve
finishing it*, not treat its stack as disposable. The refactor is therefore as much
*connect + de-duplicate + realize The Alderman* as it is *split*.

## The four layers

- **AGENT** (`ActorTrait`) — the substrate: takes turns, has inventory/pronouns,
  `isPlayer`. **Sight/scope is AGENT-level and already observer-agnostic.**
- **AUTOMATION** (`behaviorId` + `NpcBehavior` + `NpcService` + the turn tick) —
  autonomous per-turn behavior.
- **CREATURE-STATE** (`isAlive`/`isConscious`/`isHostile` + health) — mortality &
  disposition. *Currently duplicated across `NpcTrait` and `CombatantTrait`.*
- **PERSONHOOD** (`CharacterModelTrait` + `@sharpee/character`) — personality, mood,
  disposition, knowledge, beliefs, goals-state, conversation, memory, relationships.

**`NpcTrait` today spans all four** — the cut lines run through the middle of one
trait (`npcTrait.ts:14-62`).

---

## Itemized concerns (by layer)

### AGENT — mostly clean, keep as substrate
| Item | Exists | Where | Blast note |
|---|---|---|---|
| Turn substrate / inventory / pronouns / `isPlayer` | Built | `ActorTrait` | AGENT is the base both AUTOMATION and PERSONHOOD attach to; today they float on the `NpcTrait` marker instead. `NpcService` never checks `ActorTrait` — so an "NPC" needn't be an "actor," and an actor gets no turn. |
| Physical sight / scope (`canSee`/`getScope`/`canReach`) | Built, **clean** | `VisibilityBehavior.ts`, stdlib `scope-resolver.ts` | Observer-agnostic already (`canSee(actor,target)`). Split doesn't touch it. |
| Player-only hardwire | Built | `enhanced-context.ts:52` (`canSee`→`this.player`) | The *only* reason NPC-perspective isn't used — the choke point that forces "player." |
| "Can be talked to" gate | Built | `talking.ts:91` requires `ACTOR` | AGENT gate is fine; the greeting/relationship branching smeared into the action is PERSONHOOD (see conversation). |
| `OPEN_INVENTORY` reachability | Built | `scope-resolver.ts:135` | AGENT-level; attached conceptually to NPCs. |

### AUTOMATION — the machinery, plus dead wiring to fix
| Item | Exists | Where | Blast note |
|---|---|---|---|
| Turn-cycle participation | Built | `npc-plugin.ts`, `game-engine.ts:1104-1128`, `npc-service.ts:410-417` | Eligibility keys off `NpcTrait` **+ `isAlive/isConscious`** — must re-point to an AUTOMATION marker gated by CREATURE-STATE. |
| `behaviorId` + `NpcBehavior` + dispatch | Built | `npc-service.ts:163-237`, `types.ts` | `behaviorId` is the clean AUTOMATION handle. `NpcContext` is **personhood-free** — automation's contract extracts cleanly. |
| Movement / patrol / wander / follow | Built | `behaviors.ts:82-302`, `npc-service.ts:562-624` | `canMove`/`allowed`/`forbiddenRooms` → AUTOMATION. `canEnterRoom()` method is dead post-`loadJSON` (inlined). |
| Movement announcements | Built | `npc-service.ts:636-692` | `announcesMovement`/`movementMessages` → AUTOMATION (a patrol cart must announce without personhood). |
| Behavior registration / hot-swap | Built / Partial | `npc-service.ts:166-174`; zoo swap `index.ts:396` | Fragile id-collision idiom; global-per-service, not per-entity. |
| Runner-state save/restore | **Partial — BROKEN** | `behavior.getState/setState` (`behaviors.ts:292-300`) **never called**; `NpcPlugin.getState` returns `{}` | Patrol/follower waypoint state silently lost on save/restore today. Split must give AUTOMATION a real serializable state slot. |
| Reactive hooks `onSpokenTo`/`onAttacked`/`onObserve` | **Dead** | `npc-service.ts:324-406` methods have **no callers** | dungeo behaviors *implement* them expecting them to fire — a correctness trap. Combat reaction actually flows through `CombatantTrait`+interceptor. Wire or delete. |
| Tick-phase extension (PERSONHOOD rides AUTOMATION tick) | Built | `npc-service.ts:185-234`; `character/tick-phases.ts` | **Lucidity decay is hard-wired into `NpcService`** (`npc-service.ts:223-227`, imports `CharacterModelTrait`) — the direct AUTOMATION→PERSONHOOD dependency to cut. |
| Observation as *accumulation* (witness system) | **Dead / orphaned** | `stdlib/scope/witness-system.ts` — **no runtime construction** | Fully built passive who-saw-what accretion; the natural AUTOMATION observation layer. Overlaps ADR-141 `observeEvent` (personhood). Neither is wired. |
| Goal pursuit / propagation / influence ticks | Built | `character/goals`, `/propagation`, `/influence` via `tickPhases` | AUTOMATION over PERSONHOOD state. |

### CREATURE-STATE — the emergent 4th layer (has a live bug)
| Item | Exists | Where | Blast note |
|---|---|---|---|
| `isAlive` / `isConscious` | Built **twice** | `NpcTrait:81,82` **and** `CombatantTrait:78,83` | **Latent bug:** `basic-combat` kill sets `CombatantTrait.isAlive=false` but not `NpcTrait.isAlive` → the "dead" NPC still takes turns (`getActiveNpcs` reads only `NpcTrait`). Only the knockout path is hand-synced (`melee-interceptor.ts:461`), not kill. |
| `isHostile` / `hostile` | Built twice; **NpcTrait copy vestigial** | `NpcTrait.isHostile` written by 7 stories, **read by no game logic**; real hostility on `CombatantTrait.hostile` | Drop `NpcTrait.isHostile` with near-zero risk. |
| Health / damage / knockout / kill / revive | Built | `CombatantTrait` + `CombatService` | Combat is anchored to `CombatantTrait`, **never reads `NpcTrait`** → the split is safe for combat. |
| Non-combatant creature-state | Built | zoo/dungeo NPCs set `NpcTrait.isAlive/isConscious` with **no `CombatantTrait`** | A unified `CreatureStateTrait` must stand alone, not depend on combat. |
| Object HP (`DestructibleTrait`/`BreakableTrait`) | Built | `attacking.ts:211` branch | A *third* health model; "damageable" is a cross-cutting capability, not personhood. |

### PERSONHOOD — large, tested, and almost entirely UNWIRED
| Item | Exists | Where | Blast note |
|---|---|---|---|
| Character model container | Built, **NPC-bound** | `characterModelTrait.ts` | Gates on `NpcTrait`; PC can't carry it; predicates hardcode `'player'` (`:562`). **Central move: re-home under AGENT, make predicates observer-relative.** |
| Personality / mood(emotion) / disposition / threat | Built | `character-vocabulary.ts`, `characterModelTrait.ts` | Clean leaves. Disposition **doubles as the only relationship substrate**. |
| Knowledge / facts | Built **twice** | `CharacterModel` facts **vs** `NpcTrait.knowledge` | Delete the `NpcTrait` copy; route to character model (ADR-141 already flags this). |
| Beliefs | Built | `characterModelTrait.ts:392` | Clean leaf. |
| Goals-state | Built **three times** | `NpcTrait.goals` + `CharacterModel` goals + `@sharpee/character` `GoalManager` | Cleave goal-*state* (personhood) from goal-*pursuit* (automation); delete `NpcTrait.goals`. |
| Cognitive profile & lucidity | Built; decay wired | `character-observer.ts`, `lucidity-decay.ts` | The one personhood loop that runs — *through the NPC service*. Needs a new owner post-split. |
| Observation as *interpretation* (`observeEvent`) | **Partial — no callers** | `character-observer.ts:194` | Cognitive-distortion/mood pipeline; ADR-141 goal #2 unrealized. The PERSONHOOD layer of the 3-tier observation pipeline. |
| Relationships | **Absent-but-implied** | emulated by disposition; propagation "allied" heuristic | Greenfield if wanted as a peer to disposition. |
| Memory | **Partial / fragmented** | conversation history, propagation `AlreadyToldRecord`, `Fact.turnLearned`, evidence records | No unified store; emergent from ≥4 ledgers. Split must decide unify vs federate. |
| Conversation (ADR-142) | Built as a package, **UNWIRED** | `character/conversation/**`; `DialogueExtension` (`dialogue-types.ts:48`) **never registered** (ADR-102 seam) | ASK/TELL/ANSWER **removed from stdlib** (`actions/removed/*.removed`), never re-homed → a hole. TALK-TO exists but reads `ActorTrait.customProperties.conversation` (legacy fusion). |
| Propagation / influence / evidence / speech-coloring | Built | `character/{propagation,influence}`, `acl.ts` | AUTOMATION over PERSONHOOD; all unwired at story runtime. |

---

## The 3-tier observation pipeline (a clean seam, currently all dead past tier 1)
1. **Raw sight** — `VisibilityBehavior.canSee` — **AGENT** (built, generic). ✅ runs
2. **Passive accumulation** — `witness-system.ts` — **AUTOMATION** (built, orphaned). ✗
3. **Cognitive/emotional interpretation** — `observeEvent` — **PERSONHOOD** (built, no callers). ✗

The split should *formalize* this pipeline, not pick one.

## Cross-cutting hazards
- **Duplications to collapse:** creature-state (Npc↔Combatant), knowledge (2×), goals (3×), `ConversationData` (stdlib capability vs character builder), `CombatantTrait` (world-model vs armoured's local fork).
- **Dead/orphaned to wire-or-kill:** witness system, `observeEvent`, reactive hooks, behavior `getState/setState`, the `DialogueExtension` registration seam, and effectively the entire `@sharpee/character` runtime.
- **Serialization footgun:** trait *class methods* don't survive `loadJSON` (`canAct`/`canEnterRoom` inlined everywhere). New traits must be **data-only**.
- **`globalThis` combat resolver** (`npc-service.ts:45-68`) — cross-module singleton, not per-world.
- **ADR-072 (combat) is stale/Proposed** yet implemented, and still depicts the `isHostile`/`isAlive`-on-NPC fusion the split removes.

## Chord surface (authoring) — near-zero today
`person` → `ActorTrait` + `IdentityTrait` only (`loader.ts:587`, `actor.ts:126`). Of the four NPC-doing concepts: **autonomy** = Partial (generic `on every turn`→scheduler daemon, not NPC-aware, works on any entity); **hostility / conversation / character-model** = Absent. Everything an NPC *does* is outside the Chord language.

## Migration surface (stories)
| Story | Risk | Note |
|---|---|---|
| dungeo | **Highest** | 6 NPCs; the **thief** (7-state machine, all state in `NpcTrait.customProperties` untyped bag); `behaviorId` dispatched from interceptors + GDT commands. Combat already separate (low), movement+AI+custom-state fusion is the hazard. The thief is the canonical automated NPC for a Chord Zork. |
| thealderman | **Driving story (personhood)** | 6 conversation-rich NPCs authored via `@sharpee/character` `ConversationBuilder`; the `.compile()` output isn't yet applied at runtime because the story is **mid-development**, not because it's dead. This is the personhood layer's reference/driving story — the split must *enable finishing it*, and finishing it is how the personhood layer gets validated. |
| friendly-zoo | Low | zookeeper (patrol) + parrot (swap) use only the pure-automation subset — good regression target. Goats/rabbits → `AnimalTrait` (FZ-X1). |
| armoured | None (NpcTrait) | No `NpcTrait`; but forked its own `CombatantTrait` — caution that stories diverge when platform traits fall short. |

## Structural decisions the ADR must make
1. **Adopt CREATURE-STATE as a 4th layer** — one `CreatureStateTrait` (alive/conscious/hostile, standalone, read by combat + turn loop + sword-glow), collapsing the duplication and fixing the kill/turn sync bug.
2. **Re-home PERSONHOOD under AGENT**, not NPC; make `'player'`-hardcoded predicates observer-relative; delete `NpcTrait`'s knowledge/goals/conversationState copies.
3. **Finish** the personhood realization (the `@sharpee/character` runtime, `observeEvent`, the `DialogueExtension`/ASK-TELL seam) so The Alderman can be completed — this is *realize-in-progress-work*, not "wire or kill." Separately, decide the fate of the genuinely-stale automation plumbing (the orphaned witness system, the never-called reactive hooks `onSpokenTo`/`onAttacked`, behavior `getState/setState`) — finish, fold, or remove.
4. **Formalize the 3-tier observation pipeline** and give the personhood tick (lucidity/goals/propagation) an owner that isn't `NpcService`.
5. **Data-only traits** (no logic-bearing methods); a real per-entity AUTOMATION state slot.
6. **Per-NPC automation state** — keep or type the `customProperties` escape hatch (the thief lives in it).
7. **Chord authoring surface** for all four layers (currently none) — the FZ-P1 → Chord side.
8. Reconcile `ADR-072` (combat) and the `@sharpee/character` ADRs (141/142/144/145/146) with the new layering rather than inventing a fifth model.
