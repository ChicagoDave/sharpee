# UPPS design: rooms 7 to 60

**Date**: 2026-10-12
**Session**: 1f771c
**Status**: DRAFT, awaiting David's review before room 7 is written
**Inputs**: four forked design notes (plot arc, geography and gating, construct coverage, endings and forks), merged here; the story as of `765480951`; `docs/objectives/author-narrative-testing.md` O-1 (60 rooms, 5 or more open spaces with transitions, 30 objects, 10 puzzles)

This document is the brief for every room from 7 on. Each room is still written, seeded and recorded one at a time; this fixes what the rooms are, what gates them, which Chord constructs each puzzle carries, where the tree forks, and how the story ends. Where the four notes disagreed, the choice and its reason are recorded in section 9.

## 1. The spine

The route card already says it: "ROUTE 7: Ceres, Titan, Kepler Station. Return to depot when empty." Three stops, three parcels, home when the satchel is light. The Kepler parcel is a court summons for Aurelio Vance, and "addressee delivery, no proxy signature" is the rule the whole story tests. Vance never takes mail; he owns the people who would. Every hand of his is an attempt to get the summons signed for by somebody else or to make it not exist.

Three signatures give the story its shape. Quint's at Ceres is an illegal proxy (exists, a lose). The Titan addressee cannot sign and a witness signs legally in his hearing, which teaches the rule. Vance at Kepler offers a proxy in better clothes, as "the station manager", and a courier who learned the rule refuses it and names him.

The counter for the last room is earned in the first town: Vance's face is on a plaque in Piazzi Town. A courier who never read it reaches Kepler and must go back.

## 2. Vance's hands

| Leg | Hand | Pressure | Counter |
|---|---|---|---|
| Ceres pad | Dolores Quint | sign it over to me | the route card (written) |
| Piazzi Town | Teodor Rask, Meridian Express | let us carry it to Kepler tonight | route mail does not change hands |
| Huygens Orbital | the customs robot | undeclared legal instrument, confiscated | the Ceres receipt proves sorted mail in transit |
| Huygens, the shuttle gate | Rask with a forged UPPS recall | your depot says go home | the depot stamp on the route card does not match |
| Kepler, the front desk | the company receptionist | Mr Vance is not on station, I will sign | the parcel is addressed to the office behind her |
| Kepler, Vance's office | Vance as "the station manager" | I sign for the owner | his face from the plaque, his signature from the lease |

Rask is one recurring courier, met on Ceres and again on Titan; his ship is seen on the Kepler pad and he is not, which means he went ahead.

## 3. Regions and rooms (60)

| # | Region | Rooms | Open space | Transition in | New |
|---|---|---|---|---|---|
| A | The depot (Sorting Room, Loading Dock) | 2 | | | 0 |
| B | The Sparrow (Hold, Cockpit, Airlock + Starboard Lock, Dorsal Lock, Galley, Bunk, Engine Bay) | 8 | | | 5 |
| C | Ceres surface (Landing Pad, Dust Road, Tram Platform) | 3 | open 1 | the port Airlock | 2 |
| D | The tram (Tram Car) | 1 | transition C to E | | 1 |
| E | Piazzi Town | 14 | open 2 | the tram; back on foot through the Dome Airlock, suited | 14 |
| F | Huygens Orbital, Titan customs | 7 | open 3, the Inspection Hall | the starboard collar, second fold | 7 |
| G | The drop shuttle | 1 | transition F to H | | 1 |
| H | Kraken Shore, Titan surface | 8 | open 4 | the shuttle | 8 |
| I | Kepler Station | 16 | open 5, the Dome Promenade | the dorsal docking tube, third fold | 16 |
| | | **60** | | | **54** |

Open spaces 1, 2 and 5 are `a region` blocks with `rooms` groups and an `exits` table (ADR-360, ADR-362: shipped, tested, used by no story yet, so UPPS is the first). Open spaces 3 and 4 are regions of written rooms, so the region construct is seen both ways.

