# Plan 01 — Multiuser Client Foundation and Two-User Smoke

**Project**: Multi-user Browser Client (ADR-153 frontend)
**Target branch**: `main`
**Date**: 2026-04-22
**Brainstorm**: `docs/brainstorm/multiuser-client/overview.md`, `docs/brainstorm/multiuser-client/techstack.md`
**UI mockups**: `docs/work/multiuser-client/mocks/01-landing.html`, `docs/work/multiuser-client/mocks/02-room.html` — static HTML references showing the visual target for Plan 01 screens

This is Plan 01 of a five-plan decomposition. See the brainstorm overview for the full carving (Plans 01–05).

---

## Goal

Stand up the multiuser browser client from scratch and land the full path that closes **ADR-153 Acceptance Criterion 1** (two-user smoke): two browsers load `https://play.sharpee.net`, one user creates a room with a preloaded story, the other joins via the URL, one types a command and the other watches the keystrokes stream in real time with the lock-on-typing contract honored, both see the story output.

At the end of this plan, `play.sharpee.net` returns a usable page (not 404), AC1 passes, and the scaffolding for Plans 02–05 is in place.

---

## Scope

### In scope (this plan)

- New package directory `tools/server/client/` — React 18, Vite, TypeScript, **all four Zifmia themes** (classic-light, modern-dark, retro-terminal, paper) with a per-user theme picker in the header.
- Server-side `GET /api/rooms` endpoint — returns non-secret metadata for rooms with at least one connected participant.
- Server-side static-file middleware serving `tools/server/client/dist/` for non-API paths, with SPA fallback so client-side routes resolve to `index.html`.
- Server-side create-room validation addition: a `title` field becomes required (non-empty, length-capped) on `POST /api/rooms`.
- Landing page (route `/`): stories list, active-rooms list, Create Room affordance.
- Create Room modal: title, story picker, display name, CAPTCHA widget → server issues token → transition to room view.
- Passcode modal: triggered by Enter-room clicks on the landing page and by `/r/:code` deep-link visits. Pre-fills code from URL when present. Collects display name + CAPTCHA.
- WebSocket client hook + room-state reducer. Connect with token, handle welcome/presence/disconnect/error, re-sync from `welcome` snapshot on reconnect.
- Room view layout: header (title + REC indicator), transcript, participant roster, command input pane, copy buttons for URL and raw join code.
- Lock-on-typing command input: emits `draft_delta`, renders `draft_frame` from every participant in real time, honors lock state, empty-input releases the lock.
- Recording-transparency notice (one-shot on first join per room per browser).
- AC1 two-user smoke verified on `play.sharpee.net` (or equivalent test host).

### Out of scope (deferred to Plans 02–05)

- Chat, DMs, moderation, promote/demote, mute/unmute, pin, succession UX, delete room — Plan 02 / Plan 04.
- Save, restore, sandbox-crash recovery — Plan 03.
- Themes beyond the first, desktop-only gate, accessibility pass, title moderation — Plan 05.

### Explicit non-goals

- No `POST /api/rooms/:id/title` endpoint yet (title edit) — title edit ships with Plan 02's settings panel.
- No local routing library unless hand-rolled proves insufficient for two routes (`/` and `/room/:room_id`); revisit at Phase 3 if React Router's footprint feels excessive.
- No CAPTCHA provider *selection* work — `captcha.provider: none` (current `play.sharpee.net` config) is acceptable for AC1 verification; the client renders a no-op placeholder where the widget would go when the server reports no provider.

---

## Dependencies and Prerequisites

