# ADR-156: Multiuser Browser Client

## Status: PROPOSAL

## Date: 2026-04-24

## Relates to

- **ADR-153** (Multiuser Sharpee Server) — this ADR closes the "client framework choice is still open" thread in ADR-153's Consequences section. The server's wire protocol (`ClientMsg` / `ServerMsg`, `RoomSnapshot`, etc.) is the contract; this ADR documents the client that consumes it.
- **ADR-153a** (Multiuser Server Amendments) — the amendment captures the server-side decisions that emerged from Phase 4 remediation. This ADR captures the parallel client-side decisions.
- **CLAUDE.md rule 7b** (Co-Located Wire-Type Sharing) — client↔server wire-type sharing follows this rule mechanically. This ADR does not restate it.
- **CLAUDE.md rule 7a** (Boundary Statements) — the public-listing surface privacy invariant (Decision 3 below) is a boundary statement by another name.

## Context

ADR-153 deferred the browser client's architecture: *"Client framework choice is still open. The decision here covers the server; the browser client's framework (React, Svelte, Solid, vanilla, etc.) is a separate question, addressed by a future ADR or design doc."*

The client brainstorm (`docs/brainstorm/multiuser-client/overview.md`) and techstack (`docs/brainstorm/multiuser-client/techstack.md`) closed the framework question in April 2026. Plans 01–05 (`docs/work/multiuser-client/`) decomposed the client into shippable phases. Plan 01 has been delivered; 02–05 are in various states.

This ADR promotes the **load-bearing architectural decisions** from those documents — the ones that constrain future sessions and that a future contributor could reasonably get wrong without explicit capture. It does *not* restate the framework tradeoffs (those live in `techstack.md`), the UI mockups (`docs/work/multiuser-client/mocks/*.html`), or implementation details like the CAPTCHA widget wrapper or the router choice (those belong in the brainstorm/plan artifacts).

Four decisions qualify as load-bearing. Everything else is implementation.

## Decision

### 1. Client lives at `tools/server/client/`, not as a workspace package

The multiuser browser client is a React 18 + Vite + TypeScript project located at `tools/server/client/`. It is **not** a workspace package under `packages/`, **not** a fork of `packages/zifmia`, **not** an extension of `packages/platform-browser`.

The decisive rationale:

- `packages/` is for reusable Sharpee libraries consumed across products (engine, stdlib, world-model, zifmia, map-editor). The multiuser client is a specific frontend for **one specific server**. It is a tool, not a library.
- `pnpm-workspace.yaml` covers `packages/*` but deliberately excludes `tools/*`. `tools/server/` runs as a standalone npm project (its Dockerfile confirms this). Co-locating the client with the server under `tools/server/` keeps the Dockerfile straightforward and keeps protocol changes visible across both halves of the same commit.
- Wire-type sharing is mechanically clean under this layout: the client imports server types directly via relative path. This is CLAUDE.md rule 7b in action; the layout is what enables the rule.

**Consequence**: the multiuser client is **not a reusable library**. If someone else writes a Sharpee multiuser server, they write their own client. A future alternate Sharpee client (native desktop, screen-reader-first text client, etc.) imports the wire types the same way, but it is its own tool at its own location — not a published package other repos would consume.

The Docker image is the unit of version coupling. The Dockerfile has a client-builder stage (`npm ci && npm run build` inside `client/`); the runtime stage copies `dist/` to `/app/public`. Client and server versions are always matched; no skew strategy needed.

**Rejected**: promoting the client to `packages/multiuser-client/`. It would require publishing the wire types (or inventing a sub-package for them), which defeats rule 7b's direct-import mechanic. It would also imply reusability that does not exist.

### 2. Client state has four explicit phases; hooks respect phase boundaries

The client's room-view state machine has four phases:

- **connecting** — WebSocket opened, `hello` sent, awaiting `welcome`.
- **hydrated** — `welcome` received; room state reconstructed from the snapshot; UI renders normally.
- **closed** — `room_closed` received (reason: `deleted` or `recycled`) or a terminal error that invalidates the session.
- **error** — non-terminal error from the server (`ServerMsg { kind: 'error' }`); rendered as a toast; does not transition the machine.

