# Research: what authors actually write, and what the skein can express

**Date**: 2026-08-04 (session dd4189)
**Question**: should the IDE keep the skein, or become a transcript editing tool?
**Answer this doc supports**: transcript editing tool. The skein is a lossy
subset of an artifact that already exists, already has a drift lifecycle, and
already has a verification engine.

This is evidence, not preference. Every number below is a count over the real
corpus in `stories/*/tests/transcripts/` and `stories/*/walkthroughs/`, taken
2026-08-04.

---

## 1. The corpus: what authors write

Counted with anchored patterns over 183 files (a bare `grep` for `SKIP` or
`FAIL` also matches story prose inside literal blocks and comments; these
figures match `^\[FORM` only).

| Form                        | Uses | Share of assertions |
| --------------------------- | ---: | ------------------: |
| `[OK: contains "…"]`        | 2822 |              89.76 % |
| `[EVENT: …]`                |  209 |               6.65 % |
| `[OK: not contains "…"]`    |   87 |               2.77 % |
| `[FAIL: …]`                 |   11 |               0.35 % |
| `[OK]` (verbatim + block)   |    5 |               0.16 % |
| `[STATE: …]`                |    5 |               0.16 % |
| `[SKIP]`                    |    4 |               0.13 % |
| `[OK: contains]` + block    |    1 |               0.03 % |
| `[EVENTS: N]`               |    0 |                    — |
| `[TODO: …]`                 |    0 |                    — |
| `[GOAL: …]`                 |  114 |    (structural, n/a) |

Assertion total: 3144. `[GOAL:]` excluded from the share column — it labels
sections, it does not assert.

**The finding that matters**: authors overwhelmingly write *fragment*
assertions. The contains family — `contains` + `contains`-block +
`not contains` — is **92.6 %** of everything asserted. Verbatim `[OK]` is
**five uses in the entire repository**.

**A second finding, smaller but sharp**: `[EVENTS: N]` and `[TODO: …]` have
**zero** uses. Grammar that survived ADR-294's cull and that nobody has ever
reached for. Worth asking whether they are unwanted or merely undiscoverable —
an editor that surfaces them is the experiment that answers it.

### Why that is fatal for the exporter

`SkeinExporter` emits exactly two forms (ADR-299 D7, implemented Phase 9):

- a blessed node → `[OK]` plus a literal `text` / `end text` block;
- an unblessed node → `[SKIP]`.

So the skein's only output is the form authors use 0.16 % of the time, plus the
form they use 0.13 % of the time. The tool cannot produce the assertion that
constitutes nine-tenths of the corpus, and never could — it has no model of
"which fragment of this output do I care about", which is precisely the
judgment `contains` encodes.

An author who exports a thread gets a transcript they must then rewrite by hand
into the style everything else is written in. That is the real reason "Save
thread as test" reads as a dead end: it is a one-way door out of the tool, into
a file the tool can never read back.

---

## 2. The grammar the editor must serve

From `packages/transcript-tester/src/parser.ts` and `types.ts` (verified by
reading, 2026-08-04). ADR-294 D2/D4 removed the fuzzy matchers and the whole
control-flow layer; what remains is small, deliberate, and — apart from
`contains` — barely reachable from any UI today.

**Assertions**

| Form                                                | Meaning                                          |
| --------------------------------------------------- | ------------------------------------------------ |
| `[OK]` + `text` … `end text`                        | exact match, whole response                       |
| `[OK: contains "…"]`                                | fragment must appear                              |
| `[OK: contains]` + `text` … `end text`              | multi-line fragment (ADR-287 D1)                  |
| `[OK: not contains "…"]`                            | fragment must NOT appear                          |
| `[SKIP]`                                            | run the turn, assert nothing                      |
| `[FAIL: reason]`                                    | the command is expected to fail                   |
| `[TODO: note]`                                      | not implemented yet                               |
| `[EVENTS: N]`                                       | exact event count for the turn                    |
| `[EVENT: true\|false, N?, type="…" key="value"]`    | an event was (not) emitted, optionally at index N |
| `[STATE: true\|false, expression]`                  | world-model predicate                             |

**Structure**

| Form                          | Meaning                                |
| ----------------------------- | -------------------------------------- |
| `[GOAL: name]` / `[END GOAL]` | section label; nothing is evaluated    |
| `# …`                         | comment                                |
| `$save` / `$restore <name>`   | checkpoint                             |
| `$teleport`, `$take`, …       | ext-testing commands                   |

**Header** (`TranscriptRunConfig`)

`title`, `story`, `entry`, `author`, `description`, `seed:` / `seeds:`,
`channels:`, `events:`, `locale:`, `forces:`, `point-seed:`.

**Removed grammar the parser rejects by name** (do not reintroduce):
`[OK: any]`, `[OK: contains_any]`, `[OK: matches]`, `[WHILE:]`, `[RETRY:]`,
`[DO]`/`[UNTIL]`, `[IF:]`, `[REQUIRES:]`, `[ENSURES:]`, `[NAVIGATE TO:]`.

**What the skein can express of the above**: `[OK]`, `[SKIP]`, and the
`seed:` / `forces:` header fields. Nothing else. No fragment assertion, no
event assertion, no state predicate, no expected failure, no goal, no comment,
no checkpoint.

---

## 3. The duplication, itemised

Every skein concept has a pre-existing counterpart that is better specified,
already shipped, and already the thing CI runs.

