# Session Summary: 2026-07-03 (late morning) - v2_familyzoo_split (book-v2-edition Phase 3)

## Goals
- Execute Phase 3 of `docs/work/book-v2-edition/plan.md`: ch15 Capability Dispatch
  ADR-207 focused edit (move from the deleted free-function API to the `world.*`
  method surface).

## Completed
- **ch15 ADR-207 edit** (`docs/book/v2.0.0/parts/part-4/15-capability-dispatch.md`),
  all seven change-list findings:
  - Import block trimmed to surviving symbols (`registerCapabilityBehavior`,
    `hasCapabilityBehavior`, `getBehaviorForCapability` removed; only
    `findTraitWithCapability` survives as a free helper).
  - Guarded registration replaced with bare `world.registerCapabilityBehavior(...)`
    plus per-world/idempotent prose lifted from the tutorial's teaching comment
    (`ch15-capability-dispatch.ts:597-604`).
  - Dispatch `validate()` now calls `context.world.getBehaviorForCapability(...)`.
  - "How it fits together" trace shows the world-method resolution.
  - Key takeaway: registration is per world, in `initializeWorld`.
  - "Mistake everyone makes once" aside: each world's registry, later registration
    overwrites the earlier one.
  - `createCapabilityDispatchAction()` aside: recommendation dropped, fully-qualified
    messageId rule added (2026-07-02 P1 decision in `packages/stdlib/CLAUDE.md`).
- **NEW: voice constraints from David** (mid-phase interrupt): book prose must match
  the v1.5 voice — no em-dashes in prose, complete sentences, no "lost meaning"
  paragraphs. Saved to auto-memory (`book-voice-rules.md`); added a VOICE CONSTRAINTS
  block to the plan.
- **Voice fixes applied now** (my own recent additions): ch15 x3 passages, ch14 x1
  sentence, ch18 x2 sentences — all now 0 em-dashes, complete sentences.
- **Plan amended**: Phase 3 -> DONE; new gated **Phase 3.5** added — voice-conformance
  pass over the Phase 1 ch19 rewrite (36 em-dashes + fragment/lost-meaning read).
  David ruled the appendices exempt from the voice/style rules, so Appendix E's 85
  pre-existing em-dashes need no sweep.

## Key Decisions
- Voice-rule attribution audit (grep vs commit `44f1cb3d`, pre-plan): all prose
  em-dash deviations from the v1.5 baseline are Phase 1/3 additions (ch19 36,
  ch18 4, ch15 4, ch14 1); every other file's count is pre-existing part headings
  or untouched generated appendices. v1.5 whole-book prose baseline: zero
  (its only 8 are "Volume N — Title" part headings).
- ch19 remediation is a distinct gated phase (3.5), not folded into Phase 3, since
  it reworks committed Phase 1 output and needs a careful full-chapter read, with
  the constraint that all verified templates/outputs stay byte-identical.

## Verification
- Grep: 0 em-dashes in ch15/ch14/ch18; no `hasCapabilityBehavior` /free-function
  forms anywhere in ch15 (all remaining mentions are `world.*` methods).
- Import symbols verified against `packages/world-model/dist` root barrel
  (`capabilities/index.d.ts`) and `WorldModel.d.ts` (both world methods exist).
- Snippets re-extracted from `docs/book/v2.0.0/` — exactly the 3 edited ch15 code
  blocks changed (+ CATALOG.md).
- `./scripts/build-book.sh v2.0.0 html`: clean; built HTML contains
  `world.registerCapabilityBehavior`, zero `hasCapabilityBehavior`.

## Files Modified
- `docs/book/v2.0.0/parts/part-4/15-capability-dispatch.md` — ADR-207 edit + voice
- `docs/book/v2.0.0/parts/part-4/14-custom-actions.md` — voice (1 sentence)
- `docs/book/v2.0.0/parts/part-5/18-the-language-layer.md` — voice (2 sentences)
- `docs/book/v2.0.0/code-snippets/ch15-capability-dispatch/*` + `CATALOG.md` — re-extracted
- `docs/work/book-v2-edition/plan.md` — VOICE CONSTRAINTS block, Phase 3 DONE,
  new Phase 3.5 (CURRENT, gated)

# Phase 3.5 (same session, go-ahead: "phase 3.5"): ch19 Voice-Conformance Pass

