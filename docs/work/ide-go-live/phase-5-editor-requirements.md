# Transcript editor — requirements derived from Phase 4

Source: `docs/work/ide-go-live/phase-4-friction-log.md` (F1–F27), produced by
rewriting Fernhill's transcript suite from scratch as an author. 15 transcripts,
161 authored commands, all green. Nine story/platform defects surfaced.

This is Phase 5's input, per the go-live plan: the affordances were deliberately
not fixed in advance so they could be derived from evidence.

---

## The one-sentence version

The hard part of writing a transcript is **not** typing assertions. It is
**finding out what the game says**, and **knowing which of the several modes,
header fields and assertion families exist at all**. Every hour of Phase 4 went
into discovery and probing; almost none went into expressing an assertion once
the output was known.

An editor that makes assertions easier to type solves the part that was never
hard. The editor has to be a **probe** first and a text editor second.

---

## R1 — Run-and-show is the primary surface (F7, F11)

**Evidence.** There is no author-facing way to run a scripted sequence and see
the output. `sharpee play` executes the first piped command and silently drops
the rest (`packages/devkit/src/commands/play.ts:71`). `--verbose` buries three
lines of prose under ~4,000 characters of event JSON per movement command. The
only workable probe is `[SKIP]` + `--capture-output --json`, a combination
nothing points at, and I wrote a 60-line script around it before I could work.

**Requirement.** The editor's centre of gravity is: *type commands, see exactly
what the game said, promote what you saw into an assertion.* Concretely:

- A command list runs against the story with the file's ancestors replayed, and
  each command's exact output is shown beside it.
- Re-running is cheap enough to do after every line.
- The output shown is the assertable string — the same bytes an assertion will
  match — not a rendering of it.

**This subsumes the recorder.** `[SKIP]` is already "run this, assert nothing",
so a probe run *is* a valid transcript. The editor should treat `[SKIP]` as the
draft state of every command and promoting-to-assertion as the edit.

## R2 — Promote output to assertion, in the four forms that matter (F16, F18, F19)

**Evidence.** Given the output, choosing the assertion is mechanical, but the
syntax has sharp edges the author must know: the inline `contains` payload
cannot hold a double quote (and Fernhill is mostly quoted dialogue); the fence
is `text` / `end text`, not backticks; `[STATE:]` needs a single-token entity on
the left but tolerates multi-word values on the right.

**Requirement.** Selecting a span of shown output offers:

| Form | When |
| --- | --- |
| `[OK: contains "…"]` | span is one line, no double quote |
| `[OK: contains]` + `text` block | span spans lines, or contains a double quote |
| `[OK]` + `text` block | whole response, byte-exact (the golden — see R6) |
| `[STATE: …]` | offered from the world, not from the text (see R3) |

The editor picks the form from the span. The author never learns the
quote rule, never learns the fence spelling, and never types `end text`.

## R3 — Surface world state as a first-class assertion source (F19)

**Evidence.** `[STATE:]` is the only assertion in the grammar that reads like the
story rather than the engine, and the only one that survives prose edits. It is
also the one with an undocumented parse rule that pushes authors back to
`contains` on prose. The reference doc's examples (`r06`, `nowhere`) teach raw
ids, which is the opposite of the readable form that works.

**Requirement.** After each command, show what changed in the world — location,
inventory, entity states — and let the author click a change to assert it. The
editor emits the alias that parses, so the single-token rule never reaches the
author. This is how a suite stops being 90% prose matching.

## R4 — Make the turn budget visible (F14, F21)

**Evidence.** The single most valuable thing the baseline diff taught me is a
convention that exists nowhere in writing: **the baseline's shared roots are 2
commands long**, because turn-indexed sequences make a parent's length a hidden
input to every descendant. My 12-command `arrival` pushed turn 14's
`dusk-deepens` into the middle of `key.transcript`, a file about a doormat.
Separately, `score` and `inventory` do not consume turns while a *refused*
action does — discoverable only by counting backwards from a wrong run.

**Requirement.**

- Show the **turn number** beside every command, and the **cumulative turn at
  entry** for the file (inherited from its ancestors).
