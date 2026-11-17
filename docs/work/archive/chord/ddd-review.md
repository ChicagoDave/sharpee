# Chord Language — DDD Review (Smells)

Reviewed 2026-07-11 against: `docs/reference/chord-grammar.md`, `cloak.story`,
`zoo.story`, `packages/chord/src/catalog.ts`, the grammar-changes log, and
design.md. Lens: domain-driven design — is Chord a ubiquitous language for
*story authors*, with clean boundaries, or does platform vocabulary and
platform structure leak through? Evidence is cited from the two shipped
stories; zoo.story is the richer specimen because Phase B made it the first
story big enough to expose the seams.

Verdict up front: the smells are real and they cluster. Most trace to two
roots — **(R1) the §5.4 routing split (stdlib semantics vs story semantics)
is load-bearing in the implementation but invisible in the syntax**, and
**(R2) the condition/event vocabulary is too small for the declarations the
language lets you make**, so authors shadow state and copy-paste rules to
route around the gaps.

---

## 1. Ubiquitous-language fractures

### 1.1 `phrase` is one word with five jobs — and it's rendering jargon

- Statement: `phrase stumble` ("say this now")
- Strategy declaration: `define phrase parrot-chatter, randomly … end phrase`
- Locale-table entry: `define phrases en-US` / `key:` blocks
- Per-entity override: `phrase fed:` inside a `create` block
- Declare-and-emit: `phrase gate-look` + indented prose inside an on-clause

Five surface forms, one keyword. Worse, "phrase" is *our* term — Phrase
Algebra (ADR-192–206) is platform rendering vocabulary. An author's domain
words are "say", "text", "message", "narrate". The language named its most
common operation after the implementation layer that renders it.
Given 7 says one canonical form per concept; `phrase` is one form for five
concepts.

### 1.2 Three verb registers for one domain event

The single domain fact "someone pets an animal" is spelled three ways:

| Site | Spelling | Register |
|---|---|---|
| `define action petting` / `on petting it` | gerund | stdlib action-id vocabulary (`if.action.petting`) |
| `when the player pets anything` | third-person present | event narration |
| `grammar` / `pet :animal` | imperative | player command |

The analyzer literally maintains a morphology table (petting→pets) to stitch
the registers together. The gerund register is stdlib's internal naming
convention leaking into author space. DDD discipline (commands imperative,
events past tense) would give: command `pet`, event `petted` — and neither
register exists in the surface language today. (`emit petted` gets the tense
right, but see §4.2.)

### 1.3 Three naming systems, plus a fourth

- Entities: prose noun phrases with articles — `the bag of animal feed`
- Flags/conditions/scores/phrase keys: kebab identifiers — `feeding-time-active`
- Scheduler/story phrase keys: dotted namespaces — `zoo.pa.closing-3` vs bare
  `stumble` — with no rule for when a key gets dots
- Sequences: bare multi-word names — `define sequence closing time` — the one
  non-entity place multi-word names are allowed

An author writes English on one line and kebab-case on the next. The dotted
convention is pure author discipline; nothing in the language distinguishes
`zoo.pa.closing-3` from `staff-gate-blocked`.

### 1.4 Keyword puns

- `once` means three unrelated things: temporal rule (`once after-hours`),
  text strategy (`define phrase X, once`), scoring dedupe (`award X, once`).
- `set X to Y` vs `change X to Y` — two mutation verbs whose split (field
  assignment vs declared-state transition) is an implementation distinction.
  Meanwhile `set` alone mutates three different stores (§3.2).
- `on` in create blocks: `on the table` = placement, `on reading it` =
  behavior clause, disambiguated by article presence — a documented
  "implementation reading", i.e., a grammar pun we had to write down.
- `define condition` is one head with two semantics — closed truth test vs
  open selection — classified by whether the *body* mentions `it`. A
  declaration's meaning should be visible in its head, not inferred from body
  introspection. (Ratchet entry 2026-07-11; it worked, but it's a smell we
  approved, and it compounds the others.)

---

## 2. The invisible bounded context (R1): §5.4 routing has no surface syntax

This is the deepest structural smell.

`on opening it` (staff gate) and `on feeding it` (feedable trait) are
**syntactically identical and semantically different lifecycles**:

- `on opening it` → the verb has standard stdlib semantics → compiled to an
  ActionInterceptor *around* stdlib's opening action. The body runs
  post-execute; stdlib still does the opening and prints its own message;
  the clause's `phrase` output *appends*.
- `on feeding it` → story-defined dispatch verb → compiled to a
  CapabilityBehavior that IS the action. The body is the whole
  validate/execute/report; its `refuse` lines are the validation; its
  `phrase` output is the primary message.

The author cannot see which one they wrote. Whether `refuse` is even legal,
whether `phrase` replaces or appends, whether the body runs before or after
the mutation — all of it depends on a routing decision the analyzer makes
from a vocabulary table the author never sees. The two bounded contexts
(platform-owned semantics vs story-owned semantics) are real and correctly
separated *in the implementation* — the language just refuses to draw the
line on the page.

