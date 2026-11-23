# Census: examinable-lens pins moved by the story language's extractor and number forms (Phase 4)

**Session**: 21bbd6, 2026-11-22
**Plan**: `plan-20261122-description-noun-lens.md`, Phase 4
**Status**: REVIEWED and RE-RECORDED. David's ruling, "a" (2026-11-22): accept every move. Applied the same session; see "Resolution" at the end.

What changed in the lens (`tools/explorer-probe/lens-examinable.js`):
- **Extractor.** Candidates now come from the story language's extractor, found through the IR's `phrases.defaultLocale` (ADR-407 D2, D3): for English, the article heuristic and the compromise tagger, unioned. Until now the lens read the heuristic alone, through Phase 3's bridge.
- **Number forms.** Each candidate is typed in both numbers (D5, Amendment 4). A form nothing answers while its other number resolves is the new class `number-form`.
- **Format.** The report moves to format 2.
- **No trimming.** Per the AC-1 note, the lens never trims the prose's words: a multi-word phrase the engine rejects stays not in scope.

Runs: the suite's own budgets, after `./repokit build` (22:4x CST), with each story composed from source. Fixture seed 1209 / 50 states; orchard seed 42 / 600 states.

## The fixture (`fixtures/lens-fixture/`, one room)

| Pin | Old | New |
|---|---|---|
| format | 1 | 2 |
| phrases executed | 4 | 12 |
| counts | resolved-default 1, resolved-described 1, not-in-scope 2 | not-in-scope 4, resolved-default 1, number-form 2, resolved-described 1 |

Rows, in order (phrase, class, target, resolved form, sources):

| Old | New |
|---|---|
| — | `bare shed`, not-in-scope, —, —, room (the tagger reads the room's opening) |
| `pebble`, resolved-default, pebble, —, room | same |
| — | `pebbles`, **number-form**, pebble, `pebble`, room |
| `bucket`, resolved-described, bucket, —, room | same |
| — | `buckets`, **number-form**, bucket, `bucket`, room |
| `crack`, not-in-scope, —, —, room | same |
| `dented tin bucket`, not-in-scope, —, —, bucket | same |
| — | `tin bucket`, not-in-scope, —, —, bucket (the tagger's shorter reading; the bucket has no word `tin`) |

Folded findings, old: `crack`, `dented tin bucket`, `pebble`. New: `bare shed`, `buckets`, `crack`, `dented tin bucket`, `pebble`, `pebbles`, `tin bucket`. Prose sources unchanged: `room`, `bucket`.

The plan's exit state pinned the fixture at "4 phrases executed"; that figure moves to 12.

## Orchard (OB-35)

Walk unchanged: all-rooms-reached, 5 states, Gate, Rows, Press House, Hive Yard, Cellar.

| Pin | Old | New |
|---|---|---|
| phrases executed | 31 | 92 |
| counts | not-in-scope 27, resolved-described 4 | not-in-scope 40, resolved-described 6, number-form 6 |

**Described** (phrase → thing), old: `water valve`, `bee smoker`, `cider press`, `press`. New, in walk order: `tree` → apple tree, `cider press`, `water valve`, `bee smoker`, `press` → cider press, `honeycomb`. Gained `tree` (from "One tree stands apart") and `honeycomb` (from its own description), both found only by the tagger. The order changes because the walk now meets `tree` in the Rows first.

**Findings.**
- **Lost: none.** All 26 old findings are kept, each with the same class and reason.
- **Moved:**
  - `rows`: 1 room → 2 rooms (the Rows' own prose, and the water valve's "the pipe that waters the rows"), sources `room`, `water valve`.
  - `cellar`: unchanged at 2 rooms, sources `room`, `crank handle`.
- **Gained, not in scope (12):** `age`, `arm`, `bark split`, `barrels`, `bees`, `cloud`, `old apple trees`, `paint lifting`, `sleeves`, `steps`, `straw`, `straw hives hum` (that last one `thing: false`, hidden from the console).
- **Gained, number-form (6), each the plural of a singular thing that resolves:**

| Typed | Resolves as | Thing | Source |
|---|---|---|---|
| `trees` | `tree` | apple tree | room (Rows) |
| `cider presses` | `cider press` | cider press | room, cider press |
| `water valves` | `water valve` | water valve | room (Press House) |
| `bee smokers` | `bee smoker` | bee smoker | bee smoker |
| `presses` | `press` | cider press | keeper |
| `honeycombs` | `honeycomb` | honeycomb | honeycomb |

The every-finding assertion changes too. Old: every finding is a thing, not in scope, `ENTITY_NOT_FOUND`. New: every finding is not in scope or number-form, every reason is `ENTITY_NOT_FOUND`, and the one not-a-thing row is `straw hives hum`.

## Two things to look at

1. **Singular things gain plural findings in both stories** (`buckets`, `water valves`, …). D5 and issue 836 both say a player types either number, and the probe confirms the engine refuses these (`examine valves`: "You can't see any such thing."). So they are real, not noise. They are also the most numerous new rows: 6 of orchard's 18 gains, and 35 on The Relighting.
2. **Tagger readings that run on** (`bark split`, `paint lifting`, `straw hives hum`, `cider press fills`) are extractor noise the engine settles as not in scope (D7). `cider press fills` was already in the old pin from the heuristic.

## New pins (scullery, not moves)

`test-stories/scullery/` is new in this phase, so its figures are recorded, not moved. Seed 42 / 600 states: 2 of 2 rooms, all-rooms-reached, 2 states, 42 phrases executed; resolved-described 3, number-form 4, not-in-scope 18, resolved-default 1.
- **Number forms (OB-56, OB-58):** `jar` (resolves as `jars`) and `crock` (as `crocks`), both from the room's article-less "Jars and crocks"; `whetstones` (as `whetstone`) and `cheeses` (as `cheese`).
- **Other obligations:** `whetstone` resolved-default (OB-54). `kettles`, `bellows` and `scour` from the carried chore list, each one finding in 2 rooms (OB-55; `scour` is the extractor noise, OB-59). `corks` not in scope, never a number form (OB-57).

## Resolution

David ruled "a": every move accepted as listed. The fixture and orchard pins in `tools/explorer-probe/tests/lens-examinable.test.js` were re-recorded to the figures above, and scullery's block was added with the figures under "New pins". The run after re-recording: `node --test tools/explorer-probe/tests/lens-examinable.test.js` → 39 tests, 39 pass, 0 fail; `node --test tools/explorer-probe/tests/*.test.js` → 57 tests, 56 pass, 1 fail (the declared-state lens's Secret Letter count, GH #805, as at baseline).
