# Objective: Chord 4.0

**Status**: DRAFT
**Origin**: internal initiative — David's direction of 2026-10-08 (session 0307) that two Chord objectives run in parallel, this being the second: the next Chord syntax round. Reframed by David on 2026-10-12 (session 1f771c) as the 4.0 release: claims and the necessary set in use, a vehicle object type with full capability, and the standard IF capabilities Chord has missed. Source material: the Claude Desktop syntax review of 2026-10-05 (`docs/work/chord-syntax-review.txt`), whose four EBNF text defects were fixed that day and whose open recommendation is a gerund list on the clause head. The round's first half shipped before this file existed: ADR-360 (regions declare their rooms), ADR-361 (hatches removed), ADR-362 (blocks fold), all eleven phases of `docs/work/archive/chord-syntax-round/plan-20261009-adr-360-362.md` DONE 2026-10-10. Items carried into this objective from the round: GH #568 (`in`/`out` exits), GH #558 (stale grammar comment), the gerund list, GH #466 (vehicles, ADR-350), and the state-dependent exit destinations UPPS surfaced on 2026-10-12.
**Date**: 2026-10-12
**Session**: 1f771c

Chord's language version is 3.6.0 at this writing. Every outcome below is measured against fernhill and UPPS only; the other workspace stories carry no regression obligation for 4.0 (David, 2026-10-12). Every outcome's window is the 4.0 publish, which has no date yet, so each grades YELLOW on the open window and stays DRAFT until a date lands.

## Outcomes

