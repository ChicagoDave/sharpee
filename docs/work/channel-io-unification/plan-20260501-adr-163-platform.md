# Plan: ADR-163 Channel-Service Platform — Implementation

**Created**: 2026-05-01
**Overall scope**: Implement the `@sharpee/channel-service` package (the universal channel-I/O wire
producer), migrate the CLI consumer to channel-I/O, and replace text-service's wire-producing role.
This covers the 12 Platform Contract acceptance criteria (AC-1 through AC-12) and the CLI-gate
consumer migration (AC-13). Platform-browser migration (AC-14), story renderer parity (AC-15), and
ADR-101 cleanup (AC-16) follow separately. Zifmia migration is out of scope for this plan.

**Bounded contexts touched**: Platform I/O (channel-service producer), CLI surface (consumer
migration). text-service wire-producing role retires; text-service terminal helpers are audited but
not necessarily removed.

**Key domain language**: `ChannelDefinition`, `ChannelRule`, `produceTurnPacket`,
`produceCmgtManifest`, `HelloPacket / CmgtPacket / TurnPacket / CommandPacket`,
`emit: 'always' | 'sparse'`, re-emission identity.

**No-backcompat constraint**: All wire/schema changes are one-shot cutovers. No migration plan, no
two-phase rollout.

**Test-story isolation rule**: If any phase requires a fixture story for integration tests, a
dedicated test story must be created (e.g., `stories/channel-service-test/`). Dungeo is the
regression baseline and must not be modified as a test fixture.

---

## Phases

---

### Phase 1: `@sharpee/channel-service` Package — Wire Types and Core Registry

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Channel-service package creation; wire-protocol module; channel and rule
  registries; CMGT manifest production; hello/bootstrap-order invariants.
- **Entry state**: `packages/channel-service/` does not exist. `packages/text-blocks/src/types.ts`
  defines `ITextBlock` and 12 `CORE_BLOCK_KEYS`. No consumer depends on channel-service yet.
- **Deliverable**:
  - `packages/channel-service/` scaffolded and registered in pnpm workspace, `ts-forge.config.json`,
    `packages/sharpee/`, root `package.json`, and `build.sh` per the six-point new-package checklist.
  - Wire-protocol module at `packages/channel-service/src/wire/` exporting `HelloPacket`,
    `CmgtPacket`, `TurnPacket`, `CommandPacket`, `ChannelDefinition`, `ChannelContentType`,
    `ClientCapabilities`. No runtime-specific types (importable by browser, Node, and CLI).
  - `registerChannel`, `getChannelRegistry`, `getCapabilities`, `addRule`, `addRules` imperative
    registry functions.
  - Ten standard channel pre-registrations (decision 4 table); `platformRules` array covering all 12
    `CORE_BLOCK_KEYS` (decision 12).
  - `produceCmgtManifest(capabilities)` — capability-filtered manifest; throws before hello
    registered; freezes registration on call; per-client filtering of media channels (decision 6).
  - `produceTurnPacket(input)` — routes TextBlocks through rules; applies emit-policy logic
    (`always` vs `sparse`); conflict resolution (priority then registration order); returns
    `{ turn_id, payload }`.
  - `registerHello(capabilities)` bootstrap entry point for single-bundle runtimes.
  - Unit tests covering AC-1, AC-2, AC-4, AC-5, AC-9 (all three sub-tests), AC-10, AC-11
    (all four sub-tests). All tests run against `@sharpee/channel-service` in isolation; no engine,
    no transport, no story.
- **Exit state**: `packages/channel-service/` builds cleanly; all Phase 1 unit tests pass. No
  consumers have been wired yet; text-service is untouched.
- **AC coverage**: AC-1, AC-2, AC-4, AC-5, AC-9 (a/b/c), AC-10, AC-11 (a/b/c/d)
- **Integration-reality boundary**: All tests in this phase are unit tests against the package in
  isolation. No real-path CLI bundle test; that is Phase 3's gate.
- **Cross-package**: Touches only the new `packages/channel-service/` plus workspace config files.
- **Status**: DONE

---

### Phase 2: Round-Trip Platform Tests — Fake Engine, Repaint, and Media Channels

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: `produceCmgtManifest` → `produceTurnPacket` → renderer round-trip; ADR-101
  media channel mappings; `clear` truncation; persist-and-repaint (re-emission identity).
