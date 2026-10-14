# The standard IF checklist: Sharpee's stdlib crossed with Inform 7

**Serves objective**: chord-4-0 (O-3)
**Baseline captured**: 2026-10-12, session 1f771c, against `main` at `765480951`
**Sources read**: `packages/stdlib/src/actions/standard/` (58 action directories), `packages/chord/src/stdlib-manifest.ts` (72 action ids, generated), `packages/world-model/src/traits/` (40 trait directories), `packages/chord/src/catalog.ts` (7 kind nouns, 22 trait adjectives), the six extension manifests under `packages/chord/src/manifests/`, the loader's trait constructors (`packages/story-loader/src/loader.ts`). Inform 7's standard actions and kinds are from the Standard Rules as published; no Inform source is in this repository.

"Sayable" means an author can write it in a `.story` file today: declare the object side (a kind, adjective or `use` extension) and react to the action (`on` / `after the player <gerund>`). "React only" means the gerund is accepted but no Chord word gives an object the capability the action looks for. **Disposition** is David's column: `4.0`, `5.0`, `6.0`, `out` with a reason, or blank until ruled. Rows already sayable carry `today`.

## A. Sharpee's standard actions (57 player actions + 1 internal)

| Action | Object side in Chord | React in Chord | Sayable | Disposition |
|---|---|---|---|---|
| taking | any thing; `scenery` refuses | yes | yes | today |
| dropping | any held thing | yes | yes | today |
| putting (on) | `a supporter` | yes | yes | today |
| inserting (in) | `a container` | yes | yes | today |
| removing (from) | `a container` | yes | yes | today |
| examining | every entity | yes | yes | today |
| looking | rooms | yes | yes | today |
| searching | `concealed`, containers | yes | yes | today |
| reading | `readable with text` | yes | yes | today |
| opening, closing | `openable`, `starts open/closed` | yes | yes | today |
| locking, unlocking | `lockable with the <key>`, `starts locked` | yes | yes | today |
| switching_on, switching_off | `switchable`, `starts on/off` | yes | yes | today |
| wearing, taking_off | `wearable`, `wears` | yes | yes | today |
| eating | `edible` | yes | yes | today |
| drinking | `drinkable` | yes | yes | today |
| going | exits, `blocked while`, `deadly`, doors | yes | yes | today |
| entering, exiting | `enterable`, `a container` | yes | yes | today |
| climbing | `climbable` | yes | yes | today |
| cutting | `cuttable with <tool>` | yes (exactly one implementation) | yes | today |
| digging | `diggable with <tool>` | yes (exactly one implementation) | yes | today |
| pushing | `pushable` | yes | yes | today |
| pulling | `pullable` | yes | yes | today |
| giving, showing | `a person` | yes | yes | today |
| asking, telling, answering, talking, saying_goodbye | `define topics`, `define exchange`, conversation blocks (ADR-320) | yes | yes | today |
| attacking | `use combat`, `combatant`, `weapon` | yes | yes (gated) | today |
| hiding | `hiding-spot with position` | yes | yes | today |
| inventory, waiting, scoring, about, help, version, again, undoing, saving, restoring, restarting, quitting | none needed; `override message` for wording | n/a | yes (meta) | today |
| deadly-room-death (internal) | `<dir> is deadly`, `deadly:` | n/a | yes | today |
| lowering, raising | **none**: capability dispatch only (ADR-090); no adjective composes a capability behavior | yes | **react only** | 4.0: the author's `on the player lowering it` body is the behavior, as cutting and digging do; the Dungeo basket is the case |
| turning | **none**: no trait; a `define action` can add grammar but nothing turns | yes | **react only** | 5.0: a `turnable` adjective with the one-implementation rule; the reaction clause stands in until then |
| throwing | **none**: no trait; the thrown thing has no target semantics | yes | **react only** | 4.0: the targeted form, `on the player throwing X at it`, the two-noun clause shape giving and showing have; the bare form needs nothing |
| listening, smelling, touching | **none**: `AcousticTrait` is not exposed; prose answers come from phrase overrides | yes | **react only** | 5.0: per-sense prose lines on a thing (sound, smell, feel) lowered to the platform's sensory traits; the reaction clause is the idiom until then |
| sleeping, waking | **none** | yes | **react only** | out: sayable by a declared state and a reaction clause; no object-side word is warranted (David, 2026-10-12) |

