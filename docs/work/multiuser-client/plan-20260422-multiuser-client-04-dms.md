# Plan 04 — Direct Messages (PH ↔ Co-Host)

**Project**: Multi-user Browser Client (ADR-153 frontend)
**Target branch**: `main`
**Date**: 2026-04-22
**Brainstorm**: `docs/brainstorm/multiuser-client/overview.md`
**Depends on**: Plan 01 (foundation), Plan 02 (chat infrastructure). Plan 03 is independent.

This is Plan 04 of five. See the brainstorm overview for the full carving.

---

## Goal

Implement the DM axis specified by ADR-153 Decision 8: direct messages exist **only** between the Primary Host and Co-Hosts, on a 1:1 axis. No Co-Host ↔ Co-Host DMs. No Participant or Command Entrant DMs. Participants and Command Entrants do not see DM affordances at all.

This is the largest UX-only plan and the only one in the five that expands the right-side panel's information architecture by introducing tabs.

---

## Scope

### In scope

- **Tab system in the right-side panel**: Room chat is tab 1 (always). Additional tabs per DM thread.
- **PH view**: one lazy tab per Co-Host they have an active DM thread with. First DM sent by the PH *creates* the tab. Tab is labeled with the Co-Host's display name. Unread count badge on tabs the user hasn't viewed since the last message arrived.
- **Co-Host view**: exactly one additional tab labeled "Primary Host" (or the PH's display name). Lazy: the tab appears when the first DM is exchanged either way.
- **Participant / Command Entrant view**: no tabs. No DM affordances anywhere. The room-chat panel looks exactly as it does today (Plan 01 + 02).
- **DM persistence**: server already logs DMs in `session_events`. On reconnect, welcome snapshot includes DM history for the participant's entitled threads.
- **Unread counts**: tab badges with numeric count of unread DMs since last viewed.
- **Tab-closed state**: PH-only — can the PH close a DM tab? Default: no (keeps the audit trail visible), but a `[x]` with confirm is reasonable. Open question in Plan 04 Phase 1.

### Out of scope

- **Co-Host ↔ Co-Host DMs** — ADR-153 explicitly forbids; do not implement even as a stub.
- **Ephemeral / disappearing DMs** — not in MVP; ADR-153's recording-transparency rule covers DMs explicitly.
- **DM edit / redaction** — not in MVP.
- **DM attachments / images** — not in MVP (text only).
- **@mentions, reactions, formatting** — same carve as room chat.

### Explicit non-goals

- No feature to opt out of DMs. Hosts can ignore, but the channel exists structurally.
- No "read receipts" per message.

---

## Dependencies and Prerequisites

- Plan 01 complete (foundation).
- Plan 02 complete (chat infrastructure — tab layout reuses ChatPanel for each tab).
- Server already handles `dm` ClientMsg and broadcasts `dm` ServerMsg to the correct participants (see `tools/server/src/ws/handlers/dm.ts`).
- Server enforces the PH↔Co-Host axis — client never attempts a DM between disallowed tiers, but server is the backstop.

---

## Phases

### Phase 1 — Tab system in the right-side panel

**Goal**: extract the existing chat panel into a generic tabbed container. One tab ("Room") for the room chat. Infrastructure for adding/switching/closing tabs in place; no DM tabs yet.

**Files**:
- `tools/server/client/src/components/SidePanelTabs.tsx` (NEW) — tab strip at the top of the right panel. Renders the active tab's body in the area below.
- `tools/server/client/src/components/ChatPanel.tsx` — refactored to become one kind of tab body (instead of owning the panel). Panel chrome moves out.
- `tools/server/client/src/state/roomReducer.ts` — `activeTab` and `tabs: TabDef[]` in RoomState. Initial: `tabs = [{kind: 'room'}]`, `activeTab = 'room'`.
- `tools/server/client/src/state/types.ts` — `TabDef` union (`{kind: 'room'} | {kind: 'dm', peerParticipantId: string}`).

**Definition of Done**:
- Right panel renders exactly as in Plan 02 (room chat), but the chrome is now tabbed with one tab ("Room"). Visual regression against Plan 02 should be negligible — tab strip adds ~36px to the top of the panel.

**Tests**:
- `SidePanelTabs.test.tsx` — single tab, active-tab state.
- `roomReducer.test.ts` — initial tab state.

---

### Phase 2 — DM tabs per threading axis

**Goal**: DM tabs appear lazily. PH: one per Co-Host after the first message. Co-Host: a single PH tab after the first message.

**Files**:
- `tools/server/client/src/state/roomReducer.ts` — handle incoming `dm` ServerMsg:
  - Determine the thread peer (for PH: the other party; for Co-Host: the PH).
  - If no tab exists for that peer, append one.
  - Append the message to the thread's backlog.
  - If the tab is not the active tab, increment its unread count.
- `tools/server/client/src/components/DmPanel.tsx` (NEW) — tab body. Identical shape to ChatPanel (author + body + timestamp), but messages are from the DM thread; sending emits `dm` with the peer's participant_id.
- `tools/server/client/src/components/SidePanelTabs.tsx` — render DM tabs after the Room tab. Label: peer's display name (PH view) or "Primary Host" (Co-Host view — pick one label; default: PH's display name).
- `tools/server/client/src/components/ParticipantRoster.tsx` — on right-click or a "DM" menu item (PH-only, for each Co-Host), open an empty DM tab with that peer (doesn't send anything until the user types).
- `tools/server/client/src/api/ws.ts` — `sendDm(peer_id, text)`.
- `tools/server/client/src/state/types.ts` — `dmThreads: Record<participant_id, DmEntry[]>` in RoomState.

**Authority / visibility logic**:
- Reducer drops incoming `dm` ServerMsgs that the local user is not entitled to see (server should never send them, but defensive drop).
- Participants and CEs never create DM tabs. The dm handlers simply no-op on receive (no unreads, no tabs).

**Definition of Done**:
- PH sends "hey" to Alice (Co-Host) → both see a new tab labeled "Alice" (PH view) and "Primary Host" or "Dave" (Alice's view).
- Subsequent DMs append to the thread, not the room chat.
- Bob (Participant) sees nothing unusual. No DM tab. His room-chat view is unchanged.

**Tests**:
- `roomReducer.test.ts` — `dm` ServerMsg creates tab on first message; appends on subsequent; unread count increments when tab is not active.
- `DmPanel.test.tsx` — renders thread messages; sending emits `dm` with the right peer_id.

---

### Phase 3 — Unread counts

**Goal**: tab badges show unread DM counts. Switching to a tab clears its unread counter. The counter is a small pill after the tab label.

**Boundary discipline (revised 2026-04-23)**: An earlier draft proposed lifting `activeTabId` and `openedDmPeers` into `RoomState` and widening the reducer to accept a general `UiAction` union alongside `ServerMsg`. That was wrong: `RoomState` is documented as the projection of authoritative server state, and "which tab is active" is a per-browser UI fact. Two clients in the same room can — and do — have different active tabs. Mixing those concerns would (a) break the "no React types in `state/`" promise documented at the top of `state/types.ts`, (b) corrupt the exhaustiveness guard on `ServerMsg`, and (c) put per-browser state into a shape that's supposed to mean "shared truth."

The split below keeps each concern on the side of the boundary it belongs to.

**What lives where**:

| Concern | Owner | Rationale |
|---|---|---|
| `dmReadCursors: Record<peerId, lastReadEventId>` | `RoomState` (reducer) | Derived projection of incoming `dm` ServerMsgs. Computing unread = `messages.filter(m => m.event_id > cursor).length` is a pure read of server state. |
| `activeTabId`, `openedDmPeers` | `Room.tsx` local `useState` | Per-browser UI affordance. No server analogue. |
| Cursor advances on tab activation | Component dispatches a single, narrowly-scoped action | Keeps the reducer's input vocabulary almost entirely server-driven; the one synthetic action is explicitly named for what it represents. |

**Reducer surface change** (the *only* widening):
- Reducer signature becomes `roomReducer(state, action: ServerMsg | DmReadAck)` where `DmReadAck = {kind: 'ui:dm_read', peer_participant_id: string, up_to_event_id: number}`.
- Exhaustiveness guard splits into two `switch`es internally — one for `ServerMsg` kinds (still exhaustive against the wire union), one for the small `ui:*` set. This preserves "the wire is fully handled" as a compile-time check without burying it.
- Welcome resets `dmReadCursors` to `{}` (per AC: reload zeroes unreads — every message in the rehydrated backlog is "already seen," so the cursor jumps to the latest `event_id` per thread on welcome).

**Files**:
- `tools/server/client/src/state/types.ts` — add `dmReadCursors: Record<string, number>` to `RoomState`; default `{}`. No tab-related fields added.
- `tools/server/client/src/state/roomReducer.ts` —
  - On welcome: set `dmReadCursors[peer]` to the max `event_id` in each thread's rehydrated backlog (zeroes unreads on reload).
  - On `dm` ServerMsg: no change to cursor logic here — the cursor only advances on user activation, never automatically.
  - New `ui:dm_read` action: advances `dmReadCursors[peer]` to `max(current, up_to_event_id)`.
- `tools/server/client/src/state/selectors.ts` (NEW) — `selectDmUnread(state, peerId): number` returns `messages.filter(m => m.event_id > (cursor ?? 0)).length`. Selector lives next to the state — pure function, no React types.
- `tools/server/client/src/pages/Room.tsx` — when `activeTabId` changes to `dm:<peerId>`, dispatch `ui:dm_read` with the latest event_id in that thread. `activeTabId` and `openedDmPeers` stay in local `useState` — Phase 1's structure is correct.
- `tools/server/client/src/components/SidePanelTabs.tsx` — already supports `unread` on `TabDescriptor` (Phase 1). No change.

**Out of scope (deliberately)**:
- A general `UiAction` discriminated union routed through the reducer. If a second `ui:*` action becomes necessary, revisit; do not pre-build the abstraction.
- Storing `activeTabId` in `RoomState`. It is local UI state.

**Definition of Done**:
- DMs arriving while a peer's tab is not active cause `selectDmUnread(state, peer) > 0`. Activating that tab dispatches `ui:dm_read` and the count returns to 0.
- Reload: welcome populates threads (Phase 4 land), cursors jump to latest event_ids, badges read 0.
- `RoomState` shape has no `activeTabId` field. `roomReducer` accepts `ServerMsg | DmReadAck` only — no general UI-action union.

**Tests**:
- `roomReducer.test.ts` —
  - `dm` ServerMsg arrives with no prior cursor → `selectDmUnread` = 1.
  - `ui:dm_read` with `up_to_event_id` advances cursor; subsequent `selectDmUnread` = 0 for messages at or below that id, > 0 for any newer.
  - Cursor never regresses: `ui:dm_read` with a smaller `up_to_event_id` than the current cursor is a no-op.
  - Welcome with rehydrated `dm_threads` (Phase 4 fixture) sets cursors to per-thread max `event_id`.
- `selectors.test.ts` (NEW) — `selectDmUnread` returns 0 for unknown peer, 0 when cursor ≥ all event_ids, count of strictly-greater events otherwise.

---

### Phase 4 — Persistence and backlog on reconnect

**Goal**: on reconnect, welcome snapshot includes DM backlog for threads the user is entitled to. Reducer re-hydrates from that.

**Files**:
- `tools/server/client/src/state/roomReducer.ts` — welcome-snapshot handling for DM threads. Assume server ships `RoomSnapshot.dm_threads` (or equivalent field — confirm at start of phase; if missing, file a small server gap).
- Server: **verify** that `room-snapshot.ts` on the server includes DM threads for the authorized participant. If not, this becomes a small server addendum — add to `tools/server/src/ws/room-snapshot.ts`.

**Definition of Done**:
- Reload → DM tab reappears with full backlog for the thread; unreads zeroed.
- Participant reloads → no DM tabs (they were never entitled).

**Tests**:
- `roomReducer.test.ts` — welcome with dm_threads populates state correctly.
- If server addendum needed: server test for snapshot filtering by participant entitlement.

---

### Phase 5 — DM moderation / recording reminder

**Goal**: reinforce ADR-153 Decision 11 — DMs are recorded and not private. A one-time notice appears above the DM tab body the first time the user views any DM tab, explaining this. Wording aligns with the recording-transparency notice shown on join (Plan 01 Phase 9).

**Files**:
- `tools/server/client/src/components/DmPanel.tsx` — render a dismissible notice at the top: "These messages are logged in the room's event log like any other. Hosts do not have a privacy channel."
- localStorage flag `sharpee.dm_notice_ack` (global, not per-room) so the notice shows once per browser, not per room.

**Definition of Done**:
- First DM view per browser shows the notice. Dismissing persists the acknowledgment.
- Subsequent sessions / rooms on the same browser do not re-show.

**Tests**:
- `DmPanel.test.tsx` — notice appears on first mount; storage set on acknowledge; subsequent mounts skip.

---

### Phase 6 — Verification

**Goal**: end-to-end exercise of the full DM flow.

**Activities**:
- 4-user room: PH (You), Alice (Co-Host), Bob (Command Entrant), Charlie (Participant).
- PH DMs Alice "test." Verify: PH sees a new "Alice" tab; Alice sees a new "Primary Host" tab with unread badge = 1.
- Alice clicks her tab. Unread clears. Alice replies "got it." PH sees unread = 1 on "Alice" tab.
- Bob (CE) and Charlie (P): verify no tabs appear. Right panel unchanged from Plan 02 state for both.
- Promote Bob to Co-Host. Verify: Bob's right panel gains the tab *system* (with just "Room" tab). PH's roster shows Bob is now a Co-Host; PH can DM Bob and a new tab appears on both sides.
- Demote Bob back to CE. Verify: Bob's existing DM tab with PH disappears (or archives — open question). PH's DM tab for Bob hides (or archives).

**Files**:
- `docs/work/multiuser-client/dm-verification-log.md` (NEW, optional).

**Definition of Done**:
- Full flow works. Any follow-ups filed.

---

## ADR-153 Decision Coverage

| Decision | Name | Phase |
|---|---|---|
| 8 | DMs on PH↔Co-Host axis only | Phases 1–4 |
| 11 | Recording transparency (covers DMs explicitly) | Phase 5 |
| 4 | Role hierarchy (DM visibility follows) | Phases 2, 6 |

---

## Acceptance Criteria Mapping

Plan 04 does not close any of the seven formal ADR-153 acceptance criteria. It fulfills Decision 8's spec, which is a commitment distinct from the AC list. Verification in Phase 6 acts as the informal gate.

---

## Phase Ordering

```
Phase 1 (Tabs)
  ↓
Phase 2 (DM tabs per axis)
  ↓
Phase 3 (Unread counts)
  ↓
Phase 4 (Persistence on reconnect)
  ↓
Phase 5 (DM recording notice)
  ↓
Phase 6 (Verification)
```

---

## Follow-on Plans

- **Plan 05** — polish.

---

## Open Questions

- **Tab label for Co-Hosts viewing the PH thread**: "Primary Host" (role-labeled, stable even if PH changes) or the PH's display name (more human, but changes on succession). Default: display name; revisit if succession causes confusion.
- **Closing DM tabs**: can the PH close one? Default: no. Archives on demote of the peer (tab hides; reappears if peer re-promoted). If PH explicitly wants an "archive" action, follow-up.
- **Unread counts across tiers**: if a Co-Host gets demoted and then re-promoted, does their DM history return with unread counts? Default: yes (server still has the history; client rehydrates on welcome).

---

## Estimation

| Phase | Size |
|---|---|
| 1 — Tab system | M (60–90 min) |
| 2 — DM tabs | L (90–120 min) |
| 3 — Unread counts | S |
| 4 — Persistence | M (possibly + small server addendum) |
| 5 — DM recording notice | S |
| 6 — Verification | S–M |

Total: ~4–6 working sessions.
