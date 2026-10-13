# UPPS error catalog: the mistakes one room can carry

**Plan**: `plan-20261002-remaining-rows.md`, Phase 6b. **Objective**: `docs/objectives/author-narrative-testing.md`, O-1. **Story**: `branch-stories/upps/`.
**Drafted**: 2026-10-05, session f8ef32, from room 1 as written and probed that day.

O-1 seeds each room as a sequence of story files, `TEST-001-A` onward: one authoring error per file, with the correct version last. O-1 is falsified if the tester:
- misses a seeded error;
- catches one without pointing at its cause;
- stays red once the error is fixed.

This catalog lists the errors a room can carry. For each one it gives the layer of the tester that should catch it and what that layer says today.

## The three layers, and how each points at a cause

| Layer | What it runs | What it reports | Points at the cause? |
|---|---|---|---|
| **Compiler** (`sharpee compose`, the build) | lexer, parser, analyzer | a diagnostic code, a message, `file:line:col` | **Yes**: the span is in the source |
| **Test tree** (`sharpee test --tree`, the Testing tab) | replays recorded turns (`packages/branch-tester/src/tree-walker.ts`) | a failed claim on a card: `contains`, `notContains`, `exact`, `states`, `events`, `channels` (`tree-document.ts`, `TreeAssertions`) | **No**: it points at the turn and the claim. `tree-walker.ts` carries no source span |
| **Derived tier** (`sharpee test`) | one test per leaf path through every clause (`derived-runner.ts`, ADR-356) | passed, failed or SKIPPED per branch; branch, ending and room ratios (`coverage.ts`) | **Yes** for clause errors: each branch and each gap carries its clause's span |

Room 1 has no clauses (no `after`, `before` or `on`), so its derived tier has no branches. Every behaviour error in room 1 is therefore left to the test tree, which names the turn but not the line. This is the gap O-1 is written to expose (finding F-8).

## Room 1 catalog

Every row was probed on 2026-10-05. Each probe was a scratch copy of `upps.story` with the one change shown, run through `./sharpee compose <file> --check` and, where it compiled, `./sharpee play`.

### Caught by the compiler

