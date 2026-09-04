# State-Space Analysis for Sharpee / Chord

**Status:** Working document for **ADR-322** (state-space analysis, umbrella — ACCEPTED
2026-08-20).
**Read ADR-322 first.** It settles the layer split (D1), declaration-vs-claim (D2), the
annotation rules (D3–D5), the performance budget (D6), the soundness contract (D7),
consumption of ADR-321 (D8), and the open finding vocabulary (D9). **Those constraints are
not re-argued here**, and a future session should not re-litigate them from this document.

ADR-322 D10 leaves this document the rest: **the check catalog, the metrics, the syntax
sketches, the staging, and the open questions.** Being wrong here is cheap, which is the
point of the split.

**Supersession is ADR-322's business, not this document's.** ADR-322 supersedes ADR-294
D20 and ADR-303. This document claims nothing.

**Audience:** Claude Code sessions working in this repo, and future me.

**Provenance, recorded deliberately.** This document came first: a design conversation on
2026-08-21 (David + Claude Desktop), revised the same day against the prior art it had been
written without — ADR-294 D20/D22, ADR-321, ADR-302 D17, ADR-293. **ADR-322 was then
extracted from it**, lifting the constraints that must not be re-litigated into a thin
umbrella and leaving the rest here. That is why ADR-322 carries session c5bc96's date
(2026-08-20) while citing a document written the next day — the dateline is the extracting
session's, not an inconsistency to chase.

**Extraction does not run backwards.** ADR-322 is normative regardless of where its text
came from: once D1–D9 were lifted, this document defers to them rather than to its own
earlier phrasing of the same rules. Provenance is recorded because ADR-322's Session note
identifies *"each attempt written without knowing the previous existed"* as the recurring
failure here, and an unrecorded extraction chain is the same class of problem.

Per `CLAUDE.md`, anything here touching `packages/` requires discussion before
implementation.

---

## 0. Working under the budget

**The budget itself is settled: ADR-322 D6** — under ~2 seconds on a real story, a
constraint the project picks rather than a measurement it awaits. **D7** carries the
soundness contract that runs alongside it: findings are real, absence is not proof, and
every report names its budget and pruning rule. Neither is re-argued here.

What this section holds is the working consequence: how to tell, on a given story, which
of §9's mitigations is needed now.

### What instrumentation is for

Not go/no-go for the sweep — build it, that is how the numbers get made. But **ADR-322 D12
makes it go/no-go for the IDE integration**: how this connects to the IDE is not decidable
until these numbers exist on real stories. Beyond that, it tells you which of §9's
mitigations you need on day one rather than in principle. Carry these numbers permanently, from the first walk onward:

| Measurement | What it tells you |
|---|---|
| Wall-clock to exhaustion | Whether the budget holds on this story |
| States enumerated; distinct-states-per-depth | Whether the frontier converges or explodes |
| **Dedup ratio** | Near 1.0 means the signature carries noise; a frontier that stops growing early means it over-merges. This checks the *signature*, not the story (ADR-294 D22) |
| Cost with vs. without validate-only pruning | How much of the tractability is the pruning |
| Cost with vs. without forcing | How much is the randomness contract |

**Fernhill is the right pilot precisely because it is not clean.** It has timers
(`on every turn while one chance in 6`), turn-indexed sequence events, and Chord has
counters (ADR-264) — three of the four explosion sources §9 names, in the corpus you would
pilot on. So the first walk exercises the mitigations immediately rather than deferring
them. Ides of March second.

