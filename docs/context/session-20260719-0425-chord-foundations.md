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

## Content-wave rulings (David, this session — four AskUserQuestion answers)
- **ADR-232 Q-2 RESOLVED: stdlib reference lives Chord-side** ("Chord Standard Library reference", paused plan's framing stands, retargeted to the Next site). ADR status line updated (2 open questions remain).
- **Chord Author Guide = chord-language.md imported/adapted** (currency sweep vs post-07-14 ratchets required, samples re-verified).
- **Sharpee dev manual = the book, v2.0.0 → 3.2** (own child plan first; largest item, last of the content phases).
- **Sequencing: content first, playground last.** Plan restructured: new Phases 5–8 (author guide, phrasebook, stdlib reference unpaused, book 3.2), playground+closure now Phase 9.

## Chord parser OOM bug — FIXED (David's "fix it", same session)
- Root cause: in `parseDefinePhrase`'s variant loop (`parser.ts`), a flush-left (column-1) non-keyword body line reached `parseProseParagraph(1, 0)` / `parseVerbatimBlock`, which require depth > 0 and consume nothing — zero progress, empty variants appended until 4 GB OOM.
- Fix: explicit `indent === 0` guard in the loop — one `parse.phrase-text-indent` diagnostic for the first flush-left line, the run consumed, `end phrase` still terminates. Both prose and verbatim paths covered.
- Tests: 3 new in `packages/chord/tests/parser.test.ts` (one-diagnostic + block-terminates + later-decls-parse; verbatim; indented-unchanged). chord 389/389 green. E2E: the repro now yields `repro.story:5:1 error [parse.phrase-text-indent]`, exit 1, instant. Grammar doc prose-block section notes the diagnostic.

## Status: IN PROGRESS — Phases 1–4 DONE (of 9 after restructure); parser OOM FIXED. Next: Phase 5 (Author Guide import) on David's go. Tree uncommitted (website + ADR + plan + parser fix). Remaining open: TS-getting-started scope (subsumed into book-3.2 child plan unless David wants it sooner).
