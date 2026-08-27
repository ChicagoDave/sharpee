# Session Summary: 2026-08-27 - feat/adr-321-world-index (2026-08-27 02:11 CDT)

## Goals
- Run a full `/doctor` Claude Code setup health check (10 diagnostic checks).
- Apply the cleanup the user approved from that diagnostic.

This session was NOT ADR-327 Phase 5 work — no plan phase was advanced. It is a harness-maintenance session on top of an in-progress feature branch.

## Phase Context
- **Plan**: `docs/work/adr-327-explicit-references/plan.md` — "explicit references" grammar/loader/player-role migration (ADR-327). Plan Status: ACTIVE.
- **Phase executed**: None — this session did not touch the plan. Phase 5 ("Paper trail — ADR supersession flips, docs, and the final regression gate") remains PENDING, as it was before this session.
- **Tool calls used**: 68 (no phase budget applies — no phase was executed).
- **Phase outcome**: N/A — no phase entered.

## Completed

### /doctor diagnostic (read-only, 10 checks)
- Scan window: 50 most-recent session transcripts, 2026-08-21 to 2026-08-27 (6 days), across 4 project dirs (sharpee 35, mingle 10, home 3, devarch 2).
- Clean findings needing no action: Auto mode is already the user-scope default permission mode with nothing shadowing it; Claude Code 2.1.247 is latest on the `latest` channel (autoUpdates deliberately false); hooks are fast (373 runs, zero timeouts, worst case 521ms); only 10 tool denials in 6 days, none repeated, none worth pre-approving; no local CLAUDE.md files exist to dedup; all 10 user agent definitions, 20 SKILL.md frontmatter blocks, and 5 settings files parse cleanly.
- Findings left for the user to action manually (not applied): stale npm-global Claude Code v2.1.126 at `/usr/local/lib/node_modules/@anthropic-ai/claude-code` (root-owned, inert today but a PATH-fallback risk; needs `sudo` to remove); three unused/unauthenticated claude.ai connectors (Gmail, Google Calendar, Google Drive) to disable via `/mcp`; the `xcode` MCP server failed to connect this session (CONNECTION_CLOSED) — recommendation was fix-not-disable given active Chord Writer/IDE work.

### Context-budget cleanup (applied)
- `CLAUDE.md`: 16,063 → 13,506 chars (est. -639 resident tokens/session). Removed five derivable path pointers under "Key Locations" (Traits/Behaviors/Actions/ADRs/Work tracking), kept the API Reference pointer; moved build-command detail out to a new skill while keeping the two-CLI rule, the "`pnpm build` is NOT a substitute for `tsf build`" gotcha, and the "always use `dist/cli/sharpee.js`" line in place; replaced the Async Communication command block with a skill pointer.
- `stories/dungeo/CLAUDE.md`: 6,329 → 5,980 chars (est. -87 tokens when working under that dir). Replaced a 19-line ASCII `src/` tree with four lines naming the organizing principle (geography over kind) that `ls` cannot convey.
- New `.claude/skills/repokit-build/SKILL.md`: cold-start bootstrap, full `./repokit` command/flag reference, build outputs, version-stamping rules, retired-zifmia note.
- New `.claude/skills/async-question/SKILL.md`: the GitHub-issue + ntfy + poll workflow for asking David a question while he is away.
- Net always-resident saving: ~502 est. tokens/session (the two new skill listing entries add back ~137 est. tokens).

## Key Decisions

### 1. DEVARCH.md stays as-is — user ruling, recorded to memory
DEVARCH.md (~/.devarch/DEVARCH.md, 33,131 chars / ~8,282 est. tokens, imported by root CLAUDE.md) is 71% of always-loaded context after the CLAUDE.md trims. This was reported to the user as a fact with no proposal attached. David ruled: "devarch is my harness and always remains." This has been written to Claude's persistent memory so it is never raised again. Not an ADR — a harness preference, not a repo architecture decision.

### 2. Plan-gate behavior confirmed correct
The DevArch plan gate (rule 1) blocked the first Edit mid-apply because session-start steps had not yet run. The steps were then completed in order (previous session file read, `pre-session-audit` run and relayed verbatim, project-profile confirmed 4 days old and current, `docs/core-concepts/README.md` read in full) and the gate cleared before editing resumed. No change made — recorded as confirmation the gate is working as designed.

## Next Phase
- **Phase 5**: "Paper trail — ADR supersession flips, docs, and the final regression gate" (D6, Acceptance item 4) — status PENDING, unchanged by this session.
- **Tier**: not yet assigned in the plan for Phase 5.
- **Entry state**: Phases 1–4 are DONE (chord grammar, story-loader actor consultation, player role, corpus migration sweep — commits e822b1, 56856a, and this branch's c4cea87e/0eb0f076/e0ebc947). Phase 5 is unblocked and ready to start whenever picked up; nothing in this session changes its readiness.

## Open Items

### Short Term
- User to manually remove stale npm-global Claude Code v2.1.126 (`sudo rm` + symlink cleanup) and disable the three unused claude.ai connectors via `/mcp`.
- `xcode` MCP server needs reconnection/repair — failed with CONNECTION_CLOSED this session; relevant to active Chord Writer/IDE work.

### Long Term
- `docs/work/adr-294-rebuild/plan.md` and `docs/work/zoo-chain/plan.md` still lack a machine-readable `**Plan Status**:` field (heading-only status) — flagged by `pre-session-audit` in four sessions running now, still unaddressed.

## Files Modified

**Context-budget trims** (2 files):
- `CLAUDE.md` - removed derivable path pointers, moved build-command detail to a skill, replaced async-comms block with a pointer
- `stories/dungeo/CLAUDE.md` - replaced an ASCII directory tree with the organizing principle it existed to convey

**New skills** (2 files):
- `.claude/skills/repokit-build/SKILL.md` - cold-start bootstrap + `./repokit` command/flag reference
- `.claude/skills/async-question/SKILL.md` - GitHub-issue + ntfy + poll workflow for async questions

## Notes

**Session duration**: single focused pass, ~68 tool calls.

**Approach**: Read-only `/doctor` diagnostic first, findings presented to the user, then only the user-approved cleanup subset applied as working-tree edits (uncommitted at session end).

**Correction to `pre-session-audit` output this session**: the audit reported ADR-327 Phases 3–4 as "not yet committed"; this was stale — they are committed as `c4cea87e` and the tree was clean at session start.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — all changes are uncommitted working-tree edits (2 modified files, 2 new untracked files), nothing pushed.

## Dependency/Prerequisite Check

- **Prerequisites met**: Session-start steps (previous-session recap, `pre-session-audit`, project-profile freshness check, core-concepts read) completed before the first edit, satisfying the plan gate.
- **Prerequisites discovered**: None.

## Architectural Decisions

- None this session — the DEVARCH.md-size ruling (Key Decisions #1) is a harness preference recorded to memory, explicitly not an ADR.

## Mutation Audit

- Files with state-changing logic modified: None — all changes are documentation/config (CLAUDE.md trims, new SKILL.md files).
- Tests verify actual state mutations (not just events): N/A
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — this is the first `/doctor` run session recorded; the stale-`Plan Status`-field finding on `adr-294-rebuild` and `zoo-chain` is a known recurring item (see Open Items — Long Term) but is unrelated to this session's own work.

## Test Coverage Delta

- Tests added: 0
- Tests passing before: N/A → after: N/A (no test changes this session)
- Known untested areas: N/A — no code changes, documentation/config only.

---

**Progressive update**: Session completed 2026-08-27 02:11 CDT (local)
