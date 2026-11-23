# Census: world-index pins moved by the English extractor (Phase 3)

**Session**: df5bd8, 2026-11-22
**Plan**: `plan-20261122-description-noun-lens.md`, Phase 3
**Status**: REVIEWED and RE-RECORDED. David's ruling, "b" (2026-11-22): accept every move, apply the three proposed rewrites, and change the New Story template's sentence so new stories open clean instead of recording its finding. Applied the same session; see "Resolution" at the end.

What changed: world-index now reads prose only through the `NounExtractor` its caller hands it. In the tests that is lang-en-us's `nounExtractor`: the union of ADR-321's article heuristic (moved unchanged) and the compromise tagger. Every row below is the tagger adding nouns the heuristic never saw, mostly nouns with no article before them, sentence-initial nouns and proper names. ADR-407 Consequences says these pins are re-recorded after this review.

## AC-4, before re-recording (evidence)

`node packages/devkit/dist/cli.js world-index branch-stories/fernhill/dist/fernhill.ir.json`, before any world-index edit (21:24 CST) and after the change (21:46 CST), compared by `compare-ac4.cjs` in the session scratchpad, keyed by class, passage kind, owner, passage length and phrase:

- phrases read at a place: 238 before, 514 after; **lost 0**, gained 276
- rows whose phrase was kept but whose class moved: **0**
- `filters.headStopwords`, `minHeadLength`, `maxPhraseWords` on the wire: identical (Amendment 3 publishes the same lists from their new home)
- `unnamedTools`: `["doormat"]` before and after

## How much is the union reading one mention twice

A candidate nested inside another candidate's span in the same passage (the heuristic's `forge-made crowbar` and the tagger's `crowbar`; the heuristic's `house looms` and the tagger's `house`). This is D4's union by design: deduplication is by words, and AC-4 forbids dropping the heuristic's reading.

| Story | Candidates | Nested in another | Share |
|---|---|---|---|
| Fernhill | 548 | 42 | 8% |
| The Alderman | 419 | 22 | 5% |
| Ides of March | 713 | 48 | 7% |

So most of the growth is new nouns, not double readings.

## The moved pins

### Counts (D6b corpus pin, `tests/incomplete.test.ts`)

Each cell is missing-word / ambiguous / no-object.

| Story, half | Old | New |
|---|---|---|
| Fernhill, descriptions | 27 / 10 / 48 | 44 / 14 / 125 |
| Fernhill, response prose | 3 / 5 / 70 | 10 / 10 / 170 |
| Fernhill, total (also `tests/cli.test.ts` "carries all three views") | 30 / 15 / 118, undescribed 0 | 54 / 24 / 295, undescribed 0 |
| The Alderman, descriptions | 5 / 0 / 30 | 6 / 0 / 68 |
| The Alderman, response prose | 1 / 0 / 80 | 2 / 0 / 224 |
| Ides of March, descriptions | 3 / 0 / 27 | 5 / 0 / 70 |
| Ides of March, response prose | 11 / 1 / 150 | 14 / 1 / 387 |

### Fernhill's first-visit no-object phrases (`incomplete.test.ts`, "reads first-visit prose")

- Old: `cab`, `estate`, `lane`
- New: `cab`, `dawn`, `estate`, `lamps`, `lane`, `order`

All six are in the iron gates' first-visit text ("…its lamps swallowed by the dark…"). `lamps` follows a possessive determiner, the gap GH #514 names.

### Fernhill's D12 role split (`tests/roles.test.ts`, "splits the corpus the way D12 says it should")

| Role | Old | New |
|---|---|---|
| tool | 25 | 49 |
| progression-info | 7 | 19 |
| atmosphere-info | 43 | 73 |

### Assertions whose premise was the old extractor's blindness

Three tests asserted something the article heuristic could not see. The new extractor sees it, so each assertion now reads the opposite way. These are not counts, so each one gets a proposed rewrite rather than a new number.

