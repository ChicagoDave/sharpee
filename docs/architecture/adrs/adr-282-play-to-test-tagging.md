# ADR-282: Play-to-test — blessing good turns while playing becomes transcript tests

> **D2's re-bless has NO SURFACE as of 2026-08-06** (session 322542). The drift
> lifecycle — locate the blessed literal block a failed command owns, rewrite only
> its content, refuse to widen a `contains` — shipped in the outline Test panel and
> was reachable only from there. That panel is retired (ADR-301 A1.2) and `Rebless.swift`
> went with it. The RULES survive in this document and are the specification the
> editing decision has to satisfy; the code does not. Rebuild it against ADR-300's
> canonical serializer, not by restoring the Swift mirror that was deleted with it.

## Status: SUPERSEDED — interaction model only (2026-08-03, session 83abc1) by [ADR-299](adr-299-play-skein-bless.md) (play–skein–bless: the skein replaces per-turn record/bless). The serialization and grammar work (literal text blocks, transcript emission, `[OK:]` defaulting) is retained and carried forward by [ADR-300](adr-300-addressable-channels-and-canonical-transcript.md) — D1 (the `.transcript` file is the artifact) and D3/D4 (a canonical serializer owns transcript emission). The editing gestures that were to consume it — `contains` by selection as the default `[OK:]`, and this ADR's D2 refusal-to-widen rule — are now held by [ADR-301](adr-301-sharpee-transcript-editor.md), which is TBD, so those two have a recorded home but no decided mechanism. This pointer previously read "carried forward by ADR-299 D7"; ADR-299 D7 is the `.skein`-as-committed-artifact decision that ADR-300 D1 retires, and ADR-299 itself is SUPERSEDED, so that link was dead (corrected 2026-08-04, session 088e3e; re-pointed to the consolidated ADR-300 in session 5113ca). Historical: ACCEPTED (2026-07-27, session fda0f0) — drafted, interviewed (4 questions resolved), and twice re-reviewed the same day; accepted after the ADR-287 grammar (backtick fences then, literal text blocks now) and review-fix folds

## Date: 2026-07-27

## Parent: ADR-277 (integrated testing + transcript recording — the machinery this builds on), ADR-280 (project model — the folders these tests land in), ADR-287 (literal text blocks — the grammar form bless serialization requires). Inspiration: Inform 7's Skein/bless model, deliberately simplified twice: no tree (per-turn tags, not thread blessing), and no negative verdict (David's ruling — see Context).

## Context — verified, not assumed

- **ADR-277 gave the IDE play with transcript recording** (implemented
  2026-07-27). The transcript format asserts per-command with
  `[OK: <matcher>]` (including `[OK: any]`, presence-only) and world-state
  `[ENSURES: ...]`. Bare commands parse, but the validator **rejects** any
  command with no assertion (`packages/transcript-tester/src/parser.ts` —
  "every command requires [OK: ...]"), and ADR-277 D5's recorder already
  defaults untagged output to `[OK: any]` plus `#` comment lines precisely
  because story text is deliberately RNG-varied.
