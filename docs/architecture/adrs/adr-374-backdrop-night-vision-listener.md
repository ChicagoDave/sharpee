# ADR-374: Scope and senses — a backdrop is present in many rooms, night vision is a word, and a listener hears a sound

**Status**: **ACCEPTED** (David, 2026-10-15, session 39d4c7: "proceed", on the five calls as recommended — one presence predicate for doors and backdrops, `can see`/`can reach` reading the platform, a night-vision observer seeing its own dark room, a listener hearing `play sound` in the world, and GH #537 folded in — after `adr-review` 21/21 with three citation findings folded in). D6 (revised onto ADR-172), D9 (lighting and extinguishing) and D10 (power) were added or rewritten after acceptance under the mantra "elegance and alignment" and approved by David the same day ("go on D6, D9, D10"). Drafted 2026-10-15 (session 39d4c7, branch `chord-4-0`, Phase 9 of `docs/work/chord-4-0/plan-20261013-chord-4-0.md`). The rows are David's 2026-10-12 dispositions in `docs/work/chord-4-0/standard-if-checklist.md` (row 113 backdrop, row 66 night-vision, row 64 listener); the shapes below are Claude's drafting, with reasons. Five calls are put to him, each marked **[call]** with a recommended answer: how presence in many rooms is modelled (D1), whether `can see`/`can reach` read the platform (D4), whether a night-vision player sees a dark room (D5), what a listener hears (D6), and whether GH #537 folds in (D8).

**Scope**: `packages/world-model` (a presence predicate shared by doors and backdrops; `BackdropTrait`, new, both barrels; `SwitchableTrait.powerSourceIds` and `SwitchableBehavior.hasPower(entity, world)`; `LightSourceBehavior.givesLight`, read by the room light check and `canSee`), `packages/engine` (the sound stage gathers `sound.emitted` events and runs heard events through the event processor), `packages/stdlib` (looking, arrival and the perception service consult the observer's night vision; `lighting` and `extinguishing`; switching on an unpowered light), `packages/chord` (placement lists, `night-vision` and `listener` adjectives, the `hearing` event verb, gates; `chord.ebnf` and its pin re-recorded without a bump; catalog and manifest), `packages/story-loader` (lowering; `can see`/`can reach`; the sound's world event), `packages/branch-tester` (the derived runner reaches an `after hearing` branch through the clause that plays the sound), `docs/architecture/chord-grammar-changes.md`, the Chord guide, the IDE Docs tab, `branch-stories/upps` (the exercisers), and the checklist's evidence pointers.

## Date: 2026-10-15

**Kind**: technical

## Parent

- **ADR-350 D2/D3** (Chord exposes only what the platform enforces, and enforcement is part of the decision): why D4 exists — a `night-vision` word is unobservable while `can see` ignores light.
- **The door's two-room presence**: David's ruling of 2026-07-18, recorded only in the code (`WorldModel.ts:1790`, `VisibilityBehavior.ts:197`, each citing "ADR-234 AC-3"; ADR-234's AC-3 itself says only that a door is examinable, openable and lockable): the precedent D1 generalises.
- **ADR-328 D5** (`NightVisionTrait`, the observer-side darkness rule): the marker D3 exposes and D5 extends to the observer's own view.
- **ADR-360 D1 and D4** (a region declares its rooms as groups, and any other room joins with `in the <region>` on its own block; `in the <region>` on anything but a room is `analysis.thing-in-region`): the membership D2 reads, and the gate D2 amends for scenery. ADR-236's `containing` line is removed by ADR-360 and is not used here.
- **ADR-216** (media: `define sound`, `play sound`): the half of the listener row Chord already has (D6).
- **ADR-257** (language versioning, as amended): additive; the pin is re-recorded under the unpublished 4.0 surface.

## Context — measured, not assumed

**A thing lives in one place.** `IRPlacement` carries one `place` (`chord/src/ir.ts:868`), and the world model's containment is a single parent. The one exception is the door: `default_door_visibility` puts a door in scope at both of its rooms (`world-model/src/world/WorldModel.ts:1790`), and `VisibilityBehavior` repeats the rule twice, in `canSee` (`VisibilityBehavior.ts:197-205`, `231`) and in `getVisible` (`:310-317`). Each site re-derives "is this door at this room" from `DoorTrait.room1`/`room2`. Grep for `backdrop` across `packages/*/src` finds only a browser dialog (2026-10-15). The corpus already needed one: the Secret Letter's `branch-stories/secret-letter/backdrops.chord` builds each of Grubber's Market backdrops as one scenery thing that a `when Jack moves` clause moves into the player's room on arrival — Inform's own machinery, by hand — and its header records the cost: where she goes outside the set, the thing "stays in the last room it was in", and every set beyond a region is a condition composition. That story is tabled and is not migrated here. A thing written `in the <region>` is refused today (`analysis.thing-in-region`, `chord/src/analyzer.ts:1821`, ADR-360 D4).

**Night vision is enforced for sight checks but not for the observer's own view, and Chord cannot say it or observe it.** `NightVisionTrait` is read at the two darkness gates (`VisibilityBehavior.ts:210`, `258`), so an observer with it can examine and take things in a dark room. Looking does not ask: `looking-data.ts:21` calls `VisibilityBehavior.isDark(room)`, a fact about the room, and so does the perception service's filter (`PerceptionService.ts:179`, `311`); the trait's own header records this ("the observer's own arrival description still reads as a dark room's"). In Chord there is no word for it, and the one condition that could observe it does not consult sight: `X can see Y` and `X can reach Y` evaluate as "share a containing room" (`story-loader/src/evaluator.ts:424-433`, "Phase B semantics: co-location … a later refinement"), true in a pitch-dark room and through a closed box. The corpus uses `can see` once, in a test fixture (`chord/tests/fixtures/zoo-timeline.story:23`, `:29`).

**A sound is presentation only.** `define sound <name> from "<file>"` declares a media asset (`chord/src/parser.ts:7440`); `play sound <name>` lowers to `emit media-sound-play` carrying the file path (`chord/src/analyzer.ts:6744`, `story-loader/src/event-id-map.ts:32`), which only a client reads. **Correction (2026-10-15, found at implementation):** this paragraph first said nothing in the world hears a sound. That is wrong. ADR-172 (spatial sound propagation, L1 implemented) models world sound: an `ISound` with kind and volume, propagation over rooms and walls (`engine/src/sound/propagation.ts`), the existing `ListenerTrait` (`world-model/src/traits/listener/`, which the player gets automatically), and a per-turn dispatcher emitting `sound.audibility.heard` per listener in reach (`engine/src/sound/dispatcher.ts`). What is missing is the half ADR-172 deferred: the heard events go to the turn's output only (`engine/src/turn/sound-dispatch.ts`) and reach no world event handler, and a Chord clause has no way to emit an `ISound` (`context.emitSound` exists only on an action's context, `engine/src/command/action-context-factory.ts:359`). `define sound` / `play sound` remain the media half.

**UPPS has none of the three.** No dark room, no sky or view shared across rooms, no listener; the loader robot (`upps.story:250`) is a person in the Loading Dock.

**GH #537 is adjacent.** A declared state named `dark` on a non-room compiles, but `<thing> is dark` always reads room darkness (`evaluator.ts`, `symbolHolds`). The plan asks that it be checked before the dark-compartment exerciser is modelled. It does not block one: a compartment is a room, and `dark` on a room is the trait.

## Decision

**D1 — Presence in many rooms is one predicate that doors and backdrops share. [call]** World-model gains `BackdropTrait { roomIds: string[] }` and one function, `PresenceBehavior.isPresentAt(entity, roomId, world): boolean`: true when the entity's containing room is `roomId`, or it is a door with `roomId` as `room1`/`room2`, or it carries `BackdropTrait` listing `roomId`. The door scope rule becomes `default_presence_visibility` over doors and backdrops, and `canSee`/`getVisible` read `isPresentAt` instead of re-deriving the door case (the three sites in Context), as does `ReachabilityBehavior.canReach` wherever it compares rooms. A backdrop is physically placed in the first room of its list, so `getLocation` and save/restore need nothing new; at every other listed room it is present the way a far-side door is — visible and reachable, never listed, darkness applying as usual. Recommended over Inform's moving backdrop (relocate the thing into the player's room on each move), which is wrong for any other observer — the robot in the next room would not see the sky — and over one copy per room, which splits one thing's state.

**D2 — `in <Room>, <Room> and <Room>` and `in the <region>` place a backdrop.** The placement line takes a list (`, ` and a final `and`) or a region, resolved at load to its member rooms — the rooms its groups create and the rooms that join it with their own `in the <region>` line (ADR-360 D1, D4), the set `WorldModel.isInRegion` answers. **This amends ADR-360 D4**: `in the <region>` on a `scenery` thing places a backdrop; on anything else that is not a room it stays `analysis.thing-in-region`. The implementing session adds a dated amendment line to ADR-360's Status naming this decision when D2 lands. A list or region placement requires `scenery` (`analysis.backdrop-not-scenery`: a thing a player could take cannot be in four rooms); `on` takes one supporter only and `starts in` one room only (`analysis.placement-list-relation`); a list naming something that is not a room is `analysis.backdrop-not-room`. `IRPlacement` gains `places: string[]` beside `place` (the first). A one-room `in` is unchanged.

**D3 — `night-vision` is a person adjective lowered to the marker.** A marker adjective on `a person` only (`analysis.night-vision-not-person`), unconditional, lowering to `NightVisionTrait`.

**D4 — `can see` and `can reach` read the platform. [call]** The evaluator answers `X can see Y` with `VisibilityBehavior.canSee` and `X can reach Y` with `ReachabilityBehavior.canReach`, retiring the co-location stand-in. This is what makes D3 observable from Chord (`while the loader robot can see the crate`) and what makes D1's backdrop answer from every listed room. **Content change**: in a dark room, or with the target in a closed opaque container, `can see` turns false where it was true. The one corpus use (`zoo-timeline.story`) is a lit-room fixture and is expected to pass unchanged; any changed answer is reported at the phase. Recommended over leaving `can see` co-located, which would ship a word (night-vision) no Chord story could tell apart from its absence.

**D5 — A night-vision observer sees the dark room it stands in. [call]** Looking and the perception service ask `VisibilityBehavior.isDarkFor(observer, room)` — `isDark(room)` unless the observer carries `NightVisionTrait` — instead of the room-only fact. A playable night-vision character (`change the player to the loader robot`) then gets the room's description and contents in a dark compartment; anyone else still gets darkness. The room itself stays dark: light-dependent rules (`while the Hold is dark`) are unchanged. Recommended because the trait already lets that observer examine and take everything in the room, so a `look` that says "pitch dark" contradicts the commands that follow it; the alternative keeps the trait header's narrower reading and leaves a playable robot blind to its own surroundings. The implementing session rewrites that header sentence (`nightVisionTrait.ts`) when D5 lands; ADR-328's text does not state the narrower reading and needs no amendment.

**D6 — A sound is one thing with two sides, and a listener hears its world side through ADR-172. [call] — revised 2026-10-15 after the Context correction, approved by David.** The first draft (a new `ListenerTrait`, the scope resolver's same-room-or-next-door rule, a sound heard "in the player's room") built a second sound model beside ADR-172's; it is withdrawn. Revised:

- *One concept.* `define sound <name> [from "<file>"]` declares a sound. Its media side is the file (ADR-216, unchanged); its world side is an ADR-172 sound whose `kind` is the name. `from` becomes optional: a sound with no file is heard in the world and played to no speaker.
- *Played where it is played.* `play sound <name>` emits both sides. The world sound's `sourceLocation` is the room of the clause's owner (a thing's room, a room itself; the player's room for a story-level clause), and its `sourceEntity` is the owner, so the klaxon sounds from the klaxon. Volume is ADR-172's `normal`; Chord gains no volume word here.
- *One path for every emitter.* Today only an action's context can emit a sound (`context.emitSound`, `engine/src/command/action-context-factory.ts:359`), although ADR-172's authoring summary promises emission "from any action, behavior, or event handler". The engine closes that gap with one rule: the turn's semantic events of type `sound.emitted`, carrying an `ISound`, join the sound buffer before the sound stage runs. `play sound` lowers to that event; actions keep `context.emitSound`, which is the same buffer.
- *Heard like any other event.* The sound stage runs each `sound.audibility.heard` event through the event processor, as the action's events already go, so world event handlers see what was heard. `hearing` joins `entering`/`leaving` as an event verb: `after hearing the klaxon` in a block fires when that block's owner is the listener and the heard kind is that sound (`analysis.hearing-unknown-sound`), `after` only (`analysis.hearing-after-only`).
- *Who hears is ADR-172's answer.* `listener` is a marker adjective on a person or thing lowering to the existing `ListenerTrait` (the player already carries it); whether it hears, and how well, is ADR-172's propagation over rooms and walls — no rule of this ADR's own. An `after hearing` on an owner that is not a listener is `analysis.hearing-not-listener`.

**D7 — Starting state needs nothing new.** A backdrop has no starting state of its own; night vision and listening are markers with no state.

**D8 — `dark` is reserved as a state name off rooms (GH #537). [call]** The analyzer refuses a declared state named `dark` on any non-room (`analysis.dark-state-reserved`, naming `lit`/`light-source` or a different word), since `<thing> is dark` already belongs to room darkness. Recommended to fold in here because Phase 9 is the darkness phase and the fix is one gate; the alternative leaves #537 open for its own session.

**D9 — A flame light is lit and put out by stock verbs. [call] — added 2026-10-15 at David's direction ("fix the lamp here and add it to v4 work"), approved by him.** *Context, measured:* in Chord today a plain `light-source` is always lit — the loader adds `LightSourceTrait()` with `isLit` unset (`story-loader/src/loader.ts:1968`), and an unset, non-switchable light counts as lit (`VisibilityBehavior.isLightActive`) — and nothing can put it out. `LightSourceBehavior.light` and `.extinguish` exist (`world-model/src/traits/light-source/lightSourceBehavior.ts:21`, `:36`) with no stock action calling them. The standard grammar has no `light` line at all, though ADR-371's grammar note says `light lamp` "must stay a switching form" (`standard-en-us.story:617`); Dungeo writes its own `light X with Y` (`liquid-grammar.ts:86`). Two of the corpus's test fixtures modelled a lamp as `states: dark, lit` for want of anything better (found by D8, reworked to a bell 2026-10-15). *Decision:* two new stdlib actions. `lighting` — `light X`, `light X with Y`, `ignite X` — on a `light-source` that is not `switchable` calls `LightSourceBehavior.light` (`lit`: "{You} {light} {the item}."); refuses `already_lit`, `no_fuel` (fuel at zero), `not_light_source`; on a `switchable` one it delegates to switching on, as inserting delegates to putting, so `light flashlight` keeps ADR-371's promise. `extinguishing` — `extinguish X`, `put out X`, `blow out X`, `snuff X`, `douse X` — calls `.extinguish` (`extinguished`); refuses `not_lit`; a switchable one delegates to switching off. `light-source with the <tool>` (the keyless `with` form, as `flammable with the torch`) makes lighting need that tool held (`no_flame`: "{You} need {the tool} to light {the item}."). Starting state: `STARTS_STATE_PAIRINGS` gains `lit`/`unlit` → `light-source` (`isLit`), so a lantern can begin dark; a bare `light-source` keeps starting lit. `on`/`after the player lighting` and `extinguishing` are ordinary clauses. Burning a lantern with a match stays this, not ADR-371's `burning` (which consumes a flammable thing).

**D10 — A switchable device can need power, and power is what is inside it. [call] — added 2026-10-15, approved by David; revised the same day at implementation, before code, when the platform's existing power model was found.** *Context, measured:* power already belongs to the device, not to light. `SwitchableTrait` carries `requiresPower` and `hasPower` (`world-model/src/traits/switchable/switchableTrait.ts:17`, `:20`), and switching on refuses `no_power` when a device requires power and has none (`stdlib/.../switching_on/switching_on.ts:140`). But `hasPower` is a stored flag that only `SwitchableBehavior.setPower` writes, and nothing calls `setPower` (grep of `packages/*/src` and `stories/*/src`, 2026-10-15). Separately, "this gives light" has two readings: the room's light check (`VisibilityBehavior.isLightActive`) and `canSee`'s rule that a lit lamp is visible in the dark, which reads `LightSourceTrait.isLit` directly. *Decision:*

- *Power is derived from containment.* `powered by the <thing>` (a list allowed) on a `switchable` lowers to `SwitchableTrait.powerSourceIds` and `requiresPower: true`. `SwitchableBehavior.hasPower(entity, world)` answers: with power sources declared, every one of them is directly inside the device; without, the stored `hasPower` flag (a TypeScript story's own model, unchanged). `canSwitchOn` and `switchOn` read it. The battery goes in and comes out with the stock putting and taking; nothing has to remember to update a flag.
- *One predicate for "gives light".* `LightSourceBehavior.givesLight(source, world)`: false for a switchable that requires power and has none; otherwise the light's own state (`isLit` when set, else a switchable's `isOn`, else lit). The room light check and `canSee`'s lit-lamp rule both read it.
- *What the player sees.* Switching on a torch with no battery refuses with the existing `no_power`. Taking the battery out of a lit torch leaves the switch on and the torch dark — the room goes dark on the spot if it was the only light; putting the battery back lights it again. A radio or a fan works the same way; nothing here is about light except the last step.
- *Gates.* `powered by` on a thing that is not `switchable` → `analysis.powered-not-switchable`; not a container → `analysis.powered-not-container` ("inside" is the containment relation); a name that resolves to nothing → `analysis.setting-names-no-entity`.
- Fuel that burns down over turns (`LightSourceTrait.fuelRemaining`, read today only by Dungeo's fuses) stays TypeScript-only.

### Before and after

Unshipped syntax throughout; UPPS lines are illustrative.

```chord
## D1–D2. Today a thing is in one room; the sky would need three copies.
create the view of Ceres
  a thing, scenery
  in the Landing Pad, the Tram Platform and the Dome Gate
  aka ceres, sky, view

  Ceres hangs overhead, grey and pocked, close enough to count craters.

## D3–D5. Today the robot's sight in the dark cannot be said or observed.
create the loader robot
  a person, night-vision, listener
  in the Loading Dock

  after hearing the depot klaxon
    move the loader robot to the Sorting Room
    phrase robot-answers-klaxon
  end after

create the Cargo Crawlspace
  a room, dark

## D6. The sound already exists; today nothing in the world hears it.
define sound depot-klaxon from "sounds/klaxon.ogg"
```

Play:

```
> look                      (Loading Dock, Landing Pad, …: "Ceres hangs overhead …" from each listed room)
> examine ceres             (works in each listed room; "You can't see any such thing." elsewhere)
> (as the robot) down       Cargo Crawlspace — the robot sees the room and its contents.
> (as the courier) down     It's pitch dark, and you can't see a thing.
> pull lever                (a clause plays the klaxon) — the robot, a room away, comes through.
```

## Consequences

- One rule says where a thing is present; the door's two-room case becomes its first instance rather than three hand-copied checks.
- Chord's `can see`/`can reach` mean what the platform means. Every later sense or reach rule reaches Chord with no evaluator change.
- A night-vision player character is a coherent thing to write; the trait header's note on the observer's own view is rewritten.
- Sounds gain a world side. A listener's reaction is a world change made by the story, not a media event, so it is saved and replayed like any other.
- Save and restore: no new store. `BackdropTrait.roomIds`, `NightVisionTrait` and `ListenerTrait` are trait data the entity serialization already carries.
- Dungeo: D4 is Chord-only and Dungeo writes no Chord. D5 changes what a night-vision *observer* is told when it looks; Dungeo gives the trait to five NPCs (troll, thief, robot, cyclops, dungeon master: `stories/dungeo/src/regions/underground.ts:317`, `npcs/*/…-entity.ts`), none of which is ever the player, so no player-facing text moves. D1 rewrites the door's presence checks, which Dungeo's doors exercise throughout. The chain is the check.
- The language version does not move (ADR-257); the pin is re-recorded.

## Acceptance criteria

1. A backdrop placed in three rooms is examinable from each and out of scope in a fourth; in a dark listed room it is unseen; a door is still present at both its rooms through the shared predicate (world-model tests; story-loader real-engine test; UPPS cards).
2. `in the <region>` places a backdrop in every member room; `analysis.backdrop-not-scenery`, `analysis.placement-list-relation`, `analysis.backdrop-not-room` fire as named (chord tests).
3. `night-vision` on a person lowers to `NightVisionTrait`; on a thing it is `analysis.night-vision-not-person` (chord test; story-loader test asserting the trait).
4. `X can see Y` is false in a dark room for an observer without night vision and true with it; false for a target in a closed opaque container (story-loader real-engine test).
5. `look` by a playable night-vision character in a dark room gives the room's description; by anyone else, darkness (stdlib test; UPPS card).
6. Playing a sound runs `after hearing the <sound>` on every listener ADR-172's propagation reaches, in the same turn, and only for that sound; who is reached is ADR-172's answer (through open exits a normal sound carries two rooms), not this ADR's. `after hearing` on a thing that is not a listener, and the other `hearing` diagnostics, fire as named (story-loader real-engine test asserting the bodies' world changes; chord tests; UPPS card). *Amended 2026-10-15 at implementation: the first text named a same-room-or-next-door limit from the withdrawn D6 draft.*
7. For each admitted word (`night-vision`, `listener`, the placement list), a test fails when the platform stops honouring it (ADR-350 AC-2).
8. If D8 is taken: `states: dark, …` on a thing is `analysis.dark-state-reserved`, and GH #537 closes.
9. Grammar, manifest and alias `--check` fresh; the derived runner reaches the UPPS hearing branch; Dungeo chain green with any changed answers listed.

## Implementation notes

- **Presence (D1).** `PresenceBehavior` (`world-model/src/world/PresenceBehavior.ts`) answers for doors and backdrops; the door scope rule became `default_presence_visibility`, keyed on the actor's containing room, and `canSee`/`getVisible` read it. Reachability needed no change: it delegates to `canSee`. `is here` reads presence too, so `while the sodium lights are here` holds from every listed room.
- **Placement (D2).** `and` separates places exactly as it separates names in every Chord name list; a first cut that tried the joined name as one entity first was removed as a guess. The region form expands to the region's collected members after membership is gathered.
- **Night vision (D5).** One function, `VisibilityBehavior.isDarkFor`, is read by looking, arrival (`going`), the perception filter, and the shared auto-look helper (`stdlib/.../illumination-shared.ts`) that switching on and lighting both use.
- **`can see` / `can reach` (D4)** call `world.canSee` / `world.canReach`.
- **Sound (D6).** Built on ADR-172, as revised. `SOUND_EVENT_TYPES` (`EMITTED`, `AUDIBILITY_HEARD`) moved into `if-domain`, the one package the engine and stdlib share, replacing a literal the engine had duplicated. The engine's sound stage gathers the turn's `sound.emitted` events into the buffer and applies heard events through `withWorldReactions` (`engine/src/events/world-reactions.ts`), the same function the command executor now uses for an action's events. `play sound` lowers to its own IR statement, `play-sound`; the loader emits the cue when the sound has a file and always the world sound, from the owner's `location`. The head grammar's one exception is `TAILED_EVENT_VERBS` (`hearing`); David chose this shape (A) over `when <sound> sounds` (B). World-index types a hearing branch as the player command whose clause plays that sound. **Who hears is ADR-172's propagation**: a normal sound carries through open exits at least two rooms (the story-loader test pins it), and AC-6 was amended accordingly. **A coupling worth knowing:** `play sound X when client has sound` now also withholds the world sound on a client without audio; the guide says to leave that condition off a sound the story must hear. **Amended 2026-10-22 (chord-4-0 alignment-fixes Phase 9, David's Q9 answer C):** the coupling is closed at compile time. A client-capability condition on `play sound` is refused (`analysis.play-sound-client-has`, through `and`/`or`/`not`), so the world side always sounds and game state never differs by client; a client without audio does not play the cue. Fernhill's boiler thump dropped its tail; ADR-216 AC-3 is amended to match.
- **Lighting (D9).** `lighting` and `extinguishing` delegate to switching on/off for a switchable light through `delegation-shared.ts`, the D6-B seam inserting already used, now one module for three actions (the call-site guard checks it); a delegated refusal speaks the inner action's words (`inDelegateWords`). The tool requirement follows FlammableBehavior's trio. `ignite` stays burning's grammar.
- **Power (D10).** As revised: power belongs to `SwitchableTrait` (`powerSourceIds`), `SwitchableBehavior.hasPower(entity, world)` derives it from containment, and `LightSourceBehavior.givesLight` is the one reading of "gives light" — the room light check, `canSee`'s lit-lamp rule, `getVisible`'s dark branch and Chord's `is lit` all call it, replacing three copies.
- **Setting schema.** `flammable` (missing since ADR-371), `light-source`, `attached` (ADR-373, whose bespoke anchor check was removed) and `powered` joined the keyless entity-ref rows, so their names are checked at compile by the one census gate.
- **Found and fixed on the way:** two tailed clauses on one owner were refused as duplicates (ADR-372 D1); the tail is now part of a clause's identity.
- ADR-360's Status carries the amendment line for D2's region form.

## Session

Session 39d4c7, 2026-10-15, branch `chord-4-0`.
