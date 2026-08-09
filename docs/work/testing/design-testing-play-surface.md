# The Testing Play Surface — a Test Editor

**Status**: design settled with David, 2026-08-09 (session 1dd6d3), iterated live
against the mock in ~15 rounds. The mock is the living spec:
[`mock-testing-play-surface.html`](mock-testing-play-surface.html) — every
interaction below is clickable there, in the IDE's exact palette
(`Theme.swift`, light and dark).

**Thesis**: playing the story *is* writing the test suite, and there is no
golden path — just a tree of transcripts (§8). The testing play
surface is a test editor: the author plays, marks ranges, and a tree of
plain `.transcript` files — the format `sharpee test --tree` already runs —
falls out, auto-named, auto-saved, and auto-parented. This is ADR-299's
play–skein–bless intent, realized on the artifact model that shipped
(ADR-300/302 transcripts + `continues:`) instead of the `.skein` that didn't.

David, closing the session: "I think we really made a nice test editor."

---

## 1. The surface

A dedicated page, **not** the shipped game page. The devkit browser build
emits a second rendering of the same template — `index-testing.html` — same
`game.js`, same client, but a testing skeleton: no banner chrome, no status
bar, no menus, no themes. The IDE's play surface loads it when testing;
regular Play keeps the real player page (authors still need to see what
players see). Published zips never carry it.

Three columns:

| Column | Content |
|---|---|
| **Cards** | checkbox rail + one outlined block per turn + the prompt |
| **Source** | the generated transcript for the active segment — live, and where assertions are *edited* |
| **Run** | Run button, a status row per transcript, first failure named, tally |

Colors are `Theme.swift` verbatim. The play prompt stays at the bottom of the
cards column — this is still the play surface; testing is a reading of it.

## 2. Cards and the rail

Every turn renders as one outlined block: command echo (accent) + everything
the turn printed, `data-turn`-anchored (the 6f contract). The checkbox rides
a **distinct rail column** — never overlaid on text (the failure of the
in-game-page margin that started all this). Assertions **never render in a
card**: the card is the story's words plus the author's controls.

**The opening is ordinal 0** — prologue + banner as the first block, with its
own rail checkbox. It is the *nameable beginning* of a root transcript, not a
separate concept: a segment starting at 0 starts at the true beginning (no
`[SKIP]` prefix exists at all), and its opening claims serialize as the
grammar's opening assertions, above the first command. A continuation never
re-boots, so only roots can include it — which the parent rule enforces
without a special case.

## 3. Segments — a transcript is a contiguous range

Tick a turn to **start** a transcript; tick a later turn to **end** it; turns
between are implied (tinted boxes, no checkmark). The rail box is contextual:
its tooltip says start / end / in-range. One segment is open at most; the
next tick after a close starts the next segment.

- Every in-range turn **asserts by default** (the story's `auto-assertion:`
  policy — 6e — supplies the default claims).
- `[SKIP]` is the result of **pruning**, not unchecking: delete a turn's last
  claim in the source panel and it demotes to `[SKIP]` in place.
- Pre-range turns of a root ride as `[SKIP]` ancestry; post-range turns are
  trimmed; a turn leaving a range drops its authored claims.
- Segment boundaries render: the start card stands off, and a child carries
  "↳ continues from *parent*" above its name strip.

**Collapse** folds a closed segment into one summary card (name · span ·
asserted count); click to expand. Collapse is purely visual — see auto-save.

**Merge ↑** folds a segment into its predecessor; former gap turns join as
deliberate `[SKIP]`s (the merged file is the true concatenation — nothing
silently gains assertions). **Split here** on any mid-range card cuts a
segment in two; the tail `continues:` from the head. Split/merge round-trip.

## 4. Auto-name, auto-save — the author never types a name

Ruled after the click-through produced `dsddsdsd.transcript`: names derive
from the route.

> `<start-location>-to-<end-location>-<turns>` · same-room loops collapse to
> `<location>-<turns>` · duplicate routes suffix `-2` · a pending branch uses
> the typed command until its replay lands

