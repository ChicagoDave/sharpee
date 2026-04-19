# ADR-152: Zifmia Server Runtime Host Interface and Pluggable Isolation Backends

## Status

**Abandoned** (2026-04-19) — superseded by decisions recorded in `docs/brainstorm/multiuser/overview.md`.

### Why abandoned

This ADR was drafted before the multiuser platform brainstorm concluded. In the course of that brainstorm, the project made several concrete decisions that either invalidate or subsume what this ADR proposed:

1. **Isolation strategy is decided — and is not a pluggable backend.** The platform will execute untrusted `.sharpee` code in a **Deno subprocess with `--allow-none` permissions** (no filesystem, no network egress beyond the platform control plane, no env). Deno's V8-level capability model is a real security boundary that ships for free — no microVM image management, no worker-thread false-security, no multi-backend abstraction to maintain. See the "Running Untrusted `.sharpee` on the Server" and "Filesystem posture" sections of the brainstorm.
2. **Per-room container/VM isolation is explicitly deferred.** The brainstorm's MVP scope puts Firecracker microVMs, WASM sandboxing, and per-room containers in the "explicitly deferred" bucket with recorded rationale. The "MicroVMBackend" this ADR planned as a future deliverable is not on the roadmap at all — its threat model (public unauthenticated uploads) was deliberately excluded from MVP (stories are operator-preloaded, not user-uploaded).
3. **"Pluggable backend" is YAGNI here.** The ADR's core design was an abstraction layer (Runtime Host Interface, WorkerBackend / ProcessBackend / MicroVMBackend) intended to postpone a backend choice. The brainstorm made the choice. A message-passing contract between the server and the sandbox still exists — save/restore is an opaque-blob API over that boundary — but it is a direct contract with the Deno sandbox, not a generic backend interface with multiple implementations.
4. **Worker-thread isolation was never going to ship.** The ADR offered `WorkerBackend` as a "trusted uploader" default, but the brainstorm concluded that Workers are **not a security boundary** (Node's docs say so explicitly; so does this ADR's context section). Offering a non-boundary as the default backend was a latent misstep that the brainstorm's direct decision avoids.
5. **Deployment model is narrower than this ADR anticipated.** The MVP is a single Docker image with a Node server (PID 1) spawning Deno subprocesses as children — not a server that selects among multiple isolation technologies at deploy time. The per-room-container / per-room-VM path is an acknowledged post-MVP upgrade, not a first-class configuration.

### What survives from this ADR

The ADR's framing of a **message-passing boundary with opaque SAVE/RESTORE blobs** (server persists bytes; runtime never touches disk) is correct and is carried forward verbatim in the brainstorm's save/restore and filesystem-posture decisions. If a future ADR documents the specific Node↔Deno protocol, it should cite the save-blob framing here rather than re-deriving it.

The ADR's **security analysis of `.sharpee` file execution risk** (exfil, forgery, memory exhaustion, cookie theft, etc.) is also correct and is referenced by the brainstorm's "Security Posture of `.sharpee` Files" section. Readers interested in the threat model can still read it here.

### What replaces this ADR

No replacement ADR is planned for v0.1. The implementation contract is narrow enough that:

- The Deno sandbox spec (message types, save-blob protocol, lifecycle signals) belongs in a future engineering doc under `docs/work/multiuser/`, not an ADR.
- The single-backend decision is already captured in the brainstorm's "Hosting — Decided" and "Running Untrusted `.sharpee` on the Server" sections.
- If a second isolation backend is ever introduced (post-MVP, e.g. per-room containers for higher-trust workloads), that decision gets its own ADR at that time, not a placeholder now.

The remainder of this document is retained for historical reference only. Do not implement against it.

---

## Context (historical)

Zifmia is Sharpee's story runner, currently deployed as a local runtime in Tauri desktop apps and in the browser. Each deployment hosts a single `.sharpee` story file for a single player.

We now want to support **multiplayer shared-protagonist play**: multiple users joining a "room" on a shared server, with one authoritative game instance driving output to all connected clients. The host uploads a `.sharpee` file, others join by passcode, a role model controls who can issue game commands versus who can only chat.

This introduces a new Zifmia deployment mode — server-side, hosting untrusted or semi-trusted `.sharpee` files on behalf of users — and with it, a new problem: `.sharpee` files contain executable JavaScript. Running host-uploaded JavaScript in the server's main process is not acceptable regardless of who the uploader is, because even trusted story code may have bugs (runaway loops, memory exhaustion, unintended I/O).

Several isolation strategies are viable:

