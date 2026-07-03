# Session Plan: Book v2.0.0 Edition Update (staleness repair + naive-executor handoff gate)

**Created**: 2026-07-03
**Overall scope**: Bring `docs/book/v2.0.0/` ("The Sharpee Author and Developer Manual,
v2.0 — Phrase Algebra edition") up to date with the current 2.1.0 platform, per the
completed staleness review in `docs/work/book/change-list-v2.0.0-20260702.md`, and add a
new acceptance gate: the book must survive a **naive Claude in a Docker container**
following it literally — installing published `@sharpee/*@2.1.0`, typing the code from
each chapter, running the "Try it" transcripts — with no repo context and no fix-its.
**Bounded contexts touched**: N/A — this is docs-only editorial/tooling work (per
CLAUDE.md's DDD guidance, documentation-only sessions skip domain-driven decomposition).
Two companion code fixes touch `tutorials/familyzoo/v2.0.0/src/` (story-level, not
`packages/`), which CLAUDE.md classifies as autonomous.
**Key domain language**: N/A (DDD does not apply). Central technical vocabulary this plan
operates in: **Phrase Algebra** (ADR-192…206, the ch19 rewrite's subject), **Capability
Dispatch** (ADR-090/207, ch15's subject), **staleness finding** (a change-list entry,
severity BROKEN/WRONG/OUTDATED/POLISH), **completeness defect** (the separate,
independently-tracked "elided code" defect class from the 2026-06-22 audit), and the
**naive-executor gate** (this plan's new acceptance bar, defined below).

**GATE (session-planner discipline)**: this is a plan only. Do not begin Phase 1 without
David's explicit go-ahead, per the standing DevArch rule ("never proceed from planning to
implementation without explicit user permission") — even though book edits are docs-only
and do not trip CLAUDE.md's `packages/` platform-change gate.

**Decision needed from David before/at Phase 7** (flagged, not resolved by this plan —
see Phase 7/Phase 8 below): how to scope the known completeness-audit findings
(`docs/book/v2.0.0/testing/2026-06-22-completeness-audit-full-book.md` — elided imports,
missing enclosing frames, dangling "Try it" commands, missing `extendLanguage`
registrations) relative to the new naive-executor gate. Recommendation included; final
call is David's.

## References consulted
- `docs/work/book/change-list-v2.0.0-20260702.md` — the complete, source-verified
  staleness finding list (36 chapters + 5 appendices) and its "Suggested execution order"
  (§ near end of file), which Phases 1–6 below follow directly. Findings are cited by
  chapter/section anchor here, not restated.
- `docs/book/v2.0.0/testing/2026-06-22-completeness-audit-full-book.md` — a *separate*,
  independently-tracked defect class (chapters teach by excerpt, elide required code) that
  the change-list explicitly marks "related but out of scope" for staleness. This is
  exactly the defect class a naive literal-follower trips on; positioned against the new
  gate in Phase 7/8 below rather than silently folded into the staleness phases.
- `docs/reference/phrase-algebra-primer.md` — canonical source for the ch19 rewrite and
  ch18 fixes (15 sections: data model, template grammar, atom/combinator catalog per
  ADR-193…200, the Assembler, emission pipeline, ADR-202 Structural Realization Mandate,
  ADR-201/203 dialogue, decoration layer, determinism, authoring cookbook, failure modes,
  a worked case study, and the ADR-192…206 index).
- `docs/architecture/adrs/adr-207-capability-registry-engine-owned.md` — Status: ACCEPTED,
  IMPLEMENTED 2026-07-02. Governs ch15's rewrite: bindings are per-`WorldModel`,
  registered bare (no guard) in `initializeWorld`; free functions
  (`registerCapabilityBehavior`, `hasCapabilityBehavior`, `getBehaviorForCapability`, …)
  are deleted from `@sharpee/world-model`. Consequences section: "Authors stop reasoning
  about process state. Register once, no guards, no throws."
- `docs/architecture/adrs/adr-208-interceptor-registry-engine-owned.md` — Status:
  ACCEPTED, IMPLEMENTED 2026-07-02. Same per-world/idempotent/no-guard registration model
  applied to action interceptors; confirms "one registration model across the platform"
  language ch15's rewritten prose should echo (not contradict) even though ch15 itself
  only teaches capability dispatch.
- `packages/stdlib/CLAUDE.md` — ADR-207 registration pattern (world-instance
  `initializeWorld` registration) and ADR-208 interceptor registration note; the
  fully-qualified capability-effect messageId rule (2026-07-02 decision) that both ch15
  and the Appendix D regeneration must reflect.
- `docs/context/project-profile.md` — confirms TypeScript strict-mode conventions and
  pnpm workspace structure; the book's code snippets must compile under the same
  `strict`/`noImplicitAny` tsconfig a real author's scaffolded project uses.
- `docs/context/session-20260702-1956-v2_familyzoo_split.md` (most recent session) — Open
  Items explicitly names "familyzoo book v2.0.0 prose updates for the per-world capability
  API" as carried work (this plan is that work). Also records the **published-package
  registry-install precedent** this plan's Phase 7 reuses: "RESOLVED (2026-07-03): David
  published lockstep 2.1.0 to npm... fresh familyzoo v2.0.0 installed purely from the
  registry (`^2.0.0` → 2.1.0) passes 197/197 incl. v16 75/75 — AC-6 on the true published
  path." Confirms plain `npm install` now resolves 2.1.0 with no overlay/tarball tricks
  needed.
- `tutorials/familyzoo/v2.0.0/src/ch15-capability-dispatch.ts` — canonical rewritten
  teaching-comment prose for ch15's ADR-207 edit (confirmed present, 39,617 bytes,
  2026-07-02).
- `tutorials/familyzoo/v2.0.0/src/ch23-scoring.ts` — confirmed the inverted
  daemon-priority comment at line ~453 ("Run last, after all other daemons" on a
  `priority: 100` daemon that the scheduler actually runs *first*) — the companion code
  fix Phase 5 must also apply.
- `docs/book/v2.0.0/book.yaml` — pandoc chapter-order manifest; confirms Appendices A–E
  are each tagged "(generated)" and gives the exact input-file paths every phase below
  edits.
- `scripts/build-book.sh` — the pandoc build entry point (`build-book.sh v2.0.0 html`);
  every content phase's exit criteria includes a pandoc-compatibility build check.
- `scripts/extract-book-snippets.cjs` and `docs/book/v2.0.0/code-snippets/` — an existing
  per-chapter code-snippet extraction tool (author vs. under-the-hood/reference snippets,
  already run for most chapters). Phase 7's naive-execution dry run reuses this rather
  than writing a new extractor.
- Git history for `docs/book/v2.0.0/backmatter/appendix-d-message-reference.md` — a single
  commit (`6249e763`) added Appendices A–D with **no committed generator script**; the
  808-messages/82-groups catalog was hand/agent-produced by reading the language provider
  directly. Phase 2 confirms no generator exists in `scripts/` and plans accordingly
  (either locate an uncommitted method or write a small extraction pass over
  `packages/lang-en-us/src/`).

## Phases

### Phase 1: Chapter 19 Full Rewrite ("The Formatter Chain" → Phrase Algebra) + Chapter 18 Fixes
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: Part V (Words) — the one design-heavy phase. ch19 is a title-and-content
  full rewrite (its entire subject, the formatter chain, was deleted by ADR-192…206); ch18
  gets two fixes in the same pass since both chapters share the phrase-algebra vocabulary
  and a stale ch18→ch19 forward-reference.
- **Entry state**: `docs/book/v2.0.0/parts/part-5/19-the-formatter-chain.md` still teaches
  colon-chain formatters that throw `PhraseParseError` under the current platform;
  `docs/reference/phrase-algebra-primer.md` and ADR-192…206 are the authoritative source;
  no other phase has touched Part V yet.
- **Deliverable**: resolve every finding under change-list "Part 5" for ch18 and ch19
  (BROKEN/OUTDATED/WRONG/GAP items enumerated there — cite, don't restate), specifically:
  - ch19: full rewrite (title included) covering the primer's atom/combinator catalog
    (NounPhrase space-hints, Contents, Slot, Optional, Choice, Pronoun, Numeral, Verb,
    Verbatim), the Assembler, ADR-206 nested-`params`, and loud synchronous parse errors —
    grounded in `docs/reference/phrase-algebra-primer.md` §§3–7 and §11 (authoring
    cookbook) for worked examples.
  - ch18: fix the "Parameters" quoted-output claim and the dead "formatter chain"
    forward-reference to point at ch19's new title/terminology.
  - Cross-check `tutorials/familyzoo/v2.0.0/src/ch18*.ts` / `ch19*.ts` snapshots (if
    present under `docs/book/v2.0.0/code-snippets/ch18-*` / `ch19-*`) for any snippet this
    rewrite should match verbatim.
  - Update `docs/book/v2.0.0/code-snippets/ch19-*` by re-running
    `node scripts/extract-book-snippets.cjs` (or the book build's snippets target) after
    the rewrite, so the extraction stays in sync for Phase 7's dry run.
- **Exit state**: every code block in ch18/ch19 parses against the current
  `PhraseParseError`-throwing grammar (no colon-chain formatter forms remain anywhere in
  either chapter); `scripts/build-book.sh v2.0.0 html` renders both chapters clean
  (pandoc-compatible fenced divs, headings); ch19's title and terminology are consistent
  with ch18's forward-reference. **Naive-executable**: every phrase-template snippet shown
  is one a reader could type verbatim into a story file and have it parse/render under
  published `@sharpee/*@2.1.0` — no leftover pre-phrase-algebra syntax anywhere in either
  file.
- **Affected files**: `docs/book/v2.0.0/parts/part-5/19-the-formatter-chain.md` (rewrite,
  likely rename to reflect new title — update `book.yaml`'s `input-files` entry and any
  cross-chapter links if the filename changes), `docs/book/v2.0.0/parts/part-5/18-the-language-layer.md`,
  `docs/book/v2.0.0/book.yaml` (if filename changes), `docs/book/v2.0.0/code-snippets/ch18-*`,
  `docs/book/v2.0.0/code-snippets/ch19-*`.
- **Status**: DONE (2026-07-03 — ch19 rewritten as `19-the-phrase-algebra.md`, ch18 fixed,
  companion `{the target}` edits in ch14 + `tutorials/familyzoo/v2.0.0/src/ch20-npcs.ts:672`,
  rename-fallout terminology fixes in ch3/ch26/appendix-a; all templates parse+render
  verified against the real grammar/Assembler; html build clean; snippets re-extracted)

### Phase 2: Appendix D Regeneration (Message-ID Reference)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Backmatter — a tooling pass, not hand-editing. Regenerate from the
  current `@sharpee/lang-en-us` language provider rather than patch the stale table
  in-place (per change-list "REGENERATE, don't hand-edit" instruction).
- **Entry state**: `docs/book/v2.0.0/backmatter/appendix-d-message-reference.md` (69,857
  bytes) uses pre-phrase-algebra colon-formatter templates throughout, stale help-key
  names, and is missing the `about.success`/`platform.*`/`nothing_to_take` groups (see
  change-list "Appendices → D"). Confirmed: no generator script exists anywhere in
  `scripts/` or elsewhere in the repo — the original (commit `6249e763`) was produced by
  reading the language provider directly, with no committed tooling.
- **Deliverable**:
  - Locate or write the extraction method: walk `packages/lang-en-us/src/` (message
    catalogs, `platform-messages.ts`, `actions/help.ts`, `actions/about.ts`, and any
    others registering message IDs) and produce the same `## \`group\` {.unnumbered
    .unlisted}` / `| Message ID | Default text |` table structure as the existing
    appendix, so pandoc rendering and the "82 headings suppressed from TOC" convention
    (commit `566580fe`) are preserved.
  - If a one-off extraction script is written to do this, keep it in `scripts/` (name it
    something like `generate-appendix-d.cjs`) rather than a scratch/throwaway file, since
    the message catalog will drift again and this is exactly the kind of regeneration this
    phase is establishing as repeatable.
  - Regenerated content must reflect: current phrase-algebra templates (`{the item}`,
    `{capitalize the item}`, `{verb:is item}`, `{verbatim:…}`), renamed help keys
    (`if.action.help.general`/`.first_time`/`.topic`), the `if.action.about.success` key,
    the `platform.*` outcome-message group, `if.action.taking.nothing_to_take`, and an
    accurate header count (not the stale "808 messages in 82 groups").
- **Exit state**: Appendix D's message/template count matches a live enumeration of
  `@sharpee/lang-en-us`'s registered messages exactly (spot-check a sample against
  `packages/lang-en-us/src/` source, not just the old table); `scripts/build-book.sh
  v2.0.0 html` renders the appendix with TOC suppression intact. **Naive-executable**: an
  author overriding any message ID printed in this appendix via `extendMessage`/`extendLanguage`
  gets the exact ID the platform actually emits — no renamed/legacy keys.
- **Affected files**: `docs/book/v2.0.0/backmatter/appendix-d-message-reference.md`,
  possibly a new `scripts/generate-appendix-d.cjs`.
- **Status**: DONE (2026-07-03 — new `scripts/generate-appendix-d.cjs` enumerates the live
  provider's `getAllMessages()`; appendix regenerated: 821 messages / 84 groups; ID-set
  diff vs old table is exactly the change-list findings (3 renamed help keys out, 16 in:
  help renames, about.success, nothing_to_take, platform.*, npc.*, room.description_body);
  html build clean, TOC suppression intact, zero legacy colon templates / npcName)

### Phase 3: Chapter 15 Capability Dispatch — ADR-207 Focused Edit
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: Part IV — a focused edit, not a rewrite. Registration *placement* in
  the existing chapter (end of `initializeWorld`) is already right per the change-list;
  only the *content* of the import block, registration snippet, and prose needs to move
  from the deleted free-function API to the `world.*` method surface.
- **Entry state**: `docs/book/v2.0.0/parts/part-4/15-capability-dispatch.md` imports and
  demonstrates `registerCapabilityBehavior`/`hasCapabilityBehavior`/`getBehaviorForCapability`
  as free functions (deleted by ADR-207); `tutorials/familyzoo/v2.0.0/src/ch15-capability-dispatch.ts`
  holds the canonical rewritten teaching-comment prose to lift from (confirmed present).
- **Deliverable**: resolve every change-list "Part 4 → ch15" finding (cite, don't
  restate) — the import block, the guarded-registration snippet and its "guard it so it
  only registers once" prose, the `validate()` dispatch call, the "how it fits together"
  trace, the "key takeaway" line, the "mistake everyone makes once" aside, and the
  "worth knowing" `createCapabilityDispatchAction()` recommendation (demote to an aside,
  add the fully-qualified-messageId sentence per the 2026-07-02 P1 decision in
  `packages/stdlib/CLAUDE.md`) — all rewritten from `ch15-capability-dispatch.ts`'s
  teaching comments, not invented fresh.
- **Exit state**: every snippet in ch15 imports only symbols that still exist in
  `@sharpee/world-model` (`CapabilityBehavior`, `CapabilityValidationResult`,
  `CapabilitySharedData`, `CapabilityEffect`, `createEffect`, `findTraitWithCapability`,
  `ITrait`, `IFEntity`); no `hasCapabilityBehavior` guard remains anywhere in the chapter.
  **Naive-executable**: a reader typing ch15's registration snippet verbatim into
  `initializeWorld` compiles and dispatches correctly against published `@sharpee/*@2.1.0`
  with zero guard code, matching the tutorial's actual `ch15-capability-dispatch.ts`.
- **Affected files**: `docs/book/v2.0.0/parts/part-4/15-capability-dispatch.md`.
- **Status**: CURRENT (gated on go-ahead)

### Phase 4: Book-Wide Sweeps (tutorial-split paths, chapter-snapshot naming, ADR-158 article quotes)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: three mechanical, cross-cutting find/fix passes over the whole book,
  per change-list "Cross-cutting themes" 3 and 4.
- **Entry state**: Phases 1–3 complete (so this sweep doesn't collide with ch15/18/19's
  content edits, which touch different prose in the same cross-cutting areas). Several
  chapters still reference the pre-split `tutorials/familyzoo/src/` path/GitHub URLs,
  `v01`/`v02`-style version naming, or pre-ADR-158 article-less action output.
- **Deliverable**: three sweeps, each grep-verified across the full book tree before and
  after:
  1. **Path sweep**: `tutorials/familyzoo/src/` → `tutorials/familyzoo/v2.0.0/src/` in
     every prose reference and GitHub link — `docs/book/v2.0.0/frontmatter/02-how-to-read.md`
     (also fixes its `v01`/`v02` naming claim, folded into sweep 2 below), ch24, ch27,
     ch28 (the BROKEN 404 link).
  2. **Naming sweep**: `v01`–`v18`-style version references → chapter-snapshot names
     (`chNN-*.ts`) — frontmatter/02-how-to-read, ch24 ("Family Zoo v18 ships exactly
     this"), ch27, ch28 ("version 17").
  3. **ADR-158 article sweep**: pre-article-rendering quoted transcript output → current
     article-carrying form — ch5 (×2 quoted outputs), ch6 (×2 `put X in/on Y` transcript
     lines). (ch18's article finding was already resolved in Phase 1, not repeated here.)
  - Run `scripts/build-book.sh v2.0.0 html` once after all three sweeps to catch any
    broken link/anchor introduced by the edits.
- **Exit state**: zero remaining hits for `tutorials/familyzoo/src/` (unqualified,
  without `v2.0.0/`) and zero remaining `v0\d|v1[0-8]`-style version-naming references
  anywhere under `docs/book/v2.0.0/`; ch5/ch6's quoted transcript outputs match current
  ADR-158 article-carrying rendering. **Naive-executable**: every GitHub link in the swept
  chapters resolves (no 404s from the pre-split path), and every quoted "Try it" output in
  ch5/ch6 matches what `@sharpee/*@2.1.0` actually prints.
- **Affected files**: `docs/book/v2.0.0/frontmatter/02-how-to-read.md`,
  `docs/book/v2.0.0/parts/part-2/05-scenery-and-portable-objects.md`,
  `docs/book/v2.0.0/parts/part-2/06-containers-and-supporters.md`,
  `docs/book/v2.0.0/parts/part-7/24-channels.md`,
  `docs/book/v2.0.0/parts/part-7/27-media-and-audio.md`,
  `docs/book/v2.0.0/parts/part-8/28-the-multi-file-story.md`.
- **Status**: PENDING

### Phase 5: Single-Chapter Fixes (ch23 priority inversion + companion fix, ch25, ch27, ch29, ch9, ch3, ch20, ch14)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: independent, chapter-scoped fixes with no cross-chapter dependency on
  each other — safe to do in any order within this phase. Includes the one
  **story-level** (not `packages/`) companion code fix, which CLAUDE.md classifies as
  autonomous.
- **Entry state**: Phases 1–4 complete (so book-wide terminology/paths/naming are already
  settled before these chapter-specific factual fixes land).
- **Deliverable**: resolve each change-list finding by chapter (cite, don't restate):
  - **ch23** (Part 6): the daemon-priority semantics inversion (WRONG — the scheduler
    runs highest-priority-first, not last) in the chapter prose AND the companion fix in
    `tutorials/familyzoo/v2.0.0/src/ch23-scoring.ts:453` (confirmed inverted comment
    present: "Run last, after all other daemons" on `priority: 100`). **This is the one
    edit outside `docs/` in this plan** — story-level source, autonomous per CLAUDE.md.
  - **ch25** (Part 7): the `sharpee build --browser` scaffolding claim, the
    `registerDefaultBrowserRenderers` static-vs-ambient scope note, the `engineVersion`
    import-vs-literal wording.
  - **ch27** (Part 7): the `ambient:*` story-registration finding (add both registration
    lines, engine + browser, from `ch24-27-presentation/presentation.ts:169` and
    `browser-entry.ts:162-165`).
  - **ch29** (Part 8): the nonexistent `--chain` claim in the author-tool key takeaway
    (correct to `sharpee build --test` auto-chaining `wt-*`), the `entry:` header mention.
  - **ch9** (Part 2): the BROKEN `event.data` typed-`unknown` compile failure (apply the
    exact cast shown in the change list), the `world.rooms.inRegion` monkeypatch advisory.
  - **ch3** (Part 1): the "nothing subscribes to events" contradiction (soften per
    `world.registerEventHandler`, ADR-052), the `messageId` shape nit.
  - **ch20** (Part 6): drop the dead `npcName` field from the two `data: {...}` examples
    (ADR-203 `speaker` NounPhrase supersedes it).
  - **ch14** (Part 4): soften the `sharedData` "sanctioned way" claim (now `@deprecated`
    for validate→later phases; point to `ValidationResult.data`).
  - Run `scripts/build-book.sh v2.0.0 html` once after all chapter fixes land.
- **Exit state**: each listed chapter's WRONG/OUTDATED/BROKEN findings from the change
  list are resolved; `ch23-scoring.ts:453`'s comment states the correct priority
  semantics. **Naive-executable**: ch9's region-boundary snippet compiles under the
  scaffolded strict tsconfig as shown; ch23's daemon-priority explanation matches
  `plugin-scheduler/src/types.ts`'s actual ordering; ch27's ambient-audio walkthrough
  produces sound (not silence) because both registration lines are now shown.
- **Affected files**: `docs/book/v2.0.0/parts/part-6/23-scoring-and-endgame.md`,
  `tutorials/familyzoo/v2.0.0/src/ch23-scoring.ts`,
  `docs/book/v2.0.0/parts/part-7/25-the-web-client.md`,
  `docs/book/v2.0.0/parts/part-7/27-media-and-audio.md`,
  `docs/book/v2.0.0/parts/part-8/29-transcript-testing-and-walkthroughs.md`,
  `docs/book/v2.0.0/parts/part-2/09-the-map-and-regions.md`,
  `docs/book/v2.0.0/parts/part-1/03-the-play-loop.md`,
  `docs/book/v2.0.0/parts/part-6/20-non-player-characters.md`,
  `docs/book/v2.0.0/parts/part-4/14-custom-actions.md`.
- **Status**: PENDING

### Phase 6: Polish Batch (ch1, ch24, ch26, ch30, Appendix A)
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: lowest-severity remaining findings (POLISH tier) across otherwise
  clean chapters — batched together since none is individually session-worthy.
- **Entry state**: Phases 1–5 complete; these are the last remaining findings in the
  change list's executive summary "Clean chapters" set (each with exactly one POLISH
  clause) plus Appendix A's one clause.
- **Deliverable**: resolve each change-list POLISH finding (cite, don't restate):
  ch1 (CLI-at-a-glance table gains `sharpee register`/`sharpee list`; file-tree gains
  `.gitignore`), ch24 (channels table gains the `lifecycle` channel), ch26
  (platform-vocabulary table marked as an excerpt, points at the full
  `PLATFORM_VOCABULARY`), ch30 (optional sentence: save/undo outcome prose now renders
  from `platform.*` messages, author-overridable), Appendix A (layers table gains
  "per-world capability-behavior and action-interceptor registries" to the world-model
  row, per ADR-207/ADR-208).
- **Exit state**: no open change-list findings remain unresolved anywhere in the book
  (cross-check the change list's executive summary table against the edited files — every
  row now accounted for by Phases 1–6). `scripts/build-book.sh v2.0.0 all` (html + epub +
  pdf) renders clean end to end.
- **Affected files**: `docs/book/v2.0.0/parts/part-1/01-installing-sharpee.md`,
  `docs/book/v2.0.0/parts/part-7/24-channels.md`,
  `docs/book/v2.0.0/parts/part-7/26-decoration-and-theming.md`,
  `docs/book/v2.0.0/parts/part-8/30-saving-and-restoring.md`,
  `docs/book/v2.0.0/backmatter/appendix-a-architecture-map.md`.
- **Status**: PENDING

### Phase 7: Pre-Handoff Naive-Execution Verification Gate (dry run)
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: the new acceptance gate itself. Cheaply simulate, in-repo, what the
  naive Docker-container Claude will do: install published `@sharpee/*@2.1.0`, type each
  chapter's code as written, run the "Try it" transcripts — *before* handing the book to
  that agent for real, so failures are caught and attributable to a specific chapter/phase
  rather than discovered cold in the container.
- **Entry state**: Phases 1–6 complete; every change-list finding resolved. No dry-run of
  the full book against a real registry install has been done for the v2.0.0 edition
  (the precedent run — `docs/book/v2.0.0/testing/EXECUTION-LOG.md` — targeted the 1.x book
  against `@sharpee/devkit@1.1.0`/`sharpee@1.1.1`, not this edition).
- **Deliverable**:
  - Re-run `node scripts/extract-book-snippets.cjs` for the whole book so
    `docs/book/v2.0.0/code-snippets/` reflects every Phase 1–6 edit.
  - Stand up a scratchpad project the same way a real author would: `npm install
    @sharpee/devkit@2.1.0` (or `sharpee init`), confirming plain registry resolution —
    this reuses the precedent already proven working in
    `docs/context/session-20260702-1956-v2_familyzoo_split.md`'s "RESOLVED (2026-07-03)"
    note (fresh familyzoo install purely from the npm registry, no overlay/tarball
    grafting needed now that 2.1.0 is actually published).
  - For each version-grounded chapter (the ones with a `code-snippets/chNN-*` "author"
    snippet set, i.e. everywhere the completeness audit and change list both have
    findings), assemble the chapter's own snippets **in chapter order** into the scratchpad
    project exactly as the chapter presents them (no filling in gaps from
    `tutorials/familyzoo/v2.0.0/src/` — that would defeat the point of the dry run) and
    attempt `sharpee build`. Record pass/fail per chapter.
  - For each chapter with a "Try it" transcript, attempt to reproduce it against the built
    story (`sharpee build --test` where the chapter's walkthrough exists, or manual
    `--play` comparison otherwise). Record pass/fail per chapter.
  - Produce a **chapter-by-chapter pass/fail table** as this phase's primary artifact
    (in the phase's work summary, not a new doc file) — this is the input to the Phase 8
    scoping decision below.
- **Exit state**: every chapter touched by Phases 1–6 has a recorded dry-run result
  (compiles + Try-it reproduces, or a specific documented failure). Chapters untouched by
  this plan (the change-list's "Clean chapters" set minus Phase 6's polish items) are
  spot-checked, not exhaustively dry-run, since they had no findings. **This phase does
  not silently fix what it finds broken** — it reports, per the Phase 8 decision below.
- **Affected files**: none in `docs/book/` expected (read/verify phase); possibly a new
  scratchpad harness script if `extract-book-snippets.cjs`'s output needs light assembly
  tooling to concatenate a chapter's ordered snippets into a buildable project — keep any
  such script in `scripts/` if it proves reusable, scratchpad otherwise.
- **Status**: PENDING

### Phase 8: Completeness-Audit Triage & Repair (scope contingent on Phase 7 findings)
- **Tier**: TBD — size after Phase 7's pass/fail table exists; do not estimate blind
- **Budget**: TBD
- **Domain focus**: whatever subset of the 2026-06-22 completeness audit's ~60
  blocker-level items (elided code, missing imports/frames, dangling "Try it" commands,
  missing `extendLanguage` registrations — 18 chapters) Phase 7 actually proves still
  breaks naive execution, **after** accounting for incidental fixes Phases 1–6 already
  made to overlapping chapters (ch15, ch20, ch23 all appear in both the staleness change
  list and the completeness audit, so some of the 18 may already be resolved).
- **Recommendation for David's decision**: do **not** fold full completeness repair into
  this plan's scope now — the audit is large (~60 items, 18 chapters) and largely
  orthogonal to staleness (wrong content vs. missing content). Instead, let Phase 7's dry
  run produce empirical, chapter-scoped evidence of what's actually still broken post-fix,
  then scope Phase 8 to exactly that (likely smaller than the full audit, since several
  flagged chapters got rewritten in Phases 1–6 anyway). The alternative — accepting that
  completeness gaps surface in the real Docker run instead — is viable too if David wants
  this plan to close as "staleness only" and treat completeness as a separate, later plan;
  flagging both options rather than picking one silently.
- **Entry state**: Phase 7's chapter-by-chapter pass/fail table exists.
- **Deliverable**: David's scoping decision, then (if repair is in scope) chapter fixes
  following the completeness audit's own "Recommended remediation" section (open with an
  anchor + full import block, show complete new code with no `// ...as before` elisions,
  make "Try it" self-consistent, fix the named concrete API/CLI errors, resolve the
  ch4/ch5 `SceneryTrait` chapter↔version mismatch).
- **Exit state**: TBD pending scoping decision.
- **Affected files**: TBD.
- **Status**: PENDING (blocked on Phase 7 output + David's scoping decision — do not size
  or start until both exist)