Start location is where the player *stood* when the range began (the previous
turn's room; the boot room at the beginning). The filename is the slug; the
`title:` header may carry the pretty form. Examples from the mock:
`iron-gates-to-fountain-court-2`, and fork siblings that distinguish
themselves for free: `gravel-drive-to-fountain-court-1` vs
`gravel-drive-to-boiler-shed-1`.

**Auto-save**: a closed segment writes to `tests/` immediately and rewrites
on every edit. Restructuring (split/merge/extend) renames the file, and
children's `continues:` lines cascade by stem — the mechanical rename
ADR-302 D14 was built for. Hand-rename survives as a Testing-tab affordance;
a hand-named file stops auto-renaming. There is no Create button, no save
panel — ADR-305 D6's save-panel flow is superseded.

## 5. Assertions — authored by gesture, edited in the source

All assertion authoring happens through gestures on the cards; all assertion
*display and deletion* happens in the source panel.

| Gesture | Writes |
|---|---|
| **Select text** in output → floating "Add contains" | `[OK: contains "…"]` — fragments accumulate, one per selection (ADR-301's default gesture: churn-tolerant claims are the everyday case) |
| **Not contains…** (inline text entry) | `[OK: not contains "…"]` |
| **Exact** (toggle) | `[OK]` + `text … end text` literal block of the whole turn |
| **State…** (picker) | `[STATE: true, …]` — the list is what the world holds that the **prose does not show**: NPC and item locations, score, the story's state machine. Never `player.location` — you played there. Never free text. |
| **Event…** (picker) | `[EVENT: true, type="…"]` — the list is the events the turn actually emitted |
| **Channel…** (picker) | `[CHANNEL: id, contains "…"]` / `is N` (typed by value) — the list is the turn's captures with their values |

Authoring on an unincluded turn includes it (extends or starts a range).

**In the source panel** (which is thereby the *editor*, arriving ahead of the
ADR-301 editing surface): every assertion line deletes via hover-✕. Deleting
a policy-default line keeps the *other* default as an authored claim (the
author narrows, never silently abandons); the exact block deletes whole; a
turn pruned to nothing demotes to `[SKIP]`; an opening pruned to nothing
simply claims nothing (absence is its no-claim form).

## 6. Branching — general and unbounded

**Branch…** on any card in a closed, expanded transcript prompts for an
alternate command. The first fork at a point auto-splits so the shared
prefix becomes the **parent** (collapsed); every later use at the same point
adds another sibling. The point renders as a chip row — main line first,
then each alternate — "all continue from *parent*". Selecting a chip expands
that child, even if it is one turn old. No sibling limit, no fork-point
limit; only a turn with nothing shared before it cannot fork (no parent to
share).

**Lineage stickiness** (David: "turn 4 is sticky to the first branch"):
every turn after a fork exists only in the branch that actually played it.
The *lineage cut* is the earliest fork viewing an alternate; all main-lineage
elements at or past it — cards, summaries, downstream forks — hide while an
alternate is selected. The column always shows exactly one coherent lineage;
switching back restores the other. Nothing is ever deleted by viewing.

**Mechanics in the real build**: a branch is a fresh boot at the pinned seed
(deterministic — ADR-293's substrate), replay of the parent's commands, then
the typed command played live; the new turn arrives over the same feed as any
turn. The mock's placeholder text marks exactly where that output lands.

## 7. The run column

Deliberately minimal — it answers one question: *do my transcripts still
pass?* A Run button; one row per transcript (branches included) with
PASS/FAIL, the first failure on one line (`turn 3 — does not contain "…"`,
`+n more`), and a tally. An open range isn't a file yet and doesn't run; a
pending branch shows a dash. Everything deeper — cards, columns, diffs,
goldens — stays in the Testing tab. This column is not a copy of the IDE's
testing UI, by ruling.

## 8. There is no golden path — it's just a tree of transcripts

David's closing ruling, and the model's flattening move. The author world has
**no golden tier**: no `.golden` recordings, no bless step, no privileged
walkthrough spine that the rest of the suite orbits. Every node in the tree
is an ordinary assertion transcript, and **the regression baseline is the
tree passing** — root to every leaf, at the pinned seed.

What the golden tier provided, the tree provides in place:

- **Byte-level pinning** is per-turn opt-in, not per-file ceremony: the
  `all-emitted-text` policy (or the Exact gesture on one turn) writes
  `[OK]` + literal blocks — golden-strength claims exactly where the author
  wants them, contains-form churn-tolerance everywhere else.
- **Re-bless after intended change** is just re-authoring: prune the stale
  claim, replay, the new output synthesizes in. One editing model, no
  second verification engine — the same argument that retired the `.skein`.
- **Coverage** is the tree's shape, not a spine plus satellites: branches
  ARE the alternate paths a walkthrough golden could never hold.

Consequences: branch-tester's copied golden machinery (`golden.ts`, the
recording format, the Testing tab's "Record golden…" button) joins the
supersession list below — unused by this model, retired when the revamp
lands. ADR-294 D1's "golden transcripts are the regression baseline" stays
true where it lives: the **frozen transcript-tester world** (Dungeo's
walkthrough goldens, deliberately an outlier and deliberately untouched).
The revamp ADR should record this scoping explicitly.

A standing rule this document must obey and the revamp must keep obeying:
**Dungeo is never a measurement for Chord/Testing.** Its corpus (and any
statistic derived from it — assertion-mix percentages included) must not
justify or shape this design; Chord stories are the measure. Dungeo's only
claim on the platform is that its frozen harness keeps passing.

## 9. What this supersedes, and what it keeps

**Supersedes** (the revamp wipes these when it lands):

- **ADR-304's testing workspace layout** — Play moving to the left pane, the
  modal enter/exit. The testing surface replaces the reason it existed.
- **6f's in-game-page margin chrome** (checkbox overlay in `PlayViewController`),
  the Play-header **Create Transcript button**, the **save panel** flow, and
  user naming (ADR-305 D4's margin location and D6's write flow, in part).
- The per-turn-checkbox selection model (ADR-305 D2 as built) — replaced by
  ranges + pruning.
- **The author-world golden tier** (§8): branch-tester's copied golden
  machinery and the Testing tab's "Record golden…" affordance. Goldens
  remain solely in the frozen transcript-tester world (Dungeo).

**Keeps — 6f's platform substrate is this design's foundation, unchanged**:

- The turn feed (`turnEvents`: ordinal, command, engine-composed output,
  structured captures; restart fences) and the `data-turn` anchor contract.
- `IDE_PLAY_SEED` determinism; capture parity with the headless runner
  (boot-look alignment included).
- The synthesis module (`@sharpee/branch-tester` `auto-assertion.ts`) and
  `createTranscriptFromPlay` / `sharpee transcript-from-play` — the one code
  path everything above serializes through.
- The 6e `auto-assertion:` policy as the source of default claims.
- ADR-302's tree (`continues:`, stem renames, `sharpee test --tree`) as the
  at-rest representation of everything this surface produces — now carrying
  the WHOLE regression burden (§8: the baseline is the tree passing).

## 10. Build implications (the revamp's work list)

1. `index-testing.html` — second template rendering in the devkit browser
   build; IDE loads it for testing.
2. Feed record additions: **emitted event types**, a **world digest** (the
   unseen slice: NPC/item locations, score, state machine — the State
   picker's source), and a **lineage id** (+ parent lineage, fork ordinal).
   Amend ADR-305 D4's wire shape.
3. The card/segment/source UI per this document (web, in the testing page).
4. The replay driver (fresh boot + replay prefix + divergent command) for
   branching, over the existing fence machinery.
5. The auto-save writer: continuous serialize-through-the-toolchain, rename
   cascade on restructure, `-2` collision suffixing.
6. Retirements per §9, including the ADR-304 workspace machinery and the
   author-world golden machinery (§8).
6a. (Later phase) Play to a goal — §12's Tier 1, the toolchain-side goal
   search + the "Play to…" affordance.
7. An ADR capturing this design's decisions (successor to 304/305's
   superseded parts, amending ADR-294's golden scoping per §8; the flip
   owner is whoever lands the revamp).

## 11. Open questions

- **State picker at scale**: fernhill offers five unseen facts; larger Chord
  stories will offer far more. Grouping/search needed past toy scale,
  measured against Chord stories (§8 — Dungeo is never the yardstick).
- **Meta commands at fork points**: save/restore inside a branch lineage —
  carried per ADR-305 D3, but branch replay across them needs a look.
- **Persistence of the session view**: segments/forks are reconstructible
  from the files (`continues:` edges), so the play session's tree view can
  rebuild from `tests/` on reopen — worth confirming that's sufficient.
- **The Testing tab's role** after this ships: runner/diff/golden depth and
  rename — the boundary should be drawn explicitly in the revamp ADR.

## 12. Addition: play to a goal — viability assessment

David's addition, assessed 2026-08-09: the surface can be asked to *play to
a goal* and the IDE finds the optimal path — for easily attainable goals
only. **Verdict: viable, tiered, with "easily attainable" made structural.**

Why it is tractable here: determinism at the pinned seed makes verification
exact (the found command list is always re-proven by ONE clean replay from a
fresh boot before it is shown — search artifacts cannot leak); real-engine
forking with measured budgets already ships (`branch-tester/src/search.ts`,
ADR-293 D12: "search executes the real engine", named exhaustion); the IR
carries the room graph and the world digest (§10 item 2) carries item
locations; and the result arrives as ordinary feed turns — cards, a range, a
transcript. This is also `[NAVIGATE TO:]`'s sanctioned descendant (ADR-294
D4 moved navigation to the IDE) and ADR-294 D20's explorer, scoped at last
to something buildable.

- **Tier 1 — reach a room: build.** BFS over real forked states; blocked,
  conditional, and computed exits are just edges that fail. Movement-only
  BFS is genuinely shortest-in-turns; with bounded `open` insertions the
  claim is "shortest found" and the UI says so.
- **Tier 2 — possess an item: build after.** Digest locates it → Tier 1 →
  `take` (+ container `open`). Refuse concealed / NPC-held / puzzle-gated.
- **Tier 3 — arbitrary state, score, "win": refuse upfront.** General goal
  regression is the game itself; forcing remains the tool for rare outcomes.

## 13. Addition: author-annotated coverage (David, 2026-08-09 — captured, not yet ruled)

The author annotates the story itself — marking a puzzle, a piece of
important context — and the testing tool evaluates **coverage % against
those annotations**: "3 of 5 puzzles exercised by the tree." This adds an
*author-declared significance* tier on top of ADR-294 D13's
platform-declared surfaces (rooms, choice points, messages): D13 answers
"what exists untested," annotations answer "what *matters* untested" — an
honest denominator for a coverage figure, instead of raw world-surface
noise. Fits the standing discipline: coverage computes over declared
surfaces, never over inference.

**Shape refinement (David, same day): the annotation is a state filter, not
a bare marker** — `when (state is XYZ) banana-puzzle is available`. The
puzzle declaration rides Chord's existing when-filter grammar rather than
minting annotation syntax, and that makes coverage *mechanically evaluable*:
the tree's runs walk real world states, so "was banana-puzzle ever
available/completed in a passing transcript?" is the when-condition
evaluated over visited states — no satisfaction rule to invent, no free
text, the same picker discipline extended to coverage denominators.

Open before this becomes scope: the exact declaration form is still a
**Chord language change** (platform discussion required — even reusing
when-filter grammar, `is available` as a declarable coverage surface is
new); where the % surfaces (Testing tab, per D4's authoring/reading
boundary — not the run column); and whether availability and completion are
one condition or two. Measured against Chord stories, as always.

"Easily attainable" is enforced by the tool, not the user's judgment:
goals come from **pickers only** (rooms from the IR, items from the digest —
the §5 no-free-text discipline); the search runs under a **measured budget
with named exhaustion** ("didn't reach the Vault in 400 forked turns —
likely puzzle-gated; play it yourself"); the planner's vocabulary excludes
meta commands and GDT. The search runs headless in the toolchain; the IDE
plays the verified path into the live surface via "Play to…" beside the
prompt, and the turns land as cards ready to range into a test.
