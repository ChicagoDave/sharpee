# ADR-289: Chord routing is decided once — closing the compiler review's correctness findings

## Status: ACCEPTED (2026-07-29, session eb49e6) — drafted from the Chord review, interviewed (3 questions resolved: D10 open-condition vocabulary, D4 placement unification, D2 counter reset), then adr-reviewed twice: 11/14 with two BLOCKER and one SMALL finding folded plus two cross-ADR seams (ADR-276 census, ADR-275 D6), then 13/14 with the versioning BLOCKER folded on David's ruling (Chord 2.2.0, the fourth recorded departure from D2's letter — breaking gates ship without a major). Accepted at 14/14. **Implementation in progress** (branch `adr-289-p1`); the platform change to `packages/chord` and `packages/story-loader` is approved in principle by this acceptance, and D9's harness is written failing before any fix. **D1 amended 2026-07-29 during implementation** — the pre-mutation snapshot regressed `stories/fernhill` (495/495 → 116 failures); "once" is at the statement's position during the mutations pass, not before the body. See the D1 amendment; Acceptance 7 is unchanged and is satisfied by the amended rule.

## Date: 2026-07-29

## Parent: ADR-228 (the validate/mutations/reports partition this hardens), ADR-276 (compile gate + loader backstop — the two-layer pattern every new gate here follows), ADR-264 (counters — the seeding path D4 extends). Source: the Chord compiler & language review of 2026-07-29 (`docs/work/chord/fable-review.md`), against Chord 2.1.0 / IR `story language 1`. Platform change: `packages/chord`, `packages/story-loader`, and — extended by owner ruling 2026-07-29 — `packages/engine` (the `Story.onWorldRestored?` hook AC4/AC5 require; see the D2 scope extension). Requires David's approval before implementation.

## Context — verified, not assumed

Every finding below was re-checked against the working tree, not taken from
the review. Line numbers are as of this session.

- **`select-strategy` is the one routing construct the snapshot skips.**
  `snapshotDecisions` (`packages/story-loader/src/runtime.ts:1906`) records a
  decision for `select-on` (`:1911`), `each` (`:1924`), and walks the taken
  `ordinal` branch (`:1921`) — but for `select-strategy` it walks the
  alternatives and **stores nothing** (`:1918-1920`). `decideStrategy`
  (`:1959`) reads-and-increments the world-state counter unconditionally
  (`:1974-1975`). Both passes call it (`:1753`). So a `cycling` select inside
  an `on`/`after` clause advances **twice** per firing, and the reports pass
  reads the already-bumped counter: **mutations execute alternative `n`, the
  reports pass narrates alternative `n+1`**. `randomly` draws the seeded
  stream twice, desyncing determinism against single-pass contexts.
  `sticky` is the only strategy that escapes, because it persists its choice
  on first draw (`:1967-1972`).
- **The occurrence key is a line number.** `CHORD_OCCURRENCE_PREFIX +
  \`select.${stmt.span.line}\`` (`:1966`). Spans carry no file dimension and
  `import` splices fragments that keep their own line numbers, so two selects
  on line 40 of two fragments share one counter; a select in a *trait* clause
  shares one counter across every entity composing the trait — unlike phrase
  `Choice` atoms, which key per `(entityId, messageKey)`.
- **Statement `when` suffixes observe post-mutation state.** `whenHolds`
  (`runtime.ts:1598`) evaluates live against `ctx` on each pass. The comment
  above it (`:1594-1597`) claims the passes agree "because the suffix runs
  before either phase's own mutations of this statement" — true for the
  statement's own mutation, false when an *earlier* statement in the same
  body mutates what the suffix reads. `phrase warning when its state is
  armed` followed by `change it to disarmed` emits nothing: the reports pass
  evaluates the suffix after the mutations pass already disarmed it.
- **Refusals outside the leading flat run are dead.** `findRefusal`
  (`:1872`) scans in source order and `break`s at the first non-refusal
  statement (`:1883`); it never descends into `select-on` arms,
  `select-strategy` alternatives, `ordinal` blocks, or `each` bodies. The
  exec passes explicitly skip the refusal kinds (`:1743`). A refusal after a
  `phrase`, or nested in any routing block, compiles clean and never fires.
- **The compile-side gate has matching gaps.** `checkPhaseOrder`
  (`packages/chord/src/analyzer.ts:3045`) counts `set`/`change`/`move`/
  `remove`/`award` as mutations but **not `raise`/`lower`** (`:3048-3054`),
  which the runtime executes in the mutations pass (`runtime.ts:1723`). It
  also threads one `{mutated}` object through every arm of a `select-on`
  (`analyzer.ts:3067`) — arms are mutually exclusive, so a `set` in arm one
  falsely accuses a refusal in arm two.
- **The player is excluded from state and counter seeding.**
  `initializeWorld` pass 2 seeds `chord.state.<id>` from `states[0]` and each
  counter's `starts` (`loader.ts:503-510`) — but only over `built`, which
  excludes the player. `finalizePlayer` (`:638`) applies trait adjectives and
  `starts` states (`:660-661`), carries and wears — never `states[0]`, never
  counters. So `create the player` with `states: fresh, exhausted` compiles
  and loads clean while `the player is fresh` reads false, and a player
  counter reads 0 instead of its `starts`. An explicit `starts fresh` line
  does work; the declaration alone does not.
