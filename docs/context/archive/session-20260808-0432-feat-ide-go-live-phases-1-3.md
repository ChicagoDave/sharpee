# Session Summary: 2026-08-08 - feat/ide-go-live-phases-1-3 (CDT, session a45deb)

**Status: COMPLETE** — four pieces landed and green (2f in-place retype, 3b terminal marking, 3c reparenting, ADR-290 D7 sidebar refresh); the tab-side buildable list is empty. Blocker Category: N/A.

## Goals
- Continue Phase 5 (Transcript editor) open items, starting with in-place command-text editing (slice 2 remainder).

## Phase Context
- **Plan**: Sharpee IDE Go-Live (`docs/work/ide-go-live/plan-20260806-go-live.md`), Phase 5 CURRENT; scope in `phase-5-editor-scope.md`.
- Prior session 648342 closed slice 4 (turn budget) and 5a (record/re-record golden); that work is still uncommitted.
- Open buildable items: in-place command editing, terminal-command marking (R9), reparenting, sidebar refresh (ADR-290 D7 gap). Blocked on the world: inherited-state header, `[STATE:]`. Deferred to David: 5b.

## Completed

### Slice 2f — retype a command in place (the slice-2 remainder)
- Pencil on the document-face card → prefilled field → Change/Keep (Enter/Escape); assertions stay attached to the reworded command; same-text confirm writes nothing.
- `grammar.editCommand` is pure (parse → mutate input → re-serialize → Draft); the write rides the existing `applyEdit` → host path, so undo/claims-hidden/"run again" note all apply unchanged.
- **Stale-line targeting guard** (`commandAt`): found that ✕/promote could silently hit the wrong command after a structural edit moved lines between runs. All three line-addressed edits (promote, delete, retype) now pass the card's `turn.input`; line+text must agree or the edit is refused with both spellings named.
- Pencil glyph is CSS `::before` so `.cmd` textContent stays the command's identity (existing tests match it exactly).
- `mutation-verification` flagged two untested action branches (same-text no-op; refusal through the real field); both closed by `testARetypeToTheSameTextOrToBlankWritesNothing` — file bytes identical, no edit note/undo for the no-op, named reason for the blank. Its design question (refused retype closes the field, discarding the draft) decided: kept, matches promote's refusal shape.

### Slice 3b — endings mark the file terminal (R9)
- `model.storyEnd` splits a node's run at the first turn whose error is EXACTLY `Engine is not running` (the runner normalizes it in one place; `STORY_OVER_ERROR` exact-match, never prose-fuzzy) → ender + dead tail.
- Document face: ender badged "The story ends here."; dead turns muted with the explanation, keeping their ✕ (trimming is the invited edit); append bar replaced by a terminal note naming the ender and "branch a new transcript from ⟨parent⟩"; branch field/button disabled with the reason (a child replays through the ending and dies).
- **Honest limit named in the scope doc**: a file whose last command ends the story cleanly emits no wire signal — marking it needs a wire addition ("story ended this turn"), flagged for David, not assumed.

### Slice 3c — reparenting
- Picker + Reparent button in the file bar; `grammar.reparent` rewrites/removes `continues:` through the shared write path (undo, claims-hidden, "run again" note all inherited).
- Exclusions by construction (`model.reparentCandidates`): self, own descendants, terminal files, current parent — what the picker never offers can't be written. Grammar refuses self-parent (the one cycle it can see alone).
- `applyEdit` grew a general carried `warning` (R4's turn-count text moved onto it verbatim); reparent carries "runs from a different history — assertions may no longer hold" (+subtree count).
- Real-path pins the warning as demonstrated fact: concealment reparented under key goes red (doormat's key already taken) — CLI probe first (21 passed, 1 failed), then `#tally-fail` = 1 through the rendered control.

### Sidebar refresh (ADR-290 D7 observer restored)
- `refreshProjectTree()` back at the window: rescan disk, rebuild pane, re-apply expansion — folders by URL, group rows by KIND (`expandedGroupKinds`, new: `expandedFolderURLs` deliberately skips groups for session restore, so a bare refresh would have collapsed "Transcript Tests" over the just-created file). Session restore unchanged.
- Announced from `TestController.rediscover` (create/trash) and a recording run's exit (`runLandsFiles`); ordinary runs don't refresh (no file change; rebuild would drop sidebar selection).
- End-to-end test: create through the tab's real seam → file on disk → rendered Project outline shows it, group still open (`ProjectTreeRefreshTests`).

## Key Decisions
- Assertions survive a rewording deliberately — the next run judges whether they still hold; the editor never guesses which claims survive.
- Command identity for card-driven edits is line AND text, not line alone (R10 applied to targeting).
- Terminal marking is evidence-based only (dead turn observed in the run); the clean-ending case is honestly unmarked pending a wire field.

## Next Phase / Open Items
- Tab-side buildable list is EMPTY — every item not blocked on the world or a platform decision is done.
- Platform asks for David: wire field for clean story endings (would complete R9); 5b runner mode + wire (already deferred).
- Needs the world (scope §4 Q1): inherited-state header, `[STATE:]`.
- Prior session 648342's work (slice 4 + 5a + #239 port) still uncommitted, along with this session's.

## Evidence (all run this session, 2026-08-08)
- testing-tab `npx vitest run` → 73 passed (was 58; +6 editCommand/guard, +3 storyEnd, +6 reparent/candidates)
- `xcodebuild test -scheme SharpeeIDE` → `** TEST SUCCEEDED **`, `Executed 457 tests, with 0 failures` (was 452; +4 tab real-path, +1 sidebar-refresh end-to-end)
- Premise probes at the devkit CLI, fixtures restored after each: `examine doormat` rewording → 22 passed; concealment reparented under key → 21 passed, 1 failed (the pinned red)
- `npx tsc --noEmit` at repo root → clean (re-run after 3c)
- `git status --porcelain tools/ide/test-fixtures branch-stories` → empty (re-checked after 3c)

## Files Modified
- `tools/ide/web/testing-tab/src/{grammar,model,main,views}.ts`, `src/tab.css`; tests `tests/{grammar,model}.test.ts`; rebuilt bundle `tools/ide/SharpeeIDE/Resources/testing-tab/`
- `tools/ide/SharpeeIDE/{MainWindow.swift, Test/TestController.swift, Project/{ProjectPaneViewController,ProjectTreeViewController}.swift}` (sidebar refresh)
- `tools/ide/SharpeeIDETests/TestingTabRealPathTests.swift` (4 new real-path tests), `ProjectTreeRefreshTests.swift` (new file; xcodegen regenerated)
- `docs/work/ide-go-live/phase-5-editor-scope.md` (2f + 3b + 3c Done sections; D7-gap closure note)
