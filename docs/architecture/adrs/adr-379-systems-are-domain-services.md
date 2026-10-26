# ADR-379: Systems are domain services — one question, one home, every mover

**Status**: **ACCEPTED** (David, 2026-10-19, session b86789: "Accept", after the two-record `adr-review` with ADR-378 came back READY, five seam findings folded). Drafted the same day on `chord-4-0`, at David's "Go" after the Phase 14 design conversation surfaced it: "the transportation work is a 'system' and if we have one system, we're likely to have others and what does that mean?"). This record names a layer the architecture has been building without a word for it, states the rule that tells a system from a behavior, inventories the systems that exist, and records (David, same day) the external validation that the layer is the medium's own: *Savoir-Faire*'s linking and *Hadean Lands*' alchemy are author-written systems, and the platform's `use` extensions are the same shape shipped. It constrains ADR-378, which lands the first worked example (traversal). No implementation here; the one defect it names is filed, not fixed.

## Date: 2026-10-19

**Kind**: technical

## Parent

- **ADR-051** (actions coordinate, behaviors own mutations) and the core concepts' *Logic Location* table — the layers this record adds a row to.
- **ADR-207**, **ADR-208**, **ADR-295 D4** — the per-world binding model (scoped to one running `WorldModel`, idempotent last-wins, never serialized, re-registered on every load) that every system's story seam reuses.
- **ADR-328 D5** (the NPC turn phase is the engine's; the decision layer is stdlib's) and **ADR-172** (sound propagation) — two systems already placed by their own records.
- **ADR-366 D6** (`admits:` on the room) and **ADR-376 D6** (sight is scope: one guarded branch in `canSee`) — the two recent decisions that show the difference between a rule with one home and a rule without.
- **ADR-234 D1** — a room owns its exits; the thing on the way is a separate noun. The vocabulary traversal keeps.

## Context — measured, not assumed

**The question "may this mover take this way now?" has four homes that disagree.** Measured 2026-10-19:

| Gate on a way | Player (`stdlib going.ts:319-415`) | Vehicle machine (`vehicleBehavior.ts stepCompass:676-699`) | NPC (`npc-service.ts getExitsFromRoom:403-433`) | Sound (`engine/src/sound/propagation.ts:161-198`) |
|---|---|---|---|---|
| The exit exists | yes | yes | yes | yes |
| Blocked (`exit.blocked.*`, ADR-240) | yes | no | no | no |
| Door closed / locked | yes | closed only | no | as a path cost |
| Deadly (ADR-227) | yes | no | no | no |
| Computed (ADR-295) | yes | no | no | no |
| The room admits the vehicle (ADR-366 D6) | when steering | yes | no | no |
| NPC allowed / forbidden rooms (`npcTrait.ts:26-29`) | no | no | yes | no |

A vehicle on a heading drives through a blocked exit. An NPC walks through a closed door and a blocked exit. Each rule was added at the mover that needed it, which is why the table has four columns instead of one.

