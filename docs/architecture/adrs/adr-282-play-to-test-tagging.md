# ADR-282: Play-to-test — per-turn verdicts while playing become transcript tests

## Status: DRAFT (2026-07-27, session fda0f0) — Open Questions unresolved

## Date: 2026-07-27

## Parent: ADR-277 (integrated testing + transcript recording — the machinery this builds on), ADR-280 (project model — the folders these tests land in), ADR-283 (the `[WRONG]` assertion this depends on). Inspiration: Inform 7's Skein/bless model, deliberately simplified.

## Context — verified, not assumed

- **ADR-277 gave the IDE play with transcript recording** (implemented
  2026-07-27); the transcript format asserts per-command with
  `[OK: contains "..."]` and world-state `[ENSURES: ...]`, and bare
  commands execute without asserting
  (`packages/transcript-tester/src/parser.ts`).
- **Inform 7's Skein** blesses whole output threads; its tree UI is
  famously powerful and famously ignored. David's ruling: the tag is
  simpler — a per-turn verdict.
- **A "wrong response" today has nowhere to live** except a mental note or
  a GitHub issue; nothing in the toolchain tracks "this output is known
  bad" as a runnable fact. ADR-283 adds the missing assertion.

## Decision

### D1 — The tag is a per-turn verdict

While playing (or reviewing a recorded session), each turn — one command
and its captured response — can be tagged by the author:

- **Correct** — this response is right; assert it.
- **Incorrect** — this response is wrong; it must change.
- **Untagged** — no opinion; the command just advances state.

No tree, no thread-blessing, no separate test editor. The verdict is the
entire gesture.

### D2 — Verdicts map onto the existing transcript format

A tagged play session **is** a `.transcript`:

- Correct → `> command` + `[OK: ...]` assertion derived from the captured
  response.
- Incorrect → `> command` + `[WRONG: ...]` (ADR-283): fails while the
  response still matches, flips when the story changes — at which point
  the author replays, sees the new response, and re-tags it correct. The
  tag lifecycle is self-completing.
- Untagged → bare `> command` (replay only), exactly as the format already
  works.

### D3 — Round-trip is the invariant

A test made by tagging play is a plain `.transcript` in the project's test
folders (ADR-280 D1), runnable headless by `sharpee test`/the CLI with no
IDE present; a hand-written transcript opens in the IDE's test UI
identically. **No IDE-only test format, ever.**

### D4 — Problems lists the open wrongs

Failing `[WRONG]` assertions surface in the Problems pane as the story's
known-bad list — the bug punch list falls out of the test run rather than
being a second system.

## Acceptance

1. Play a story in the IDE, tag one turn correct and one incorrect, save
   as test: the produced `.transcript` runs under the CLI bundle with the
   correct turn passing and the incorrect turn failing (response
   unchanged).
2. Change the story so the incorrect turn's response differs: the
   `[WRONG]` flips to passing; the IDE prompts re-judgment of that turn on
   next replay.
3. A hand-written transcript with `[OK]`/`[WRONG]`/bare commands opens and
   runs in the IDE test panel with identical results to the CLI (D3 pinned
   by a test).
4. Open `[WRONG]` failures appear in Problems with command + response +
   source transcript line.

## Consequences

- The IDE's play surface gains verdict affordances per turn; the recorded
  session gains a save-as-test flow targeting ADR-280's folders.
- Blessed `[OK]` assertions are only as stable as the story's output;
  prose edits will break them (accepted — same trade Inform made, and
  `[ENSURES]` remains available for durable state assertions by hand).
- Depends on ADR-283 landing in the transcript toolchain first.

## Open Questions

### Q-1: Verdict UX — live, post-session, or both?
- **Why it matters**: tagging mid-play keeps context but interrupts flow;
  a post-play review pass batches judgment. Shapes the play pane.
- **Blocks**: IDE implementation start; nothing in D2–D4.

### Q-2: What does a correct-tag assert, exactly?
- **Why it matters**: full response verbatim is maximally strict and
  maximally brittle; a `contains` on a selected snippet is durable but
  needs a selection gesture. Default matters more than capability.
- **Blocks**: D2's `[OK]` derivation.

### Q-3: Deterministic replay (RNG seeding)?
- **Why it matters**: tagged assertions on randomized output (combat) will
  flap; an engine-level record/replay seed would make verdicts
  trustworthy. Platform change — its own ADR if pursued.
- **Blocks**: nothing for v1 (transcripts already brute-force RNG); blocks
  trustworthy tagging in randomized scenes.

### Q-4: Checkpoint tags ("start a new test here")?
- **Why it matters**: chained tests (`--chain`) exist; a tag that splits a
  long session into chained transcripts would map play onto the
  walkthrough-chain model.
- **Blocks**: nothing — additive on D2.

## Session

Drafted 2026-07-27, session fda0f0, from the play-to-test conversation
(`docs/context/session-20260727-2100-main.md`).
