# Session Summary: 2026-04-25 - main (multiuser discovery + design)

## Goals
- Confirm Phase 4 (ADR-153) completion status after the lang-articles (ADR-158) branch work shipped.
- Surface the architectural gap in the multiuser system: "re-accessing a room" was an undesigned promise.
- Design identity and engine-state continuity as two independent ADRs.
- Produce ADR-159 (Persistent User Identity) and ADR-160 (Engine-State Continuity) as reviewable proposals.

## Phase Context

- **Plan**: No active plan for multiuser at session start; discovery session surfaced the next design unit.
- **Phase executed**: Pre-planning design — discovery, gap analysis, decision-making, ADR authoring.
- **Tool calls used**: N/A (design session; no .session-state.json budget tracked).
- **Phase outcome**: Fully completed on intent — two PROPOSAL-status ADRs authored; implementation planning deferred to next session.

## Completed

### Phase 4 Status Verification

Reviewed git history and confirmed Phase 4 (ADR-153) acceptance gate is fully GREEN:

- `2364db85` — ADR-153 Phase 4: 5/5 acceptance criteria flipped GREEN against real Deno + engine + bundle (AC-4R.1).
- `da8cf6df` — Sub-phase 4-R-3: stub apparatus stripped (AC-4R.3, 4R.4, 4R.5).
- `c3a07d10` — AC-4R.2 closed: Docker + live UX, real dungeon opening text on play.sharpee.net.
- `e5dd4034` — Synthesis session wrote ADR-153a (amendments), ADR-155 (install-time story bundler), ADR-156 (browser client). Pure docs.
- `deno-entry.ts` is 314 lines of production code (not the 85-line Phase 0 stub).

Earlier orientation that flagged Phase 4 as incomplete was incorrect and is now corrected.

### Gap Identification: "Re-Accessing a Room"

Surfaced the architectural gap: the system has no design for *"come back to a room you joined before."* This promise is entangled around two independent problems:

1. **Identity continuity** — losing localStorage (different device, cleared cookies, incognito, email-link-on-phone) creates a brand-new participant. No reclaim, no recovery, no "where have I been."
2. **Engine-state continuity** — even with identity solved, sandbox respawn happens at turn 0. The `session_events` log captures transcript text only; engine state (world model, NPC positions, fuses, flags, inventory) is in-memory and dies with the sandbox process.

Identified that the two problems are independently designable but mutually necessary:
- Identity without engine continuity: "you got your seat back in an empty world."
- Engine continuity without identity: "the world is intact but you're a stranger to it."
- Identity is the precondition; it ships first.

### ADR-159: Persistent User Identity (committed as `1d4bbb74`)

Full design Q&A converged on these decisions:

- Identity shape: `(username, identity_id, secret)` triple. `identity_id` is the DB PK (server-generated UUIDv4). `secret` is the credential (server-generated UUIDv4, never stored plaintext). `username` is what participants see.
- No email, no password reset, no account recovery support burden. Lost secret = lost identity, explicitly documented.
- Username scope: globally unique, DB constraint, case-insensitive uniqueness, original case preserved for display.
- Hash: argon2id via the Node `argon2` package. Default parameters acceptable for v1.
- Username constraints: 3–32 chars, `[A-Za-z0-9_-]+`, case-insensitive uniqueness.
- Rate limiting: per-IP throttle, 10 attempts/minute on create + reclaim endpoints.
- Identity deletion: admin script only; no runtime UI in v1.
- Cross-device transfer: copy-to-clipboard + `.identity.json` download; QR future.
- WS hello frame changes from `(participant_token)` to `(username, secret)`.
- Two-phase migration: Phase 1 additive (old token still works); Phase 2 deprecation window.
- 8 acceptance criteria defined.

### ADR-160: Engine-State Continuity (drafted, uncommitted at session end)

Design space: three options considered.
- **Option 1 (adopted)**: Auto-save after every completed turn + auto-restore on spawn. Reuses existing SAVE/RESTORE wire protocol. No engine API changes.
- **Option 2 (rejected)**: Replay `session_events` — non-deterministic, O(N) replay cost, daemon/fuse time problem, output-block authority conflict.
- **Option 3 (rejected)**: Continuous state deltas / event sourcing — cleanest semantics; disproportionate v1 cost; no delta-emit hook in engine today.

Decisions made:
- Auto-save after every completed `OUTPUT` frame, server-triggered.
- Throttle: max one auto-save in-flight per room; default 250ms threshold; intermediates dropped, latest wins.
- `saves` table gains `kind` ('manual'|'auto') and `format_version` columns via additive migration; existing rows backfilled to `kind='manual'`, `format_version=NULL`.
- `READY` frame from sandbox gains a required `format_version` field.
- Retention: last 3 auto-saves per room; manual saves never pruned.
- Format-version mismatch: skip RESTORE, log WARN, append notice to next welcome ("story has been updated; this room has been reset").
- Corruption fallback: try N, N-1, N-2 auto-saves; all fail → fresh boot with logged failure.
- Auto-restore is synchronous between sandbox `READY` and first welcome frame — connecting client always sees post-restore state.
- 10 acceptance criteria defined.

## Key Decisions

### 1. Phase 4 is Complete

The root-assessment §8 framing ("after AC-4R.2 closes…") is satisfied by `c3a07d10`. All pending work is framed as post-Phase-4 features, not Phase 4 completions.

### 2. "Re-Accessing a Room" Is Two Layered Problems