- **Placement is dropped in both directions, not just the player's.** The
  review reports the player half; the symmetry is this session's finding.
  The parser offers `in`, `on`, and `starts in` to **every** create block
  through one shared placement parser (`parser.ts:1002-1015`) — `starts in`
  is not a player-only form. The loader then splits them by entity kind and
  silently discards the mismatch each way: pass 2 places a non-player entity
  only when `relation !== 'starts-in'` (`loader.ts:416`), so `starts in the
  Kitchen` on an NPC leaves it unplaced; `finalizePlayer` honors only
  `starts-in` (`loader.ts:645-648`), so `in the Kitchen` on the player falls
  back to the first declared room. Neither pairing has an analyzer gate,
  though `analysis.door-placement` and `analysis.region-placement` sit
  immediately alongside (`analyzer.ts:2864`, `:2876`).
- **Two constructs have no duplicate-name gate.** Machines, channels,
  phrasebooks, pronoun sets, counters, assets, scores, and entities all do;
  `define action` writes `this.actionSlots.set(decl.name, slots)`
  (`analyzer.ts:1989`) with no prior check, and `define trait` likewise. A
  second `define action petting` overwrites the first's slot registry, emits
  two IR actions under one id, and registers grammar twice; a second `define
  trait guard` replaces the first's keyed interceptor registration — the
  exact silent mask the `duplicate-clause` gate exists to prevent one level
  down.
- **Exits on non-room entities are ungated.** The exit loop
  (`loader.ts:429-470`) iterates `irEntity.exits` for any entity and calls
  `world.connectRooms` without a room check; the analyzer has no
  counterpart gate, though every comparable host rule (`containing` on
  non-regions, `first time` on non-rooms) has one.
- **Open conditions cannot name a declared state.** `define condition`
  resolves in `TOP_SCOPE` (`analyzer.ts:597`), where `owner` and `ownStates`
  are both null (`:279`). In `resolveIsObject`, `validStates` therefore
  collapses to `[]` (`:4052`), so unless the word is a catalog trait/state
  adjective or an entity name it errors `analysis.unknown-value` (`:4060`).
  Top-level open conditions are precisely what powers `any`, `no`, `each`,
  and `must be any` — as written they can test `open`/`locked`/`lit` but
  never a trait- or entity-declared state.
- **`packages/story-loader/src/runtime.ts` is invisible to grep.** Line 304
  contains two **raw NUL bytes** — `manifestKeys.join('\0')` written as
  literal `0x00` rather than an escape. `file` reports the source as `data`;
  grep and ripgrep treat all 2196 lines as binary and return **no matches**
  for anything in the package's most important runtime file. Verified this
  session: searches for `decideStrategy`, `execStatements`, and
  `select-strategy` all came back empty against a file that contains all
  three.

The through-line: five of these defects (`select-strategy` double-advance,
statement `when` divergence, dead nested refusals, the `raise`/`lower` gap,
the shared `mutated` flag) are consequences of one design property — the
two-pass model resolves *some* routing decisions once and re-derives others
per pass. The snapshot is a per-construct discipline where it needs to be a
structural invariant.

## Decision

### D1 — Every routing decision is resolved once, pre-mutation, into one record

`snapshotDecisions` becomes the single authority over *all* routing, not a
subset. The pre-mutation pass records, keyed by statement identity:

| Construct | Decision recorded | Today |
| --- | --- | --- |
| `select-on` | the decided arm value | snapshotted |
| `each` | the match set | snapshotted |
| `ordinal` | whether the occurrence matched | walked, not recorded |
| `select-strategy` | the chosen alternative index | **not recorded** |
| statement `when` suffix | the condition's truth | **not recorded** |

Both passes read the record; neither re-derives. `decideStrategy` consumes
its counter **exactly once per firing**, at snapshot time — a `randomly`
select draws once, a `cycling` select advances by one.

The snapshot lives in **`packages/story-loader/src/decisions.ts`** — a new
module exporting the decision-record type and the snapshot builder, imported
by `runtime.ts` and consumed by both the interceptor path and the
capability-behavior path. One module, one authority, so the invariant — *the
report pass sees the routing the execute pass took* — holds by construction
rather than by each call site remembering. The `each`-body caveat already recorded at
`runtime.ts:1926-1930` (a `select-on` inside an `each` body decides live,
because the map is keyed by statement identity alone) is the one known
exception and stays documented in place; widening the key to
`(statement, match)` is out of scope here.

The comment at `runtime.ts:1594-1597` is wrong today and is corrected as
part of this: the suffix is snapshotted, so the passes agree because the
truth was pinned, not because of statement ordering.

#### D1 amendment — "once" is at the statement's position, not before the body (2026-07-29, implementation session)

**D1 as written above is wrong about *when* "once" is, and the first
implementation broke a shipped story proving it.** Pinning at snapshot time —
`postValidate`, before anything has run — was tried and regressed
`stories/fernhill` from 495/495 to 567/683 (116 failures). The clause that
exposed it, `fernhill.story:663`:

```
on giving it
  change it to softened when it has the sherry bottle
  award softened, once when it is softened
  phrase kettle-softened when it is softened
```

`when it has the sherry bottle` is true only *after* the standard `giving`
action transfers the bottle, which happens between `postValidate` and
`postExecute`. Pinned at snapshot time it evaluates false and the whole
clause no-ops.

