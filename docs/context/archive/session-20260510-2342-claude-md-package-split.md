# Session Summary: 2026-05-10 - main

**Goal**: Trim root `CLAUDE.md` by extracting package-specific directions into per-package `CLAUDE.md` files.
**Status**: COMPLETE
**Outcome**: Root `CLAUDE.md` reduced from 732 to 441 lines. Five new per-package files created, two inherited inaccuracies corrected, all across three commits.

**Commits**:

`8b28d44a` — initial split. Root rewritten; 5 per-package files created:
- `packages/world-model/CLAUDE.md` (new, 34 lines — Item Portability, trait/behavior layout, root barrel discipline, circular dependency detection)
- `packages/stdlib/CLAUDE.md` (new, 184 lines — Language Layer Separation, full Capability Dispatch / ADR-090, Migration Audits, Action Testing / world-state verification)
- `packages/parser-en-us/CLAUDE.md` (new, 86 lines — Parser vs Language Layer, Grammar Patterns / ADR-087, Story Grammar Extension)
- `packages/lang-en-us/CLAUDE.md` (new, 19 lines — Language Layer text side, Entity-Valued Template Parameters / ADR-158)
- `packages/sharpee/CLAUDE.md` (new, 11 lines — GenAI API reference pointer)
Each package file opens with a backlink to root. Session summary also committed.

`c5893985` — review fixes. Removed stale `Current branch dungeo → docs/work/dungeo/` line from Work Patterns. Added a one-line pointer under "Always Trust the Architecture" to `packages/stdlib/CLAUDE.md` for the full Capability Dispatch / ADR-090 reference. Deleted leftover `docs/context/.active-session`.

`5d4510d9` — path verification. Audited all paths claimed in the new per-package files against the real tree. Two inaccuracies fixed (both inherited from the pre-trim root, present before this session):
- **Action file naming pattern** was wrong in root Key Locations and `packages/stdlib/CLAUDE.md`: claimed `action.ts / action-events.ts / action-data.ts`; real pattern is `<name>/<name>.ts`, `<name>-data.ts`, `<name>-events.ts`, `<name>-messages.ts`, `<name>-types.ts` (e.g., `taking/taking.ts`). Fixed in both.
- **Stale stdlib testing plan reference**: `docs/work/stdlib-testing/mitigation-plan.md` does not exist; real file is `docs/work/test-review/plan-20260406-testing-mitigation.md`. Fixed.

**Key decisions**:
- Per-package CLAUDE.md split (vs. conservative "only big blocks" or aggressive "also move build/test"). Build/test commands stayed at root because they're cross-cutting.
- "Always Trust the Architecture" kept at root as a general principle (its example is stdlib-centric but the checklist applies project-wide).

**Documentation-drift insight**: The two path inaccuracies corrected in commit #3 had been present in the original root `CLAUDE.md` for some time. They surfaced only because splitting into per-package files forced a focused re-read of each section in context. This confirms the user's feedback rule `feedback_docs_as_review`: writing and reviewing architecture docs is a form of active code/design review.

**Notes**: Root retains cross-cutting content: Overview, MAJOR DIRECTIONS, per-package nav table, Logic Location table, Always Trust the Architecture, Testing Commands, Build Script, Transcript Testing, Project Structure, Work Patterns, Autonomous Work Flow, Key Locations, and the full DevArch block (~200 lines, auto-managed). `tools/ide/` artifacts and `docs/work/sharpee-ide/` left untouched (parallel IDE session per memory rule `project_sharpee_ide_parallel`; files left on disk per `feedback_dont_delete_excluded_files`). No code touched, no tests run, no ADRs modified.
