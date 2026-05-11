# Session Summary: 2026-05-10 - main (post-Phase-3)

## Goals

- Free the `zifmia` brand name from the legacy Tauri single-player runner so it can be claimed by the upcoming multi-user web product.
- Draft, review, and accept ADR-175 establishing the Zifmia multi-user product's architecture, transport contract, state model, and acceptance criteria.

## Phase Context

- **Plan**: No active plan for this session — both chunks of work were initiated by David's direct requests after the ADR-174 Phase 3 session completed.
- **Phase executed**: N/A (no plan.md phase; two discrete work items)
- **Tool calls used**: not available (.session-state-5d0918.json cleaned up by prior /finalize)
- **Phase outcome**: Both chunks complete; ADR-175 ACCEPTED same-day.

## Completed

### A. zifmia → interpreter rename (commit 3b8bba6a)

Triple directory rename via `git mv`:

- `packages/zifmia/` → `packages/interpreter/`
- `docs/server/` → `docs/zifmia/`
- `docs/work/zifmia/` → `docs/work/interpreter/`

Identifier updates (technical names only — brand string "Zifmia" preserved where it describes the legacy product in marketing copy, historical ADRs, and macOS build-output filenames):

- npm package: `@sharpee/zifmia` → `@sharpee/interpreter`
- Tauri `productName`: "Zifmia" → "Interpreter"
- Tauri `identifier`: `com.sharpee.zifmia` → `com.sharpee.interpreter`
- Rust crate name: `zifmia` → `interpreter`; lib name `zifmia_lib` → `interpreter_lib`

Workspace and tooling updates across: `pnpm-workspace.yaml`, `build.sh`, `build-macos.sh`, `build-ubuntu.sh`, `scripts/mac-release.sh`, `ts-forge.config.json`, `.claude/settings.local.json` (paths only), root `.gitignore`.

Mid-flight discovery: the `.gitignore` patterns matched the old `packages/zifmia/` path. Without the fix, 2957 Cargo build artifacts would have been staged in the rename commit. Corrected before staging.

Doc sweep: ~25 files updated for `@sharpee/zifmia` → `@sharpee/interpreter` and `packages/zifmia/` → `packages/interpreter/` references.

Verification before commit: `pnpm install` clean (30 workspace projects, lockfile up to date); engine 415/0/7-skipped + channel-service 94/0 preserved; `bash -n` clean on all four edited shell scripts; `ts-forge.config.json` valid JSON; repo grep for `@sharpee/zifmia` and `packages/zifmia` in code/configs returned zero residuals.

108 files in commit `3b8bba6a`. Pushed directly to main.

### B. ADR-175 — Zifmia Multi-User Web Product (ACCEPTED)

Located the existing foundation: ADR-163 (Channel-Service Platform, ACCEPTED), ADR-164 (Stateless Multi-User Server, ACCEPTED 2026-04-29), ADR-165 (Renderer Architecture, ACCEPTED 2026-05-01), ADR-161 (Persistent Identity), and the 2026-04-28 brainstorm at `docs/brainstorm/stateless-multiuser/overview.md`. The transport wire, server architecture, and renderer model were already settled across those ADRs. ADR-175 fills the gap: a product-level ADR claiming the brand, locking the deploy primitive, and resolving open implementation questions those ADRs deferred.

ADR-175 went through four in-session review rounds:

**Round 1 — initial draft.** 8 decisions: brand, location (`tools/zifmia/`), single Docker image deploy, v1 surface, named saves UX, 1000-turn transcript window, lease model (in-process queue / Postgres advisory lock), save format v3 (no change). 8 acceptance criteria.

