# The `each` Package — Quantified Conditions + Iteration (Proposal)

**Status**: DESIGN SETTLED (David, 2026-07-12 — all four checkpoints in §6
answered as proposed: any+no only with the no-dual for universals; `the
match` binder; numeric cardinality fenced out; E3 hosts confirmed).
Amended 2026-07-12 after adr-review (7/11): pipeline/IR contracts pinned
(§3.5), `the match`-outside-`each` negative added, acceptance criteria
added (§7), and the "dormant `any`" claim corrected — **no `any` parse
code survives in parser.ts** (P2 removed it with its host); E1 is a
rebuild against the analyzer's surviving open/closed classification, not
a revival. Awaiting go-ahead for the implementation package, whose
Phase 1 logs E1–E3 in chord-grammar-changes.md and cuts the session plan.
**Sequenced after** the Phase C ownership package by that plan's own
out-of-scope note: "the ownership shape changes where those features would
attach." Ownership shipped 2026-07-12; the attachment points now exist.
**Supersedes where they conflict**: design.md §2.4's `iterate through each
<description> … end iterate` sketch and §3's inline-description quantifiers
predate the open-conditions ratchet entry (David, 2026-07-11 — "I'd extend
define condition"); this package follows the ratchet: quantification and
iteration reference **named open conditions**, never inline descriptions.
The grammar stays closed; the criteria language stays the condition kit.

## 1. What exists today

- `define condition` classifies at analysis: CLOSED (no `it` — a truth
  test) vs OPEN (`it`/`its` — a selection criterion over entities)
  (analyzer.ts `openConditions`).
- A bare open condition in a truth position is an error
  (`analysis.open-condition-truth`), whose fix-it already promises:
  "Use `any <name>` in a selection position."
- `any <condition-name>` is **dormant** — its only implemented host
  (when-rule targets) was removed by the ownership package; the
  closed-condition-selection gate tests retired with it (P2 finding 3).
- `each <condition-name>` was reserved by the same ratchet entry "for
  iterate/cardinality positions when those constructs land." This package
  is those constructs landing.

## 2. Motivating cases (dungeo-conversion + shipped stories)

- **Existence tests**: bank alarm by inventory ("the player holds any
  alarm-trigger"), grue checks, thief-loot checks — `while any <name>`.
- **Set-emptiness victory shapes**: "every treasure is home" — expressible
  as the dual `while no stray-treasure` (see checkpoint 1).
- **Bulk state changes**: the Zoo feeding bell (`change the pygmy goats to
  hungry`, per named entity today) generalizes to `each feedable-animal`
  when a story has more feedables than names.
- **NOT covered, deliberately**: `take all` multi-object commands —
  grammar cardinality, engine-owned (design.md §2.3); the victory
  *trigger* itself (separate backlog item; it consumes these forms).

## 3. Ratchet-entry drafts (for David's approval)

### E1 — `any <open-condition>` as an existential condition
Legal wherever a condition is legal (`while`, statement `when` suffixes,
`refuse when`, `must` predicates via `be`): true iff some entity satisfies
the named open condition. False over the empty set. Never-guess gates:
`any <closed-condition>` is a load error (existing gate class, revived);
a bare open condition in truth position stays an error, its fix-it now
pointing at a live form.

```
define condition alarm-trigger: it is a treasure and the player holds it
…
on entering it while any alarm-trigger
```

### E2 — `no <open-condition>` as the negated existential
True iff no entity satisfies the condition; true over the empty set. Its
own positive spelling rather than `not any` — same one-form-per-polarity
reasoning as D6 (`must` vs barred `refuse when not`). D6's
negated-requirement gate treats `refuse when no <name>: key` as legal
(it is a positive form), but `refuse when not any <name>` stays an error.

```
define condition stray-treasure: it is a treasure and it is not in the trophy case
…
award endgame when no stray-treasure
```

### E3 — `each <open-condition>` iteration block (body position)
A statement block inside `on`/`after` clause bodies, action bodies, trait
clause bodies, and sequence steps (D13 already lets sequences mutate).
Never top-level (Given 9: all behavior is owned — the iteration runs
inside an owner's clause and inherits everything from it: presence gate,
`, once`, RNG staging).

```
after feeding it
  each hungry-neighbor
    change the match to content
  end each
