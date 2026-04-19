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
- **Co-Host** — a participant the Primary Host (and possibly other Co-Hosts) has delegated authority to. Can promote/demote others below their own level.
- **Command Entrant** — a participant Co-Hosts have granted permission to enter game commands. All Co-Hosts are implicitly Command Entrants.
- **Participant** — any other joined user. Default role on join.

Authority flows top-down: Primary Host → Co-Hosts → Command Entrants → Participants. Delegation is an explicit action by someone with higher authority.

(Terminology note: "Co-Host" replaces the earlier "Host" term to remove ambiguity with Primary Host and to match the common videoconference model.)

### Input Model: Lock-on-Typing

Command Entrants (all Co-Hosts plus delegated users) can enter commands with no turn mechanic or queueing — it's free-for-all.

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

## User Activities

Walking the concrete flows to surface remaining gaps. Decisions recorded as they are made.

### Flow: Creating a Room

**Step 1 — Story selection — Decided (MVP).**

Stories are **preloaded on the server** by the operator. No upload UI in the MVP. The Primary Host, at room creation, picks from a list of stories the operator has already installed on the instance.

- Operator puts `.sharpee` files in the platform's stories directory out-of-band (SSH, git pull, rsync — whatever they use to manage their server). The platform scans that directory for available stories.
- The room-creation UI lists available stories. User picks one.
- No per-user libraries, no upload form, no catalog submission flow. All deferred past MVP.
- Consequences: no story-upload abuse surface in MVP; no quota or storage management for end users; the "who can publish a story on this instance" question collapses into "who has shell access to the server" — i.e., the operator. This is fine for beta-test, club, and classroom instances.

Deferred: per-user libraries (requires accounts), operator-curated catalog with author submission (requires a moderation workflow), direct upload (requires validation, quotas, and eventually the isolation story to be airtight).

**Step 2 — Who can create a room — Decided.**

**Room creation is fully open — no accounts required.** Anyone who reaches the instance URL can create a room. The creator becomes Primary Host by virtue of creating.

**A CAPTCHA gates room creation** to deter automated abuse (bot-driven room spam, sandbox-exhaustion attempts, etc.). This is the only anti-abuse control on creation in the MVP.