*Corrected 2026-10-19, the same session, by the structural scan ADR-378 Slice 1 landed (`traversal-readers.test.ts`): the count was six, not four.* Two more hand copies read the blocked key, the exit and the door lock for themselves: `hasTraversableExit` (`stdlib/src/actions/helpers/exit-legality.ts:99-120`, the conversation leave check of ADR-320 D8, whose own header calls it "going's read points, re-implemented by hand") and `adjacentRooms` (`story-loader/src/evaluator.ts:753-786`, the draw behind `move … to a random adjacent room`, ADR-326). Both honour blocked and locked and ignore closed doors and hidden exits. The scan also classified the readers that are not copies — three listers (the character model's room graph, the claims candidate list, the project-tree introspector), two writers (`connectRooms` and the `UpdateExits` effect), and two readers of the message key for an expanse edge's text (steering, setting-course) — each with its reason, in the test's table. That table is the authoritative enumeration from here; this record's count is history.

**The question "can this observer see that thing?" has one home, and it held under pressure.** `VisibilityBehavior.canSee` (`packages/world-model/src/world/VisibilityBehavior.ts:145`) is the one definition; `getVisible` (`:263`), the scope resolver, the perception service and `examining` read it. When ADR-376 D6 made sight a matter of distance in an expanse, the change was one guarded branch in `canSee`, and every reader agreed at once. Reach (`ReachabilityBehavior.canReach:53`) and darkness (`VisibilityBehavior.isDark:83`, `isDarkFor:79`) have the same shape. These three live in `packages/world-model/src/world/`, beside `PresenceBehavior` and `LocationHeadingBehavior`, which are the same kind of thing: a rule over the whole world that belongs to no trait.

**Sound and NPC decision were placed by their own records.** Propagation is a pure function in the engine (ADR-172 Phase 3) with its own edge model; the NPC service is the decision layer in stdlib and the engine owns its tick (ADR-328 D5). Containment is in between: `ContainerBehavior.canAccept` (`containerBehavior.ts:57`) answers capacity for one holder, while "what moves with what" is answered separately by the vehicle (`vehicleBehavior.ts:396, 552, 634` move the vehicle; occupants ride by containment) and by nothing for a pushed thing.

**The form has external validation in the medium itself** (David, 2026-10-19). Two canonical works are built around a system in exactly this sense: *Savoir-Faire*'s linking magic (Emily Short, 2002), where one rule — a linked object shares what happens to its partner — applies to every object the player can link, and *Hadean Lands*' alchemy (Andrew Plotkin, 2014), where rituals, reagents and the ritual environment form one rule set that every puzzle in the game consults. Neither is a single action or a single trait's behavior; each is a domain service the author wrote, with its own vocabulary, consulted from everywhere. That is the strongest evidence that the layer is real: the best authors reach for it, and a story language that cannot say it makes them reach around it.

**The platform already packages systems as extensions, without calling them that.** `packages/chord/src/manifests/` carries `scoring`, `chapters`, `combat`, `hunger`, `expanses`, `sailing`, `npc` and `state-machines` (the last two core, ADR-377 D1). Each `use` line turns on one rule set with its own kind nouns, adjectives, statements and conditions, read by one platform home: `use sailing` is the wind-and-sails rule consulted by steering, the vehicle's step and the `is in irons` condition alike. These are systems by D1 below, shipped by the platform; the manifest is their Chord-side packaging (ADR-215).

**The architecture's vocabulary has no word for this layer.** The core concepts name traits (data), behaviors (one aggregate's operations), actions (coordination of a command), event handlers (reactions) and capability dispatch (per-trait replacement of an action). The *Logic Location* table in `CLAUDE.md` has rows for engine, world-model, stdlib, parser, lang, story and client, and none for "a rule many movers consult". Visibility became a system by discipline, traversal did not, and nothing in the written architecture distinguishes the two cases.

## Decision

**D1 — A system is a domain service: one rule that answers one question across many entities and belongs to none of them.** In the domain-driven reading of the architecture, traits are the data of aggregates, behaviors are the operations one aggregate owns, actions are application services that coordinate a player's command, and a system is a domain service. Its question is of the form *"given this mover (or observer, or listener) and this world, what is the answer now?"*, and the answer is the same whoever asks: the player's action, a vehicle's machine, an NPC's behavior, a Chord condition, a claim.

**D2 — The one-home rule, and the test for when a rule is a system.** A rule is a system when it is consulted by more than one mover, more than one action, or by both an action and a Chord condition. From then on it has exactly one home, and every consumer reads that home; a second copy of the rule at a second consumer is a defect, whatever its test coverage. The test is the one visibility passed and traversal failed: *change the rule in one place, and every consumer agrees*. This is the row the *Logic Location* table was missing; the core concepts' "where does this belong?" gains the question "is more than one thing going to ask this?".

