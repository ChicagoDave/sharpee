# Schism session recap — 2026-07-15

Clean reconstruction of the last session's decisions, drawn only from durable sources: the
committed work summary (`docs/context/session-20260715-1000-chord-foundations.md`), commits
`359e4a25` / `62222c31` / `13045e6f`, and the uncommitted gnome/gap caveat in
`dungeo-completeness-matrix.md`. The raw terminal capture (`schism-context.txt`) was garbled
and has been deleted; nothing durable lived only there.

## What was built (committed)

- **`359e4a25`** — ADR-223 daemon/health model + the **thief decomposed into 22 generic
  primitives (P1–P22)**, plus supporting docs:
  - `thief-mdl-validation.md` — the Chord thief validated against the 1981 MDL.
  - `thief-primitive-decomposition.md` — P1–P22, none thief-specific.
  - `ratchet-candidates.md` — grammar candidates RC-1–RC-8 (NOT approved; awaiting sign-off).
  - `code-examples.md` — four entities (zookeeper/parrot/thief/Ross) in TS + Chord.
- **`62222c31`** — `dungeo-completeness-matrix.md`: a **port-derived** puzzle audit (read the TS
  port `stories/dungeo/src/`), extending the primitive set with P23–P33.
- **`13045e6f`** — folded P23–P33 into ADR-222's seam catalog as DZ-1…DZ-11.

## Decisions from the recalibration discussion (the garbled tail)

Captured durably in the gnome/gap caveat now sitting uncommitted on
`dungeo-completeness-matrix.md`:

1. **Target = one specific corpus.** The canon is the **1981 mainframe Zork MDL** in
   `docs/internal/dungeon-81/` — a single finite corpus. **Not** Zork I/II/III, **not**
   open-ended "IF canon." This makes "complete" a bounded, reachable target.
2. **Gnome = intentional drop.** The gnome logic is David's one deliberate out-of-scope
   exclusion — do not reproduce it, do not count its primitives.
3. **Other divergences = real gaps** to reproduce toward MDL fidelity (framed at the time as
   port shortfalls; see the open question below).
4. **The completeness matrix is a port-derived first pass.** It reads the port, so it can only
   see what the port built. Trust was explicitly calibrated *down*: first-pass optimism
   fractures on contact (the thief's "movement primitives" became 8 primitives + 8 ratchet
   candidates once validated against the real MDL), so every family needs its own thief-style
   validation before it's trustworthy.

## Open question carried forward (unresolved)

The last session assumed the port **under-implements** the MDL, so a canon-grounded audit would
find primitives the port skipped. In this session (2026-07-15, later) David corrected that: **the
dungeo port actually implements most of what a naive MDL read would assume is missing.** So the
"port is far from faithful" premise is itself suspect and must be checked against the actual port
code — not assumed in either direction. Any future primitive-gap work must read **both** the MDL
**and** `stories/dungeo/src/` and only assert a gap when both sides are confirmed.

## State

- Branch `chord-foundations`, pushed through `13045e6f`.
- Uncommitted: the gnome/gap caveat edit on `dungeo-completeness-matrix.md` (records decisions
  1–3 above).
- RC-1–RC-8 ratchet candidates await sign-off before becoming real Chord grammar.
- ADR-223 is DRAFT (open questions unresolved); must not be ACCEPTED until they are.