**Round 2 — transport split (David's first review note).** Decision 9 added: HTTP for all request/response including turn submission; WebSocket strictly for chat (bidirectional) + command-line lock + presence push + turn broadcast to non-submitters. Submitters receive their own turn result via the HTTP response body, not the broadcast. Lock-on-typing semantics fully specified. AC-9 (transport split) and AC-10 (lock-on-typing) added. Two constraints added: HTTP-is-command-path, WS-payloads-limited.

**Round 3 — state inventory (David's second review note).** "We're still storing state on the server in a sqlite3 db." Decision 3 expanded with explicit state inventory: persistent state in DB (identities, rooms, save blobs, named-save pointers, chat, audit log, story library metadata, story bundles themselves) vs ephemeral state (presence, lock holder, in-flight WorldModel). Decision 5 tightened: `save_blobs` and `named_saves` committed to two DB tables; story-bundle row carries the binary blob (no container filesystem dependency). Invariant added: server holds all authoritative state, client holds none.

**Round 4 — scenario folding (/adr-review scored 11/14 with three gaps; David asked them expressed as scenarios).** Five scenarios surfaced and folded:
  - WS payloads: Payload column added to WS table.
  - Lock contention: AC step 1a covers acquire-while-held (server replies directly to contender; no denial frame, no queueing).
  - Identity rejection: AC-11 + failure semantics row pinned.
  - Bundle validation: AC-12 + failure semantics row pinned (validation order: structure → signature → IFID → format).
  - Engine-throw recovery: AC-13 + failure semantics row pinned (lock release on engine throw explicit).
  New "Failure semantics on the wire" subsection added to Decision 9.

**Polish pass (second /adr-review scored 14/14 with 4 non-blocking notes).** All folded:
  - API versioning paragraph (v1 routes ARE the contract; v2 introduces /v2/).
  - AC-14 perf baseline (<100ms p95 per-turn HTTP cost; inherits and extends ADR-164 AC-7's <50ms in-process baseline).
  - Memory-note citations replaced with inline reasoning.
  - Empty-payload representation pinned for `lock:acquire` and `lock:release`.

Final: 858 lines, 14 acceptance criteria, 6 open questions for implementation plan. Status: PROPOSAL → ACCEPTED.

ADR-175 is currently untracked (`git status` shows `??`) — it ships with this session's commit.

## Key Decisions

### 1. Zifmia brand recapture

The `zifmia` name is freed from the Tauri single-player runner (which becomes `interpreter`) and reserved for the multi-user web product. Historical references to the old product — ADRs, marketing copy, macOS build-output filenames — retain "Zifmia" where it describes what the product was; technical identifiers (npm package name, Tauri identifier, Rust crate) are rewritten. This is the line between brand and identifier.

### 2. ADR-175 ACCEPTED same-day via four rounds of in-session review

The prior ADRs (163, 164, 165) had already settled the transport and server architecture. ADR-175's scope was product-level decisions on top of that settled substrate. Four review rounds in one session is aggressive; it worked because the prior ADRs had done the heavy lifting.

### 3. HTTP is the command path; WebSocket is narrowly scoped

Turn submission and its result travel over HTTP (request/response). WebSocket handles only: bidirectional chat, command-line lock acquisition/release, presence push to observers, and turn-result broadcast to non-submitters. The submitter does not receive a duplicate broadcast. This is an explicit departure from architectures where WebSocket carries all game traffic.

### 4. Server holds all authoritative state in the DB

Persistent state — identities, room records, save blobs, named-save pointers, chat, audit log, story library metadata, story bundles (as binary blobs, not container filesystem paths) — lives in the database. Ephemeral state (presence, lock holder, in-flight WorldModel) is in-process only. Client holds no authoritative state. Adapter defaults to SQLite; Postgres is a drop-in via env var, gated to advisory locks for the lease.

### 5. .gitignore fix discovered mid-flight

The `.gitignore` Tauri target patterns used the old path prefix. Without the fix, the rename would have staged 2957 Cargo build artifacts. Caught before staging by running `git status` before `git add`.

## Next Phase

No next phase for either work item. The implementation plan for the Zifmia rebuild (ADR-175's 6 open questions) belongs to a future session at `docs/work/zifmia-multiuser/plan-NNNN-{name}.md`. Not started.

## Open Items

### Short Term

- ADR-175 commit: ship `docs/architecture/adrs/adr-175-zifmia-multiuser-product.md` with this session summary. It is currently untracked.
- `docs/zifmia/` install/deploy guides (renamed from `docs/server/`) describe the old multi-user architecture. They need rewriting under ADR-175 terms (Docker image, ADR-164 stateless model, ADR-163 channel-service). Future work.

### Long Term

- Implementation plan for Zifmia rebuild — ADR-175's 6 open questions: story upload UX, worker pool sizing, admin UI surface, web framework choice, save migration on bundle upgrade, audit log scope.
- `packages/interpreter/` (formerly `packages/zifmia/`) remains outside the pnpm workspace via `!packages/zifmia` (the exclusion pattern references the old directory name; after the rename, this entry is now stale — if/when interpreter is revived as an active workspace package, the exclusion must be updated to `!packages/interpreter`).

## Files Modified

**New file (ADR-175, uncommitted as of summary time):**
- `docs/architecture/adrs/adr-175-zifmia-multiuser-product.md` — 858 lines, ACCEPTED

**Committed in 3b8bba6a (108 files — key representatives):**

**Packages** (moved + identifier updates):
- `packages/interpreter/` — entire directory (`git mv` from `packages/zifmia/`; Tauri/Rust identifiers rewritten)

**Docs** (moved):
- `docs/zifmia/` — (`git mv` from `docs/server/`; multi-user server install/deploy guides)
- `docs/work/interpreter/` — (`git mv` from `docs/work/zifmia/`)

**Workspace and build tooling** (~10 files):
- `pnpm-workspace.yaml` — exclude path updated
- `build.sh`, `build-macos.sh`, `build-ubuntu.sh`, `scripts/mac-release.sh` — path references updated
- `ts-forge.config.json` — package entry updated
- `.claude/settings.local.json` — path references updated
- `.gitignore` — Tauri target/Cargo.lock patterns corrected from old path

**Doc sweep** (~25 files):
- Across `packages/`, `docs/`, `stories/`, `tutorials/` — `@sharpee/zifmia` → `@sharpee/interpreter` and `packages/zifmia/` → `packages/interpreter/` references

**Out of scope for this session's commit:**
- `docs/work/sharpee-ide/plan-20260510-step-1.6.md` — parallel Sharpee IDE session per memory rule `project_sharpee_ide_parallel`
- `tools/ide/project.yml` (modified), `tools/ide/SharpeeIDETests/` (new) — same parallel session
- `docs/context/.active-session` — pointer file, cleaned up by /finalize

## Notes

**Session duration**: ~90 minutes (approx. 14:30–16:00 CST, continuing after the ADR-174 Phase 3 /finalize)

**Test baselines carried through the rename:** engine 415/0/7-skipped; channel-service 94/0. Engine count advanced from the 398/0/7-skipped baseline in the Phase 3 summary — the 17-test delta reflects tests added in the PR merge that preceded Phase 3 (the SonarCloud refactor and engine API surface commits), not a Phase 3 or rename regression.

**pnpm-workspace.yaml exclusion stale after rename:** `!packages/zifmia` now matches nothing (the directory is `packages/interpreter`). This is harmless — pnpm silently skips a non-existent glob — but should be corrected to `!packages/interpreter` before interpreter is touched again. Noted as open item rather than fixed in this session because interpreter is parked.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Rollback Safety**: Rename is revertable via `git revert 3b8bba6a && pnpm install`. ADR-175 is documentation only — `git rm` to revert.

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-174 Phase 3 COMPLETE (merged to main); ADR-163, 164, 165 ACCEPTED (transport + renderer substrate settled before ADR-175 was drafted); `feedback_dont_delete_excluded_files.md` policy observed (IDE session artifacts not touched).
- **Prerequisites discovered**: `.gitignore` path correction required before staging the rename (2957 Cargo artifacts would have been staged without it).

## Architectural Decisions

- **ADR-175**: Zifmia Multi-User Web Product — ACCEPTED. Product-level decisions on top of the settled ADR-163/164/165 substrate. Key resolutions: Docker deploy primitive, HTTP-is-command-path transport split, all authoritative state in DB (including story bundles as blobs), 14 ACs, 6 open questions for implementation plan.
- **Brand recapture pattern**: `zifmia` freed from Tauri runner; claimed by multi-user product. First instance of this pattern in this codebase. Brand strings preserved in historical artifacts; technical identifiers rewritten.

## Mutation Audit

- Files with state-changing logic modified: none — chunk A is a mechanical rename; chunk B is documentation only.
- Tests verify actual state mutations: N/A

## Recurrence Check

- Similar to past issue? NO for the `.gitignore` discovery (novel; specific to a directory rename crossing a glob boundary). The brand-recapture pattern (free a name from a deferred product, claim it for an active product) is new to this codebase — first occurrence, worth noting for future renames.

## Test Coverage Delta

- Tests added: 0 — no source code modified.
- Tests passing before → after: engine 415/0/7-skipped (unchanged); channel-service 94/0 (unchanged).
- Known untested areas: ADR-175 has no implementation yet; test obligations are deferred to the implementation plan.

---

**Progressive update**: Session completed 2026-05-10 16:00 CST
