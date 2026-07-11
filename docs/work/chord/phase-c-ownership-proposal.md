# Phase C Proposal — The Ownership Package (Givens 8 + 9)

Status: PROPOSAL for David's review — nothing here is approved grammar until
it gets its own ratchet entries. Anchors: **Given 8** (global true/false
flags are forbidden) and **Given 9** (stickiness — all behaviors belong to
"something"), both adopted 2026-07-11 from the Phase B DDD review
(`docs/work/chord/ddd-review.md`). Decision entries:
`docs/architecture/chord-grammar-changes.md` 2026-07-11.

Shipping rule: **removals land only together with their replacements** — one
coherent grammar change, both stories migrated, gates green, no stranded
story. The package has four legs; they interlock, so they ship as one.

---

## Leg 1: State adjectives in the condition kit

The catalog gains the *state* counterparts of the capability adjectives it
already has:

| Capability (exists) | States (new) | World-model source |
|---|---|---|
| `openable` | `open`, `closed` | OpenableTrait.isOpen |
| `lockable` | `locked`, `unlocked` | LockableTrait.isLocked |
| `switchable` | `on`, `off` | SwitchableTrait.isOn |
| `wearable` | `worn` | worn relation |
| `light-source` / `dark` | `lit` | derived light (already partially exists as `dark`) |

Usage: `while the staff gate is closed`, `if the flashlight is on then`.
Same closed-catalog governance; growing the set stays a ratchet entry.
This alone deletes the `gate-closed` shadow-flag class: derivable facts are
derived, never copied.

## Leg 2: The story object

The `story` header block becomes a real object — the sanctioned "cheat"
home for genuinely story-scoped state and behavior:

```
story "Friendly Zoo" by "Sharpee Team"
  id: friendly-zoo
  version: 0.0.1
  states: open, after-hours
```

- `states:` on the story declares the story's phases — same machinery,
  validation, and `select on` exhaustiveness as entity states.
- `change the story to after-hours` is the transition statement; an
  undeclared state is a load error (never-guess).
- Bare state names remain valid condition refs (`while after-hours`
  resolves to "the story is in state after-hours") — **existing zoo.story
  conditions keep their exact spelling**.
- Schedules (`define sequence`, `every`) are story behavior. Proposal:
  they keep their surface form but are *semantically* story-owned (they
  may only `change the story`, `phrase`, `move`, `award` — they have no
  `it`). Alternative (stronger stickiness): sequences nest inside the
  story block. RECOMMEND the first — the story block staying small keeps
  the header readable, and ownership is already unambiguous since
  sequences bind no entity.
- `define condition`, `define verb`, endings, locale defaults: story-owned
  by definition; no surface change.

## Leg 3: Entity-attached rules (floating rules deleted)

Top-level `when` is removed. Its two uses migrate:

1. **Movement reactions** → on-clause on the room:
   `when the player enters the Aviary … end when` becomes, on the Aviary:
   ```
   on entering it
     award visit-aviary
   end on
   ```
2. **`once <cond>` vignettes** → `once` becomes a clause *modifier* on the
   owner entity (the goats, the parrot, the snake), joining `while`:
   ```
   on every turn while after-hours and the player can see it, once
     phrase after-hours.parrot
   end on
   ```
   (`first time` ordinal blocks already exist inside bodies; `, once` on
   the clause header is the same concept at clause scope — one ratchet
   question: keep both or collapse.)

