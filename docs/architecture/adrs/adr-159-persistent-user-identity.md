# ADR-159: Persistent User Identity for Multi-User Rooms

## Status: PROPOSAL

## Date: 2026-04-25

## Relates to

- **ADR-153** (Multiuser Sharpee Server) — defines the per-room participant token model that this ADR promotes to a portable identity layer.
- **ADR-153a** (Amendments) — operational invariants this ADR adds to.
- **ADR-156** (Multiuser Browser Client) — owns the UI work for identity creation, recovery, and "show my identity" assistance. ADR-156 will gain a section that consumes this ADR's contracts.
- **ADR-160** (Engine-State Continuity, *forthcoming*) — second half of the "re-accessing a room" promise. Independently designable. Identity is the precondition; engine-state continuity decides what world a returning identity sees.

## Context

A participant in a multi-user room today is a `(room_id, participant_id, token)` triple, where `token` is an opaque UUID stored in `localStorage` keyed by the room URL. Per `tools/server/src/http/tokens.ts` documentation: *"losing the token means losing the seat."*

The lived consequence: every form of re-access by the same human creates a new participant.

| Scenario                                                                  | Current behavior                                                  |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Same browser, browser closed and re-opened, same URL                      | localStorage survives → resolves to same participant. ✓           |
| Different browser, different machine, same URL                            | No localStorage → new participant_id, no continuity with prior. ✗ |
| Same machine, cleared cookies / incognito                                 | No localStorage → new participant. ✗                              |
| Email link to room URL opened on phone after first joining on laptop      | No localStorage → new participant. ✗                              |
| User has joined many rooms over time                                      | No "where have I been" view; each room a distinct stranger. ✗     |

The system has no concept of *the same human across visits*. A returning user cannot reclaim their previous seat, see their prior rooms, or carry display name continuity. There is also no recovery: a user who clears `localStorage` is permanently locked out of every room they had joined.

This ADR addresses **identity continuity** as a standalone problem. **Engine-state continuity** (whether the world the returning user sees is the world they left) is a separate problem with its own design tensions; ADR-160 will cover it. Identity is the precondition: solving engine-state alone gives "the world is here but you're a stranger to it"; solving identity alone gives "you got your seat back in an empty world." Both must hold for the user-facing promise *"come back to a room you joined before."*

The audience does not warrant heavy auth machinery: this is a community of IF readers, not a production app. Email is rejected as a hard dependency (deliverability, infrastructure, GDPR surface). Login systems with password reset are rejected as scope-disproportionate.

## Decision

### Shape

A user creates a **persistent identity** at first visit. Identity is a triple `(username, identity_id, secret)`:

- **`username`** — globally unique, server-enforced.
- **`identity_id`** — server-generated UUID, the stable primary key.
- **`secret`** — server-generated UUID, the credential that proves *"I am the human who created this identity."*

`identity_id` is the database-side primary key for participation; `secret` is the credential the user holds; `username` is what other participants see.

### Storage

Server-side:

```sql
CREATE TABLE identities (
  identity_id   TEXT PRIMARY KEY,    -- UUIDv4
  username      TEXT NOT NULL UNIQUE,
  secret_hash   TEXT NOT NULL,        -- argon2id or scrypt; never stored plaintext
  created_at    TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL
);
```

Client-side: `secret` (plaintext UUID) lives in `localStorage` under a fixed key (`sharpee:identity`). `username` lives alongside for UX (display in the UI without a server round-trip). The DB never stores plaintext.

### Membership model

`participants.identity_id` becomes a foreign key to `identities`. Existing columns stay:

- `participant_id` remains the per-room primary key — it identifies a seat, not a human.
- `token` becomes a connection-session marker (one per active WS connection), derived from `(identity_id, room_id)` rather than a human's primary credential.
- `display_name` is sourced from the identity's `username` at room-join time; it does not vary per-room. (Pseudonyms-per-room are out of scope; if needed later, that's an additive decision.)
- `tier`, `muted`, `is_successor`, `connected` remain per-room properties.

