# Multiuser Browser Client — Brainstorm

**Status: COMPLETE** — Brainstorm concluded 2026-04-22. Ready for planning and implementation. Five plan docs will land under `docs/work/multiuser-client/`.

**Vision** (one line): A thin, desktop-browser client that lets participants join a Sharpee multiuser room, watch commands stream live (lock-on-typing), chat, and share the protagonist — talking to the multiuser server defined in ADR-153.

Started: 2026-04-22. Companion to the server brainstorm at `docs/brainstorm/multiuser/overview.md`, which grounded ADR-153.

## Brainstorm Progress

- [x] **Problem & Vision** — Landing is a discovery surface (active rooms + stories + create), passcode-gated joins via modal; ADR-153 privacy model preserved.
- [x] **Core Concepts** — Inherited from ADR-153 (rooms, participants, tiers, tokens, WebSocket message types). No client-specific additions.
- [x] **User Activities** — Covered via landing-page flows, create/join modals, and room-view component list (below); detailed step-throughs deferred to per-plan Behavior Statements.
- [x] **Structural Patterns** — High-level component layering captured in `techstack.md`; detailed hierarchy belongs in each plan doc.
- [N/A] **Competitive Landscape** — Covered by the server brainstorm (`docs/brainstorm/multiuser/overview.md`): intfiction.org signal, Discord-screenshare friction. Client inherits the framing.
- [x] **Tech Stack** — React 18, `tools/server/client/`, served by Node server, Vite dev loop → `techstack.md`
- [x] **Architecture** — SPA with HTTP+WS to server; localStorage token; `useReducer`+context; types shared via in-repo import → `techstack.md`
- [N/A] **Role Assessments** — Deferred; user elected to proceed directly to planning.
- [N/A] **Thought Exercises** — Deferred; ADR-153's acceptance criteria (AC1–AC7 on the client side) already function as concrete scenarios the plans will satisfy.
- [N/A] **Revenue & Business Model** — Open-source, self-hostable Sharpee. No monetization surface in this work.
- [x] **MVP Scope** — Full ADR-153 client feature surface in v0.1, decomposed across five plan docs (Plans 1–5 below). No feature deferred past v0.1.
- [x] **Open Questions** — Captured below.

## Starting Context (from the kickoff)

Six open questions surfaced from reading ADR-153 against the current repo state:

1. **Framework** — React / Svelte / Preact / vanilla? Existing clients (`packages/zifmia`) are React 18/19.
2. **Package location** — new `packages/multiuser-client/`, extend `platform-browser`, fork Zifmia?
3. **Hosting** — serve static assets from the Node server (closes `/` → 404 gap, one process) vs separate deploy (CDN, separate origin, CORS).
4. **MVP cut points** — ADR-153 describes many features; what is v0.1 must-have vs defer-to-later?
5. **Theme** — inherit Zifmia's four themes (classic-light, modern-dark, retro-terminal, paper) or start fresh?
6. **Dev loop** — fold into `./build.sh -s <story> -c multiuser` vs standalone Vite dev server pointing at `localhost:8080`?

## Existing Assets

- **`packages/zifmia`** — React single-player runtime. Has `GameShell.tsx`, menu/overlays/status/transcript components, `themes.css`, loader/runner/storage layers. Precedent for house style.
- **`packages/platform-browser`** — `BrowserClient.ts`, audio, display, managers. Lower-level browser integration.
- **`packages/map-editor`** — another client in the repo; not directly relevant.

## ADR-153 Client-Relevant Commitments

(Cited inline during discussion; not duplicating the full spec here.)

- Desktop/laptop only (explicit non-goal: mobile)
- Durable session token in localStorage, scoped to room URL
- WebSocket protocol fully typed (`ClientMsg` / `ServerMsg` discriminated unions)
- Lock-on-typing input with live preview (`draft_delta` → `draft_frame`)
- REC indicator (persistent, always visible)
- Copy buttons for URL + raw join code
- Tabs: PH sees Room + per-Co-Host DM tabs (lazy); Co-Host sees Room + Primary Host tab; Participants/CEs see no tabs
- Type-to-confirm delete flow
- Recording-transparency notice on join

---

## Problem & Vision

### Landing page

`https://play.sharpee.net/` is a **discovery + activity surface**, not a lobby and not a dead route.