**The apparent conflict with Acceptance 7 is not real.** AC7 wants
`phrase warning when it is armed` followed by `change it to spent` to emit;
fernhill wants `phrase … when it is softened` to fire *because* the line
above it changed the state. Read as a straight-line program these are the
same rule — **each suffix is evaluated at its own position, against the world
as it stands when that line is reached.** "Pre-mutation" is not a global
property to choose; it is positional. The two-pass split is an ADR-228
implementation artifact, and the invariant that actually matters is that the
body behaves as if executed once, top to bottom.

**Amended decision: the mutations pass IS the decision pass.** Every routing
decision is recorded at its own position as the mutations pass walks the
body; the reports pass replays the record and re-derives nothing. There is no
separate pre-walk — `snapshotDecisions` is deleted rather than extended.

This satisfies D1's stated goal (*the report pass sees the routing the
execute pass took*) more literally than the pre-walk did, and it is smaller:

- **The duplicate walker goes away.** `snapshotDecisions`'s walk mirrored
  `execStatements`'s branch logic — two places that had to independently
  agree on which branches are taken. That is the leaky-abstraction failure
  this ADR exists to close, reproduced inside its own fix.
- **Three traversals become two.**
- **The counter advances only when the body runs.** Pinning at validate time
  meant a firing vetoed downstream still advanced the select. "Consumes its
  counter exactly once per firing" now means what it says.
- **Single-pass contexts need no record at all** — one pass cannot disagree
  with itself, so `after` clauses, daemons, sequences and turn clauses simply
  decide live.

The `each`-body caveat survives unchanged and becomes load-bearing: an
`each` body executes once per match, so its statements use a **live** ledger
in *both* passes rather than being recorded per statement identity, which
would otherwise give every iteration the last iteration's answer. Widening
the key to `(statement, match)` remains out of scope.

The `runtime.ts:1594-1597` comment is still corrected, but for a different
reason than the paragraph above states: the passes agree because each
suffix's truth is recorded at its position during the mutations pass, not
because the truth was pinned before the body began.

#### D2 scope note — the id is carried by `select-strategy` only (same amendment)

D2 below says "each select block" and Acceptance 6 says "a select carrying no
id." Implementation narrows both to **`select-strategy`**. The id exists to
name *persisted* state, and `select-on` has none: its arm is derived from a
subject value and lives only in the per-firing decision record. A required IR
field that nothing ever reads is the same disease as a dead refusal — a
construct carried but inert — which D3 makes a compile error one level up.

This is an intent-preserving narrowing, recorded here rather than left to
implementation because the fernhill episode established the rule: a change to
a decision's letter goes on the record, not into quiet code.

#### D2 scope extension — the platform-change set grows to include `packages/engine` (owner ruling, 2026-07-29)

The Parent line names `packages/chord` and `packages/story-loader` as this
ADR's platform-change set. **Acceptance 4 and 5 were never dischargeable
inside it.** Both require the retired-key sweep to run on *restore*; restore
lives in `packages/engine`'s `save-restore-service.ts`, and the `Story`
interface carried no restore-facing hook (`initialize?`, `onEngineReady?`,
`registerChannels?` — verified in source, 2026-07-29).

Approved: an optional **`Story.onWorldRestored?(world)`**, fired by
`loadSaveData`. The engine is the only layer that knows a restore happened; a
story is the only layer that knows what its own persisted keys mean. The hook
joins the two without either reaching into the other, and its name follows the
interface's existing `on*` convention.

Two rejected alternatives, recorded so they are not re-proposed: piggybacking
on the plugin `setStates` restore hook (which exists) invents a plugin whose
purpose is key hygiene; sweeping lazily inside `decideStrategy` behind a
"swept" marker hides a lifecycle fact inside a routing decision. Both put the
knowledge somewhere that does not own it.

Two contract riders, both load-bearing:

- **Fired LAST, not after `loadJSON`.** The restore sequence is world snapshot
  → plugin states → action-RNG reseed → undo-snapshot clearing. A hook fired
  mid-sequence would let the story observe a half-restored engine — the same
  defect class this ADR closes. The contract is *the engine is fully restored
  when this runs*, and it is pinned by a test that fails if the call moves one
  line earlier.
- **Undo does NOT get the hook.** `undo()` also replaces the world via
  `loadJSON`, which will tempt a future symmetry-minded change. It should not:
  undo snapshots are taken from the current session's world, already swept at
  load or restore, and `clearUndoSnapshots()` runs after every restore, so no
  pre-D2 key can enter the undo buffer. Recorded as a comment at the undo site
  so the reasoning does not have to be re-derived.

**The rubric gap this exposes.** Three `adr-review` passes (11/14, 13/14,
14/14) did not catch that two acceptance criteria were undischargeable within
the ADR's own approved scope. That is a mechanically checkable property, and
the harness now checks it: *every acceptance criterion must be dischargeable
within the packages the platform-change line names* — added to the adr-review
rubric so a future ADR meets a BLOCKER instead of an implementing session
meeting a surprise.

#### D2 consequence — positional identity re-keys on source edits

Both the clause key and the statement path are **positional**. Inserting or
reordering a clause on an owner, or a statement inside a clause body,
silently changes the id of every select at or after that point — which resets
its occurrence counter, exactly as the D2 key migration does. This is
inherent to positional identity and is not a defect of the shape; the
alternative (author-declared select names) buys stability at the cost of
making every author name something they never refer to.