- **Entry state**: Phase 1 complete. Channel-service package builds. No consumers wired.
- **Deliverable**:
  - A dedicated test story `stories/channel-service-test/` (minimal — does not extend Dungeo, does
    not modify it) providing scripted TextBlock sequences and media event emissions as a fixture.
    The test story exists solely to supply deterministic input for the package tests; it is not a
    playable story.
  - AC-3 round-trip test: fake engine → `produceCmgtManifest` → `produceTurnPacket` → assert
    `main`, `location`, `score`, `turn` in the resulting payload. Fake engine produces scripted
    TextBlocks; no real engine, no transport.
  - AC-6 media channel mappings: synthetic `media.image.show`, `media.sound.play`, `media.music.*`,
    `media.ambient.*`, `media.animation.play`, `media.animate`, `media.transition`,
    `media.layout.configure` — assert each produces the correct channel in the turn packet with the
    correct payload (including `bus` rename, `command`-not-`action` hotspot rename).
  - AC-7 synthesized command from hotspot click: renderer receives `image:main` payload with
    hotspots; simulated click produces `{ kind: 'command', text: '...' }`. Test in isolation
    against the wire-protocol module decoder.
  - AC-8 `clear` truncation: 5 appends → `clear` → accumulated buffer is empty; subsequent appends
    start fresh.
  - AC-12 persist-and-repaint round-trip: fixture story driven for 10 turns; packets captured; fresh
    channel-service initialized; packets replayed through a reference renderer; rendered state at
    turn 10 matches original. This is the re-emission identity proof.
  - `registerMediaChannels()` helper (decision 7) that registers all media channel definitions when
    the corresponding capability flag is true, and `mediaRules` array covering the ADR-101 mappings.
  - All tests use unit/integration scope (no CLI bundle, no transport). The fixture story provides
    deterministic input.
- **Exit state**: AC-3, AC-6, AC-7, AC-8, AC-12 pass. Media channels are registered and filterable.
  Re-emission identity is proved in a controlled test. No consumer surface wired yet.
- **AC coverage**: AC-3, AC-6, AC-7, AC-8, AC-12
- **Integration-reality boundary**: All tests run against `@sharpee/channel-service` directly; the
  fixture story is test infrastructure, not a real surface. AC-12 is the closest to integration —
  it exercises `produceTurnPacket` in a multi-turn loop — but still in-process with no real engine
  or transport.
- **Cross-package**: `packages/channel-service/` extended. New `stories/channel-service-test/`
  created. Neither Dungeo nor any other real story is touched.
- **Prerequisite**: Phase 1 complete.
- **Status**: DONE

---

### Phase 3: CLI Surface Migration (AC-13 Test Gate)

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: CLI consumer migration from text-service wire path to channel-service; hello
  synthesis at CLI startup; `no-repaint` policy wiring; text-service wire-producing role retired in
  the CLI path.
- **Entry state**: Phase 1 and Phase 2 complete. Channel-service package builds with all unit tests
  passing. CLI currently uses text-service to produce its consumer-facing event stream. Dungeo
  walkthroughs are the regression baseline (must pass before and after this phase).
- **Deliverable**:
  - CLI startup synthesizes a `HelloPacket` with minimal capabilities
    (`{ text: true, images: false, sound: false, ... }`) and calls `registerHello` on local
    channel-service.
  - CLI calls `produceCmgtManifest` after hello, then routes each turn's output through
    `produceTurnPacket` instead of text-service's wire-producing path.
  - CLI renderer reads `main` from the turn packet payload and writes it to stdout; `location`,
    `score`, `turn` are available in the packet (rendered or ignored per CLI capability).
  - text-service is removed from the CLI producer path. Terminal-specific helpers (cursor handling,
    ANSI, prompt redraw) that do not produce wire output may stay in text-service or be moved; this
    phase documents which helpers remain and marks them explicitly as non-wire.
  - AC-13 test: run a fixed Dungeo command sequence through the CLI path; assert `main`-channel
    content matches expected values. This is the real-path CLI bundle test — runs against
    `dist/cli/sharpee.js`.
  - Existing Dungeo walkthrough chain passes before and after the migration (regression gate).
- **Exit state**: AC-13 passes (CLI parity). Dungeo walkthroughs unbroken. text-service's
  wire-producing role is retired in the CLI path. A note in the plan documents which text-service
  helpers remain and why.
- **AC coverage**: AC-13
- **Integration-reality boundary**: AC-13 is a real-path test against `dist/cli/sharpee.js`. This
  is the first phase with a CLI bundle gate. The Dungeo walkthrough chain is also a real-path gate.