**D3 — Where a system lives.** A system over the world's state lives in `packages/world-model/src/world/`, beside visibility, reach, presence and location heading; it is a module of static functions over `WorldModel`, as those are, never a class with its own state (ADR-338 D3's exception is for an aggregate, not a service). A system that runs in the turn cycle (time, the NPC tick, sound delivery) lives in the engine or the stdlib service the engine calls, as ADR-328 D5 and ADR-172 placed them. A system never lives in a trait's behavior file: the vehicle's `stepCompass` deciding doors and admittance for itself is the shape this record ends.

**D4 — A system's story seam is the per-world binding.** Where a story extends a system — a computed exit's resolver (ADR-295), a capability behavior (ADR-207), an interceptor (ADR-208) — it does so through a binding scoped to one running world, idempotent, last-wins, never serialized, re-registered on every load. A new system that needs a seam adds a binding of that shape and no other.

**D5 — Each system has a Chord vocabulary, and alignment is checked per system.** The author's view of a system is a small set of words: for visibility `dark`, `can see`, `concealed`, `night-vision`; for traversal `to`, `through`, `blocked`, `deadly`, `admits`, `one-way`, and ADR-378's `passage` and `while`; for sound `listener`, `hearing`, `play sound`. The alignment obligation of the core concepts becomes checkable per system: every word the language has for the system reads the system's one home, and the home exposes nothing the language cannot say (ADR-350 D2). A platform rule with no word is a seam gap to file; a word that reads a copy of the rule instead of the home is the defect D2 names.

**D6 — The inventory, with each system's state against D2.**

| System | Question | Home today | State |
|---|---|---|---|
| Visibility | can this observer see that? | `VisibilityBehavior` | one home |
| Reach | can this actor touch that? | `ReachabilityBehavior` | one home |
| Illumination | is this room dark for this observer? | `VisibilityBehavior.isDark`, `isDarkFor` | one home |
| Presence | is this thing here? (doors, backdrops) | `PresenceBehavior` | one home |
| Traversal | may this mover take this way now? | six copies (Context, as corrected) | **leaking** — ADR-378 D0 gives it one home; `going`, the machine and pushing read it in Phase 14; the three remaining copies (NPC movement, `hasTraversableExit`, `adjacentRooms`) are GH #601 |
| Containment | may this go in there, and what moves with what? | `ContainerBehavior.canAccept` plus per-mover carrying | **split** — named here, not decided; its record is owed when a second mover needs it |
| Time | what fires this turn? | scheduler service, state-machine plugin, vehicle tick | one home per clock; whether they are one system is open |
| Sound | what does this listener hear? | `engine/src/sound/propagation.ts` | one home; reads doors on its own edge model (D7) |
| NPC decision | what does this NPC do? | `npc-service.ts` | one home; its movement reads traversal's copy, not traversal (Context) |
| Scoring, chapters, combat, hunger, expanses, sailing | each `use` extension's rule set | one platform home each, packaged by its manifest (ADR-215) | one home; the shipped shape an author-defined system would take (D9) |

**D7 — What a system is not.** It is not an action: an action coordinates one command and ends. It is not a trait's behavior: a behavior mutates one aggregate's data. It is not a plugin: a plugin is a turn-cycle extension point, and a system may run inside one but is not defined by it. It is not a second edge model: sound's acoustic edges keep their cost function, and once traversal's home exists they are a candidate reader of it for the door's state; that migration is not scheduled by this record or by ADR-378, which enumerates propagation as an allowed reader of the raw exits until it is. A system may *call* behaviors (traversal moves the mover through `world.moveEntity`), and an action may *consult* a system (going asks traversal), and the direction never reverses.

