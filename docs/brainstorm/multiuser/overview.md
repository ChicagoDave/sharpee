# Multi-User Sharpee Story Runner (Browser-Based)

A shared-session IF experience where multiple users participate in a single game instance through their browsers.

**One-line vision:** A less-awkward way for IF players to play a game together than screen-sharing over Discord/Zoom.

## Shape of the Thing

**Open-source, self-hostable platform software.** The project ships the code for running an instance; anyone can deploy their own. The Sharpee project may operate a reference instance (working name: `sharpee.net`) for convenience and demonstration, but it is one deployment among many — not an exclusive SaaS.

This is the Mastodon / Matrix / GitLab-CE / Gitea model, not the Discord / Jackbox.tv model.

### Operator profile (who runs an instance)

A Sharpee-platform instance can be stood up by:
- An IF club for its members.
- An individual author for their beta circle.
- IFTF for a comp's beta-test window.
- A teacher for a class unit on IF.
- A casual group of friends.
- The Sharpee project itself, as a demo and a public refuge for people who don't want to self-host.

Each operator decides their own policies: who can upload stories, whether the catalog is open or invite-only, whether accounts are required, retention rules beyond the defaults, etc.

### Implications for the design

- **No managed-service dependencies.** The platform must run on a plain Linux box with Node/Deno/SQLite. No mandatory Cloudflare, no mandatory S3, no mandatory anything-cloud. (Operators may *choose* to plug in S3 for backups, etc., but must not be forced to.)
- **Sensible defaults, small config surface.** Configuration is a single declarative file (YAML or TOML) plus env vars for secrets. Not a sprawling admin panel.
- **Operator documentation is a first-class deliverable.** An install guide, a config reference, a backup/restore runbook, and an upgrade guide. Not optional.
- **No feature is Sharpee.net-exclusive.** Every capability ships in the open-source code. No closed-source Sharpee-hosted "pro" features.
- **Reverse-proxy-agnostic.** Node server speaks plain HTTP/WebSocket; operators front it with Apache, nginx, Caddy, Traefik — their choice.

### Scope discipline

Because each operator sets their own policies, the MVP does **not** need to solve every use case in one build. It needs to provide the primitives so that different operators can configure their instance for different purposes. Beta testing, game night, classroom, club event, private author workflow — all should be expressible as configurations of the same primitives.

## Example Use Cases

The platform is general-purpose. Different operators configure instances for different purposes. Representative examples, not exhaustive:

### IF beta testing (author → testers)
Author stands up an instance (or uses `sharpee.net`), loads their pre-release `.sharpee`, invites testers by code. Author watches in real time, sees exactly what testers see, reviews transcript afterward. Replaces the email-the-file + handwrite-notes workflow. Strongly motivated for comp authors each year (IFComp, ParserComp, Spring Thing, Ectocomp).

### Club game night
An IF club runs a monthly "let's play X together" event. Someone hosts a room, members join, they play through a classic together with shared input.

### Classroom / teaching
Teacher runs the platform for a unit on IF. Students join a shared room to explore a curated story collaboratively. Teacher observes participation and intervenes.

### Private friend group
Three friends want to play a game together on a Saturday night without wrestling Zoom. Someone spins up a rented VPS with the platform, or uses `sharpee.net`, and they play.

### Comp-organizer beta window
IFComp (or another event) operates an instance for its annual beta-test period. Authors register, upload their works, manage their own tester rooms. Instance is decommissioned after the window.

### Demo / archive
A single-purpose instance dedicated to running a specific classic work with a standing invitation — e.g. a Floyd-style venue.

## Motivation

Signal from the IF community (intfiction.org): people want to play IF games together and are currently cobbling it together with Discord/Zoom. The experience is awkward. This brainstorm is about understanding what a purpose-built solution would look like — not yet a commitment to build.

Implications of this framing:
- **Community tool, not commercial product** (at least initially). Success = IF community would actually use it.
- **Pain-point-driven, not feature-driven.** The goal is relieving specific friction, not inventing new mechanics.
- **Competes with "do nothing" and "use Discord/Zoom"** — the MVP bar is lower than a ground-up product, but adoption requires being meaningfully better than the status quo.

## Core Pain Point

From the intfiction signal: **the command line cannot be shared, and there is no way to take turns entering commands.**