## Completed (Phase 3.5)
- ch19 (`19-the-phrase-algebra.md`): 35 of 36 em-dashes rewritten as commas,
  parentheses, colons, or new sentences. The one survivor is inside the quoted
  `PhraseParseError` message, which is the parser's literal text (verified against
  `packages/lang-en-us/src/parser/parse-phrase-template.ts:353`); the chapter now
  notes the dash is the parser's own.
- Fragment fixes for the complete-sentences rule: "is it a proper name? a mass
  noun? a plural?" joined into one question; the dangling "with the template ..."
  continuation after the Optional code block made a full sentence ("The matching
  template is ...").
- Two code comments in the nested-params block switched from dash to colon
  (CORRECT:/WRONG:); the only fenced-content change in the chapter.

## Verification (Phase 3.5)
- Phase 1's render harness re-run (survived in the prior session's scratchpad):
  all templates parse, all 4 documented-rejected forms throw with the exact quoted
  messages, all 8 quoted outputs render byte-exact. ALL CHECKS PASSED.
- Snippets re-extracted: only `ch19-the-phrase-algebra/05-where-the-parameters-go-*`
  changed (the two comments), plus ch15 snippet drift from Phase 3 (uncommitted).
- `./scripts/build-book.sh v2.0.0 html`: clean. ch19 grep: 1 em-dash (the parser
  quote); all other prose chapters at 0 beyond pre-existing part headings.

# Phase 4 (same session, go-ahead: "phase 4"): Book-Wide Sweeps

## Completed (Phase 4)
- **Path sweep** (3 hits, grep-verified 0 remaining): 02-how-to-read prose + URL,
  ch28 link text + URL, all now `tutorials/familyzoo/v2.0.0/src/`.
- **Naming sweep**: 02-how-to-read `v01`/`v02` claim rewritten to chapter-named
  cumulative snapshots (`ch02-first-room.ts`, `ch04-navigation.ts`); ch24 "v18" and
  ch27 "v18" x2 -> `ch24-27-presentation/` snapshot; ch28 "By version 17" ->
  `ch23-scoring.ts` (the last single-file snapshot) and "Version 17 isn't only a
  reorganization" -> `ch28-multi-file/`; ch30 "v17" x2 (beyond the change list; the
  exit criterion is book-wide) -> `ch28-multi-file/`, verified to hold the
  behavior-swap daemon (`events.ts`/`index.ts` grep). Only remaining version-pattern
  hit is ch1's `node --version # want v18.0.0` (Node.js, legitimate).
- **Adjacent fix**: ch28 "four custom actions" -> "three" (every snapshot defines
  exactly feed/photograph/petting; verified by ACTION_ID grep across ch23/ch24-27/ch28
  snapshots).
- **ADR-158 article sweep**: ch5 "The iron fence is fixed in place." x2 + zoo-map
  POLISH ("The zoo map is fixed in place.", folded in since no later phase owns it);
  ch6 "You put the zoo map in the backpack." / "You put the souvenir penny on the
  park bench." — wording matched byte-for-byte against the regenerated Appendix D
  putting/fixed_in_place templates.

## Verification (Phase 4)
- Source + built-HTML greps: 0 unqualified `tutorials/familyzoo/src`, 0
  `v0d/v1[0-8]`-style refs (minus Node), new quoted outputs present in built HTML.
- Voice rules held: 0 new em-dashes (remaining ones in swept files are pre-existing
  "Volume N — Title"/"Appendix A — Architecture Map" title forms).
- Snippets: no drift from Phase 4 (ch5/ch6 transcript blocks are non-code blocks).
- `./scripts/build-book.sh v2.0.0 html`: clean.
- **FLAG for Phase 7**: corrected GitHub links
  (`tree/main/tutorials/familyzoo/v2.0.0/...`) 404 today — GitHub `main` still has
  the pre-split layout (verified via `gh api`); they resolve once
  `v2_familyzoo_split` merges. Correct for the published state; not a book defect.

# Phase 5 (same session, go-ahead: "proceed"): Single-Chapter Fixes

## Completed (Phase 5)
- **ch23**: daemon-priority inversion fixed in prose, snippet comment, callout, and
  takeaway. Verified against `plugin-scheduler/src/scheduler-service.ts:214,313`
  (highest priority runs first). Callout reframed: the stale-score worry is moot
  because scoring happens during command processing, before the scheduler tick;
  priority only orders daemons among themselves. **Companion story-level fix**:
  `tutorials/familyzoo/v2.0.0/src/ch23-scoring.ts:452` comment corrected
  (comment-only change, no behavior).