- ADR-153 is the architectural source of truth for the protocol (`ClientMsg` / `ServerMsg` at `tools/server/src/wire/browser-server.ts`). The client imports these types directly.
- Server WS handler: `tools/server/src/ws/server.ts` is the landing point for all client messages; do not modify its contract in this plan.
- `tools/server/src/http/routes/` has `create-room.ts`, `join-room.ts`, `list-stories.ts`, `resolve-code.ts` — no `list-rooms.ts` yet. Phase 2 adds it.
- **Zifmia cherry-pick**: `packages/zifmia/src/styles/themes.css` is the intended visual starting point. The client copies the single selected theme's variables into its own `styles/` in Phase 1. No live dependency on Zifmia.
- **Public-listing surface ADR question**: the landing-page room list is a mild deviation from ADR-153's original "rooms are private to whoever has the code" framing. Treat it as covered by ADR-153 (code-gated joining preserves the privacy boundary; listing is a discovery signal, not a join affordance). If a reviewer pushes back during Phase 2 or Phase 3, add a short ADR-153 addendum. Do not block the plan on it.

---

## Phases

Phases are session-sized (roughly 45–90 minutes of focused work each). Each phase has a clear start and end state. Each phase is committable on its own.

### Phase 1 — Scaffold `tools/server/client/`

**Goal**: create the React + Vite + TS project skeleton under `tools/server/client/`, with one placeholder route rendering a heading. `npm run build` produces `dist/`. No server changes yet.

**Files**:
- `tools/server/client/package.json` — deps: `react@^18`, `react-dom@^18`, `typescript`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`. Scripts: `dev`, `build`, `preview`.
- `tools/server/client/vite.config.ts` — plugin-react, `server.proxy` for `/api`, `/ws`, `/r` → `http://localhost:8080` (WS target for `/ws`).
- `tools/server/client/tsconfig.json` — JSX, strict, NodeNext module resolution, `paths` alias for importing server wire types via `../src/wire/browser-server.js`.
- `tools/server/client/index.html` — minimal, references `src/main.tsx`.
- `tools/server/client/src/main.tsx` — ReactDOM entry.
- `tools/server/client/src/App.tsx` — placeholder `<h1>Sharpee multiuser</h1>`.
- `tools/server/client/src/styles/themes.css` — all four Zifmia themes ported: `classic-light`, `modern-dark`, `retro-terminal`, `paper`. Use `[data-theme="..."]` scoping identical to Zifmia's CSS.
- `tools/server/client/src/components/ThemePicker.tsx` (NEW) — header button + dropdown menu; switches `document.documentElement` `data-theme` attribute and writes `sharpee.theme` to localStorage. **Must appear in both the landing-page header and the room-view header** — a single shared component rendered in both places.
- `tools/server/client/src/storage/theme.ts` (NEW) — read/write `sharpee.theme` localStorage key; default `modern-dark`; apply on app boot before React mounts (prevents flash-of-unstyled-theme).
- `tools/server/client/.gitignore` — `dist/`, `node_modules/`.
- Root `.gitignore` — confirm `tools/server/client/dist/` not accidentally excluded.

**Definition of Done**:
- `cd tools/server/client && npm install && npm run build` succeeds and produces `dist/index.html`.
- `npm run dev` starts Vite on `:5173` and renders the placeholder page.

**Tests required**: none in this phase. The scaffold is verified by running.

---

### Phase 2 — Server: `GET /api/rooms` + static-file + SPA fallback

**Goal**: add the server-side pieces the client depends on. This is a pure server phase; no client changes.

