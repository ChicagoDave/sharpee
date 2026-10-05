# Room 1 — seeded authoring errors

Each `TEST-001-<letter>.story` is the whole UPPS story with one authoring error in room 1; `TEST-001-Z.story` is the correct version. The tester must catch each error, point at its cause, and go green once the file is fixed (objective O-1, `docs/objectives/author-narrative-testing.md`). Full rationale and the observed output: `docs/work/author-narrative-testing/upps-error-catalog.md`.

| File | Error | Caught by | What it reports |
|---|---|---|---|
| A | kind line missing on the sorting machine | compiler | `analysis.missing-kind-noun` |
| B | trait before the kind (`wearable, a container`) | compiler | `analysis.kind-not-first` |
| C | kind misspelled (`a contaner`) | compiler | `analysis.unknown-kind-noun` |
| D | trait misspelled (`wearble`) | compiler | `analysis.trait-not-declared` |
| E | `a thing, container` | compiler | `analysis.thing-with-kind` |
| F | machine placed in a room that does not exist | compiler | `analysis.unknown-entity` |
| G | player starts in a room that does not exist | compiler | `analysis.unknown-entity` |
| H | exit to a room not yet written | compiler | `analysis.unknown-entity` |
| I | blocked exit names an undefined phrase | compiler | `analysis.missing-phrase` |
| J | `end phrase` missing | compiler | `parse.unterminated-block` |
| K | the same name declared twice | compiler | `analysis.duplicate-entity` |
| L | tab indentation | compiler | `lex.tab-indent` |
| M | start block missing | compiler | `analysis.start-block-missing` |
| N | the role handed to a name that does not exist | compiler | `analysis.unknown-entity` |
| O | player not `playable` | compiler | `analysis.player-target-not-playable` |
| P | player made `a thing` | compiler | `analysis.playable-non-person`, `analysis.player-target-not-person` |
| Q | player has no `starts in` | load (no line) | "not placed in the world" |
| R | `create player Postman` | nothing yet | entity named "player Postman" |
| S | readable text unquoted | tree claim on `read card` | empty reading |
| T | satchel not placed | tree claim on `look` | satchel not listed |
| U | satchel not `wearable` | tree claim on `wear satchel` | "You can't wear the mail satchel." |
| V | machine not `scenery` | tree claim on `look` / `take machine` | listed; "Taken." |
| W | `aka machine, sorter` removed | tree claim on `examine sorter` | "You can't see any such thing." |
| X | `west is blocked` instead of `east` | tree claim on `east` | "There are no obvious exits." |
| Y | description edited ("hums" → "rattles") | a recorded `contains` / `exact` claim | text differs |
| Z | correct | — | gate-clean; every claim passes |