Declared in `constants.ts` and the manifest with **no implementation** (13 ids, accepted as gerunds but nothing fires): consulting, emptying, hints, jumping, kissing, looking_behind, looking_under, setting, tasting, using, verifying, waving, and entering_room. These are rows in section C where Inform has them. **Corrected 2026-10-13 (session 326e9e, Phase 1 of the 4.0 plan)**: the baseline listed 14 and included `revealing`, which is implemented (`packages/stdlib/src/actions/standard/hiding/revealing.ts`, five grammar patterns, its own language entry); and `entering_room` is not a verb but the ADR-126 interceptor seam that the lifecycle registry derives and Dungeo's gas-room interceptor registers under, so it stays declared with no grammar by design. Retired from `constants.ts` on 2026-10-13: `using`, `verifying`, `looking_behind`, `hints` (and hints' two orphan help messages). The manifest now carries 67 ids.

**Section A count**: 58 rows; 49 sayable today (43 player actions, 1 internal, counted as the table's grouped lines expand); 9 react only (lowering, raising, turning, throwing, listening, smelling, touching, sleeping, waking).

## B. Platform traits with no Chord word

Of 40 trait directories, 25 are reached from Chord (22 adjectives, the kind nouns, `use combat`, `use npc`, ADR-310's character lines, regions through `RoomTrait.regionId`). The 15 below are not:

| Trait | What it does on the platform | Chord today | Disposition |
|---|---|---|---|
| vehicle | enterable thing that moves with its occupants; half-wired (ADR-350) | none | 4.0 (O-2) |
| acoustic | a thing's sound, read by listening | none | 5.0, with section A's senses row |
| attached | a thing fixed to another (glued, nailed, tied, welded); **read by no action today** | none | 4.0: platform enforcement first (taking refuses, pulling detaches a detachable one), then `attached to <thing>` with optional `detachable`; covers Inform's Tying it to |
| breakable, destructible | a thing that breaks or is destroyed, by attacking or force; **read by no action today** | none; `attacking` reaches combatants only | 4.0: platform enforcement first (attacking a breakable non-combatant breaks it, dropping a fragile thing breaks it), then a `breakable` adjective with optional `fragile` and `after the player breaking it`; destructible folds into it |
| button | a pushable that fires once per press | `pushable` covers the verb, not the one-shot | out: covered by `switchable` plus `pushable`; the click wording is an `override message` (David, 2026-10-12) |
| equipped | wielded or held-in-hand relation | none | 5.0: a wield or equip gesture with the next combat round; `weapon` under `use combat` is enough at 4.0 (David, 2026-10-12) |
| exit | an exit as an entity (ladders, stairs as things) | none; exits are room lines only | 4.0: a passage named by a custom command (`xyzzy`, `climb the rope`) with aliases, plus hidden and unlisted exits; lands with the going changes O-2's vehicle brings (David, 2026-10-12) |
| listener | an NPC that hears and reacts to speech | `define topics` covers asking; overheard speech, none | 4.0: a listener word on a person or device so a `define sound` reaches it and it can react; completes the half Chord already has (David, 2026-10-12) |
| moveable-scenery | scenery the player can shove between positions; **read by no action today** | none | out: `scenery, pushable` with a reaction clause and a `concealed` thing already plays the rug-over-trapdoor idiom; the trait is inert (David, 2026-10-12) |
| night-vision | the observer sees in the dark (ADR-328 D5 marker) | none | 4.0: one adjective on a person lowered to the marker the visibility gates already read; UPPS's robot and dark compartments exercise it (David, 2026-10-12) |
| scene | a scripted scene with entry and exit | `define chapters`, `define sequence` overlap; no scene word | 6.0: a named running interval with begin and end conditions, reconciled with chapters and sequences in the round that revisits them (David, 2026-10-12) |
| story-info | metadata the `about` action prints | story header covers title, authors, description | today |
| obstructor-protocol | a protocol, not a trait: guards and blockers | `blocked while`, `use npc` guard | today |
| weapon | wielded damage source | `weapon` adjective under `use combat` | today |

**Section B count**: 15 unreached traits; 3 are covered another way (story-info, obstructor, weapon), 12 have no Chord word.

## C. Inform 7's standard actions and kinds

Rows that Inform has and sections A and B do not already carry. "Sharpee" says whether the platform has the action or kind at all.

### Actions

| Inform action | Sharpee | Chord | Disposition |
|---|---|---|---|
| Getting off (a supporter) | exiting covers it | yes | today |
| Looking under | id declared, no implementation | react only | 4.0: grammar plus an action that reveals `concealed` things as searching does, with the reaction clause as the hook; retires a dead id (David, 2026-10-12) |
| Consulting it about | id declared, no implementation; `readable` books have one text | react only | 4.0: a readable thing carries `define topics` as a person does, and `consult X about Y` answers from them; UPPS's station directory and ship manuals exercise it (David, 2026-10-12) |
| Asking it for | asking covers topics, not requests for a thing | partial | 4.0: a request form, `ask X for Y`, distinct from the topic match, with a reaction clause on the person and a default refusal (David, 2026-10-12) |
| Throwing it at | throwing exists, no target | react only | 4.0 (with section A's throwing row) |
| Kissing | id declared, no implementation | react only | 4.0: grammar and a stock refusal, with the reaction clause as the hook; retires a dead id (David, 2026-10-12) |
| Waving, Waving hands | id declared, no implementation | react only | 4.0: grammar for both forms, a stock response, the reaction clause `on the player waving it` as the hook; retires a dead id (David, 2026-10-12) |
| Squeezing, Rubbing, Swinging | none | none | 5.0: stock verbs in a later social-verb round; `define action` plays the lamp case today (David, 2026-10-12) |
| Saying yes, Saying no, Saying sorry | none; answering is topic-shaped | none | 4.0: bare `yes`, `no`, `sorry` as actions with a stock response when no one asked; `on the player saying yes` is the hook for an NPC's question (David, 2026-10-12) |
| Burning | none | none | 4.0: grammar, a stock refusal, and a `flammable with <tool>` adjective in the cutting and digging shape with the one-implementation rule (David, 2026-10-12) |
| Thinking | none | none | out: a stock verb with nothing behind it; `define action` covers the hook (David, 2026-10-12) |
| Tasting | id declared, no implementation | react only | 5.0: with section A's senses row, so sound, smell, feel and taste land together (David, 2026-10-12) |
| Tying it to | none; `attached` trait unexposed | none | 4.0 (with section B's attached row) |
| Setting it to (a dial or value) | id declared, no implementation | react only | 4.0: grammar, a `settable to <values>` adjective, and `on the player setting it to X`; UPPS's guidance system and airlock controls exercise it; retires a dead id (David, 2026-10-12) |
| Buying | none | none | 4.0: grammar, a stock "nothing is for sale" response, and a price on a thing (`costs <amount>`) with a reaction clause; UPPS's Piazzi Town market exercises it; money and price are the design question (David, 2026-10-12) |
| Jumping | id declared, no implementation | react only | 4.0: grammar, a stock line, `on the player jumping` as the hook; retires a dead id (David, 2026-10-12) |
| Pushing it to (a direction: pushing a thing between rooms) | pushing exists; room-to-room push does not | none | 4.0: `push X north` grammar and a `pushable between rooms` adjective, moving the thing through the exit with the player on the vehicle move O-2 lands (David, 2026-10-12) |
| Emptying | id declared, no implementation | react only | 4.0: grammar for `empty X` and `empty X into Y`, an action that moves a container's contents, `on the player emptying it` as the hook; retires a dead id (David, 2026-10-12) |
| Using | id declared, no implementation | react only | out: a verb with no behavior; retire the dead id from the manifest rather than implement it (David, 2026-10-12) |
| Switching transcript on and off | three meta ids registered (`transcript`, `transcript_on`, `transcript_off`), no action, no grammar | none | out: a client concern; the CLI and Chord Writer own session recording; drop the three meta ids (David, 2026-10-12) |
| Preferring abbreviated / sometimes / unabbreviated room descriptions | three meta ids registered (`verbose`, `brief`, `superbrief`), no action, no grammar; `looking` carries a TODO for the mode | none | out: the modes existed to save paper on a teletype; every room entry stays described in full; drop the three meta ids and the TODO (David, 2026-10-12) |
| Switching score notification on and off | `use scoring` has ranks; `notify` meta id registered, no action, no grammar; no score-change line is printed anywhere | none | out: a player preference over a line Sharpee does not print; announcing points is an author's `use scoring` call if ever wanted; drop the meta id (David, 2026-10-12) |
| Requesting the pronoun meanings | the parser's pronoun context tracks the data; no command, no grammar | none | out: a player-side debugging command; pronoun state belongs in the IDE's testing surface if anywhere (David, 2026-10-12) |
| Hints | id declared, no implementation; help carries two orphan aliases (`help-hints-available`, `help-hints-disabled`) | react only | 5.0: a `define hints` block, graded per puzzle and gated on progress, with its own design; at 4.0 retire the dead id and the two orphan help messages (David, 2026-10-12) |
| Verifying | id declared, no implementation | n/a | out: a Z-machine checksum ritual with no referent here; retire the dead id (David, 2026-10-12) |

### Kinds and properties

| Inform kind or property | Sharpee | Chord | Disposition |
|---|---|---|---|
| direction (as a kind the author extends) | fixed direction set; `in`/`out` landed as exit directions (ADR-369 D3, 2026-10-13) | yes for `in`/`out` | 4.0: `in to <Room>` and `out to <Room>` as exit lines (GH #568); the extensible direction kind stays out, `define action` covers ship vocabulary (David, 2026-10-12). **Sayable 2026-10-13** (ADR-369 D3): UPPS Airlock `out to the Landing Pad`, pad `in to the Airlock` |
| backdrop (one thing present in many rooms) | none | none; a thing lives in one place | 4.0: a scenery thing `in <Room>, <Room> and <Room>` or `in the <region>`, on ADR-360's room groups; UPPS's sea, sky and the view of Ceres exercise it (David, 2026-10-12) |
| device | `switchable` | yes | today |
| vehicle | `VehicleTrait`, half-wired | none | 4.0 (O-2) |
| player's holdall (auto-stowing container) | none | none | out: Sharpee imposes no inventory limit, so there is nothing to soften; a `container, wearable` bag the player fills by hand is the default (David, 2026-10-12) |
| scene | `SceneTrait`, unexposed | `define sequence`, `define chapters` overlap | 6.0 (with section B's scene row) |
| man, woman, animal (person subkinds) | `a person` with `pronouns` | yes | today |
| transparent / opaque container | implemented: `ContainerTrait.isTransparent`, read by `VisibilityBehavior`, and since 2026-10-13 by searching and examining too (ADR-369 D1a) | yes: `transparent` adjective (ADR-369 D1) | 4.0: a `transparent` adjective on a container, lowered to the field the visibility behavior already reads; UPPS's specimen jars exercise it (David, 2026-10-12). **Sayable 2026-10-13**: UPPS specimen jar `a container, openable, transparent` |
| portable / fixed in place | `scenery` | yes | today |
| pushable between rooms | none | none | 4.0 (with the Pushing it to row above) |
| described / undescribed | `unlisted` covers a holder's contents only; a loose `unlisted` thing in a room is still listed (confirmed 2026-10-13, UPPS Hold: "You can see … a coil of strapping …", I-589) | partial — contents only | today: `unlisted` is the word; that it covers a loose thing in a room (not only contents) is a UPPS test line to write, not a 4.0 item (David, 2026-10-12). **Written 2026-10-13: it does not.** Hiding a loose thing from the room list is not sayable; left as a finding, not scheduled |
| handled, visited (derived facts) | `first time`, occurrence counters | yes | today |
| lit / unlit, dark / lighted | `light-source`, `dark` | yes | today |
| privately-named, plural-named, proper-named | `aka`, `plural`, `proper` | yes | today |
| container capacity (carrying capacity) | `ContainerTrait` and `SupporterTrait` have `capacity.maxItems`, checked by putting and inserting | yes: `holds <n>` line (ADR-369 D2). *Correction 2026-10-13*: this row said "none", but `a container with max items N` and `a supporter with capacity N` were accepted by the analyzer and read by the loader (fernhill, the zoo and Cloak used them); ADR-369 D2a retired both for the one line | 4.0: a `holds <n>` setting on a container, lowered to the field inserting already checks; UPPS's card slots and single-berth lockers exercise it (David, 2026-10-12). **Sayable 2026-10-13**: UPPS card slot `holds 1`, specimen jar `holds 2` |
| wearable, edible, openable, lockable, enterable, scenery | yes | yes | today |

**Section C count**: 41 rows; 9 sayable today; 32 not (16 react-only or partial, 16 with nothing on either side).

## Baseline totals

| | Rows | Sayable today | Not sayable |
|---|---|---|---|
| A. stdlib actions | 58 | 49 | 9 |
| B. unreached traits | 15 | 3 | 12 |
| C. Inform's additions | 41 | 9 | 32 |
| **Total** | **114** | **61** | **53** |

## Disposition totals

The disposition pass ran in session 1f771c (rulings dated 2026-10-12, completed 2026-10-13). Every one of the 53 not-sayable rows carries David's ruling; none is blank. Counted the same way as the baseline (section A by action, B by trait, C by line; the vehicle appears in both B and C, as it does in the baseline):

| | 4.0 | 5.0 | 6.0 | out | ruled sayable today |
|---|---|---|---|---|---|
| A. stdlib actions (9) | 3 | 4 | 0 | 2 | 0 |
| B. unreached traits (12) | 7 | 2 | 1 | 2 | 0 |
| C. Inform's additions (33) | 20 | 3 | 1 | 8 | 1 (described / undescribed: `unlisted` is the word for contents; a loose thing is not hideable, confirmed 2026-10-13) |
| **Total (54)** | **30** | **9** | **2** | **12** | **1** |

**Count corrected 2026-10-13 (session 326e9e, Phase 1 of the 4.0 plan).** The pass summary said section C had 21 rows at 4.0 and 7 out, for a slice of 31. Re-counting section C's two tables row by row gives 24 action rows and 9 kind rows that were not sayable at the baseline (33, not 32; the baseline's "9 sayable" was 8: Getting off plus seven kind rows), of which 20 are at 4.0 and 8 are out (the player's holdall is the eighth). So the baseline is 114 rows, 60 sayable, 54 not; the 4.0 slice is 30 rows; out is 12. Every row still carries David's ruling; only the arithmetic moved.

**The 4.0 slice (30 rows)**: lowering, raising, throwing (targeted); vehicle, attached, breakable, destructible, exit (custom-command passages), listener, night-vision; Looking under, Consulting it about, Asking it for, Throwing it at, Kissing, Waving, Saying yes/no/sorry, Burning, Tying it to, Setting it to, Buying, Jumping, Pushing it to, Emptying; `in`/`out` exits (GH #568), backdrop, vehicle (kind), transparent container, pushable between rooms, container capacity.

**Deferred to 5.0 (9)**: turning; listening, smelling, touching, tasting (the senses, together); acoustic; equipped; Squeezing, Rubbing, Swinging; Hints.

**Deferred to 6.0 (2)**: scene, in both tables, reconciled with chapters and sequences.

**Out (12)**: sleeping, waking; button; moveable-scenery; Thinking; Using; transcript on/off; brief/superbrief/verbose; score notification; pronoun meanings; player's holdall; Verifying.

**What the pass settles about the dead ids** (corrected 2026-10-13; see section A's note). Of the 13 declared-but-unimplemented action ids: 7 get implemented at 4.0 (consulting, emptying, jumping, kissing, looking_under, setting, waving); 2 wait for 5.0 (hints, tasting), with hints' id and its two orphan help messages retired at 4.0 (done 2026-10-13); 3 are retired from the manifest at 4.0 (using, verifying, looking_behind; done 2026-10-13); 1 is the ADR-126 interceptor seam and stays (entering_room). `revealing` was never dead. Seven meta ids are dropped with their rows (done 2026-10-13): `transcript`, `transcript_on`, `transcript_off`, `verbose`, `brief`, `superbrief`, `notify` were bare strings in `MetaCommandRegistry` that no action id ever matched, and the looking action's brief-mode TODO and its `room_description_brief` message went with them.

## 4.0 evidence

One row per item in the 4.0 slice. The plan phase that makes the row sayable fills **Exercised by** with the UPPS card or fernhill line that plays it; O-3 is measured against this table at publish.

| Row | Plan phase | Exercised by |
|---|---|---|
| lowering, raising (object side) | 6 | |
| throwing (targeted) / Throwing it at | 7 | |
| vehicle (trait and kind) | 11, 14 | |
| attached / Tying it to | 8 | |
| breakable, destructible | 8 | |
| exit (custom-command passages) | 13 | |
| listener | 9 | |
| night-vision | 9 | |
| Looking under | 5 | UPPS `upps.tests/opejfh5t.json`: `look under machine` (a370lku1) and `look under bin` (a370lku4) speak the stock line; `look under crates` (a370lku2) fires the crates' clause; `a370hold.json` card a370lku3 |
| Consulting it about | 7 | |
| Asking it for | 7 | |
| Kissing | 5 | UPPS `opejfh5t.json`: `kiss machine` (a370kis1) stock thing line, `kiss robot` (a370kis2) fires the robot's clause; `a370pad1.json`: `kiss quint` (a370kis3) stock person line |
| Waving, Waving hands | 5 | UPPS `opejfh5t.json`: `wave` (a370wav1) hands line, `wave card` (a370wav2) held-thing line; `a370pad1.json`: `wave card` on the pad (a370wav4) fires the card's `while` clause, bare `wave` (a370wav3) stock |
| Saying yes, no, sorry | 5 | UPPS `opejfh5t.json`: `yes`/`no` (a370yes1, a370no01) fire the depot room clause, `sorry` (a370sry1) stock; `a370pad1.json`: `yes`/`no`/`sorry` while Quint is unconvinced (a370yes2, a370no02, a370sry2) fire the pad clauses, and after `show card` (a370yes3, a370sry3) the stock lines return. The speaker path (a live scene) is pinned by the stdlib test only: UPPS has no conversation block yet |
| Burning / `flammable with` | 6 | |
| Setting it to / `settable to` | 6 | |
| Buying / `costs` | 7 | |
| Jumping | 5 | UPPS `opejfh5t.json`: `jump` (a370jmp1) fires the depot room clause; `a370pad1.json`: `jump` (a370jmp2) stock line |
| Pushing it to / pushable between rooms | 13 | |
| Emptying | 5 | UPPS `opejfh5t.json`: `empty satchel` (a370emp1) already_empty, `empty bin` (a370emp7) spills the dead letter and fires the bin's `after` clause, again (a370emp8) already_empty; `a370hold.json`: closed source (a370emp2), closed destination (a370emp3), `empty jar into locker` (a370emp4), not a container (a370emp6) |
| `in` / `out` exits (GH #568) | 4 | UPPS `upps.tests/w7eqlqnb.json`: `out` from the Airlock to the pad (card tpyumtv3), `in` back (ku62m66z); `8alivtpe.json` card ckvktaj2: `out` refused while the hatch is shut |
| backdrop | 9 | |
| transparent container | 4 | UPPS `upps.tests/k3hldz9q.json`: `look in jar` (q3lkinjr) and `examine jar` (q4exjar1) list the beetle through the closed lid |
| container capacity (`holds <n>`) | 4 | UPPS `upps.tests/k3hldz9q.json`: `put jar in slot` (q9ptjar0) fills the one-card slot, `put beetle in slot` (qaptbtl0) refuses "There's no room in the card slot." |

The table has 24 lines for 30 rows because the slice counts throwing, vehicle, destructible, Tying it to and pushable between rooms twice across sections A, B and C, and it is one evidence line per thing an author writes.

## Notes on the count

- Grouped lines in section A (opening and closing, the twelve meta actions) count each action once; the 58 is the directory count.
- The 13 declared-but-unimplemented ids are a platform finding on their own: an author's `on the player kissing` compiles and never fires. Whether to implement or retire them is a row in C where Inform has the action, and a stdlib cleanup otherwise.
- `in`/`out` as exit directions (GH #568) is the only direction row; Inform's extensible direction kind is not proposed.
- The state-dependent exit destination UPPS surfaced on 2026-10-12 is not an Inform row; it is the vehicle row seen from the ship, and O-2 owns it.