- **Cross-package**: `packages/text-service/` (wire path retired), CLI bootstrap code, engine's
  turn-output wiring. This is the primary cross-cutting phase — it touches multiple packages. It
  deserves its own session.
- **Prerequisite**: Phase 1 and Phase 2 complete.
- **Status**: CURRENT

---

### Phase 4: Platform-Browser Migration and ADR-101 Cleanup (AC-14, AC-15, AC-16)

- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: Platform-browser consumer migration; story-renderer parity test; ADR-101 event
  emission paths removed from the codebase.
- **Entry state**: Phase 3 complete. CLI path uses channel-service. `packages/platform-browser/`
  currently consumes text-blocks directly; its renderer pipeline needs rewriting to consume
  `cmgt` + `turn` packets.
- **Deliverable**:
  - Platform-browser startup synthesizes a `HelloPacket` reflecting browser-environment capabilities
    (images, sound, etc.) and registers it with local channel-service.
  - Platform-browser renderer pipeline rewritten to `applyCmgt` + `applyTurnPacket` per the
    standard repaint sequence. `local-repaint` policy wired (page refresh replays from persisted
    packets via IndexedDB or equivalent).
  - `location`, `score`, `turn` channels render to the status surface. `main` renders to the
    transcript surface. Capability-gated media channels drive platform default media renderers when
    declared.
  - AC-14 test: Dungeo session in platform-browser produces same `main`-channel content as CLI for
    the same command sequence. text-service not in producer path.
  - AC-15 test: `stories/channel-service-test/` (or a minimal second test story) registers a custom
    `json` channel and a story-supplied renderer. CLI (where applicable given CLI capabilities) and
    platform-browser produce identical packets. The same renderer produces identical output on both.
    This test story must not be Dungeo.
  - AC-16 cleanup: `grep -r 'media.image.show\|media.sound.play\|...' packages/` returns zero
    results. All direct ADR-101 event emission paths are removed. The folded channel emissions are
    the only media production path.
  - text-service audit: document remaining surface (terminal helpers, if any) or retire the package
    entirely. One-shot decision; no two-phase rollout.
- **Exit state**: AC-14, AC-15, AC-16 pass. Platform-browser on channel-I/O. Dungeo runs
  identically on CLI and platform-browser via the universal wire. ADR-101 emission paths gone from
  the codebase. text-service fate documented and executed.
- **AC coverage**: AC-14, AC-15, AC-16
- **Integration-reality boundary**: AC-14 and AC-15 require real-path tests against the platform-
  browser build and the CLI bundle. AC-14 is the platform-browser gate; it must exercise the built
  artifact, not just the package in isolation.
- **Cross-package**: `packages/platform-browser/`, `packages/text-service/` (final audit/retire),
  stories (test story extended or new one created). Heaviest cross-cutting phase.
- **Prerequisite**: Phase 3 complete.
- **Status**: PENDING

---

## Phase Dependencies

```
Phase 1 (package + registry)
    └── Phase 2 (round-trip tests + media channels)
            └── Phase 3 (CLI migration — first real-path gate)
                    └── Phase 4 (platform-browser + cleanup)
```

All phases are strictly sequential. Phase 3 is the first phase that touches multiple existing
packages and requires real-path CLI bundle tests. Phase 4 is the only phase that touches
`packages/platform-browser/`.

## Test-Story Isolation Summary

| Phase | Story touched | Why |
|-------|--------------|-----|
| 1 | None | Package-only work |
| 2 | `stories/channel-service-test/` (new) | Fixture for round-trip and repaint tests |
| 3 | Dungeo (read-only, regression) | Walkthrough baseline; not modified as fixture |
| 4 | `stories/channel-service-test/` (extended) or second test story | AC-15 story-renderer parity |

Dungeo is never modified as a test fixture.

## Integration-Reality Boundary Summary

| AC | Phase | Test type |
|----|-------|-----------|
| AC-1 through AC-2 | 1 | Unit — package in isolation |
| AC-4, AC-5, AC-9, AC-10, AC-11 | 1 | Unit — package in isolation |
| AC-3, AC-6, AC-7, AC-8, AC-12 | 2 | Integration — in-process, fake engine, test story |
| AC-13 | 3 | **Real-path** — `dist/cli/sharpee.js` |
| AC-14 | 4 | **Real-path** — platform-browser build |
| AC-15 | 4 | **Real-path** — CLI bundle + platform-browser |
| AC-16 | 4 | Static — grep scan of packages/ |