In a Discord/Zoom session, whoever is screen-sharing also owns the keyboard for the game. Other participants can dictate commands verbally or type them into chat, but the screen-sharer is a manual relay — they have to transcribe and submit on everyone else's behalf. This creates:

- A bottleneck (one person's typing speed gates everyone's turn).
- An authority imbalance (the relay gets to edit, reject, or reinterpret others' commands, even unintentionally).
- A participation cliff (quieter players stop contributing because interrupting voice to request a command feels socially expensive).

The solution space therefore has to address **shared or passable input authority**, not just shared visibility. "Prettier Discord" is the wrong frame; the right frame is closer to "networked game controller with a handoff mechanism."

## Session Model (from prior R&D)

### Important distinction: role vs. location

"Primary Host" in this document refers to a **role within a session** — the participant with the highest authority, who started the session and can delegate to others. It is **not** a statement about where the game actually executes. A Primary Host might be running the game in their own browser, or might be a user of a server that runs the game on their behalf. Execution location is a separate architectural question (see Open Questions).

### Joining

- The user who starts the story becomes the **Primary Host**.
- The Primary Host receives a shareable **join code** (format like `XYZB-3F56`) which others use to enter the session.
- No accounts needed — the code is the credential for joining.

### Roles

- **Primary Host** — started the session. Highest authority. Can promote others.
- **Host** — a participant the Primary Host (and possibly other Hosts) has delegated authority to.
- **Command Entrant** — a participant Hosts have granted permission to enter game commands. All Hosts are implicitly Command Entrants.
- **Participant** — any other joined user. Presumably can observe and chat but not issue game commands. (TBD — needs confirmation.)

Authority flows top-down: Primary Host → Hosts → Command Entrants → Participants. Delegation is an explicit action by someone with higher authority.

### Input Model: Lock-on-Typing

Command Entrants (all Hosts plus delegated users) can enter commands with no turn mechanic or queueing — it's free-for-all.

**The exception:** as soon as any Command Entrant begins entering a command, **all other inputs are locked out** until that command completes. This prevents collisions while avoiding the ceremony of explicit turn-passing. In effect, the "controller" is held only for the duration of a single command's composition, then released automatically.

### Layout

- **Left side — Story pane.** Primary surface. Narrative output, command input, status/score line, any contextual sidebar content the story emits.
- **Right side — Chat pane.** Out-of-band conversation among participants. Separate channel from game transcript.

## Security Posture of `.sharpee` Files

A `.sharpee` file is **executable JavaScript**, not declarative data. `build.sh` bundles the story's TypeScript source into an ESM module via esbuild; the runner loads it with dynamic `import()` into the host's browser context. The story code runs with the same privileges as the runner page.

This differs from classic IF formats (`.z5`, `.blb`, TADS), which run inside VMs that constrain what a story can do. Sharpee stories are not VM-constrained — they are JavaScript with browser-level privileges.

### What a malicious `.sharpee` can do in a browser
- Exfiltrate session data via `fetch()`
- Forge messages on the platform relay (fake chat, spoofed engine output)
- Inject phishing content into `text_blocks` that appears to other participants
- Consume arbitrary CPU/memory (tab hang, OOM)
- Open outbound WebSocket / WebRTC connections
- Read cookies / `localStorage` / `IndexedDB` on the runner's origin (**this is the key platform-auth threat**)
- Persist tracking across sessions

### What the browser sandbox still prevents
- Filesystem, syscall, or OS-level access
- Cross-origin data reads (a story loaded in `run.sharpee.io` cannot read cookies on `sharpee.io`)
- Escape into the user's desktop environment

### Mitigating factors (real, but not sufficient alone)
- Strong social accountability in the IF community
- User-initiated: the loading user chose to run the story; damage is mostly self-contained
- Not an auto-update supply-chain vector today

### Implications for architecture

**Platform-as-rendezvous (game in each host's browser)**
- Platform itself is largely protected — bad stories damage the host who loaded them.
- **Critical mitigation:** run the story inside an iframe loaded from a **different origin** than the platform auth surface. Otherwise a bad story steals platform cookies. This is the standard pattern for hosted code-execution services (CodeSandbox, JSFiddle, StackBlitz).
- Message framing must distinguish platform-emitted content from story-emitted content, to prevent stories from forging engine output or platform notices.
- Manageable with established web platform patterns.

**Platform-as-runtime (game on platform servers)**
- Platform directly executes untrusted JS. Workers are not a security boundary; child processes are weak; microVMs (ADR-152) are the first real line.
- Substantial operational and engineering commitment.
- Inescapable cost of centralizing execution.

### Running Untrusted `.sharpee` on the Server

Given the decision to run the engine server-side, the platform will execute uploaded story code on its own infrastructure. Safely executing untrusted JavaScript is a known-hard problem with a well-developed set of solutions — but static filtering is **not** one of them.

#### Why "filter then load" does not work as a primary defense

- JS has too many indirection mechanisms (computed property access, indirect eval, tag functions, `Function.prototype.constructor`) for name-based or keyword-based filtering to be sound.
- AST-based denylists historically lose to reflection through primordials (e.g., `{}.constructor.constructor("return this")()`).
- Node's `vm` module documentation explicitly warns it is not a security mechanism.
- Google's Caja, Facebook's FBJS, and similar "filter/rewrite" approaches have been deprecated after years of trying, due to an unbounded escape surface.

Filtering can play a supporting role (lint-level preflight, dependency whitelist, human-review surfacing) but must not be the isolation boundary.

#### Real isolation options
| Approach | Strength | Cost | Notes |
|---|---|---|---|
| Deno with `--allow-none` | Strong (V8 + permission model) | Low | Purpose-built for this; cleanest fit for small-scale community platform |
| Cloudflare Workers / Deno Deploy | Strong (hypervisor + permission) | Pay-per-request | Operationally hands-off; scales trivially |
| `isolated-vm` (Node) | Medium (V8 isolate + resource limits) | Medium | Stays in Node ecosystem |
| Container per room | Medium (shared kernel) | Medium-high | Docker-style; needs orchestration |
| Firecracker microVM | Strong (hypervisor) | High | ADR-152's top-tier option |
| WASM with explicit imports | Strong (no ambient authority) | High | Requires Sharpee runtime port to WASM |

#### Preliminary lean
For a community-scale platform with modest budgets, **Deno with explicit permissions** or **Cloudflare Workers / Deno Deploy** are the most attractive: real isolation, minimal operational overhead, no custom VM image management. Firecracker is overkill until adversarial uploads are a real concern.

### Filesystem posture — Decided

**The story-runtime never has filesystem access.** Not read, not write, not even a mounted scratch directory. Save/restore is handled by the server via an API, not by story code touching disk.

Implications:
- Sandbox runs with `--allow-none` equivalent — no disk, no network egress beyond the platform's own control plane, no env.
- The Sharpee save/restore contract must route through a server-mediated API (opaque blob in / opaque blob out, same shape as ADR-152's `SAVE` / `RESTORE` messages).
- Story code calling the Sharpee save API emits a save request to the orchestrator, which persists the blob to SQLite and returns a save_id. RESTORE reverses this.
- No risk of path-traversal, disk exhaustion, or cross-room file leakage inside the sandbox — those attack surfaces don't exist because the capability doesn't exist.

### Hosting — Decided

**Docker as the canonical deployment artifact.** The platform ships as a Docker image plus a reference `docker-compose.yml`. An operator with a VPS and Docker installed can stand up an instance in minutes.

- **Image contents:** Node server (application), Deno binary (sandbox runtime), SQLite tooling. Multi-stage build — TypeScript is compiled at image build time, the runtime image is slim.
- **Volumes:** persistent SQLite database (`/data/db`), persistent stories directory (`/data/stories`), configuration (`/etc/sharpee-platform.yaml`).
- **Port:** single HTTP/WebSocket port exposed. The operator fronts it with whatever reverse proxy they already run (Apache, nginx, Caddy, Traefik). TLS is the operator's responsibility, not the platform's.
- **Single container model for MVP:** the Node server runs as PID 1; it spawns Deno subprocesses as child processes inside the same container. The security boundary is Deno's capability model, not a separate container per room. Adequate for the threat model; simpler to operate; dodges the Docker-in-Docker complexity of per-room containers.
- **Upgrade path later:** operators needing stronger isolation can in principle run a mode where each room is its own container (Docker socket or Kubernetes Pod per room). Not MVP.

### Reference Instance (sharpee.net)

The Sharpee project will run a reference deployment. It uses the same open-source image as anyone else. Hosted on David's Ubuntu VM initially, fronted by Apache (as his existing web infrastructure). Not a separate codebase, not a privileged instance — just one of many possible deployments.

### Save/restore persistence — Decided

**SQLite on the server** holds all save data. Saves are opaque blobs to the server (persists bytes, does not introspect — consistent with ADR-152's save protocol). Use WAL mode, periodic file backup.

### Session Event Log — Decided

**Every event in a room is persisted to the database as it happens.** The room maintains an append-only event log that captures:

- Every command submitted — who submitted it, when, the exact text (including commands that errored or were cancelled).
- Every engine output — the domain events and rendered text blocks the sandbox emitted in response to each turn.
- Every chat message — author, timestamp, content.
- Every role transition — Alice promoted to Host at T, Bob kicked at T', display-name changes.
- Every save / restore — save_id and which participant triggered it.
- Every join / leave / disconnect / reconnect.
- Every room lifecycle event — created, pinned, unpinned, deleted.

Draws on prior art from David's FyreVM client/server work, where full historical recording proved valuable for exactly the beta-testing / session-review workflow this platform is aimed at.

**Why this matters:**
- **Beta-test review.** An author replays a full session after the fact — every command, every response, every chat side-remark — without having to re-run anything.
- **Deterministic replay / export.** A transcript export is a straight selection from the event log; no engine re-execution needed.
- **Debugging.** If a player reports "the game crashed when I did X," the event log shows the preceding state.
- **Moderation / audit.** Full record of what happened in a room if there's ever a dispute.
- **Asset for authors.** Good session recordings are shareable artifacts, community value.

**Schema (unified event log):**

```sql
session_events (
    event_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id     TEXT NOT NULL,
    participant_id TEXT,     -- nullable: some events are system-emitted
    ts          TIMESTAMP NOT NULL,
    kind        TEXT NOT NULL,  -- command | output | chat | role | save | restore | join | leave | lifecycle
    payload     JSON NOT NULL,  -- type-specific structured data
    INDEX (room_id, ts)
)
```

One table keeps export / replay trivial. JSON payloads keep the schema stable as event types evolve.

**Storage implications:** a 4-hour IF session produces ~10–20k rows of small JSON. SQLite handles this easily for community-scale deployments. When the room is recycled or deleted, all events cascade delete — privacy boundary == room boundary.

**Privacy / communication:** sessions are recorded by default and the UI communicates this clearly to all participants ("REC" indicator). Operators can disable the output-storage half via config for privacy-first instances, but command-level recording remains on because it's needed for bug reporting and abuse investigation.

### Save scoping — Decided

**Saves are room-scoped.** One save timeline per room, shared by all participants. Transcripts likewise.

This covers both beta-test modes without special-casing:
- **Testing alone** — the tester creates their own room and plays as the single participant. Save is theirs by virtue of being the room's save.
- **Testing with others** — multiple testers share a room and a save. Group observations emerge from shared play.

No per-participant save store. No user-account system required for saves. The room is the unit of persistence.

### Room lifecycle — Decided

- **Created** when a user starts a story. A join code is issued.
- **Active** while participants are joining/playing. `last_activity_at` is updated on command submission, chat, or (re)joins.
- **Idle expiry:** if no activity for **14 days**, the room is recycled. Recycling deletes the room record, all saves, transcript, and chat history.
- The join code is released on recycle and may be reissued to a future room.

This gives a natural bound on storage, avoids perpetual-room sprawl, and matches the "session not library" framing.

### Historical comparison
The IF community has 40 years of "download story, load into interpreter, safe" trust because every mainstream IF runtime was a VM. Sharpee did not carry that property forward. This is a deliberate architectural choice (TS dynamism is a feature, see `docs/work/csharp-port/analysis-20260416.md`), but it means the multi-user platform cannot rely on the old trust model by default.

## Explicit Non-Goals / Out of Scope

- **Mobile support.** Desktop/laptop browsers only. Do not constrain the UI, input model, or screen layout for small-screen or touch-first use. Players on phones will need to join the Discord/Zoom call for voice and use a laptop for the game itself.

## Brainstorm Progress

- [x] **Problem & Vision** — signal from intfiction.org, platform framing, desktop-only.
- [x] **Core Concepts** — rooms, participants, roles, saves, tokens, lifecycle states all defined.
- [ ] **User Activities** — next up.
- [x] **Structural Patterns** — role hierarchy, room lifecycle, idle-and-pin policy.
- [ ] **Competitive Landscape** — not yet covered.
- [~] **Tech Stack** — TS/Node/Deno/SQLite/Apache chosen; framework choices (server web layer, client UI) still open.
- [x] **Architecture** — server-side engine, Deno sandbox subprocess per room, opaque save protocol, thin browser clients.
- [ ] **Role Assessments** — not yet.
- [ ] **Thought Exercises** — not yet.
- [ ] **Revenue & Business Model** — probably N/A (community tool, not product).
- [ ] **MVP Scope** — not yet.
- [x] **Open Questions** — tracked below, updated progressively.

## Open Questions

### Session Model
- What can a plain **Participant** (joined but not a Command Entrant) do? Watch output only? Send chat? Nothing?
- **Lock trigger precision** — does the lock engage on first keystroke, on focusing the input, or on first non-whitespace character? (Affects UX: focusing-to-see locks others out needlessly; first-keystroke is more forgiving.)
- **Lock release** — on Enter (submission), yes. Also on a cancel/escape? Also on timeout if the typist goes AFK mid-command? If so, how long?
- **Delegation revocation** — can a Primary Host demote a Host? Can a Host demote a Command Entrant they didn't promote? (Permission tree governance.)
- **Kick / ban** — can Hosts remove disruptive Participants? Does a kicked user's join code still work, or do they need a new code?
- **Primary Host disconnect** — if the Primary Host closes their tab, does the session end? Does authority transfer to a Host? Is there a grace period for reconnection?

### Architecture — Decided

**Engine runs on the server.** Browser clients are thin: they send commands up and receive domain events back. All story execution happens on platform infrastructure.

This is the platform-as-runtime model. It puts the isolation-of-untrusted-JS problem squarely on the platform.

### Open questions under server-side execution
- **Isolation strategy.** See "Running Untrusted `.sharpee` on the Server" section. This is the key unresolved technical question.
- **Chat transport** — same channel as game events, or separate?
- **Persistence** — do sessions survive everyone disconnecting? Is there a "save room" concept? Is the transcript preserved? Where are saves stored — per-user, per-room, per-story?

### Identity Within a Session — Decided

- Server issues a **durable session token** to each participant on first join (to the Primary Host at room creation, to others after entering the join code).
- Token is stored in browser `localStorage`, scoped to the room URL.
- Reconnecting with the token preserves role + display name across refresh/tab close/reopen.
- Display name: user-chosen nickname on join.
- No password, no email, no recovery. Losing the token means losing your role — you rejoin as a fresh participant; a Host must re-promote you if desired.

### Room Pinning — Decided

- Primary Host may **pin** a room to bypass the 14-day idle recycle.
- Motivated by long-form games (e.g. Zork-scale campaigns) where weeks-long hiatus is normal.
- Pinned rooms persist indefinitely until either (a) the Primary Host unpins and 14 days of idle then elapse, or (b) the Primary Host explicitly deletes it.
- Pin / unpin is a Primary-Host-only action. Hosts cannot pin.

### Early Delete — Decided

- Primary Host has **full control** to delete a room at any time, even with active participants.
- Acknowledged social consequence: this can be rude to participants mid-game. The system does not prevent this because the Primary Host's authority is intentionally absolute over their own room.
- Delete cascades: room record, all saves, transcript, chat history. Join code returns to pool.
- UX: confirmation dialog before destruction. Broadcast a final "this room has been closed by the host" message to participants before disconnect.

### Platform Scope
- **Who is the platform for, primarily?** Candidates: authors wanting to publish co-op-enabled stories (audience = players discovering the catalog); players/communities wanting to run their own sessions (audience = hosts bringing their own stories); event organizers running scheduled games. These shape very different UIs and features.
- **Story distribution onto the platform.** Host uploads a local `.sharpee` file per session? Curated catalog submitted by authors? Both? Is there any vetting?
- **Identity model.** Accounts for all users, accounts only for Hosts, or pure join-code anonymity? Affects moderation, persistence, and the join UX.
- **Operator.** Who runs and funds this? Sharpee project? IFTF? Needs to be explicit because funding shapes feature scope.
- **Moderation and abuse.** What happens when someone opens a room hosting a stalker's story, or runs a harassment campaign via chat, or uploads a `.sharpee` designed to abuse resource limits?