- **Node Worker threads** — lightweight, same process, message-passing boundary. Protects against most accidental harm; not a true security boundary against adversarial code.
- **Child processes** — separate Node process per room. Stronger than Workers; still shares the host kernel and filesystem.
- **Containers** — Docker or similar. Full process isolation, shared kernel.
- **MicroVMs** — e.g. Firecracker, or smolVM (`github.com/smol-machines/smolvm`) as an emerging accessible option. Separate kernel, separate rootfs, hypervisor-level resource limits. Sub-250ms boot times make per-room VM lifecycle practical.

Each strategy trades off security, operational complexity, resource overhead, and platform portability. The right choice depends on the deployment's threat model: a private Floyd-style venue with trusted uploaders needs less isolation than a public "upload and share your story" service.

Rather than commit to one isolation strategy up front, we should treat isolation as a **deployment concern**, not an architectural one — and design the Zifmia Server's internals so the backend can change without reshaping the rest of the system.

## Decision

We will define a **Runtime Host Interface** as a language-agnostic message-passing protocol between the server's session layer and the Zifmia runtime instance hosting a given room's game. All isolation backends implement this interface; the server is agnostic to which backend is in use.

The interface models the runtime as a black box that:

- Accepts a `.sharpee` file on startup
- Receives commands (player input strings, save/restore requests, shutdown)
- Emits outputs (rendered text blocks, domain events, save blobs, errors)
- Reports lifecycle state (ready, running, crashed, exited)

All communication is via framed messages over a transport the backend chooses (stdio pipes, Unix socket, WebSocket, VM-host vsock). The server's room layer speaks only the protocol; it does not import Zifmia directly, does not share memory with the runtime, and does not assume any particular execution environment.

Two backends ship initially:

- **WorkerBackend** — runs Zifmia in a Node Worker thread within the server process. Default for v1 of Zifmia Server. Appropriate for trusted-uploader deployments (invite-gated, authenticated Floyd-style rooms).
- **ProcessBackend** — runs Zifmia in a separate Node child process. Stronger isolation, same API surface. Appropriate when Workers are insufficient but full VM isolation is not yet warranted.

A third backend is planned but not built:

- **MicroVMBackend** — runs Zifmia inside a microVM (candidate implementation: smolVM). Appropriate for public deployments accepting story uploads from unauthenticated or anonymous users.

The server selects a backend at deployment time via configuration. Rooms created during a given deployment all use the same backend; backend selection is not per-room in v1.

## Runtime Host Interface

### Lifecycle

```
server → runtime:  INIT { story_file, room_id, seed }
runtime → server:  READY { story_metadata }        // on success
runtime → server:  ERROR { phase: "init", ... }    // on failure

server → runtime:  SHUTDOWN
runtime → server:  EXITED { reason, stats }
```

### Turn execution

```
server → runtime:  COMMAND { turn_id, input: string, actor?: string }
runtime → server:  OUTPUT  { turn_id, text_blocks: [...], events: [...] }
runtime → server:  ERROR   { turn_id, phase: "turn", ... }   // recoverable turn failure
```

`text_blocks` preserves Zifmia's existing structured output (channels, styling). `events` carries the Domain Events emitted by the Sharpee pipeline for this turn — enabling the room layer to drive map/inventory sidebars, transcripts, and eventual Lantern integration without re-parsing rendered text.

### Save/restore

```
server → runtime:  SAVE    { save_id }
runtime → server:  SAVED   { save_id, blob: bytes }

server → runtime:  RESTORE { save_id, blob: bytes }
runtime → server:  RESTORED { save_id, text_blocks: [...] }   // current state narration
```

Save blobs are opaque to the server. The server persists them, attributes them to a room, and hands them back on restore.

### Health and limits

```
runtime → server:  HEARTBEAT { turn_id, stats }   // periodic
server → runtime:  CANCEL { turn_id }             // abort in-flight turn
```

Resource limits (CPU time per turn, memory cap, wall-clock timeout) are enforced by the backend, not the protocol. A WorkerBackend enforces via Node's resource limits; a MicroVMBackend enforces via hypervisor limits. Limit violations surface as `ERROR { phase: "limit", kind: "cpu"|"memory"|"timeout" }`.

### Transport framing

Messages are JSON objects, length-prefixed over the backend's chosen transport. Binary payloads (save blobs) are base64-encoded within the JSON envelope for v1. A future revision may introduce a binary framing for save blob efficiency; the interface is versioned.

## Backend responsibilities

Every backend must:

- Enforce hard resource limits appropriate to the deployment (CPU, memory, wall-clock per turn)
- Prevent the runtime from accessing the host filesystem except through explicitly mounted story-specific paths
- Prevent the runtime from initiating outbound network connections unless explicitly permitted
- Cleanly terminate the runtime on SHUTDOWN or on limit violation, without affecting other rooms
- Survive runtime crashes without taking down the server

