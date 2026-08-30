# Session Summary: 2026-08-29 - feat/adr-321-world-index

## Goals
- Secret Letter port, Phase 6 (CURRENT): the escape-disguise increment — Teisha's chase-occasion tree and the TE20 trade (the port's first use of the ADR-329 acting statement), the dress and hat, the outfit change Behind Fruit Stall, the disguise window and boots identification, the ride-out death, the east exit. Authority: `change-document.md`, "The escape disguise" and its amendments; "Teisha's conversation".
- Content authority unchanged: structural work is Claude's; every line of prose is David's (PLACEHOLDERs where a line is needed); Gentry's lines carried where the change document says they survive.
- Mid-session pivot: the port needed a language construct it did not have (chapter titles/spine), producing ADR-330 "Chapters in Chord" — written, interviewed, reviewed, accepted, and implemented end to end in the same session.

## Phase Context
- **Plan**: `docs/work/secret-letter-port/plan.md` — "Port The Secret Letter (Textfyre, 2009) to Chord". `.current-plan` points here (confirmed).
- **Phase executed**: Phase 6 — "Chapter 1 vertical slice in `branch-stories/secret-letter/`" (P-5) (Large, 400-budget). Still **CURRENT** — not closed this session; this was a progress increment.
- **Side plan run to completion within this session**: `docs/work/adr-330-chapters/plan.md` (session-planner-authored, 5 phases) — ran DONE and archived to `docs/work/archive/adr-330-chapters/`; `.current-plan` returned to the port plan with a Resumed stamp (see plan.md's Superseded/Resumed chain, entries dated 2026-08-29).
- **Tool calls used**: not tracked — no `.session-state-*.json` exists for this stretch (prior session eec23b was finalized and retired mid-session; this work continued in the same conversation with no new session-state file).
- **Phase outcome**: Partially completed (Phase 6 itself) — the escape-disguise increment and chase rails landed; ADR-330's dependent sub-plan completed and closed within the same window.

## Completed

### Secret Letter — escape-disguise increment (Phase 6, second increment)
- New `disguise.chord`; Teisha's chase occasion with TE20 as the port's first ADR-329 acting statements; the outfit change Behind Fruit Stall; the ride-out and linger deaths; the boots beat; the east exit and Commerce Street. Tree: branch 3 rewritten, eleven new branches.
- `./sharpee test branch-stories/secret-letter` — 207 cards passing, 0 failing (18:20 CDT).
- Probed live through `./sharpee play` at every step (fourteen probe runs); each defect found was mine or the platform's, and each platform one is filed: #323, #324, #325, #326.
- Every new prose line is a PLACEHOLDER for David.

### Secret Letter — chase rails (Phase 6, third increment)
- `hunted` → `chase` at TE20 per the change document; `tent-escape`/`pole-escape`/`pole-problem`/`pole-destruction` timers on the player with Gentry's texts verbatim; clauses on the mercenaries' block; three placeholder exit refusals; five new tree branches.
- 246 cards passing, 355 assertions, 0 failing (19:05 CDT).

### ADR-330 "Chapters in Chord" — written, interviewed, accepted
- David's ruling: "chapters are events." Written from that ruling, interviewed one question at a time (8 questions). David's calls: extension not core; a `define chapters` block with name/title/description rather than one-liners (voiding the Roman-numeral rule); opening row mandatory ("100% compile error"); `during commerce` as the where-clause spelling; stale triggers ignored with a diagnostic; IDE Index deferred.
- Reviewed 19/19, ACCEPTED by David the same evening ("accept and start").

### ADR-330 implementation — all 5 phases, one session
- **Phase 1 (grammar)**: `define chapters` in `packages/chord` (ast/parser/analyzer/ir/manifest); registry name; EBNF; 17 tests. chord 1117 passing/73 files; story-loader 992/94.
- **Phase 2 (runtime)**: new package `@sharpee/ext-chapters` (plugin + `story.chapter` channel); loader lowering; registry `registerChannels` slot's first live use; workspace registration; real-path test on `GameEngine.executeTurn`. mutation-verification flagged two gaps (rogue-IR LoadError backstop; a stub registry) — both closed. story-loader 999→1002/95; `./repokit build dungeo` green; corpus identical.
- **Phase 3 (predicates)**: `during`/`before`/`after` atoms; `during` sugar at every `while` site; opener seeded current before turn 1 via loader + `chord.chapter.announced`. chord 1122/73, story-loader 1002/95 (Acceptance 7 real path).
- **Phase 4 (browser)**: title-card renderer for `story.chapter` (+CSS, tests; platform-browser 148/15); website grammar reference; grammar-changes rows.
- **Phase 5 (story)**: Secret Letter's `use chapters` + two-row block (David's titles verbatim); tree unchanged 246/355.
- Final corpus check: Dungeo chain 952/17, fernhill 36/40, ides 39/48, secret-letter 246/355 — byte-identical.
- Plan archived to `docs/work/archive/adr-330-chapters/`; `.current-plan` returned to the port plan with a Resumed stamp. ADR-330 marked **IMPLEMENTED 2026-08-29** with two at-implementation amendments (D4: no save-format bump, opener current before turn 1; D5: `during` at every `while` site).

