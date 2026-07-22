# Session Summary: 2026-07-21 ~09:12 - chord-foundations (session 99aee6, post-finalize continuation)

## Goals
- Complete the ADR-250 phrasebook plan from where the previous finalize
  stopped (mid-Phase 5): run the seam tests, engine read-point test, fold
  ADR deviations, then Phases 6 (fernhill E2E) and 7 (docs).

## Completed
- **Phase 5 COMPLETE**: loader seam tests 9/9 first run
  (phrasebooks-runtime.test.ts — story-beats-book registration set,
  arbitration + live predicate flip via real interceptor, per-key
  fallthrough, Choice keyed `phrasebook.<book>`/key, used-book
  data-registry conformance LoadErrors). Engine read-point tests 6/6
  (phrase-render.test.ts — key pinning, book hit via renderTemplate with
  merged params, all miss/degrade paths byte-compatible). ADR-250 amended
  for both disclosed deviations (evaluator return `{book, key, template,
  params?}` — direction-rule rationale; D8 runtime.ts row corrected: the
  "NO change" claim was wrong, phraseEvent threw on book-only keys, now
  emits bare + stages book-entry hatches). Regression: story-loader 308,
  engine 524 (518+6), lang-en-us 430, platform-browser 86 — all green.
- **Phase 6 COMPLETE**: fernhill gains the weathervane probe (Iron Gates,
  `scenery, pushable` — plain scenery refuses push, found on first run) +
  `define phrase vane-story` + midnight-voice/evening-voice books.
  phrasebooks.transcript 18/18: evening voice both first-time variants →
  turn-14 midnight flip ([DO]/[UNTIL] wait loop) → midnight book's OWN
  first-time pair (per-(book,key) proof — shared counters would show the
  second variant), story-override stable both states, vane-quiet
  fallthrough per key. Fernhill suite green x3 + wt-01 76 PASS (one
  non-reproducing RNG flake, one-good-run rule). Third ADR-250 slip found
  + corrected: D9's "re-voice distant-bell" was impossible by its own D2
  (story keys always beat books) — probe keys are book-only by design.
- **Phase 7 COMPLETE**: chord-language.md §5.11 (example-first) + §1.2
  layout row; chord-grammar.md Phrasebooks section + story-file/
  declaration productions + layout row; chord.ebnf productions;
  grammar-changes log row (ADR-250 approval, implemented same day).
  Agent-executed: cookbook rename sweep finished (render-site.mjs
  title/meta + 17 fixture titles/ids, zero external id refs, verification
  grep clean) and site page /chord/guide/vocabulary/define-phrasebook
  (content.mdx + page.tsx + nav.ts + section index; website build green,
  149 pages).
- **AC-7 floor**: dungeo walkthrough chain 888/888; final
  `./repokit build dungeo --browser` running at write time.

## Key Decisions
- (none new — all rulings were made pre-finalize; three ADR-250
  implementation-truth corrections recorded in the ADR itself)

## Open Items / Next
- The ADR-245 plan is fully COMPLETE (Phases 0a–0c, 1–7) once the
  --browser build lands clean.
- Post-ADR-248 open-items sweep still parked (royal-puzzle RNG gate
  ruling, dungeo module-state, armoured/thealderman reboot wiring,
  ext-testing packaging, ADR-247 implementation).
- ADR-245 phrasebook family follow-ons parked: generalized `import`
  (own ADR), packaged-book authoring/distribution tooling (registries
  ship empty), ADR-243 story-person implementation (books are written
  person-neutral against it).

## Session Metadata
- **Status**: COMPLETE — final `./repokit build dungeo --browser` clean;
  the ADR-245 phrasebook plan is DONE (Phases 0a–0c, 1–7 all COMPLETE).
  Work uncommitted atop 35b843cd.
- **Test state**: chord 444, story-loader 308 (incl. the 9 seam tests),
  engine 524, lang-en-us 430, platform-browser 86, fernhill
  18-transcript suite green x3 incl. phrasebooks.transcript 18/18,
  wt-01 76, dungeo chain 888/888, website build 149 pages, full
  --browser build clean.