- Mark commands that did not advance the turn.
- Show scheduled beats from the story (`at turn 14`, `3 turns later`) on the
  same timeline, so an author can see a beat approaching rather than discover
  it in an assertion.
- Warn when an edit to a file **moves a scheduled beat in a descendant.**

This is the highest-value item on the list. It is the failure mode most likely
to turn a green suite red for reasons unrelated to the change that caused it.

## R5 — The tree is the navigation model, and inherited state must be legible (F14, R4)

**Evidence.** `continues:` is load-bearing and documented nowhere an author
reads (F4). The website says running a tree flat "fails as a large number of
ordinary-looking test failures" and never names the field. Sibling branches from
one state (`fuse-cut` / `fuse-lose` off `folly`) are the feature that makes the
tree worth having, and writing them required holding the shared state in my head.

**Requirement.** The editor owns `continues:` — the author never types a stem.
Reparenting rewrites it. At the top of every file, show the inherited state the
file starts from: location, inventory, story state, turn count, score. Branch
points (a node with more than one child) are worth drawing as branch points.

## R6 — Goldens are a mode, and the mode has to be offered (F9, diff)

**Evidence.** This is the clearest discovery failure of the exercise. The
runner's own error says *"record the transcript with `--bless`"*; `sharpee test`
rejects it with `unknown flag`. I concluded recording did not exist and never
used it. The baseline has `recorded.transcript` — byte-exact `[OK]` + `text`
blocks, with `[SKIP]` on the opening turns — expressible entirely in the grammar
I already had.

`--bless` is real (corrected F9). It is on the platform bundle
(`scripts/bundle-entry.js:201`) and on `transcript-tester`'s CLI. It is missing
from `packages/devkit`, along with **`--watch`** (ADR-294 D14), `--vary` and
`--search`. So the testing-intelligence features are present for in-repo
platform work and absent from the author tool — which, per the standing
direction that these are product surface rather than dev conveniences, is a gap
worth naming as such.

Meanwhile the text defects in F25 (`The Smoke`, `a garden shears`, `Inside the
deed box you see deed`, the grue line, the comma-dash collision) are exactly what
goldens catch and `contains` never will.

**Requirement.** "Record this file as a golden" is a visible action, not a flag.
It writes `[OK]` + `text` blocks for every command from the probe run. Re-record
shows a diff of what changed and lets the author accept per-command.

**Prerequisite, and not the editor's to fix:** `sharpee test` needs `--bless`
and `--watch`, or the author-side story has a hole under it that no editor UI
can cover. See also issues #192/#193/#194 — the IDE's existing Record/Bless flow
hit the same wall from the UI side, with #193 opening on David's report that
"the bless feature is implemented, but it's unclear how anyone would use it."
Phase 5 should treat ADR-290 (test creation as an atomic mode, DRAFT) as the
design already in flight rather than starting fresh.

## R7 — Pin the seed by default, and say why (F8)

**Evidence.** A transcript with no `seed:` gets a fresh random seed every run.
Fernhill has three random atmospheric emitters, so exact assertions are a coin
flip. The entire ADR-294 grammar removal rests on "output is deterministic at a
pinned seed," and the pinning is an undocumented header field the runner prints
but never recommends.

**Requirement.** New files get `seed:` written. The editor shows the active
seed, shows that a root's seed governs its whole subtree, and flags a file with
exact assertions and no pinned seed as unsound. `forces:` and `point-seed:`
(ADR-293) belong in the same panel — they are the same concern.

## R8 — Do not offer what the grammar rejects, and do offer what it has (F2, F18, F24)

**Evidence.** The only document with the file format teaches `[OK: any]`,
`[OK: matches]`, `[EVENTS: N]` and `[ENSURES:]` — all removed and each rejected
by name — plus a 40-line specification of a backtick fence syntax that has never
shipped in `e49c0460` and was replaced by `text` … `end text` in `a217b8dd`
**the same day** (2026-07-28), when ADR-287 was reopened and re-decided. The
document was accurate when written and never caught up — ordinary staleness, and
the mildest kind, since the window was hours. Conversely, the `[CHANNEL:]`
family (six forms, plus dotted paths into a channel record) is documented
nowhere and was found by grepping `parser.ts`.