D2 already accepts counter resets as survivable, so this is recorded as a
known consequence rather than a blocker. It is written down so it is not
rediscovered as a bug: a story edited between saves may find a `cycling`
select restarting at its first alternative.

### D2 — Select blocks carry a compiler-assigned stable id

The compiler assigns each select block an id in the IR, derived from owner
plus clause plus statement path — not from a span line. The occurrence key
becomes `chord.occurrence.select.<id>`, and a select inside a trait clause
keys per composing entity, matching the `(owner, key)` convention phrase
counters already use. Line numbers stop being load-bearing identity.

**Id shape.** `<owner-id>.<clause-index>.<statement-path>`, e.g.
`chord.occurrence.select.troll.on-attacking.2.0`. The id **never takes the
form of bare digits** — that shape is reserved, because it is exactly the old
line-number key and the sweep below discriminates on it.

**`IR_FORMAT` bumps to `story language 2`.** The id is a required field on
every select statement in the IR, and a loader that keys off it cannot read
an id-less select correctly — which is precisely what the wire-compat gate at
`loader.ts:254` exists to catch. The Chord *language* version does not move
for this (ADR-257 D3: the two travel on different triggers, and an IR-shape
refactor is explicitly not a language bump — `version.ts:13-20`); D10 is what
moves the language version, independently.

**Loader backstop.** A select statement carrying no id inside IR that claims
`story language 2` is rogue IR: the loader throws a `LoadError` naming the
compiler that should have assigned it, per the ADR-276 two-layer pattern. It
does **not** fall back to a line number — a silent return to the colliding
key space is the failure this decision exists to end.

**Old counters reset, and the load sweeps them (Q-3 resolved 2026-07-29,
session eb49e6).** No save-format version is involved and none is bumped.
`SAVE_FORMAT_VERSION` is `'2.0.0'` and restore rejects any mismatch outright
(`packages/engine/src/save-restore-service.ts:47`, `:256`), but occurrence
counters are not part of that format — they are ordinary world state inside
the snapshot (`state-keys.ts`). Renaming a key leaves the format
structurally identical, so bumping the version would falsely reject every
save wholesale, which is strictly worse than the orphans it would avoid.

No migration reader ships, because a faithful one cannot be written. The old
key is `select.<line>` — the exact ambiguity M1 exists to fix, under which
two selects in different fragments shared one counter and a trait-clause
select shared one across every composing entity. There is no sound mapping
from a colliding key space into a non-colliding one: for precisely the saves
where the old bug bit, the migrated value has no correct destination, and a
reader would have to guess which select owns the count. Guessing is what the
language refuses.

So a restored save resumes each select from its first alternative — a
`cycling` select repeats its current alternative once before resuming order.
Stale keys are additionally **swept** rather than left inert in the snapshot:
an orphaned key that still looks like live state is what misleads a debugging
session two years out.

The sweep matches **`/^chord\.occurrence\.select\.\d+$/`** — the old
line-number form exactly, and nothing else. It must not be written as a
`chord.occurrence.select.*` glob: that prefix is also the *new* key space, and
a glob sweep would delete the live counters it was meant to protect. The
reserved bare-digits id shape above is what keeps the two spaces
distinguishable forever.

The sweep runs **on restore as well as on load**. Restored state arrives from
the world snapshot at restore time, so a sweep confined to `initializeWorld`
would never see the keys it exists to remove.

### D3 — A refusal that cannot fire is a compile error

Chord's rule is "never a silent no-op," and a dead refusal is the loudest
possible violation of it. Three changes, one gate:

- `checkPhaseOrder` counts `raise` and `lower` as mutations.
- The `{mutated}` flag is **branched per arm** of a `select-on` and per
  alternative of a `select-strategy` — alternatives cannot co-execute, so
  one arm's mutation must not accuse another arm's refusal.
- A refusal statement anywhere outside the leading validate partition —
  after any non-refusal statement, or nested inside any routing block — is
  an error naming where the refusal must move. Error, not warning: the
  construct does nothing at runtime, and a warning would leave a compiling
  story with a silently absent refusal.

The parser's `after`-clause refusal ban gets the same descent, since
`blockKeyword` is currently replaced when descending into `select`/`ordinal`
and misses nested refusals.

**This does not disturb ADR-275 D6**, whose wording invites the confusion: "a
`refuse when` arm whose condition references a binding absent on this command
shape does NOT fire" is about an **unbound subject binding** on an entity-less
command, not about a `select` arm. D6 governs whether a refusal *evaluates*;
D3 governs where a refusal may be *written*. A `refuse when` in the leading
partition with an unbindable subject still fails open exactly as ADR-275
ruled.

#### D3 note — the code each dead-refusal shape carries (owner ruling, 2026-07-29)

D3 names three changes but no diagnostic code, and Acceptance 8 and 10 cannot
both hold under one: AC8 wants a refusal inside a `select` arm to error, while
AC10 wants that same arm-two refusal **not** to be
`analysis.refusal-after-mutation`. Two codes, ruled by David during
implementation:

- `analysis.refusal-after-mutation` — unchanged, and still the code for the
  straight-line shape AC9 names. `raise`/`lower` joining the mutation set
  widens what reaches it; the message and the remedy stand.