- **ch25**: boot snippet now imports STORY_VERSION/ENGINE_VERSION/BUILD_DATE from
  `./version.js` (byte-matched to the devkit scaffold template); "build --browser
  generates the entry point" corrected to init-browser-once/build-regenerates-host-
  page with the missing-entry error noted; registerDefaultBrowserRenderers scoped
  to static media channels with an ambient:* cross-ref to ch27.
- **ch27**: `ambient:*` no longer presented as a platform default (intro + table);
  added the two story-side registration lines after the room-atmosphere walkthrough
  (engine: `registry.add(createAmbientChannel('environment'))` in
  Story.registerChannels; browser: `createAmbientChannelRenderer(...)`), lifted from
  `ch24-27-presentation/presentation.ts` and `browser-entry.ts`, with the
  silence-either-way failure mode spelled out.
- **ch29**: takeaway's nonexistent `--chain` claim corrected to `sharpee build
  --test` auto-chaining `wt-*`; `entry:` header documented (verified: tutorial
  transcripts carry `entry: ch13...ch23` headers); `##` claim softened (any `#`
  line is a comment).
- **ch9**: BROKEN `event.data` access fixed with the change list's exact cast plus
  one explaining sentence; `world.rooms.inRegion` advisory now shows the required
  side-effect `import '@sharpee/queries';`.
- **ch3**: `messageId` fixed to `if.action.taking.taken` (verified present in
  regenerated Appendix D); "nothing subscribes to events" softened (records first,
  world can react via ch13's `world.registerEventHandler`).
- **ch20**: dead `npcName` dropped from both data examples (matches canonical
  `ch20-npcs.ts:383,387`, which pass `{ text }` only).
- **ch14**: `sharedData` "sanctioned way" softened; @deprecated /
  `ValidationResult.data` note added (verified at
  `stdlib/src/actions/enhanced-types.ts:276`).

## Verification (Phase 5)
- Stale-pattern grep across all eight chapters: 0 hits for npcName / "run last" /
  `--chain` / taken.success / "sanctioned".
- Voice rules held: 0 new em-dashes in edited prose.
- Snippets re-extracted: 148 (+1, the new ch27 registration block); html build
  clean; built HTML spot-checked (runs-first comment present, npcName absent,
  createAmbientChannel present).

# Phase 6 (same session, go-ahead: "continue"): Polish Batch

## Completed (Phase 6)
- **ch1**: CLI table gains `sharpee register <location> [--name]` and `sharpee list`
  (table now matches `devkit/src/cli.ts` USAGE exactly, 8 commands); file tree gains
  `.gitignore` (init.ts writes node_modules/dist/logs ignores).
- **ch24**: channels table gains the `lifecycle` event-mode row (save/restore
  outcome signals; verified in `stdlib/src/channels/standard.ts`).
- **ch26**: platform-vocabulary table marked as an excerpt; full `PLATFORM_VOCABULARY`
  families enumerated (u/st/super/sub, direction, quote, color-*/bgcolor-*, size-*,
  font-mono, layout macros br/p/indent/center/right) with the
  name-collision-gets-prefixed warning.
- **ch30**: added the optional sentence — save/restore/undo prose renders from
  `platform.*` messages, re-voiceable via same-id `addMessage` (ids verified in
  regenerated Appendix D).
- **Appendix A**: world-model row gains the per-world capability-behavior and
  action-interceptor registries clause (ADR-207/208), and the finding's second
  clause was caught on cross-check — stdlib row now reads "capability dispatch
  (consulting the world's registries)".

## Verification (Phase 6)
- **Executive-summary cross-check**: every row of the change list's summary table
  and every by-chapter finding is now resolved by Phases 1-6 (ch31 and Appendices
  B/C/E verified CLEAN in the list, untouched).
- Voice rules held (0 new em-dashes; remaining are part headings).
- `./scripts/build-book.sh v2.0.0 all` clean: html (856K) + epub (242K) + pdf (986K).

## Session Metadata
- **Status**: DONE — Phases 3 through 6 complete; the staleness change list is fully
  resolved. Uncommitted. Phase 7 (naive-execution dry-run gate) is CURRENT, gated on
  go-ahead; note its Phase 8 scoping decision is David's.
- **Blocker**: N/A
- **Rollback Safety**: docs + two comment/string-level tutorial edits; reverts
  cleanly.
