# Session Summary: 2026-07-26 - main [52a8f4]

**Goal**: Draft ADR-272 — grammar documentation surfaces (last ADR-266 umbrella child;
carries Q-5; owes umbrella acceptance 16–17 plus inherited page obligations from
ADR-267/270/273).

**Status**: ADR-272 **IMPLEMENTED** same session (drafted → interviewed 3/3 → reviewed
14/14 → ACCEPTED → all five phases on "begin"). ADR-266 umbrella: all six children landed.
Not yet committed.

## Work done

- Recap presented; pre-session audit + docs-surface survey agents launched.
- Grounding: umbrella ADR-266 read in full (D3a/D3b, D9, Q-5, acceptance 16–17);
  ADR-270 D5/D6/D7/D8 + Modules (docs of extend/remove are 272's); ADR-273 D5
  (reachability semantics line on define-action page); ADR-267 D2 note (publish the 17
  slot names); ADR-269 implementation addendum (content.mdx frozen-provenance note
  pending 272's rederivation; shipped source standard-en-us.story, 55 blocks / 410 rules).
- ADR-267 read in full (final construct set + spellings D8–D12); ADR-268 read in full
  (no ordering notation; ordering = specificity + definition order + story tier).

## ADR-272 obligations ledger (compiled from the family)

1. **Umbrella acceptance 16** — define-action page capability framing, Chord-only voice
   (D3b: no extendParser/GrammarBuilder/priority/Sharpee comparison); keep worked example
   + line-by-line; publish the 17 standard slot names (also ADR-267 D2's restated note).
2. **Umbrella acceptance 17** — every action entry in stdlib/reference/content.mdx gains
   its define-action grammar block, derived from shipped standard-en-us.story; nothing
   existing removed (D9); replaces ADR-269's frozen-provenance note.
3. **Q-5 (inherited, must restate)** — mechanism: fenced tool-owned region vs imported
   per-action fragments vs separate derived page (last one abandons "in place").
4. **ADR-270 D5/Modules** — author-facing pages for `extend action` / `remove from
   action` (define-verb page already deleted; "other pages are ADR-272's").
5. **ADR-273 D5** — one/two example-led lines on define-action page stating `must be
   reachable` semantics (same place or open container; closed glass blocks; others'
   possessions blocked; sight required so darkness refuses).
6. **Docs-examples-load test** (umbrella allocation; ADR-271 D5 lineage) — every example
   on the new/updated pages loads; test currently narrowed to define-action.
7. Capability page must cover ADR-267's landed constructs (the `the <slot>` spelling,
   `or` alternation, `[optional]`, greedy `takes the rest of the line`, `is an
   instrument`/`is a topic`, `means <key> <value>`, `directions` block, constraints)
   and ADR-268's consequence (no ordering syntax; specificity + listed-first, story
   wins) — in author terms.
8. **12 platform-side TS rules** (`?`→help, 11 trace rules) are NOT in the Chord source —
   derived stdlib blocks won't include them (fine: author/debug tooling, not actions).

## Key decisions

- Docs-surface survey (agent, verified findings): define-action page 56 lines already
  post-267 spelling, lacks capability framing/slot list/reachability semantics;
  content.mdx 1515 lines, 56 entries, zero chord fences, garbled headings, frozen
  provenance note naming 272; docs-examples-load hardcoded to ['define-action'];
  NO pipeline writes into website/src (search index only writes public/); extend/remove
  only as two rows under mislabeled "The define forms" heading; 8 cookbook Phrasings
  tables = hand-written duplicate surface.
- 55 source blocks vs 56 mdx entries: the odd one is `if.action.deadly_room_death`
  (system action, no player grammar) — verified by diff.
- **ADR-272 DRAFT**: D1 scope (3 surfaces + test + repairs), D2 capability page contract
  (every 267 construct example-led, 17 slot names, 273-D5 semantics, 268 ordering in
  author terms, D3b voice), D3 alteration pages content contract, D4 verbatim derived
  blocks + both-directions loudness + deadly_room_death carve, D5 repokit derivation
  committed + freshness-gated (269 D7 precedent), D6 examples-load widened (derived
  blocks NOT re-loaded — identity), D7 example-first voice discipline.
- ADR-272 interview (all three ruled by David, each the presented recommendation):
  Q-1 → generated data module + <GrammarBlock> component (D4); Q-2 → two per-construct
  vocabulary pages, reorder idiom on extend-action (D3); Q-3 → cookbook Phrasings tables
  stay hand-written, recorded as known duplicate surface (Not addressed).
- adr-review: 13/14, four SMALL findings folded: Modules list added (repokit derivation
  rides the `grammar` command; <GrammarBlock> registered in mdx-components.tsx);
  D6 harness correction — CONFIRMED against code that captureGrammarRules never seeds
  standard rules (grammar-harness.ts:74-75), so removal fences would LoadError; widened
  test must use the seedStandard hook; D2 fence discipline (every fence a complete
  loadable define-action block); slot-name count re-verified at implementation (pre-
  migration 17 includes the 12 platform-TS rules). Re-scored 14/14.

## Open items

- Parked (prior sessions): migration-script deletion ruling (`chord-gap-report.cjs`,
  `generate-standard-grammar-chord.cjs`); `stories/thealderman` pre-existing tsc failure.

## Implementation (on "begin"; plan docs/work/grammar-docs-surfaces/plan.md)

- **Phase 0**: baselines green (story-loader 398, repokit 40); slot census = exactly 17.
- **Phase 1**: repokit grammar emits grammar-blocks.ts (renamed from .generated.ts —
  gitignore `**/*.generated.*` vs D5's committed requirement; plain-name+header is the
  repo's committed-generated convention); both-directions validateDocsCoverage; --check +
  verify cover both artifacts; repokit 44/44.
- **Phase 2**: 55 <GrammarBlock> calls (scripted one-time edit; `reading` entry had no
  **Group** line — hand-inserted); headings rederived (garbles gone); death-entry note;
  provenance comments retired; component + mdx registration. Website deps were stale —
  npm ci on David's go-ahead (website is npm, NOT workspace; stray pnpm-lock.yaml I
  created was removed). Build green.
- **Phase 3**: capability page — 6 new loadable fences, 273-D5 semantics, ordering
  paragraph, 17 slot names, cross-links. All 8 fences load.
- **Phase 4**: extend-action + remove-from-action pages (real loader error texts);
  nav.ts; vocabulary overview un-staled; reference/grammar "The alteration forms"
  section; multi-file-stories pointer.
- **Phase 5**: docs-examples-load enumerates pages + seeds real defineGrammar via
  source-path import (no parser-en-us surface change); story-loader 411/411; gate
  failure demo fired both defenses; voice audit + ADR-265 sweep clean; next build 152
  pages green. ADR flipped IMPLEMENTED.

## Flagged for David (not blocking)

- **KNOWN_PARTIAL_PAGES**: widening enumeration surfaced 12 pre-existing non-loading
  fences on six non-grammar vocabulary pages (partial snippets — own headers, missing
  harness entities, hatch imports). Load bar applied to the grammar pages per acceptance
  5; partials named explicitly in the test with default-load-tested-for-new-pages.
  Recorded in ADR-272 D6 addendum. Widening the bar to those pages = future ruling.

## Post-commit: version bumps (after 4db20c31, David's instruction)

- **Lockstep → 4.0.0**: `tsf version 4.0.0` (33 package.jsons; ext-hunger was a
  3.6.1 straggler); `engine-version.ts` stamped 4.0.0.
- **CHORD_LANGUAGE_VERSION 3.0.0 → 2.0.0** (owner consolidation ruling — David:
  "should never have been 3.0; it was at 1.0.0 and now it should be 2.0.0"): the
  ADR-266 program's seven interim bumps ship publicly as ONE major over Chord 1.x.
  Recorded as ADR-257's second one-time exception (beside 1.1.0); version.ts keeps
  the per-landing history; EBNF pin hash unchanged; ordinary D2 rules resume from
  2.0.0. chord-grammar-changes.md consolidation row appended.
- Fallout: chord pin test re-pinned; 4 IR snapshots re-recorded (languageVersion-only).
  chord 615/615, story-loader 411/411.

## Next steps

1. Commit the version bumps (not yet committed).
2. ADR-266 umbrella is fully landed (all six children) — candidate for a closing note
   on the umbrella's status line in a future pass.
