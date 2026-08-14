# Session Summary: 2026-08-14 - main (UTC)

## Goals
- Diagnose and fix a reported website + playground build failure on the deploy server (plover/planetfall).
- Investigate a reported Chord v3 syntax staleness on the website playground.

## Phase Context
- **Plan**: `docs/work/chord-writer-intel/plan.md` — Intel (x86_64) support for Chord Writer, as separate per-arch installers.
- **Phase executed**: None. This was unplanned incident work — it did not touch or advance the plan's Phase 1 (Vendor the x86_64 toolchain), which remains as it was entering this session.
- **Tool calls used**: 101 (session-state count) / N/A (no phase budget — off-plan work).
- **Phase outcome**: N/A — plan not engaged this session.

## Completed

### Incident 1 — root-owned build artifacts + broken repokit engine
- Root cause: `website/deploy.sh` had been run under `sudo` even though the script already `sudo`s internally for the 3 steps that need it. That left `.next/`, `node_modules/`, package `dist/`+`dist-esm/`, and part of `tools/repokit/dist/` root-owned while the systemd unit runs as `User=dave`.
- Symptom A: `next build` failed with `EACCES: permission denied, unlink '.../website/.next/build/c9692bed165dc0b3.js'` — root-owned `.next/`.
- Symptom B: `./repokit build --playground` failed with `repokit: grammar: stdlib constants.ts yielded only 0 action ids`. Traced to `tools/repokit/dist/commands/grammar.js:51`: ES5-downlevel `for (var _i = 0, _a = src.matchAll(...); _i < _a.length; ...)` — `matchAll()` returns an iterator with no `.length`, so the loop body never executes.
- Underlying cause of Symptom B: the repokit engine was bootstrapped before its own deps were installed, so the build fell through to `/usr/local/bin/tsc` on PATH — TypeScript 4.3.4 (installed 2021-06-27). 4.3.4 predates the ES2022 target in `tsconfig.base.json`, reports TS6046 for the unknown target, falls back to ES5, and **emits anyway** rather than failing.
- Verified asymmetry: `--target ES2022` on the CLI makes 4.3.4 refuse and emit nothing (safe); the same target via tsconfig makes it warn and emit the broken ES5 output (silent failure). Confirmed by running both directly.
- The global `/usr/local/bin/tsc` was an orphan of an npm prefix (`/usr/local`) that current npm no longer uses (`/usr`), so `npm ls -g` never listed it and `npm uninstall -g` would have been a no-op.
- Fixed the engine's dependency ordering, then hit a third, previously-masked failure: repokit's own source imports types from `@sharpee/devkit` and `@sharpee/bootstrap`, which repokit itself normally builds — a cold-host circular-bootstrap ordering bug that 4.3.4 had been silently papering over by emitting through the resulting TS2307s. `tsc` 5.9.3 correctly exits non-zero on that instead.
- Verified the previously-emitted (broken-tsc) engine output was otherwise sound: 18 correct `for (const m of ...)` loops, zero ES5 index-loop forms, and all 9 tsc errors were type-only `TS2307`/`TS7006` that erase at emit. End-to-end check: `readStdlibActionIds()` through the rebuilt engine returned 70 (was 0).

### Incident 2 — website playground Chord v3 staleness
- Verified against the compiler (not ADR prose): all 4 playground examples in `website/src/app/playground/examples.ts` failed with 3 errors each (`parse.removed-story-header`, `parse.header-unknown-field` on `version:`, `parse.story-title`) — pre-Chord-3.0.0/ADR-298 positional `story "Title" by "Author"` header instead of the fielded `title:`/`authors:`/`id:`/`story-version:` block.
- Root finding: `examples.ts`'s header comment claimed the examples were "verified by `scripts/playground-examples-check.mjs`" — that script never existed (no file, no git history). The claim was fictional since the file was written, which is why the examples — including the one a first-time visitor lands on — rotted a full Chord major version behind, unnoticed.
- Website-wide audit beyond `examples.ts`: 0 positional headers and 0 removed-key spellings across website MDX (control check used 17 known-good bare v3 `story` lines to confirm the grep itself worked, after an initial false-zero from a drifted cwd — see Errors below). Compiled all 183 Chord code blocks across 102 website files: 16 self-contained/compilable, 2 "failures" that are harness artifacts (`import-unresolved`, `unknown-phrasebook`) on the pages documenting those exact features, not real staleness. Genuine v3 staleness on the website was confined to `examples.ts`.
- All stories under `stories/` and `branch-stories/` were already v3 — no changes needed there.
- User explicitly scoped `docs/archive/**` (52 files) and `docs/work/**` (24 files) out of this session; both still carry stale headers and some also carry `parse.dotted-key` errors, so a header-only fix wouldn't make them compile anyway. No changes made in either tree.