`welcome` is **a state transition**, not a refresh. The client re-derives its entire view from the `RoomSnapshot` payload on every `welcome` (whether initial or post-reconnect). No merge logic. No "I had this state before disconnect and I'll patch the snapshot onto it." The server is authoritative; the snapshot is the truth.

`room_closed` is **terminal**. The UI transitions to a closed-banner view with a countdown redirect. No component in the room view can render in a way that assumes the session is still active.

**React-specific discipline**: components inside the room view that branch on `connecting` vs. `hydrated` vs. `closed` MUST declare all hooks above the conditional early return. A component that places hooks *after* a `if (state.closed) return ...` or `if (!state.hydrated) return ...` line will violate React's Rules of Hooks across the hydration transition. This is the class of bug that manifested as React error #310 on 2026-04-23 in `Room.tsx`.

**Rejected**: implicit phase management via `useState` booleans sprinkled across components. The four-phase machine lives in the room-state reducer; every component consumes the phase, never mutates it directly.

### 3. Rooms have a public discovery surface; join remains code-gated

The landing page at `/` lists all rooms with at least one currently-connected participant. This is a **spec expansion** of ADR-153, which framed rooms as "private to whoever has the code" and had no listing surface.

**What leaks to the public surface** (per row):
- `room_id` (opaque identifier, usable for client-side routing).
- `title` (operator-moderable user content).
- `story_slug` (which story is loaded — public by nature; the story catalog is already public).
- `participant_count` (number of currently-connected participants).
- `last_activity_at` (ISO timestamp).

**What never leaks to the public surface**:
- `join_code` — ever. Not in the listing, not via any public endpoint, not in HTML comments, not in script tags.
- Participant tokens, participant display names, participant IDs.
- Any `session_events` content (chat, DMs, commands, outputs).
- Any save blob or save metadata.

**Definition of "active"**: at least one row in `participants` with `connected = 1`. Pinned-but-empty rooms do **not** appear in the public list; they still exist server-side, their join code still works, reconnects still succeed — they just aren't discoverable. This excludes both "no one has ever joined" and "everyone disconnected" cases.

**Privacy invariant**: join remains code-gated. The listing surface is *discovery*, not *authentication*. The "code is the credential" framing from ADR-153 Decision 4 is preserved verbatim. Clicking a room from the list opens the passcode modal; clicking a shared `/r/{code}` URL is the same flow with the code pre-filled.

**Rejected**: public/private room toggles per ADR-153 Decision 3. All rooms are listed if active; no per-room visibility configuration. Simpler UX, one privacy rule.

**Rejected**: listing rooms that have participants but zero currently connected. Would cause the list to include stale "someone joined three days ago and never came back" rows that add noise without discovery value.

Moderation of public title content is covered by Plan 05 (a `reports` table + admin CLI) and is not part of this ADR's load-bearing commitments — it's implementation under this decision's umbrella.

### 4. Room title is required, not optional

Contrary to ADR-153 Flow: Creating a Room Step 3 ("Required or optional is a small UX choice; keep optional with a generated fallback"), the create-room form makes title **required**. Server validation: non-empty after trim, length-capped at 80 characters. An empty or whitespace-only title is a 400 on `POST /api/rooms`.

The reason is Decision 3. A room in the public listing without a meaningful title is noise — an auto-generated `{story-slug} — {date}` fallback reduces the discovery surface's signal and forces users to parse slugs to understand what rooms are about. Making title required means every listed room carries one human-authored identifier.

**Rejected**: keeping the fallback and applying it silently when the form is submitted empty. Would produce a listing full of `{story-slug} — {date}` rows that serve no one.

## Invariants

Invariants this ADR upholds beyond the Decisions above.