**D8 — The first defect this rule finds is filed, not absorbed.** NPCs walk through closed doors and blocked exits because NPC movement reads `RoomTrait.exits` directly (Context). It is GitHub issue #601, opened with this record, resolved when NPC movement reads traversal's home (ADR-378 Consequences names the follow-on). It is not fixed silently inside Phase 14. *(Widened 2026-10-19, David: "2 be thorough": #601 also carries the two copies the scan found, `hasTraversableExit` and `adjacentRooms`; all three are listed as `copy` in the scan's table and the test pins that list, so a fourth cannot be added without naming it.)*

**D9 — Systems are the author's layer too, and the platform's extensions are its shipped instances.** *Savoir-Faire*'s linking and *Hadean Lands*' alchemy (Context) are systems an author wrote, and a `use` extension is the same thing shipped by the platform: one rule set, one home, its own vocabulary, turned on by one line. So the layer this record names has two kinds of instance, platform systems (D6) and extension systems (the manifests), and a third the language cannot yet say: a story's own system. Today an author approximates one with `define trait`, `define action`, `define machine` and clauses, which gives the pieces and not the whole; what *linking* needs is a rule consulted by taking, dropping, breaking and every other action on a linked thing, which is a system's shape, not a clause's. This record decides that such a thing is a system and belongs to this layer; it does not decide the Chord form (a `define system`, a story-authored manifest, or something else), because no story in hand needs it yet and ADR-350 D2 forbids a word before its reader. The decision it does make: when that story arrives, the form is designed against the extension manifest, so that an author's system and the platform's are one shape at different tiers, as a story action and a stdlib action already are (ADR-267, ADR-270).

## Consequences

- **The core concepts and `CLAUDE.md`** gain the row: *system* — a rule consulted by more than one mover or action; home `packages/world-model/src/world/` (world state) or the engine (turn cycle); the one-home test. The *Logic Location* table and the "where does this belong?" checklist carry it.
- **ADR-378** cites this record for its D0 and builds traversal as the first worked example: one query in `src/world/`, read by `going`, the vehicle machine and pushing in Phase 14, by NPC movement in the filed follow-on.
- **An author-defined system** (D9) is a named gap with a named shape (the extension manifest at story tier) and no record yet; the first story that needs one — a linking magic, an alchemy — opens it. Until then, the extension manifests are the reference implementation of "a system with a vocabulary", and new extensions are written knowing an author may one day write the same thing.
- **Containment and time** are named as systems with their state recorded; neither is decided here. The next record that touches either (a second thing that carries occupants; a second clock) decides it, citing D6.
- **A structural test per system** pins the one-home rule mechanically, in the shape of `lifecycle-call-site.test.ts`: a source scan that fails when a consumer outside the home reads the system's raw data (for traversal, `RoomTrait.exits` or `exit.blocked.*` read anywhere but the query). The first is ADR-378's AC.
- **Issues**: #601 (D8, Architecture).

## Acceptance criteria

- **AC-1 (D1–D3, D7)**: `docs/core-concepts/README.md` and `CLAUDE.md`'s *Logic Location* table carry the system row and the one-home test, in one sentence each; the row cites this record. *(Landed 2026-10-20, session d4875a, ADR-378 Slice 6: the row in `CLAUDE.md`'s table and a Systems section under Behaviors vs Actions in the core concepts, both naming the test and this record.)*
- **AC-2 (D6)**: the inventory table's "home today" column cites a file for every row, read at drafting (this record); a reader can open each.
- **AC-3 (D8)**: the NPC traversal issue exists, labelled, citing this record and the Context table row.
- **AC-4 (D2, structural, lands with ADR-378)**: a world-model test scans `packages/` source and fails on any read of `RoomTrait.exits` or the `exit.*` keys outside traversal's home, with the known consumers enumerated as the allowed set; the test is the template the next system copies.

## Session

Drafted in session b86789 (2026-10-19) on `chord-4-0`, during Chord 4.0 plan Phase 14's design conversation, from the code cited in the Context; no implementation.
