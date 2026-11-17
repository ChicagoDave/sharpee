# Plan 05 — Polish, Accessibility, and Public-Instance Hardening

**Project**: Multi-user Browser Client (ADR-153 frontend)
**Target branch**: `main`
**Date**: 2026-04-22
**Brainstorm**: `docs/brainstorm/multiuser-client/overview.md`
**Depends on**: Plans 01–04 complete (v0.1 full feature surface in place).

This is Plan 05 of five. See the brainstorm overview for the full carving. This is the "parking lot" plan — items that belong in v0.1 but make the most sense to land last because they span all the prior surfaces.

**Note**: theme work that was originally in this plan has moved into Plan 01 Phase 1. All four Zifmia themes + the per-user picker ship from day one.

---

## Goal

Make `play.sharpee.net` production-ready in the "would I feel good about sharing this with a non-technical friend" sense. Three workstreams:

1. **Desktop-only gate** — ADR-153 Decision 13 commits to desktop/laptop browsers only. Add a small-viewport placeholder that intercepts mobile users with a "please use a laptop" message rather than letting the UI land broken.
2. **Accessibility pass** — ARIA labels, keyboard navigation (esp. the tab system and roster menus), reduced-motion respect, high-contrast readability. **Bar**: parity with standard single-player IF interpreters (Frotz, etc.) for a screen-reader user. IF has a long accessibility tradition and a strong blind-player base; the multi-user client must not regress below that floor. Foundation ARIA was already landed in Plan 01 (see brainstorm overview §Accessibility Stance); this pass is the full sweep. No formal WCAG conformance claim in v0.1, but no obvious fails.
3. **Public-instance moderation hooks** — a report flow for inappropriate room titles on the landing page (since titles are publicly visible), plus a small admin CLI / API for the operator to review/delete reports.

---

## Scope

### In scope

- Small-viewport gate (below ~900px wide).
- ARIA roles and labels on all interactive elements and regions.
- Keyboard navigation: full tab order for landing, create/join modals, room view, roster menus, DM tabs.
- Respect `prefers-reduced-motion` for any animations (pulse, blink, countdown pulses).
- Respect `prefers-contrast` by ensuring each theme has a compliant high-contrast counterpart or at minimum passes the WCAG AA contrast ratio at default.
- Report-a-room button on each room card on the landing page. Submits a minimal report (room_id + optional reason); server logs to a new `reports` table.
- Operator-facing list/delete CLI command for processing reports.

### Out of scope

- Full WCAG 2.1 AA audit with a 3rd-party tool — aim for "passes easy auto-checks + looks right under NVDA/VoiceOver sweep."
- In-browser admin UI. Operators use the CLI.
- User accounts / moderation profiles. Reports are anonymous; operator decides.
- Internationalization (i18n). English only in v0.1. Copy lives in a single place (see Phase 2) so a future i18n pass is possible.
- Error telemetry / analytics pipeline. Deferred.

### Explicit non-goals

- No tablet-specific layout. Tablets get the desktop UI if they fit the size threshold; otherwise the small-viewport gate.
- No "send us feedback" button in the client itself. Operators can add their own if they want.

---

## Dependencies and Prerequisites

- All prior plans complete. Plan 05 touches components across every surface.
- Server gets one small schema addition: a `reports` table for room-title reports (Phase 5).

---

## Phases

### Phase 1 — Small-viewport gate

**Goal**: if the viewport is narrower than ~900px, the client renders a single message page instead of the normal UI: "Sharpee multi-user is designed for desktop and laptop browsers. Please use a larger screen to join the game." ADR-153 Decision 13 explicitly rules mobile out as a non-goal.

**Files**:
- `tools/server/client/src/components/ViewportGate.tsx` (NEW) — mounts at the App root. Watches `window.matchMedia('(max-width: 899px)')`. Below threshold: renders placeholder page. Above: renders normal App content.
- `tools/server/client/src/App.tsx` — wrap top-level routes in `<ViewportGate>`.

**Threshold**: 900px is a minimum width that keeps the 3-section room view (transcript + right panel) usable. Adjust if testing reveals a better cutoff.

**Definition of Done**:
- Resizing a desktop browser to <900px shows the placeholder immediately.
- Mobile users (tested on an actual phone if possible, Chrome DevTools device emulation otherwise) see the placeholder.

**Tests**:
- `ViewportGate.test.tsx` — threshold behavior via mocked matchMedia.

---

### Phase 2 — Accessibility pass: labels, roles, landmarks

**Goal**: every interactive element has an accessible label; every major region has a landmark role. Screen readers can navigate the app without encountering "button" with no label.

