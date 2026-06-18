# @sharpee/zifmia

Multi-user web product for Sharpee. Room-governed server with stateless
per-turn engine execution, HTTP for the process, WebSocket for chat
and command-line sharing.

**Status: Phase 0 — scaffold only. No runtime code.**

## Design

The authoritative design is **ADR-177**:
[`docs/architecture/adrs/adr-177-multiuser-corrected.md`](../../docs/architecture/adrs/adr-177-multiuser-corrected.md)
(and the HTML version alongside it).

## Implementation Plan

Phases are sequenced in
[`docs/work/multiuser/plan-20260512-adr-177.md`](../../docs/work/multiuser/plan-20260512-adr-177.md).

- Phase 0 — location + scaffold (this commit)
- Phase 1 — identity (claim + erase + localStorage + unidentified lobby)
- Phase 2 — room CRUD + participants + tier enforcement + join-code resolver
- Phase 3 — WS handshake + chat + lock-on-typing + turn broadcast
- Phase 4 — succession + grace timer + recycle sweeper
- Phase 5 — saves + restore + session-event log + transcript backlog
- Phase 6 — pin / delete / mute / DMs + recording notice
- Phase 7 — full client UI
- Phase 8 — Playwright two-user E2E (AC-3 … AC-13)

## Relation to `tools/shite/`

`tools/shite/` is the Phase-6 build that diverged from ADR-175 design
intent, renamed 2026-05-12 as a parts bin. Reusable pieces
(channel-service wiring, LobbyManager DOM scaffold, CommandInputManager,
platform-browser renderer integration) may be lifted from there.
The room-governance layer is greenfield.

## Build

Built by devkit (ADR-180): `node packages/devkit/dist/cli.js build --zifmia`
→ `tools/zifmia/dist/`. (Replaces the reserved `-c zifmia` build.sh flag.)
