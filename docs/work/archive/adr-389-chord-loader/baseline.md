# ADR-389 Phase 0 — Baseline and gate inventory

**Measured**: 2026-10-31, session 002689, branch `feat/adr-389-chord-loader` at `f7aaf68fd` (no source change from main). One run each; a byte diff against these files is a finding (ADR-293 Phase D).

## Suite and type-check baseline

| Check | Command | Result |
| --- | --- | --- |
| story-loader suite | `pnpm --filter '@sharpee/story-loader' test` | 189 files, 1525 passing, 1 skipped (04:11) |
| chord suite | `pnpm --filter '@sharpee/chord' test` | 110 files, 1747 passing (04:11) |
| type check | `npx tsc --noEmit` at the repo root | no output, exit 0 |

The ADR-389 exit gate is story-loader ≥ 1525 and chord ≥ 1747.

## Tree-run baseline

Captured with stdout and stderr merged to one file each under `baseline/`. The `[phrase] renderMessage(...) failed` lines in the Secret Letter capture are the story's own stub templates failing to parse at render time; they are part of the baseline and must stay byte-identical like everything else.

| Story | Command | Summary | Exit | File |
| --- | --- | --- | --- | --- |
| secret-letter | `./sharpee test branch-stories/secret-letter --tree` | seed 1209, 106 lines; 1458 cards passing, 2639 assertions passing, 11 cards failing, 13 assertions failing | 1 | `baseline/secret-letter.tree.txt` (3180 lines) |
| fernhill | `./sharpee test branch-stories/fernhill --tree` | 86 cards passing, 107 assertions passing | 0 | `baseline/fernhill.tree.txt` (135 lines) |
| ides-of-march | `./sharpee test branch-stories/ides-of-march --tree` | 39 cards passing, 51 assertions passing; rooms entered 5 / 5 | 0 | `baseline/ides-of-march.tree.txt` (174 lines) |

The Secret Letter port is on hold and its 11 failing cards are the pre-existing state at `f7aaf68fd`; the gate is "identical to this", not "green". Compare with `diff baseline/<story>.tree.txt <new run>`.

## Backstop inventory — `packages/story-loader/src/loader.ts`

