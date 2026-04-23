# Gap: DevArch permits "stub the integration, test the stub, claim done"

Author: session 2026-04-23
Status: for DevArch methodology intake
Triggering incident: ADR-153 Phase 4 ("Deno Sandbox Integration — Engine Subprocess and Turn Execution") was marked complete with "one explicit carve-out: deno-entry production engine integration deferred." The server shipped to `play.sharpee.net`, a room was created, and no story ever ran. The one load-bearing thing the phase was named after was the deferred piece. All Phase 4 tests passed — against a Node echo-script (`tests/fixtures/stub-sandbox.mjs`) that impersonates a Deno subprocess speaking the wire protocol.

## The anti-pattern, stated plainly

A phase whose purpose is to integrate with a real external runtime is declared complete when:
1. The scaffolding around the integration is built (types, framing, registry, lifecycle wiring).
2. A hand-written stub replaces the real runtime.
3. Unit tests assert the scaffolding talks to the stub correctly.
4. The phase's acceptance criteria are marked green.

The scaffolding works. The integration is untested. Confidence is 100% in the wrong direction, because the tests explicitly exercised something that cannot fail in the ways the real runtime can fail.

This is the same disease stdlib's `mitigation-plan.md` already named for actions — "appears to work, good messages, correct events, failed to actually change state." Same pattern, one layer up.

## Why DevArch permitted this

DevArch's current discipline catches a lot of things but has no rule that says:

> The system under test cannot be the thing you wrote to stand in for the system under test.

Specifically:

- **Rule 10 (Behavior Statements)** asks what a function DOES and demands tests assert on the state change. It does not require that the test drive the real dependency — a stub that receives the state change and records it satisfies rule 10's letter.
- **Rule 11 (test grading RED/YELLOW/GREEN)** catches tautological assertions and mock-only verification. It does not catch tests that assert on real state mutation *inside a stubbed subsystem*. The stub produced real state changes in its own memory; the test asserted on them; the grader sees GREEN.
- **`mutation-verification` agent** verifies that code under test mutates state. It doesn't verify that the `code under test` is the code that ships in production.
- **Session planner** tolerates phase definitions that promise integration and accept scaffolding. No gate forces "the phase's name is the thing the phase produces."

The `pattern-recurrence-detector` might have caught this if the anti-pattern had been named. It hasn't been.

## The rule

Call it the **No-Stub-Under-Test rule**. Draft text:

> **Mocks are allowed only at boundaries the system does not own.** Anything your repository ships — subprocesses it spawns, libraries it bundles, runtimes it depends on, databases it migrates — must be exercised for real in at least one test per integration seam. A test that replaces an owned dependency with a fixture is a scaffolding test; it cannot be the sole test, and it cannot be the acceptance gate for a phase whose name describes the integration.
>
> When "testing for real is too hard," the correct action is to fix the tooling (better test harness, ephemeral sandbox, seeded DB) — not to swap in a stub. A stub that replaces an owned dependency silently reclassifies the integration risk as "untested."

## Triggers DevArch could enforce

Static detection is possible for most of these:

1. **Test-fixture grep.** Any file under `tests/**/fixtures/**` whose name contains `stub`, `fake`, `mock`, `echo`, `noop` that is imported by a test whose target module talks to an external runtime or subprocess. Flag as RED unless the same integration has a sibling test running against the real dependency.
2. **Spawn-path audit.** Any call to `spawn()`, `exec()`, `fork()`, `Deno.spawn`, `child_process.*` in production code must have at least one test that uses the production binary path, not a test-injected override. Test-only binary overrides (like `sandboxOverride.binary`) are themselves a signal — they exist precisely to permit the anti-pattern.
3. **Phase-vs-deliverable check.** When a session-planner phase definition says "integration with X" and the phase's definition-of-done references test files only, require one named acceptance test that exercises X end-to-end. No "scaffolding complete" phrasing allowed.
4. **Work-summary scrub.** Work summaries claiming "phase N complete with carve-out" should require the reviewer to restate what was actually verified. "Carve-out" is a load-bearing word and should never modify "complete."

## Minimum instrumentation to prevent recurrence

Three artifacts, in order of cost:

1. **`CLAUDE.md` rule** (no code): add "No-Stub-Under-Test" as a numbered rule alongside rules 10–12. Name the smell, name the triggers, describe the remediation.
2. **`work-summary-writer` tightening** (small code change): the writer should refuse to produce "Status: COMPLETE" for any phase whose Phase-Name contains the words *integration, engine, runtime, sandbox, subprocess, database, network, deploy* unless at least one test file named in the summary has a matching `*.real.*` or `*.integration.*` suffix OR the writer explicitly records an acceptance test that was executed against the real dependency.
3. **A new agent: `integration-reality-check`** (bigger): invoked at phase-close. Takes the phase's named files. For each production file that imports a spawner or external-runtime API, confirms there exists a test that exercises it without injected fixtures. Reports RED/YELLOW/GREEN like test grading does for individual tests.

The first alone would have prevented this specific incident. The third is the durable fix.

## ADR-153 remediation scope (informational, not part of the gap)

The gap above is methodology. The concrete cleanup on this repo is separate:

- Every test that imports `tests/fixtures/stub-sandbox.mjs` or the `sandboxOverride` injection point must be audited: does it verify the scaffolding, or does it claim to verify the integration? If the latter, it gets rewritten or deleted.
- A new acceptance test — a CLI/`curl`/websocat driver that connects to the running server, creates a room for `dungeo`, submits `look`, asserts the real opening text comes back — becomes the Phase 4 acceptance gate.
- Phase 4 reopens. The deferral was not "a carve-out from complete"; it was the whole phase. The work summaries need a correction note.

## One-line version

> The system under test cannot be replaced with something you wrote. A stub that impersonates an owned dependency is a fiction, and tests asserting against that fiction are not evidence — they are the fiction agreeing with itself.
