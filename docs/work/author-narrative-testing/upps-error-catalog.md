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

## What this already says about O-1

Of the rows that compile clean:
- the test tree catches seven, but names the turn rather than the line (F-8). One of the seven, the unquoted text, is a compiler gap that the tree only happens to catch (F-6);
- the load catches one, with no line (F-7);
- one passes silently unless a prose claim happens to show the name (F-5).

Each is a falsifier O-1 names: "caught without pointing at its cause", and missed.

Room 2 (2026-10-12) adds, of its seven clean-compiling rows: six caught by the tree, naming the turn (F-8), three of them indistinguishable from one another (`O`, `R`, `V`) without Reach; one caught at load with a line the compiler already had (F-18); and one claim that passes when it should not (F-19). None is missed outright once the tree exists; before the tree exists, `R` and `V` are invisible to `sharpee test` (F-16).
