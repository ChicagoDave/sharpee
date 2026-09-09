# Proposal: Code documentation sweep — headers separate logic from references

**Status**: ACCEPTED — all eight items accepted 2026-09-07 (session 7f0471) after proposal-review returned tensions only
**Origin**: conversation — David's overall addition to the refactoring-survey assessment (`docs/work/archive/refactoring-survey/assessment-20260907-umbrella.md`, "Headers keep what the code does and which ADR decided it as separate concerns"), 2026-09-07: "The headers should have logic descriptions and ADR references as separate concerns so a reader can skip the references and focus on what the code is doing." Not architecture, so not an ADR: a sweep across all of the code, filed as GitHub issue #384 (2026-09-07).
**Date**: 2026-09-07
**Session**: 7f0471

The convention covers file, class, and method headers alike. A file header states its logic first, in plain sentences with no citations; then the rule-9 lines (public interface, owner context); then a `References:` block, one line per decision, each naming what that decision fixed in this file. A class header states what the class is and holds, then its own `References:` block. A method header's summary and parameters carry no citation; a trailing `Reference:` line carries one when it applies. An inline comment cites an ADR only where the code would otherwise look wrong (a deliberate ordering, a deliberate omission), and says what the code does before who decided it. The tick's header (`packages/character/src/tick-phases.ts:1-24`) is the worked before/after in the assessment.

Measured 2026-09-07 at `dc140a48b` (first cut: any `ADR-nnn`, `GH #n`, or `#nnn` in a non-test `.ts` file's first 40 lines; the precise inventory is P-2):

| Area | Files | Cite in header |
|---|---|---|
| `packages/*/src` (33 packages) | 1,015 | 570 |
| `tools/repokit/src` | 20 | 19 |
| `stories/dungeo/src` | 339 | 81 |
| Total | 1,374 | 651 |

The six refactoring-survey plans (ADR-334 to ADR-339) rewrite every header they touch and are asked to apply this convention as they go; this sweep covers everything they do not touch, and finishes their packages after they land.

## Items

### P-1: State the convention once, where every package's instructions point
- **Done when**: `docs/core-concepts/README.md` carries a "Headers" section giving the four-part file header (purpose with no citations, public interface, owner context, `References:` block), the class-header rule, the method-header rule, and the inline-citation rule, with the tick header as its before/after example; each per-package `CLAUDE.md` (`packages/sharpee`, `world-model`, `stdlib`, `parser-en-us`, `lang-en-us`) points to it in one line; the root `CLAUDE.md` names it in the Project Structure section.
- **Status**: ACCEPTED (David, 2026-09-07, session 7f0471)

### P-2: An inventory script that says which headers interleave, and a comments-only diff check
- **Done when**: `scripts/header-references.sh` reports, per package, the non-test source files in which a file, class, or method doc block's purpose text (the part before any `References:` / `Reference:` line, and before the `Public interface:` / `Owner context:` lines in a file header) contains a citation, where a citation is `ADR-nnn`, `GH #n`, or `#nnn` preceded by `GH `, `issue `, or an opening parenthesis (so hex colours and numeric literals do not count), and lists them with `--list`; `scripts/comments-only-diff.sh <ref>` strips `//` and `/* */` comments from both sides and reports whether the diff since `<ref>` is empty; the script's output at HEAD is recorded as the baseline in the plan that lands this proposal.
- **Status**: ACCEPTED (David, 2026-09-07, session 7f0471)

### P-3: Sweep the contract and small platform packages
- **Done when**: `core`, `if-domain`, `if-services`, `text-blocks`, `media`, `ide-protocol`, `story-runtime-baseline`, `event-processor`, `plugins`, `plugin-scheduler`, `plugin-state-machine`, `channel-service`, `helpers`, `queries`, `bootstrap` report zero from P-2's script across file, class, and method headers; the comments-only diff for the phase is empty; each package's suite passes at its prior count; `./repokit build` regenerates `packages/sharpee/docs/genai-api/` and the result is committed with the phase.
- **Status**: ACCEPTED (David, 2026-09-07, session 7f0471)

### P-4: Sweep the language and parser packages
- **Done when**: `lang-en-us` (30 files at baseline) and `parser-en-us` (11) report zero; sequenced with the `lang-en-us` (GH #382) and `parser-en-us` (GH #385) cleanups so no header is edited twice; comments-only diff empty; suites at prior count; the regenerated API reference committed with the phase.
- **Status**: ACCEPTED (David, 2026-09-07, session 7f0471)

### P-5: Sweep the clients, tooling, and testing packages
- **Done when**: `platform-browser`, `runtime`, `bridge`, `devkit`, `transcript-tester`, `branch-tester`, `world-index`, `map-editor`, `sharpee`, and `tools/repokit` report zero; comments-only diff empty; suites at prior count; `./repokit build dungeo` clean and the regenerated API reference committed with the phase.
- **Status**: ACCEPTED (David, 2026-09-07, session 7f0471)

### P-6: Finish the six survey packages after their plans land
- **Done when**: `engine`, `story-loader`, `chord`, `stdlib`, `world-model`, `character` report zero from P-2's script, each swept after its ADR-334 to ADR-339 plan is DONE (or before, for any plan not yet started, at David's call), so the survey's own header rewrites and the sweep never touch the same file twice; comments-only diff empty; suites at prior count; the regenerated API reference committed with the phase; the Dungeo chain and the three Chord test trees byte-identical (a comments-only change that moves a byte of output has found something else).
- **Status**: ACCEPTED (David, 2026-09-07, session 7f0471)

### P-7: Sweep Dungeo's source
- **Done when**: `stories/dungeo/src` (81 of 339 files at baseline) reports zero; comments-only diff empty; the walkthrough chain byte-identical at its pinned seed.
- **Status**: ACCEPTED (David, 2026-09-07, session 7f0471)

### P-8: A local guard so the convention holds after the sweep
- **Done when**: P-2's script runs under `./repokit verify` and fails, naming the file, when a header's purpose paragraph carries a citation; a scratch header with `ADR-999` in its first sentence fails verify and passes once the citation moves to the `References:` block. Local guard only, no CI gate.
- **Status**: ACCEPTED (David, 2026-09-07, session 7f0471)