### The ship and its three doors

*(Superseded 2026-10-13 by ADR-366 D7: the Sparrow becomes one `vehicle` with its rooms `aboard:` and one hull opening, `west to outside` from the Airlock, resolved to wherever the ship is; the tram car and drop shuttle become line vehicles rather than rooms. Rewritten at Chord 4.0 plan Phase 15 (2026-10-20); the table below is the pre-vehicle design and stays as the record of what the gap cost.)*

Chord has no vehicle and no exit whose destination varies with state (ADR-350). So the Sparrow gets one fixed hull opening per world, each blocked off its leg:

| Leg | Opening | Out |
|---|---|---|
| Ceres | the port Airlock (room 5) | west onto pad 14 |
| Titan | the Starboard Lock, a customs docking collar | east into the Collar Vestibule |
| Kepler | the Dorsal Lock above the Cockpit | up into the Docking Tube |

The leg is a state on the route card: `states: ceres-leg, titan-leg, kepler-leg, route-empty`. It advances when a parcel is signed for. The fold sequence reads it: `fold-ends` has a per-leg phrase and mates the collar on titan-leg or unseals the dorsal hatch on kepler-leg.

### Piazzi Town, room by room

| Room | Exits and gates | Holds |
|---|---|---|
| E1 Tram Terminus | south to the Tram Car, blocked while the car is not at-dome; north to the Concourse | arrival board (readable), turnstile, a dropped transit token |
| E2 Concourse | south E1; north E3; west E4; east E5 | dome struts, company poster (readable), vending kiosk |
| E3 Fountain Square | south E2; north E10; west E6; east E13 | the low-gee fountain, benches, notice board (readable) |
| E4 Market Row | east E2; north E8, blocked while the alley grille is locked | stalls, the grocer (person, topics), the grille (openable, lockable, scenery) |
| E5 Transit Office | west E2 | the transit clerk (person), the wall map, the call-the-car button (switchable), the Kepler Dome Company plaque with Vance's portrait (readable) |
| E6 Post Counter | east E3; north E7, blocked while the shutter is down | counter (supporter), brass bell (pushable), ledger (readable), the shutter |
| E7 Post Back Room | south E6; west E8, blocked while the back door is bolted | the postmistress, who is the Ceres addressee (states hiding, present, signed), the bolt, mail sacks |
| E8 Service Alley | south E4; east E7 (the bolt is reached through a grille from this side); north E9 | pipes, a maintenance cart (pushable), the grille key on a hook |
| E9 Dome Airlock | south E8; west to the Dust Road, blocked while the player is not wearing the suit, and while the inner door is open | inner door, outer door (openable), cycle lever |
| E10 Hab Stair | south E3; up E11 | handrail, graffiti (readable) |
| E11 Upper Gallery | down E10; east E12; west E14 | railing, planters |
| E12 Observation Deck | west E11; down E13 | the dome glass, a coin telescope (switchable) |
| E13 Observation Walk | west E3; up E12 | Teodor Rask (person), a bench |
| E14 Clinic | east E11 | a medic (person), a cot, a locked cabinet (container, lockable) |

Shape: a loop (Concourse, Fountain Square, Observation Walk) with two spurs (Transit Office, Clinic) and the alley as a hidden second route from Market Row to the back of the Post Counter and out to the surface. The tram goes back to the pad if the clerk calls the car; otherwise the return is on foot, suited, through the Dome Airlock. Both rejoin at the Dust Road, so the tree forks on the way back and merges at the pad.

### Later regions at region granularity