**Files**:
- `tools/server/src/http/routes/list-rooms.ts` (NEW) — `GET /api/rooms`. Returns `{"rooms":[{room_id, title, story_slug, participant_count, last_activity_at}, ...]}`. Filter: rooms with at least one row in `participants WHERE connected = 1`. Never return `join_code` or any token.
- `tools/server/src/http/routes/list-rooms.test.ts` (NEW) — asserts (a) rooms with all-disconnected participants are excluded, (b) rooms with ≥1 connected participant are included, (c) response never contains `join_code`, (d) `participant_count` reflects only connected participants.
- `tools/server/src/http/app.ts` — mount the new route; add static-file serving for `client/dist/` on any GET request not matching `/api/*`, `/ws`, or `/r/:code`. For unmatched paths that *look* like SPA routes (no file extension), return `client/dist/index.html`.
- `tools/server/src/http/app.test.ts` — assert `GET /` returns 200 with the SPA HTML when `client/dist/index.html` exists in the test fixture tree. Assert `GET /api/unknown` still 404s (no SPA fallback on `/api`).
- `tools/server/Dockerfile` — add a client-builder stage: `WORKDIR /build/tools/server/client`, `COPY tools/server/client/package.json tools/server/client/package-lock.json ./`, `RUN npm ci`, `COPY tools/server/client ./`, `RUN npm run build`. Runtime stage COPYs `/build/tools/server/client/dist` to `/app/public` (or wherever the static middleware reads from). Existing Node-builder stage unchanged.

**Server title validation** (fold into this phase):
- `tools/server/src/http/routes/create-room.ts` — reject if `body.title` is missing, whitespace-only, or >80 chars. Existing behavior otherwise unchanged.
- `tools/server/src/http/routes/create-room.test.ts` — add cases: missing title, whitespace-only title, 81-char title, 80-char title (accepted boundary).

**Definition of Done**:
- All new and modified server tests pass.
- Docker image builds with the new client-builder stage and serves the Phase 1 placeholder HTML from `/`.
- `curl https://play.sharpee.net/` returns HTML (not 404) after deploy.

**Behavior Statement** for `GET /api/rooms`:
- **DOES**: returns a JSON payload `{rooms: [...]}` containing room_id, title, story_slug, participant_count, last_activity_at for each room that has ≥1 currently-connected participant.
- **WHEN**: any client issues an unauthenticated GET to `/api/rooms`.
- **BECAUSE**: the landing page needs to show live activity without leaking privacy-sensitive fields.
- **REJECTS WHEN**: never — this is a read endpoint with no bad state. Returns `{rooms: []}` if the DB has no qualifying rooms.

---

### Phase 3 — Landing page

**Goal**: at route `/`, render the stories list (from `/api/stories`), the active-rooms list (from the new `/api/rooms`), and a Create Room button. Clicking Enter on a room opens an empty passcode modal placeholder (wired in Phase 5). Clicking Create opens an empty create-room modal placeholder (wired in Phase 4).

**Files**:
- `tools/server/client/src/pages/Landing.tsx` (NEW) — fetches both endpoints on mount, renders lists, handles loading/error states.
- `tools/server/client/src/components/StoriesList.tsx` (NEW)
- `tools/server/client/src/components/ActiveRoomsList.tsx` (NEW) — title, story slug (resolved to title from stories list if possible), participant count, Enter button.
- `tools/server/client/src/components/Button.tsx` (NEW) — small shared primitive.
- `tools/server/client/src/App.tsx` — route `/` → `<Landing/>`. Route for `/room/:room_id` stubbed to a placeholder for now. If hand-rolling the router, use `useState`-driven path parsing; otherwise add `react-router-dom`.
- `tools/server/client/src/api/http.ts` (NEW) — thin wrapper around `fetch` for JSON; sets `Accept: application/json`, throws on non-2xx.

**Definition of Done**:
- `npm run dev` + server running → `http://localhost:5173/` shows both lists.
- Lists update if server data changes (a hard reload is fine; no live refresh in this phase).
- Empty states render ("no active rooms", "no stories configured") when the server returns empty arrays.

**Tests**:
- `Landing.test.tsx` — renders both lists from mocked `http.ts`. Verifies empty-state messaging. Verifies that clicking Create calls the (mocked) callback; verifies Enter on a room item calls with the right room_id.

---

### Phase 4 — Create Room modal

**Goal**: the Create Room affordance opens a modal that collects title, story, display name, CAPTCHA token. Submits `POST /api/rooms`, stores the returned token in `localStorage`, navigates to `/room/:room_id`.

