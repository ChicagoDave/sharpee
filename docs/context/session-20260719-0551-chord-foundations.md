# Session Summary: 2026-07-19 05:51 — chord-foundations (session 0a2801)

## Goals
- Website-content plan **Phase 7**: Chord Standard Library reference — unpause the completed `docs/work/stdlib-reference/` workstream, currency-sweep `docs/reference/stdlib-reference.md` to the 3.2 surface, fold the chord-availability audit (54/54 clean) per entry, and import into the Next.js site via the MDX pipeline (Phases 5–6 mechanics).

## Entry state
- Child plan `docs/work/stdlib-reference/plan.md` is PLAN COMPLETE (2026-07-16), doc truth-refreshed 2026-07-17 (post-ADR-230); render target was the now-archived old `site/`.
- Stale vs. shipped reality (post-07-17): ADR-215/216 extension surface (`use combat`, combatant/weapon/health composable, NPC plugin auto-wires, `use state-machines`/`define machine`, payloaded emit + media sugar + `define channel`), ADR-234/237/238 doors (`through` exit tail — doc's "door is TS-only" claim now false), ADR-236 regions + story-global daemons (doc's "presence-gated only" claim now false), ADR-239 topics (`define topics for` — asking/telling), ADR-241 dynamic channels, ADR-242 person identity (`proper`, `pronouns`, `define pronouns`).
- Harness discipline unchanged: owner ruled prose-only (no committed fixture harness) for this doc — ad-hoc compose sanity checks only.
- Pre-session audit: no blockers for this phase; standing "awaiting David" items unchanged (friendly-zoo isAlive, ADR-243 flip, 3.2.0 publish, repokit --browser chord-branch, cloak legacy suite).

## Work log
- Child plan `docs/work/stdlib-reference/plan.md` REOPENED with Phases 11–12; `.current-plan` → the child plan.
- **Phase 11 COMPLETE**: six parallel investigators (doors/§3-4, plugins/§12, conversation-combat/§8-9, media doc-wide, identity-traits/§6+§11, intro-meta-crossrefs) produced 40 code-grounded deltas; all folded centrally. Doc re-badged **CURRENT at Sharpee 3.2**. Highlights: door entry rewritten (`a door` + `through` tail, kind-scoped locked default, five compile gates, ADR-237/238); R3 keyless forms (`lockable with the iron key`, `openable with the crowbar`) replace the removed `with key/tool` spellings; ADR-239 topics table into §8.1; `use combat`/`use state-machines`/NPC auto-wire into §8/§9/§12; story-global + region daemons into §12.2; §11 table 11 rows updated incl. ADR-242 `proper`/`pronouns`; 38 (not 37) wired actions; TURN's dual surface; bare cut/dig. All 16 chord-language.md cross-refs verified current. Honest gaps re-verified and preserved (audibility, imperative timers/ADR-217 designed-not-built, third-party extensions, scene/vehicle/etc TS-only).
- Compose proof (prose-only ruling upheld): scratchpad `sweep-proof-a.story`/`sweep-proof-b.story` boot via the bundle and exercise every new construct live — all behave as documented (incl. real `use combat` resolution and a `define machine` transition).

- **Phase 12 COMPLETE**: stdlib reference imported as a collapsed "Standard library" nav group (Chord section, between Phrasebook and Reference) — Overview (§1+appendix adapted, page-map table, 3.2 callout) + 11 section pages under `/chord/stdlib/*`, section numbers kept in headings. Three parallel conversion agents; fences byte-diffed (6 story→chord total), 1 Callout, only sanctioned deviations. Build green **50 routes**; 12 screenshots reviewed (light+dark incl. the 40-row traits table and the topics/combat NPCs page).
- **Phrasebook staleness caught during import (fixed doc AND site)**: attacking's "combat interceptor (TypeScript today)" → `use combat`; hide's needs "`concealment` (TypeScript today)" → `hiding-spot` adjective; drink's needs now names `drinkable`. Plus all 14 textual `stdlib-reference.md` pointers across Phrasebook/guide pages now link to `/chord/stdlib/*`.
- Closure: `.current-plan` returned to `docs/work/website-content/plan.md`; **website plan Phase 7 DONE** (7 of 9). Child plan `stdlib-reference/plan.md` records Phases 11–12 COMPLETE.

## Key decisions
- **David's post-review ruling on the stdlib reference (2026-07-19)**: "way too much word soup — the stdlib should show examples for everything and only basic explanations." Recorded as **child-plan Phase 13** (example-first rework: worked `.story` snippet per action/trait entry, prose cut to basics, deep detail condensed; doc + site together; verification approach to be revisited with David since prose-only was ruled for a prose draft). PENDING its own session. Phase 7's import stands as shipped meanwhile.

## Status: DONE for this stretch — website plan Phases 1–7 complete (Phase 7 carries the Phase-13 rework debt, PENDING). Next: stdlib Phase 13 rework and/or website Phase 8 (book 3.2 child plan) on David's go, then Phase 9 (playground + closure). This finalize commits the sweep + site import + plan records.