1. **Wire-type sharing is direct import from the server's `src/wire/`.** Per CLAUDE.md rule 7b. The shared files are runtime-neutral (no `Buffer`, no `fs.Stats`, no `DOMException`). The client's tsconfig points at `../src/wire/*.ts`; `tsc --noEmit` on either side catches drift in the same commit.
2. **The client never holds protocol-level truth.** Every state push from the server is authoritative. The client's reducer produces derived UI state from server-pushed events, never from optimistic local predictions of what the server will say next. (The one exception is the draft-delta live-preview broadcast, which is intentionally optimistic — the server's arbitration is the tiebreaker and the client rolls back on loss.)
3. **The Docker image is the version-coupling unit.** There is no client-old-server or server-old-client matrix to support. A user visiting `play.sharpee.net` mid-deploy may get a cached old client against a new server; a full page refresh resolves it. This is documented in the upgrade runbook, not engineered around.

## Sharpee Package Dependencies

| Package | Role |
|---|---|
| `tools/server/src/wire/primitives.ts` | Direct import — `Tier`, `TextBlock`, `DomainEvent`. |
| `tools/server/src/wire/browser-server.ts` | Direct import — `ClientMsg`, `ServerMsg`, `RoomSnapshot`, `ParticipantSummary`. |
| `@sharpee/*` | **None.** The client does not import any `@sharpee/*` package. Story content reaches the client only through `TextBlock[]` and `DomainEvent[]` payloads on the wire. |
| `react`, `react-dom` | Runtime. |
| `vite`, `@vitejs/plugin-react` | Build-time. |

The "no `@sharpee/*` in the client" posture is a consequence of Decision 1 plus rule 7b — the wire types are the full client↔server contract; nothing else needs to cross the boundary.

## Acceptance Criteria

The ADR's load-bearing commitments are verified by:

1. **AC-C.1 (Location)**: `ls packages/` returns no `multiuser-client`; `ls tools/server/` returns `client/`; `pnpm-workspace.yaml` shows no reference to `tools/server/client/`. Wire-type imports in the client use relative paths to `../src/wire/`.
2. **AC-C.2 (Hydration)**: `tools/server/client/src/state/` contains a reducer that distinguishes the four phases. `Room.tsx` (and every component inside the room view) places all hooks above conditional early returns. A hydration-transition unit test renders the component across `connecting → hydrated` without React warnings.
3. **AC-C.3 (Listing surface)**: `GET /api/rooms` responses contain no `join_code`, no participant tokens, no display names, no event log content. A test verifies each excluded field by asserting its absence in the response body.
4. **AC-C.4 (Title required)**: `POST /api/rooms` with empty or whitespace-only `title` returns 400 with a machine-readable error. The landing-page listing never shows an auto-generated fallback title.
5. **AC-C.5 (Wire-type drift mechanically prevented)**: `tsc --noEmit` fails on the client when the server's `wire/primitives.ts` adds a type the client doesn't compile against, in the same commit. Verified by a PR that intentionally adds an unhandled discriminant and confirms the client fails to typecheck.

## Consequences

### Positive

- **One version-coupling unit.** The Docker image is the ship vehicle. Client-server protocol drift during a single deploy is impossible by layout; drift across tabs of stale clients is the only surface, and it resolves on refresh.
- **Rule 7b enforcement is free.** The client imports the server's wire types directly; adding a new `ServerMsg` variant on the server without handling it on the client fails the client's typecheck.
- **Discovery is real.** The public landing page gives the instance a non-dead front door without widening the join model. Operators running `play.sharpee.net` as a public-lab instance get discoverability; operators running private/club instances get the same listing but with only their rooms on it.
- **The hydration contract is explicit.** A new developer reading the room state machine sees four phases, not a cloud of booleans. Components know what they can assume.
- **No package to publish.** No version numbers, no CHANGELOG, no `npm publish` step. The client ships when the server does.

### Negative / Acknowledged Trade-offs