**Files** (modification sweep across):
- `App.tsx` — `<main>` landmark on room view, `<header>` on app headers, `<aside>` on side panels (mostly already there from HTML semantics; verify).
- `RoomHeader.tsx`, `ChatPanel.tsx`, `SidePanelTabs.tsx`, `SettingsPanel.tsx`, `ParticipantRoster.tsx`, `SaveList.tsx`, all modals — add `aria-label`, `aria-labelledby`, `aria-describedby` as appropriate.
- `CommandInput.tsx` — `aria-label="Command input"`, `aria-disabled` when read-only, `aria-live` region announcing "the lock is held by {name}" on transitions.
- `Transcript.tsx` — `role="log"` with `aria-live="polite"` so new turn outputs are announced.
- `GraceBanner.tsx` / `RoomClosedOverlay.tsx` — `role="alert"` for high-urgency announcements.
- `ThemePicker.tsx` — `aria-haspopup="menu"`, `aria-expanded`, `role="menu"` on dropdown.

**Copy sweep**:
- Extract all user-facing strings into `tools/server/client/src/i18n/strings.ts` (NEW) — a single exported object keyed by screen + element. Not i18n yet; just centralized. Benefit: the copy can be reviewed, polished, and future i18n is a small swap.

**Definition of Done**:
- Screen reader sweep (NVDA on Windows or VoiceOver on macOS): Tab through landing, create modal, passcode modal, room view, settings panel, roster menu, save panel, DM tabs. Every stop announces a meaningful label and role. No "button" with no text.
- New turn outputs are announced without manually re-focusing.

**Tests**:
- Snapshot tests on the aria attributes of key components. Auto-check tools (`jest-axe`) as part of the unit tests.

---

### Phase 3 — Accessibility pass: keyboard navigation

**Goal**: the entire app can be driven from the keyboard.

**Targeted flows**:
- Landing: Tab across header actions → Create Room button → stories list (informational, no focus) → active rooms list (each Enter button focusable) → theme picker.
- Modals: Focus trapped inside. Esc closes. Enter submits when on the form. Shift+Tab cycles.
- Room view: Tab into command input (primary focus on load). Chat input reachable. Roster actions reachable via arrow keys or Tab. Tab system in right panel switchable with arrow keys (`Tab`, `Shift+Tab` swap tabs — alternative, `Cmd+1`, `Cmd+2` etc for direct tab access).
- Settings panel: Tab through all fields; Save activates on Enter; Esc closes.
- Roster menu: Open with Enter/Space on the `⋮` icon; arrow keys navigate items; Enter selects; Esc closes.

**Files**:
- `tools/server/client/src/hooks/useFocusTrap.ts` (NEW) — utility for modals.
- Modal components — apply useFocusTrap.
- `SidePanelTabs.tsx` — keyboard tab switching.
- `ParticipantMenu.tsx` — full keyboard support.
- Global: a `KeyboardShortcutsHelp.tsx` modal (NEW) opened via `?` that lists the shortcuts. Not mandatory; nice-to-have.

**Definition of Done**:
- Power-user sanity test: no mouse, full session possible — create room, join as second user, type, chat, promote, mute, save, restore, delete.

---

### Phase 4 — Accessibility: reduced motion + contrast

**Goal**: users with `prefers-reduced-motion: reduce` don't see pulses, blinking cursors, or sliding drawers. Users with `prefers-contrast: more` get a slightly punched-up contrast variant of the current theme.

**Files**:
- `tools/server/client/src/styles/themes.css` — add `@media (prefers-reduced-motion: reduce)` blocks that disable `animation` and transitions, substituting instant state changes.
- `themes.css` — add `@media (prefers-contrast: more)` overrides per theme tweaking text + border colors to stronger contrast.
- Any component using `animation` CSS — verify it degrades cleanly.

**Definition of Done**:
- macOS System Settings → Accessibility → Reduce Motion: animations and pulse indicators stop animating. REC indicator stops pulsing (still visible).
- Accessibility → Increase Contrast: text and borders become more readable.

---

### Phase 5 — Public-instance: title-report flow

**Goal**: any visitor to the landing page can report an active room's title (e.g. offensive, misleading, advertising). Reports accumulate server-side; operator reviews via CLI and deletes if warranted.

**Client**:
- `tools/server/client/src/components/ActiveRoomsList.tsx` — add a small `report` icon per room card. Opens a minimal modal: "Report this room title? Reason (optional): [textarea]" + Submit + Cancel.
- `tools/server/client/src/components/ReportRoomModal.tsx` (NEW).
- `tools/server/client/src/api/http.ts` — `reportRoom(room_id, reason)` helper.

