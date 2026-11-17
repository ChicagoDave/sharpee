# Plan 02 — Moderation, Chat, and Lifecycle

**Project**: Multi-user Browser Client (ADR-153 frontend)
**Target branch**: `main`
**Date**: 2026-04-22
**Brainstorm**: `docs/brainstorm/multiuser-client/overview.md`
**Depends on**: Plan 01 (foundation + AC1)

This is Plan 02 of five. See the brainstorm overview for the full carving.

---

## Goal

Stand up everything in the room view *except* save/restore (Plan 03) and DMs (Plan 04). That means:

- Room-wide chat (the primary differentiator over Discord-screenshare).
- Moderation controls: mute/unmute, promote/demote participant tiers.
- Primary Host settings panel: pin/unpin, rename title, nominate successor, delete room (type-to-confirm).
- Lifecycle UX: PH-grace countdown, auto-promotion toast, room-closed banner on delete/recycle.

Closes ADR-153 **AC3** (PH succession), **AC4** (room delete cascade), **AC5** (mute visibility), and completes AC6 client-side (landing already hides idle rooms per Plan 01 Phase 2).

---

## Scope

### In scope

- **Chat**: message list, input, per-tier author styling, persistence across reconnect (server sends backlog on welcome snapshot).
- **Mute / unmute**: Co-Host+ can toggle; muted users' chat-send fails with inline error; mute state persists across reconnect.
- **Promote / demote**: PH can set any participant to any tier; Co-Host can promote Participants to Command Entrant but cannot touch other Co-Hosts or the PH.
- **Pin / unpin**: PH-only; surfaces as a "pinned" indicator in the room header (already shown in the mockup).
- **Rename title**: PH-only; server validates same rules as Plan 01 (non-empty, ≤80 chars).
- **Nominate successor**: PH-only; forces a choice if multiple Co-Hosts exist (UI enforces via disabled-until-selected button per ADR-153 Decision 6).
- **Delete room**: PH-only; type-to-confirm by retyping the room title; broadcasts `room_closed` to all participants.
- **PH-grace countdown**: when PH disconnects, all participants see a 5-minute countdown banner.
- **Auto-promotion notice**: when the grace expires and a Co-Host is promoted, everyone sees a toast: "Alice is now the Primary Host." Original PH rejoining sees "You are now a Participant."
- **Room-closed banner**: on `room_closed` with reason = `deleted` or `recycled`, full-page banner explains, then redirects to `/` after a 5-second countdown.

### Out of scope (deferred)

- **DMs** — Plan 04 (tab system, per-Co-Host threads, unread counts).
- **Save/restore** — Plan 03.
- **Sandbox crash recovery UX** — Plan 03.

### Explicit non-goals

- No chat moderation beyond mute (no per-message delete, no chat history redaction). If a chat message is a problem, mute the author.
- No @mentions, no reactions, no formatting beyond plain text.
- No per-participant kick — the only "kick" primitive is demote-to-Participant then mute, or recycle the room.

---

## Dependencies and Prerequisites