- **Play-through after the push** (David: "Go ahead"): Chapter 1 end to end through `./sharpee play`. Finding: Behind Fruit Stall had a minted back door (`ne` from the Fruit Stall) — plain exits are bidirectional at load, `, one-way` reserved (GH #327); blocked story-side with a placeholder and pinned (247 cards / 357 assertions). `a boots (worn)` filed as GH #328. Uncommitted.

## Key Decisions

### 1. ADR-330 — Chapters in Chord
`docs/architecture/adrs/adr-330-chord-chapters.md`. A `use chapters` extension: one `define chapters` block (name / title / optional description / `begins when <event>`), triggers from the existing event vocabulary, `story.chapter` channel packet, `during`/`before`/`after <name>` predicates, `runtime.chapter-stale`. Written, interviewed (8 questions), reviewed 19/19, ACCEPTED, and IMPLEMENTED in the same session. Extension not core; a block form (not one-liners); opening row mandatory.

### 2. `chase` means "from TE20 on"
The change document had already ruled it; earlier hesitation in this session was wrong. Gates that must survive the transition name both states; the sweep's restart is the one gate that deliberately does not (until the boots).

### 3. The look is a state on Jack, not objects
`urchin` → `dressed` → `identified`, and CHANGE OUTFIT consumes the garments into it — direct reading of David's "clothing is the look, not objects" ruling. No garment is ever worn or taken off.

### 4. The sweep reads Jack only where the pair stands
`search`/`lunge`/`recovery` expiries carry `while the wandering mercenaries is here`. Forced by ADR-328 D3 plus the fact that authorial moves never fire `when the player moves`.

### 5. Deaths are keyed phrases, reactions not intercepts
Deaths are keyed phrases, not inline bodies (#324); reactions, not intercepts (a `kill` inside `on going` does not stop the move).

### 6. Rule 18b disposition — port plan stamped "still live"
David: "this is going to happen a lot and is the same pattern when we ported Dungeo to Sharpee." `.current-plan` moved to `docs/work/adr-330-chapters/plan.md` for the duration; returned afterward per rule 18b's Resumed convention.

## Next Phase
- **Phase 6 continues** (secret-letter-port plan) — still CURRENT. Not advanced to a numbered next phase this session.
- **Entry state for the remaining Phase 6 work**: David's PLACEHOLDER lines (below) need writing; the three chase exit refusals (tent south, base south, top down) still need authoring; platform issues #323–#326 remain open against the story content they were filed from.

## Open Items

### Short Term
- David's lines (all PLACEHOLDERs — grep `PLACEHOLDER` in `disguise.chord` / `npc-teisha.chord` / `aerial-runway.chord`): the dress and hat (names, descriptions), TE1 without the cloak, TE8/TE16/TE20 around a dress (and the perceiver line), the change, the four refusals (no dress / not here / already / not piece by piece), the boots beat, the two deaths, Commerce Street (description + "You made it." rework), the two east-exit refusals, the calm-walk answers to the five chase-only topics.
- Also David's to write, from the chase: the three chase exit refusals (tent south, base south, top down).
- Platform: #323 "to the Jack"; #324 kill-key collision; #325 `x me` detail; #326 `first time` on arrival; plus one unfiled wrinkle — inventory prints "a boots (worn)" when the boots are the only worn item.

### Long Term
- David's ruling on chapters processed and shipped (no longer open) — see Key Decisions #1.
- Nothing else long-term flagged this session beyond continuing Phase 6 to its exit state (Chapter 1 playable and test-covered end to end).

## Files Modified

**Secret Letter content** (8 files):
- `branch-stories/secret-letter/disguise.chord` (new) - escape-disguise structure
- `branch-stories/secret-letter/npc-teisha.chord` - chase occasion, TE20 acting statements
- `branch-stories/secret-letter/monkey.chord` - minor tie-in
- `branch-stories/secret-letter/aerial-runway.chord` - ride-out/east-exit additions
- `branch-stories/secret-letter/mercenaries.chord` - chase-rail clauses, timers
- `branch-stories/secret-letter/grubbers-market.chord` - supporting changes
- `branch-stories/secret-letter/secret-letter.story` - `use chapters` + two-row block
- `branch-stories/secret-letter/secret-letter.tests.json` - 246 cards / 355 assertions

**ADR-330 platform — grammar/runtime** (14 files + 1 new package):
- `packages/chord/{chord.ebnf,src/analyzer.ts,src/ast.ts,src/index.ts,src/ir.ts,src/manifests/index.ts,src/manifests/chapters.ts (new),src/parser.ts,tests/adr-330-chapters.test.ts (new),tests/language-version.test.ts}`
- `packages/extensions/chapters/` (new package — `@sharpee/ext-chapters`, plugin + `story.chapter` channel)
- `packages/story-loader/{package.json,src/evaluator.ts,src/extension-registry.ts,src/loader.ts,tests/adr-330-chapters.test.ts (new)}`
- `packages/platform-browser/{src/channels/index.ts,src/channels/info.ts,styles/base.css,tests/channels/prompt-status-info.test.ts}`

**Workspace/build config** (5 files):
- `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `ts-forge.config.json`, `tools/repokit/src/repo.ts`, `stories/dungeo/src/version.ts`

**Docs** (5 files + 1 new + 1 archived dir):
- `docs/architecture/adrs/adr-330-chord-chapters.md` (new — ACCEPTED then IMPLEMENTED)
- `docs/architecture/chord-grammar-changes.md`
- `docs/work/secret-letter-port/plan.md` (Phase 6 progress notes; Superseded/Resumed stamps)
- `docs/work/archive/adr-330-chapters/` (new — archived plan, 5 phases DONE)
- `website/src/app/chord/reference/grammar/content.mdx`
- `docs/context/session-20260829-1710-feat-adr-321-world-index.md` (this file)

**Total**: 31 modified + 8 untracked (2,211 insertions / 46 deletions across the 31 tracked-modified files per `git diff --stat`).

## Notes

**Session duration**: ~3h10m (17:10–20:20 CDT).

**Approach**: Content authoring against the accepted platform (structure only, David's prose as PLACEHOLDERs) interrupted mid-session by a genuine platform gap; per CLAUDE.md, the gap was raised as a discussion rather than worked around, resulting in ADR-330 — written, interviewed, reviewed, accepted, and fully implemented (grammar → runtime → predicates → browser rendering → story usage) before returning to the port. No session-state file exists for this stretch (prior session eec23b was finalized and retired mid-conversation), so tool-call counts and hook-tracked file lists are unavailable; the file list above comes from `git status --short` and `git diff --stat` directly.

---

## Session Metadata

- **Status**: COMPLETE (unverified: test/build pass counts — chord/story-loader/platform-browser suite totals and the Secret Letter tree-document card/assertion counts are reported by the session's narrative with no corroborating event-log row or fresh run performed by this writer)
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Phase 6 continues; no incomplete-work estimate given this session)
- **Rollback Safety**: safe to revert — nothing committed yet; `commit-local` runs after this summary

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-329 acting-statement primitive (used for TE20, first story-level use); ADR-328's guidance on authorial-move event firing (Key Decision #4); fernhill-style extension registration pattern for `@sharpee/ext-chapters`.
- **Prerequisites discovered**: the port needed a chapter/title-spine language construct that did not exist — surfaced mid-session, resolved via ADR-330 rather than a workaround, per CLAUDE.md's platform-change discussion requirement.

## Architectural Decisions

- **ADR-330 — Chapters in Chord**: written this session, interviewed (8 questions), reviewed 19/19, ACCEPTED, and IMPLEMENTED same-day across 5 phases. Two at-implementation amendments: D4 (no save-format bump — chapter state is world state; opener seeded current before turn 1), D5 (`during` sugar applies at every `while` site, not just a subset).
- Pattern applied: capability/extension registration (`registerChannels` slot's first live use) rather than a core-language addition — matches the existing extension architecture (fernhill-style `use <extension>`).
- Rule 18b disposition applied twice this session for the same plan: "still live" stamp when `.current-plan` moved to the ADR-330 sub-plan, then a Resumed stamp when it returned — both recorded in `docs/work/secret-letter-port/plan.md`'s Superseded/Resumed chain.

## Mutation Audit

- Files with state-changing logic modified: `packages/extensions/chapters/src/chapters-plugin.ts` (writes `chord.chapter.current` / `chord.chapter.fired.*` / `chord.chapter.announced` world-state keys), `packages/story-loader/src/loader.ts` `finalizeRoleHolder` (seeds the opener's current chapter before turn 1).
- Tests verify actual state mutations (not just events): YES (evidence: real-path suite `packages/story-loader/tests/adr-330-chapters.test.ts` drives `GameEngine.executeTurn` and reads world state directly for `chord.chapter.current`/`.fired.*`/`.announced`; story-loader test run reported 1002 passing / 95 files after Phase 3 landed, 2026-08-29). `mutation-verification` ran during Phase 2 and flagged two gaps (a rogue-IR LoadError backstop, a stub registry) — both closed before the phase was called done.
- Rule 15 (post-edit mutation-verification trigger) does not fire on the Chord story files themselves (`.chord`/`.story` are not source files with side-effect function names per the rule's own carve-out) — the agent run this session was against the platform TypeScript changes only.

## Recurrence Check

- Similar to past issue? YES — the mid-port-needs-a-platform-primitive pattern recurs across this plan's history: ADR-325 issues #305–#310 (plural possessive, places, timers, player-move events, region landing, tallies) landed the same way during Phase 6 (sessions 02e57b, 5ec4d0 per `docs/work/secret-letter-port/plan.md` progress notes, 2026-08-23). ADR-330 is the same class of event: port content exposes a genuine language gap, which is raised as a discussion and resolved as a platform ADR rather than worked around in story code.
- Consider one-time audit: not warranted yet — each occurrence so far has been resolved cleanly through the discuss-then-ADR path CLAUDE.md prescribes; this is the intended pattern operating as designed, not a defect to fix.

## Test Coverage Delta

- Tests added: chord +5 (1117→1122), story-loader +10 net across phases (992→1002), platform-browser +15 files' worth of new/changed assertions (148 passing total), Secret Letter tree +139 cards / +177 assertions (207→246 cards across the two content increments; final 246 cards/355 assertions).
- Tests passing before: chord 1117/73 files, story-loader 992/94 files → after: chord 1122/73 files, story-loader 1002/95 files, platform-browser 148/15 files, Secret Letter 246 cards/355 assertions, 0 failing (evidence: `[reported by session, unverified]` — these counts come from the session's own narrative; no session-event-log or fresh command run was performed by this summary-writer to corroborate them, and no `.devarch-events-*.jsonl` exists for this session-state-less stretch).
- Known untested areas: the three chase exit refusals (tent south, base south, top down) are unauthored; David's PLACEHOLDER lines carry no content-level assertions beyond structural card pins; the "boots (worn)" inventory-string wrinkle is unfiled and untested.

---

**Progressive update**: Session completed 2026-08-29 20:20 CDT