- `analysis.refusal-misplaced` — **new**, for every other dead refusal: after
  a non-refusal statement that is not a mutation (AC8's refusal-after-`phrase`),
  and nested inside any routing block — a `select` arm or alternative, an
  ordinal block, or an `each` body. No mutation is being blamed in either
  shape, and the remedy is to lift the refusal to the top of the clause rather
  than to move it above some particular line.

Rejected: a third code splitting the nested case from the after-a-statement
case. The remedy is the same sentence in both, and D3 asks for one gate.

**Consequence, worth stating because it changes an existing test.** A refusal
written after a mutation *inside the same select arm* is now reported as
misplaced, not as after-mutation — position beats sequence once the refusal is
inside a branch. `packages/chord/tests/ac3-cloak-sweep.test.ts` asserted the
old classification and moves with the rule.

### D4 — The player seeds and places through the same path as every other entity

`states[0]` and per-entity counter `starts` are seeded for the player. The
player block is not a second entity model; the divergence in `finalizePlayer`
is an omission, not a design. Loader-side, not a compile gate: gating would
refuse a declaration the language plainly offers.

**Placement unifies on the same principle (Q-2 resolved 2026-07-29, session
eb49e6).** `in`, `on`, and `starts in` are one placement concept, not two.
`starts` marks the initial value of something mutable — `starts 10` on a
counter, `starts unlocked` on a state — and *every* entity's location is
mutable, since a coin `in the Kitchen` can be carried out of it. So `starts
in` is the emphatic spelling for things the author expects to move, not a
second meaning; the player is the most obvious mover, and a wandering NPC
has the same claim on the word, with no principled line between them.

Both call sites stop testing the relation and place what the author wrote:
pass 2 (`loader.ts:416`) drops its `!== 'starts-in'` condition, and
`finalizePlayer` (`:645-648`) drops its `=== 'starts-in'` condition, keeping
the first-declared-room fallback only for a player with no placement line at
all. This fixes both halves of the drop by **deleting** two special cases
rather than adding two gates — the parser has offered all three relations to
every create block all along (`parser.ts:1002-1015`), and this makes the
loader agree with the grammar it was already given.

No analyzer gate is added for either pairing. The door and region placement
gates stay as they are: those refuse placement *entirely* for kinds whose
location is derived, which is a different rule.

### D5 — Duplicate-declaration gates become one helper

The analyzer implements "name → first span, error on second" seven times,
each slightly differently, and misses two constructs. One
`registerUnique(namespace, name, span, code)` replaces all of them, and
`define action` and `define trait` register through it. The point is not
line count — it is that a table makes the omission of the eighth construct
impossible rather than unnoticed.

#### D5 note — the table's shape, and what stayed out of it (implementation, 2026-07-29)

`registerUnique(namespace, name, span, code)` keeps the signature D5 names.
The *table* is `UNIQUE_NAMESPACES`, a closed union of eleven namespaces, and
one `Map<string, Span>` keyed `<namespace> <name>` behind it. Three
things worth recording:

- **Two new codes**, for the two constructs the hand-rolled gates missed:
  `analysis.duplicate-action` and `analysis.duplicate-trait`. Every
  pre-existing code is unchanged, which is why `code` stays a parameter
  rather than being derived from the namespace.
- **Every duplicate message now cites the first span** — "is already declared
  at line N" — where six of the seven said only "already exists." That was
  `registerPhrasebookName`'s shape, generalized; Acceptance 14 requires it,
  and the other six inherit it for free. No test asserted the old text.
- **The two channel families are two rows**, not one: an ambient bed and an
  image layer may share a name, exactly as the per-family map allowed before.

**Deliberately outside the table: per-entity counters.** `analysis.duplicate-counter`
on an entity block is a different rule — unique *within one owner*, not within
the story — and folding it in would need a scope argument the ADR's signature
does not carry. D5's "seven" counts the story-global gates.

**One behavioural trap, avoided.** The entity gate tested `byId.has(id)` where
`id` is `nameWords.join('-').toLowerCase()`. Keyed on the display form,
`create the Hall` and `create the hall` would have stopped colliding; the call
site lowercases so the gate keeps its old reach.

### D6 — Exits are gated to rooms at compile

`north to the Hall` inside a non-room `create` block is an analyzer error,
with the loader keeping a defensive throw against rogue IR per the ADR-276
two-layer pattern. Blocked and deadly exits ride the same gate.

**ADR-276's census is extended, not invalidated.** Its implementation
addendum records an audited count — all 50 `loader.ts` `LoadError` sites are
backstops (41) or D5 residue (9), no third category. This ADR adds two
backstops: D6's non-room exit and D2's id-less select. Both are backstops in
ADR-276's own sense (a compile gate refuses them first), so the categories
hold and only the count moves. Implementation re-runs the census and updates
ADR-276's addendum in the same commit; leaving a stale "50" is how an audited
claim quietly stops being audited.

#### D6 note — the gate, the backstop, and the census count (implementation, 2026-07-29)

The compile gate is `analysis.exit-non-room`, spanned on the offending line and
keyed off the same derived `kinds` the sibling `analysis.first-time-non-room`
gate uses. All three exit forms ride it, as D6 requires.

The loader backstop is **one** `LoadError` site covering all three forms,
raised before any of them is wired — which is what the census arithmetic
assumes. `loader.ts` therefore goes 50 → 51 here.

**It does not reach 52, and Phase 6 must resolve that before recording a
count.** D2's id-less-select backstop landed in `select-ids.ts:74`, not in
`loader.ts` as this ADR's plan pinned it. Either that throw moves, or
ADR-276's addendum records 51 with `select-ids.ts` named as out-of-census
alongside `evaluator.ts`'s twelve. Acceptance 20 says "re-audited," not
"52" — but the plan's expected arithmetic assumed both new backstops in one
file, and they are not.

### D7 — No raw control bytes in source

`runtime.ts:304`'s literal NULs become `'\u0000'`. The separator's semantics
are unchanged and deliberate — NUL is the right join separator for a key
comparison — but written as an escape the file stays text to every tool that
reads it. This is not cosmetic: it silently blanks the file from every
search, including searches by agents, and it is the reason this review's
runtime findings could not be reproduced by grep on the first attempt.

### D8 — Review disposition: every remaining item ships, defers, or is declined

Shipping with the above, each being a one-site fix in a file already open:
L1 (`recoverToTopLevel` missing `extend`/`remove`), L2 (`lex()` comment
drift on unterminated strings), L5 (inconsistent trait double-add guards in
`applyTraitAdjectives`), L7 (hunger duplicate band ids, `fatal` rung
position), L8 (`registerPresentEntries` gate undefined for a room owner),
and the `Evaluator.isWithin` visited-set guard against a rogue containment
cycle.

Deferred, not declined: L3 (a phrasebook key literally named `phrase`), L4
(`isNegationOf` fused `in`/`im`/`dis` prefixes), L6 (multi-word event ids),
L9 (two Levenshtein implementations). Each is a real defect with a
vanishingly rare trigger; they are worth a follow-up, not this one's test
surface.

Declined: L10 (three files named `index.ts`) is an artifact of the review's
knowledge-base flattening, not a repository problem.

**Design concerns and code-quality nits (review §3 and §5).** The numbered
lows above are only part of the review; its prose sections raise items that
no other decision picks up, and an unrecorded item is indistinguishable from
an overlooked one. Each is dispositioned here so the ADR is a complete
answer to the review.

Shipping:

- **The prose/statement misparse hint (§3.1).** `isStatementLine` separates
  inline phrase prose from statements by lowercase keyword openers, so a
  body paragraph legitimately opening with a lowercase `set`, `clear`,
  `move`, or `at` is read as a statement and errors with "Unknown
  statement…" — a message that describes the parser's confusion rather than
  the author's problem. The diagnostic gains a second line naming the fix:
  if this was prose, capitalize the first word or quote it. This ships
  rather than defers because it is one diagnostic's text, and "every error
  names its fix" is the bar the rest of this language already meets — a
  misparse that cannot say what went wrong is the sharpest edge of an
  otherwise accepted tradeoff. The heuristic itself is unchanged.
- **The version-history table (§3.5).** `version.ts` uses `2.0.0`/`2.1.0`
  twice over — once as the ADR-266 program's interim landing numbers, once
  as the consolidated public numbers — which is honest but reads as a
  contradiction to anyone arriving later. A table mapping landing history to
  public versions goes in the same file. A docs-only edit with no behavior,
  and this ADR itself had to navigate the ambiguity to rule on D10's bump.

Deferred, not declined: the non-null assertions after implicit invariants
(`readLabelKey(c)!`, `line.tokens[colonIndex + 1].span`) and the `as never`
casts on `span: unknown` in the pending-entity-ref plumbing. Both are real
type-safety erosion, both sit in parser internals this ADR does not
otherwise open, and a typed `Span | undefined` is the fix when someone does.

Not in scope, with the structural refactors in Consequences: the table-driven
line dispatcher for `parseCreate`'s ten-way `else if` chain (§3.4), and
folding `parseConfigSettings` and `parseEmitFields` into one
last-token-is-the-value helper (§5).

### D9 — One harness, added first

Before any fix: a golden test that runs **every statement construct**
through an interceptor body — the two-pass path — and asserts the mutations
pass and reports pass agree on routing. This is written failing, against
H1's `cycling` case, and it is the acceptance surface for D1 and D3 alike.
The review's own closing observation is the right one: that single harness
would have caught the double-advance, the `raise`/`lower` gap, and the
`when`-suffix divergence as one class, and it catches the next member of
that class without anyone thinking to look.

### D10 — An unbound subject validates against the union of declared states (Q-1 resolved 2026-07-29, session eb49e6)

`define condition hungry: it is hungry` compiles. A top-level open
condition's `it` validates against **the union of every state declared by
some trait or entity**, not against the empty set `TOP_SCOPE` yields today.

The principle is unchanged — vocabulary stays closed and validated. What
changes is *which closure* the gate consults. For a **bound** subject (`it`
inside a `feedable` trait clause) the closure is that trait's declared
states, and the current rule is correct. For an **unbound** subject the
closure is the union. The gate today is not stricter; it consults the wrong
closure, gets an empty set, and reports a false `analysis.unknown-value`.

This is the ruling the language already made for `the match` — "its state
set is statically unknowable," resolved per candidate at runtime. An open
condition's `it` is the same shape, and under the old rule two constructs
with identical semantics carried different vocabulary rules — the one whose
purpose is quantifying over unknown subjects getting the rule designed for
known ones.

Nothing downstream changes: `symbolHolds`
(`packages/story-loader/src/evaluator.ts:251`) already resolves the state
per candidate entity and returns a clean `false` when that entity does not
hold it. This is an analyzer-gate change only.

A word declared by *nothing* remains an error, and the nearest-match
suggestion now draws from the union — so a misspelled `hungy` is answered
with `hungry`, which the empty-set gate could never do. An open condition
no candidate satisfies is a predicate evaluating false, not a silent
no-op: the "never a silent no-op" rule governs constructs that cannot
fire, not predicates that are simply untrue.

## Acceptance

1. A `cycling` `select-strategy` inside an `on` clause fires alternatives in
   order across successive firings — not every other one — and the text
   narrated is the branch whose mutations ran.
2. A `randomly` select inside a two-pass clause draws the seeded stream once
   per firing; the same seed produces the same sequence in a two-pass and a
   single-pass context.
3. Two selects on the same line number in two imported fragments keep
   independent counters; a select in a trait clause counts per composing
   entity.
4. A save written before D2 restores without error, its selects resume from
   their first alternative, and no bare-digits
   `chord.occurrence.select.<n>` key survives the restore.
   `SAVE_FORMAT_VERSION` is unchanged.
5. A save written **after** D2 round-trips its counters intact — a `cycling`
   select mid-sequence resumes where it left off, proving the sweep did not
   match the new key space.
6. IR claiming `story language 2` with a select carrying no id raises a
   `LoadError` naming the compiler gate; IR claiming `story language 1` is
   rejected by the existing format gate.
7. `phrase warning when its state is armed` followed by `change it to
   disarmed` emits the phrase.
8. A refusal after a `phrase`, and a refusal inside a `select` arm, each
   produce a spanned compile error naming the required position.
9. `raise the innkeeper's suspicion by 1` followed by `refuse when …`
   produces `analysis.refusal-after-mutation`.
10. A refusal in arm two of a `select-on` whose arm one mutates does **not**
    produce that error.
11. A `refuse when` with an unbindable subject on an entity-less command
    still fails open, as ADR-275 D6 rules — D3 does not change it.
12. A player declared `states: fresh, exhausted` reads `fresh`; a player
    counter reads its `starts` value.
13. A player declared `in the Kitchen` starts in the Kitchen, not in the
    first declared room; an NPC declared `starts in the Kitchen` is in the
    Kitchen at load, not unplaced. A player with no placement line still
    falls back to the first declared room.
14. A second `define action petting` and a second `define trait guard` each
    produce a duplicate-name error citing the first span.
15. `north to the Hall` in a non-room `create` block is a compile error.
16. `grep -c decideStrategy packages/story-loader/src/runtime.ts` returns a
    non-zero count.
17. `define condition hungry: it is hungry` compiles when `hungry` is
    declared by any trait or entity, and `any hungry animal` selects only
    the entities currently in that state.
18. `define condition hungy: it is hungy`, with nothing declaring `hungy`,
    still errors — and the suggestion names `hungry`.
19. The D9 harness passes for every statement construct, and fails if D1's
    snapshot is reverted for any one of them.
20. Each D8 item shipped has a test or a re-run census entry proving it
    landed; ADR-276's `loader.ts` `LoadError` census is re-audited and its
    addendum updated to the new count.
21. A phrase body paragraph opening with a lowercase `set`, `clear`, `move`,
    or `at` still errors, and the message names both remedies — capitalize
    or quote.
22. Every item in the review — H1–H4, M1–M7, L1–L10, the §3 design concerns,
    and the §5 nits — appears in this ADR as shipped, deferred, declined, or
    out of scope. None is unrecorded.
23. `CHORD_LANGUAGE_VERSION` reads `2.2.0`, its `version.ts` entry names the
    four breaking gates and records the fourth departure from D2's letter,
    and ADR-257 D2 carries the cross-note. The `chord.ebnf` pin hash is
    unchanged, and `tests/language-version.test.ts` passes.

## Consequences

- **The two-pass model stops being a leaky abstraction.** After D1, adding a
  new routing construct means adding a row to the decision table; forgetting
  to is a harness failure, not a shipped story that narrates the wrong
  branch.
- **D2 changes a persisted key, and old counters are dropped.** Existing
  saves hold `chord.occurrence.select.<line>` entries the new key will not
  read; those selects resume from their first alternative and the stale keys
  are swept on load and restore. No save-format version changes, and no
  migration reader ships — see D2 for why a faithful one cannot exist.
- **`IR_FORMAT` moves to `story language 2`, and the language version moves
  separately.** Two stamps, two triggers, per ADR-257 D3: D2's required
  select id is a wire-shape break (the format), D10's widened gate is an
  additive language feature (the version). Every compiled artifact is
  regenerated by the build, so the format bump costs a rebuild and rejects
  nothing an author holds.
- **Structural refactors are explicitly not in scope.** The review's
  suggestions to split the four monoliths (1,500–3,000 lines each), unify
  the four identity conventions into one `identity.ts`, replace the `Scope`
  object with named builders, and make `parseCreate`'s dispatch table-driven
  are sound and are **not** part of this ADR. D1 and D5 each extract exactly one module, because the fix requires
  it. Splitting `parser.ts` while fixing a routing bug would make the fix
  unreviewable.
- **Chord goes to 2.2.0 — a minor, and the fourth recorded departure from
  D2's letter** (owner ruling, David, 2026-07-29, session eb49e6). D3, D5,
  and D6 stop previously-valid stories from compiling, which D2's letter
  calls a major; the ruling is that breaking changes are acceptable at this
  stage and do not need to be paid for with a major. This follows ADR-276's
  `2.1.0` exactly — an arc of new compile gates, `chord.ebnf` untouched, the
  pin hash standing — and joins `1.1.0`, the `2.0.0` consolidation, and
  `2.1.0` as the fourth departure. D10's widening is an ordinary D2 minor and
  is subsumed. Implementation adds the `2.2.0` entry to `version.ts` naming
  the four breaking gates and recording the departure, and cross-notes it at
  ADR-257 D2 so the exception stays discoverable from the rule.
- **The bump is lockstep, so this pairs with a Sharpee minor** (`tsf
  version`, as `2.0.0`↔`4.0.0` and `2.1.0`↔`4.1.0` did) — Sharpee 4.3.0 from
  the current 4.2.0. Nothing is consumed: ADR-278 keeps the `3.0.0`/`5.0.0`
  pair it earmarks for Relations. Worth recording there anyway that relations
  are additive syntax and therefore a **minor** by D2 — the "anchor feature
  for the next major pair" framing is a choice about timing, not a
  versioning requirement.
- **D4's placement unification changes behavior for stories that compile
  today**, and is the only decision here that does. A player written `in the
  Kitchen` currently starts in the first declared room and will now start in
  the Kitchen; an NPC written `starts in the Kitchen` is currently unplaced
  and will now be in the Kitchen. Both are the author's plain intent, and
  both were silent — no story that placed things the working way is
  affected. Worth a walkthrough-chain run against Dungeo and the zoo
  tutorial to confirm neither leaned on the drop.
- **Nothing here is a grammar change** — no new keywords, no new statement
  forms, and `chord.ebnf`'s pin hash stands. **But three decisions stop
  previously-valid stories from compiling**: D3 (a refusal after a `phrase`
  or nested in a routing block), D5 (a duplicate `define action` or `define
  trait`), and D6 (an exit on a non-room entity) all parse today, compile
  today, and become errors. D2's letter in `version.ts` calls that a
  **major**, and the `1.1.0` note records that "the next construct that stops
  compiling is still a major unless someone rules otherwise again."
  ADR-276 is the governing precedent and the same shape: an arc of new
  compile gates, grammar surface unchanged, shipped as the language minor
  `2.1.0` by owner ruling — the third recorded departure from D2's letter,
  cross-noted at ADR-257 D2 (`version.ts:90-100`). **This ADR follows that
  precedent**; see the version consequence below.
  No shipped story trips the three gates: a scan of all seven `.story` files
  found no duplicate `define action` or `define trait`, and each declares
  exactly one `starts in`.

## Session

Drafted 2026-07-29, session eb49e6, from the Chord compiler & language
review of the same date (`docs/work/chord/fable-review.md`). Every finding
cited above was independently verified against the working tree before being
written down; the review's H1–H4 and M1–M7 all reproduced. The NUL-byte
David cross-checked the ADR against the review's findings and found the
coverage complete on H1–H4, M1–M7, and L1–L10, but caught the
`isStatementLine` prose-hint concern sitting unrecorded rather than
deferred. Checking the rest of that seam turned up four more in the same
state — the table-driven `parseCreate` dispatcher, the version-history
table, the non-null assertions, and the `as never` span casts — none of
which any decision had picked up. D8 was widened from the numbered lows to a
disposition of the whole review, and acceptance item 22 now requires that
completeness rather than assuming it.

A second review pass caught the versioning contradiction: three decisions
(D3, D5, D6) stop previously-valid stories from compiling, which D2's letter
calls a major, while the ADR asserted a minor without invoking the mechanism
that authorizes one. David ruled the minor — breaking changes are acceptable
at this stage — making Chord 2.2.0 the fourth recorded departure from D2's
letter, after ADR-276's `2.1.0` set the precedent two days earlier. A first
pass at recording that ruling mistook it for a ruling on the version number
and wrote a major into the record; corrected before acceptance.

Reviewed the same session (`adr-review`, 11/14). Two BLOCKER findings folded
into D2 — the sweep glob would have deleted the key space it created, and the
IR gained a required field with no word on `IR_FORMAT` or the loader's
backstop — plus a SMALL finding naming D1's shared module. Two cross-ADR
seams the single-ADR pass missed were folded after David confirmed nothing
outside the IDE is in flight: ADR-276's audited `LoadError` census grows by
two (D6), and ADR-275 D6's "refuse when arm" wording is disambiguated against
D3.

Interviewed the same session, three questions resolved in order: the
open-condition vocabulary (folded as D10), placement unification (folded
into D4), and the occurrence-counter reset with a load-time sweep (folded
into D2). The symmetric placement drop recorded in Context — `starts in`
silently discarded on non-player entities — surfaced while preparing Q-2 and
is not in the review.

The NUL-byte
finding (D7) is this session's, not the review's — it surfaced because the
verification greps against `runtime.ts` returned nothing for symbols the
file demonstrably contains.