**Files**:
- `tools/server/client/src/components/CreateRoomModal.tsx` (NEW)
- `tools/server/client/src/components/Modal.tsx` (NEW) — reusable shell (focus trap, esc-to-close, backdrop click). Single implementation used by create and passcode modals.
- `tools/server/client/src/components/CaptchaWidget.tsx` (NEW) — renders Turnstile/hCaptcha/Friendly if configured by the server, otherwise a no-op placeholder that auto-emits `"bypass"` when `captcha.provider === "none"`. Reads provider config from `window.__SHARPEE_CONFIG__` (injected by server at HTML render time — add server-side injection in this phase).
- `tools/server/client/src/storage/token.ts` (NEW) — `readToken(roomId)`, `writeToken(roomId, token)`. Namespaced `sharpee.token.<roomId>` per the ADR-153 scoping rule.
- `tools/server/client/src/api/http.ts` — add `createRoom({title, story_slug, display_name, captcha_token})` helper.
- `tools/server/client/src/pages/Landing.tsx` — wire the Create button to open the modal; on success navigate to room.
- Server: `tools/server/src/http/app.ts` — inject `window.__SHARPEE_CONFIG__` into `index.html` before serving (replace a placeholder `<!--SHARPEE_CONFIG-->` in the built HTML, or set a script tag). Must not leak `captcha.secret_key` or any other secret.

**Definition of Done**:
- Creating a room from the browser redirects to `/room/:room_id` and a token is written to localStorage.
- Server validates the title; client surfaces the server error inline if title is invalid.

**Tests**:
- `CreateRoomModal.test.tsx` — submits with valid input; handles server error responses (400 title validation, 500 generic).
- `storage/token.test.ts` — write/read round trip; namespacing by roomId.

---

### Phase 5 — Passcode modal and `/r/:code` routing

**Goal**: clicking Enter on a landing-page room item opens the passcode modal. Visiting `https://play.sharpee.net/r/{code}` directly also opens it with the code pre-filled. On submit, server issues a token, client stores it and navigates to `/room/:room_id`.

**Files**:
- `tools/server/client/src/components/PasscodeModal.tsx` (NEW) — fields: passcode (pre-fillable), display name, CAPTCHA. Calls `POST /api/rooms/:id/join` (existing — confirm endpoint shape in Phase 2 review).
- `tools/server/client/src/api/http.ts` — add `joinRoom(code, {display_name, captcha_token})`.
- `tools/server/client/src/App.tsx` — add route handler for `/r/:code` that mounts `<Landing/>` but opens the passcode modal with the code pre-filled.
- `tools/server/client/src/pages/Landing.tsx` — accept a `prefillCode` prop from the router.

**Definition of Done**:
- Both paths into the modal work: click-from-list and direct-URL.
- Successful join navigates to `/room/:room_id` with token stored.
- Invalid code, room-full, CAPTCHA errors surface inline.

**Tests**:
- `PasscodeModal.test.tsx` — mocked http.joinRoom, success and failure paths.
- Routing smoke: visiting `/r/XYZ` opens the modal with XYZ pre-filled.

---

### Phase 6 — WebSocket hook + room-state reducer

**Goal**: a `useWebSocket` hook that connects to `/ws/:room_id` with the stored token, handles open/close/error/message, and reconnects on transient disconnect with exponential backoff. A `roomReducer` over `ServerMsg` that produces a `RoomState` shape. No UI yet — stand this up as a pure TS layer consumed in Phase 7.

**Architectural discipline**: keep `roomReducer`, `useWebSocket`, and `storage/*` deliberately free of React-component-tree concerns. The reducer is plain TS; the hook's public surface is `{state, send}`, not DOM refs. This hedges for a possible future sibling client (Plan 06+ if blind-player feedback asks for a text-first variant) — it would import the same state machinery without rewrites. See brainstorm overview §Accessibility Stance.