- **Only good responses are tagged** (David's ruling, 2026-07-27 interview):
  story testing is by nature asserting what *should* exist. There is no
  "incorrect" verdict — a wrong response seen during play is a bug the
  author fixes in the story, not a test artifact. (ADR-283, which drafted a
  negative `[WRONG]` assertion for an incorrect verdict, is REJECTED on
  this ruling; `[OK: not contains]` remains for hand-written permanent
  exclusions.)
- **Inform 7's Skein** blesses whole output threads; its tree UI is
  famously powerful and famously ignored. The tag here is simpler — a
  per-turn bless.

## Decision

### D1 — The tag is a per-turn bless

While playing (or reviewing a recorded session), the author tags turns
whose response is **right**. Tagged means asserted; untagged means the
command merely advances state. That is the entire gesture — no tree, no
thread-blessing, no negative verdict, no separate test editor.

**The flow is live** (Q-1 resolved 2026-07-27, session fda0f0): each turn
in the play pane carries a bless affordance as it appears — the author
vouches for a response in the moment they see it, which is when the
judgment is real. The in-memory recorded session (ADR-277 D5) remains
reviewable until a new recording starts — **saving does not clear it**:
the author can save singles, drop another checkpoint or bless, and save
again from the same session. Blessing a missed turn later in the session
is possible — but the designed experience is play-and-bless in one
motion.

### D2 — Blessed sessions map onto the existing transcript format

A tagged play session **is** a `.transcript`:

- Blessed turn → `> command` + an `[OK]` assertion derived
  **selection-aware** (Q-2 resolved 2026-07-27, session fda0f0): with no
  text selected, the bless asserts the full response — serialized as
  `[OK]` + an ADR-287 literal text block (`text` … `end text`; form per
  ADR-287, and this contract follows it wherever it lands — its 2026-07-27
  revisit note was exercised on 2026-07-28, replacing backtick fences), so
  any response round-trips **losslessly through the format** (matching
  uses the runner's normalized comparison, per ADR-287). **The recorded
  response is the channel-flattened text — the same form the headless
  runner compares — carried over the turn-events bridge; DOM
  `textContent` is never the serialization source** (the two differ on
  paragraph boundaries, which normalization preserves — capture parity
  is what Acceptance 5 pins). A turn whose response is empty carries no
  bless affordance: blank output is a runner-level failure regardless of
  assertion, and an empty block is an ADR-287 validation error. With a
  selection in the response, the bless asserts the load-bearing fragment
  the author pointed at — inline `[OK: contains "<selection>"]` when the
  fragment fits the inline form (single line containing no `"` — the
  parser's inline-payload rule), `[OK: contains]` + block otherwise.
  **Nothing is unencodable** — with the one exception ADR-287 introduces
  and this ADR accepts: `end text` alone at column 0 is reserved syntax
  (David's ruling, 2026-07-28), so a response ending a phrase that way
  fails validation loudly until the prose changes. Everything else
  encodes, and the bless UX never refuses a gesture or silently weakens an
  assertion.
  When a verbatim bless later fails against reworded prose, the test
  panel's failure view shows old-vs-new and offers **re-bless** — drift is
  handled by the lifecycle, not by weakening assertions. The "new" text
  comes from **`actualOutput?: string` on ide-protocol's
  `CommandResultRecord`** — which carries no output text today (file/
  line/input/pass-state only). Present on every failed command result; an
  additive optional field, so `TEST_RESULTS_SCHEMA_VERSION` stays 1 (both
  sides' guards tolerate it). A small platform change this ADR authorizes.
  (Deliberately RNG-varied responses flap under verbatim bless; the
  author selects the stable fragment there.)
- Untagged turn → `> command` + `[OK: any]`, with the captured response
  preserved as `#` comment lines — ADR-277 D5's existing recorder default,
  which also satisfies the validator's every-command-needs-an-assertion
  rule (a bare command would fail validation).
  *Superseded by ADR-294 D2 (2026-08-01; note added 2026-08-02, session
  1d3b6f): `[OK: any]` is removed grammar. The untagged-turn serialization
  is now `> command` + `[SKIP]` + `#`-comment response — `[SKIP]` executes
  the turn and asserts nothing (runner semantics pinned by
  `docs/work/ok-any-default/plan.md` Decision 4), preserving D1's
  tagged/untagged distinction and still satisfying
  every-command-needs-an-assertion. See this ADR's Consequences note of
  2026-08-01, which already recorded the fallback's removal.*
- **Opening turn** (amendment 2026-07-28, session 2f31b0) → every saved
  transcript begins with `> look` + `[OK: any]` and a `#` comment saying
  why, ahead of the captured turns. This is not a turn the author typed:
  the browser client boots by running `look` itself, outside the
  recording, so the story banner is already on screen before the first
  captured response and is absent from it. A fresh headless run has no
  such opening turn and prints the banner with whatever command comes
  first — so without this line, a verbatim bless on a session's first turn
  compares banner-plus-response against response and fails every time.
  Found in implementation, not in review: Acceptance 1 and 5 both failed
  on their first real run for exactly this reason. `[OK: any]` rather than
  a blessed assertion, because the author never vouched for it.
  *Superseded by ADR-294 D2 (2026-08-01; note added 2026-08-02): the
  opening turn carries `[SKIP]` for the same never-vouched-for reason —
  see the untagged-turn note above.*

  **In a chain (D4), only the first segment carries it.** `--chain` runs
  one game across the files, so segments 2..N are not fresh runs and have
  no banner to absorb; giving each segment an opening `look` would insert
  turns that never happened and shift the world state the next segment
  inherits.

**Randomness stays unseeded** (Q-3 resolved 2026-07-27, session fda0f0:
ADR-277 D5's standing policy is kept, not reversed). Fully-random scenes
and looped gates are asserted on **state, not text**: `[ENSURES: ...]`
conditions and the existing loop directives (`[WHILE]`/`[RETRY]`/
`[DO]`/`[UNTIL]`) are the durable path where no stable prose fragment
exists. Blessing is a text-level gesture and does not pretend otherwise.

### D3 — Round-trip is the invariant

A test made by blessing play is a plain `.transcript` saved to the
project's `tests/transcripts/` (ADR-280's Transcript Tests group) by
default. It runs headless under `sharpee test` with no IDE present; a
hand-written transcript opens in the IDE's test UI identically. **No
IDE-only test format, ever.**

### D4 — Checkpoint tags turn a session into a walkthrough chain (Q-4 resolved 2026-07-27, session fda0f0)

A **checkpoint tag** dropped during play splits the session at that turn.
Saving a session with checkpoints writes a **chain**: sequential
transcripts in `walkthroughs/` (ADR-280's Walkthroughs group), runnable
under `--chain` — state flows across the files exactly as the existing
walkthrough suites work. One front-to-back play session with blessing and
chapter-boundary checkpoints produces the story's regression baseline —
the walkthrough suite stops being hand-authored. Sessions without
checkpoints save as a single file to `tests/transcripts/` (D3).

**File naming and merge semantics**: the walkthroughs directory IS the
chain (filename sort, no manifest — ADR-277 D3), so saved segments are
named `wt-NN-<slug>.transcript` with `NN` two-digit zero-padded and
continuing after the highest number already present — a recorded chain
**appends** to the story's chain. Only `wt-NN-*` files count toward
"highest present"; the save flow warns (offering replace) when
`walkthroughs/` contains transcripts that don't match `wt-NN-*`, because
the directory is the chain and strays run in it. Chains past `wt-99` are
out of scope. Replacing the existing chain is an explicit, deliberate act
in the save flow, never an implicit interleave. (ADR-280's seeded
walkthrough must itself be `wt-01-*`-named to fit this scheme — noted
against its Q-2.)

## Implementation touchpoints

- Play pane (`tools/ide/SharpeeIDE/`) — per-turn bless affordance,
  response-text selection capture, checkpoint tag (D1/D2/D4).
- The ADR-277 D5 recording session — carries per-turn verdict + selection
  + checkpoint marks alongside the captured command/response pairs.
- Save-as-test flow — writes `tests/transcripts/` singles (D3) or
  `walkthroughs/` chains (D4); refuses zero-bless saves (Acceptance 3).
- Test panel failure view — old-vs-new diff with re-bless (D2), fed by
  the new actual-output field.
- `packages/transcript-tester` — ADR-287 literal-block grammar (its own ADR).
- `packages/ide-protocol` (`CommandResultRecord`) + the transcript-tester
  NDJSON emitter — actual-output field (authorized in D2).
- ADR-277's Acceptance-7 real-path test — updated for the zero-bless
  refusal (Acceptance 3).

## Acceptance

1. Play a story in the IDE, bless one turn, leave another untagged, save
   as test: the produced `.transcript` passes under `sharpee test`
   (headless, no IDE), with the blessed turn asserting the response and
   the untagged turn carrying `[OK: any]` + comment lines.
   *Superseded by ADR-294 D2 (2026-08-01; note added 2026-08-02): the
   untagged turn carries `[SKIP]` + comment lines — `[OK: any]` is removed
   grammar (see the D2 serialization note above and this ADR's 2026-08-01
   Consequences note).*
2. A hand-written transcript with `[OK]`/`[OK: any]`/`[ENSURES]` opens and
   runs in the IDE test panel with results identical to `sharpee test`
   (D3 pinned by a test). *Superseded by ADR-294 D4 (2026-08-01):
   `[OK: any]` and `[ENSURES]` are removed from the grammar (parse
   errors naming their replacement), so this criterion now reads: a
   hand-written transcript with `[OK]`/`[OK: contains]` and ADR-287
   literal blocks opens and runs identically in both surfaces.*
3. Saving a session with zero blessed turns is refused with a message (a
   test with no assertions of the author's is not a test). *This
   supersedes ADR-277 Acceptance 7's unconditional all-`[OK: any]` save;
   that shipped real-path test is updated when this lands.*
4. A session with two checkpoint tags saves as three sequential
   transcripts in `walkthroughs/` that pass under `sharpee test --chain`,
   with state carried across the boundaries (D4 pinned end-to-end).
5. Blessing a response containing bracket-shaped lines, quotes, and
   multi-line prose saves via ADR-287 literal blocks and passes headless —
   lossless round-trip pinned end-to-end: the saved block content is
   identical to the captured response, and matching uses the runner's
   normalized comparison.

## Consequences

- The IDE's play surface gains a bless affordance per turn; the recorded
  session gains a save-as-test flow targeting ADR-280's folders.
- Blessed `[OK]` assertions are only as stable as the story's output;
  prose edits will break them (accepted — same trade Inform made).
  *Superseded by ADR-294 D4 (2026-08-01): `[ENSURES]` is removed, not
  merely de-defaulted — durable regression protection comes from
  golden-tier recordings instead; untagged turns can no longer fall
  back to `[OK: any]`.*
- Wrong responses observed during play leave no artifact — the author
  fixes the story. Bug tracking stays outside the test system (GitHub
  issues, per standing practice).
- **Three** platform changes are authorized by this ADR:
  1. The `actualOutput` field on ide-protocol's `CommandResultRecord`
     (feeds the re-bless failure view).
  2. **The turn-events bridge carries channel-flattened text**
     (`packages/platform-browser`) — see the first amendment below.
  3. **The play surface lets a selection survive a click**
     (`packages/platform-browser`) — see the second amendment below.

  The literal-block grammar is authorized by ADR-287 — this ADR is its motivating
  consumer. Nothing else platform-side (ADR-283 rejected).

### Amendment, 2026-07-28 (session aaa5bb): the bridge fix D2 requires

D2 rules that the recorded response is "the channel-flattened text — the
same form the headless runner compares — carried over the turn-events
bridge; DOM `textContent` is never the serialization source." **The bridge
did not do this**, and the original Consequences section forbade changing
it — so as accepted, this ADR contradicted itself. Verified in code during
implementation:

- Headless (`packages/bootstrap/src/index.ts:196-201`) flattens each block
  and joins blocks with `'\n\n'`, or `'\n'` when the block is `tight`.
- The bridge (`packages/platform-browser/src/BrowserClient.ts:619-627`)
  built its payload from DOM children's `textContent`, joined **always**
  with `'\n'`, with no notion of `tight`.
- `normalizeOutput` (`packages/transcript-tester/src/runner.ts:1590`)
  trims lines and rejoins; it does **not** collapse blank lines.

So a two-paragraph response captured as `para1\npara2` and ran headless as
`para1\n\npara2` — every blessed verbatim test on a multi-paragraph
response would have failed on its first run. This is the exact divergence
D2 names.

**Resolution (David's ruling, 2026-07-28): amend, and fix the bridge.**
The bridge now emits the channel-flattened text built by the same rule the
headless path uses. The rejected alternative was reconstructing block
boundaries from the `main-entry--tight` CSS class in the DOM, which would
couple transcript serialization to class names — the brittleness D2 exists
to prevent.

### Amendment, 2026-07-29 (session 47d0be): selection-aware bless does need a platform change

D2's bless is selection-aware: `PlayViewController.blessLatestTurn()` samples
`window.getSelection().toString()` from the live page at the moment of the
gesture. The Phase 1 spike concluded this needed **no** `packages/platform-browser`
change, and that conclusion is recorded in `PlaySelectionCaptureTests`'
own header. The conclusion was half right, and the half that was wrong
made the feature inert from the day it shipped.

- **Right about the mechanism.** Swift really can read the selection with no
  page cooperation — no injected helper, no message handler, nothing the
  client must ship. That part still holds.
- **Wrong about the product.** The spike verified the mechanism against its
  own synthetic `responseHTML` with a selection set programmatically. The
  real client was never in the test, so nothing in it could fail the test.

What the real client did (`packages/platform-browser/src/managers/InputManager.ts`):
a document-level `click` listener refocused the command input on every click
outside a dialog — a convenience so an author can type without clicking the
box first. But a drag that selects prose **ends in a click**, and focusing an
`<input>` collapses the document selection. The selection was therefore
destroyed at the instant the author finished making it, and
`getSelection().toString()` returned `""` on every bless. Confirmed by David
against the running app: selection in the Play pane had never worked.

The spike's header claims "a real mouse drag leaves the same selection state
these tests set programmatically." True in isolation, and still misleading:
the drag does leave that state, and the client's own click handler then wipes
it a moment later.

**Resolution (David's ruling, 2026-07-29): amend, and fix the client.**
The click handler now returns early when `window.getSelection()` is
non-collapsed, so a live selection wins over the type-without-clicking
convenience; ordinary clicks still focus the input.
`packages/platform-browser/tests/input-focus-selection.test.ts` pins both
halves plus the disabled-input case.

**Standing lesson for spikes under this ADR:** a spike that proves a
mechanism against a synthetic page has proved the mechanism, not the
feature. Where the finding is "no platform change is needed," the product's
own page is the only thing that can establish it.

## Session

Drafted 2026-07-27, session fda0f0; amended the same session after the
multi-ADR review (validator fix, `sharpee test` naming, ADR-277 D5/Q4b
citations) and David's only-good-responses ruling
(`docs/context/session-20260727-2100-main.md`).
