# Session Plan: mentioned-but-not-examinable — the first testing-explorer lens

**Created**: 2026-09-22
**Plan Status**: ACTIVE
**Overall scope**: Build and ship the first scoped lens for the testing-explorer (issue #508's decision): for every reachable room in a Chord story, extract noun phrases from the room's rendered description and each in-scope entity's description, hand each phrase to the real parser/engine as `examine <phrase>`, and report every phrase that fails to resolve in scope or resolves to the default examine response — grouped by room, folded by phrase. Real-path only (parser + engine decide; no vocabulary-match heuristic stands in for the verdict). Nothing under `packages/` changes; anything that looks like it needs a platform change is named as a discussion item, not built.
**Bounded contexts touched**: N/A — infrastructure/tooling. This is a testing lens under `tools/explorer-probe/`, consumed by story authors and future IDE surfaces; it changes no domain behavior of the platform or of Chord stories.
**Key domain language**: N/A (see above). The lens's own vocabulary — "phrase," "in scope," "default examine response," "fold by phrase" — is testing-tool language already fixed by issue #508's decision comment, not new domain modeling.

## References consulted
- `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md` — D20 ("the explorer — bounded exhaustive play") is unbuilt and D22 records it superseded by lens-based work; any report this lens produces must carry the soundness contract (findings are real, absence is not proof) and must never claim exhaustiveness.
- `docs/architecture/adrs/adr-308-testing-navigation.md` — D1: navigation/testing surfaces are derived from the tree/IR, never authored by the user; nothing in this plan introduces an author-curated exception list (suppression, if ever added, stays a Chord-source decision per D6a-equivalent reasoning, not a sidecar).
- `docs/architecture/adrs/adr-321-world-index.md` — D5: a vocabulary/phrase check is resolved "the way the parser resolves a player's command," by importing the platform's own derivation rather than restating a private rule — and ships exactly that as `@sharpee/world-index`'s `extractNounPhrases`/`buildVocabularyIndex` (D6b: heuristic tuned for recall, pinned by a corpus test). This plan reuses the extractor rather than re-deriving one or adding an NLP dependency. D10/D11 additionally record that authored prose lives beyond descriptions (NPC replies, responses, refusal text) and that a part-of-speech refinement exists IDE-side (Swift `NLTagger`) — out of reach for this Node tool, noted as a recall-gap risk for Phase 2, not silently absorbed.
- `docs/architecture/adrs/adr-322-state-space-analysis-umbrella.md` — D8: consume ADR-321's derivations, do not rebuild them (the reason this plan imports `@sharpee/world-index` instead of writing a second extractor). D9: the finding vocabulary stays open — this lens's classification (resolved-described / resolved-default / not-in-scope) is not forced into a fixed severity set. D6/D7: a performance budget and the same soundness contract as ADR-294 D20 apply to whatever this lens reports.
- `docs/architecture/adrs/adr-273-grammar-scope-resolver-world-api.md` — records the real `WorldModel` scope surface (`getVisible`, `getInScope`, `getCarriedAndWorn`, `getAllEntities`) after a defect where a resolver called methods that never existed and failed silently. This plan calls only the verified-real surface, and never treats a silent zero-candidate result as meaningful without checking the method exists.
- `docs/proposals/state-space-analysis.md` — ADR-322's working document. §4C ("Undeclared referent — forward direction") is the closest existing design to this lens and is explicitly named **state-relative**, distinguishing it from ADR-321 D13's static, story-wide "unnamed tool" check ("D13 is static and story-wide; this is state-relative, and only the sweep supplies 'by that point'"). This lens is a state-relative check in that same family; Phase 4 names the relationship rather than merging the two designs.
- `docs/context/project-profile.md` — confirms `@sharpee/world-index` is a real, built TypeScript package (`packages/world-index`, `dist/` present) importable via `require()` the same way `explore.js` already requires `@sharpee/world-model` and `@sharpee/devkit`; and confirms CI stays local-guards-only outside the publishing pipeline, so this tool is not expected to wire into GitHub Actions.
- `docs/context/session-20260922-1051-explorer-prototype.md` (this session's own file, newest by filename sort) — records that #508 was decided this session and that this plan became the active plan (`.current-plan` repointed, with the Avalonia/IDE plan stamped "Superseded by" per rule 18b — see the pointer record at the end of this file).

## Phases

### Phase 1: Lens core — a running report against fernhill
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — infrastructure/tooling
- **Entry state**: `tools/explorer-probe/explore.js` and `dimensions.js` exist and work (measured: fernhill 9/9 rooms in ~4s, secret-letter 18/18 in ~28s, `--hash declared` mode). `@sharpee/world-index` is built (`packages/world-index/dist/index.js` exists) and exports `extractNounPhrases`/`readsAsThing`. `branch-stories/fernhill/dist/fernhill.ir.json` is compiled.
- **Deliverable**:
  - Minimally refactor `explore.js` to expose a reusable hook — e.g. `onRoomFirstSeen(world, room, save)` — fired once per room the first time the declared-mode walk discovers it, with the walk's existing CLI behavior and tests unchanged (this IS "the walker's room reachability," reused rather than re-derived, per the #508 decision text naming the exact 18/18-in-28s figure).
  - New `tools/explorer-probe/lens-examinable.js` (CLI: `node tools/explorer-probe/lens-examinable.js <story.story>`) that:
    - drives `explore.js`'s declared-mode walk via the hook to visit every reachable room;
    - at each first-seen room, reads `room.description` and, for every entity in `world.getVisible(player.id)` (excluding the room and player themselves), that entity's `.description` — the same computed getter `examining-data.ts` reads, so the lens sees exactly what a player would;
    - extracts noun phrases from each description with `@sharpee/world-index`'s `extractNounPhrases` (and `readsAsThing` as a pre-filter only — see decision below), deduping within the room (fold by phrase);
    - for each distinct phrase, restores the room's captured save and executes `game.executeCommand('examine ' + phrase)`, then classifies the outcome from `game.lastEvents`' `messageId`s — **not text** — into: `resolved-described` (an `if.event.examined` event whose `params.description` is set — verified against `examining-data.ts`: this is any branch except the `params.description === undefined` fallback), `resolved-default` (messageId ends `default_description` / `default_description_self` / `nothing_special`), `not-in-scope` (`parser.error.entityNotFound` or `parser.error.scopeViolation`), or `ambiguous` (`parser.error.ambiguous`, reported separately — it is not a "phrase doesn't resolve" finding, it is a naming collision);
    - reports console output grouped by room, one row per distinct phrase, phrase's classification, and (for `not-in-scope`/`resolved-default`) the source description it came from.
  - Record, in the tool's header comment, the three design questions from the goal and how each was resolved, with the evidence:
    1. **Extraction**: reuse `@sharpee/world-index`'s `extractNounPhrases` — an existing, shipping, corpus-pinned heuristic (ADR-321 D6b) — not an NLP dependency and not a new heuristic. `readsAsThing`/vocabulary resolution (`buildVocabularyIndex`) are candidate-generation aids only; they never decide the verdict.
    2. **Default-response detection**: by `messageId`, confirmed by reading `examining-data.ts`'s `buildExaminingMessageParams` directly — `params.description === undefined` forces `default_description` regardless of trait branch. No text matching.
    3. **Execution surface**: through the real engine (`game.executeCommand`), never the parser/scope-resolver alone, per the #508 decision's explicit mandate. Parser-level non-resolution is read off `parser.error.*` messageIds (`parser-en-us/src/parse-failure.ts`), confirmed by reading source rather than assumed.
  - Run the lens against `branch-stories/fernhill/fernhill.story` and inspect the real output (9 rooms; small enough to hand-verify every finding against the story's own prose).
- **Exit state**: `lens-examinable.js` runs end-to-end against fernhill and produces a report a human can read and verify by hand; the report's classifications are confirmed correct on at least a handful of hand-checked phrases (a known-good custom description, a known default-response object, a known out-of-scope phrase). Nothing under `packages/` was touched.
- **Status**: CURRENT (since 2026-09-22)

### Phase 2: Harden and extend to secret-letter
- **Tier**: Medium
- **Budget**: 220
- **Domain focus**: N/A — infrastructure/tooling
- **Entry state**: Phase 1's lens runs cleanly and correctly on fernhill.
- **Deliverable**:
  - Check the classification against a story-authored `on examining <target>` custom Chord clause (secret-letter is more likely than fernhill to have one, being conversation/NPC-heavy): confirm the resulting event still carries a recognizable `messageId`/`if.event.examined` shape, or name the gap precisely if it does not (a different event type, or ADR-228's interceptor `postExecute` producing something the classifier misreads) — fix the classifier if the gap is real, or record it as a named discussion item if fixing it would require a `packages/` change.
  - Measure the extractor's ARTICLES-anchored recall on secret-letter's denser NPC/topic prose (per ADR-321 D10/D11's own finding that response prose roughly doubles the candidate count on fernhill): note the actual miss rate for phrases with no preceding article, and decide — explicitly, not silently — whether to extend the anchor set for this lens or accept the recall gap given secret-letter's shape.
  - Run the lens against `branch-stories/secret-letter/secret-letter.story` (18 rooms) via its `.story` entry; inspect the real output.
  - File any genuine mentioned-but-not-examinable defects found on secret-letter as GitHub issues, the same way the spike's `stall-lift-quietly` finding was filed as #504 (issue text names the room, the phrase, and the source description).
- **Exit state**: The lens runs correctly on both target stories; the custom-on-examining case is verified or its gap is named; any real secret-letter findings are filed as issues.
- **Status**: PENDING

### Phase 3: Report shape and regression pin
- **Tier**: Small
- **Budget**: 120
- **Domain focus**: N/A — infrastructure/tooling
- **Entry state**: Phase 2's lens produces verified-correct findings on both fernhill and secret-letter.
- **Deliverable**:
  - Finalize the report format: the grouped-by-room / folded-by-phrase console output plus a `--json` mode (matching `explore.js`'s existing `--json` convention), so a future IDE surface can consume it without a rewrite.
  - Add a corpus-style regression test under `tools/explorer-probe/tests/` (new directory — name and shape it following this repo's existing convention of pinning a heuristic extractor with expected findings, as `@sharpee/world-index`'s `tests/incomplete.test.ts` already does for the sibling check) so a prose edit that silently changes findings shows up in a diff rather than going unnoticed.
  - Write the tool's own short usage doc (header comment is sufficient; no new `.md` unless the header proves insufficient) covering invocation, the classification categories, and the resolved design-question record from Phase 1.
- **Exit state**: The lens is committed, documented, and regression-pinned; its output format is stable enough for the next lens or a future IDE consumer to build against.
- **Status**: PENDING

### Phase 4: Close the loop — ADR amendment and the next lens
- **Tier**: Small
- **Budget**: 90
- **Domain focus**: N/A — infrastructure/tooling
- **Entry state**: The lens ships, documented and regression-pinned (Phase 3 done).
- **Deliverable**:
  - Amend ADR-294 D20 to record the pivot to scoped lenses, citing this lens as the first shipped instance — the decision comment on #508 names this explicitly: "The ADR gets amended to say so once the first lens exists to cite." Confirm ADR-worthiness and get sign-off before writing (rule 11).
  - Name, in that amendment or in a short note, the relationship between this lens and `docs/proposals/state-space-analysis.md` §4C's "Undeclared referent" check — this lens is a state-relative execution check in that family; ADR-321 D13's "unnamed tool" check is the adjacent static, story-wide one. Name the relationship; do not merge the designs.
  - File a follow-on issue for the next candidate lens, per the #508 decision's own ordering: declared states nothing assigns (the `fruiting` finding, zero execution) is named as the most immediately reachable next candidate, having already been found by hand this session.
  - Update issue #508 to record the pivot as executed, not just decided.
- **Exit state**: ADR-294 reflects the shipped lens; the next lens is tracked as an issue, not lost; #508 reflects completed work.
- **Status**: PENDING

## Pointer record

Made CURRENT 2026-09-22 (session 760fe6). The outgoing plan, `docs/work/chord-writer-avalonia-production/plan.md`, is stamped **still live** (`Superseded by` this file, phases untouched) and resumes once the testing approach is settled.