**Files**:
- `tools/server/client/src/hooks/useWebSocket.ts` (NEW)
- `tools/server/client/src/state/roomReducer.ts` (NEW) — reducer + initial state.
- `tools/server/client/src/state/types.ts` (NEW) — `RoomState` type (participants, lock holder, transcript, draft frames per participant, presence, etc.)
- `tools/server/client/src/types/wire.ts` (NEW) — re-export `ClientMsg`, `ServerMsg`, `TextBlock`, `DomainEvent`, `Tier` from the server's `tools/server/src/wire/browser-server.ts` via relative import.

**Definition of Done**:
- Hook connects, sends `hello` with token, receives `welcome`, stores snapshot.
- Reconnect works (simulate server restart): hook auto-reconnects, re-sends `hello`, state re-syncs from new welcome.
- Reducer handles every `ServerMsg` kind listed in ADR-153 at least to the extent of "no-op with a comment pointing to the plan that implements it" — this prevents crashes on messages for features Plans 02–04 will use.

**Tests**:
- `roomReducer.test.ts` — each ServerMsg kind: initial state, expected transition. At minimum: welcome, presence, lock_state, draft_frame, story_output, error, room_closed.
- `useWebSocket.test.ts` — mocked WebSocket: connect/send/recv, reconnect with backoff, close cleanup.

---

### Phase 7 — Room view skeleton

**Goal**: route `/room/:room_id` renders the room layout using the WS hook + reducer from Phase 6. Everything renders *except* the interactive command input (Phase 8). No chat, no moderation, no settings — placeholder `<div>` panels where those will live in Plan 02+.

**Files**:
- `tools/server/client/src/pages/Room.tsx` (NEW) — mounts the WS hook, passes state to child components.
- `tools/server/client/src/components/RoomHeader.tsx` (NEW) — title, REC indicator, copy-URL button, copy-code button.
- `tools/server/client/src/components/RECIndicator.tsx` (NEW) — persistent red dot + "REC" label.
- `tools/server/client/src/components/Transcript.tsx` (NEW) — renders `text_blocks` from `story_output` messages. One simple renderer in this phase (plain paragraphs); style/formatting polish in Plan 05.
- `tools/server/client/src/components/ParticipantRoster.tsx` (NEW) — name, tier badge, connected dot, lock-holder marker, mute indicator (flag only — moderation UI ships Plan 02).
- `tools/server/client/src/components/CommandInput.tsx` (NEW) — placeholder input, no lock logic yet. Fills in Phase 8.

**Definition of Done**:
- Loading `/room/:room_id` with a valid token renders the full layout populated from welcome snapshot.
- Copy buttons copy URL and raw code to clipboard.
- Reconnect after server restart restores the view.

**Tests**:
- `Room.test.tsx` — mounts with a mocked useWebSocket returning a welcome-shaped state; all layout sections render.
- `RoomHeader.test.tsx` — copy buttons use clipboard API (mocked).

---

### Phase 8 — Lock-on-typing command input

**Goal**: the single hardest phase. Implement the client-side half of ADR-153's lock-on-typing contract.

**Contract** (from ADR-153 Decision 7 and the WS types):
- Whenever a participant with the right tier (Command Entrant or higher) types into the command input, the client emits `draft_delta` at most every N ms (16ms is fine — tied to browser keystroke events, coalesced).
- The server broadcasts `draft_frame` to all participants; all clients render it in a live-preview area (not the transcript — a separate pane or the command input itself when another user holds the lock).
- Empty-input (the typist clears the field) → client emits `release_lock`. Server responds with `lock_state: holder_id = null`.
- Pressing Enter → client emits `submit_command` with the current text. Server processes, emits `story_output`. Client appends to transcript and clears the input.
- If another participant holds the lock, the local command input is read-only and shows their draft. If no one holds the lock and this participant types, they take the lock.