### O-1: Claims as the author's regression surface
- **Becomes true**: An author can write a claim either way at 4.0. Up front, by hand in the `claims` block, as today (ADR-365 D9). Or after the fact, by locking a state they have already reached in play, with the necessary set proposed from the played line rather than typed (ADR-365 D2's deferred convenience, pulled forward). Either kind holds on every later run until the story changes, and a change that breaks one is reported as the broken claim and where it broke, in Chord Writer and `sharpee test`.
- **By when**: the 4.0 publish (no date yet)
- **Because**: it decides whether claims are the author's regression surface at 4.0 or stay a hand-maintained file only we keep.
- **Falsified when**: a reached state cannot be locked without hand-typing its `needs` set; a locked or written claim goes unproven on a later run with the story unchanged; or an edit that breaks a claim passes `sharpee test` silently.
- **Baseline**: (captured 2026-10-12) fernhill has a claims fragment (`fernhill.claims.chord`, 14 lines); UPPS has none. No lock-from-play gesture exists in the Testing tab or the CLI, and the set proposal from a played line is unbuilt. The claims runner (`packages/branch-tester/src/claims/`, shipped 2026-10-10) reports held, violated and unproven per run, so a broken written claim is already visible.
- **Evidence source**: the `sharpee test` report on fernhill and UPPS (claims held over claims declared, per run, with each unproven claim naming its reason) and the Testing tab's claims list; produced by the runner, read by David.
- **Cadence**: at each UPPS room commit, and at the 4.0 publish.
- **Grade**: YELLOW (the window has no end date; everything else is sharp)
- **Status**: DRAFT

### O-2: A vehicle with full capability
- **Becomes true**: Chord has a vehicle an author declares in a `.story` file, with full capability: it is a container or supporter, has doors and windows the player opens and looks through, carries the player and its contents when it moves, and moves under a movement model the author chooses. The models named: a line, one direction or both (the tram); free spatial movement with a guidance system that takes a destination (the space ship); compass steering (a tall ship); following any way that admits the vehicle (a car or bicycle on streets and alleys). The Dungeo well-room bucket (which ADR-349 could not write in Chord), the UPPS Sparrow, the UPPS tram car and the UPPS drop shuttle are each written as one vehicle, not as per-destination doors or state-blocked rooms.
- **By when**: the 4.0 publish (no date yet)
- **Because**: it decides whether a multi-location conveyance is authorable at 4.0 without TypeScript, which the Zork tradition treats as table stakes.
- **Falsified when**: any of the four conveyances still needs a workaround (a per-destination hull opening, a room pretending to be a car, story code); a vehicle field an author can write changes nothing in play (ADR-350 D2); or a named movement model cannot be declared, so the author drops to story code for steering.
- **Baseline**: (captured 2026-10-12) no Chord word for vehicle in the catalog or any extension manifest. `VehicleTrait` exists on the platform with eight fields: two are read (transparency on every look; walking-out refusal in `going`), three are read by nothing, one selects no behavior (ADR-350's table, re-read today). No movement model exists platform-side; Dungeo's bucket and balloon move by story code calling `moveVehicle`, and the coal-mine basket does not use the trait at all. Conveyances in the workspace that need it: 4; writable in Chord: 0. GH #466 open, ruled not scheduled 2026-09-14; this objective reschedules it.
- **Evidence source**: the four conveyances compiling and playing as vehicles in their test trees (`sharpee test` on UPPS; Dungeo's walkthrough chain for the bucket), and ADR-350's field table re-measured by grep so that every exposed word has a platform reader.
- **Cadence**: at each vehicle landing, and at the 4.0 publish.
- **Grade**: YELLOW (the window has no end date)
- **Status**: DRAFT

### O-3: The standard IF checklist
- **Becomes true**: A checklist exists crossing Sharpee's stdlib (57 standard actions and the trait catalog) with Inform 7's standard actions and kinds, and every row carries one disposition: sayable in Chord today, scheduled for 4.0, deferred to 5.0 or 6.0 by David's call, or ruled out with a reason. At the 4.0 publish every row scheduled for 4.0 is sayable in Chord and exercised by fernhill or UPPS.
- **By when**: the 4.0 publish (no date yet)
- **Because**: it decides what "complete enough" means for 4.0 and gives 5.0 and 6.0 their backlog from one measured list rather than from whatever the next story trips over.
- **Falsified when**: a row scheduled for 4.0 is not sayable at publish; a platform action or trait exists with no Chord word and no row; or the list has a row with no disposition.
- **Baseline**: (captured 2026-10-12) the crossed list is `docs/work/chord-4-0/standard-if-checklist.md`: 114 rows, 61 sayable in Chord today, 53 not. By section: stdlib's 58 actions, 49 sayable and 9 react-only (lowering, raising, turning, throwing, listening, smelling, touching, sleeping, waking); 15 platform traits with no Chord word, 3 covered another way and 12 bare (vehicle among them); Inform 7's 41 additional actions, kinds and properties, 9 sayable and 32 not. Also recorded: 14 stdlib action ids declared in the manifest with no implementation, so an author's reaction to them compiles and never fires. Disposition pass completed 2026-10-13 (rulings dated 2026-10-12): of the 53 not-sayable rows, 31 are scheduled for 4.0, 9 for 5.0, 2 for 6.0, 11 are out with a reason, and 1 (described / undescribed) was ruled sayable today through `unlisted`. The 4.0 slice is the list this outcome is measured against at publish; of the 14 dead ids, 7 are implemented in it, 2 wait for 5.0, 2 are retired, and 3 with no Inform row are a stdlib cleanup. Seven meta ids (transcript, brief, superbrief, verbose, notify and kin) are dropped. **Corrected 2026-10-13 (session 326e9e, plan Phase 1)**: re-counting the checklist's section C tables gives 33 not-sayable rows there, not 32 (8 sayable, not 9), so the baseline is 60 sayable and 54 not; the 4.0 slice is **30 rows**, out is 12; and the dead ids are 13, not 14 (`revealing` is implemented; `entering_room` is the ADR-126 interceptor seam and stays). The slice is measured against the checklist's "4.0 evidence" table.
- **Evidence source**: the checklist itself (to live under `docs/work/chord-4-0/`), with each 4.0 row pointing at the fernhill or UPPS line that exercises it; read against `sharpee test` at publish.
- **Cadence**: at each 4.0 language landing, and at the 4.0 publish.
- **Grade**: YELLOW (the window has no end date; the baseline is captured and every row carries a disposition, so the 4.0 slice is fixed at 30 rows, corrected from 31 on 2026-10-13)
- **Status**: DRAFT

## Spawned work
- docs/work/archive/chord-syntax-round/plan-20261009-adr-360-362.md (DONE 2026-10-10; predates this file, the round's shipped half)
- docs/work/chord-4-0/standard-if-checklist.md (O-3's baseline and disposition list, 2026-10-12)