A single identity has 0..N participant rows — one per room they have ever joined.

### Identity lifecycle

**Create.** First visit (no `localStorage` entry, user opts to create): user picks a username; server enforces uniqueness; on success, server generates `identity_id` + `secret`, stores `(identity_id, username, hash(secret))`, returns `(identity_id, username, secret)` to the client. Client persists username + secret in `localStorage`. UI displays the secret with explicit copy-to-clipboard and a "Save this — we cannot recover it for you" confirmation gate.

**Resolve (warm).** Subsequent visits with `localStorage` intact: client sends `(username, secret)` on the WS hello frame; server hashes and compares, resolves to `identity_id`. No user action.

**Reclaim (cold, e.g. fresh device).** `localStorage` is empty: UI offers "I have an identity → paste username + secret." Client sends, server resolves identical to warm path. Same `identity_id` is recovered; all prior room memberships become visible.

**Lost secret.** No recovery. The user creates a new identity. Their prior identity remains in the database but is unreachable. Documented as "save this somewhere safe — we cannot help you if you lose it."

### Cross-device assistance

A "Show my identity" panel in the client (ADR-156's surface area) provides:

1. Plain-text copy-to-clipboard for `(username, secret)`.
2. Download-as-file (`.identity.json`, contents `{ username, secret }`).
3. *(Future, no server work)* QR-code rendering using a small in-browser library so a phone can scan a laptop's identity into its `localStorage`.

The server is not involved in cross-device transfer — it is a client-side affordance only.

### Hello frame contract

The current WS `hello` frame carries `(participant_token)`. It changes to carry `(username, secret)`. Server hashes and verifies, then either:

- Resolves to `identity_id` (warm or reclaim path), then looks up or creates a `participant` row for `(identity_id, room_id)`.
- Rejects with a `bad_credentials` error if the secret does not match a known username.
- Rejects with `unknown_identity` if the username does not exist (only when client claims to have an existing identity — distinguishing from the create path).

The server may return distinct error codes for "no such username" vs "wrong secret"; user-existence leak is acceptable for a public IF community.

### Username uniqueness — squatting note

A first-mover keeps `bob` forever. There is no mediation, no claims process, no reset. This is a deliberate trade for simplicity over fairness; in the IF community context, name collisions are infrequent and squatting a community handle is socially policeable. If this becomes a real problem, a separate ADR can introduce reservation policies (e.g. dormant-identity reclamation after N years).

## Consequences

### Positive

- A returning user on any device can reclaim their seat with a username + secret pasted from anywhere.
- Cross-room identity: visiting a second room shows up as the same `username`; PH-mediated invitations and chat have continuous identity.
- Existing per-room participant model survives — no schema rewrite. `participants` gains a foreign key, the `token` column changes role (connection-session marker), but row semantics are intact.
- No email infrastructure, no password reset, no account recovery support burden. The recovery-failure path is explicit and user-owned.
- Clear separation from engine-state continuity (ADR-160): each problem reviewable on its own.

### Negative / Cost

- **Lost secret = lost identity.** No mitigation. UX must communicate this clearly at creation. Some users will lose their identity and create a duplicate; the orphan rows are minor DB cost.
- **Squatting.** First-mover wins. Likely fine; flagged here so future maintainers don't re-litigate.
- **Username existence leak.** Server distinguishes "unknown user" from "wrong secret" in error responses. Acceptable for a public community; would not be for a private system.
- **No server-mediated cross-device transfer.** Users either copy/paste, save the file, or lose access on the second device. Acceptable for the audience.

### Constrains Future Sessions

- New WS hello flow must use `(username, secret)`. Other places that currently consume `participant_token` (HTTP routes for save/list-rooms, etc.) must accept the new credential or derive the per-room token from the identity.
- ADR-156's UI plan adds: identity-creation flow, identity-reclaim flow, "show my identity" panel. ADR-156 amendment lands after this ADR.
- ADR-160 (engine-state continuity) takes identity as given.
- Any future "I want a different identity per room" feature is an additive change to `participants` (a per-room `display_name_override`), not a rework of this ADR.
- Any future account/email integration is layered on top of this identity (an identity gains an optional email; this ADR does not need to retract).
- **The `identities` table schema is a stable interface.** Admin tooling — current (delete-identity script) and future (identity transfer / export / import between deployments) — binds to this schema. Greenfield-mode and one-shot cutover apply to the rest of the platform; the `identities` table is the named exception. Changes to its columns or constraints require a deliberate review of every admin script that reads or writes it. New columns may be added; existing columns should not be renamed, dropped, or have their semantics shifted without updating the admin tooling in the same change.

### Does Not Constrain

- Existing per-room participant token mechanism survives as a connection-session marker. Code paths reading `participants.token` for connection routing do not need to change immediately.
- Display-name presentation is unchanged from a participant's perspective: the UI still shows a string. The string is now sourced from the identity's username.
- ADR-153 PH (Participant Host) succession logic — `is_successor`, grace timer, nominate/promote/demote — operates on participants, not identities. Unchanged.

## Rollout

One-shot cutover. The Sharpee multi-user server is operated by an admin who installs games and starts them; schema and wire-protocol changes are not softened by additive-then-deprecate windows. The admin coordinates disruption to currently running games (announce, drain, cut over, restart) when this ships.

Concretely:

- `identities` table is created.
- `participants.identity_id` is `NOT NULL` from the start. Foreign-key into `identities`.
- The WS `hello` frame carries `(username, secret)` from the start. There is no dual-credential handler for the old `(participant_token)` shape.
- Any pre-existing `participants` rows from prior dev/test runs are wiped at deploy; greenfield posture means no data preservation requirement.

## Acceptance Criteria

| ID    | Criterion                                                                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1  | A new user can create an identity with a unique username; duplicate usernames are rejected with a clear error.                                         |
| AC-2  | A user with `localStorage` intact reconnects to a room they previously joined and resolves to the same `participant_id`.                               |
| AC-3  | A user on a fresh device can paste `(username, secret)` and resolve to their existing `identity_id`. All their prior room memberships become visible.  |
| AC-4  | The "Show my identity" UI displays `(username, secret)` with copy-to-clipboard, and offers a `.identity.json` download.                                |
| AC-5  | A wrong secret for a known username returns `bad_credentials`; an unknown username returns `unknown_identity`.                                         |
| AC-6  | The DB never stores plaintext secrets — verified by inspection and a unit test that hashes are non-reversible (argon2id or scrypt).                    |

## Resolved Implementation Choices

1. **Hash function.** argon2id via the `argon2` Node package. Default parameters acceptable for v1; tune if profiling shows hot-path cost.
2. **Username constraints.** 3–32 characters, `[A-Za-z0-9_-]+`, case-insensitive uniqueness (e.g. "Bob" and "bob" collide). Original case is preserved for display; the uniqueness check is on a `LOWER(username)` index. No banned-word list — community moderation is the policeable path.
3. **Rate limiting.** Per-IP throttle on identity create and reclaim endpoints — 10 attempts per minute, sliding window. Brute-forcing a 128-bit UUIDv4 secret is computationally infeasible regardless, but the throttle keeps log noise down and stops trivial scrapers.
4. **Identity deletion.** Not a runtime feature in v1. The server admin gets a script (`scripts/delete-identity.ts` or similar) that takes a `username`, soft-deletes the identity, and reassigns or anonymizes referencing `participant.identity_id` rows. If users start asking for a "delete my identity" UI, that becomes an additive change.

## Session

`session-20260425-…-multiuser-identity.md` (this ADR) → ADR-160 (engine-state continuity, separate session).
