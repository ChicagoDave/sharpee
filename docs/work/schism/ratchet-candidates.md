# Chord grammar — ratchet candidates (from the person/daemon schism work)

Proposed Chord grammar refinements surfaced while decomposing the canonical thief into
generic primitives (ADR-223 / `thief-primitive-decomposition.md`). **Candidates only —
NOT approved and NOT in the ratchet log** (`docs/architecture/chord-grammar-changes.md`,
which is owner-approved entries). They graduate there only on David's explicit sign-off.

---

## RC-1 — bare owner-state conditions  *(David asked to log, 2026-07-15)*

Generalize D2's bare-state condition refs (currently story states) to an entity's **own**
states inside its **own** clauses:

```
on every turn while prowling        # instead of: while it is prowling
on every turn while losing
```

Rationale: in an entity's clause the owner is `it`, so a bare state name is unambiguous —
it can only mean the owner's state. `while it is <state>` stays valid; bare is the tighter
form (Given 7). Applies to trait-declared states (D8) and, if the melee plugin exposes
combat status as bare conditions, to `while winning` / `while losing`. **States only** —
relational/spatial predicates keep their subject (`while it is in the Treasure Room`,
`the player holds it`).

Surfaced: David, reviewing the thief composition — "why not `when prowling`?" Resolution:
drop `it is` (yes), keep `while` (not `when` — `while` = ongoing gate; `when` is reserved
for the momentary/transition sense: D7 statement-suffix, D10 `becomes`, select arms).

---

## Other candidates surfaced the same session (not yet requested for logging)

Captured so they aren't lost; each needs its own sign-off before it's real.

- **RC-2 — elide the repeated `it is` in open conditions.** Keep the first `it` (the
  open-condition marker, E1), drop subsequent copulas:
  `define condition loose-valuable: it is a valuable and not sacred and here`.
- **RC-3 — ratio/percentage probability condition `chance <p>`** alongside
  `one chance in N` (the thief runs on `PROB 30/40/60/70/75/90`; primitive P10). RNG is
  unchanged — only the *expression* of a probability is added.
- **RC-4 — daemon movement verbs** as Chord clauses: `wanders` (with a room-tag filter),
  `patrols <route>`, `pursues <target>`, `flees <target>`, `returns to <room>` (primitives
  P4–P8; the Chord surface of the daemon movement behaviors; FZ-G1 generalized).
- **RC-5 — bulk "all it carries" statement** — `drop everything` / `empty into <room>`
  (primitive P16), since a global `each <condition>` filters the candidate, not "what the
  owner holds".
- **RC-6 — new verb interceptors** `on giving it` / `on throwing it at it`, and a lifecycle
  **`on dying`** hook (primitives P18/P19).
- **RC-7 — item markers** `sacred` (untouchable-by-others) and a `valuable`/scored marker
  (primitives P1/P2; the latter ties to the FZ-G3 scoring model).
- **RC-8 — `conceal` / `reveal` statements** (condition-gated) — `conceal the match` /
  `reveal everything here`, taking an entity out of / back into scope (primitive P22).
  Platform concealment exists (`ConcealmentTrait`, ADR-referenced visibility layer); this
  is the Chord author surface. Canonical use: the guarded treasure room — "the thief
  gestures mysteriously, and the treasures suddenly vanish."

RC-3..RC-7 are the Chord-surface side of ADR-223 children B (daemon primitives) and D
(Chord authoring); RC-1/RC-2 are pure condition-kit ergonomics.