- **Client can't be reused.** A hypothetical third-party Sharpee-multiuser deployment can't `npm install` this client. That's by design; if reuse becomes real, extracting the wire types into a published package is the natural evolution — and rule 7b would then apply to the extracted package, not the direct import.
- **Listing surface is a privacy-sensitive surface.** Titles are public content. Abusive titles on public instances need operator moderation (Plan 05's `reports` table + CLI). A private-instance operator who wants zero public listing has no config knob today; their options are to never run the instance at the public URL (e.g., behind VPN) or to disable the `/api/rooms` route at the reverse proxy. Operator-configurable listing (per-instance on/off) is a post-MVP addition if real operators ask for it.
- **Title-required blocks the quick "just let me start" flow.** A user creating a room must type something. Acceptable — the listing surface makes this decision downstream-forced, not ceremony.
- **No feature toggles per instance.** The four decisions are static per deployment. An operator can't say "this instance has no listing, just direct-link rooms." Post-MVP if operators ask; no operator has asked.

### Neutral / Follow-ups

- **Router, CAPTCHA widget, theme, storage, hooks** — all implementation details under this ADR's umbrella. Captured in `docs/brainstorm/multiuser-client/techstack.md` and the per-phase plans. If any of those choices becomes load-bearing (e.g., a framework switch from React to something else), it gets its own ADR.
- **Accessibility commitments** live in the brainstorm overview §Accessibility Stance and Plan 05; they don't rise to ADR level but the "state layer is component-tree-agnostic" architectural hedge (kept in Plan 01) is the price of admission for a hypothetical future text-only sibling client.
- **Mobile.** Explicit non-goal per ADR-153 Decision 13. Plan 05 adds a small-viewport placeholder; no responsive redesign.

## Implementation Status

- **Delivered** (Plan 01): location, hydration contract foundations, public listing endpoint (`GET /api/rooms`), title-required validation, Plan 01's AC1 two-user smoke.
- **Pending** (Plans 02–05): chat, moderation, save/restore UX, DMs, accessibility pass, report/takedown flow for public titles.

The four ADR decisions are complete as of Plan 01 delivery. Plans 02–05 build features *under* these decisions; they do not revise them.

## Amendment — ADR-161 Identity Surfaces (2026-04-26)

ADR-161 (Persistent Identity Model) replaced the original session-bound
display-name model from this ADR's Plan 01 with a global `(Id, Handle,
passcode)` triple. The client surface area touched by this amendment:

- **HTTP wire types** are now shared via direct import from
  `tools/server/src/wire/http-api.ts` rather than hand-mirrored in
  `client/src/types/api.ts`. Both sides import the same file; the
  rule-7b drift guarantee from this ADR's Decision 5 now extends to
  every HTTP shape (`RoomSummary`, `JoinRoomRequest`,
  `CreateIdentityResponse`, `EraseIdentityRequest`, …) in addition to
  the WS protocol.
- **`ParticipantSummary`** in the WebSocket protocol exposes the
  participant's public identity as `handle` (renamed from
  `display_name`). The participants table never carried a per-room
  display name; the field is now sourced canonically from the joined
  identity row at read time.
- **`RoomSummary`** in the public room-list response carries
  `participants: { handle: string }[]` instead of an opaque
  `participant_count`. The landing page renders an inline roster
  preview from this list (cap 5 inline + `+N more`) so users see who
  is in a room before they ask to enter.
- **First-visit identity setup banner** (`IdentitySetupPanel`) and
  **persistent identity-management popover** (`IdentityPickerButton`
  + `IdentityPanel`) are added to the App shell. The banner replaces
  the old name-on-create flow; the popover gives the user
  download/erase affordances. Erase is gated by a Handle-typed
  confirmation modal.

For the full identity contract (lifecycle routes, error mapping,
WebSocket close codes, schema), see ADR-161.

## References

- **Parent**: `docs/architecture/adrs/adr-153-multiuser-sharpee-server.md` (server architecture; this ADR is the client half).
- **Amendment**: `docs/architecture/adrs/adr-153a-multiuser-server-amendments.md` (server-side deltas from Phase 4 remediation, parallel to this ADR's client-side capture).
- **Brainstorm**: `docs/brainstorm/multiuser-client/overview.md`, `docs/brainstorm/multiuser-client/techstack.md`.
- **Plans**: `docs/work/multiuser-client/plan-20260422-multiuser-client-0[1-5]-*.md`.
- **Root assessment**: `docs/work/multiuser/root-assessment.md` (§3.4, §3.5, §3.6, §3.10, §4 Decisions 16, 19, 20).
- **Methodology**: CLAUDE.md rule 7b (Co-Located Wire-Type Sharing), rule 7a (Boundary Statements).
- **Amendment**: ADR-161 (Persistent Identity Model) — see "Amendment" section above for the client-surface delta.