`grep -ci backstop packages/story-loader/src/loader.ts` → 28. Of those, 18 carry the phrase "defensive backstop"; the other 10 say "backstop" in another form (the ADR's AC-4 was corrected to count by the word on 2026-10-31).

"Reads" is what the **analyzer's** gate consults today, from reading each gate's body in `packages/chord/src/analyzer.ts`: IR records (`entity.*`, `comp.*`, `ir.*`), the stdlib manifest (chord-side data, `STDLIB_MANIFEST`), extension manifests (`EXTENSION_MANIFESTS`), or analyzer state (`this.*` beyond `diagnostics`). Every `this.*` seen is derivable from the IR: `this.usedExtensions` is `ir.uses`; `this.announceModes` only shapes the message; `this.resolveConfigEntity` is a name lookup over `ir.entities`; `this.scoringGateReported` is a once-flag.

| # | Loader line | What the loader refuses | Analyzer gate (`analysis.*`) | Analyzer reads | Disposition |
| --- | --- | --- | --- | --- | --- |
| 1 | 298 | trait-config entity ref names no entity | `setting-names-no-entity` (1873) | `comp.span`, `entity.name`, `resolveConfigEntity` over `ir.entities` | move — D4a |
| 2 | 662 | `use <name>` names no trusted extension | `unknown-extension` (1214) | `EXTENSION_MANIFESTS`, `announceModes` (message only) | move — D4c |
| 3 | 697 | door never wired by a `through` exit (reads built world's `TraitType.DOOR`) | `door-unconnected` (2400) | exits in IR | move — D4a, re-expressed over `ir.entities[*].exits` |
| 4 | 726 | `score`/`award`/`ranks` without `use scoring` | `scoring-needs-use` (4784) | `ir.scores`, `ir.ranks`, `ir.uses`, once-flag | move — D4c |
| 5 | 994 | conversation blocks on an entity with no `character` block | **no exact twin** — analyzer has `greetings-host` (2783), `exchange-host` (2870), `conversation-host` (3110), which gate the host's *kind* ("needs a person"), not the presence of a character model | IR | move — D4a as a **new** `validateIR` code (`conversation-needs-character`); flag for David: the loader's predicate (`irEntity.character === undefined`) is stricter than the analyzer's, so a story could compile today and fail at load — confirm whether that is intended before Phase 3 |
| 6 | 1273 | a `use`-gated construct present without its `use` (generic loop over `gatedConstruct`) | `chapters-needs-use` (8115, 8505), `expanses-needs-use` (3491, 6614, 8832), `sailing-needs-use` (8779), `scoring-needs-use` (4784) | IR | move — D4c; delete `gatedConstruct` slot and its three implementations (`extensions/chapters.ts:39`, `expanses.ts:22`, `sailing.ts:20`) |
| 7 | 1533 | `extend action` names no story or standard action | `extend-target` (2047) | `ir.actions`, `ir.grammarExtensions`, `STDLIB_MANIFEST` | move — D4b |
| 8 | 1554 | `remove from action` names no standard action | `removal-target` (2058) | `ir.grammarRemovals`, `STDLIB_MANIFEST` | move — D4b |
| 9 | 1567 | removal matched no **live** grammar rule | `unmatched-removal-pattern` (2074) over manifest shapes | manifest | **stays** — the live grammar is the fact; re-comment as a load-time fact |
| 10 | 1758 | worn target not wearable (reads built world's `WearableTrait`) | `worn-not-wearable` (1905) | `entity.wears`, `ir.entities` | move — D4a, re-expressed over the target's `traits` |
| 11 | 1779 | a non-room carries exit forms | `exit-non-room` | IR (gate body not re-read this phase; code present) | move — D4a |
| 12 | 1820 | `is deadly while <condition>` | `deadly-while-unsupported` | IR | move — D4b |
| 13 | 1915 | more than one kind noun | `multiple-kind-nouns` (1646) | `entity.kinds` | move — D4a |
| 14 | 1920 | no kind noun | `missing-kind-noun` | `entity.kinds` | move — D4a |
| 15 | 2066 | unknown kind noun | `unknown-kind-noun` (1619) | `entity.kinds`, `usedExtensions` | move — D4a |
| 16 | 2188 | gerund has 0 or 2+ implementation surfaces | `gerund-implementation` (1952, 1958) covers the pure-Chord cases only | `entity.traits`, `entity.onClauses` | **stays** — authoritative for the ADR-090 capability surface the compiler cannot see; its comment already says so |
| 17 | 2222 | conditional composition on a non-every-turn trait | `conditional-composition-unsupported` (1725) | `comp.condition`, `ir.traits` | move — D4a |
| 18 | 2424 | unknown hiding position | `unknown-hiding-position` (1800) | `comp.config` | move — D4a |
| 19 | 2482 | combat adjective without `use combat` | `extension-not-used` | `comp.name`, `ir.uses` | move — D4c |
| 20 | 2500 | `dark` on a non-room | `dark-rooms-only` (1789) | `comp.name` | move — D4a |
| 21 | 2515 | undeclared trait adjective | `trait-not-declared` (1841) | `comp.name`, `ir.traits` | move — D4a |
| 22 | 2554 | NPC boolean setting not `true`/`false` | `setting-not-boolean` (1867) | `comp.config` | move — D4a |
| 23 | 2610 | `patrol` without `with route` | `patrol-needs-route` (1813) | `comp.config` | move — D4a |
| 24 | 2629 | unknown NPC behavior adjective | pre-gated by the manifests (`extension-not-used`, closed switch) | manifest | move — D4c (folds into the manifest-word gate) |
| 25 | 2661 | combat numeric setting not a number | `extension-config-value` | `comp.config` | move — D4a |
| 26 | 2668 | combat boolean setting not `true`/`false` | `setting-not-boolean` (1867) | `comp.config` | move — D4a |
| 27 | 2711 | declared-trait entity-ref config names no entity | `setting-names-no-entity` (1873) | `resolveConfigEntity` over `ir.entities` | move — D4a |
| 28 | 3101 | direction word has no `Direction` value | pre-gated by the **parser's** closed `DIRECTIONS` set | parser | **stays** — cross-package drift guard, pinned by `tests/direction-words.test.ts`; re-comment |

**Totals**: 25 move, 3 stay — as the ADR says. Every one of the 25 is expressible over `StoryIR` alone; the ADR's "13 of 25 verified" is now 25 of 25 at the level of what the analyzer reads. One finding for David before Phase 3: row 5 has no analyzer twin, so `validateIR` would add a diagnostic code the compile does not emit today, which is a (small) language-facing change — a story with conversation blocks on an unmodeled person stops compiling instead of failing at load.

## Proposed D4 grouping (Phases 3–5)

- **Phase 3 — D4a, entity and composition gates (16)**: rows 1, 3, 5, 10, 11, 13, 14, 15, 17, 18, 20, 21, 22, 23, 25, 26, 27. Creates `validate-ir.ts`, the `ANALYSIS_PASSES` entry, the `createStory` call, the loader seam tests, the ADR-276 D1 note. Largest group, all on `ir.entities`.
- **Phase 4 — D4b, grammar gates (3)**: rows 7, 8, 12. Row 9 stays.
- **Phase 5 — D4c, `use`-gated gates and closure (5)**: rows 2, 4, 6, 19, 24. Deletes `gatedConstruct` and its three implementations, deletes `tests/adr-276-backstops.test.ts`, re-comments rows 9, 16, 28.

Phase 4 is small enough to fold into Phase 5 if David prefers eight phases to ten.