## Key Decisions

### 1. Upgrade the global tsc, don't delete it
Deleting `/usr/local/bin/tsc` would violate CLAUDE.md's no-deletion-without-confirmation rule and risks breaking unknown PATH consumers; `scripts/fix-global-tsc.sh` pins it to 5.9.3 (matching the workspace) instead, with an acceptance test that compiles the real repokit extraction loop through a tsconfig and asserts on runtime output (2 ids), not on tsc's exit code.

### 2. No `noEmitOnError` in `tools/repokit/tsconfig.json`
Rejected as the first-instinct fix: on a cold host `@sharpee/devkit`'s `dist` doesn't exist yet, so `noEmitOnError` would block the legitimate cold-start bootstrap the wrapper exists to perform. Fixed the bootstrap ordering instead (repokit now runs `tsf build` first when `packages/{devkit,bootstrap}/dist/index.d.ts` are missing, and refuses to fall back to a PATH `tsc` — it requires `tools/repokit/node_modules/.bin/tsc` to exist and be TS 5+).

### 3. Recursive chown for root-owned artifacts, including the analytics collector's files
`scripts/fix-root-owned-artifacts.sh` chowns the repo tree and `/var/lib/sharpee-analytics` recursively, deliberately, rather than just the directory: chowning only the directory would let the service create new files while leaving the existing IP-hash salt and `.jsonl` unwritable, and the collector swallows write failures by design — a directory-only fix would look fixed and silently not be.

### 4. Write the checker that was only ever claimed to exist
`scripts/playground-examples-check.mjs` transpiles `examples.ts` with esbuild and imports the real exports rather than regex-scraping template literals, so it exercises the actual compiler path. Verified non-vacuous by deliberately breaking one example (`FAIL lamp-room — 2 error(s)`, exit 1) before trusting it.

## Next Phase
- **Phase 1**: "Vendor the x86_64 toolchain" (`docs/work/chord-writer-intel/plan.md`) — unchanged by this session, gate already cleared 2026-08-13 (x64 node minos 11.0 confirmed). This session did not touch it.
- **Tier**: Medium (250 budget) — as recorded in the plan.
- **Entry state**: same as before this session; no carryover from this incident work.

## Open Items

### Short Term
- All six changed files are uncommitted; the `examples.ts` fix and the deploy.sh guard are not live until another `./website/deploy.sh --no-pull` runs.
- ADR-313 (7 questions) and ADR-314 (9 questions) open-questions interviews still not started (carried forward, unrelated to this session).

### Long Term
- The `website/public/` restart trap is still not encoded in `deploy.sh` — this session touched `deploy.sh` but deliberately did not add that guard (out of scope for this incident).
- Phase 3 doc cleanup remains on the unmerged `feat/adr-312-cli-test-recording` branch.
- AC3 Gatekeeper check is still only verified on the build machine.
- `docs/archive/**` and `docs/work/**` Chord v3 staleness (52 + 24 files) remains untouched, per explicit user scope-out this session.

## Files Modified