- **F Huygens Orbital**: Collar Vestibule, Inspection Hall (hub, open), Customs Office, Bonded Store (sealed), Robot Bay, Shuttle Gate, Observation Blister. The customs robot blocks the hall's inner side; Rask waits at the Shuttle Gate with the recall.
- **G Drop Shuttle**: states docked-high, dropping, docked-low, rising; a sequence like the tram's with a window phrase on the way down.
- **H Kraken Shore**: Kraken Landing, Methane Shore, Boardwalk, Fuel Pier, The Light, Keeper's House, Shed, Dunes. Open to Titan's air, so the suit gates every exit off the landing. The Titan addressee is the lighthouse keeper, in the Keeper's House with a hand crushed by the pier crane; the fuel-pier hand is the witness.
- **I Kepler Station**: Docking Tube, Arrivals (gate opens to the worn satchel), Hangar Gallery, Promenade West, Dome Promenade, Promenade East, Directory Hall, Company Lobby, Front Desk, Records Corridor, Records Room, Vance's Office, Private Dock, Vance's Yacht, Maintenance Walk, Dome Ring. The Maintenance Walk and Dome Ring are the hidden route around to the Records Room, mirroring Piazzi Town's alley.

## 4. The ten puzzles and their constructs

Each puzzle carries at most four new constructs. Room 6 carried eight and produced four "nothing catches" seeds; density hides errors.

| # | Puzzle | Where | Constructs introduced |
|---|---|---|---|
| 1 | The tram brake: Quint releases it by topic, not by object; the car is a thing with states and a sequence | C, D | region with `rooms` group and `exits` table (the Ceres surface), a topic that changes state, `define sequence` on the car's state, `define chapters` begins |
| 2 | The shutter: ring the bell, the postmistress is hiding and will not open until the courier asks for her by name | E6, E7 | `pushable`, `supporter`, entity-tier topic key, `define greetings` |
| 3 | The alley: the grocer names the key, the grille unlocks `with the key`, the bolt is reached through the grille | E4, E8, E7 | `lockable with`, `starts locked`, `a door` with `through`, `concealed` |
| 4 | The plaque: reading it is what later names Vance; the clerk will not say where he is | E5 | `readable` reused, `select on` a state for the clerk's line, `counter` of deliveries with `raise`, `use scoring` and `award` |
| 5 | Home on foot: Rask has taken the tram; the clerk's button calls it back, or the courier suits up and cycles the Dome Airlock in order | E5, E9 | `switchable` reused, `wears` and `carries` start lines, `make the player wear`, exit blocked on a wearing condition |
| 6 | Customs: the robot demands the bundle; showing the Ceres receipt proves mail in transit; giving is a lose | F | an imported customs `.chord`, `define phrasebook` and `use phrasebook while`, `define pronouns` for the robot, `never lies`, `define exchange` with `then asks` |
| 7 | The forgery: Rask's recall and the route card carry different depot stamps; reading both and refusing is the counter | F Shuttle Gate | `define action` and `extend action`, `override message`, the acting statement, Rask's `goal ... seek` and `feels` |
| 8 | The shore: suit on, `dark` tunnels under The Light, deadly exits into the methane, the keeper's barred door, the witness signature | H | `deadly` exits, `dark` and `light-source`, `climbable`, `define condition` with `each`, `one chance in N` weather, `define sound` with `client has sound` |
| 9 | The front desk and the records: the arrivals gate reads the satchel, the receptionist denies Vance, the Records Room lease carries his signature; the key is on the Maintenance Walk | I | `define timer` with `meanwhile`, `define machine` for the fold drive on its third run, `plural` parcels, `define trait` with data and `it`, `define channel` with `emit` |
| 10 | Naming him: show the summons or name Vance (topic) and the manager flips to Vance; give serves it | I Vance's Office | `states, reversible` on Vance, a `showing` reaction on the recipient (F-33 territory), `win`, `kill the player` with a body, the claims fragment's victory and defeat claims |

