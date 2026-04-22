# Plan 03 — Save, Restore, and Sandbox Crash Recovery

**Project**: Multi-user Browser Client (ADR-153 frontend)
**Target branch**: `main`
**Date**: 2026-04-22
**Brainstorm**: `docs/brainstorm/multiuser-client/overview.md`
**Depends on**: Plan 01 (foundation + room view). Plan 02 is not a hard prerequisite but reusing the settings-panel chrome helps; if this plan is worked before Plan 02, Phase 1 here pulls a small subset of the panel component forward.

This is Plan 03 of five. See the brainstorm overview for the full carving.

---

## Goal

Close ADR-153 **AC2** (save/restore round-trip) and **AC7** (sandbox crash recovery). A Command Entrant or higher can issue `SAVE`; any participant can see and restore from the save list; if the Deno sandbox crashes, the room is not dead — it surfaces a recovery affordance that loads the most recent save.

---

## Scope

### In scope

- **Save button** — available to Command Entrants and above (PH, Co-Host, CE). Prompts for an optional save name; default is a timestamp.
- **Save list** — a small panel (drawer or inline) showing every save for the room, newest first. Each entry: save name, creator display name, timestamp.
- **Restore button** per save — loads the save into the running story. Broadcasts a `RESTORED` text block to all participants.
- **`RESTORED` text-block handling** — visually distinct (colored rule, label) so restorations are obvious in the transcript.
- **Sandbox crash modal** — triggered by `ServerMsg` kind `error` with code `sandbox_crashed` (or equivalent — confirm code in Phase 1). Explains the crash in plain language, offers "Restore from last save" if one exists; otherwise a note that no saves are available and the room cannot recover.

### Out of scope

- Auto-save (periodic background save). ADR-153 doesn't commit to it in v0.1; Plan 03 ships manual saves only.
- Save preview (introspection of save contents). Save blobs are opaque to the server; would require sandbox round-trip. Deferred indefinitely.
- Cross-room save transfer. Same constraint.
- Save pruning / retention policy UI. Operators handle via DB; no end-user affordance.

### Explicit non-goals

- No renaming of existing saves.
- No deleting of individual saves. If the operator wants cleanup, they can via DB or future admin tooling.

---

## Dependencies and Prerequisites

- Plan 01 complete. Room view and WS reducer in place.
- Server already handles `save`, `restore` client messages and `save_created`, `restored`, `error` server messages (see `tools/server/src/ws/handlers/save.ts`, `restore.ts`, and the `error` machinery in `error-response.ts`).
- Server emits a specific `error` kind for sandbox crashes (confirm the exact code in Phase 4 — likely `sandbox_crashed` or `story_runtime_exit`). If the code is inconvenient, a server-side rename is a minor fix.

---

## Phases

### Phase 1 — Save button and Save list UI

**Goal**: the room view gains a Save button and a Save list panel. CEs and above can see the button. The list loads from the welcome snapshot (saves ship with `RoomSnapshot`) and appends on `save_created` broadcasts.

**Files**:
- `tools/server/client/src/components/SaveButton.tsx` (NEW) — opens a small naming dialog (title input, Save + Cancel buttons); submits `ClientMsg` kind `save` with the optional name.
- `tools/server/client/src/components/SaveList.tsx` (NEW) — list of saves. Newest first. Each row: save name (or "unnamed"), creator display name, relative timestamp. Includes a Restore button per row (Phase 2 wires it).
- `tools/server/client/src/components/SavePanel.tsx` (NEW) — drawer/panel containing the Save button + Save list. Toggled by a button in the room header (savefile icon).
- `tools/server/client/src/components/RoomHeader.tsx` — add the Save panel toggle button visible to CE+.
- `tools/server/client/src/state/roomReducer.ts` — handle `save_created` append; extract saves from welcome snapshot; maintain chronological order.
- `tools/server/client/src/api/ws.ts` — `sendSave(name?)`.

**Authority logic**:
- PH, Co-Host, Command Entrant: can click Save. UI shows the button.
- Participant: cannot Save. Panel still visible (so they can see the save list + Restore); Save button hidden.

**Definition of Done**:
- CE+ issues Save → all participants see the new entry appear in their save lists.
- Save names with only whitespace are stripped (empty → server uses default name).

**Tests**:
- `SaveList.test.tsx` — renders snapshot saves, appends on broadcast, ordering.
- `SaveButton.test.tsx` — dialog flow, authority gate.

---

### Phase 2 — Restore button and restored-rendering

**Goal**: clicking Restore on a save loads it server-side and broadcasts a `RESTORED` text block to all participants' transcripts. Render it visibly distinct.