**But Fernhill is not a large sample, and the corpus does not contain one.** At 1,155
lines it is the largest Chord story here (thealderman 938, Ides of March 921, measured
2026-08-20). Per ADR-322 D12 the measurement therefore adds a **synthesized stress story
whose state bits scale on a controlled axis** — state bits, not source lines, are what
explodes — plus a **generative-entity-space case the sweep must decline** rather than grind
(Counterfeit Monkey's letter-remover is the exemplar class). The IDE needs an answer for
the declined case as much as for the fast one.

**Dungeo is not the stress test.** An earlier draft of this line said it was; that is wrong
on mechanism — Dungeo has no `.story` file, it is TypeScript under `stories/dungeo/src/`,
so it is not a Chord IR sweep target at all.

**And speed is not the only thing to measure.** ADR-322 D13 adds a validation corpus that
this repository could not previously supply, because every Chord story here was written by
this project against this project's assumptions: *Jack Toresal and The Secret Letter*
(source-available, owned) brings five playtest transcripts recorded 2007-2010 — **a path the
sweep calls unreachable is a defect in the sweep** — the designers' own puzzle diagrams to
check ADR-321's `lifted` against, and published reviews. It is *not* a performance sample:
12,635 lines over 32 rooms with a linear spine is large source over a small state space, and
will likely sweep in milliseconds.

The walk itself, per §9: BFS, fork by re-execution (ADR-302 D17), validate-only pruning at
each node, forcing at choice points (ADR-293 Phase C), and the D22 signature projection.

### Known threat to termination

A story with a per-turn meter (ADR-263 hunger, sanity) makes every state distinct and the
walk non-terminating. ADR-262's banded scalars are the likely answer — sign the band, not
the value — but that is a decision about what a meter *means*. **Answer it before
implementing**, not after. Fernhill has no such meter, so the pilot will not surface it;
that is a reason to watch for it, not a reason to defer it.

Also open (D22): whether `scoreLedger` is part of a world's identity. Settled: the parser's
pronoun context is **not** (David, 2026-08-20).

---

## 1. What the budget buys

The speed matters more than the analysis. Above roughly ten seconds this is a batch tool
run before shipping, and authors run it twice a year. Under two seconds it runs on every
save, which makes it a **compiler diagnostic**: a squiggle under the line, in the channel
where Chord already reports build errors (ADR-276, source-authoritative errors).

That reframing drives §2 and §10. The goal is not a report — it is a finding attached to a
source span with a minimal reproduction.

**Which of those two regimes this becomes is measured, not assumed** (ADR-322 D12). They
are different products — different trigger, different surface, different cost when a result
goes stale — so the IDE connection is specified after real sweeps have run, not alongside
them.

Note the existing house position: *there are no CI gates in this project* (ADR-303 D5).
Nothing here proposes one. On-save diagnostics and a CLI mode, not a gate.

---

## 2. Architecture — settled in ADR-322

The four layers (**D1**), declaration-vs-claim (**D2**), and the three annotation rules —
declare only where identical structure carries different intent (**D3**), no annotation
may only suppress (**D4**), syntax decided last (**D5**) — are decided in ADR-322 and are
not restated here. Where this document says L1–L4, it means D1's layers.

What remains here is the working detail those rules do not settle: how they land against
mechanisms this repo already ships.

### D3 against the house rule

> **A tension, stated rather than resolved.** ADR-303 D4 rejected
> inference outright — *"the platform does not guess what matters, it asks"* — citing
> ADR-293 (randomness) and D7 (parentage) as precedent. ADR-322 D3 leans the other way.
> The reconciliation: ADR-303 D4's stated reason for rejecting inference was *false
> positives from an imprecise comparison*. Where an analysis is exact, that objection does
> not apply; where it is heuristic, ask. ADR-321 D3 already draws this line correctly and
> more sharply — **when the analyzer cannot model a rule, it drops the check rather than
> guessing.** Adopt that posture as the tie-breaker: infer where the loader's semantics are
> modelled, ask where they are not, and drop the check where neither holds.

### D4 already has a mechanism

> **Do not build a new suppression surface.** ADR-321 D22 ships per-finding, story-wide
> dismissal written to `<story>.world-ignore.json` — committed and diffable. ADR-294 D22
> ruled it be reused unchanged for exactly these findings: *"A cruel author dismisses their
> deliberate traps once; Remaining holds the ones they did not put there."* So D4's
> practical content is narrow: **a dismissal of an unwinnable state should additionally
> assert that state stays reachable.** An upgrade to the existing mechanism, not a
> replacement for it.

---

## 3. State taxonomy

The naive model is win/lose, and it is wrong. The reason is the Hitchhiker's babel fish
puzzle: each failure produces distinct hand-authored text *and* irreversibly advances
world state toward the solution. The failures are the puzzle. A player who solves it first
try has a worse experience — and "shortest winning path" ranks that player highest.

**ADR-303 D1 already drew the primary distinction, and states it better than this document
originally did:** *"A loss is an outcome; unwinnability is a property of a state."* A loss
has a name, prose, and a place in the point-and-class catalog. Unwinnability is the
*absence* of a reachable ending. They are not degrees of the same thing. That decision
survives ADR-303's closure and should be re-homed here verbatim.

Three terminal classes, not two:

- **Win** — authored success ending (`win <id>`).
- **Loss ending** — authored, final, the game concludes and says something (`lose <id>`;
  Fernhill authors two). This is *content*. A tragedy is a win in storytelling terms.
- **Walking dead** — player alive, no path to any winning ending. No ending, no message,
  no test. *"That is precisely why it survives to ship: every other bad outcome announces
  itself"* (ADR-303 context).

### The 2×2 that isolates the finding

Classify on two axes the IR already knows — **recoverability** and **authored prose**:

|  | Authored prose | Generic / library default |
|---|---|---|
| **Recoverable** | **Designed delight.** The babel fish case. Not "is this a bug" but "can players reach it?" | Ordinary filler. Ignore. |
| **Unrecoverable** | **Intentional cruelty.** Confirm it's dismissed, then leave alone. | **The finding.** The rope silently burned; nobody wrote anything; nobody meant it. |

The bottom-right cell is the original "unintentional unwinnable state," isolated by two
structural signals rather than by an author questionnaire.

---

## 4. Check catalog

Organized by what each check *needs*, because that determines shipping order — and by
**what already exists**, because the first draft of this document reimplemented a shipping
feature.

### 4A — Already shipping. Consume, do not rebuild (ADR-322 D8).

ADR-321's **Reach** view is a static IR pass with no engine run, recomputed on every
build, obstacle-aware and iterated to a fixed point. It already ships:

| Check | Where |
|---|---|
| Unreachable rooms, things, people | ADR-321 D4 |
| Exits that resolve to no real room | ADR-321 D4 |
| Blocked-with-reason (*the key is inside the room it opens*) | ADR-321 D4 |
| Things with no description | ADR-321 D4 |
| Undescribed / unnamed tools — *a thing the mechanics need that no prose names* | ADR-321 D13 (`UnnamedTool`, `role: 'progression-info'` = severe) |
| Vocabulary resolution of authored noun phrases | ADR-321 D5 (Incomplete) |

**The puzzle dependency DAG already exists and is measured.** ADR-321 D14 keeps
`lifted: LiftedObstacle[]` beside `blocked`, each carrying `pass` (the fixed-point pass it
lifted on) and `requires` (entities that had to be reachable first), plus
`progression: string[]`. That *is* the dependency graph of progress. §4B's cycle
detection consumes it; it does not derive its own.

D14 also proves a static scan cannot substitute — on Fernhill it produced a chain of the
same size and a different set, inventing two doors that gate nothing and missing both
machine triggers. **Wrong in both directions at once, which is worse than under-counting,
because the count looks right.** Any temptation to re-derive this cheaply is already
refuted.

### 4B — New, needs only the sweep (no Chord syntax)

**Unwinnable-from analysis.** States with no path to any winning ending.

**Report the point of no return, not the dead state.** BFS records each state's parent, so
for any softlock candidate, walk back to the last ancestor that still passed: the
transition between them is the action that killed the game. *"burning the match makes the
game unwinnable"* rather than *"state #4,118 is dead."* Costs one parent pointer
(ADR-294 D22).

**Detection distance.** Turns between the point of no return and the earliest point a
player could discover it. A 3-turn gap is a puzzle; a 200-turn gap is a betrayal.

**Load-bearing objects.** Items on every winning path, cross-referenced against every
action that can destroy, consume, or strand them.

**Dependency cycles.** Verify `lifted`/`requires` is acyclic. The screwdriver locked in the
box that needs the screwdriver. Cheapest real bug available, and it consumes §4A's
existing graph.

**Phantom progress.** Score-increasing transitions reachable from *inside* a doom region.
The game is congratulating a corpse. Chord has `use scoring` with ranks
(`fernhill.story:13-16`), so score deltas are in the IR. Rank this above most findings:
the reward signal is actively lying.

**False victory.** A success-framed ending reachable in a small fraction of the median win
length. Someone walks out the front door on turn 20 and never sees the game.

**Guards that don't guard.** Shortest paths come free from BFS; a puzzle the shortest route
to its goal does not traverse is a guard that isn't guarding (ADR-294 D22).

**A coverage denominator nobody authored.** The visited set gives ADR-302 D6's "an untaken
branch is a coverage fact" the denominator it has lacked since it was written
(ADR-294 D22).

**Near-miss content.** Content reachable on under ~1% of paths — written, but nobody will
read it. Render as gutter shading, not a finding list.

**Optional islands.** A subgraph reachable from the spine, exiting back to it, on zero
critical paths. Can the player get *stranded* there? Does entering it consume something
needed later? Re-enterable or one-shot?

**Missed windows.** Transitions not caused by the player — timers (ADR-217),
`on every turn` blocks, NPC schedules. Does a window exist on every winning path, or can
it close silently while the player is elsewhere? Nearly impossible to playtest: it
requires a tester to be in the wrong room at the wrong time.

**Loop productivity.** For reset structures: does every iteration make at least one new
action reachable? An iteration that cannot advance is a soft-lock disguised as a mechanic.
Verify the persistent knowledge set is monotone across resets.

### 4C — Lexicon and referent checks

**This is the section with the least prior art and the most leverage.** Guess-the-verb is
a **lexicon problem, not a topology problem** — the sweep is blind to the real failure,
because the state where the player types the verb is never entered. But the sweep
identifies which vocabulary is *load-bearing*, and that is what turns a noisy lint into a
ranked list. Topology finds the critical transitions; lexicon analysis judges the risk.

**Undeclared referent — forward direction.** ADR-321 D13's `UnnamedTool` already answers
*"the mechanics need this and no prose names it."* The new half is **positional**: for
every noun required on a critical path, does the token appear in prose the player can have
read **by that point in the walk**? D13 is static and story-wide; this is state-relative,
and only the sweep supplies "by that point."

Reference case: mainframe Zork required `turn nut` (not `turn bolt`) while never
describing a nut.

- *Synonyms count.* Chord has `aka` (`fernhill.story:54`, `:84`), and ADR-321 D11 already
  exports `VocabularySurface.wordsOf` — entity id to the words it answers to. Consume it.
- *Distance and prominence.* A noun introduced 200 turns earlier in another room is
  technically declared and practically invisible. One whose only appearance is inside the
  examine-response of an optional object is barely better than never.
- *The inverse already ships* as ADR-321 D5 (Incomplete). What the sweep adds is
  **criticality weighting**: an unrecognized noun printed in the room where a critical
  gate lives is a different animal from one in a decorative description. The sweep is the
  *ranker* here, not the finder.

**Hapax verbs on the critical path.** A verb used exactly once in the whole game and
required to win. That is the guess-the-verb signature.

**Teaching curve.** For each load-bearing verb, is its first *necessary* use also its first
appearance anywhere? If so the player never had a chance to learn the verb exists. Good
design does this instinctively — introduce the verb harmlessly, gate on it later. This
converts an aesthetic intuition into a build-time diagnostic and is the highest-value item
in 4C.

**Synonym breadth per gate.** How many phrasings satisfy this transition? One is brittle.
Combined with the above: *this gate accepts exactly one phrasing, using a verb that appears
nowhere else in the game, and it is on every winning path.*

**Standard-vocabulary distance.** A core set of ~40 verbs every parser player has (take,
drop, open, examine, push, pull, turn, tie, burn, dig…). A required verb outside that set
is higher-risk. No semantic judgment — just a list — and it ranks findings with no author
input.

**Perception granted, interaction refused.** The Enchanter mouse hole: you can see
"something" in it, `GET` fails, the answer was `REACH`. Two checks:

1. `TAKE` is not one verb among many — it is *the* default hypothesis for any visible
   object. For every object required on a critical path, does `TAKE` succeed? If not, does
   the refusal text **name the affordance that works**? "You can't reach it" solves the
   puzzle in one turn; a bare library refusal is a dead end wearing a response.
2. **Affordance density.** Per critical object, count plausible attempts with hand-written
   handling vs. those falling through to the library default. Six of seven defaulting is a
   wall, and the count *is* the signposting quality. This measures guess-the-verb from the
   author's side, where it is observable: you cannot enumerate what players will type, but
   you can enumerate what you bothered to answer.

The trait system makes (2) cheap. Sharpee knows the mouse hole is a container with an
aperture, and apertures imply a verb set (reach in, look in, search, feel, put in). The
expected set comes from traits, not prose analysis. Generalizes: any critical object with
sparse coverage of its own trait's affordances is a guess-the-verb candidate before a
player touches it.

**Indefinite referents over load-bearing objects.** "Something," "a shape," "movement" in a
location holding a critical-path object. The author's prose instinct is to be evocative and
withholding; the parser's requirement is that the player have a handle. Those fight, and
the fight is detectable.

**Knowledge gates.** Chord has first-class `knows`
(`ides-of-march.story:199-200, 377-378`). Two opposite bugs plus one decision: the PC holds
the flag but the player never saw the granting text; the player knows the answer but the PC
refuses; and *replay short-circuit* — gates a returning player bypasses by typing a
remembered code. The last is not a bug (Infocom often allowed it) but it is a decision, and
most authors have never enumerated which of their gates are guessable.

### 4D — Resource and numeric

Monotone counters are numeric, not combinatorial, and want their own pass. Chord has
numeric counters (ADR-264).

**Slack margin.** Minimum expenditure across all winning paths vs. total supply. *"You have
100 turns of lamp; the tightest win costs 94."* Simultaneously a bug detector and a
difficulty dial, and it composes: *"visiting the optional cave costs 30 turns of lamp,
leaving −24."* Authors currently estimate this by feel.

Interacts with §0's termination threat: a resource counter is a meter, and ADR-262's banded
scalars may be needed for the signature even while the *analysis* wants the exact value.
Band for identity, track exactly for reporting.

### 4E — Requires L3 declaration

**Ratchets.** A chain where each step reveals a new blocker and irreversibly advances
state. Two terminal flavors:

- *Ratchet to success* — the babel fish. Failures are content.
- *Ratchet to doom* — tragedy. The player's own agency is the mechanism of their downfall.
  Legitimate, powerful, and **structurally identical to an accidental cascade.** This is
  the case that forces declaration (ADR-322 D3).

Once declared, verify on every build: the chain is still monotone (nobody added an escape
hatch that deflates the tragedy); the terminus is still reachable and still the terminus;
**nothing leaks into the middle** (a player cannot enter at step 4 without 1–3, which
wrecks the setup); entry is foreseeable, or deliberately isn't, per the declaration. None
of these are checkable without the declaration, and all rot silently as a game is edited.

**Shared-prefix tragedy.** A doom-ratchet sharing a prefix with the winning path: the first
three steps are correct play, the fourth commits you. The cruelest version of the device,
very hard to see by hand, and the sweep locates the exact fork. *"Your tragedy diverges
from your victory here"* is something an author has no other way to see. Worth a dedicated
visualization.

**Convergence.** ADR-303 D4 decided this and it survives independently of that ADR's
closure: a variant declares it arrives where a named sibling arrives
(`converges-with: <sibling>`), the harness verifies before running the shared tail once,
the field is **declared-only and does not inherit**, and **the author names which entities
must agree** rather than the platform diffing whole worlds. Note D5's observation that
this needs the *same* semantic signature the sweep needs — **build it once**.

**Mutual exclusivity.** Two subgraphs where entering one permanently forecloses the other.
A feature, so it wants declaring; then check whether the foreclosure point is foreseeable.

### 4F — Author-written claims (L4)

See §7.

---

## 5. Metrics

Roughly half the value here is *checks*; the other half is **numbers authors have never
had access to**. The checks sell the feature. The numbers change how people write, because
today every one is estimated by intuition.

| Metric | Definition | Why it matters |
|---|---|---|
| **Detection distance** | Point of no return → earliest possible discovery | The cruelty question, made numeric |
| **Recovery cost** | Turns back to the last divergence point (= required undo depth) | See §6 |
| **Slack margin** | Supply minus tightest winning expenditure, per resource | Bug detector *and* difficulty dial |
| **Single-run content coverage** | Max fraction of authored text visible in one playthrough | At 95% your branching narrative barely branches; at 40% most players see less than half of what you wrote |
| **Island fraction** | Share of authored text off the critical spine | Most authors have never seen this for their own game |
| **Signal-to-noise per gate** | Available actions vs. productive ones | Difficulty curve grounded in something real |
| **Expected failures per gate** | Attempts before success | **Low is the warning.** A rich failure cascade most paths clear first try isn't landing |
| **Affordance density** | Authored responses vs. library defaults per critical object | Signposting quality |
| **Dedup ratio / states-per-depth** | §0 | Checks the *signature*, not the story |

Two of these invert the usual assumption and should be presented that way in the UI:
shortest-path is not a quality target, and low expected-failure is not a success.

**All of them are intent-neutral, on the same terms §6 sets for cruelty.** A game may hold
near-total single-run coverage, a near-zero island fraction and near-zero expected failures
per gate because it is railroaded by accident — or because it is scaffolded on purpose for
an audience new to the form. The numbers are identical. The tool reports them and says the
range is extreme; **it does not say the design is deficient**, and the `declare guided` in
§7 is how an author states which case theirs is. See ADR-322 D13: this is the validation
most likely to fail, because an analysis that editorializes is obnoxious in a way that a
merely wrong one is not.

---

## 6. Cruelty: what to compute and what not to ship

### Cruelty is not a defect metric

Some of the best IF rates Cruel. Hitchhiker's hostility is load-bearing — the game is about
an indifferent universe that kills you arbitrarily and finds it funny. Sanding that down
would destroy it.

ADR-294 D22 already settled the posture: **findings are intent-neutral.** *"An unwinnable
state is not a defect; cruel games author them deliberately. The distinction is authored
versus accidental, only the author can draw it."*

This flips the value proposition: **cruel games need this more, not less.** A large
deliberate doom surface gives accidental doom states somewhere to hide, and no playtester
will distinguish them — they'll assume any dead end is the joke. The hard guarantee in a
cruel game isn't "you can't get stuck," it's *"despite all this, a win still exists from
every state I claimed was survivable"* — which exhaustive sweeping can certify and
playtesting cannot.

### The header, and why the letter is not the output

ADR-294 D22 specifies `cruelty-scale:` in the story header — `merciful | polite | tough |
nasty | cruel`, a closed key set following `publish-source`'s closed-value pattern
(`packages/chord/src/parser.ts:896`). It **calibrates the surface**: `merciful` makes any
unwinnable state a contradiction of the declaration; `cruel` makes the whole list
informational; absent the key, **behave as `cruel`** — never accuse an author of a bug they
may have written on purpose. Keep this exactly as specified.

But **do not ship the letter as the analytical output.** Plotkin's own revisitation
(<https://eblong.com/zarf/essays/cruelty-revisited.html>) argues the scale was never really
about cruelty — it was about **save-file labor** under 1996 mechanics. *"I should have saved
back in the third room"* is a statement about replay cost. Multi-turn undo then blurred the
middle, because Tough and Nasty differ only in whether you needed *advance judgment* about
when to save, and undo removes that need. The scale also maps awkwardly onto choice-based
forms, where every action changes state — whereas parser IF treats most actions as
stateless.

So the header records **what the author was aiming for; it is not a certification.** Ship
the two quantities the scale was compressing, both of which the sweep produces natively:

- **Recovery cost** — distance back to the last divergence point; under unlimited undo,
  literally the required undo depth. A distribution, not a scalar: one doom transition may
  need 190 turns of replay while five others need four.
- **Foreseeability** — at the moment of the risky action, could the player have known?
  The half of the original scale that *survives* the mechanics shift, because it does not
  depend on save or undo behavior at all.

Merciful stays cleanly automatic (no doom states exist). Everything above it is a diagonal
through those two axes.

**Foreseeability has a concrete mechanism**, and it is §4C's positional referent
machinery: foreseeability is *what is in the reachable-prose set at the moment of the
decision.* That is computable, which means the fairness half needs far less author input
than a questionnaire approach suggests.

D22 makes one further point worth preserving: `tough` — *"obviously about to do something
irrevocable"* — **becomes checkable only because the point-of-no-return finding names the
exact turn to ask about.** That is the questionnaire, derived rather than asked in the
abstract, and there are usually few such turns.

### Reporting consequences (L2)

- Never emit these as errors. Warnings and info only.
- Never use the word "cruelty" in a diagnostic. Report the structural fact —
  *unwinnable-from*, *point of no return*, *recovery cost* — and let the author attach the
  aesthetic.
- The deliverable is a **reviewed list, not a score**. D22's framing via ADR-321 D22's
  dismissal: *"A cruel author dismisses their deliberate traps once; Remaining holds the
  ones they did not put there."*
- **Bespoke prose is a free intent heuristic.** A doom transition with hand-written text
  was almost certainly deliberate; one dropping the player into a stuck world with only
  library responses is more likely a bug. The IR knows which transitions carry authored
  text, so findings rank by probable-accident with zero author input — taking a list of 14
  down to "look at these 2 first."

### Honest limit — state it in the docs

The sweep can tell you a failure is reachable, how far back the divergence was, and whether
the player could have known. **It cannot tell you whether the failure is delightful.**
Hitchhiker's arguably fails the foreseeability axis outright and is a masterpiece anyway,
because dying in it is a reward. Better to say this plainly than to let a rating imply the
tool measures quality.

---

## 7. Chord syntax sketches

**Illustrative only.** Per ADR-322 D5 these are the last thing to decide. Written in observed Chord
idiom so the shape is arguable; no keyword is proposed as final.

Chord's `use scoring` / `use state-machines` pattern suggests a `use` gate:

```
story
  title: The Folly at Fernhill
  cruelty-scale: tough        # ADR-294 D22 — closed key set, absent behaves as cruel
  use analysis
```

### L3 — declarations (descriptive, cannot fail)

```
declare ratchet the-babel-fish
  from the player is in the Vogon Hold
  through failing to catch the fish
  ends in success
end declare

declare ratchet the-long-fall
  from opening the reliquary
  ends in loss
  intentional
  # per ADR-322 D4, also asserts this terminus stays reachable
end declare

declare exclusive
  the Norwich branch
  the Burbage branch
end declare

declare guided
  the critical path is a single chain
  because the audience is new to parser interactive fiction
  # obligation (ADR-322 D4): asserts the spine is still a chain, so a later
  # edit that branches it fails this declaration instead of silently voiding it
end declare
```

**`declare guided` is the first declaration real material argued for, not a designer at a
whiteboard** (ADR-322 D13). Every Textfyre story was written against a non-IF middle-school
audience, and *Jack Toresal and The Secret Letter* has the structure that follows: a
strictly linear scene chain, a large hint apparatus, ~1,192 authored response rules over 32
rooms. Reviewers read that as an absence of agency. They were describing the design working
as specified.

A deliberate spine and accidental railroading are byte-for-byte identical in the IR, so
**ADR-322 D3's test is met** — intent must be declarable here, because no inference
separates them. Without it §5's agency metrics accuse every game that scaffolds on purpose,
which is exactly the mistake §6 refuses to make about cruelty.

Sketch only, per ADR-322 D5 — the name `guided`, the clause wording, and whether the
`because` line is free text or a closed key set are all open. **Alternative considered**: a
`story` header key mirroring `cruelty-scale:`. The `declare` block is preferred because
ADR-322 D4 requires every declaration to carry an obligation, and a header key has nowhere
to put one.

Intentional *unwinnable states* are **not** declared here — they are dismissed through
ADR-321 D22's existing `<story>.world-ignore.json`, per ADR-322 D4.

### L4 — claims (prescriptive; disposition authored, advisory by default — ADR-322 D11)

The acceptance-criteria section — a defined block, verified on every build.

The block's **first line is a disposition key** — it lives inside `claims`, not in the
`story` header. Absent, it is `advisory`. The sketch below states it explicitly.

It is not a story-header key because it governs one block, and a reader deciding what a
red build means should find the answer in the block that produced it rather than
sixty lines up in unrelated metadata. `cruelty-scale:` is in the header because it
describes the whole story; this describes how one block reports.

```
claims
  reported as: binding      # advisory | binding; absent = advisory
  always winnable unless dismissed
  every ending is reachable
  no ending is reachable before the second day
  the full score is reachable in a single path
  every phrase is reachable
  single-run coverage is at least 80%
  the lamp has at least 20 turns of slack
  the deed is reachable without entering the Cellar
  the shortest win is at least 60 turns
  no critical noun is unwritten
  every load-bearing verb is taught before it is required
end claims
```

Design notes:

- **This is not a new idea; it is a promotion.** ADR-303 D5's first layer already decided
  it — *"The author names what must stay true (the deed must remain gettable), and the
  harness checks the predicate per turn."* What this section adds is a **defined section**
  rather than scattered per-turn predicates, and a vocabulary broad enough that §4's canned
  checks become a **standard library of claims** rather than hard-coded passes.
- If L2 assumes a fixed finding taxonomy, this becomes very hard to retrofit — which is why
  ADR-322 D9 fixes the shape now: **design the reporting layer against an open finding
  vocabulary from day one**, even while only
  built-in checks exist. D22's pure-data result shape already points this way:
  `(result) => Finding[]` over `states[]` in BFS order.
- Claims want ADR-276's source-authoritative error treatment.
- `unless dismissed` is how ADR-322 D4 stays coherent: the global invariant holds except where a
  dismissal has taken responsibility, and each dismissal carries its own obligation.
- **Advisory is the default so the block is writable before the story is finished.** Under
  `advisory` a violated or *unproven* claim is a `warning` and the build still succeeds;
  under `binding` both are `error`s and it does not. A draft violates most of its own
  claims, and a binding default would break the build the day the author wrote their first
  one — teaching them to postpone claims to release, when there is least left to catch. One
  key, in the source, tightened at release.
- **Advisory is not silence.** The claim tally — held / violated / unproven — prints on
  every build at either disposition. Downgrading severity is not suppression; going quiet
  is, and a quiet disposition would be the suppression-only annotation ADR-322 D4 forbids.
- **Three outcomes, not two** (ADR-322 D11): held, violated, and **unproven** — the sweep hit
  the budget or a pruning rule before it could decide. Unproven is never reported as held,
  at either disposition, or ADR-322 D7's *absence is not proof* would launder itself into a
  green build.
- **No new reporting mechanism is needed.** `DiagnosticSeverity` is already
  `'error' | 'warning'` (`packages/chord/src/diagnostics.ts:13`) and build success is already
  "no error-severity diagnostic" (`diagnostics.ts:48`, `index.ts:45`). The disposition picks
  which method a claim violation reports through; the span and the ADR-276 treatment are the
  same either way.
- **Alternative sketch, not preferred**: a bare modifier on the block's opening line
  (`claims, advisory`). The key-line form is preferred because a closed key set has
  somewhere to grow if a third disposition ever earns its place, and because it reads as a
  property of the block rather than as punctuation. Per ADR-322 D5, neither is decided.
- **Per-claim override is deliberately absent.** It is the construct that rots quietly — one
  claim downgraded during a debugging session, never restored, invisible in a block that
  still reads as binding.

---

## 8. What already exists in this repo

The first draft of this document listed Chord language features and no world-index
derivations, and as a result reimplemented a shipping feature. Corrected:

### Derivations to consume (do not rebuild)

| Need | Existing |
|---|---|
| Reachability of rooms/things/people, obstacle-aware | `deriveReach(ir) => ReachResult`, `@sharpee/world-index` (ADR-321 D4) |
| Puzzle dependency graph | `ReachResult.lifted: LiftedObstacle[]` — `pass`, `requires` — plus `progression: string[]` (ADR-321 D14) |
| Blocked-with-reason findings | `BlockedEdge` (ADR-321 D4) |
| Mechanics-need-it, prose-never-names-it | `UnnamedTool`, `role: 'progression-info'` (ADR-321 D13) |
| Entity → words it answers to | `VocabularySurface.wordsOf` (ADR-321 D11) |
| Per-finding dismissal, committed and diffable | `<story>.world-ignore.json` (ADR-321 D22) |
| Fork mechanism | Re-execution, not save/restore (ADR-302 D17) |
| Determinism, forcing, per-point streams | ADR-293 (`forces:`, `materialize`, Phase C) |
| Coverage surface | ADR-293 D15, aggregating D16's trace stream |

### Chord language features the analysis reads

| Need | Feature |
|---|---|
| Terminal classification | `win <id>` / `lose <id>` |
| Knowledge gates | `knows <fact>, <source>, <certainty>` |
| Noun synonyms | `aka` |
| Score deltas (phantom progress) | `use scoring` + `rank … at N` |
| Guard conditions | `while` clauses, `is blocked while …` |
| Non-player transitions | `on every turn`, timers (ADR-217) |
| Numeric resources | counters (ADR-264) |
| Branch/state structure | `use state-machines`, `states:`, `select on … end select` |
| Authored-vs-default text | `phrase` ids vs. library messages |
| Author intent | `cruelty-scale:` (ADR-294 D22) |

### Transcripts

The repo has a transcript harness (`node dist/cli/sharpee.js --test`, `--chain`). Two
consequences:

1. A minimized witness path should be emitted **as a `.transcript`**, so the repro runs
   under existing tooling and can be committed as a regression test.
2. The sweep can generate a minimal suite covering every reachable edge.

Constraint: control-flow directives in transcripts are removed grammar (ADR-294 D4).
Generated transcripts must be plain command sequences. Note also ADR-306 D3 — the author
world (branch-tester, Chord stories, the IDE) has **no golden tier**; its regression
baseline is the transcript tree passing at the pinned seed. Generated artifacts target that
world, not the frozen Dungeo golden world.

---

## 9. Tractability

The budget is held over a **distilled signature**, not the raw parser action space.
Explosion returns with **counters, arbitrary container nesting, NPC schedules, and
timers** — the four sources to design against. Four mechanisms answer them, three already
decided:

**Validate-only pruning (ADR-294 D20, fact 1).** The four-phase action pattern answers
"which commands are valid here?" without mutating, collapsing the candidate set from
grammar × vocabulary to commands that would actually execute. This is also what makes the
soundness bound meaningful: *no valid command sequence reaches X*, rather than *nothing in
a hand-picked action set does*.

**Enumerated randomness (ADR-294 D20, fact 3; ADR-293 Phase C).** At a choice point the
sweep does not sample — it branches once per declared class via forcing. A combat encounter
is a fixed finite subtree, not a lottery. **The first draft of this document omitted
randomness entirely, which was a real gap**: a sweep over stochastic content without
`forces:` explores noise. Dungeo's thief and combat are the case in point.

**Fork by re-execution (ADR-302 D17).** No save/restore in the walk; a child's starting
state is re-executed. This is also what makes the walk trivially parallel — a worker boots,
replays a path, and shares nothing. Note the consequence ADR-303 flagged: convergence
assertions need a read path that does not reintroduce the save hooks issue #229 was about.

**Signature by projection (ADR-294 D22).** D20's original dedup — hashing the canonical
save snapshot — *cannot work*: turn counters and per-point stream states differ for
irrelevant reasons, so two arrivals at the same world never hash equal and the walk explodes
instead of converging. The replacement is the projection in §0.

### What this document adds

**Derive the relevant property set from the IR.** Walk the IR for every world property ever
read by a condition or guard; properties nothing branches on need not be in the signature.
Per ADR-322 D3 this is inference, not declaration — and per ADR-321 D3, it is legitimate inference
only where the loader's semantics are modelled. Where they are not, drop the check.

**Refine on spurious findings.** If a coarse signature yields a false "unwinnable," add the
discriminating property and re-sweep. Counterexample-guided refinement, no author
involvement.

**Incrementality.** IR dependency tracking bounds which parts of the space an edit can
affect — what keeps sweep-on-save viable as stories outgrow the pilot corpus.

**Know when the abstraction is bad.** Plotkin's observation that parser IF treats most
actions as stateless is exactly why the sweep is tractable — `examine`, `look`, `inventory`
don't branch. The IR knows which actions mutate state. If a story's action mix drifts
choice-heavy, tractability and the meaningfulness of cruelty analysis degrade *together*,
and the tool should say so rather than emit a confident rating over a bad abstraction. Same
for loop-structured games: recovery cost is near-zero by construction and foreseeability is
the whole game, so detect the reset edge and knowledge-monotonicity structurally and
**suppress the rating rather than report a misleading one.**

---

## 10. Staging

**Stage 1 — sweep + attribution, zero config.**
§4B, plus the §4C checks needing no syntax. Nothing in Chord changes. Consumes ADR-321's
existing derivations rather than rebuilding them.

Accuracy and speed on real stories is Stage 1's job, instrumented per §0 from the first
walk. Fernhill's timers, sequences and counters decide which §9 mitigations land now
rather than later — that is a finding to act on inside the stage, not a gate in front of
it.

Attribution work in this stage is not optional:
- source-span mapping for every finding (ADR-276 alignment)
- **witness minimization** — delta-debug a 200-action path to the minimal sequence. Without
  this the diagnostics are unusable no matter how fast they compute. Note D22's result
  shape makes ancestry a `while` loop: BFS order guarantees a parent's index is lower than
  its child's, and any state reconstructs by replaying `via` back to the root.
- ranking by probable-accident (bespoke-prose heuristic, criticality weighting)
- severity assignment: never error, mostly warning, some info
- dismissal via the existing `<story>.world-ignore.json`

**Stage 2 — declarations**, only where real stories show inference cannot distinguish
intent. Expect ratchets to be the first genuine case.

**Stage 3 — the claims block.** Highest value; most benefits from Stage 1's finding
vocabulary being settled.

**Stage 4 — ecosystem.** Emit computed metrics as release metadata alongside the authored
`cruelty-scale:`. "Sharpee games are the ones where the structural facts are computed" is
small and very legible to the IF community.

---

## 11. Open questions

1. **Which §9 mitigations Fernhill's timers, sequences and counters force on day one.**
   Answered by the first instrumented walk (§0), inside Stage 1.
2. **Per-turn meters and signature termination** (ADR-263 / ADR-262 banded scalars).
   D22 marks this open *and correctness-critical*. Answer before implementing.
3. **Is `scoreLedger` part of a world's identity?** (D22, open.)
4. **Where does the sweep live, and what is its result contract?** ADR-322's Consequences
   names this as **the only child blocking code**. ADR-321's `@sharpee/world-index` is a
   static pass with no engine run; the sweep needs an engine. Likely a sibling package
   consuming `ReachResult`, not an extension of either `world-index` or `engine`.
   `packages/` placement is CLAUDE.md-gated and undecided — this wants its own child ADR,
   not a paragraph here.
5. **Finding vocabulary shape.** ADR-322 D9 settles the *shape* — closed severity set, open
   category namespace. What is open is the initial category list; see §7's retrofit
   warning.
6. **Regression-transcript currency.** Regenerate on demand, or commit with a checksum?
7. **Undo stance.** Raw vs. as-played recovery cost in metadata. Emitting both is cheap;
   deciding which is canonical is not. Related: a sweep-driven "merciful mode" would
   mechanically convert any game to Merciful, and that property is *provable* rather than
   asserted.
8. ~~**ADR-131 disposition.**~~ **Resolved 2026-08-20 (session 502b0b), and not the way
   this item proposed.** Re-pointing the amendment at ADR-322 would have been wrong:
   ADR-303's own supersession record already disposes of D6 — *"D6's widening of ADR-131
   is moot: ADR-321 subsumed ADR-131's static half on 2026-08-19"* — and ADR-322 D8
   consumes ADR-321's `lifted` rather than widening any explorer, so there is no widening
   left to own. The SCOPE WIDENED block is closed in place as history instead, noting that
   its trigger (whoever accepts ADR-303) never fired, since ADR-303 went to SUPERSEDED
   without ever being accepted.
9. ~~**ADR-322's dateline, when it moves off DRAFT.**~~ **Resolved 2026-08-20**: the ADR
   was accepted in session 502b0b, and its Date line now carries the full sequence
   (drafted c5bc96, Amendment 1 and acceptance 502b0b) with the extraction order recorded
   in its own Session section.

---

## 12. Non-goals

ADR-322's Non-goals govern: not a quality metric, not cruelty reduction, not a replacement
for playtesting, not a fixed list of analyses. Two additions specific to this document:

- **Not a CI gate.** No CI gates in this project (ADR-303 D5, and the practice predates it).
- **Not a rebuild of ADR-321's Reach.** ADR-322 D8; see §4A and §8.

---

## 13. Where the prior art landed in this document

*Supersession is decided in ADR-322. This table is a finding aid, not a disposition.*

| Source | Where it lives here |
|---|---|
| **ADR-294 D20** | Soundness contract → ADR-322 D7. Validate-only pruning and enumerated randomness → §9. |
| **ADR-294 D22** | Signature projection → §0. Point-of-no-return, guards-that-don't-guard, coverage denominator, dedup-ratio self-check → §4B, §5. Intent-neutrality and `cruelty-scale:` → §6. Pure-data result shape → §7, §10. |
| **ADR-303 D1** | Loss-vs-unwinnable → §3, re-homed verbatim. |
| **ADR-303 D4** | Convergence (`converges-with`, declared-only, author names what must agree) → §4E. |
| **ADR-303 D5** | Declared-invariants layer → §7's claims block. Its probe is replaced by the sweep. |
| **ADR-321** | Consumed throughout; §4A and §8. Nothing added to its three views. |
| **ADR-302 D17** | Fork by re-execution → §9. |
| **ADR-293** | Determinism and forcing → §0, §9. |
| **ADR-294 D21** | Unaffected. |
| **ADR-131** | Open question 8. |

---

## References

- **ADR-322 — state-space analysis, umbrella. The governing document; read it first.**
- Plotkin, *The Zarfian Cruelty Scale, Revisited* — https://eblong.com/zarf/essays/cruelty-revisited.html
- ADR-321 — world index (Map / Reach / Incomplete); D4, D5, D11, D13, D14, D22
- ADR-294 — golden transcripts; D20, D21, D22 (Amendment 1)
- ADR-303 — convergent paths and unwinnable states; D1, D4, D5, D6
- ADR-302 — transcript branches; D6, D17
- ADR-293 — choice points and per-point streams; D15, D16, forcing
- ADR-276 — Chord source-authoritative errors
- ADR-264 — Chord numeric counters
- ADR-263 / ADR-262 — meters and banded scalars
- ADR-258 — IDE Chord authoring environment
- ADR-217 — Chord timer controls
- ADR-131 — automated world explorer
- `branch-stories/fernhill/fernhill.story`, `branch-stories/ides-of-march/ides-of-march.story`

*Not consulted: `docs/unofficial/` (junk mail per `CLAUDE.md`).*
