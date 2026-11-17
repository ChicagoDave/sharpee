# Design note: Replay data-capture mechanism (ADR-299 Phase 3)

**Decided**: 2026-08-03, session 53797f — David chose mechanism (b) after the
Phase 3 discussion ("B it is"). This note is the record the plan's Phase 3
requires; ADR-299 itself is unamended (D6's semantics are unchanged — this
selects the machinery that implements them).

## Decision

The Replay Driver (Phase 5) captures per-command output by **executing a
synthesized transcript through `sharpee test --json` with a new opt-in flag
`--capture-output`** that emits `actualOutput` on every `command-result`
record, not only on failures.

Replay of a skein thread root→node is:

1. Serialize the thread as a `[SKIP]` transcript — every command asserts
   nothing — with the skein's pinned `seed:` header (D5) and the thread's
   forcing annotations joined into a `forces:` header (ADR-293 Phase C
   grammar). This reuses ADR-282's retained serialization, which Phase 9's
   exporter needs anyway; the transcript **must carry the opening `[SKIP]`'d
   `look`** (`RecordingSession.openingTurn` convention) so the headless run's
   RNG stream and banner placement align with the browser client's own boot
   `look`.
2. Run the devkit CLI: `sharpee test <story> <temp>.transcript --json
   --capture-output` in a temp directory.
3. Map `command-result` records to skein nodes by index, offset by the opening
   turn. Pass/fail is irrelevant; `actualOutput` is the datum.

## Why (b) — the elegance ruling

The transcript is Sharpee's one execution grammar ("play these commands at
this seed with these forcings"): walkthroughs, goldens, chains, and the
exporter all speak it, and D6 already defines replay's *meaning* as executing
the thread's transcript export. A `[SKIP]` transcript is the degenerate
sentence that grammar defines — execute, assert nothing — so `sharpee test`
is the transcript interpreter, not a misused test tool. Mechanism (b) adds
**zero new concepts**; the rejected alternatives each add a second command
language whose sentences duplicate transcript semantics and must be kept from
drifting forever:

- (a) promote `--exec`: it lives in `scripts/bundle-entry.js` (the in-repo
  platform bundle, never shipped to authors), outputs convention-parsed plain
  text, and has no forcing input — promotion means a new devkit command
  surface plus a new structured-output wire contract.
- (c) dedicated CLI mode: strictly more surface than (b) for no reuse.

Accepted residue: a temp file as IPC and the index offset above. Possible
later refinement, same grammar: let the interpreter read a transcript from
stdin — no new surface.

## Platform scope (Phase 4)

The shared runner already captures every command's output internally
(`packages/transcript-tester/src/types.ts:335`, non-optional); the wire drop
happens at exactly one line (`packages/transcript-tester/src/aggregate.ts:99`:
`...(c.passed ? {} : { actualOutput: c.actualOutput })`).

- `packages/transcript-tester`: an aggregate/report option to include
  `actualOutput` on every command result.
- `packages/devkit`: `--capture-output` flag on `sharpee test`, threaded to
  that option. NDJSON only concern — the human reporter is untouched.
- `packages/ide-protocol`: **no shape change.** `actualOutput` is already
  optional on the wire and in the Swift mirror (`TestResultRecord.swift`),
  whose doc comment records the additive-keeps-version-1 precedent.
  `TEST_RESULTS_SCHEMA_VERSION` stays 1; only doc comments note the new
  presence condition.

Seed injection — the other half of "the IDE controls the run" — already
landed in Phase 2 by David's approval (`window.__SHARPEE_PLAY_SEED__` →
`EngineConfig.seed` in both browser entry templates).

## Rule 13a confirmation

Phase 5's acceptance is a real-path test: drive the real devkit CLI
(`packages/devkit/dist/cli.js` via `node`, `TestToolchain`-style resolution —
no stub) with a synthesized thread transcript against a real `.story`, and
assert the replayed outputs byte-identical against what a real WKWebView play
session stored (AC-2). That comparison rests on two named sub-claims:

1. **Rendering parity** (headless flatten == browser render) — already pinned
   by `packages/platform-browser/tests/capture-parity.test.ts`.
2. **RNG-stream alignment** — the opening-`look` convention above; a missing
   opening turn offsets every draw and kills byte-identity even at the pinned
   seed. Phase 5's test is where any residue surfaces, because it compares
   replay against live-captured output, not headless against headless.

A forced-branch replay (AC-4's execution half) additionally pins that a
`forces:` header synthesized from node forcings reproduces the forced outcome.
