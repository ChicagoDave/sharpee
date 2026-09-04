# Secret Letter Port — Scale Watch List

**Created**: 2026-08-21
**Status**: OPEN — living document; add entries as the port grows, close them with evidence
**Owner plan**: `docs/work/secret-letter-port/plan.md`

## Why this file exists

The Secret Letter port will be, by a wide margin, the largest Chord story ever
written. Chord's language surfaces, its compiler, and Chord Writer have only
ever been exercised against stories an order of magnitude smaller. Things that
are correct at 1,000 lines and miserable at 8,000 lines will not announce
themselves — they show up as authoring friction that gets absorbed rather than
reported.

This list names them in advance, so the port doubles as the scale test Chord
has never had. Each entry states what to watch, why it bites at scale, and how
to check it.

## Scale baseline (measured 2026-08-21)

Largest existing Chord stories, by line count
(`for f in $(find stories branch-stories -name '*.story'); do grep -c '' "$f"; done`):

| Story | Lines |
| --- | --- |
| `branch-stories/fernhill/fernhill.story` | 1,155 |
| `stories/thealderman/chord/thealderman.story` | 938 |
| `branch-stories/ides-of-march/ides-of-march.story` | 921 |
| `stories/friendly-zoo/zoo.story` | 793 |
| `branch-stories/secret-letter/secret-letter.story` | 46 (scaffold, no content) |

Source scale to be ported (`docs/references/textfyre/secretletter/INVENTORY.md`,
measured 2026-08-21): 12,635 lines of Inform 7, 84 rooms, ~300 object
declarations, 47 person declarations, 23 quip trees / 380 quips, 56 scenes.

**Estimate**: 4,000–8,000 lines of Chord, roughly 5x fernhill. This is an
estimate from source volume, not a measurement — replace it with the real
figure once Chapter 1 lands and a per-chapter rate is known.

## W-1: Diagnostic file attribution across imported fragments

**Watch**: whether an analyzer error inside an imported `.chord` fragment can
be traced to the right file and line.

**Finding (verified 2026-08-21, reading source)**: it cannot, today.
`resolveImports` (`packages/chord/src/index.ts:112`) prefixes fragment
diagnostics with `[<name>.chord]` and preserves fragment-relative spans — but
only for **parse-stage** diagnostics raised inside that function. After
splicing (ADR-251 D4), the fragment's declarations join `ast.declarations`
carrying fragment-relative spans, and `Span`
(`packages/chord/src/span.ts:12`) has no file field — only `line`, `column`,
`endLine`, `endColumn`. Every **analyzer** diagnostic on a spliced declaration
therefore reports a fragment-relative line number with no file identity,
indistinguishable from a main-file error at the same line.

**Why it bites at scale**: analyzer errors — undefined entity reference,
duplicate id, phrase collision, unknown trait — are the overwhelming majority
of real authoring errors. In a single-file story the span is unambiguous. In a
20-fragment story "error at line 40" names 21 possible places, and Chord Writer
navigates to the wrong one.

**How to check**: author a fragment with a deliberate undefined-reference
error, compile the main story, and read the diagnostic's file/line. Confirm
whether it names the fragment.

**If confirmed at authoring time**: this is a platform change (`packages/chord`)
and needs discussion + likely its own ADR amending ADR-251 D6's span contract —
probably a `file` field on `Span`, populated at splice time. Do not fix it
inline as part of the port.

**CONFIRMED at authoring time (2026-08-22)**, without needing a deliberate
fixture — the first real fragment produced it. Twenty `analysis.phrase-overlap`
errors raised inside `stallkeepers.chord` were every one of them reported as
`secret-letter.story:72:5`, `:78:5`, `:118:5` and so on. Those lines exist in
the main file and are ordinary room text, so the diagnostic does not merely
lose the file — it points confidently at an innocent line in a different file.
The prediction above was exact, and the cost is now measured rather than
estimated: the errors were legible only because the message named the phrase
keys (`st-for-sale`, `st-coin-question`), which happened to be unique to the
fragment. A duplicate-id or undefined-reference error carries no such tell.

