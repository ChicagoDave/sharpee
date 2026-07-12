# The Victory Trigger (Proposal)

**Status**: DRAFT — not reviewed. The backlog item every prior package
deferred to ("the victory *trigger* itself — it consumes these forms",
each-iteration-proposal §2). Written 2026-07-12.

## 1. What exists today

- `win [<phrase-key>]` / `lose [<phrase-key>]` STATEMENTS ship (Phase A):
  cloak wins from `on reading it`. The runtime's triggerEnding sets the
  if-domain ending flag; `isComplete()` reads it. What is missing is a
  **condition-driven host** — an ending that fires when the WORLD reaches
  a shape, not when the player performs a specific action.
- E1/E2 give the condition language: `no stray-treasure` is the designed
  victory test (set-emptiness universal via the no-dual).
- The zoo carries a fully written `victory` phrase nothing can fire; its
  natural trigger is score/confession completeness — which collides with
  Given 5 (no authored counting). Dungeo's is `no stray-treasure`-shaped.

## 2. The design space (one must win — checkpoint 1)

- **A. The every-turn idiom, no new grammar.** An owner writes
  `on every turn while no stray-treasure, once` + `win victory`. Works
  TODAY for entity owners; but victory is story-shaped, and D11 presence
  scoping means an entity-owned trigger only fires with the player on
  stage — wrong semantics for "the world is complete". Rejected as the
  blessed form unless checkpoint 2 adds a story-owned every-turn host.
- **B. `win <phrase-key> when <condition>` as a story-header/top-level
  declaration** (mirror of the sequence `when <owner> becomes <state>`
  anchor, D10): checked at end of turn, broadcast narration (Decision
  10 story-owned), fires once by construction. One new form; the
  condition kit (incl. `no <open-cond>`, story states, `and`) is the
  whole criteria language. RECOMMENDED.
- **C. Score-threshold trigger** (`win victory when the score is
  complete` or `… reaches <n>`): pierces Given 5's counting fence. Only
  worth it if the zoo's badge ending is wanted verbatim; the fence has
  held through four packages. NOT recommended this package — the zoo can
  model completeness as states if it wants an ending (story-level work).

## 3. Sketch (form B)

```
win victory when no stray-treasure and after-hours
lose eaten-by-grue when the player is in the Dark Cave and no lit-lamp
```

- Top-level declaration (story-owned; Given 9 is about *behavior*
  ownership — an ENDING is the story's own fact, like states/scores in
  the header — checkpoint 3).
- Evaluated once per turn after the scheduler pass; first true trigger
  ends the story (multiple declarations legal; document tie order =
  declaration order).
- Never-guess gates: the phrase key must exist; `when` takes the full
  condition kit; an open condition bare in truth position stays gated.
- IR: `{ kind: 'ending', ending: 'victory'|'defeat', phraseKey,
  condition, span }` — wire-type addition, ide-protocol check as usual.

## 4. Interactions

- Decision 10: endings are story-owned → broadcast; no presence gate.
- D5 `, once` unnecessary — an ending ends.
- AC-5: the check draws no RNG; conditions with `one chance in n` inside
  an ending trigger should probably be GATED (checkpoint 4) — a lottery
  ending re-rolled every turn is a trap.
- Platform-touch forecast: chord + story-loader only (the ending flag +
  triggerEnding already ship).

## 5. Verification

- Fixture story: win + lose triggers over `no <open-cond>` incl. the
  empty-set-at-start case (must NOT fire turn 0 if vacuously true at
  load? — checkpoint 5: evaluate from turn 1, or require a state guard?);
  ide-protocol build; grammar doc re-cut; Cloak/Zoo untouched.

## 6. Checkpoints requiring David's decision

1. Form A (idiom only), B (declarative `win/lose … when`, recommended),
   or C (score threshold, pierces Given 5)?
2. If B: is a story-owned `on every turn` host ALSO wanted, or does B
   cover the need?
3. Top-level placement OK for endings (story-owned facts), or must they
   live in the header block?
4. Ban `one chance in n` inside ending conditions (never-guess), or allow?
5. Vacuous-truth-at-load: triggers evaluate from turn 1 as written, or
   require the author to guard with a story state (e.g. `and after-hours`)?