**Files**:
- `tools/server/client/src/components/SaveList.tsx` — wire the Restore button. Confirmation dialog first (small "Really restore '{name}'? Any unsaved progress will be discarded."), then `sendRestore(save_id)`.
- `tools/server/client/src/components/RestoreConfirmDialog.tsx` (NEW) — inline confirmation.
- `tools/server/client/src/components/Transcript.tsx` — special-case a text block with kind `restored` (or flag indicating it's from a restore): render with a horizontal rule above/below and a small "RESTORED · {save name}" label, using `var(--warning)` color from the theme.
- `tools/server/client/src/api/ws.ts` — `sendRestore(save_id)`.
- `tools/server/client/src/state/roomReducer.ts` — handle `restored` ServerMsg; append the returned `text_blocks` to the transcript, tagging them visually.

**Authority**:
- Anyone (including Participants) can Restore in MVP. Rationale: restore is a *roll-back* (no new content created; returns to a prior state). Moderation question for the future.
- If this feels wrong during Phase 2, tighten to CE+ — small, local fix.

**Definition of Done**:
- Restore from B's browser → all browsers' transcripts show the RESTORED block styled distinctly → game state reflects the restore (command entry resumes from the restored point).

**Tests**:
- `Transcript.test.tsx` — restored-kind blocks render with the distinctive treatment.

---

### Phase 3 — AC2 save/restore round-trip verification

**Goal**: close AC2.

**Activity**:
- 2-user room. User A issues `SAVE foo` (via command) or clicks Save ("foo"). B sees "foo" in their save list.
- A disconnects and reconnects.
- B clicks Restore on "foo". Both transcripts show a `RESTORED` block. A's reconnected browser is now synced to the restored state.

**Files**:
- `docs/work/multiuser-client/ac2-verification-log.md` (NEW, optional).
- Session summary for this verification.

**Definition of Done**:
- AC2 passes. Any follow-ups filed.

---

### Phase 4 — Sandbox crash detection and notice

**Goal**: when the server reports that the Deno sandbox crashed, the client surfaces a clear, non-technical modal ("The story process stopped unexpectedly.") with a recovery button.

**Server reference**:
- ADR-153 AC7: "The Deno subprocess is killed externally. The server detects EXITED, notifies the room, and allows the room to RESTORE from the most recent save. The server itself does not crash."
- Confirm the exact `ServerMsg` shape emitted. Likely: `{kind: 'error', code: 'sandbox_crashed', detail: '...'}` per `tools/server/src/ws/handlers` conventions. Inspect at start of phase.

**Files**:
- `tools/server/client/src/components/CrashNoticeModal.tsx` (NEW) — modal explaining the crash in plain language; shows most-recent save name + timestamp if available; "Restore from last save" button (routes through Phase 2's Restore helper) and a secondary "Close room" link (PH-only; triggers delete flow from Plan 02).
- `tools/server/client/src/state/roomReducer.ts` — handle the specific `error` code indicating a sandbox crash; set `state.sandboxCrashed = true` + stash the most-recent save id for the modal.
- `tools/server/client/src/pages/Room.tsx` — render the modal when `state.sandboxCrashed === true`.

**Definition of Done**:
- Simulated crash (kill the Deno process server-side) → all participants see the modal within a second → clicking Restore routes through Phase 2's restore flow → transcript shows the RESTORED block → game resumes.

**Tests**:
- `CrashNoticeModal.test.tsx` — renders with and without an available save; button availability.
- `roomReducer.test.ts` — the specific error code flips the flag; other error codes do not.

---

### Phase 5 — AC7 sandbox crash verification

**Goal**: close AC7.

**Activity**:
- 2-user room. Save once.
- Simulate sandbox crash (server-side `docker compose exec` kill, or an in-test harness if one exists).
- Both clients show the crash modal with the save listed.
- Restore clicked. Transcript shows RESTORED. Game resumes. Server did not crash.

**Files**:
- `docs/work/multiuser-client/ac7-verification-log.md` (NEW, optional).

**Definition of Done**:
- AC7 passes.

---

## Acceptance Criteria Mapping

| AC | Closed by Plan 03? |
|---|---|
| AC2 — Save/restore round-trip | Yes (Phases 1–3) |
| AC7 — Sandbox crash recovery | Yes (Phases 4–5) |

---

## ADR-153 Decision Coverage

| Decision | Name | Phase |
|---|---|---|
| 2 | Save blob opacity (operator can't introspect) | Inherent in save-list UI (only metadata surfaced) |
| 10 | Command Entrant is the minimum save-capable tier | Phase 1 authority |

---

## Phase Ordering

```
Phase 1 (Save UI + list)
  ↓
Phase 2 (Restore UI + rendering)
  ↓
Phase 3 (AC2 verification)
  ↓
Phase 4 (Crash detection)
  ↓
Phase 5 (AC7 verification)
```

Phases 1–3 and Phases 4–5 could be worked in either order — a crash modal without any saves is fine (shows "no saves available"). But AC7 formally requires restoring, so 1–2 must be done before AC7 can close.

---

## Follow-on Plans

- **Plan 04** — DMs.
- **Plan 05** — polish.

---

## Open Questions

- **Save authority for Restore**: should Participants be allowed to Restore? Plan ships with "yes" — easy to tighten if it turns out to be a moderation problem.
- **Save rename / delete**: out of scope. If requested, a small follow-on.
- **Auto-save**: periodically snapshot state (e.g. every 10 turns, or every N seconds). Would eliminate "I forgot to save before the crash" pain. Not in MVP; flagged for post-v0.1 if operators ask for it.

---

## Estimation

| Phase | Size |
|---|---|
| 1 — Save button + list | M (60–90 min) |
| 2 — Restore + rendering | M |
| 3 — AC2 verification | S |
| 4 — Crash detection + modal | M |
| 5 — AC7 verification | S |

Total: ~3–5 working sessions.