- Shows the list of stories the operator has preloaded (`GET /api/stories` — already exists).
- Shows the list of current rooms with:
  - Room title
  - Which story is loaded
  - Number of participants currently in the room
  - An **Enter room** affordance (link/button)
- Plus a **Create room** action.

### Privacy / join model

All rooms remain **passcode-protected** — consistent with ADR-153. Listing a room on the landing page does **not** make it joinable without the code.

- Anyone can see that a room exists, what game it's running, and how many people are in it.
- Clicking Enter prompts for the passcode (or resolves via `/r/{code}` if they already have the URL).
- No "public room" vs "private room" tier — all rooms are code-gated; the landing list is a discovery signal, not a join affordance.

### Listing criteria

Only **truly active rooms** appear on the landing page — a room needs at least one currently-connected participant to be listed. Empty rooms (even within their 5-minute PH grace, even pinned) are hidden from the public list until someone connects again.

- Trade-off accepted: a room flickers off the list when the last participant disconnects and reappears when anyone reconnects. For v0.1 this is simpler than a "recently active" windowed view.
- The room still exists server-side — passcode still works, participants can still reconnect. Hiding is purely a public-visibility thing.
- Implementation: `GET /api/rooms` filters to `WHERE EXISTS (SELECT 1 FROM participants WHERE room_id = rooms.room_id AND connected = 1)`.

### Room title

The **Primary Host authors the title** at room-create time. Shown publicly on the landing page next to story name and participant count.

- Implies: the create-room form needs a Title field in addition to story slug + display name + CAPTCHA.
- Implies: title is editable later (in room settings) — since the PH may want to rename e.g. "Tuesday book club" to "Tuesday book club — chapter 2."
- Server validation: length-capped (suggest 80 chars), must be non-empty after trim. No silent defaulting — empty title = server-side validation error on POST /api/rooms.
- Moderation: open problem for a public instance. Out of scope for v0.1 — flagged in Open Questions. For a single-operator-single-community instance, the host controls membership socially; for `play.sharpee.net` as a "public lab instance," we may eventually want a report/takedown flow.

### Entering a room from the list

A **passcode modal** opens over the landing page when the user clicks Enter. No full-page navigation to a "join page."

- Modal contents: passcode input, display name input, CAPTCHA widget, Cancel / Submit.
- On submit: POST to the join endpoint → server issues a durable session token → modal closes → client transitions to the room view.
- On failure (wrong code, room closed, CAPTCHA invalid): error stays inside the modal; user can retry or cancel.
- The `/r/{code}` URL-share path still works independently: clicking a shared link pre-fills the passcode (or auto-submits if the URL path alone is considered proof of having the code — TBD; leaning toward pre-fill so the display-name + CAPTCHA step still happens).

### Implications

- **Server gap**: `GET /api/rooms` (list non-secret room metadata) likely does not exist yet. Current server has `POST /api/rooms` (create) and `GET /r/:code` (resolve a known code). The list endpoint needs to be added and must be careful to expose only non-secret fields: `room_id`, `title`, `story_slug`, `participant_count`, `last_activity_at` — **never** `join_code` or participant tokens. This becomes a Phase 1 prerequisite in the client plan.
- **Spec deviation from ADR-153**: the original brainstorm framed rooms as private/code-only (no listing surface). This brainstorm adds a public *listing* surface while keeping the join-code privacy model intact. Worth noting in the client plan's ADR section; may need a small addendum to ADR-153 or a new ADR.

---

## MVP Scope and Plan Decomposition

Full ADR-153 client feature surface in v0.1. No feature deferred past v0.1. Split across five sequential-to-mostly-sequential plan docs under `docs/work/multiuser-client/`.

| # | Plan | Closes | Depends on |
|---|---|---|---|
| 01 | **Foundation + Two-user smoke** | AC1 | — |
| 02 | **Moderation, Chat, and Lifecycle** | AC3, AC4, AC5, partial AC6 | Plan 01 |
| 03 | **Save/Restore and Crash Recovery** | AC2, AC7 | Plan 01 |
| 04 | **DMs (PH ↔ Co-Host)** | ADR-153 DM spec | Plan 02 (chat infra) |
| 05 | **Polish and Themes** | Accessibility, theme parity, desktop-only gate, title moderation | All prior |

