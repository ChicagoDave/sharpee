# Session Summary: 2026-07-19 21:47 — chord-foundations (session 7692ef)

## Goals
- stdlib-reference **Phase 13**: example-first rework of `docs/reference/stdlib-reference.md` + `/chord/stdlib/*` site pages per David's 2026-07-19 ruling ("way too much word soup — the stdlib should show examples for everything and only basic explanations").

## Entry state
- Phases 11–12 COMPLETE (session 0a2801): doc CURRENT at 3.2, imported as 12 pages under `/chord/stdlib/*`, 50 routes green.
- `.current-plan` switched back to `docs/work/stdlib-reference/plan.md` for Phase 13.
- Open at execution: example verification approach (Phase 9 prose-only ruling was for the prose draft; asking David).

## Work log
- Harness scaffolded: `docs/work/stdlib-reference/verify.mjs` (phrasebook replay harness — story fences verbatim-excerpt-checked, transcripts replayed against the engine — merged with chord-language's expected-fail manifest convention, plus orphan-fixture check) + `fixtures/manifest.json`.
- Pilot §2.1 (taking and dropping) reworked example-first, fixture `manipulation/taking-dropping.story`, transcript captured from the engine (4 commands), harness-verified green. Entry shape: lead paragraphs → author-writes/player-sees pair → one-sentence takeaway → compact Refusals/Success/Events table → one-line interceptor note.
- David approved the pilot shape ("Ship this shape").
- Fan-out: shared brief at `docs/work/stdlib-reference/rework/BRIEF.md`; 12 parallel section agents (§2-intro+2.2–2.5, §2.6–2.9, §3, §4, §5, §6, §7, §8, §9, §10, §11, §12+appendix) — all completed.
- **Central fold DONE**: scratch `fold.mjs` spliced all 13 section files by heading-bounded spans (1,680 → 3,945 lines); manifest fragments merged (throwing + combat anyOf). **Full harness green: 33 story fences verbatim, 36 transcript fences / 158 commands replayed byte-identical, 33 fixtures compile.** Reconciliation: §11 cuttable/diggable/openable rows re-worded to the real `with the <entity>` form; §10.1 worn-inventory gap one-liner added; §1.2 rewritten for the example-first layout; status banner re-badged (example-first rework 2026-07-19, harness-verified).
- Doc corrections the agents grounded during rework (old text wrong vs runtime): wearing stacks by default (`hands_full` branch unreachable — old §5.1 contradicted §5.2's own quirk note); auto-LOOK prints room text BEFORE the illumination line; `push X north` doesn't parse (only `move X <dir>`); tool-gate surface is `cuttable with the billhook` (not "`with tool <entity>`"); ineffective-attack output is blank (not a "readable legacy string"); concealed's claim narrowed to "invisible to the parser" (leaks into look listings).
- **Site re-import DONE**: 4 conversion agents regenerated the 12 `/chord/stdlib/*` content.mdx pages (heading demotion, markers stripped, Overview Callout re-badged, 3 whole-chapter refs linked per convention, 1 MDX line-join). All 69 fences byte-diffed identical to the doc (33 story→chord + 36 transcript). `npm run build` green, 50/50 routes. Light/dark screenshot pass reviewed (plugins full-page both schemes, manipulation/npcs/senses full, overview/traits/meta viewport) — the plugins page David flagged as "word salad" now leads with the priority table and four example pairs.

## Platform issues surfaced (empirical, fixture-grounded — for David; none bridged)
1. Article-slot misrenders, one formatter family (ADR-158 chain articles bare prepositions): `found_concealed` → "Hidden an on/an inside, you discover: …" (`searching-helpers.ts:98`); `cant_hide_there` → "You can't hide an under the velvet curtain." **§6.2's transcript necessarily shows the garbled line — publish-or-hold needs David's ruling** (harness will force re-capture once fixed).
2. Concealed items leak into look/examine contents listings (`scope-resolver.ts`/`going.ts` filter `concealed`; looking's contents path doesn't) — parser can't see them but `look` lists them.
3. Examining a descriptionless entity render-fails (unbound `description` param) and prints nothing — `nothing_special` fallback never fires.
4. Concealment auto-reveal not wired: `createConcealmentBreakListener` exported, never registered — hide then take/talk leaves you hidden (NPC-sight half IS wired, `game-engine.ts:393`).
5. `after putting it` silently swallowed on the insert path — inserting's delegated context double-wraps the event payload (no `messageId` at top level), text service renders nothing; direct put renders fine (`inserting.ts` createActionContext).
6. A plain (non-`through`) mirror exit line silently unwires a door — `connectRooms` re-stamps both directions without `via`; no `analysis.door-pair-mismatch` diagnostic fires (loader ~380–410).
7. Bare `climbable` climb is a silent no-op: `climbing.ts` ignores `moveEntity`'s refusal — success text speaks, player never moves.
8. Worn items invisible to INVENTORY until an `undo` rebuilds the world (then `wearing`/`carrying_and_wearing` render correctly). Doc now carries a §10.1 gap line.
9. `restart` doesn't parse via the story-loader/bootstrap path (grammar rule exists; dungeo via CLI bundle restarts fine) — wiring difference, unresolved.
10. Ineffective attack (non-combatant, non-breakable) prints nothing at all, with or without `use combat`.
11. State-machine `when turning …` transition fires even when the turning action REFUSED — contradicts plugins-run-after-success.
12. Chord `pushable` composes only the button config — `heavy`/`moveable` pushTypes unreachable from a `.story` (parity gap, flagged in doc).
13. Dispatch-action `refuse without target` arm unreachable — grammar defines only `lower :target` (bare `lower` = parse error); likely also friendly-zoo `pet`/`feed`.
14. Inline `phrase` prose rejected (`analysis.missing-phrase`) inside story-header `on every turn` and machine `on enter` bodies but accepted in entity/region clauses and sequence steps — undocumented asymmetry.
15. Minor: engine banner reads "v0.9.43-beta.1" vs 3.2.0 lockstep; `again` after a successful `drop` refuses "You can't see any such thing."; `refuse <key> when <cond>` (wrong order) compiles silently as unconditional; §9's `is deadly while` fails at LOAD not compile (harness expect-fail can't pin it — quoted error in prose could go stale silently).

## Key decisions
- **Verification (David, this session)**: committed fixture harness for Phase 13 — supersedes the prose-draft-era Phase 9 prose-only ruling. Recorded in plan Phase 13.
- **Entry template (David, this session)**: pilot §2.1 shape approved for fan-out.
- **ADR-244 ACCEPTED (David, this session)**: website minimal-scroll IA — §N.M pages under chapter landings, sticky rail, accordion (only the active group/branch open), single nav model. `docs/architecture/adrs/adr-244-website-minimal-scroll-ia.md`; executed scope = website plan Phase 7a; guide/phrasebook/fernhill splits deferred there.

- **Minimal-scroll IA + sticky/accordion rail (David's post-review ruling, this session)**: stdlib split to one page per §N.M (40 entry pages + 11 chapter landings, split script cut at `## N.M` boundaries — fences wholesale, byte-safe); `nav.ts` `children` level (4-deep crumbs, pager walks entries); `site-shell.tsx` sticky header+rail, pathname-keyed accordion (only the active group opens; children only on the active branch). Recorded as website plan **Phase 7a** (COMPLETE for ruled scope; guide/phrasebook/fernhill splits PENDING follow-up). Build green **90 routes**; screenshots verified incl. scrolled-sticky proof.

## Status: DONE — stdlib Phase 13 COMPLETE (doc + site + IA rework, harness green). Uncommitted; awaiting David: (a) publish-or-hold ruling on §6.2's honest `found_concealed` garble, (b) the 15 platform issues above, (c) whether `rework/` intermediates get cleaned at commit, (d) finalize.
