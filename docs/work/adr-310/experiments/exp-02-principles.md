# exp-02 — Principles

**Concept under test**: the declarations that feed `duty` — what a character
will not do (refusals) and what they must do (obligations), independent of
mood, disposition, and desire. B1's counterfactual is the definition: remove
the principle and the character complies.

**Scenarios**: B1 (refusal on principle). N1 (thealderman native scene) —
**pending David's pick**; this iteration runs B1 plus a collision mini-trace
that surfaced during drafting.

**The binding problem, stated up front.** A principle like "never betrays a
confidence" only works if the runtime can tell that a given act *is* a
betrayal. Rule 1 (words, never rules) forbids the author wiring that
connection per-act. So every candidate must answer: how does a declarative
principle bind to acts mechanically? The answer that survives drafting:
**principles are drawn from a closed act-category vocabulary the runtime can
detect, and the author marks scope on data, not on acts** — `confided` on a
knowledge line, ownership on objects, kinds and entities as scopes. A
category the model cannot detect cannot be a principle word.

Detectable today or by ADR-310's own machinery: **betray a confidence**
(reveal a topic carrying the `confided` marker), **lie** (assert contrary to
own D14 belief value — valued belief is what makes lying detectable at all),
**harm [scope]**, **steal** (take what's owned), **break a promise** (needs
exp-05's ledger; deferred but reserved). Obligations: **protects [scope]**,
**answers honestly** (dual of lie).

---

## Iteration 1 — run 2026-08-15

Trace scene extends exp-01's: **the Witness** now carries the machinery for
real — `knows the secret, witnessed, confided` — and the refusal must come
from a principle line, not from a hand-waved duty feed. Second mini-scene for
the collision case: a character who never lies but protects someone, asked a
question whose honest answer endangers the protected.

### Candidate A — bare principle lines, verb-first English

```chord
create the Witness
  a person, nervous, slightly honest
  knows the secret, witnessed, confided
  never betrays a confidence
  nature steadfast          -- exp-01: duty over fear
```

And the collision form, using D9's `except`:

```chord
create the Housekeeper
  a person, very loyal, warm
  never lies, except to protect the children
  protects the children
```

`never <category> [scope]` / `<obligation> <scope>` / `, except <scope>`.
One line per principle, no wrapper keyword.

### Candidate B — named codes on the D4 ladder, union with bare lines

```chord
define code servants-code
  never betrays a confidence
  never steals
  protects the household
end code

create the Witness
  a person, nervous, slightly honest
  knows the secret, witnessed, confided
  code servants-code
  never lies to the family      -- bare lines union with the code
```

### Candidate C — personality adjectives imply principle bundles

```chord
create the Witness
  a person, nervous, discreet, slightly honest
  knows the secret, witnessed, confided
```

`discreet` implies never-betrays-a-confidence; `honest` implies never-lies.
The ladder's one-word rung taken literally: the adjective *is* the bundle.

### Traces

**B1 under A (and B — identical at the collision point):**

1. THREATEN → threat ↑, mood → panicked (as exp-01).
2. ASK ABOUT THE SECRET → the reveal act falls in category
   *betray-a-confidence* (the topic is marked `confided`) → duty is live.
   Fear is live (threat). Nature: duty over fear → **refuse**, panicked voice.
3. Counterfactual 1 — delete `never betrays a confidence`: duty never comes
   live; no collision; comply. B1 holds.
4. Counterfactual 2 — delete only `nature steadfast`: duty live at its fixed
   baseline intensity, fear live and *burning hot* (threat + panicked) →
   intensity default → comply under this much pressure, refuse under mild
   pressure (ask without threat → duty is the only live force → refuse).
   **This traced cleanly and reads true**: an ordinary person keeps their
   principles until sufficiently scared; character (exp-01's nature) is what
   makes the principle unconditional. Both traces agreed.

**Collision mini-trace under A:**

1. Player asks the Housekeeper where the children are (context: menace).
   Honest answer violates `protects the children`; lying violates `never
   lies` — two principles, both feeding duty, opposite acts.
2. The `except to protect the children` clause resolves it *locally and in
   words*: the lie is not a violation here. She lies, warmly. Both traces
   agreed.
3. Counterfactual — remove the `except` clause: two live principles, equal
   fixed intensity, no ordering between them (nature orders *forces*, not
   principles). Trace 1 stalled — the model has no answer. This is a genuine
   semantic hole; see finding 5 for the resolution adopted (paralysis
   default), after which the re-trace agreed: she **evades**, through the
   authored evasion outlet, and the author channel flags the unresolved
   collision in testing.

**B1 under C:**

1. Step 2 needs to know whether the Witness holds never-betrays. `discreet`
   says yes. But `slightly honest` — does that hold never-lies at fixed
   principle intensity, or is it a *tendency* (a personality weight that
   bends)? Trace 1 read it as tendency-only; trace 2 read every moral-flavored
   adjective as a bundle. **Divergence — Predictability RED.**
2. Worse, the B1 counterfactual is unrunnable: removing `discreet` to remove
   the principle also removes the personality tendency and its tone — the
   experiment's own control is entangled. Depth YELLOW at best.

### Grades

| Candidate | Scenario | Depth | Cost | Predictability | Legibility |
|---|---|---|---|---|---|
| A | B1 | GREEN | GREEN (1 line + the marker on `knows`) | GREEN | GREEN |
| A | collision | GREEN — `except` resolves in words | GREEN | GREEN (after finding 5) | GREEN |
| B | B1 | GREEN | GREEN (define amortizes across the household) | GREEN | GREEN |
| C | B1 | YELLOW — counterfactual entangled with tone | GREEN (0 lines) | **RED** — traces diverged on which adjectives carry bundles | GREEN |

### Verdict

**A is the atom, B is the ladder rung above it — they compose** (exactly
exp-01's outcome: the line grammar lives inside the `define`, bare lines and
named bundles union). **C is rejected, and its rejection is the finding**:
tendencies are not commitments. A personality adjective is a weight that
bends under intensity; a principle is a line that feeds duty. The same word
must never be both, or B1's counterfactual — the definition of the concept —
becomes untestable. The ladder's one-word rung for the moral layer is a
`code` name, not a personality adjective.

**Findings for the companion ADR:**

1. **Principles are a closed act-category vocabulary + author-marked scope on
   data.** Initial set: betray-a-confidence, lie, harm [scope], steal;
   break-a-promise reserved for exp-05. A category the runtime cannot detect
   cannot be a word. The `confided` marker joins the `knows` line's existing
   comma slot (`witnessed, confided`).
2. **Obligations compile to standing goals.** `protects the children` is not
   an act gate — it *generates* behavior, which is exactly D8's machinery
   with a duty feed. Refusals gate acts; obligations are goals. One new
   surface, zero new runtimes.
3. **Principles burn steady.** Under exp-01's intensity default, a principle
   holds at a strong fixed baseline — kept in calm, breakable under extreme
   pressure. Nature (`duty over fear`) is what makes it unconditional. "A
   principle is a strong habit until character makes it a commitment."
4. **Tendencies are not commitments** (C's rejection, above). Personality
   adjectives never imply principles.
5. **Intra-duty collisions resolve by `except`, or not at all — and "not at
   all" is paralysis.** Nature orders forces, not principles; two unexcepted
   principles in live collision produce **evasion** through the authored
   evasion outlet — dramatically human, fully predictable — plus an
   author-channel warning naming both principles (ADR-294 surface). No hidden
   precedence, no list-order semantics.
6. **`except` is D9's `except`, verbatim** — the one predicate language
   (D11a item 4) gains its fourth-and-fifth use sites, spelled identically.

**Open for iteration 2 / N1**: whether obligation scope accepts kinds
(`protects a guest`) as well as entities; whether `answers honestly` earns a
word or is just the absence of lying; and the N1 native scene once David
picks it — the Witness scene should be re-traced with a real suspect (Catherine
Shelby's `executor-of-will` load is the obvious fit, but that's a story call,
not the experiment's).