**Files**:
- `tools/server/client/src/components/CommandInput.tsx` — full implementation.
- `tools/server/client/src/hooks/useCommandInput.ts` (NEW) — encapsulates the lock-aware input logic.
- `tools/server/client/src/state/roomReducer.ts` — flesh out `draft_frame` and `lock_state` handling beyond the stub from Phase 6.

**Definition of Done**:
- Two-browser manual test: browser A types a word, browser B sees the keystrokes stream. Browser A clears input, B can now type. Browser B presses Enter, both see the turn output.
- Edge: typing from a Participant (no command-entry tier) is rejected locally (input shows a read-only state with an "observer" label) — do not even attempt to take the lock.

**Tests**:
- `useCommandInput.test.ts` — lock transitions: idle → holding → released; draft-delta emission rate-limited; Enter clears input; read-only when another holds the lock.

---

### Phase 9 — Recording-transparency notice

**Goal**: first-time-in-this-room visitors see the recording-transparency notice (ADR-153 Decision 11). Acknowledging it sets a localStorage flag so the notice does not reappear for that room on the same browser.

**Files**:
- `tools/server/client/src/components/RecordingNoticeModal.tsx` (NEW)
- `tools/server/client/src/pages/Room.tsx` — gate the room view on the acknowledgment. First render: show modal; on acknowledge, store `sharpee.rec_ack.<room_id> = 1` and mount the room body.

**Notice copy** (from ADR-153 overview doc, §Privacy / communication):
> This session is recorded. Everything in this room is logged: every command, every chat message, every DM between Primary Host and Co-Hosts, every role change. Be on good behavior — this includes Hosts and Co-Hosts. Your DMs are not exempt.

(DMs section kept even though Plan 01 doesn't ship DMs — notice is forward-looking so users aren't re-notified when DMs land in Plan 04.)

**Definition of Done**:
- First visit to a room shows the modal. Acknowledge → room mounts.
- Second visit to same room on same browser skips the modal.
- Visiting a *different* room shows the modal again (per-room scoping).

**Tests**:
- `RecordingNoticeModal.test.tsx` — storage set on acknowledge; subsequent mount skips.

---

### Phase 10 — AC1 two-user smoke verification

