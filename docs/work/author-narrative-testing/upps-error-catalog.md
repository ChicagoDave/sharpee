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

## What this already says about O-1

Of the rows that compile clean:
- the test tree catches seven, but names the turn rather than the line (F-8). One of the seven, the unquoted text, is a compiler gap that the tree only happens to catch (F-6);
- the load catches one, with no line (F-7);
- one passes silently unless a prose claim happens to show the name (F-5).

Each is a falsifier O-1 names: "caught without pointing at its cause", and missed.