**Server**:
- `tools/server/migrations/0002_reports_table.sql` (NEW):
  ```sql
  CREATE TABLE reports (
      report_id   TEXT PRIMARY KEY,
      room_id     TEXT NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
      reason      TEXT,
      reporter_ip TEXT,       -- optional, for abuse tracking
      created_at  TEXT NOT NULL
  );
  CREATE INDEX idx_reports_room ON reports(room_id);
  ```
- `tools/server/src/repositories/reports.ts` (NEW) — simple create + list + deleteForRoom.
- `tools/server/src/http/routes/report-room.ts` (NEW) — `POST /api/rooms/:id/report`. Rate-limit per IP.
- `tools/server/src/http/routes/report-room.test.ts` (NEW) — happy path + rate-limit test.

**Operator CLI**:
- `tools/server/scripts/admin-reports.sh` (NEW) — convenience wrapper for:
  - `list` — show all open reports with room title.
  - `delete-room <room_id>` — cascade-delete the reported room.
  - `dismiss <report_id>` — remove one report without touching the room.
- Actual implementation can be a small TypeScript CLI entrypoint at `tools/server/src/scripts/admin-reports.ts`, called by the .sh.

**Definition of Done**:
- Visitor reports a room → entry appears in the DB.
- Operator CLI lists reports, can delete the room or dismiss the report.
- Reporting the same room twice from the same IP within 10 minutes returns 429 (rate-limit); reporting different rooms is fine.

**Tests**:
- Server route test; CLI dry-run test; reducer unchanged.

---

### Phase 6 — Operator docs update

**Goal**: extend `docs/server/` with a small section on the client now that it exists.

**Files**:
- `docs/server/install-guide.md` — update §5 verification to reference the actual rendered landing page rather than a curl-only health check.
- `docs/server/deployment.md` — add a note on the Docker image now including the client build step; upgrade notes for how-to-invalidate stale bundle caches in front of a CDN (if one is added later).
- `docs/server/operator-guide.md` (NEW) — the moderation/reports CLI. `admin-reports.sh list`, etc. What a 2am problem call looks like.

**Definition of Done**:
- Operator can find the CLI documentation without reading source code.

---

## Acceptance Criteria Mapping

Plan 05 does not close any ADR-153 acceptance criteria — all seven close in Plans 01–03. Plan 05 closes the *remaining* product-level concerns not captured by AC1–AC7: accessibility, mobile gate, and public-instance moderation.

---

## ADR-153 Decision Coverage

| Decision | Name | Phase |
|---|---|---|
| 13 | Desktop-only | Phase 1 |
| 14 | Config reloads | Indirect (themes respect CSS vars, hot-reloadable) |

---

## Phase Ordering

No strict dependencies within Plan 05 — any order works. Recommend:

```
Phase 1 (Viewport gate)        — smallest; quick win
  ↓
Phase 2 (ARIA labels/landmarks) — copy extraction is foundation for Phase 3
  ↓
Phase 3 (Keyboard nav)          — builds on Phase 2's semantic structure
  ↓
Phase 4 (Reduced motion / contrast)  — largely CSS
  ↓
Phase 5 (Title report flow)     — self-contained server + client work
  ↓
Phase 6 (Operator docs update)  — after Phase 5 so the CLI is documented alongside install
```

---

## Follow-on Plans

None — this is the final plan in the five-plan sequence. After Plan 05, v0.1 is complete.

Future plans (not in the current decomposition):
- Plan 06+ — post-v0.1 features. Examples: auto-save, save pruning, per-room operator holds, admin UI, mobile/tablet-specific layouts, telemetry, i18n, alternative front-ends (Tauri desktop client, Electron).

---

## Open Questions

- **Viewport threshold**: 900px is a guess. May need adjustment after real-world testing.
- **High-contrast variants per theme**: does each of the four themes need its own `prefers-contrast: more` tuning, or is one global override sufficient? Default: per-theme for fidelity; may over-scope in Phase 4.
- **Report rate-limiting**: per IP, 10-minute window. Values chosen to prevent obvious griefing; adjust if operators see false positives.
- **Report UX**: modal vs. inline expand vs. direct-to-mailto. Default: modal.
- **Operator CLI language**: shell script wrapper around a TS entrypoint, vs. pure shell. Default: the hybrid (TS for logic, .sh for ergonomics).

---

## Estimation

| Phase | Size |
|---|---|
| 1 — Viewport gate | S (30–45 min) |
| 2 — ARIA + copy extraction | L (90–120 min) |
| 3 — Keyboard nav | L |
| 4 — Reduced motion + contrast | M |
| 5 — Title-report flow (client + server + CLI) | L |
| 6 — Operator docs update | S–M |

Total: ~5–8 working sessions.