- Plan 01 complete; AC1 passing.
- Server already handles `chat`, `mute`, `unmute`, `promote`, `demote`, `pin`, `unpin`, `delete_room`, `nominate_successor` client messages (see `tools/server/src/ws/handlers/` — all exist from the server's Phase 8–11 work).
- Server already broadcasts `chat`, `mute_state`, `role_change`, `successor`, `room_state`, `room_closed` (confirm in `tools/server/src/wire/browser-server.ts`).
- No new server work required. This plan is entirely client-side.

---

## Phases

### Phase 1 — Chat UI

**Goal**: the right-side chat panel (mockup: `02-room.html`) becomes functional. Messages render, input sends, reducer updates from `ServerMsg` kind `chat`.

**Files**:
- `tools/server/client/src/components/ChatPanel.tsx` (NEW) — messages + input. Matches mockup markup.
- `tools/server/client/src/components/ChatMessage.tsx` (NEW) — one message. Author coloring by tier (PH/CH/CE/Participant/self).
- `tools/server/client/src/components/ChatInput.tsx` (NEW) — enter-to-send; shows error state if server rejects (e.g. muted).
- `tools/server/client/src/state/roomReducer.ts` — flesh out `chat` handling beyond the Plan 01 stub. Append to `state.chatMessages`. Cap at a reasonable in-memory size (e.g. 500); older messages drop off (they still exist server-side, accessible via session event log — but MVP doesn't surface that).
- `tools/server/client/src/state/types.ts` — add `chatMessages: ChatEntry[]` to RoomState.

**Definition of Done**:
- Typing in the chat input and pressing Enter sends a `chat` message to the server and appears in the message list with the local user's styling.
- Other participants' messages appear with their tier coloring.
- Reconnect shows prior chat messages from the welcome-snapshot backlog.

**Behavior Statement** for `sendChat(text)`:
- **DOES**: emits `ClientMsg` kind `chat` with the input text over the WebSocket.
- **WHEN**: the user presses Enter in the chat input with non-empty text and is not muted.
- **BECAUSE**: room chat is the primary communication channel between participants.
- **REJECTS WHEN**: input is empty (no emit, no UI change); server responds with `error` kind `muted` (surface inline, clear input only on success).

**Tests**:
- `ChatPanel.test.tsx` — messages render in order; author coloring by tier.
- `ChatInput.test.tsx` — Enter sends; empty input doesn't send; error from server renders inline.
- `roomReducer.test.ts` — add cases for `chat` ServerMsg appending.

---

### Phase 2 — Mute / unmute controls

**Goal**: Co-Host+ can mute or unmute any non-PH participant via a roster-row action menu. Muted users see their chat input disabled with "You have been muted" text; the server rejects any chat-send attempt (already enforced server-side — client just respects the state).

**Files**:
- `tools/server/client/src/components/ParticipantMenu.tsx` (NEW) — context menu (button → dropdown) that appears on hover/click of a roster row when the local user has authority. Actions: Mute, Unmute, Promote, Demote (promote/demote wired in Phase 3).
- `tools/server/client/src/components/ParticipantRoster.tsx` — render menu trigger (⋮ icon) per row based on authority. Self-row never has a menu on the self.
- `tools/server/client/src/components/ChatInput.tsx` — disable input + show muted notice when `state.localMuted === true`.
- `tools/server/client/src/state/roomReducer.ts` — handle `mute_state` ServerMsg; flip the participant's `muted` flag and, if it's the local user, set `localMuted`.
- `tools/server/client/src/api/ws.ts` (NEW or existing) — helpers `sendMute(id)`, `sendUnmute(id)`.

**Authority logic**:
- PH can mute/unmute anyone except themselves.
- Co-Host can mute/unmute Participants and Command Entrants, not other Co-Hosts or the PH.
- Participant/CE: no menu shown.

**Definition of Done**:
- Muting a user across browsers works end-to-end: mute in A's browser → B's browser shows muted indicator in roster → B cannot chat → mute persists across B's reconnect.
- Unmuting works symmetrically.
- Authority logic rejects invalid attempts client-side (grayed-out menu items); server rejection is a backstop.

**Tests**:
- `ParticipantMenu.test.tsx` — menu renders only for authorized viewers; items grayed by target tier.
- `roomReducer.test.ts` — `mute_state` updates target flag + localMuted if self.

---

### Phase 3 — Promote / demote

**Goal**: roster action menu adds promote/demote per authority rules. Tier changes broadcast via `role_change` update the roster and relevant UI (settings panel availability, menu availability).

**Files**:
- `tools/server/client/src/components/ParticipantMenu.tsx` — add Promote → submenu (options: Co-Host, Command Entrant) and Demote → submenu. Items disabled based on current tier and local authority.
- `tools/server/client/src/api/ws.ts` — `sendPromote(id, to_tier)`, `sendDemote(id, to_tier)`.
- `tools/server/client/src/state/roomReducer.ts` — handle `role_change` ServerMsg: update target participant's tier. If the local user is the target, update `state.localTier`.
- `tools/server/client/src/state/types.ts` — `localTier` in RoomState if not already present.

**Authority logic** (mirrors ADR-153 Decision 4):
- PH: can promote Participants to CE or Co-Host; can demote anyone (except self) to any lower tier.
- Co-Host: can promote Participants to Command Entrant; can demote Command Entrants and Participants; cannot touch other Co-Hosts or the PH.
- Participant/CE: no menu.

**Definition of Done**:
- Promote/demote across authority levels works and is rejected (client + server) for unauthorized attempts.
- Tier changes reflect immediately in all rosters and in authority-dependent UI (menus re-evaluate).

**Tests**:
- `ParticipantMenu.test.tsx` — authority matrix covered: each viewer-tier × target-tier combination.
- `roomReducer.test.ts` — `role_change` updates tier.

---

### Phase 4 — PH settings panel

**Goal**: the PH gets a settings drawer (opened via a gear icon in the room header) containing pin/unpin, rename title, nominate successor. Delete room goes into the same panel but is handled as its own phase (Phase 5).

**Files**:
- `tools/server/client/src/components/SettingsPanel.tsx` (NEW) — slide-in drawer from the right edge (pushes chat left) OR modal; TBD — my default is drawer so you can see the roster change while you promote. Width ~360px.
- `tools/server/client/src/components/SettingsPin.tsx` (NEW) — pin/unpin toggle.
- `tools/server/client/src/components/SettingsTitleEdit.tsx` (NEW) — title input + Save button; shows validation errors inline (80-char cap, non-empty).
- `tools/server/client/src/components/SettingsSuccessor.tsx` (NEW) — radio list of all current Co-Hosts; highlights the current designated successor; saving issues `nominate_successor`.
- `tools/server/client/src/components/RoomHeader.tsx` — add a gear icon visible only to the PH; opens SettingsPanel.
- `tools/server/client/src/api/http.ts` — `renameRoom(room_id, title)` — requires a new server route (see server addendum below).
- `tools/server/client/src/api/ws.ts` — `sendPin()`, `sendUnpin()`, `sendNominateSuccessor(id)`.
- `tools/server/client/src/state/roomReducer.ts` — handle `room_state` (pin flag, title change), `successor` (designated successor id).

**Server addendum** (required in this phase):
- `tools/server/src/http/routes/rename-room.ts` (NEW) — `PATCH /api/rooms/:id` accepting `{title}`. PH auth via token. Validates same rules as create.
- `tools/server/src/http/routes/rename-room.test.ts` (NEW) — title validation; non-PH rejection; successful rename broadcasts `room_state` update to all connected participants of that room.

**Definition of Done**:
- PH opens settings, toggles pin, changes title, nominates successor. Changes propagate to all connected participants.
- Co-Host successor is enforced: saving the nomination requires at least one Co-Host selected.
- Non-PH users never see the gear icon.

**Tests**:
- `SettingsPanel.test.tsx` — contents render per authority.
- `rename-room.test.ts` — server validation, auth check, broadcast.

---

### Phase 5 — Delete room (type-to-confirm)

**Goal**: PH can delete the room from the settings panel. Delete requires typing the room title verbatim to unlock the Delete button (per ADR-153 Decision 12). Server atomically cascades delete and broadcasts `room_closed` to all participants.

**Files**:
- `tools/server/client/src/components/SettingsDelete.tsx` (NEW) — "Danger zone" section at the bottom of the settings panel. Shows current title, asks user to retype. Delete button is disabled until the typed text exactly matches. Final confirm triggers `sendDeleteRoom(title)`.
- `tools/server/client/src/api/ws.ts` — `sendDeleteRoom(confirm_title)`.
- `tools/server/client/src/state/roomReducer.ts` — already handles `room_closed` from Phase 7 stubs; flesh out here if needed.
- Server: no changes — `delete_room` handler already exists at `tools/server/src/ws/handlers/delete-room.ts`.

**Definition of Done**:
- Delete button is disabled unless the typed title matches.
- Confirming delete issues the WebSocket message; all participants receive `room_closed` and are redirected to `/` within 5 seconds (Phase 7 handles the banner).

**Tests**:
- `SettingsDelete.test.tsx` — button stays disabled on non-matching input; enables on match; submit triggers the callback.

---

### Phase 6 — Succession UX (PH-grace countdown + auto-promotion toast)

**Goal**: when the PH disconnects, all participants see a 5-minute countdown banner indicating the designated successor will be promoted if the PH does not reconnect. When the grace expires, a toast announces the new PH.

**Files**:
- `tools/server/client/src/components/GraceBanner.tsx` (NEW) — full-width banner below the room header. Shows when `state.phDisconnected === true`. Content: "Primary Host disconnected. {successorName} will be promoted in {countdown}." Countdown is a client-side tick from the server-provided deadline timestamp (not a client-internal timer — the server owns the deadline; see server `afk-timer.ts`).
- `tools/server/client/src/components/Toast.tsx` (NEW) — lightweight transient notice stack. Used for auto-promotion, room-closed-imminent, mute-confirmation, etc.
- `tools/server/client/src/state/roomReducer.ts` — handle `presence` (ph disconnect/reconnect triggers banner state), `role_change` for PH tier change (triggers toast).
- `tools/server/client/src/pages/Room.tsx` — mount GraceBanner below the header.

**Server-side check** (not code — verification):
- Confirm the server emits the PH-disconnected signal with a concrete grace deadline timestamp that the client can render. If it doesn't, file a server gap as a blocker.

**Definition of Done**:
- Manual 3-user smoke: PH closes tab → B and C see the banner counting down → wait 5 min or simulate → successor Co-Host is promoted → banner clears → toast announces "{name} is now Primary Host."
- Original PH rejoins → toast informs "You are now a Participant."

**Tests**:
- `GraceBanner.test.tsx` — countdown renders from a synthetic deadline; banner hides on PH reconnect.
- `Toast.test.tsx` — stacks, dismisses on timeout.

---

### Phase 7 — Room-closed banner

**Goal**: when the server broadcasts `room_closed` (delete or recycle), all connected participants see a full-page-ish banner explaining what happened, with a 5-second countdown before auto-redirect to `/`. Close button lets the user click through immediately.

**Files**:
- `tools/server/client/src/components/RoomClosedOverlay.tsx` (NEW) — full-viewport overlay. Text: "This room has been closed by the host." (deleted) or "This room has been recycled after 14 days of inactivity." (recycled). Close button + 5-sec countdown.
- `tools/server/client/src/pages/Room.tsx` — mount overlay when `state.roomClosed` is truthy.
- `tools/server/client/src/state/roomReducer.ts` — handle `room_closed` → set `state.roomClosed = { reason, message? }`.
- `tools/server/client/src/App.tsx` — after redirect, clear any stale token for this room (`storage/token.removeToken(roomId)`).

**Definition of Done**:
- Deleting a room from browser A → browsers B and C see the overlay with the delete message → they land on `/` after 5 seconds.
- Recycled-room scenario produces a different message.

**Tests**:
- `RoomClosedOverlay.test.tsx` — message varies by reason; countdown + redirect.

---

### Phase 8 — AC3 / AC4 / AC5 verification

**Goal**: close the three ACs this plan targets.

**Activities**:
- **AC3 (succession)**: 3-user room. PH closes tab. 5-min wait (or adjust `rooms.ph_grace_seconds` to 10 for the test). Designated Co-Host promoted. Earliest Participant → Co-Host. Event log inspected. Original PH rejoins as Participant.
- **AC4 (delete cascade)**: PH deletes a pinned room via type-to-confirm. All participants see the closed banner before sockets close. DB query confirms zero rows in rooms/participants/session_events/saves for the deleted room_id. Join code reissued successfully.
- **AC5 (mute visibility)**: Co-Host mutes Participant. Participant's chat attempt rejected with "muted" message. All rosters show mute indicator. Participant disconnects and reconnects — still muted.

**Files**:
- `docs/work/multiuser-client/ac3-ac4-ac5-verification-log.md` (NEW) — results recorded.
- Session summary for the verification session.

**Definition of Done**:
- All three ACs pass. Any follow-ups filed.

**Tests**:
- Manual three-browser smoke is the test. No automated e2e harness in Plan 02.

---

## Acceptance Criteria Mapping

| AC | Closed by Plan 02? |
|---|---|
| AC3 — PH succession | Yes |
| AC4 — Room delete cascade | Yes |
| AC5 — Mute visibility | Yes |
| AC6 — Idle recycle visibility | Partial — Plan 01 Phase 2 hid idle rooms from landing; Plan 02 Phase 7 handles recycle-broadcast UX |

---

## ADR-153 Decision Coverage

| Decision | Name | Phase |
|---|---|---|
| 4 | Role hierarchy | Phase 3 (promote/demote authority matrix) |
| 6 | Mandatory successor nomination | Phase 4 (SettingsSuccessor) |
| 8 | Room-wide chat | Phase 1 |
| 9 | Mute (Co-Host+) | Phase 2 |
| 11 | Recording transparency (chat + settings DMs reminder copy) | Phase 1 (chat author visibility implicit); touched again in Plan 04 |
| 12 | Pin + type-to-confirm delete | Phase 4 (pin), Phase 5 (delete) |

---

## Phase Ordering

```
Phase 1 (Chat)
  ↓
Phase 2 (Mute) — depends on chat to test muted-state enforcement
  ↓
Phase 3 (Promote/demote) — same UI vehicle (ParticipantMenu) as Phase 2
  ↓
Phase 4 (Settings panel) — pin/title/successor
  ↓
Phase 5 (Delete) — uses settings panel from Phase 4
  ↓
Phase 6 (Succession UX) — independent; could be parallel with 1-5
  ↓
Phase 7 (Room-closed banner) — consumed by Phase 5 (delete) and AC6 (recycle)
  ↓
Phase 8 (AC verification)
```

---

## Follow-on Plans

- **Plan 03** — save/restore + sandbox crash.
- **Plan 04** — DMs (requires chat infra from Plan 02 Phase 1).

---

## Open Questions

- **Settings panel vs. modal**: drawer is the default; if the drawer feels cramped on a 1280px laptop, consider a full-width modal instead. Revisit in Phase 4.
- **Toast stack placement**: top-right default. Bottom-right is also common. Try both.
- **Chat backlog length**: server returns how many messages on welcome? Confirm before Phase 1 — if it's small (say, 50), consider lazy-loading older via session event log query (not in MVP; flag as follow-up).

---

## Estimation

| Phase | Size |
|---|---|
| 1 — Chat UI | M (60–90 min) |
| 2 — Mute/unmute | M |
| 3 — Promote/demote | M |
| 4 — Settings panel (incl. server rename route) | L (90–120 min) |
| 5 — Delete room | S–M |
| 6 — Succession UX | M |
| 7 — Room-closed banner | S |
| 8 — AC verification | M |

Total: ~6–10 focused working sessions.
