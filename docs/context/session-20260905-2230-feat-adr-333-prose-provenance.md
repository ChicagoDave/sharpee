# Session Summary: 2026-09-05 - feat/adr-333-prose-provenance

## Status: In Progress — chapter-before-room DONE and committed (fb9b60aee on feat/adr-333-prose-provenance); inline play editing (ADR-333 D4c) on sub-branch feat/adr-333-inline-play-edit, all 3 phases DONE, uncommitted

## Goals
- David (2026-09-06): "I had pictured typing IN the play window" → "let's open a sub-branch and try it": inline editing of single-template paragraphs in Chord Writer's Play pane (ADR-333 D4c).
- David's ruling: "the chapter title should be announced before the room." Move the `story.chapter` card ahead of the turn's prose (ADR-330 D4 reversal) via a channel-registry registration position.

## Completed
- **Secret Letter stub pass (port branch, scratch worktree `scratchpad/sl-port` on `feat/secret-letter-port`)**: all 126 stubs across 18 files rewritten as default lines inside the wrapper (25 in batch 1 — market, wares, disguise, Teisha — shown to David; 101 in batch 2 on "continue"). Test tree `secret-letter.tests.json`: 100-odd pinned fragments of old placeholder text repointed to the new lines (formatting preserved: indent 1, no ASCII escaping); `./sharpee test` (NODE_PATH to the repo's node_modules) → 1468 cards passing, 2643 assertions, 0 failing. Two authoring slips fixed along the way: a `\b` key match that crossed `change-outfit`/`change-outfit-instead`, and fragments that included a `{marker}` or the `Alley`/`Commerce Street` words shared with real prose. UNCOMMITTED in the worktree.
- **Inline play edit, Phase 1 DONE**: `PhraseName` decodes `strategy` + `variantCount`; `PlayToWrite.isInlineEligible/phraseName(for:)/inlineTemplate(source:span:)` + `InlineTemplate.replacement(for:)`; coordinator routes eligible clicks to `onInlineEditRequested` (no tab, not armed) and `commit(_:storyURL:ir:)` replaces the span in the editor buffer, arms, saves → build. Resolver 17, coordinator 10 passing (real editor, real temp file).
- **Phase 2 DONE**: Play page `beginInlineEdit` (textarea in the paragraph; Enter → `playEditCommit` bridge with text+history and restore; Shift-Enter newline; Escape restore), Swift handler → `onInlineCommit`, `beginInlineEdit(_:)` / `beginInlineEditInPlaySurface(_:)`, MainWindow wiring. Surface tests 7 passing.
- **Phase 3 DONE**: real-path tests 4 passing (2 new: a `first time` description and a `define phrase` body typed in Play, real build, replay, same turn shows the new text); full IDE suite 637 passing, 0 failures (was 622); ADR-333 D4c + header amendment written; `mutation-verification` clean (24 functions, no RED/YELLOW). Plan DONE → archived `docs/work/archive/inline-play-edit/`; pointer back on publish-readiness, its stamp repointed to the archive path.
- Session start: recap presented, `pre-session-audit` relayed verbatim, profile fresh (2026-09-04), core concepts read in full, gate cleared.
- Research (read, not assumed): the opener is announced on the first executed turn (browser: the initial `look`), and the browser renderer buffers prose until `preferred-layout` while `story.chapter` registers after every standard channel, so the card always lands below the prose.
- David's mid-turn question "where is my play-content editing feature?": `/Applications/Chord Writer.app` is 1.4.0 built Sep 4 21:13, before the play-to-write commit (fa80abaea, Sep 5 21:34); the Debug build at `~/Library/Developer/Xcode/DerivedData/Build/Products/Debug/Chord Writer.app` (Sep 5 23:44) carries it. Unreleased.
- `session-planner` → `docs/work/chapter-before-room/plan.md` (2 phases); publish-readiness stamped `Superseded by` (still live), pointer moved.
- **Phase 1 DONE**: `IChannelRegistry.add(channel, position?: { before })` + `ChannelRegistrationPosition` (if-domain, exported); `StdlibChannelRegistry.add` rebuilds its Map to insert a NEW id before the named one, throws on an unknown id, replaces an existing id in place; `registerChaptersChannels` registers before `room-name`. Tests: stdlib registry 14 passing (4 new), ext-chapters 8 (1 new), if-domain green. if-domain dist rebuilt; stdlib/ext-chapters tsc clean.
- **Phase 2 DONE**: story-loader `adr-330-chapters.test.ts` 12 passing (real engine manifest: `story.chapter` = banner+1 = room-name-1, before every prose channel and `preferred-layout`; empty registry → loud error; the old D4 case now seeds STANDARD_CHANNELS); platform-browser `chapter-before-room.test.ts` 2 passing on a REAL `BrowserClient` + `GameEngine` + compiled Chord fixture (turn 1: banner → card → room name → room description; `east`: market prose → street card → street room); full platform-browser 154 passing; channel-service 119 passing; story-loader/platform-browser tsc clean. ADR-330 D4 + D5 note amended (dated 2026-09-05, original text quoted), header amendment line; ADR-163 §7 amendment (registration position); website `chapters/content.mdx` rewritten; IDE docs tab rebuilt (164 pages).
- Two test-authoring slips in my own new browser test (wrong log id, then happy-dom lacks `:scope`) fixed and re-run; the product assertions passed on every run.

## Key Decisions
- Stubs carry a default line (David: "I would prefer we supply a default response the author can edit"; "As long as we identify generated text, it's fine… for the SL port, I'm okay with the helpers"): the `(TODO during play-testing — …)` wrapper stays as the identification of generated text; the brief lives in the `## DAVID:` comments; Gentry's 2009 lines are carried where they exist (cloak → dress swaps only), new lines drafted where the brief said none exists; conversation stubs become one narrated paragraph of the tree's opening in Gentry's words. Memory `feedback_stubs_carry_default_line` written.
- Inline editing edits the TEMPLATE (source at the span), never the rendered text; single arm + no strategy only; the editor stays the fallback for cycling/multi-arm phrases and new platform overrides. The round arms at commit (Escape leaves nothing). Prose spans replace the exact range with re-indented continuation lines; block spans replace body lines only, decided by reading the first line at the span (`define phrase` / `override message`), no IR change. ADR-333 D4c written after it worked.
- Registration position (`add(channel, { before })`) rather than a renderer special case or an order number; matches the ADR-298/ADR-300 registration-order precedent.
- The rule is uniform for every trigger kind.

## Open Items
- I-c8a56c-1 (carried): David's lines for the Chapter 6-9 placeholder beats and the DS38-39 conversion (Secret Letter port branch).
- I-c8a56c-2 (carried): GH #356, the stallkeeper patience counter — David's ruling pending.

## Files Modified
- `packages/if-domain/src/channels/{types,index}.ts`, `packages/stdlib/src/channels/registry.ts`, `packages/extensions/chapters/src/chapter-channel.ts`
- Tests: `packages/stdlib/tests/channels/registry.test.ts`, `packages/extensions/chapters/tests/chapters.test.ts`, `packages/story-loader/tests/adr-330-chapters.test.ts`, `packages/platform-browser/tests/chapter-before-room.test.ts` (new)
- Docs: `docs/architecture/adrs/adr-330-chord-chapters.md`, `docs/architecture/adrs/adr-163-channel-service-platform.md`, `website/src/app/chord/guide/flow/chapters/content.mdx`, `tools/ide/SharpeeIDE/Resources/docs-tab/{docs-index.json,pages/chord__guide__flow__chapters.html}` (rebuilt)
- Plans: `docs/work/archive/chapter-before-room/plan.md` (new; DONE and archived), `docs/work/publish-readiness/plan.md` (Superseded-by stamp), `docs/context/.current-plan`
- (this file)

## Notes
- Session started: 2026-09-05 22:30 CDT (session bc2998)