**Goal**: close the AC1 gate. Two browsers, real end-to-end flow on deployed `play.sharpee.net` (or local `docker compose up` if the deploy isn't ready yet).

**Activity** (not a code phase — verification):
- Deploy: `./build.sh` with the new client build step, rebuild Docker image, push, restart service.
- Browser A: open `https://play.sharpee.net`, create a room ("AC1 smoke"), pick the preloaded story.
- Browser B: open `https://play.sharpee.net`, click Enter on the listed room, submit passcode.
- Browser A types `look` — B sees the keystrokes stream. A presses Enter. Both see story output.
- A clears input, B types `inventory`. A sees B's keystrokes. B presses Enter. Both see story output.
- **Screen-reader smoke** (don't defer to Plan 05): turn on VoiceOver (macOS: Cmd+F5) or NVDA (Windows). Repeat the above flow with the SR on. Confirm: (a) story output in Browser A's transcript is announced via the `role="log"` live region, (b) chat messages are announced separately, (c) lock-transitions announce once ("Alice is now typing", not per keystroke), (d) submitted commands announce once ("Alice submitted: look"), (e) tier/state badges read as expanded words ("Primary Host", "online", "muted") not as letter shorthand. Regressions from the Frotz-level single-player IF accessibility baseline are AC1 blockers.

**Files**:
- `docs/context/session-YYYYMMDD-HHMM-main.md` — document the AC1 pass (or fail + followup).
- If any bugs found, file them as Phase 10.X sub-items and cycle back through Phases 7–9 as needed.
- `docs/work/multiuser-client/ac1-verification-log.md` (NEW, optional) — verification record.

**Definition of Done**:
- AC1 gate closes. Any follow-ups logged and scheduled (into Plan 02 if they fit, or standalone fix commits otherwise).

**Tests**:
- Manual two-browser smoke is the test. No automated e2e harness in Plan 01.

---

## Acceptance Criteria Mapping

| AC | Description | Covered by Plan 01? |
|---|---|---|
| AC1 | Two-user smoke | **Yes — this is Plan 01's target** |
| AC2 | Save/restore round-trip | No — Plan 03 |
| AC3 | PH succession UX | No — Plan 02 |
| AC4 | Room delete cascade UX | No — Plan 02 |
| AC5 | Mute visibility UX | No — Plan 02 |
| AC6 | Idle recycle (UX: landing hides idle rooms) | Partial — the "only active rooms in list" rule from Phase 2 contributes to AC6 visibility |
| AC7 | Sandbox crash recovery UX | No — Plan 03 |

---

## ADR-153 Decision Coverage (this plan)

| Decision | Name | Phase |
|---|---|---|
| 5 | Durable session token in localStorage | Phases 4, 5, 6 |
| 7 | Lock-on-typing input model | Phase 8 |
| 11 | Recording-transparency notice + REC indicator | Phases 7 (REC), 9 (notice) |
| 13 | Desktop/laptop browsers only (non-goal: mobile) | Implicit in all phases; no mobile gate until Plan 05 |
| 14 | Server-side config via `sharpee-platform.yaml` | Phase 4 (config injection into HTML) |

---

## Phase Ordering and Parallelism

Strict ordering for Plan 01 internal phases:

```
Phase 1 (Scaffold)
  ↓
Phase 2 (Server endpoints)  ← can be worked in parallel with Phase 3 only if a second committer is available; otherwise sequential
  ↓
Phase 3 (Landing)
  ↓
Phase 4 (Create modal)
  ↓
Phase 5 (Passcode modal)
  ↓
Phase 6 (WS hook + reducer)
  ↓
Phase 7 (Room view skeleton)
  ↓
Phase 8 (Lock-on-typing)
  ↓
Phase 9 (Recording notice)
  ↓
Phase 10 (AC1 verification)
```

Phase 3–5 work on the same Landing page but target different components; fine for a single committer to do sequentially.

---

## Follow-on Plans

- **Plan 02** — `plan-20260422-multiuser-client-02-moderation-chat-lifecycle.md` — chat, moderation, PH settings, delete flow, succession UX.
- **Plan 03** — `plan-20260422-multiuser-client-03-save-restore.md` — save/restore UI, sandbox-crash recovery.
- **Plan 04** — `plan-20260422-multiuser-client-04-dms.md` — DMs and tab system.
- **Plan 05** — `plan-20260422-multiuser-client-05-polish.md` — themes, desktop-only gate, accessibility, title moderation.

---

## Open Questions (resolve during Plan 01)

- **Client-side router**: React Router vs hand-rolled. Decide in Phase 3 when the second route lands. Default: hand-roll for two routes; switch to React Router if a third route appears.
- **Runtime config injection**: confirmed Phase 4 will inject `window.__SHARPEE_CONFIG__`. Open: exact injection mechanism (script tag vs HTML placeholder). Pick the simpler one.
- **ADR-153 addendum for public listing surface**: leaning "no addendum needed; covered by ADR-153 as-written." Revisit if reviewer disagrees.

---

## Estimation

Rough effort estimate per phase (session sized):

| Phase | Size |
|---|---|
| 1 — Scaffold | S (30–45 min) |
| 2 — Server endpoints | M (60–90 min) |
| 3 — Landing | M |
| 4 — Create modal | M |
| 5 — Passcode modal | S–M |
| 6 — WS hook + reducer | L (90–120 min) |
| 7 — Room view skeleton | M |
| 8 — Lock-on-typing | L |
| 9 — Recording notice | S |
| 10 — AC1 verification | S (if clean) / M (if bugs) |

Total: ~8–12 focused working sessions.