**FILED 2026-08-22 as [#301](https://github.com/ChicagoDave/sharpee/issues/301)**
— root cause named there: `Span` (`packages/chord/src/span.ts:12`) has no file
field, so spliced declarations carry fragment-relative lines with no origin.
Blocks W-9.

## W-2: `import` has compiler coverage and zero author coverage

**Watch**: everything about using imports for real.

**State (verified 2026-08-21)**: ADR-251 is ACCEPTED + IMPLEMENTED (2026-07-21).
`packages/chord/tests/import.test.ts` carries 6 tests — one worked splice
example plus five D6 rejection cases. But
`find stories branch-stories -name '*.chord'` returns **zero files**, and no
`.story` in the repo carries an `import` line. The seam is tested; the
authoring experience of it has never been exercised once.

**Why it bites at scale**: SL is the first story that has no choice but to use
it. Any rough edge in the feature is discovered by this port, at the moment the
port depends on it.

**How to check**: it checks itself — the first multi-fragment chapter is the
test. Record what went wrong, however small.

## W-3: Compile-time curve

**Watch**: compile milliseconds as a function of source lines.

**Why it bites at scale**: imports splice before analysis (ADR-251 D4), so the
whole assembled story re-parses and re-analyzes on every edit. Chord Writer's
edit loop sits directly on top of that. At 1,155 lines nobody notices; the
question is where the curve goes and whether it is linear.

**How to check**: time a compile at each chapter milestone and record
`lines → ms` in this file. A curve built as the story grows is worth far more
than one anecdotal measurement at 6,000 lines, and it cannot be reconstructed
after the fact.

## W-4: world-index scaling gets its first real corpus

**Watch**: whether world-index performance claims survive a real large story.

**Why it bites at scale**: ADR-322 D13 asserts a corpus of this shape "will
likely sweep in milliseconds" — but that sentence was reasoned from figures now
known wrong (32 rooms, corrected to 84 on 2026-08-21; see
`INVENTORY.md`). No Chord story has ever been large enough to test the claim.

**Caveat — do not let this leak into scope**: David ruled this port a separate
effort from ADR-322; it is not D13's validation corpus and carries neither
AC-10 nor AC-11. Observations here are a courtesy to whoever amends D13, not
an obligation of this plan.

## W-5: Flat-only imports (ADR-251 D5) against 84 rooms

**Watch**: whether one level of import decomposition is enough.

**Why it bites at scale**: only the main `.story` may import, and fragments
cannot import (D3/D5) — "the main file lists its imports, and that list is the
whole graph." That model is deliberately simple and holds easily at fernhill
size. With 84 rooms, 23 quip trees, and 56 scenes, a chapter fragment cannot
decompose further into rooms/conversation/scenery sub-fragments; everything
flattens into one long import list in the main file.

**How to check**: watch for the moment a fragment wants to split and can't.
Record the case rather than working around it silently — if nesting is ever
revisited, this port is the evidence.

## W-6: Phrasebook arbitration by spliced position

**Watch**: whether arbitration order stays comprehensible across many fragments.

**Why it bites at scale**: phrasebooks arbitrate by spliced position
(ADR-245/250, preserved by ADR-251 D4 — "import site = arbitration position").
With imports, arbitration order becomes a function of import-line order in the
main file. Across 20 fragments, reordering an import line silently changes
which phrasebook wins.

**How to check**: watch for a phrase resolving to the wrong voice after an
import list is reordered or a fragment added. This failure is silent — no
diagnostic fires — so it is only caught by noticing wrong output.

## W-7: Conversation at scale

**Watch**: authoring ergonomics and runtime behavior of the beat-thread system
at 23 trees / 380 quips.

**Why it bites at scale**: ADR-320's `define conversation` and beat-thread
runtime have never run anything near this volume. Dame Sandler's tree alone is
48 quips. The port's P-5/P-6 quip-tree-to-beat rewrite pattern is proven on one
conversation and then applied across ~40 — if the pattern degrades with tree
size, it degrades after the pattern is already committed.

**How to check**: note the rewrite time and the resulting Chord line count per
tree as trees are converted, so a per-tree cost is known before the bulk pass.

## W-8: A conversation shared by many characters has no shared owner

**Watch**: what it costs to author one conversation tree that several NPCs
speak, as against one tree per NPC.

**Finding (verified 2026-08-22, building the `ST` tree)**: Chord binds a
conversation to a single entity. `define topics for <entity>` requires a person
and takes exactly one owner (`packages/chord/src/analyzer.ts:1509, 1520`), and
`define greetings` and `define exchange` are owner-bound the same way. There is
no kind, trait, or class the tree can hang off — which is precisely how the
source expresses it (`Rule for initiating conversation with a stallkeeper`,
`story.ni:1881`, over `A stallkeeper is a kind of person`).

**Measured cost**: the `ST` tree is 9 quips spoken by 10 characters. In Chord
that is 10 near-identical `create` + `greetings` + `topics` + `exchange`
groups — about 460 lines — around 11 shared phrases of about 60 lines. The
PROSE cost really is zero, which is what the change document promised; the
structural cost is roughly 8:1 boilerplate to content, and it is the kind of
duplication that silently rots when one copy is edited.

**Why it bites at scale**: `ST` is the smallest instance in the port. Any later
ambient tree — guards, ballgoers, street crowd — multiplies the same way, and
the port has 23 trees to place across 47 NPCs.

**How to check**: as each remaining tree lands, record whether it has one owner
or many, and the ratio of per-owner boilerplate to shared phrase text.

**If it stays uncomfortable**: this is a platform/language change
(`packages/chord`) and needs discussion plus its own ADR — the shape would be
an owner list or a kind-bound conversation. Do not build it as part of the
port. Note the workaround costs nothing at runtime; it costs at authoring and
at edit time only.

## W-9: imports do not nest, so a place cannot own its inhabitants

**Watch**: whether ADR-251 D5's flat import model holds as the port's file
count grows.

**Finding (2026-08-22, hit while restructuring)**: the story was split into
place-atoms and per-NPC files — `import "grubbers-market"` (seventeen rooms,
the stalls, the apple, ten stallkeepers) and `import "npc-teisha"`. Teisha
stands in the market and the market cannot import her
(`packages/chord/src/index.ts:151`), so `secret-letter.story` must know she
exists. The flat list conflates what the STORY is made of with what a
COMPONENT is made of.

**Why it bites at scale**: an import is a paste at its own line (D4), so
arbitration across a flat list is a hand-maintained global topological sort
with no tool help — the failure is silent. With 23 trees left across 47 NPCs
the main file ends as roughly fifty import lines and a header.

**How to check**: record the import count and any arbitration surprise as each
tree lands.

**FILED 2026-08-22 as [#302](https://github.com/ChicagoDave/sharpee/issues/302)**,
blocked on #301 — fragment spans must name their file before nesting is
debuggable. Platform change; do not build it as part of the port.

## W-10: Several conversations live at once — the ball as a dance

**Watch**: whether ADR-320's beat-thread runtime, with `define sequence` /
`define machine` and timers, can carry Chapter 11's ruled shape (change
document, 2026-09-02): a rotation that hands the player from one live
conversation to the next on a one-or-two-turn budget, several threads open at
once, and memory across rounds so a conversation accrues over repeated passes.

**Why it bites at scale**: every conversation the port has built so far is
modal — one partner, one thread, the room waits. The dance is the first
structure that needs concurrency and a hand-off the player does not choose,
and it is the chapter David names as the core Chord opportunity. If the
primitive is missing, the chapter stalls at Phase 10's first step; if it is
awkward, the awkwardness lands in the port's most dialogue-dense room (six
trees, 88 quips).