Constructs still unplaced after this table and taken by whichever room fits: `edible` and `drinkable` (Galley), `unlisted`, `open-inventory` (the loader robot on a revisit), `hiding-spot` (a stowaway in the Bunk is the Sparrow's own small puzzle, not one of the ten), `change the player to` a second playable (the robot for one scene in the Hold), `define initiative` and a threaded `define conversation` (Rask), `temperament` and `define code` (the customs officer), `at turn N`, `move ... offstage`, `when X moves`, `room name while`, the removed forms seeded one each for their fix-its.

Unshipped and not used: vehicles (ADR-350), perception predicates (ADR-246). `use hunger` and `use combat`: out of premise.

## 5. Changes to rooms 1 to 6

Each is a reach-back of the kind room 6 made to room 3, and each earlier card must pass unchanged.

1. The route card gains `states: ceres-leg, titan-leg, kepler-leg, route-empty`.
2. The mail bundle becomes `a container, openable` holding the Ceres parcel, the Titan parcel and the summons (three things, `plural` where the prose lists them). Quint's lose fires when she has the bundle or any parcel. The loader robot's `after giving` is unchanged (it moves the bundle).
3. The Landing Pad's north gains its destination: `north to the Dust Road`, the guard kept.
4. The Hold gains `east to the Starboard Lock` and `south to the Engine Bay`. It needs no `west to the Airlock`: the loader stamps plain exits in both directions (`packages/story-loader/src/loader.ts` 428 to 440, read 2026-10-12), which is how the tree reaches the Airlock today.
5. The Cockpit gains `up to the Dorsal Lock`. The fold drive's `after switching_on, once` loses `once` and gains per-leg guards.
6. The Airlock's outer hatch loses `once` on `after opening`; the Ceres line is guarded by ceres-leg and refused on the other legs with `wrong-side`; `west` is blocked on those legs too.
7. `define sequence the fold` gains per-leg `fold-ends` phrases and the collar and dorsal unseal.
8. The ramp stays sealed from the first fold to the end. The win phrase carries the courier home; there is no depot return room.

## 6. Endings

| # | Kind | Id | Where | Fires on |
|---|---|---|---|---|
| 1 | death | hatch-into-the-fold | Airlock | exists |
| 2 | lose | parcel-signed-away | Landing Pad | exists |
| 3 | lose | bundle-rides-north | Tram Car | the tram's sequence turn, with the bundle in the car and the player not: the first UPPS ending fired from a sequence, not a command |
| 4 | lose | meridian-handoff | Observation Walk | giving Rask the summons or the bundle |
| 5 | lose | customs-confiscated | Inspection Hall | giving the robot the bundle |
| 6 | lose | route-recalled | Shuttle Gate | accepting the recall (a topic answer, or giving Rask the route card) |
| 7 | lose | signed-by-the-manager | Vance's Office | giving the summons before he is named |
| 8 | win | summons-served | Vance's Office | giving the summons after the flip |

One death is enough for a postal story; every new loss is "the mail does not arrive". Every `win`, `lose` and `kill` carries its id, or no card can reach it (`coverage.ts` 128).

## 7. The tree

Facts from `packages/branch-tester/src/tree-document.ts`, read 2026-10-12: a persisted card drops `branches`, so a fork added at a segment's last card changes none of that file's bytes (662, 683); a lone continuation is refused (831); every line replays its prefix from the root.

**The one mid-segment cut.** `w7eqlqnb` ends on card 24, `give bundle to quint`. Fork at card 23 (`west` onto the pad with the bundle): the lose card moves into a one-card branch at ordinal 1, and the continuation at ordinal 0 goes `north` into the Dust Road. This is the only fork that edits an existing file; from room 7 on, every room's recording ends on the card the next room forks from.

**Shape per room.** One short refusal branch (1 to 4 cards: the blocked exit, the guard refusing, the wrong verb) so every room's cards land in their own segment. One lose branch per region at its antagonist beat. Deep lines only for the eight endings and the five open spaces. Target at 60 rooms: 130 to 160 segment files of 3 to 25 cards, which is the shape ADR-355 was measured on (Secret Letter: 157 segments).

**Claims fragment from room 7.** `upps.claims.chord`, named in `manifest.json` (ADR-365), grown per room like the tree: `claim the story ends in victory` and one `ends in defeat` per lose ending with its `needs rooms`, and `never the mail satchel leaves the player`. This is the only tier that asserts an ending's kind (F-32), and the one designed to catch the room-6 "nothing catches" seeds, whose errors change behaviour only off the recorded path.

**Assertions.** END STATE cards pin the state the ending read, not only the prose. Room-entry cards add a `channels` claim once the story declares a channel (puzzle 9). The F-33 probe is a one-card branch showing the route card to Rask with a precondition naming the card, recording whether the derived row still says `object-unreachable`.

## 8. Seeding the thin classes

Of 135 seeded errors so far, the compiler caught 46 with a span, the tree 62 by turn number, the derived tier 1 with a line, 18 were not errors, and 5 were caught by nothing (4 in room 6). From room 7, each room's seeds include, on purpose:

- one error the derived tier should be the first to catch with a line (an inverted guard on a clause the tree never reaches, a swapped refusal key);
- one error on a path the tree does not take, so the "nothing catches" count is measured per room rather than avoided, and the claims fragment gets its chance;
- one removed form (`define verb`, `if`, `containing`, `create the player`, a hatch) for its fix-it text, until each has been seeded once;
- a README line saying which rule the author expected, so "not an error" seeds are countable.

Rooms 7 to 12 are the first region with a `rooms` group and the first door, so their load-time seeds should probe which placement errors land in the analyzer and which at load (F-7, F-18 territory). F-25 (rooms entered inflated by derived placement) gets its scale measurement there too.

## 9. Where the notes disagreed, and the call

- **Titan's shape.** Plot had a port plus a settlement under the ice; geography had an orbital customs station plus a surface shore. Geography's version is used because it makes customs a hull-opening problem the ship design already solves, and the shore gives the suit a second region. Plot's Titan beats (the robot, the forgery, the witness signature) moved onto it.
- **Titan addressee.** Harbourmaster in a clinic (plot) or lighthouse keeper (geography): the keeper, with plot's crushed hand and witness signature, because the three-signatures spine is the best idea in the set and the keeper is the better room.
- **Piazzi Town's puzzles.** Plot's scrip-and-chandlery chain was dropped for geography's gates (shutter, grille, bolt, tram call, airlock), which are concrete and already exit-mapped. Plot's plaque survives, on the Transit Office wall.
- **Ending names and the win's room.** Plot's five losses were kept over the endings note's set because the forged recall and the manager proxy are stronger beats; the endings note's `bundle-rides-north` was added because an ending fired from a sequence is a first for the tree. The win fires in Vance's Office, not a depot room, so the room budget stays at geography's 60.
- **Leg tracking.** Route card states (geography) rather than only a deliveries counter (constructs): gates read as "while the route card is titan-leg". The counter stays for scoring.
- **Vance's yacht and a chase.** Rooms kept, chase dropped; the Private Dock holds the lease.

## 10. Questions for David

Defaults are in the design; override any of them.

1. All three deliveries required for the win? Default yes: the win reads route-empty.
2. Vance appears in person as "the station manager"? Default yes; the alternative is an absence served through his office.
3. Rask is one recurring courier? Default yes.
4. The legal witness signature on Titan stays? Default yes; it is what teaches the rule Vance's proxy breaks.
5. No new deaths? Default: one death is enough.
6. The bundle becomes an openable container of three parcels, which touches rooms 2, 3 and 6? Default yes; it is the smallest change that gives the story three deliveries.

## Next step

On approval: the card-23 cut, then room 7 (the Dust Road and the Tram Platform as the Ceres surface region, with its `rooms` group and exit table), seeded and recorded as rooms 1 to 6 were, with the claims fragment started.