**New scripts** (3 files):
- `scripts/fix-root-owned-artifacts.sh` - idempotent privileged repair: recursive `chown` of the repo plus `/var/lib/sharpee-analytics`.
- `scripts/fix-global-tsc.sh` - pins global `tsc` to 5.9.3; acceptance test compiles the real repokit extraction loop through a tsconfig and asserts on runtime output.
- `scripts/playground-examples-check.mjs` - the checker `examples.ts` had claimed to have since it was written; esbuild-transpiles and imports real exports, verified non-vacuous against a deliberate break.

**Build tooling** (1 file):
- `tools/repokit` - bootstrap now refuses to compile the engine unless `tools/repokit/node_modules/.bin/tsc` exists and is TS 5+ (no PATH fallback), and runs `tsf build` first when `packages/{devkit,bootstrap}/dist/index.d.ts` are missing.

**Website** (2 files):
- `website/deploy.sh` - refuses to run as root; analytics error message names the repair script and explains why the chown must be recursive; runs the playground examples check at warn level after the playground build.
- `website/src/app/playground/examples.ts` - all 4 examples migrated to the Chord v3 fielded header (ADR-298); header comment corrected to stop claiming fictional verification.

## Notes

**Session duration**: not tracked precisely; single incident-response session, 101 tool calls.

**Approach**: Live diagnosis on the deploy server, verifying each root cause against direct command output (not inferred from symptoms) before writing a fix — including deliberately reproducing the tsc CLI-vs-tsconfig asymmetry and the fictional-checker claim before trusting either finding.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — all changes uncommitted at session end; new scripts are additive and the modified files (`repokit`, `deploy.sh`, `examples.ts`) have no dependents yet relying on the new behavior.

## Dependency/Prerequisite Check

- **Prerequisites met**: root/sudo access on the deploy server for the chown repair (user runs sudo per project convention; script was produced idempotent and not auto-invoked with sudo by Claude).
- **Prerequisites discovered**: `tools/repokit`'s cold-start bootstrap implicitly depended on `packages/devkit` and `packages/bootstrap` being pre-built by `npx tsf build` (per CLAUDE.md's documented cold-start sequence) — previously masked by the broken global `tsc` emitting through the resulting `TS2307`s instead of failing.

## Architectural Decisions

- None this session — no ADR was written or amended; this was incident diagnosis and repair, not a platform design decision. (CLAUDE.md's platform-discussion rule was not implicated: the repokit and website changes are tooling/build-pipeline fixes, not `packages/` engine changes.)
- Pattern applied: none new; fixes restored existing intended behavior (deploy.sh's own non-root design, repokit's intended dependency ordering).

## Mutation Audit

- Files with state-changing logic modified: `website/deploy.sh` (build/deploy side effects), `tools/repokit` (build orchestration), `scripts/fix-root-owned-artifacts.sh` (filesystem ownership), `scripts/fix-global-tsc.sh` (global tsc symlink).
- Tests verify actual state mutations (not just events): YES (evidence: repokit fix verified by running `readStdlibActionIds()` through the rebuilt engine, returned 70 vs. prior 0, run directly this session; `fix-global-tsc.sh`'s acceptance test verified in both directions — 5.9.3 → 2 ids, 4.3.4 → 0 ids, run directly this session; `playground-examples-check.mjs` verified non-vacuous via a deliberate break producing `FAIL lamp-room — 2 error(s)`, exit 1, run directly this session).
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — no prior session in `docs/context/` records a root-owned-artifact or stale-global-tsc incident. `scripts/playground-examples-check.mjs`'s absence (a checker referenced but never written) is a novel finding, not a repeat of a previously logged pattern.

## Test Coverage Delta

- Tests added: 1 (`scripts/playground-examples-check.mjs`, a new non-vacuous acceptance check wired into `deploy.sh` at warn level).
- Tests passing before: N/A (script did not exist) → after: 4/4 playground examples pass (evidence: direct run this session, post-fix, exit 0; verified non-vacuous by a prior deliberate-break run that correctly failed).
- Known untested areas: `docs/archive/**` and `docs/work/**` Chord v3 staleness remains unchecked by any automated gate (explicitly out of scope this session).

---

**Progressive update**: Session completed 2026-08-14 00:18 UTC
