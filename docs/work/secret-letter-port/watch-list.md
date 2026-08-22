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

## Recording results

Append findings under each entry with the date and the command or observation
that produced them. Entries close when the answer is known, not when the port
ships — a closed entry with a measured "this is fine at 8,000 lines" is as
valuable as one that found a problem.