Notes:
- `while <cond>` on on-clause headers generalizes (already exists for
  every-turn clauses; extends to event clauses: `on entering it while
  in-darkness` — this is cloak's stumble rule, stuck to the Foyer Bar).
- The analyzer's when-verb morphology table (pets→petting) shrinks: event
  clauses use the same gerund register as all other on-clauses. One
  register fewer (DDD review §1.2).
- `any <open-condition>` targets survive as trait-attached or
  story-attached clauses — the open-condition selection (ratchet
  2026-07-11) is unaffected; only its floating host is replaced.

## Leg 4: `define flag` removed (Given 8)

With legs 1–3 in place, each Zoo flag has a proper home, and `define flag`,
`set <flag> to …`, and bare-flag condition refs leave the grammar:

| Flag today | Becomes |
|---|---|
| `gate-closed` | *(deleted)* — exits read `while the staff gate is closed` (leg 1); the two sync on-clauses on the gate are deleted |
| `after-hours` | story state (leg 2); `change the story to after-hours` in the closing sequence; every `while after-hours` condition unchanged in spelling |
| `feeding-time-active` | state on the owner: `states: content, hungry` on the pygmy goats (or the Petting Zoo). The schedule does `change the pygmy goats to hungry`; feeding does `change … to content`; `restless` bleating reads `while it is hungry`. The lifecycle bug (feed the rabbits, feeding time never ends) becomes impossible to write |

**Decision 5 (David, 2026-07-11): the `flag` field type leaves trait data
too — booleans are gone at every scope.** Replacement: **trait-declared
states** — a `states[, reversible]:` line inside `define trait`; every
composer gets the state set, and the trait body may reference it
(`if it is content then refuse already-fed`). Case study, feedable:
`fed: flag` was the `hungry`/`content` machine in disguise (the already-fed
message literally says "contentedly full"), it duplicated the fact
`feeding-time-active` also shadowed, and it stored the *wrong* fact —
one-shot feeding under a recurring feeding-time schedule. The state version
unifies all four consumers (schedule sets hungry, feeding sets content and
refuses when content, restless bleats while hungry) and makes feeding
recurrent, which is what the PA announcements promised. Mutation placement
rule reaffirmed: the transition (`change it to content`) lives in the trait
behavior beside the refusal that depends on it, not in a reaction clause.
Starting state = first declared value (`hungry, content` → starts hungry,
feedable before the first bell, matching current behavior).

---

## Migration proof obligations

- `cloak.story`: one floating rule (stumble) → on-clause on the Foyer Bar
  with `while in-darkness` + existing ordinal blocks. No flags to remove.
  Cloak gate 81/81 must stay green through the rewrite.
- `zoo.story`: 5 visit rules → room on-clauses; 2 feed rules → merge into
  the feedable clause sites or goat/rabbit on-clauses; 2 Aviary-mood rules →
  parrot/Aviary clauses; 4 once-vignettes → entity clauses with `, once`;
  3 flags per the table above. Zoo gate (7 files / 61 assertions) must stay
  green; the 4 excluded files stay excluded (their features are separate
  Phase C backlog).
- Grammar doc, design.md §2/§3 examples, and the two books re-cut after the
  grammar lands (book repoint is a release-time task, per the v2 release
  strategy).

## Owner decisions (David, 2026-07-11 — checkpoint answers)

1. **Reaction vs interception: two keywords.** `on <verb> it` intercepts —
   may refuse; its text is the primary message. `after <verb> it` reacts —
   `refuse` is syntactically illegal there; its text appends. The §5.4
   routing boundary is drawn on the page. Migration note: today's zoo
   clauses re-sort — `on opening it` (gate flag sync) *deletes* under leg 4;
   `on examining it` overrides (parrot-look, gate-look) stay `on`;
   visit-award movement clauses arrive as `after entering it` (reactions,
   the old when-rules). Trait behavior clauses for dispatch verbs
   (`on feeding it`) stay `on` — they ARE the action.
2. **State back-transitions must be a defined capability.** Not free, not
   forbidden: the state set must *declare* that it reverses. Default stays
   given-5 forward-march (`states: intact, trampled, obliterated` — a
   `change` backward is a load error). A declared-reversible set permits it.
   Proposed surface (single-word modifier per the given-7 adverb meta-rule,
   word choice needs sign-off): `states, reversible: content, hungry`.
3. **Scores live on the earning owner.** `worth N` declarations sit on the
   room/trait/story object whose clause awards them; the owner provides the
   namespace (the `visit-*` prefix taxonomy dies). Max-score remains the
   load-time sum over all owners; the score command's reporting is
   unaffected (identities just gain owners).
4. **Both `once` forms stay.** `, once` gates a whole clause; `first time`
   branches within a firing clause's body. Different scopes, both canonical
   at their scope — no given-7 violation.

6. **Requirements are `must` — single closed form (David, 2026-07-11:
   "Single closed").** The scope-constraint line generalizes to a
   requirement form, usable as a define-action line and as a behavior-body
   statement: `<subject> must <predicate>: <phrase-key>` — e.g.
   `the player must hold the disposable camera: no-camera`,
   `the actor must have its food: no-feed`. Refusal splits into two honest
   concepts: **requirements** (positive preconditions, `must`) and
   **prohibitions** (positive hazard conditions, `refuse when`). The
   loophole is gated shut per given 7: `refuse when` with a top-level
   `not` is a load-time error with a fix-it pointing at the `must` form
   ("state requirements positively") — one canonical form per polarity.
   `refuse without <slot>` (parse cardinality) and `otherwise refuse`
   (dispatch miss) are unaffected. Kills the polarity-inversion smell:
   authors think in requirements; `not (…)` in a refusal was a requirement
   wearing a disguise.

7. **`if` is dropped from the language (David, 2026-07-11: "If can be
   dropped").** Given 4 amended. Every use decomposes: validation guards →
   `must` requirements (`it must be hungry: already-fed` — decision 6
   applied reflexively; the state-guard "if content refuse" was a
   requirement in the other disguise); moment conditionals → statement
   `when` suffix (`award farewell when the player can see it`); value
   branching → `select` (unchanged). Evidence the loss is theoretical:
   after decision 6, the entire Zoo sketch had exactly one `if` left
   (the zookeeper's conditional award) and Cloak never had any. Ratchet
   note: the freed `when` keyword (floating when-rules died in leg 3) is
   reused as the statement suffix; the select-arm `when <value>` homonym
   is positionally distinct but gets called out in the final entry.
8. **`change` stays, gated against boolean cheating (David, 2026-07-11;
   clarified same day: "catch any author trying to implement pos/neg
   states and encourage them to use real states").** `change` is the
   single visible mutation for state transitions and is legal only
   against declared named states. The boolean gate is **pattern
   detection over the state set, not a reserved-word list** — three
   rings, all load-time:
   - `analysis.boolean-state` (error): literal boolean names —
     `true`/`false`, bare `yes`/`no`. Flat refusal, no cheating.
   - `analysis.shadow-state` (error): a declared set that reproduces a
     platform-owned state pair — `open`/`closed`, `locked`/`unlocked`,
     `on`/`off`, `lit`/`unlit`, `worn`/`unworn`. Fix-it: compose the
     owning trait (`openable`, `lockable`, `switchable`, …) — the
     platform already runs that state machine; leg 1's state adjectives
     read it.
   - `analysis.negated-state` (error, encouraging fix-it): a set where
     one name is a **negation of another** — `not-X`, `un-X`, `non-X`,
     `no-X`, `X-less`, or shared-stem prefix negation (`fed`/`unfed`,
     `active`/`inactive`). Diagnostic teaches the principle: *a state
     names what the thing IS, never the absence of another state.*
     Example message: "`unfed` names the absence of `fed`, not a
     condition of the goats. Name what they are when not fed —
     feedable's answer was `hungry`/`content`." The unfound positive
     name is where the domain insight lives — exactly how `fed: flag`
     became `hungry`/`content`.
   Two-value sets with domain-meaningful names are the intended form
   (`hungry`/`content` is a state machine; `fed`/`unfed` is a flag in
   costume). Rationale for keeping `change`: silent state changes are
   bugs — the body's one mutation line is what the behavior *does*; the
   transition-table alternative (transitions declared on `states:`) was
   considered and set aside for splitting one behavior across two homes.
   Side effect noted for the final ratchet: body-level `set` shrinks to
   non-state trait fields (entity/number/name) — with flags gone at every
   scope, `set X to true/false` no longer parses anywhere.

Final ratchet entries for the package (including the exact `reversible`
word, the `after` keyword, and the freed-`when` statement suffix) land
with implementation, per the removals-with-replacements shipping rule.

## Migration sketch: `zoo-phase-c-sketch.story`

The full Zoo rewritten under this package lives beside this doc
(`docs/work/chord/zoo-phase-c-sketch.story`) — a review artifact; it does
not compile under Phase B grammar, and the shipping `stories/friendly-zoo/
zoo.story` is untouched. What to look at, by category:

**Package-required changes (legs 1–4 + owner decisions):**
- Header: `states: open, after-hours`; closing sequence ends with
  `change the story to after-hours`. All `while after-hours` /
  `while not after-hours` conditions kept their exact spelling.
- All three `define flag` lines gone. `gate-closed` and its two sync
  clauses are simply *deleted* — blocked exits now read
  `while the staff gate is closed`. `feeding-time-active` AND feedable's
  `fed: flag` field (decision 5) collapsed into one trait-declared state
  set: `states, reversible: hungry, content` on the feedable trait. The
  feeding sequence does `change the pygmy goats to hungry`; the trait
  behavior refuses `if it is content` and does `change it to content`;
  `restless` bleats `while it is hungry`. Rabbits get the states for free
  by composing feedable. Zero booleans remain in the story.
- All 9 floating `when` rules and all 4 `once` blocks gone. Visit awards
  are `after entering it` on rooms; Aviary mood lines are `after entering
  it while …` on the Aviary; the four vignettes are `on every turn while
  after-hours …, once` clauses on the zookeeper, goats, rabbits, parrot,
  and snake.
- `on` vs `after` split per decision 1: overrides/interceptions stay `on`
  (examining, reading, the dispatch-verb trait clauses); reactions are
  `after` (entering awards, feeding awards, taking the map).
- Scores moved to their earning owners per decision 3. The prefix taxonomy
  died: five rooms each declare `score visit worth 5`; goats *and* rabbits
  each declare `score fed worth 10` (same short name, different owner —
  the namespacing proof); photographing owns `score snapshot worth 5`.
- Global-phrase orphans re-homed: `presence-*` → per-entity
  `phrase presence:`; `goats-bleating` → the restless trait; plaque and
  warning-sign texts inlined at their reading clauses; parrot mood lines
  inlined at the Aviary clauses. The story-level table keeps only genuinely
  shared/story text (`staff-gate-blocked`, `victory`).

**Newly possible under the package (were gaps in Phase B):**
- `collect-map` is awardable at last: `after taking it / award collected`
  on the map. Entity-attached reactions make the tiny `EVENT_VERBS` set
  moot for entity-targeted actions — event-verb growth is only needed for
  what `after entering it` doesn't cover.

**Review-recommended cleanups included (legal today, not package-gated):**
- `pettable`'s `kind` enum + central `select on` deleted — the trait is now
  `on petting it / phrase petted` with per-entity `phrase petted:`
  overrides (the pattern feedable already used). The dead `snake` enum
  member is gone.
- `create the snake` — stickiness forced an owner for the nocturnal
  vignette, surfacing the unmodeled entity the dead enum member and the
  disembodied voice both pointed at.

**Remaining gaps (unchanged by this package, still Phase C backlog):**
- No victory trigger — `victory` text still has no `win` path (needs a
  score-total or checklist condition; interacts with given 5's no-counting
  rule). `collect-pressed-penny` dropped: the press mechanics were never
  transcribed. Sketch max score: 85.
- Strategy phrases (`parrot-chatter`, `parrot-candor`) stay top-level
  `define phrase` — arguably they belong to the chatty/candid traits, but
  trait phrase blocks don't carry strategy modifiers yet; ownership of
  strategy phrases is an open ratchet question.
- Recurrence-with-offset still missing: the feeding sequence remains four
  copy-pasted steps (`every 8 turns starting at turn 11` is separate
  backlog).

## Explicitly out of scope for this package

The Phase B gate exclusions (initialDescription, ADR-209 snippets, ADR-195
slot contributors), event-verb growth beyond what leg 3 needs, `each
<condition>` iteration, and quantifier/comparison conditions — separate
Phase C backlog items, sequenced after the ownership package because the
ownership shape changes where those features attach.