No backend is permitted to give the runtime access to server-wide state, other rooms' data, or host credentials. The runtime is a leaf; all persistence, auth, and cross-room coordination live in the session layer.

## Consequences

### Positive

- **v1 ships on Node Workers.** Simple, local, debuggable, no external dependencies. Floyd-style venue is viable immediately.
- **Isolation strength is a deployment decision.** Public deployments can upgrade to microVMs without touching the session layer, role system, protocol, or clients.
- **The runtime boundary is now explicit and testable.** Any backend can be exercised with a mock runtime; any runtime change can be verified against all backends.
- **Matches the architectural pattern already present in Sharpee.** Sharpee is structured as a series of message-passing boundaries (Action → Event → Text Service → Output; engine ↔ Zifmia ↔ UI). This ADR extends that pattern to the server.
- **Future runtime hosts reuse the interface.** A hypothetical CLI debugger, record/replay harness, or test runner can speak the Runtime Host Interface to exercise a `.sharpee` file the same way Zifmia Server does.

### Negative

- **Protocol versioning becomes a concern.** Runtime and server versions must agree on the interface. We mitigate with an explicit protocol version in INIT and a compatibility table.
- **Serialization overhead per turn.** All turn data crosses a message boundary, even in WorkerBackend where sharing memory would be cheaper. We accept this cost as the price of backend interchangeability.
- **Save blob handling is opaque.** The server can persist saves but cannot introspect them without the runtime. This is a correctness feature, not a bug (text is encrypted in `.sharpee` files anyway), but it means cross-story save inspection tools must themselves be runtime clients.
- **MicroVMBackend is not trivial to operate.** When we eventually build it, we take on VM image management, networking setup, and whatever platform constraints the underlying microVM tool imposes.

### Neutral

- The Runtime Host Interface is a new public-ish API surface for Sharpee, even though it's server-internal. It should be documented and versioned with the same care as other Sharpee contracts.
- This ADR does not specify the multiplayer session layer itself (rooms, roles, passcodes, WebSocket protocol to clients). Those are the subject of a separate ADR.

## Alternatives considered

### Couple the server directly to Zifmia's in-process API

Simplest path. Server imports Zifmia, instantiates a game per room, calls methods directly. Rejected because it bakes in WorkerBackend semantics (shared process, shared memory, no true isolation) and makes any future change to isolation a rewrite rather than a swap.

### Standardize on microVMs from day one

Maximum isolation, future-proof. Rejected for v1 because it adds significant operational complexity (VM image builds, networking, platform constraints) for a deployment mode that initially serves trusted uploaders. Also rejected because committing to microVMs before the session layer is proven risks scope creep that delays shipping.

### Per-room backend selection

Allow individual rooms to choose their isolation level. Rejected as overengineering for v1. Deployment-level selection covers the real use cases (private Floyd venue vs. public upload service); per-room selection adds policy complexity without clear benefit.

### WASM-based isolation

Run `.sharpee` JavaScript inside a WASM sandbox in the server process. Attractive in principle (in-process, portable, no subprocess overhead), but Zifmia is a nontrivial runtime with its own dependencies, and porting it to a WASM-constrained environment is significant upstream work. May become interesting later; not a v1 option.

## Implementation notes

- The Runtime Host Interface lives in a new package `@sharpee/runtime-host` (name TBD) containing the protocol schema, message types, and a reference client/server implementation.
- Zifmia grows a headless entry point that speaks the interface over stdio. This is the basis for ProcessBackend and MicroVMBackend; WorkerBackend uses the same code path but over `parentPort` instead of stdio.
- Backend implementations live in the server repo, not in Sharpee core.
- Protocol version starts at `1.0`. Breaking changes bump major; additive changes bump minor.

## Related decisions

- ADR-121 (Story Runner Architecture) — establishes Zifmia as the runner and `.sharpee` as the story file format. This ADR extends that architecture to remote hosting.
- ADR on Zifmia Server session layer (forthcoming) — defines rooms, roles, passcodes, and the client-facing WebSocket protocol. This ADR defines what lives below that layer.
- ADR on headless Zifmia runtime (forthcoming, may be folded into this one) — specifies the entry point Zifmia exposes to backends.

## Open questions

1. Should the Runtime Host Interface be a stable public Sharpee API (third parties can write backends and runtimes against it), or server-internal? Leaning public, but not committing in this ADR.
2. Should save blobs eventually be structured rather than opaque, enabling cross-story tooling and LLM/Lantern introspection? Punting on this until Lantern's needs are clearer.
3. How does this interact with the planned Electron dual-pane companion app for Zork-style contextual content? The companion almost certainly needs to be a Runtime Host Interface client too, reading events to drive its right pane. Worth a follow-up ADR once the session layer is settled.