Not a single feature. Identity continuity and engine-state continuity are independently designable but mutually necessary for the user-facing promise. Splitting into two ADRs allows independent review, implementation, and shipping.

### 3. Identity Ships First

ADR-160 takes identity as given. The implementation sequence is: ADR-159 identity layer → ADR-160 auto-save loop. Engine-state continuity without identity is usable by nobody the system can recognize.

### 4. No Email, No Login, No Password Reset

User-managed secret with an explicit "save this — we cannot recover it" gate at creation. Lost secret = lost identity. Acceptable for the IF community audience; no email infrastructure, no GDPR surface, no recovery support burden.

### 5. Globally Unique Usernames — Squatting Acknowledged

First-mover keeps their username forever. No mediation, no claims process, no reset. Deliberate trade for simplicity. Community-policeable; if it becomes a real problem, a future ADR adds reservation policy.

### 6. Auto-Save + Auto-Restore via Existing Engine Machinery

No engine API changes required for v1. Single new wire field (`format_version` on `READY`). The server is a new caller of the existing SAVE/RESTORE protocol — the sandbox sees no difference from a user-initiated save.

## Next Phase

- **Commit ADR-160** and this session summary; push both ADRs to origin/main.
- **Write implementation plan for ADR-159**: server-side (schema migration, identity routes, hash service, WS hello frame change); client-side (identity-creation flow, reclaim flow, "show my identity" panel per ADR-156 amendment).
- **Write implementation plan for ADR-160**: server-side (schema migration, auto-save loop in room-manager, auto-restore in spawnFor); sandbox-side (READY format_version field).
- **ADR-156 amendment**: add a section consuming both new ADRs in the browser client UI plan.

## Open Items

### Short Term
- Commit ADR-160 (currently only drafted locally, not in the commit log).
- Push both ADR-159 and ADR-160 to origin/main.
- Write implementation plans for both ADRs before starting any code.
- Amend ADR-156 to reference ADR-159 (identity creation/reclaim UI) and ADR-160 (no client impact, but architectural linkage).

### Long Term
- QR-code rendering for cross-device identity transfer (client-only, no server work; noted in ADR-159 as "future").
- Dormant-identity reclamation policy if username squatting becomes a real problem.
- Continuous state deltas / event sourcing (Option 3) if auto-save proves insufficient — not foreclosed by ADR-160.
- "Delete my identity" runtime UI for users (admin-script-only in v1).
- SQLite BLOB storage monitoring — if room save blobs approach 1MB, move to filesystem + path reference.
- Manual save export / share / transfer between rooms (must respect `kind` distinction per ADR-160 consequences).

## Files Modified

**New Architecture Docs** (2 files):
- `docs/architecture/adrs/adr-159-persistent-user-identity.md` — NEW, committed in `1d4bbb74`; 182 lines; PROPOSAL status
- `docs/architecture/adrs/adr-160-engine-state-continuity.md` — NEW, drafted but uncommitted at session end; 229 lines; PROPOSAL status

**No code changes this session.**

## Notes

**Session duration**: ~2–3 hours (design and Q&A)

**Approach**: Discovery-first. Confirmed existing phase status before designing new work. Decomposed a single user-facing promise ("come back to a room you joined before") into its layered technical components, then designed each independently. ADR authoring interleaved with decision Q&A so rationale is captured at the moment of decision.

---

## Session Metadata

- **Status**: INCOMPLETE
- **Blocker**: Design complete — ADR-160 uncommitted; implementation plans not yet written; no code written for either ADR.
- **Blocker Category**: Architecture
- **Estimated Remaining**: ~2 sessions for implementation planning (ADR-159 plan + ADR-160 plan + ADR-156 amendment); then multiple implementation sessions for each ADR.
- **Rollback Safety**: safe to revert (no code changes; ADR-159 committed is additive documentation)

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-153 Phase 4 confirmed complete; SAVE/RESTORE wire protocol already in place in deno-entry.ts; `saves` table exists with the shape both ADRs extend; ADR-155 bundle versioning provides the story-version signal ADR-160 needs for format-version mismatch detection.
- **Prerequisites discovered**: ADR-156 (browser client) needs an amendment section before client-side identity UI work can begin; that amendment is unwritten.

## Architectural Decisions

- [ADR-159]: Persistent User Identity — username+identity_id+secret triple; no email; argon2id; globally unique usernames; two-phase migration.
- [ADR-160]: Engine-State Continuity — auto-save per turn via existing SAVE/RESTORE machinery; 3-save retention; format_version handshake on READY frame; synchronous restore between READY and first welcome frame.
- Pattern applied: ADR splitting — one user-facing promise decomposed into two independently reviewable and shippable ADRs with a defined dependency order (identity ships first).

## Mutation Audit

- Files with state-changing logic modified: None (design session only).
- Tests verify actual state mutations (not just events): N/A
- No code changes this session.

## Recurrence Check

- Similar to past issue? Uncertain — the failure to design "re-accessing a room" before Phase 4 shipped is structurally similar to the ISSUE-074 / ADR-157 pattern (migration audit that documented the gap only after the behavior diverged). Not a code regression, but the same class of "implicit promise that wasn't in scope when the phase was defined."

## Test Coverage Delta

- No test changes this session.
- Known untested areas: All ADR-159 and ADR-160 acceptance criteria — 8 + 10 = 18 criteria, none yet covered.

---

**Progressive update**: Session completed 2026-04-25 (CST)