Corollary: the hatch kinds expose the same split at the worst spot.
`define action X from` vs `define behavior X from` forces the author to know
whether the platform routes their verb through Action or CapabilityBehavior —
stdlib's internal dichotomy as author-facing vocabulary.

---

## 3. Aggregate and state-ownership smells

### 3.1 The staff gate stores one fact twice (zoo.story:8,26,56,97–117)

The gate is `openable` — the world model owns `isOpen`. The story then
declares `define flag gate-closed starts true` and hand-syncs it:

```
on opening it
  set gate-closed to false
on closing it
  set gate-closed to true
```

…because the blocked-exit condition can only read flags/conditions:
`south is blocked while gate-closed`. The author cannot write
`while the staff gate is closed` — **the catalog has capability adjectives
(`openable`, `lockable`, `switchable`) but not state adjectives (`open`,
`locked`, `on`)**. So the shipped story shadow-copies world state into a
global flag with hand-written synchronization — the exact bug class
aggregates exist to prevent. Two consumers, two sources of truth, and the
sync lives in author code. This is R2 in its purest form: a vocabulary gap
forcing a modeling error.

### 3.1a Owner-confirmed (David, 2026-07-11): global booleans are the smell, not just the shadowing

David's independent read matched §3.1 and went further: `define flag`
itself — global true/false state — is the flaw. All three Zoo flags fail
the same way; each is a disguised member of a state machine the language
gives no home to:

- `gate-closed` — a shadow copy of entity state (§3.1); should not exist.
- `after-hours` — a **story phase** (open → closing → closed), flattened to
  a bit. The closing-time sequence even *narrates* the intermediate states
  (three hours / two / one / closed) while the model records only the final
  flip. Chord has the right machinery at entity scope (`states:` +
  `change` + exhaustive `select on`) and no story-level equivalent.
- `feeding-time-active` — a **recurring period** with a lifecycle and no
  owner: set true from four sequence steps, ended only by feeding the goats
  specifically. Feed the rabbits instead and feeding time never ends. A
  boolean has no shape to hold that invariant against.

