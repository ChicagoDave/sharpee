# Session Summary: 2026-07-19 04:25 — chord-foundations (session c331a9)

## Goals
- Housekeeping: remove `.tmp-g3-proof-*` dirs, gitignore `.devarch-events-*.jsonl` (done first thing).
- Start the website-content plan (`docs/work/website-content/plan.md`) — Phase 1: content pipeline decision + ADR-232 amendment.

## Key decisions
- **Content pipeline pinned (Phase 1)**: `@next/mdx` with imported `.mdx` content files wrapped by `.tsx` route files (imports, not MDX file-routing — `nav.ts`/`DocPage`/crumbs stay authoritative; no `pageExtensions` change). Rationale + full ship list in the plan's Phase 1 notes ([plan](../work/website-content/plan.md)).
- **Pager scope**: prev/next flattens WITHIN a nav section only — never jumps Chord → Sharpee (crosses audiences, not chapters).
- **ADR-232 amendment written** ([adr-232](../architecture/adrs/adr-232-chord-first-web-presence.md)) recording executed facts (Next.js 16 pick, WF-B shell, palette pipeline, Pages teardown, no-TOC, no `-beta`, MDX pipeline); Q1–Q3 untouched, status stays DRAFT — **awaiting David's sign-off** (silence ≠ approval).

## Work log
- Deleted `.tmp-g3-proof-XfS43F/` and `.tmp-g3-proof-iZzXBb/` (stale fernhill copies from G3 proof runs); added `.devarch-events-*.jsonl` to `.gitignore` (covers docs/context/ and archive/).
- Phase 1 implemented: read Next 16's bundled MDX docs per AGENTS.md; installed `@next/mdx` + loaders + `remark-gfm` (string-form plugin for Turbopack); wired `next.config.ts`; `src/mdx-components.tsx` element map; `src/components/prose.tsx` primitives (`CodeBlock`, `Callout`, prose element styles); `pagerFor()` in `nav.ts` + `Pager` in `doc-page.tsx`; `/style-guide` unlisted route as REAL-PATH pipeline proof.
- Verified: `npm run build` green (15 static routes) twice; full-page light/dark shots + pager shot (scratchpad `shoot-style-guide.mjs`, shoot-site pattern). Dark-mode fix caught by the shots: callout washes moved `-900` → `-800` (dark canvas IS navy-900; a `-900` wash vanished).
- Authoring gotcha recorded for Phases 2–5: MDX fences must carry a language tag (`text` at minimum) or the block styles as inline code.

## Phase 2 (Chord section) — DONE same session
- **ADR-232 amendment signed off by David**; Phase 1 closed. Mid-phase ruling recorded (ADR-232 Q-1 partial + plan Phase 4): **Home landing page describes BOTH Sharpee (TypeScript) and Chord (an IF Modeling Language)**.
- All 6 Chord stub pages now real + new `/chord/reference/grammar` route (nav "Reference" group; `chord.ebnf` downloadable from `website/public/`). Build green (16 routes incl. `/style-guide`); 8 full-page screenshots reviewed.
- REAL-PATH: author flow proven via `npm pack` of the `~/.tsf-publish` 3.2.0 staging into a scratch `sharpee init` project (registry has only 3.1.0 — G4 publish pending). init/build --browser/test/play/compose all live; page outputs verbatim.
- Every Chord sample compose-verified via two proof stories (details in plan Phase 2 notes).
- **PLATFORM BUG (David to rule; packages/chord)**: flush-left prose inside `define phrase` → parser allocation loop → 4 GB OOM, no diagnostic. Repro: `scratchpad/author-proof/orchard/repro.story` + `sharpee compose repro.story --check`.

## Phase 3 (Sharpee section + Fernhill import) — DONE same session
- `/sharpee/platform` (under-the-hood tour: layers table, entities/traits/behaviors, four-phase actions, events→prose pipeline, phrase algebra, capability dispatch, Chord mapping) and `/sharpee/actions-and-traits` (trait catalog, action families, genai-api map) — sourced from core-concepts.md + phrase-algebra-primer.md.
- **genai-api decision recorded**: link-out + curated summary, never imported (drift). **TS getting-started scope FLAGGED to David** (plan Phase 3 notes).
- Fernhill 8 chapters imported verbatim under `/learn/fernhill/*` (subagent conversion; nav group of 8; chapter CLI samples re-diffed against live 3.2.0 — no drift). Build green, 23 routes; screenshots reviewed.
- Phase 4 polish carry-over: Sharpee pager labels read bare "Overview" (ambiguous).