| Error an author makes | Change | Observed |
|---|---|---|
| Forgets the kind line | `scenery` without `a thing,` | `33:8 analysis.missing-kind-noun`, listing the kinds |
| Writes a trait before the kind | `wearable, a container` | `42:13 analysis.kind-not-first` |
| Misspells a kind | `a contaner` | `42:3 analysis.unknown-kind-noun` |
| Misspells a trait | `wearble` | `42:16 analysis.trait-not-declared` |
| Calls a container a thing | `a thing, container, wearable` | `42:12 analysis.thing-with-kind`, naming the fix |
| Places a thing in a room that does not exist | `in the Sorting Hall` | `35:6 analysis.unknown-entity`, "did you mean `sorting room`?" |
| Starts the player in a room that does not exist | `starts in the Sorting Hall` | `29:13 analysis.unknown-entity`, with the same suggestion |
| Exits to a room not yet written | `west to the Locker Room` | `19:11 analysis.unknown-entity` |
| Names a phrase that is not defined | `blocked: dock-closed` | `18:3 analysis.missing-phrase` |
| Leaves a phrase open | no `end phrase` | `56:1 parse.unterminated-block` (end of file, not the phrase's head) |
| Declares the same name twice | second `create the mail satchel` | `49:8 analysis.duplicate-entity`, naming line 41 |
| Indents with a tab | tab before `a thing, scenery` | `34:1 lex.tab-indent` (David's own `snippet-001.txt` has one) |
| Omits the start block | no `before the game starts` | `1:1 analysis.start-block-missing` |
| Hands the role to a name that does not exist | `change the player to Mailman` | `10:24 analysis.unknown-entity` |
| Forgets `playable` | no `playable` line | `10:3 analysis.player-target-not-playable`, naming the fix |
| Makes the player a thing | `a thing` on Postman | `27:3 analysis.playable-non-person` and `10:3 analysis.player-target-not-person` |

### Compiles clean, and something else must catch it

| Error an author makes | Change | Observed | What catches it today |
|---|---|---|---|
| Forgets where the player starts | no `starts in` | compose reports gate-clean; play refuses to load: "Story player "Postman" (a01) is not placed in the world" (exit 3, no file or line) | the load, with no span (F-7) |
| Writes the old player form | `create player Postman` | gate-clean; the entity is named `player Postman`, and `change the player to Postman` still resolves to it | nothing until a prose claim shows the name (F-5) |
| Leaves readable text unquoted | `readable with text ROUTE 7` | gate-clean; the trait's config becomes key `text ROUTE` = 7, and `read card` prints an empty reading | a tree claim on `read card` (F-6) |
| Forgets to place a thing | no `in the Sorting Room` on the satchel | gate-clean (an unplaced thing is legal: offstage); `look` no longer lists the satchel | a tree claim on `look` |
| Forgets a trait | satchel without `wearable` | gate-clean; `wear satchel` answers "You can't wear the mail satchel." | a tree claim on `wear satchel` |
| Forgets `scenery` | machine as `a thing` | gate-clean; `look` lists "a sorting machine" and `take machine` answers "Taken." | a tree claim on `look` or `take machine` |
| Forgets an `aka` | machine without `aka machine, sorter` | gate-clean; `examine machine` still works, because "machine" is a word of the name; `examine sorter` answers "You can't see any such thing." | a tree claim on `examine sorter` |
| Blocks the wrong direction | `west is blocked:` | gate-clean; `east` answers "There are no obvious exits." | a tree claim on `east` |
| Edits prose the tests recorded | "hums" becomes "rattles" | gate-clean by definition | a `contains` or `exact` claim, if one was recorded on that text |

The last five rows were played from the seeded files on 2026-10-05 (`./sharpee play` on a scratch copy of each).

### Reported as a gap, not a failure

Room coverage (rooms entered over rooms declared) and ending coverage (endings reached over endings declared) are ratios, never failures (ADR-356 D5a). Room 1 has one room and no ending, so neither gap can be seeded until room 2 and the first ending exist.

**Room 2 changes this** (2026-10-12, session eb1023). With the Loading Dock written and David's room-1 tree unchanged, `./sharpee test branch-stories/upps/upps.story` reports `Rooms entered: 1 / 2` and names `loading-dock` under "Not entered", exit 0: the first room-coverage gap, listed by name, never a failure. Room 2 also brings the first derived branches: `mail bundle · after taking, once` passes, and `Loading Dock · after entering, once` is SKIPPED `command-lifecycle` (a room's `entering` fires on movement, not a typed verb, `upps.story:94`), so the derived tier's "listed by name" shape appears on UPPS for the first time. Room 2's seeded sequence (`seeded/room-02/`) can now carry a room that is declared but never linked, an `after` body whose effect is removed, a `while` condition naming an undeclared state, and a `states:` line left out. With room 2's tree recorded later the same day, the correct story reports `Rooms entered: 2 / 2`, and the three seeds that keep the player out of the dock (`O`, `R`, `V`) report `1 / 2` with `loading-dock` named: the gap now distinguishes those three from the correct story, but still not from a tree that simply has no dock turns (F-16).

## Room 1's sequence

Seeded 2026-10-05 in `branch-stories/upps/seeded/room-01/`, with letter, error and expected catch listed in that folder's `README.md`.
- `TEST-001-A` to `P` are the compiler rows.
- `Q` to `Y` are the rows that compile clean.
- `Z` is the correct version, byte-identical to `upps.story` as of room 1.

Story discovery reads only a story directory's top level (`tools/repokit/src/repo.ts:160`, `readdirSync(dir)`), so the subfolder is never built as part of UPPS.

Every file was compiled on 2026-10-05. `A` to `P` each raise the code in its row, and `Q` to `Z` are gate-clean.

The test-tree rows need a tree recorded on the correct version first. David records it once in the Testing tab, with claims on these turns:
- `look`
- `wear satchel`
- `take machine`
- `examine sorter`
- `read card`
- `east`

Each seeded file then runs against that tree.

## Room 2 catalog

Seeded 2026-10-12 (session eb1023) in `branch-stories/upps/seeded/room-02/`, `TEST-002-A` to `V` plus `Z`; letter, error and expected catch in that folder's `README.md`. Room 2 adds the constructs room 1 lacked: a `states:` line, a `while` condition on an exit, two `after` clauses, a second room and its links. Every file was compiled on 2026-10-12; the gate-clean ones were run with the room-1 tree in scratch copies, and the linking ones through `sharpee world-index` for Reach.

### Caught by the compiler (12)

`A` to `K` and `Q`. Every one names a code and a `file:line:col`; the misspellings carry "did you mean". Two are worth a note:
- `A` (a link to a misspelled room) raises the right error and then a second, cascading `analysis.duplicate-exit` whose message reads "leads to ``" (F-17).
- `Q` (the states listed in the wrong order, so the door starts cleared) is caught, but as `analysis.irreversible-state` on the `change` line: the compiler sees a forward-only set going backwards, not the order the author got wrong on the `states:` line. The cause is one line up from where it points.

### Compiles clean, and is not an error (3)

`L`, `M`, `N`. An `in` line resolves an `aka` (`in the Loading Bay`), and an exit written on one side makes its return on the other (`west to the Sorting Room` alone gives the depot its `east`). Both play as intended. Seeded as errors, they turned out to be the language's defaults; they stay in the sequence as a record of what an author might think is a mistake and is not.

### Compiles clean, and something else must catch it (7)

Room 2's tree was recorded on 2026-10-12 (seven cards after room 1's eight; the turns and claims are listed in the seed folder's `README.md`), and each row below was run that day against a scratch copy carrying it. The correct story reports 15 cards passing, 20 assertions passing, rooms 2 of 2.

| Error | What catches it today |
|---|---|
| `O`: the `after` body keeps its phrase but loses `change the dock door to cleared` | the derived branch still passes, since the phrase is an effect; the tree fails on `east` (the description claim; the room-name claim passes on the refusal, F-19) and the three dock turns after it, 4 cards failing, and `Rooms entered: 1 / 2` |
| `P`: `, once` removed | the tree, on the retake: `not contains "satisfied clunk"` fails, 1 card failing; the derived label drops `once` and still passes (a bare second take is refused and fires nothing) |
| `R`: the `while` dropped, so the exit is blocked for good | the tree, exactly as `O` (4 cards failing, `Rooms entered: 1 / 2`), which says "not entered" when nothing can enter it (F-16); Reach has the line: "the exit is blocked with no condition that lifts it", `loading-dock` unreached, three things stranded |
| `S`: the blocked `up` exit removed | the tree, on `up`, 1 card failing |
| `T`: `after the player leaving, once` on a room | the tree runner, at load, exit 3, with the line, before any card: `compose --check` passed it (F-18) |
| `U`: an alias removed | the tree, on `examine sparrow`, 1 card failing |
| `V`: the room linked from neither side | the tree, on `east`: "There are no obvious exits." fails both entry claims, 4 cards failing, `Rooms entered: 1 / 2` (F-16). Reach reports the room unreached and its things stranded, with no line, because a `DIRECTION is blocked while …` line with no destination is not a finding |

Every tree catch above names the turn, never the line (F-8), and the summary line names only the first failing card (F-11). The three linking errors (`O`, `R`, `V`) read identically in the tree; only Reach separates a door that never clears from a room with no door.

## Room 3 catalog

Written and seeded 2026-10-12 (session ed5f9d) in `branch-stories/upps/seeded/room-03/`, `TEST-003-A` to `V` plus `Z`; letter, error and expected catch in that folder's `README.md`. Room 3 is the Hold, the Sparrow's cargo bay, reached by `up` from the Loading Dock once the loader robot has loaded the mail bundle. It adds the constructs rooms 1 and 2 lacked: a `person` the player gives to, `after the player giving` with statement-level `when` guards, `on the player giving` refusals (satchel, route card), a `while` on `up` that a `change` lifts, an `openable` container holding a `wearable`, a `move` into an unentered room, and a second blocked exit. Every file was compiled on 2026-10-12; the gate-clean ones were run through a 21-turn scripted `./sharpee play` diffed against `Z`, then against room 3's tree once it was recorded.

Two findings came out of the write itself, before any seed: a head-level `while` on the robot's `after` clause never fires (F-21), and the derived tier skips the robot's branch under either form of the guard (F-22). A third came out of seed `J`: `, once` is consumed by a firing in which every guard was false (F-23).

### Caught by the compiler (4)

`D`, `H`, `K`, `U`. Each names a code and a `file:line:col`, and the three misspellings carry "did you mean". Fewer than rooms 1 and 2 because room 3's new constructs are mostly behavior, and the compiler checks names and states, not what happens.

### Compiles clean, and is not an error (5)

`C`, `F`, `Q`, `S`, `T`. An exit written on one side makes its return (`F`, `Q`, as room 2's `M` and `N`); `holds` is `has` (`T`); a room's `on the player entering` behaves as its `after` (`S`); and the robot's guards are redundant while the only other giveable things refuse (`C`). They stay in the sequence as a record of what an author might think is a mistake and is not.

### Compiles clean, and something else must catch it (13)

Room 3's tree was recorded on 2026-10-12, later the same day (twelve cards after room 2's seven; the turns and claims are listed in the seed folder's `README.md`), and each row below was run against a scratch copy carrying it. The correct story reports 25 cards passing, 34 assertions passing, rooms 3 of 3.

| Error | What catches it today |
|---|---|
| `A`: the robot is a thing | the tree, on `give bundle to robot` ("You can only give things to people."), then every hold turn: 6 cards failing, `Rooms entered: 2 / 3` |
| `B`: head-`while` guard (F-21) | the tree, exactly as `A`: the gift is taken, the phrase never comes, 6 cards failing, `Rooms entered: 2 / 3` |
| `E`: the `change` removed | the tree, on `up` after the gift: 5 cards failing, `Rooms entered: 2 / 3` (the loading phrase passes, so the first failing card is one turn later than `A` and `B`) |
| `G`: the blocked `up` removed | the tree, on `up` before the gift: 9 cards failing (every dock turn after it is displaced), `Rooms entered: 3 / 3` |
| `I`: the `move` removed | the tree, on `up`: the Hold's listing claim, 1 card failing |
| `J`: the card's refusal removed (F-23) | the tree, on `give card to robot`, then the bundle gift does nothing and the hold is never entered: 7 cards failing, `Rooms entered: 2 / 3` |
| `L`, `M`: locker not openable / starts open | the tree, on `open locker`, 1 card failing each |
| `N`: suit placed on the floor | the tree, on `up` (the listing) and `open locker` ("which is empty"), 2 cards failing |
| `O`: suit not wearable | the tree, on `wear suit`, 1 card failing |
| `P`: the blocked `north` removed | the tree, on `north`, 1 card failing |
| `R`: `given` for `giving` | the runner at load, exit 3, with the line (F-18): `compose --check` passed it |
| `V`: `, once` dropped | the tree, on the second `give bundle to robot` (`not contains "unfolds its arms"`), 1 card failing |

Every tree catch names the turn, never the line (F-8), and the summary line names only the first failing card (F-11). `A` and `B` read identically in the tree (a thing that cannot receive, and a guard that never holds); `E` and `J` differ from them only by which card fails first. Before the tree existed, only `G` was caught, and the four seeds that keep the player out of the hold (`A`, `B`, `E`, `J`) reported `Rooms entered: 2 / 3` exactly as the correct story did (F-16).

## Room 4 catalog

Written and seeded 2026-10-12 (session 4b14c1) in `branch-stories/upps/seeded/room-04/`, `TEST-004-A` to `V` plus `Z`; letter, error and expected catch in that folder's `README.md`. Room 4 is the Cockpit, the Sparrow's nose, reached by `north` from the Hold once the player wears the space suit: the suit's `after the player wearing, once` changes the hatch from `dogged` to `free`, which lifts the `while` on the Hold's `north`. It adds the constructs rooms 1 to 3 lacked: a reaction on wearing, a `change` on one entity that opens another room's exit, an `enterable` scenery couch, a `switchable` scenery drive, a `must` requirement in an `on` body, a two-word action head spelled `switching_on`, and a bare `refuse` on `switching_off`. Every file was compiled on 2026-10-12; the gate-clean ones were run against the tree in scratch copies, and `I` and `N` were also played to capture their refusal lines.

Four findings came out of the write and the seeds: a two-word head must be spelled with the action id's underscore and nothing says so (F-24); the "Rooms entered" count includes rooms the derived tier placed the player in (F-25); an `on` reaction that speaks a phrase drops the standard line (F-26, seen in room 3 and recorded here); and the negated-requirement gate reads only a leading `not` (F-27). The one gate catch during the write, `undogged` refused as a negated state (`analysis.negated-state`), was the compiler working as the guide says.

### Caught by the compiler (5)

`D`, `H`, `L`, `M`, `S`. The two missing states and the misspelling carry a code and a `file:line:col`, `H` with "did you mean"; `L` is the `after`-body refusal the guide promises; `M` names the actor fragment and the stray action word `on` but never the spelling it wanted (F-24).

### Compiles clean, and is not an error (4)

`E`, `T`, `K`, `O`. An exit written on one side makes its return (`E`, `T`, as the earlier rooms' pairs); the predicate-negated refusal behaves exactly as the `must` line (`K`, which the guide says is flagged — F-27); and `, once` is redundant on a reaction whose action can never recur (`O`).

### Compiles clean, and something else must catch it (14)

Room 4's ten cards were added to the tree on 2026-10-12 (listed in the seed folder's `README.md`), and the existing `wear suit` card gained the pre-flight claim. The correct story reports 35 cards passing, 54 assertions passing, rooms 4 of 4.

| Error | What catches it today |
|---|---|
| `A`: `wear` for `wearing` | the runner at load, exit 3, with the line (F-18): `compose --check` passed it |
| `B`: the hatch `change` removed | the tree, on `north` after the suit: 9 cards failing; `Rooms entered: 4 / 4` regardless (F-25) |
| `C`: the suit's reaction as `on` | the tree, on `wear suit`: the standard line is gone (F-26), 1 card failing |
| `F`: the blocked `north` removed | the tree, on `north` before the suit: 6 cards failing |
| `G`: the `while` dropped | the tree, exactly as `B`: 9 cards failing |
| `I`: the couch not enterable | the tree, on `enter couch`, 4 cards failing |
| `J`: the `must` removed | the tree, on the standing `switch on drive`, 2 cards failing |
| `N`: the drive not switchable | the tree, on the seated `switch on drive`, 2 cards failing; the derived tier's `after switching_on` row also fails |
| `P`: the switching-off refusal removed | the tree, on `switch off drive`, 2 cards failing |
| `Q`: the fold phrase removed | the tree, on the seated `switch on drive`, 1 card failing |
| `R`: the ship `change` removed | the tree's state claim on the seated `switch on drive` ("boarding", expected "underway"), 1 card failing |
| `U`: the viewport in the Hold | the tree, on `examine viewport`, 1 card failing |
| `V`: the reaction on the wrong owner | the tree, on `wear suit`, 10 cards failing; and the derived tier, with a line: "suit locker · after wearing, once — the standard action refused first: if.action.wearing.not_wearable (upps.story:175)" |

`V` is the first seed in four rooms that a tool catches at its source line without a card: the derived tier synthesized `wear the suit locker`, the standard action refused it, and the report says which clause and which line. `B` and `G` read identically in the tree; `R` is the first catch by a state claim, which is the only thing that sees a `change` with no prose of its own.

## Room 5 catalog

Written and seeded 2026-10-12 (session 4b14c1) in `branch-stories/upps/seeded/room-05/`, `TEST-005-A` to `V` plus `Z`; letter, error and expected catch in that folder's `README.md`. Room 5 is the Airlock, a closet off the Hold's port side, reached by `west` through an exit declared on the Airlock only (`east to the Hold`). The fold lands the Sparrow at Ceres by a `define sequence` anchored on `when the courier ship becomes underway`, with one `5 turns later` step that changes the ship to `landed` and speaks the landing. The outer hatch is `openable` scenery: `refuse when …: hatch-in-dock` while the ship is `buttoned` or `boarding`, and one `after the player opening, once` reaction that kills the player when the ship is `underway` and speaks the Ceres paragraph when it is `landed`. The room has a `first time` paragraph. It is the story's first ending, so the tree forked for the first time: two fork points, three lines, and an END STATE card on the death. Every file was compiled on 2026-10-12; the gate-clean ones were run against the tree in scratch copies, and `G` was also played to read its runtime line.

Two catches came during the write, both compiler fix-its that read as the guide promises: `refuse <key> when <condition>` is `parse.refuse-order` ("The condition comes first"), and two `after opening` clauses on one thing is `analysis.duplicate-clause` ("Merge the bodies"). Both became seeds (`A`, `B`). Four findings came out of the seeds: two refusals sharing a key produce two identical derived rows (F-28); a line that forks from inside an enterable thing is labelled by the thing (`flight-couch · exit`), not the room (F-29); the sequence anchor rejects a switchable thing's built-in `on` while a `when` guard accepts `is on` (F-30); and a `change` that fails at runtime against a forward-only state set prints a rule-failure line with the story line in play, which the tester never surfaces (F-31).

### Caught by the compiler (5)

`A`, `B`, `C`, `S`, `T`. All five carry a code and a `file:line:col`; `A` and `B` print the fix; `C` and `S` are the familiar unknown-value and missing-phrase catches; `T` says `on` is not a declared state of the drive and nothing more (F-30).

### Compiles clean, and is not an error (2)

`J`, `Q`. The `, once` is redundant for every line the tree has, since none closes and reopens the hatch (`J`); the `buttoned` refusal can never fire, because the Hold is unreachable while the ship is buttoned (`Q`) — the derived tier arranges that state and passes the row, so a guard that play can never reach reads as covered.

### Compiles clean, and something else must catch it (15)

The tree was forked and room 5's cards added on 2026-10-12 (listed in the seed folder's `README.md`). The correct story reports 3 lines, 49 cards passing, 82 assertions passing, endings 1 of 1, rooms 5 of 5.

| Error | What catches it today |
|---|---|
| `D`: the `landed` change removed | the tree's state claim on `west` ("underway", expected "landed"); 3 cards failing, since the main line's `open hatch` now kills the player |
| `E`: `4 turns later` | the tree, twice: `west` lacks the landing line (it printed on `south`), and the death card's ending is not reached, because the step fires before the hatch opens; 2 cards failing |
| `F`: `6 turns later` | the tree, on `west` (the landing prints on `look`); 1 card failing |
| `G`: the anchor on `boarding` | the tree, on the seated `switch on drive`: the standard line is gone, because the `change … to underway` failed against a forward-only set already at `landed`. Play prints the cause with its line, "One of the story's rules failed here: … (line 242)"; the tester prints only the missing text (F-31); 4 cards failing |
| `H`: the kill unguarded | the tree, on the main line's `open hatch` (the player dies at Ceres); 2 cards failing |
| `I`: the phrase unguarded | the tree, on the death card (the Ceres paragraph prints after the kill); 1 card failing |
| `K`: the `first time` paragraph removed | the tree, on every line's `west`; 3 cards failing |
| `L`: the hatch not `openable` | the tree, on `open hatch` in two lines; 3 cards failing. The derived refusal rows still pass: the story's refusal runs before the standard openable check |
| `M`: the exit removed | the tree, on every line's `west`; 12 cards failing; `Rooms entered: 5 / 5` regardless (F-25) |
| `N`: the landing phrase removed | the tree, on `west`; 1 card failing, the state claim passing |
| `O`: both refusals removed | the tree, on the dock line's `open hatch`; 1 card failing |
| `P`: the `boarding` refusal removed | the tree, exactly as `O`; 1 card failing |
| `R`: `kill the player` with no key | the tree, on the death card: "the story ended with defeat (killed)"; and the report: `Endings reached: 0 / 0`, "Endings declared without an id (1) — no END STATE card can name them" |
| `U`: the gauge in the Hold | the tree, on `examine gauge` in two lines; 2 cards failing |
| `V`: the reaction on the gauge | the tree, on `open hatch` in two lines; 2 cards failing. The derived tier reads "pressure gauge · after opening, once — SKIPPED no-claims", because both statements are conditional (F-22), so the wrong owner is not caught at its line as room 4's `V` was |

The sequence is the first construct whose errors the tree catches by timing: `E`, `F` and `G` each move the landing by turns, and the tree sees it only because the landing line was claimed on the one card where it belongs. The derived tier reports the sequence's two steps as SKIPPED (`no-claims` for the empty anchor step, `command-schedule` for the timed one), so without the card the fold's timing is tested by nothing. `R` is the first seed the report itself catches, by naming an ending no card can name.

## Room 6 catalog

Written and seeded 2026-10-12 (session 4b14c1) in `branch-stories/upps/seeded/room-06/`, `TEST-006-A` to `V` plus `Z`; letter, error and expected catch in that folder's `README.md`. Room 6 is the Landing Pad, Ceres pad 14, through the open hatch `west` of the Airlock. It introduces the story's villain (David, 2026-10-12: the story "can't be just Bureaucracy in Space"): the Kepler Station parcel is a court summons for Aurelio Vance, who has bought the route, and the pad master Dolores Quint is his first hand. She blocks the tram `north` (`north is blocked while the pad master is unconvinced`, with no destination yet) until shown the route card (`after the player showing while the player is in the Landing Pad, once` on the card, which changes her state), answers three `define topics` keys (quoted spellings; the parcel, Vance, the dome), and signs for the bundle if given it (`lose parcel-signed-away when the pad master has the mail bundle`), the story's second ending and its first `lose`. The Airlock's `west` is blocked while the hatch is closed; the Hold's `down` is sealed while the ship is `underway` or `landed`.

Room 6 is the first room that reached back: the Hold's ramp stayed open to the depot after the fold, and the loader robot's `after giving, once` kept the bundle after a second give (room 3's cards give twice on purpose), so the main line arrived on Ceres with no mail to lose. The robot's reaction lost its `, once` and gained `and`-guards by ship state and a second phrase for the reload; the Hold gained two blocked lines. Every earlier card passed unchanged, and the room-3 give card gained a claim on the reload line. That is one data point against O-1's "going back to rework the tests of rooms already written": a story hole found by a later room was fixed without reworking a test.

Three compiler catches came during the write, all fix-its: a topic key cannot mix an entity with quoted spellings (`parse.topics-colon`, seed `A`); a quoted spelling that an entity-tier row already resolves is `analysis.topic-entity-collision` ("Remove one", seed `B`); and the tree loader refuses a child segment under a card with no sibling ("whose last card is not a fork"), so a continuation is the parent's own cards. Two findings came out of the seeds: a card's `ending` names the phrase and not the kind, so `win` for `lose` passes (F-32); and a `showing` reaction on the recipient fires in play but the derived tier reports it unreachable (F-33). Eight of twenty-two seeds pass silently, the most in six rooms; four are not errors, and four (`F`, `G`, `H`, `I`) are coverage the tree does not have.

### Caught by the compiler (4)

`A`, `B`, `C`, `K`. `A` and `B` are the write's own catches; `C`'s undeclared state is reported at the route card's `change` (line 66), one room away from the `states:` line it is missing from, because that is the first use the analyzer meets; `K` is the familiar missing phrase.

### Compiles clean, and is not an error (4)

`M`, `N`, `T`, `V`. The exits pair from either side even beside a blocked line (`M`, `N`); a topics block may name the entity by an alias (`T`); and a giving reaction fires on the thing given as on the recipient (`V`).

### Compiles clean, and nothing catches it (4)

`F`, `G`, `H`, `I`. The block that never lifts (`F`) and the reaction that fires anywhere (`G`) are not wrong for any line the tree has; they would need a card north of Quint after the showing, and a card showing the route card somewhere else. `H` works in play and is reported `object-unreachable` by the derived tier, so its only trace is the count dropping from 14 to 13 of 25 (F-33). `I` is the wrong ending kind, which no card can claim (F-32).

### Compiles clean, and something else must catch it (10)

Room 6's fifteen cards and the dock line's hatch-shut card were added on 2026-10-12 (listed in the seed folder's `README.md`). The correct story reports 3 lines, 65 cards passing, 112 assertions passing, endings 2 of 2, rooms 6 of 6.

| Error | What catches it today |
|---|---|
| `D`: the state change removed | the tree's state claim on `show card to quint`; 1 card failing |
| `E`: the block removed | the tree, on `north`; 1 card failing |
| `J`: the Vance topic removed | the tree, on `ask quint about vance` (the default reply); 1 card failing, and one derived row fewer |
| `L`: the pad master in the Airlock | the tree, on `west` (not listed) and on six cards after it; one ✗ line for seven cards (F-11). `north` still passes: the block reads her state, not where she is |
| `O`: the hatch-shut block removed | the tree, on the dock line's `west`; 1 card failing |
| `P`: the landed ramp block removed | the tree, on `down`, then on the four cards that depended on being in the Hold; 5 cards failing |
| `Q`: the first-load guard on the wrong state | the tree, on both give cards (paragraph missing, then present); 2 cards failing |
| `R`: the `move` removed | the tree, on `up` (the bundle not listed), then downstream; 5 cards failing |
| `S`: the reload phrase removed | the tree, on the second give's new claim; 1 card failing |
| `U`: the tram line in the Airlock | the tree, on `examine tram`; 1 card failing |

`L` and `P` and `R` each fail five or more cards and print one line (F-11); an author reading the report sees the first card and a count, and the tab shows the rest. `C` is the first compiler catch reported in a different room from its cause.

## What this already says about O-1

Of the rows that compile clean:
- the test tree catches seven, but names the turn rather than the line (F-8). One of the seven, the unquoted text, is a compiler gap that the tree only happens to catch (F-6);
- the load catches one, with no line (F-7);
- one passes silently unless a prose claim happens to show the name (F-5).

Each is a falsifier O-1 names: "caught without pointing at its cause", and missed.

Room 2 (2026-10-12) adds, of its seven clean-compiling rows: six caught by the tree, naming the turn (F-8), three of them indistinguishable from one another (`O`, `R`, `V`) without Reach; one caught at load with a line the compiler already had (F-18); and one claim that passes when it should not (F-19). None is missed outright once the tree exists; before the tree exists, `R` and `V` are invisible to `sharpee test` (F-16).

Room 4 (2026-10-12) adds, of its fourteen clean-compiling rows: twelve caught by the tree, naming the turn (F-8), two of them identical in the tree (`B`, `G`); one caught at load with a line (`A`, F-18); and one caught by the derived tier at its source line (`V`), the first in four rooms. One catch needs a state claim (`R`), which no tab gesture records on its own. One row the guide says the compiler flags is passed (`K`, F-27), and the reachability line is wrong in every row where the Cockpit is unreachable (F-25).