**Plan 01 scope**: scaffold `tools/server/client/` (React + Vite + TS), server-side add `GET /api/rooms` + static-file middleware, landing page (stories + active rooms + create), create-room modal, passcode modal + `/r/{code}` deep-link, recording-transparency notice, room view (transcript + lock-on-typing + REC + roster + copy buttons), WS with token reconnect, one theme. End state: two browsers, AC1 smoke passes.

**Plan 02 scope**: chat UI; roster-level moderation (mute/unmute, promote/demote); PH settings panel (pin/unpin, nominate successor, delete room with type-to-confirm); succession UX (PH-grace countdown, auto-promote toast); room-closed banner.

**Plan 03 scope**: save button + save list + restore button; RESTORED text-block rendering; sandbox-crash notice with restore-from-last-save affordance.

**Plan 04 scope**: tab system in room view; per-Co-Host DM threads (lazy tabs for PH, single PH tab for Co-Hosts, invisible for Participants/CEs); unread counts; persistence across reconnect.

**Plan 05 scope**: desktop-only gate (small-viewport placeholder); accessibility pass (a11y, keyboard nav, reduced-motion); title moderation (report/takedown flow). (Themes moved to Plan 01 — v0.1 ships all four Zifmia themes with a per-user picker.)

**Ordering**: 01 → 02 → 03 → 04 → 05, but 02 and 03 can be parallelized if desired since they don't share files meaningfully. 04 depends on 02's chat infrastructure. 05 is the polish parking lot.

---

## Accessibility Stance

**Decision**: single client, accessible-first. No sibling "text-only" client in v0.1.

**Bar**: match what standard single-player IF interpreters (Frotz, etc.) already give a screen-reader user — clean line-based transcript announcements via `aria-live`, clearly labeled command input, no per-keystroke noise, lock-transitions announced once per change, tier/state badges expanded for SR via `aria-label`. IF has a strong SR player base and a high floor for what's already considered accessible; the multi-user client shouldn't regress below that floor.

**Rationale**: blind IF players exist (Club Floyd community, IFTF outreach), but their current environment — telnet to a MUD-style text protocol — is a different architecture. A sibling text client would reinvent a wheel, and a text-first fork would likely lag the primary client in features. Better to invest in making the primary SR experience first-class and iterate based on real feedback from `play.sharpee.net` users.

**Architectural hedge**: keep the client's state layer (reducer, WS hook, storage helpers) deliberately free of React-component-tree concerns, so that *if* we later build a sibling text client (Plan 06 post-v0.1), it can import the same state machinery without a rewrite. This is a Plan 01 discipline, not Plan 06 retrofit cost.

**Testing**: exercise the client with VoiceOver (macOS) and NVDA (Windows) during AC1 verification — not as a Plan 05 final pass. A real blind player joining an AC1 smoke room is the best signal.

---

## Open Questions

Flagged during brainstorm; resolve during or after planning as they come up.

- **Client-side router**: React Router vs a minimal hand-rolled router for two routes (`/` and `/room/:room_id`). Defer to Plan 01 implementation — if React Router's footprint feels excessive for two routes, hand-roll it.
- **CAPTCHA widget integration**: ADR-153 covers the server side but not which React wrapper (`react-turnstile`, `react-google-recaptcha`, hand-rolled). Confirm in Plan 01.
- **Deep-link auto-submit behavior**: when user opens `/r/{code}` directly, do we pre-fill the passcode modal (leaning yes) or auto-submit and jump to display-name-only step? Confirm in Plan 01.
- **Title moderation for public instances**: flagged earlier. Addressed in Plan 05.
- **Server `GET /api/rooms` endpoint shape**: needs a small server-side addition before the landing page can populate. Plan 01 prerequisite — can either be a Plan 01 Phase 1 task or a separate server patch.
- **ADR-153 addendum for the public listing surface**: the original brainstorm framed rooms as private-by-code-only. Adding a landing-page listing is arguably a spec deviation. May want a small ADR addendum. Flag at start of Plan 01 and defer if it fits under ADR-153 as-written.

---

**End of brainstorm.** See `techstack.md` for technical decisions. Plan docs will land at `docs/work/multiuser-client/plan-20260422-multiuser-client-0N-{name}.md`.