- CAPTCHA specifics deferred: hCaptcha, Turnstile, Friendly Captcha, or similar — operator choice via config. Default to a zero-config option (Turnstile's no-sign-up mode or an equivalent) so self-hosters aren't forced to register with a third party to stand up an instance.
- No rate-limiting beyond the CAPTCHA in MVP. If per-IP abuse becomes an issue post-MVP, add a rate limiter at the reverse proxy or in the app.
- No "creator account" concept. The creator's authority over their room is derived from the durable session token issued at creation time (same mechanism as for joining Participants), not from any persisted identity.

Consequence: the entire platform MVP ships without an auth system. Room creation, joining, and reconnection all ride on the join-code + durable-token pattern already decided. This is a significant scope simplification.

**Step 3 — Create-room form fields — Decided.**

Minimal form:

- **Story** — dropdown of stories preloaded by the operator. Required.
- **Room title** — free-text, shown to joiners ("Beta test for Zephyr v0.3", "Club night: Zork I"). Required or optional is a small UX choice; keep optional with a generated fallback (e.g. `{story-name} — {date}`) to avoid blocking the flow.
- **Display name** — the creator's nickname for this session. Required.
- **CAPTCHA** — required.
- **Submit** — creates the room, issues a join code, issues a Primary Host durable session token (scoped to the room URL), redirects the creator into the room.

Saves stay on the server (already decided) — nothing about saves appears on the create-room form. Save/restore is an in-room action available once the room exists.

No other fields on the MVP form.

### Flow: Joining a Room

**Step 1 — Join code handoff — Decided.**

After room creation, the Primary Host's room view surfaces **both** a shareable URL and the raw join code, each with its own copy button:

- **URL** — `https://{instance}/r/XYZB-3F56`. Click-to-join; pastes well into Discord, Slack, email. The primary sharing affordance, visually prominent.
- **Code** — `XYZB-3F56`, shown as secondary text. Optimized for voice-dictation over Zoom or in-person — easy to read aloud, easy to type into a join form on the instance home page.

Both forms resolve to the same room. Clicking the URL lands the joiner on the room's join page (where they enter display name + CAPTCHA). Entering the code on the instance home page does the same.

The creator can re-surface both at any time from within the room (there is no "get the link again" friction — it's always visible in the room's header/sidebar).

**Step 2 — Default role on join — Decided.**

**Every joiner enters as a Participant.** No configuration at room creation, no per-instance toggle. Uniform default.

Promotion to Co-Host or Command Entrant is an explicit action taken by someone with higher authority (Primary Host, or a Co-Host acting within their delegation scope). This keeps the create-room form minimal and makes the authority model predictable: joining never grants command authority, only the explicit promotion action does.

Consequences:
- **Beta-test use case**: the author (Primary Host) promotes testers to Command Entrant as they arrive. One click per tester. Acceptable ceremony for the value of predictable authority.
- **Classroom / demo use case**: teacher leaves students as Participants. No ceremony; the default is correct.
- **Club night**: Primary Host promotes the drivers to Command Entrant or Co-Host. Observers stay as Participants.

This resolves the earlier open question about "configurable default" — no config needed.

**Step 3 — Participant capabilities — Decided.**

A plain Participant can:

- **See story output** in real time (same view as everyone else in the room).
- **See chat** — all chat messages are visible to all participants regardless of role.
- **Send chat messages** — freely, from the moment they join. No unmute ceremony, no moderation gate. Matches voice-call norms.

A plain Participant cannot:

- Enter game commands (requires Command Entrant or above).
- Promote, demote, kick, or pin (requires Co-Host or Primary Host).

Promotion requests are **informal** — a Participant who wants to drive just asks in chat ("can I take a turn?") and a Co-Host or the Primary Host promotes them. No explicit "raise hand" affordance in MVP. If chat-based signaling proves too noisy in practice, a raise-hand button is a small post-MVP addition.

### Flow: Playing (Lock-on-Typing Mechanics)

This is where the core differentiator lives — the lock-on-typing input model — and several precision questions remain open.

**Step 1 — Lock trigger — Decided.**

The lock engages **on the first keystroke** in the command input field, not on focus.

- Focusing the field is a free action — anyone can click into the input to see where the cursor lands or to read the prompt area without locking out other Command Entrants.
- The first character typed signals real intent to compose a command. That is when the lock engages and propagates to all other Command Entrants' clients.
- "First non-whitespace" was considered and rejected as overkill — accidental space presses are rare, and the extra rule complicates the implementation.

There is a small race window between keystroke-on-typist-A and lock-arrival-on-typist-B, during which both could begin typing. This is acceptable: the server arbitrates by timestamp on first keystroke, and the loser's local input is rolled back with a brief "{name} got there first" indicator. The window is small enough (single round-trip latency) that genuine collisions will be rare.

**Step 2 — Lock release — Decided.**

The lock releases under any of:

- **Submission.** Enter pressed; command goes to the engine; lock releases.
- **Empty input.** If the typist clears the field back to empty (by backspacing, by selecting and deleting, by Esc-clears-field, however), the lock releases immediately. Predictable rule: input empty ⇒ no lock.
- **AFK timeout (60 seconds).** If the typist makes no keystroke for 60 seconds while still holding the lock with non-empty input, the server auto-releases. The typist's draft is preserved locally (not lost), but other Command Entrants are now free to grab the lock. If the original typist returns and starts typing again, they re-acquire the lock normally — racing fairly with anyone else.
- **Co-Host force-release.** Any Co-Host (or Primary Host) sees a "release lock" affordance whenever someone else holds the lock. Used for genuinely stuck or disruptive situations. Logged to the session event log (with actor + target) for accountability.

60 seconds was chosen as a balance: long enough that a Command Entrant can think mid-command without losing the floor, short enough that walking away doesn't strand the room. Operator-tunable post-MVP if it proves wrong; not configurable in MVP.

**Step 3 — Lock visibility — Decided (live preview).**

When a Command Entrant holds the lock, **everyone else sees their keystrokes in real time**. Other Command Entrants' input fields show:

```
Alice is typing:  > take swo▮
```

…with the field disabled (no cursor, no input) until the lock releases.

Rationale: the platform exists specifically because screen-share + Discord is awkward for IF. Live preview turns the locked period into shared design space — the room can backseat-drive in chat ("no, the troll first!") in real time, which is exactly the social interaction the platform is meant to enable. Anything less than live preview leaves the platform marginally better than screen-share rather than meaningfully better.

Implementation notes (deferred but flagged):

- Keystroke broadcasts are debounced (e.g. 50ms) and sent only as deltas — not raw key events. Cheap on the wire even for fast typists.
- Keystrokes are **not** persisted to the session event log — only the final submitted command is. The event log captures intent (the submitted text) and outcome (engine response), not composition noise.
- The lock holder can still see their own field normally; the broadcast is one-way.
- No support for collaborative editing of the in-flight command (no "Bob can fix Alice's typo before she submits"). One person owns the keyboard at a time; others can suggest in chat.

**Step 4 — Live preview audience — Decided.**

**Everyone in the room** sees the live preview, regardless of role. Participants and Command Entrants alike see "Alice is typing: > take swo▮" with the keystrokes streaming in real time.

Rationale: the room sees what the room sees. Participants can already chat freely; giving them visibility into in-flight commands lets them suggest meaningfully ("ask Alice to check inventory first"). For the beta-test use case, the watching author benefits from seeing the tester's hesitation and revisions in real time — that texture is part of the data.

No partial-visibility tier. The only thing role determines about the input area is whether you can type, not whether you can watch.

**Step 5 — Command attribution in the story pane — Decided.**

**No attribution in the rendered story pane.** Every submitted command renders as classic single-player IF:

```
> take sword
Taken.
```

No "— Alice" suffix, no "Alice:" prefix, no color-coding by typist. The story pane preserves the feel of reading an IF transcript, not a multi-user chat log.

Attribution is **not** lost — it lives in the **session event log**, which records `participant_id` on every `kind=command` row. Out-of-band review (transcript export for beta-test analysis, classroom grading, moderation audit) can render with full attribution by joining the event log against the participant table. But the in-the-moment reading experience is clean.

This keeps the two concerns cleanly separated:

- **Story pane** = immersive IF experience. Presentational.
- **Session event log** = structured record of who did what. Analytical.

Export tooling (not MVP) can render either style — anonymous transcript for sharing-as-IF-recording, or attributed transcript for review.

### Flow: Promotion & Demotion

**Step 1 — Promotion authority — Decided (strict one-level-down).**

Each tier can only grant the tier immediately below its own:

- **Primary Host** promotes Participants (or Command Entrants) to **Co-Host**. This is the Primary Host's unique privilege — no one else can create Co-Hosts.
- **Co-Host** promotes Participants to **Command Entrant**. Cannot create peer Co-Hosts.
- **Command Entrant** cannot promote anyone.
- **Participant** cannot promote anyone.

Consequences:

- The **Co-Host tier is guarded by the Primary Host** and cannot expand without their action. This preserves the Primary Host's authority as the single source of "who is trusted here."
- A Co-Host managing tester churn (promote new arrivals to Command Entrant as they join a beta session) does not require Primary Host intervention — the common case stays friction-free.
- Promoting a Participant directly to Co-Host is allowed (Primary Host skips the Command-Entrant step). Co-Host inherits Command Entrant implicitly, as already specified.

This is more restrictive than Zoom's model but matches the "Primary Host's room" framing already established elsewhere (delete, pin, recycle are all Primary-Host-only).

**Step 2 — Demotion authority — Decided (Primary-Host-only, with deliberate friction).**

**Only the Primary Host can demote anyone, at any tier.**

- A Co-Host who promoted a Participant to Command Entrant **cannot reverse their own grant**. If that Command Entrant turns out to be disruptive, the Co-Host must go to the Primary Host and ask for the demotion.
- A Co-Host cannot demote another Co-Host (obvious — the Primary Host guards that tier per the promotion rule).
- A Co-Host cannot demote a Command Entrant another Co-Host promoted.

This is **intentional friction**. The rationale:

- **Promotion is a social act, not an administrative one.** A Co-Host granting Command Entrant authority is vouching for that person. If the vouch turns out to be wrong, the path forward is a conversation with the Primary Host, not a silent revoke. Accountability stays at the tier that granted the authority.
- **Prevents Co-Host ping-pong.** Without this rule, two Co-Hosts could promote/demote the same person in a loop. The rule collapses that dynamic — only the Primary Host can revoke.
- **Preserves Primary Host's authority as ultimate arbiter.** Consistent with the existing model where delete, pin, and Co-Host promotion are all Primary-Host-only.

**New requirement surfaced: Private Messages.**

The demotion rule works only if Co-Hosts can reach the Primary Host privately. Asking for a demotion in the public room chat ("Hey, can you demote Bob?") is socially clumsy and leaks moderation discussion to the target. So the platform needs a DM channel.

This is a new feature for MVP — previously chat was modeled as a single room-wide channel. DM scope, UI, and persistence details still TBD (separate sub-question below).

**Step 3 — DM scope — Decided (minimal axis only).**

DMs are available **only on the Primary Host ↔ Co-Host axis**:

- Primary Host ↔ any Co-Host. Bidirectional.
- No Co-Host ↔ Co-Host DMs.
- No DMs involving Command Entrants or Participants.
- No broadcast DM to all Co-Hosts as a group (at least not in MVP).

Rationale:

- The feature exists to serve one specific need — a Co-Host asking the Primary Host for a demotion without leaking the discussion to the target. That need is satisfied entirely by the Co-Host ↔ Primary Host axis.
- Everything else (Co-Host coordination, Participant-to-host appeals, cross-tier chat) expands moderation surface without clear benefit. Those conversations can happen in the room chat (for non-sensitive matters) or out-of-band (for sensitive matters).
- Zero Participant-facing DM surface means zero Participant-to-Participant harassment vector from the platform. A major safety win for operators running open-access instances.

A Co-Host who wants to coordinate with another Co-Host uses the room chat — the moderation discussion is by design visible to the Primary Host and to other Co-Hosts. Only demotion requests (which target a specific person and shouldn't leak) need the private axis.

Post-MVP widening is cheap if a real need emerges. Starting narrow is the safer default.

**Step 4 — DM persistence and recording transparency — Decided.**

**All DMs are persisted** to the session event log alongside everything else (commands, chat, role changes, save/restore). `kind=dm` rows record both endpoints, timestamp, and content. DMs cascade-delete with the room.

**Recording is transparent to all participants — including Hosts.** On joining a room, every participant sees a clearly worded notice (one-time per session, dismissible but acknowledged):

> **This session is recorded.** Everything in this room is logged: every command, every chat message, every direct message between Primary Host and Co-Hosts, every role change. Logs persist for the lifetime of the room and can be reviewed by the Primary Host. **Be on good behavior — this includes Hosts and Co-Hosts. Your DMs are not exempt.**

The notice exists to:

- Set expectations honestly. There is no "off-the-record" tier in this platform.
- Apply social pressure to moderators themselves — Co-Hosts and Primary Hosts know that their private demotion discussions are part of the same audit trail as everything else. Discourages bad-faith moderation.
- Give Participants confidence that abuse can be reviewed.

A persistent "REC" indicator stays visible somewhere in the room UI for the duration of the session, reinforcing the notice without being intrusive.

**UI:**

- **Primary Host** sees a "Room" tab plus one tab per Co-Host they've DM'd with (tabs appear lazily as DM threads are opened).
- **Co-Hosts** see a "Room" tab plus a single "Primary Host" tab.
- **Command Entrants and Participants** see no tabs — just the room channel. The DM axis is not visible to them at all (they have no reason to know about it; the channel switcher's absence is itself the affordance).

### Flow: Disconnect & Reconnect

**Step 1 — Seat-holding policy by tier — Decided.**

Different tiers, different policies:

| Tier             | On disconnect                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Participant      | Seat held indefinitely. Token reconnects them with role + display name preserved, anytime.     |
| Command Entrant  | Same — seat held indefinitely.                                                                 |
| Co-Host          | Same — seat held indefinitely.                                                                 |
| Primary Host     | Seat held during a grace period; on expiry, **authority auto-transfers** to a Co-Host.          |

**Rationale.** The durable session token's promise — "reconnecting preserves role and display name" — holds forever for everyone except the Primary Host. Treating non-Primary-Host disconnects uniformly keeps the model simple: a transient network blip, a closed laptop overnight, or a deliberate return three days later all behave the same way.

The Primary Host case is special because the room is **moderation-blocked** without a Primary Host (only the Primary Host can demote, pin, delete, or promote to Co-Host). Holding the room indefinitely with no Primary Host present means moderation requests stack up unanswered. So Primary Host disconnect triggers an auto-transfer to a Co-Host after a grace period, restoring the room's moderation capability.

The original Primary Host returning after the transfer reconnects as a Co-Host (their token is still valid; their tier is updated). They no longer own the room — the new Primary Host does.

**Step 2 — Primary Host transfer mechanics — Decided (nomination + cascading succession).**

The platform maintains a continuity invariant: **the room always has exactly one Primary Host and at least one nominated successor Co-Host**, so long as at least one person is present.

**Mandatory nomination.** The Primary Host is **required** to pick a specific Co-Host as their designated successor. This is not optional — the platform forces the nomination (UI prompts until a successor exists). Additional Co-Hosts may be promoted beyond the successor, but one Co-Host at all times is the named heir.

**Succession triggers.** The nominated Co-Host becomes Primary Host when either:

- The Primary Host is **not present** when the session is next "picked up" (i.e., the room resumes after a period with no connected Primary Host), or
- The Primary Host **disconnects or goes idle for 5 minutes** during an active session.

5 minutes is short on purpose — for a live IF session, a 5-minute absence already feels like an outage, and handing moderation to a present successor restores the room quickly.

**Cascading succession.** When the designated Co-Host is promoted into the Primary Host slot (or leaves for any reason), the successor slot is refilled automatically: **the first Participant in the room is auto-elevated to Co-Host** and becomes the new designated successor. The chain continues indefinitely — each time the moderation slot vacates, the platform promotes the next person in line.

This means: as long as anyone is in the room, the room has a Primary Host and a Co-Host. Moderation never stalls for lack of people.

**Original Primary Host returning.** They reconnect as a Participant by default (they've fallen out of the chain). A Co-Host or the new Primary Host may re-elevate them if desired. This is a deliberate reset — the chain moved on without them, and rejoining doesn't reinstate lost authority.

**Step 3 — Nomination timing and succession order — Decided.**

**Nomination is automatic on first join.** The very first participant to join after the Primary Host is auto-designated as the successor Co-Host. The Primary Host sees a passive notice ("Alice joined and is now your designated successor — click to change."). No blocking modals, no warning banners — the room always has a successor from the moment a second person arrives.

The Primary Host can change the designated successor at any time by promoting a different participant to Co-Host and marking them as successor. Additional Co-Hosts beyond the designated successor may also be promoted (same one-level-down promotion rule as before).

**"First Participant" for auto-elevation** means: **earliest join time, still present in the room**. Offline participants are not eligible — if the earliest joiner has disconnected, the next-earliest still-connected participant is elevated. This avoids promoting absent people who may never return, and it keeps the chain walking through the room's actively-present members.

Join timestamps are recorded on first join for this purpose. The "still present" check uses the current connection state, not the token's validity — a participant whose tab is closed is "not present" even though their token remains valid.

If no participants are currently present (only the Primary Host is in the room), succession doesn't fire — there's nothing to succeed into. The platform's invariant holds whenever the room has ≥2 people in it.

### Flow: Moderation — Mute (No Kick)

**Decided — Mute is the moderation hammer; there is no kick.**

The platform does not support kicking or banning participants in MVP. Instead, **Primary Host and Co-Hosts can mute any lower-tier participant**, which disables that participant's ability to send chat messages. They remain in the room, retain their session token, keep their role, and continue to see story output and incoming chat in real time — they simply cannot contribute to the chat channel.

Described bluntly: the muted user sits in the room watching everyone else converse while unable to respond. Cruel and effective — the social visibility of being muted is part of the deterrent, and it preserves presence so that false-positive mutes don't become "you've been ejected from the session" events.

**Scope of mute:**

- **Affects:** room chat (outbound). Muted user cannot post to the public chat channel.
- **Does not affect:** ability to watch story output, ability to see chat, ability to enter game commands if they hold Command Entrant (gameplay isn't the abuse vector being addressed), ability to DM the Primary Host (mute is about the room chat surface, not private moderation channels).
- **Muted user's experience:** when they try to type into chat, their input field shows "You've been muted" and rejects the send. They can still see everything.
- **Other participants' experience:** a mute indicator (e.g., a muted-speaker icon) appears next to the muted user's display name in the participant list. Visible to everyone, reinforcing the social shame.

**Authority:**

- Primary Host can mute anyone below their tier.
- Co-Host can mute Command Entrants and Participants.
- Co-Host **cannot** mute another Co-Host (same guard-the-tier logic as demotion — only Primary Host can touch Co-Hosts).
- Command Entrants and Participants cannot mute anyone.

**Unmute:** any Primary Host or Co-Host can unmute any muted participant (flat authority on unmute — doesn't need ownership tracking; the forgiveness action is low-stakes).

**Persistence:** mute is a per-participant flag persisted with the room. It survives disconnect/reconnect — reconnecting a muted user reconnects them muted. Mute clears when the participant is unmuted by a Host, or when the room is recycled/deleted.

**All mute actions are recorded in the session event log** (`kind=role`, payload distinguishes mute/unmute), same as promotions/demotions. Accountability for moderator actions.

**Why no kick?** Kick opens a family of hard problems (token invalidation, re-entry prevention, IP bans, shared-network false positives) without clearly solving a need that mute doesn't already cover. For community-scale tools with social accountability, mute is enough. If an operator needs kick/ban later, it's a post-MVP addition.

**Escape hatch for truly intractable cases:** the Primary Host can always `delete room` (already decided). That's a room-level nuke rather than a person-level action, but it's available when the situation warrants.

## Brainstorm Progress

- [x] **Problem & Vision** — signal from intfiction.org, platform framing, desktop-only.
- [x] **Core Concepts** — rooms, participants, roles, saves, tokens, lifecycle states all defined.
- [~] **User Activities** — Creating a room: story selection decided (preloaded, no upload). Auth/display name/other fields TBD.
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