end after
```

- **Binder**: inside the block, the matched entity is **`the match`**
  (design.md §3's binder, kept); `it` continues to mean the clause owner —
  no shadowing, no ambiguity (checkpoint 2).
- **Order**: stable world enumeration order (creation order), pinned in
  the entry — deterministic for transcripts and for any RNG drawn inside
  the block.
- **Empty set**: the block is a no-op.
- **Body**: the normal statement kit (`phrase`/`change`/`move`/`award`/
  `emit`, statement `when` suffixes); `refuse` follows its host (legal in
  `on`, error in `after`, exactly as outside the block). Nesting `each`
  inside `each` is legal; `the match` binds to the innermost.
- Never-guess: `each <closed-condition>` is a load error with an
  open-condition fix-it.

### E4 — explicitly NOT in this package (scope fence)
Numeric cardinality and comparisons (`holds <n> or more <description>`,
`is at least <n>`) stay out: Given 5 keeps counting-as-mechanism out of
the language, no shipping story needs them, and the victory backlog item
is the right place to revisit if a real story does (checkpoint 3).
Inline descriptions (`each reachable item not already held`) stay out —
named conditions only, per the ratchet direction.

### 3.5 Pipeline + IR contracts (adr-review amendment)

- **Steps, landed together (atomic package)**: lexer (no new tokens —
  `any`/`no`/`each`/`match` are words) → parser (condition forms
  `any|no <name>`; statement block `each <name> … end each`; value form
  `the match`) → analyzer (never-guess gates; `the match` scope check;
  open/closed classification reused from `openConditions`) → IR →
  evaluator (existential/negated-existential eval) → runtime (block
  execution). No `any` parse code survives in parser.ts — E1 builds anew.
- **IR additions (wire-type: ide-protocol must build clean)**: condition
  kinds `{ kind: 'any-of', condition: string }` and
  `{ kind: 'none-of', condition: string }`; statement kind
  `{ kind: 'each', condition: string, body: IRStatement[], span }`;
  value kind `{ kind: 'match' }` (parallel to `{ kind: 'it' }`).
- **Enumeration domain**: all world entities, player and rooms included —
  the named condition does the filtering; order = creation order.
- **`the match` scope**: legal only inside an `each` body (any nesting
  depth; binds innermost). Outside one it is a load error
  (`analysis.match-outside-each`), with a fixture + exact-code test.

## 4. Interactions (checked against shipped semantics)

- **Given 5 (no counting)**: `any`/`no` are set-emptiness tests, not
  counts; `each` visits, it does not tally. Nothing here introduces an
  authored counter.
- **Decision 10 (owner-scoped narration)**: iteration adds NO narration
  semantics. Phrases emitted inside `each` are the host clause's phrases;
  the host's presence gate already decided whether the clause runs.
- **AC-5 (RNG determinism)**: fixed iteration order means any
  `one chance in <n>` inside the block draws in a stable sequence.
- **Evaluator**: `any`/`no`/`each` enumerate world entities and evaluate
  the open condition with `it` bound per entity — pure reads over existing
  world queries. Platform-touch forecast: **chord + story-loader only**
  (IR additions are wire-type changes checked via ide-protocol builds);
  zero stdlib/world-model/engine expected.

## 5. Verification

- Analyzer gate fixtures per never-guess rule (any/no/each over closed,
  bare-open-truth message update) with exact-code tests.
- A dedicated fixture story exercising all three forms end-to-end through
  story-loader (loader + runtime tests), including empty-set, order
  determinism, and `the match` vs `it` binding.
- **No story migrations this time**: cloak/zoo don't need these forms —
  both gates must stay green untouched (79/79, 81/81), which is itself the
  no-regression proof.

## 6. Acceptance criteria (done when)

1. Ratchet log carries E1–E3 as Approved with the §7 checkpoint answers.
2. Fixture story exercises `any`, `no`, and `each` end-to-end through
   story-loader: existential true/false, empty-set semantics (any=false,
   no=true, each=no-op), creation-order determinism, `the match` vs `it`
   binding incl. one nested `each`.
3. Analyzer gate fixtures with exact-code tests: `any`/`no`/`each` over a
   closed condition; `the match` outside an `each` body
   (`analysis.match-outside-each`); bare open condition in truth position
   (message updated to name the live forms).
4. ide-protocol builds clean against the IR additions; chord grammar doc
   re-cut for the new productions.
5. All suites green; Cloak 81/81 and Zoo 79/79 **untouched** through the
   rebuilt bundle.

## 6.5 P3 implementation decisions (David, 2026-07-12 — recorded for the
## P5 ratchet reconciliation)

1. **`must be any <name>` parses** (P2 flag resolved). Semantics:
   **membership** — `<subject> must be any <open-cond>: <key>` requires the
   subject to satisfy the named open condition (the condition's `it` bound
   to the subject at evaluation). Surface form: standalone-name rule, same
   as the condition-position quantifiers (`be any old thing` keeps its
   ordinary value parse). IR: `{ kind: 'satisfies', subject, condition }` —
   a dated ADDITION to §3.5's pinned contract (any-of/none-of/each/match),
   to be reconciled in the P5 ratchet pass. `must be no <name>` is a
   negated requirement in disguise → `parse.must-negative` (D6 stance,
   same as `must not`). Evaluation lands in Phase 4 with the quantifiers.
2. **`match` is a reserved declaration name** (P2 flag resolved): an entity
   named or aliased `match`, a trait data field `match`, or a grammar slot
   `:match` is a load error (`analysis.reserved-name`) — the `br`
   reservation precedent. The binder resolves before entity lookup exactly
   as `it` does; multi-word names containing the word stay legal.
3. **P3 detail**: in `is` comparisons with `the match` as subject, the
   state set is statically unknowable (any world entity may match), so the
   analyzer accepts the word as a symbol — same stance as `change the
   match to <state>`; the runtime resolves it against the live match.

## 7. Checkpoints requiring David's decision

1. **Universal quantifier**: ship `any` + `no` only, expressing universals
   as the `no`-dual (`no stray-treasure`) — or add `every <name>` as a
   third form (needs a domain/predicate split the named-condition shape
   doesn't naturally give, and vacuous-truth semantics)?
2. **Binder**: `the match` (proposed — `it` stays the clause owner), or
   `it`-shadowing inside the block?
3. **Scope fence**: confirm numeric cardinality/comparisons stay out
   (revisited by the victory item if ever), per Given 5.
4. **Hosts**: confirm the E3 host list (on/after bodies, action bodies,
   trait clauses, sequence steps; never top-level).