## Phase 4 (Play + home + polish) — DONE same session (David's "continue with phase 4")
- Fernhill browser client built via the g3-proof staging pattern (devkit init in repo-internal temp + story substitution; `repokit build fernhill --browser` still hits the known chord-branch ENOENT — open item unchanged), synced to `website/public/web/fernhill/` (gitignored). Rebuild script in session scratchpad (`build-fernhill-web.mjs`); promote to `scripts/` if recurring.
- `/play` iframe embed REAL-PATH proven (story compiled in-iframe, Iron Gates rendered, then screenshot). Home page real per the both-products ruling (Chord-first click, 4 cards, v3.2.0 badge). Pager "Overview" items now labeled by group title.
- Build green (23 routes); home light/dark + play + pager shots reviewed.

## Key decisions (additions)
- **[ADR-243](../architecture/adrs/adr-243-chord-story-person.md) written (DRAFT, 4 open questions)** — Chord story person (1st/2nd/3rd narration). Raised by David mid-session; ADR-worthiness confirmed. Platform seam already half-exists (NounPhrase.person, Assembler agreement); open: spelling, message-row migration, third-person player identity, tense scope. Capture only — no implementation.

## Content-wave rulings (David, this session — four AskUserQuestion answers)
- **ADR-232 Q-2 RESOLVED: stdlib reference lives Chord-side** ("Chord Standard Library reference", paused plan's framing stands, retargeted to the Next site). ADR status line updated (2 open questions remain).
- **Chord Author Guide = chord-language.md imported/adapted** (currency sweep vs post-07-14 ratchets required, samples re-verified).
- **Sharpee dev manual = the book, v2.0.0 → 3.2** (own child plan first; largest item, last of the content phases).
- **Sequencing: content first, playground last.** Plan restructured: new Phases 5–8 (author guide, phrasebook, stdlib reference unpaused, book 3.2), playground+closure now Phase 9.

## Chord parser OOM bug — FIXED (David's "fix it", same session)
- Root cause: in `parseDefinePhrase`'s variant loop (`parser.ts`), a flush-left (column-1) non-keyword body line reached `parseProseParagraph(1, 0)` / `parseVerbatimBlock`, which require depth > 0 and consume nothing — zero progress, empty variants appended until 4 GB OOM.
- Fix: explicit `indent === 0` guard in the loop — one `parse.phrase-text-indent` diagnostic for the first flush-left line, the run consumed, `end phrase` still terminates. Both prose and verbatim paths covered.
- Tests: 3 new in `packages/chord/tests/parser.test.ts` (one-diagnostic + block-terminates + later-decls-parse; verbatim; indented-unchanged). chord 389/389 green. E2E: the repro now yields `repro.story:5:1 error [parse.phrase-text-indent]`, exit 1, instant. Grammar doc prose-block section notes the diagnostic.

## Phases 5+6 (Author Guide + Phrasebook) — DONE same session
- **Phase 5**: chord-language.md currency-swept to 3.2 (3 stale fixtures fixed — R3 ×2 + ADR-235 hatch; 5 new fixtures for doors/regions/proper-pronouns/topics/use; 50/50 gate-clean; new §2.12–2.14/§3.9/§5.9–5.10; status → CURRENT at 3.2). Imported as 6 chapters under `/chord/guide/*`; appendix replaced by a grammar-reference pointer (decision recorded).
- **Phase 6**: stdlib-phrasebook.md re-verified at 3.2 by its RUNTIME harness (3 R3 fixtures fixed; 17 fences verbatim, 68 commands replayed); two prose `with key/tool <entity>` remnants caught by screenshot review, swept doc+site. Imported as Overview + 8 pages under `/chord/phrasebook/*`. Site 38 routes green.
- **Finding (David to rule, NOT touched)**: `stories/friendly-zoo` fails the workspace build — `src/characters.ts` uses `isAlive` which no longer exists on `INpcData` (pre-existing platform drift; surfaced when a wrong-cwd npm build ran the root turbo build).

## ADR-243 interview + review (same session)
- **All four questions RESOLVED via /devarch:adr-interview** (David's rulings): Q-1 spelling = `narration: first person` (phrase field, closed set, tense room reserved); Q-2 = marker realization (`{You}`, 382 rows) + bounded sweep of 124 literal lines/9 files; Q-3 = third person REQUIRES declared player identity (compile error otherwise; `pronouns it` explicit escape; input stays imperative); Q-4 = tense OUT, room reserved for its own ADR.
- **adr-review run**: 13/14 → three fixes applied (stale Q-3 text, Decision heading, AC-1..AC-7 added) → **14/14 READY FOR IMPLEMENTATION**. Status: **DRAFT — David has NOT flipped to ACCEPTED** (flip question outstanding at finalize time). Implementation not started (platform change; separate go-ahead required).

## Status: IN PROGRESS — website plan Phases 1–6 DONE (of 9); parser OOM FIXED (in d0cc4807); this finalize commits Phases 5–6 + ADR-243. Next: Phase 7 (stdlib reference child plan) on David's go; ADR-243 ACCEPTED flip + implementation go-ahead outstanding. Open: friendly-zoo isAlive build break (David to rule); TS-getting-started scope (subsumed into book-3.2).