| Skein (ADR-299)                    | What already existed                                        |
| ---------------------------------- | ----------------------------------------------------------- |
| `blessing` (output vouched for)    | `[OK]` + literal block; or a `.golden` recorded turn         |
| `observedOutputs` (this boot)      | the `.golden` recording (ADR-294 D7)                         |
| `findings` (blessed vs actual)     | a failing transcript test / a golden replay diff             |
| `SkeinVerifier`                    | `node dist/cli/sharpee.js --test`                            |
| bless / unbless                    | `Rebless` (`tools/ide/SharpeeIDE/Test/Rebless.swift`)        |
| pinned `seed`                      | the transcript's `seed:` header (ADR-293 Phase C)            |
| `forcings`                         | the transcript's `forces:` header                            |
| a thread                           | a `.transcript` file                                         |
| "Save thread as test"              | converting the real artifact into… the real artifact         |

### The golden tier already solved the hard part

`.golden` files (21 in the repo) carry **provenance**:

```
# sharpee golden v1
transcript: wt-09-egg-tree.transcript
story: dungeo
seed: 42
derivation: 1
save-format: 3.0.0
channels: main
events: false
locale: en-US
forces: (none)
```

A replay whose runtime disagrees with any of those fails as a *named*
`stale recording — re-bless` error rather than a content diff. That is the
distinction between "the world changed underneath this expectation" and "the
story genuinely regressed" — and it is the single most valuable property a
capture format can have.

**The skein has none of it.** A `.skein` records `schemaVersion`, `seed`, and a
tree of `{command, output}`. No derivation version, no save-format, no locale,
no channels. So a skein finding cannot distinguish a real regression from a
seed-derivation bump — which is exactly the failure already sitting in the
carryover list from session a17580: *"existing `.skein` files hold outputs
captured at clock seeds — their stored prose will not match a replay, and now
that verification is live they would read as findings."*

That is not a bug to fix. It is the format lacking the field that would let it
be fixed.

### And the IDE already had a re-bless flow

`Rebless.swift` predates the skein and does the drift lifecycle properly:
locate the blessed literal block a failed command owns, rewrite its content,
and **refuse to touch `[OK: contains]`** — because overwriting a deliberately
narrow claim with a whole new response silently widens it. That refusal is a
piece of real design judgment (ADR-282 D2) that the skein's blessing model
cannot even represent, since it has no concept of a claim narrower than the
whole output.

---

## 4. Where the all-paths cascade came from

ADR-299 D3/D4 introduced a blessing *scope*: `this-thread` or `all-paths`. The
all-paths claim asserts an invariant "at a story position" — but ADR-299
explicitly declines to model convergence, so the implementation resolved
position identity to **the node's command** (session 0b1b98 Key Decisions).

Consequence, observed live on Fernhill 2026-08-04: blessing `north` for all
paths raised findings on every other `north` in the skein — Fountain Court,
Entrance Hall, and Chancel Steps — because Fernhill has `north` in five rooms.
One approval, three false objections.

The decision was made knowingly and the ADR argues for it ("a claim the author
did not mean surfaces as a finding they can downgrade, rather than a check that
silently never fires"). But it is worth naming what the feature actually is: an
assertion across files, keyed on command text, with no notion of place. There is
no transcript equivalent because no one has wanted one. It is the only genuinely
novel thing the skein added, and it is the thing that made the tab unusable.

---

## 5. What the skein has that transcripts do not

Stated fairly, so the supersession is not a straw man.

1. **Shared prefixes.** Ten transcripts that each open with the same twenty
   moves replay those moves ten times. The skein explores the prefix once and
   branches. This is real — but the cost is machine time, not author time, and
   `--chain` already composes transcripts that share state.

2. **Capture-first authoring.** You play, and the tool writes down what
   happened. Writing a transcript by hand means typing commands blind and
   pasting expected output. **This is the genuinely valuable idea and it must
   survive the supersession** — it just needs to write `.transcript`, not
   `.skein`.

3. **Branch navigation as a picture.** The badge-column canvas built in session
   dd4189 is a good surface. It survives: the columns become transcript files
   rather than tree paths, which is strictly more useful, because a column is
   then something you can commit, diff, and hand to CI.

---

## 6. What this implies for `@sharpee/skein` (D10, never surfaced)

ADR-299 reserved an `origin: author | explorer` slot on every node so a
machine-proposed thread could be adopted. Nothing ever set it, and no adoption
UI was built, across nine phases — because there was no good place to put it. A
badge on a tree node cannot express "review this whole proposed path and accept
or discard it".

Under a transcript tool, the explorer's output is *proposed transcript files*.
They appear in the list as `Proposed`, the author opens one, reads it, and
accepts or discards it as a file. That is a smaller feature and a better one,
and it is reachable — which after nine phases of the other design is the point.

---

## 7. Recommendation

Supersede ADR-299. Keep: play-records-turns, branch-column navigation, the
card-per-turn reading surface, replay-to-a-point. Drop: the `.skein` format,
blessing scopes, all-paths invariance, `SkeinVerifier`, findings, locks, trims,
and the exporter.

The Testing tab becomes one tool over one artifact: it lists the story's
transcripts, opens one, shows each turn as a card with its assertion editable
in place, records new turns from play into the open file, and verifies by
running it. `[EVENT:]` and `[STATE:]` become authorable for the first time
instead of hand-written — 209 and 5 uses today, which is what "hand-written"
looks like.

Drafted as **ADR-300**.
