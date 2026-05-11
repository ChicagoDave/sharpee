# Session Summary: 2026-05-10 - main

**Goal**: Trim root `CLAUDE.md` by extracting package-specific directions into per-package `CLAUDE.md` files.
**Status**: COMPLETE
**Outcome**: Root `CLAUDE.md` reduced from 732 to 441 lines. Five new per-package files created, each opening with a backlink to root. No code or tests changed.

**Files modified**:
- `CLAUDE.md` (rewritten, trimmed)
- `packages/world-model/CLAUDE.md` (new, 34 lines — Item Portability, trait/behavior layout, root barrel discipline, circular dependency detection)
- `packages/stdlib/CLAUDE.md` (new, 184 lines — Language Layer Separation, full Capability Dispatch / ADR-090, Migration Audits, Action Testing / world-state verification)
- `packages/parser-en-us/CLAUDE.md` (new, 86 lines — Parser vs Language Layer, Grammar Patterns / ADR-087, Story Grammar Extension)
- `packages/lang-en-us/CLAUDE.md` (new, 19 lines — Language Layer text side, Entity-Valued Template Parameters / ADR-158)
- `packages/sharpee/CLAUDE.md` (new, 11 lines — GenAI API reference pointer)

**Key decisions**:
- Per-package CLAUDE.md split (vs. conservative "only big blocks" or aggressive "also move build/test"). Build/test commands stayed at root because they're cross-cutting.
- Each package file gets a backlink header: `"Scoped to packages/X. See the root CLAUDE.md for project-wide policy."` Helps future sessions navigate the hierarchy.
- "Always Trust the Architecture" kept at root as a general principle (its example is stdlib-centric but the checklist applies project-wide).

**Why this matters**: Root `CLAUDE.md` loads into every session's baseline context. The Capability Dispatch section (~160 lines) is only relevant when writing stdlib actions or story behaviors — pushing it out of the baseline reduces per-session context cost. Per-package files are read on demand when working in that package.

**Notes**: Root retains cross-cutting content: Overview, MAJOR DIRECTIONS, new "Per-Package Instructions" nav table, Logic Location table, Always Trust the Architecture, Testing Commands, Build Script, Transcript Testing, Project Structure, Work Patterns, Autonomous Work Flow, Key Locations, and the full DevArch block (~200 lines, auto-managed). `tools/ide/` artifacts and `docs/work/sharpee-ide/` left untouched (parallel IDE session per memory rule `project_sharpee_ide_parallel`). No tests run (documentation-only change). No ADRs touched.