1. **`roles.test.ts`, "roles every declared entity, not only the ones this extractor reached".** It asserted that none of The Alderman's six accusable suspects is reached by an edge, because "all six are proper-named, so the article-gated extractor resolves not one of them". The tagger reads proper names: `jack` → jack-margolin, `ross` → ross-bielack, `catherine`, `viola`, `wainright`, `barber`, `margolin`. The other half of the test still holds: the role table covers every entity, and each suspect is a `tool`. **Proposed**: keep `roles.size === entities.length` and each suspect's role `tool`, and prove "not only the ones this extractor reached" with an entity no edge reaches under the new extractor, found by measurement, in place of the suspects.
2. **`roles.test.ts`, "keeps a resolved phrase as an edge rather than discarding it".** It asserted that each edge's first word appears in its passage, case-sensitively. 8 of 141 Fernhill edges begin a sentence or are a name (`Copper pans`, `Pipes`, `Mrs Kettle`, `Tobias`), and a candidate's words are lowercased by contract. All 8 are in their passage once case is ignored. **Proposed**: compare against the passage lowercased. The assertion keeps its intent: every edge comes from the passage it cites.
3. **`unnamed.test.ts`, "never reports what the room listing announces on its own".** It asserted that no edge reaches `crowbar`, because "the extractor never resolves it either". The tagger reads `crowbar` alone in the crowbar's own description ("A forge-made crowbar, cold and certain."); the heuristic's `forge-made crowbar` is still there as a missing-word row. D13's finding is unchanged: `crowbar` is still not reported, because the room listing announces it. **Proposed**: drop the edge assertion (it pinned the old blindness, not D13's rule) and keep the unnamed-tools assertion, which is the guard the test is named for.

### The New Story template (`packages/devkit/tests/story-template.test.ts`, "gives the World Index nothing to report")

- Old: 0 / 0 / 0, undescribed 0
- New: 0 / 0 / **1**, undescribed 0. The phrase is `doorways`, in the landing's description: "A quiet place to begin. Doorways lead everywhere you might go — for now, this landing is the whole world."

This is the one move that is about product rather than a pin: every new story an author scaffolds would open with one Incomplete finding. Either the template's sentence changes (a devkit template, so a platform change), or the pin records 1.

## Resolution (after review)

- Every count above is re-recorded with a dated comment beside it.
- The three assertions are rewritten as proposed. The Alderman's proof is now the four entities no edge reaches (`alex`, `room-three-oh-eight`, `room-three-oh-two`, `staircase`), each roled `atmosphere-info`, with every suspect reached and roled `tool`.
- The template's landing reads "A quiet place to begin. You might go anywhere from here — for now, this landing is the whole world." (`packages/devkit/templates/story-chord/story.story.template`), and the IDE's mirror was refreshed with `tools/ide/vendor-story-templates.sh` (byte-identical). The template test's pin stays at 0 / 0 / 0.
- **Moved lines found after the review**, of the same kind as the rows above (counts only). The role-split test stopped at Fernhill's line when it first failed, so its other two lines were not in the list David reviewed:

  | Story | Old (tool / progression / atmosphere) | New |
  |---|---|---|
  | The Alderman | 7 / 0 / 18 | 54 / 0 / 25 |
  | Ides of March | 43 / 0 / 26 | 129 / 0 / 42 |

  The Alderman's tool growth is its suspects, which the tagger reads by name.
- Not changed, noted: the website's getting-started pages (`website/src/app/chord/getting-started/first-story/content.mdx`, `compose-and-run/content.mdx`) quote the landing as "Doorways lead everywhere a story might go", which already differed from the template before this change.
- After re-recording: world-index 240 passing, 1 skipped; devkit 242 passing, 1 skipped (2026-11-22, 22:0x CST).

## Not moved

- if-domain: 121 passing. lang-en-us: 517 passing. devkit: 241 passing, 1 failure (the template row above), 1 skipped. world-index: 231 passing, 9 failures (every one is a row above), 1 skipped. Runs of 2026-11-22, 21:37 to 21:45 CST, after `./repokit build`.
- The CLI bundle is 5,401,919 bytes, its pre-phase size.