**Requirement.** The editor's assertion palette is generated from the parser, not
from prose. Removed forms are not offerable. `[CHANNEL:]` is offerable, with its
six forms, wherever the story declares a channel.

**The documentation gap that matters is on the site, not in the repo.**
`docs/reference/` is a repo-centric reference and low priority; sharpee.net is
the author canon. sharpee.net documents exactly one transcript — the
hello-world in `chord/getting-started/compose-and-run` — and stops. No
`continues:`, no `seed:`, no goldens, no `[STATE:]`/`[EVENT:]`/`[CHANNEL:]`, and
it recommends `--chain`, which ADR-302 D10 retires for trees. Filed as **#246**.

That reframes this requirement for the editor: since the site does not teach the
format past two `contains` assertions, **the editor is where most authors will
learn what a transcript can express.** The palette is not a convenience; it is
the documentation. Generating it from the parser rather than from prose is what
keeps it honest.

The repo-side rewrite (`docs/reference/` + `docs/guides/`) is tracked as #213
T1, low priority. It independently found the fence defect and two I did not:
`[FAIL: contains …]` is documented as an inverted check while the parser treats
everything after `FAIL:` as an opaque reason, and the golden tier is absent from
the reference entirely.

## R9 — Endings terminate a file, and the editor must know it (F22)

**Evidence.** After `kill` or `win`, every further command returns `Error: Engine
is not running`, classified as a command **error**, so no assertion can catch it.
A losing or winning branch is only expressible as a file whose last command ends
the story — discoverable only by going red.

**Requirement.** When a command ends the story, the editor marks it as terminal
and does not offer to append. Branching a *new* file from that point is the
correct affordance, and it is exactly how `fuse-cut` and `fuse-lose` are shaped.

## R10 — Never let a guidance message pin a bug (F23)

**Evidence.** The most dangerous single behaviour found. `[CHANNEL: clock, is
present]` fails with *"Channel 'clock' said nothing this turn — if that is the
claim, write `[CHANNEL: clock, is absent]`."* The channel is `gated by sidebar`
and, verified by probe, says nothing on any of 46 ticking turns — the sidebar
clock has no reachable coverage at all. The message reads like an ordinary
sparse turn and steers the author into writing the assertion that records the
broken behaviour as correct.

**Requirement.** Where the editor suggests an assertion that would pin an
absence, it must distinguish "this channel was silent this turn" from "this
channel is gated and cannot speak in a test session." More generally: a
suggested assertion is a claim about the story, and the editor should not make
claims it cannot substantiate.

## R11 — What the editor cannot fix, and should report instead

Three findings are not editor problems. They are the strongest case in the
corpus for the editor existing, because a transcript is what made them visible —
and they need routing somewhere.

- **F20 — named-instrument tool gates.** `cut the fuse` while holding the shears
  says "You need something to cut the fuse with", identical to not having them.
  In `fuse-lose` that is the difference between winning and dying. Platform
  question.
- **F12 — entity topics degrade silently.** `about the boiler` falls through to
  the generic `ask` reply when the boiler is out of scope, and the fallback is
  plausible enough to hide it. Platform question.
- **F27 — no count assertion.** The winning paragraph prints twice and no
  assertion in the grammar can say so. Grammar gap.

Plus the nine defects in F26, which belong on the story's own list.

---

## Priority

| | Requirement | Why first |
| --- | --- | --- |
| 1 | R1 run-and-show | Everything else is unusable without it; it is the whole of the friction |
| 2 | R4 turn budget | Highest-value correctness aid; the convention that exists nowhere in writing |
| 3 | R2 promote-to-assertion | Cheap once R1 exists, removes three syntax traps |
| 4 | R6 goldens as a mode | Recovers a whole mode discovery lost; catches all of F25 |
| 5 | R3 state assertions | Moves the suite off prose matching |
| 6 | R7 seeds, R5 tree, R9 endings, R8 palette, R10 guidance | Correctness guardrails |