The contrast case is in-language: cloak's `dark while the player has the
velvet cloak` is derived state — declarative, flagless, cannot
desynchronize. Flags are what authors reach for when derivation vocabulary
runs out. And a raw flag is strictly worse than the adjacent `states:`
machinery: `change the message to trampled` validates against declared
states; `set after-hours to true` is an unchecked poke at a global from
anywhere. Every boolean flag is a two-value state machine with worse names,
no transition legality, and no owner.

Remedies implied, in order: (1) state adjectives in the condition kit so
derivable facts are derived — kills the `gate-closed` class; (2) a
story-level phase/scene construct with declared states and transitions —
kills `after-hours`, gives `feeding-time-active` a lifecycle. Once both
exist, `define flag` itself is a deprecation candidate: anything still
wanting a raw global boolean is probably an undeclared phase.

### 3.2 One `set`, three state stores

`set gate-closed to false` (global flag), `set fed to true` (trait field on
`it`), `set after-hours to true` (flag, from a sequence). Ownership —
world-global vs entity-aggregate — is invisible at the mutation site. And
`its state` (the `states:` machinery) is a *fourth* store: an undeclared
magic field with its own mutation verb (`change`), while trait fields are
declared under `data`. Two field systems, two mutation verbs, no visible
boundary.

### 3.3 `feeding-time-active` has no lifecycle owner

The feeding-time sequence sets it `true` four times; the only thing that ever
sets it `false` is `when the player feeds the pygmy goats`. "Feeding time" is
a domain *period* with a start and an end; the language can only express it
as a flag flipped from scattered sites. No invariant holds it — feed the
rabbits instead and feeding time never ends.

---

## 4. Commands vs events — the discipline is absent

### 4.1 Interception and reaction are indistinguishable

`on <gerund> it` intercepts a command (may refuse); `when <present>` reacts
to a fact (refusal is a *load error*, not a syntactic impossibility). The
right instinct — commands rejectable, events not — is enforced by a gate
instead of expressed by the grammar. Past-tense event syntax
(`when the player has entered…` / `after the player enters…`) would make the
distinction readable instead of learnable-by-error.

### 4.2 `emit` publishes events nothing in the language can hear

`emit petted`, `emit fed` — write-only plumbing. `when` rules can only bind
the curated event verbs (`EVENT_VERBS = {enters}`), so no Chord construct can
ever consume an emitted event. Half a pub/sub pattern: the language has a
publisher keyword whose only subscribers live outside the language (engine
handlers, transcripts). Either events are a domain concept (then rules should
subscribe to them) or they're infrastructure (then `emit` shouldn't be author
syntax).

### 4.3 `refuse` conflates policy with presentation

A refusal's *reason* is a phrase key: `refuse no-feed`. There is no rejection
identity apart from its text. Four refusal forms in `define action`
(`refuse without`, `refuse when`, `otherwise refuse`, body `refuse`) all
bottom out in "print this and stop". Command handlers should reject with a
*reason* that presentation then renders — here the domain layer speaks in
message keys.

---

## 5. Missing concepts, visible as contortions in zoo.story (R2)

1. **Recurrence with a start offset.** `every N turns` can't say "starting at
   turn 11", so feeding time is a `define sequence` with the same body
   copy-pasted four times (zoo.story:615–630). A declarative language
   reproducing loop-unrolling is the clearest possible "missing abstraction"
   signal.
2. **Room-visit scoring.** Five identical `when the player enters X /
   award visit-X` rules (zoo.story:557–575), plus a taxonomy smuggled into
   score-name prefixes (`visit-*`, `feed-*`, `collect-*`, `after-hours-*`).
   The latent concepts — achievement categories, "score on first visit" —
   have no home, so they live in naming conventions and copy-paste.
3. **`EVENT_VERBS = {enters}` starves the rule layer.** Scoring policy
   consequently lives in three places: when-rules (visits), action bodies
   (`award photograph-animal` inside `define action photographing`), and
   `once` blocks (after-hours). One concern, three homes — you cannot read
   the scoring policy anywhere. And `collect-map` / `collect-pressed-penny`
   are declared but *unawardable* (no `takes` event verb) — already logged in
   zoo-story-gaps.md, but the DDD reading is: the language lets you declare
   identities it gives you no means to connect.
4. **`pettable` enumerates its instances instead of encapsulating variation.**
   `kind: one of goats, rabbits, parrot, snake` + central `select on kind`
   dispatching to `pet-goats`/`pet-rabbits`/`pet-parrot` (zoo.story:369–394).
   The language already has the right pattern — per-entity phrase override
   (`phrase fed:` on the goats does exactly this for feedable) — so the trait
   could be `on petting it / phrase petted` with per-entity `phrase petted:`
   overrides. The `kind` enum is accidental complexity, it centralizes
   variation the entities should own, and it contains a dead member
   (`snake` — no pettable snake exists).
5. **No orphan gate in a closed language.** Declared-and-dead vocabulary
   ships silently: the `victory` phrase (nothing in zoo.story can win),
   `pet-animal` score (never awarded), `presence-*` keys (consumed only by
   the host shell's ADR-195 contributors, which Chord lacks), the `snake`
   enum member. A language whose selling point is load-time gates should
   gate "declared but unreachable" too.

---

## 6. Infrastructure leakage

- `define text gate-status from "./chord-extras.ts"` — a relative TypeScript
  file path, in prose position, in the author language. Everything else in
  Chord names things by domain name; hatches name things by filesystem
  coordinate. The *module* is the infrastructure detail; the author-level
  fact is just "gate-status is provided by code".
- `phrases en-US` blocks nest inside `define trait` and `define action` —
  the translation concern is woven through domain declarations. A translator
  localizing the Zoo must edit trait and action definitions (and create
  blocks, for inline declare-and-emit prose) rather than a text plane.
  ADR-158's whole point was that layer separation; Chord re-tangles it at
  the source level even though the compiled IR keeps them apart.

---

## 7. What's *not* smelly (for contrast)

- `states: intact, trampled, obliterated` + `change … to trampled` +
  `select on its state` — declared value set, explicit transition verb,
  exhaustive dispatch. This is the best-modeled corner of the language.
- Per-entity `phrase fed:` overrides — the correct variation pattern
  (variation lives with the variant).
- The grammar-changes ratchet and the closed catalogs — governance is right;
  the catalogs are just too small (R2).
- Pure-IR/hatch split at the *architecture* level is clean; only its surface
  vocabulary (§2 corollary, §6) leaks.

---

## 8. Summary table

| # | Smell | DDD category | Severity |
|---|---|---|---|
| 2 | §5.4 routing invisible in syntax (`on` = interceptor OR whole action) | bounded context without a boundary | **High** |
| 3.1 | `gate-closed` flag shadows `openable` state, hand-synced | aggregate integrity / two sources of truth | **High** |
| 1.1 | `phrase`: five jobs, rendering jargon as the core author verb | ubiquitous language | **High** |
| 5.1–5.3 | missing recurrence-offset / event verbs → copy-paste rules, scattered scoring | missing domain concepts | **High** |
| 1.2 | petting/pets/pet — three registers for one event | ubiquitous language | Medium |
| 4.1–4.3 | on/when indistinct; write-only `emit`; refuse = message key | command/event discipline | Medium |
| 3.2–3.3 | one `set` over three stores; `set` vs `change`; unowned flag lifecycles | state ownership | Medium |
| 5.4 | `pettable` kind enum centralizes per-entity variation | encapsulation | Medium |
| 6 | file paths + locale blocks inside domain declarations | infrastructure leakage | Medium |
| 1.3–1.4 | kebab/dotted/prose naming; `once`/`on` puns; open-vs-closed condition by body introspection | ubiquitous language | Low–Medium |
| 5.5 | no orphan/reachability gate | completeness | Low |

Roots: **R1** — draw the stdlib-vs-story routing boundary in the surface
syntax (or erase it semantically); **R2** — grow the condition/event
vocabulary (state adjectives, more event verbs, recurrence offsets) before
growing anything else, because every vocabulary gap becomes an author-side
modeling error (flags-as-shadow-state, unrolled sequences, buried awards).

Any syntax change this review motivates goes through the grammar-changes
ratchet as usual — nothing here is a decision.