**How to check**: before building the ballroom, write the dance's engine as a
minimal `.chord` with three placeholder partners and TODO beats — rotation,
turn budget, hand-off, one cross-round memory — and run it under
`./sharpee test branch-stories/secret-letter`. Record whether it needed
anything the language does not have. A missing primitive is a platform
discussion under CLAUDE.md (an ADR), never a story-side workaround.

**Found (2026-09-02, session 6a3da1) — a primitive is missing; everything around it carries.**
The check ran as written: `branch-stories/secret-letter/prototypes/w10-dance/` (three
placeholder partners, TODO beats, imported by nothing), driven through `./sharpee play`
and pinned as `w10-dance.tests.json` under `./sharpee test branch-stories/secret-letter/prototypes/w10-dance`.

- **Carries as the language is**: the turn budget (`define timer hand for the dance`, one
  named turn, `restart hand` on expiry — two-turn hands, exact); the rotation (one
  `when hand expires` clause, `select on the dance's state`, partners flipped
  `waiting`/`dancing`); each partner's talk as a `define conversation … opens when
  <partner> is dancing` thread that opens itself, with beats held on `dancing` so the
  outgoing partner goes quiet; `go on` serving the next beat; rounds as a story counter
  raised at the wrap, with topic rows keyed `at most 1` / `at least 2`; the music's end
  as a counter raised in each `conclusion:` row.
- **Missing — the hand-off itself (GH #348)**: the story cannot pass the player's
  conversation to the next partner. A thread opens only when neither party is in
  another scene (`packages/character/src/tick-phases.ts`, `ensureScene`), and nothing in
  Chord closes or hands off a scene: the last partner's scene ends only by the player's
  own address (that path works) or by about three silent turns. Under a two-turn hand
  the next partner is reached a round late. ADR-320 D10's interruption rule — an
  `opens when` partner taking the floor from a passive scene — is the designed answer
  and is unbuilt (GH #347's D10 family). A platform discussion; nothing is built
  around it in the story.
- **Also surfaced, filed**: `is concluded` in an every-turn clause and `leave` in a
  floor-turn beat pass the analyzer and throw at runtime (GH #349); a trait's guarded
  `on the player asking while …` shadows the owner's topic table even when the guard
  is false, so "not your hand" cannot be a composed refusal (GH #350); the acting
  statement rejects `<npc> talks to <target>` against the very shape it names
  (GH #351); the bundle's `--exec`/`--play` path has no import resolver, so the port's
  README command fails and `make-story-artifacts.mjs` cannot regenerate the port's tree
  (GH #352).
- **Not a gap, learned**: several `when <timer> expires, while …` clauses on one timer
  are read in order against post-mutation state, so a state rotation written as three
  guarded clauses cascades through all three in one turn — `select on … state` is
  the spelling. A partner's floor turn runs before the timer expiry in the same turn,
  so a newly dancing partner opens one turn after the hand passes.

**Resolved (2026-09-02, sessions 6a3da1 and 69a114; recorded 2026-09-03, session ef1966) — the primitive is built, as designed, in `packages/character`.**
`docs/work/archive/adr-320-d10-interruption/plan.md` was the platform discussion; David ruled the
three design questions the same morning and they stand as ADR-320's D10a amendment:
an authored `opens when` is an interjection that challenges the player's live scene through
the same `resolveIntrusion` call world acts and the player's own address already make
(`passive` yields, `assertive` protests then yields, `blocking` holds); the grip the challenge
meets is the stronger of the scene's grip and the outgoing pair's ACTIVE thread strength; and
`on parting` renders on every park, not only the same-pair topic switch. ADR-332 put the
story's clocks ahead of the actor phase, so a partner made `dancing` by `when hand expires`
is read by that partner's floor turn in the same turn.

- **What the prototype does now** (`w10-dance.tests.json`, re-transcribed from a real
  `./sharpee play` run): the hand passes on the hand-off turn — the outgoing partner's
  thread parks at its cursor with its `on parting` line, the incoming partner's first beat
  lands the same turn, and the circle's return resumes the parked thread through
  `on resuming`. 14 turns to the music's end where the lagged engine needed 28;
  `./sharpee test branch-stories/secret-letter/prototypes/w10-dance` 15 cards / 46
  assertions passing (2026-09-02 22:51 CDT).
- **Real-path tests**: `packages/story-loader/tests/adr-320-d10-interruption.test.ts`
  (3, `GameEngine.executeTurn` on a two-hand fixture, no stubs — interruption on the
  hand-off turn, `on parting` rendered, resume at the parked cursor);
  `packages/character/tests/conversation/interruption-d10a.test.ts` (10) and
  `tests/tick-phases/thread-interruption.test.ts` (4). Suites at commit 07e1949d:
  character 597, story-loader 1022, engine 680, stdlib 1663. Dungeo chain 952
  byte-identical; fernhill 36/40, secret-letter 562/953, thealderman 4/9.
- **Two residuals, filed and RESOLVED 2026-09-03** (David ruled option A on both, built in
  `docs/work/archive/hand-off-order-and-state-pins/plan.md`, session 89ce13): step 4a now
  resolves every challenge before serving any floor turn (GH #354), so the prototype's six
  `beat, when <partner> is dancing:` hold gates are gone — bare `beat:` rows, and the committed
  tree passed unchanged (15 cards / 46 assertions); tree cards can pin a Chord entity's own
  state spelled the way Chord spells it (GH #355) — `the first partner is waiting`, `the dance
  is second`, `the story is ended` — so the hand-off cards now pin the partners' `waiting`/
  `dancing` directly (15 cards / 69 assertions). Baselines after both: Dungeo chain 952 passed,
  fernhill 36/40, secret-letter 562/953, thealderman 4/9; character 599, story-loader 1029,
  engine 680, stdlib 1663, branch-tester 104.

**Status**: CLOSED 2026-09-03 — GH #348 closed with this evidence; GH #354/#355 closed the same day. Phase 10's Chapter 11 build can proceed with no hold gates and with partner-state pins.

**Postscript 2026-09-03 (session b6d0a8)**: later the same day David redesigned the whole ending and **the dance is gone** (change document, *Chapter 11 — The Ball (the redesigned ending)*). The ballroom still runs several live conversations at once — that is what this entry measured, and its findings and the platform work stand. The rotation and the hand-off on a turn budget are no longer what Chapter 11 builds; the prototype stays as the proof.

## Recording results

Append findings under each entry with the date and the command or observation
that produced them. Entries close when the answer is known, not when the port
ships — a closed entry with a measured "this is fine at 8,000 lines" is as
valuable as one that found a problem.
