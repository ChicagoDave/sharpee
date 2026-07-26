# ADR-275: Chord dispatch runtime — entity-less commands and semantic value binding

## Status: ACCEPTED (2026-07-25) — all four open questions resolved via interview same day (Q-1 word-values route (a), Q-2 word equality, Q-3 warn+error shadow rules, Q-4 musts fail closed / refuse-when arms fail open); adr-review 14/14 after two SMALL fixes (module list on D2; unbound refuse-when semantics on D6). **IMPLEMENTED same day (session 2d5bc7)**: dispatch entity-less shape + semantic word bindings (runtime.ts), word-set-validated `is` comparisons (analyzer semanticValues — directions canonicals / means values, richer than the blanket `the match` exemption), Literal-atom verbatim rendering for word params, D5/D6 gates. Tests: entityless-dispatch.test.ts 7/7; D3 fixture `stories/nautical` ship-directions transcript 7/7 through the production CLI; full regression green (chord 581, loader 399, dungeo units 1777 + chain 873).

## Parent: ADR-267 (D12 direction map / acceptance 8 — the owner's ship-directions condition is this ADR's reason to exist). Relates to ADR-090 (capability dispatch), ADR-271 (dispatch grammar emission), ADR-268 (ordering — unaffected), the ADR-266 umbrella (D8 boundary: this is runtime wiring for a grammar construct, not a trait/behavior surface).

## Date: 2026-07-25

## Context

ADR-267 landing group 4 landed the `directions` block: `sail the direction` + a nautical
block emits `sail port`, `sail p`, …, and standalone `port`, `p`, … — each a registered
rule carrying `direction: <canonical>` in `rule.defaultSemantics` (asserted against a real
grammar engine; loader suite green). Acceptance 8 then requires a transcript proving
`sail port` and bare `starboard` **reach the action with the right direction**.

The dispatch runtime cannot serve that today (`runtime.ts` `buildDispatchAction`):

1. **Entity requirement.** Validate hard-requires `context.command.directObject?.entity` —
   no entity means the refusal ladder's `without` arm or the `otherwise` miss. A
   direction-expanded rule has **no entity slot at all**: `sail port` is two literals.
   The command parses, matches the rule, and can never reach the body.
2. **No semantic read.** `ctx.slots` binds slot name → **world entity id** (`animal` → the
   goat). The parsed command's semantics (`direction: 'port'`) are never bound anywhere a
   Chord body, condition, or phrase can see.

Both are runtime wiring for constructs the language already ruled — but the *shape* of the
runtime surface (what `the direction` means in body scope, conditions, and phrase
interpolation) was not ruled by ADR-267 and is owner territory (mini-ADR ruled 2026-07-25
over implement-in-gate).

## Decision (settled parts)

- **D1 — Entity-less dispatch exists.** A `define action` whose matched rule binds no
  entity runs its body without one, instead of dying at the entity gate. The refusal
  ladder still runs: `refuse when <condition>` arms evaluate (with no entity-dependent
  bindings), `refuse without <slot>` arms refuse only when the named slot is an entity
  slot of the matched rule. A body remains required — no body and no claiming behavior is
  still the dispatch miss (§5.4 unchanged for entity commands).
- **D2 — Semantics bind into the evaluation context as WORDS in the slots context (Q-1
  resolved 2026-07-25, route (a)).** The matched rule's semantic values (the `directions`
  canonical, `means` keys) join the body's slots context by name as plain word values —
  `the direction` resolves to `port` exactly as an entity slot resolves to its target;
  `{the direction}` in a phrase renders the word verbatim; `means` keys (`position`) join
  body scope the same way. One reference idiom, no new grammar (`direction` is already a
  declared slot of the pattern; means keys join the analyzer's slot scope). The cost is
  runtime bookkeeping, not language: `ctx.slots` carries words alongside entity ids, and
  every consumer must stay honest about which it holds. Rejected: a distinct word-read
  form (a second reference idiom for one concept — Given 7).
  *Modules (review fix, 2026-07-25):* `runtime.ts` `buildDispatchAction` (second,
  entity-less validate/execute shape; `DispatchContext.command` widens to expose the
  parsed command's `semantics` — the access seam for the matched rule's
  `defaultSemantics`), `evaluator.ts` (word values legal in `ctx.slots`; `is`
  word-equality per D4), chord `analyzer.ts` (semantic keys join the action's slot
  scope; `analysis.semantic-shadows-slot`), and the phrase-param path that renders slot
  interpolations (word bindings render verbatim, never via entity lookup).
- **D3 — The acceptance test is ADR-267 acceptance 8's fixture**, unchanged: a nautical
  sailing action; a transcript proves `sail port` and bare `starboard` reach the body with
  the right direction (direction-dependent output, no RNG).
- **D4 — Conditions and `select` arms compare semantic words by WORD EQUALITY (Q-2
  resolved 2026-07-25).** `refuse when the direction is aft: <key>` and `select on the
  direction` are legal; `is <word>` against a word-valued binding is plain word
  comparison — never entity resolution, never a guess (the `the match` live-comparison
  precedent). This is what makes the acceptance-8 transcript a strong proof:
  direction-dependent refusals/arms, not interpolation alone. Rejected:
  interpolation-only (weak proof, and an arbitrary hole in the condition kit).
- **D5 — Shadow rules extend to semantic keys (Q-3 resolved 2026-07-25): warn on entity
  collisions, ERROR on slot collisions.** Semantic keys live in slot scope, so
  `analysis.slot-shadows-entity` (ADR-267 D2) fires for them exactly as for slots. A
  `means` key that duplicates one of the action's ENTITY slot names is a compile error
  (new gate, `analysis.semantic-shadows-slot`) — the word and the entity id would fight
  for one binding, which is unanswerable and therefore refused, never guessed. The
  `directions` construct's own `direction` key/slot identity is exempt by construction —
  that identity IS the construct. Rejected: silent slot-first (exactly the silence D2
  exists to kill).
- **D6 — `must` lines always evaluate; an unbindable subject REFUSES with its key (Q-4
  resolved 2026-07-25).** On an entity-less command, a `must` whose subject binding is
  absent for this command shape counts as UNMET and refuses with its authored phrase key —
  loud through the author's own message. No gate ever silently evaporates (skip-when-
  unbound rejected as the silent-drop class); no runtime crash for a legitimate
  mixed-shape action (hard-error rejected). A `refuse when` arm whose condition
  references a binding absent on this command shape does NOT fire (the arm gates the
  entity shape; prohibitions fail open where requirements fail closed) — and the
  evaluator's unbound-read throw is reserved for loader bugs, never reachable from an
  author's mixed-shape action (review fix, 2026-07-25).

## Consequences

**Gained (when ACCEPTED + implemented):** ADR-267 acceptance 8 becomes provable; Chord
actions can own commands with no object (`sail port`, `pray`, `sing`) — a class the
dispatch runtime has excluded since Phase B. **Cost:** the dispatch validate/execute path
gains a second (entity-less) shape; the evaluator's slots context carries words as well as
entity ids — every consumer of `ctx.slots` must stay honest about which it holds.

## Session

Session of 2026-07-25 (2d5bc7). Written mid-ADR-267 Phase 4: emission landed and
rule-shape-tested; the runtime gap surfaced rather than silently bridged (dispatch entity
requirement at `runtime.ts` `buildDispatchAction`; `EvalContext.slots` entity-id-only).
Mini-ADR-first ruled by David same session.
