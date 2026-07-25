# Session Summary: 2026-07-25 - main

**Goal**: Started as "ADR-265 is completely wrong." Ended as ADR-266, an ACCEPTED umbrella committing Sharpee to Inform-7-style grammar malleability: the standard grammar's Chord form becomes the editable source, not a reference.

**Status**: COMPLETE (design only — no code written, nothing implemented, no files deleted)

**Outcome**: ADR-265 SUPERSEDED. ADR-266 written, widened three times under owner correction, reviewed (15/15 READY), and ACCEPTED as an umbrella with six children reserved (ADR-267–272). Full two-surface syntax detailing written to `docs/work/grammar-parity/`. Accepting the umbrella authorizes no code; each child must be written before its phase begins.

**Files modified**:
- `docs/architecture/adrs/adr-266-grammar-definition-parity.md` (new, ACCEPTED)
- `docs/architecture/adrs/adr-265-standard-library-readable-chord-form.md` (status → SUPERSEDED)
- `docs/work/grammar-parity/sharpee-chord-grammar-syntax.md` (new)

## What was wrong with ADR-265

It answered the wrong question. The ask ("nor do we have the library in readable Chord form",
Nathaniel Lindell, `docs/feedback/intfiction-20260724.txt`) was about **grammar**; ADR-265 rendered
**stdlib action metadata**. Its 56 generated `.story` files put the grammar in a `## Verbs :` comment,
filled the body with message tables, and added a `create the Void` / `create the player` stub so the
file would parse. Worse: `website/src/app/chord/stdlib/reference/content.mdx` already published that
exact payload as web pages — the artifact was redundant as well as misaimed. Replacement is therefore
lossless.

## The five findings that drove the widening

1. **`extendParser` is already at 100%.** Assumed reduced; it is not (ADR-084 removed the narrowing
   wrapper). This relocated the entire parity gap to the Chord side.
2. **The compiler discards what Chord already says.** `the animal must be reachable` parses, analyzes,
   reaches the IR (`chord/src/ir.ts:461`) and is **read by nothing**. The `define action` page claims
   the parser enforces it. → D10/D11.
3. **`define verb` is a Phase A stub.** Hardcoded `KNOWN = { 'put on': 'PUT_ON' }`. The **second
   example on its own published docs page fails to load** — verified by execution: `hang jacket on peg`
   works, `define verb sniff means smell (something)` → `LoadError`. → D13.
4. **No author can modify standard grammar at all.** Shadowing works but redirects to a different
   action id (costing stdlib's behavior); nothing can remove or narrow a rule (`GrammarBuilder` has
   only `clear()`). This is the *first* clause of the original feedback, never previously answered.
5. **A counting error ran through every draft.** Sizing came from *call sites* in `grammar.ts`, not
   registered rules. Measured against a real engine: **422 rules / 56 actions**. Semantic defaults are
   **154 rules, not 2** (and are how `direction`/`position` reach going/hiding — non-negotiable, the
   opposite of the draft's "possibly droppable"); priority affects **106 deviating rules, not 150**
   (316 sit at the default).

## Key decisions (ADR-266)

- **D1 — option (iv)**: the readable Chord grammar *is* the editable source, the I7 Standard Rules
  relationship. Reverses the reference-only stance entirely.
- **D8 — the boundary** (owner's words): *grammar defs (Chord or Sharpee) ↔ Traits/Behaviors
  (Sharpee)*. Grammar definitions are **dual-surface**; traits and behaviors are Sharpee-only.
  Reference is not definition — grammar may filter on a trait, never declare one. This replaced a
  weaker "declaration table, not behavior" framing that had made `.where()` and typed slots look like
  edge cases; under the correct line neither is an edge at all.
- **D12′ — Gap 2 constructs are required, not deferred**, and gate the migration. Seven, resized:
  semantic defaults (154) · direction map (120, must be designed *with* semantic defaults — same
  cross-product) · ordering (106) · alternation (19) · typed slots (15, narrowed to `instrument` +
  `topic`) · optional words (3) · greedy slot. Verb-list shorthand **dropped** — longhand needs no
  language change.
- **D15 — slots are written `the <name>`** (owner ruling). Surfaced that Chord already had *two* slot
  spellings — `define verb` parens vs `define action` colon — plus bare names elsewhere in the block.
  The EBNF change is a *simplification*: two productions converge into one.
- **D14 — umbrella with six children**: ADR-271 (defects, ships first and independently) → 267/268
  (language) → 269 (migration) → 270 (alteration model) → 272 (docs). All 17 acceptance criteria
  allocated to the child that owes them.

## Verified facts worth not re-deriving

- Standard grammar: **422 rules, 56 actions**; priority histogram `{90:37, 95:12, 96:1, 100:316,
  101:1, 105:41, 110:14}`. The 37 rules at 90 are abbreviations — *shorter* than what they outrank, so
  token-count specificity would order them backwards (ADR-268's central problem).
- **17 distinct slot names**: `target` (112), `item` (62), `recipient` (17), `device` (14),
  `container` (10), `door` (8), `portal` (7), `topic` (5), `tool` (4), `weapon` (4), `vehicle` (4),
  `key` (2), `supporter` (2), `hook`, `object`, `location`, `destination`.
- **Slot/entity shadowing** (`analyzer.ts:3149-3193`): slots are scoped per-action (`scope.slots` is
  `null` outside an action/trait clause) — **no external naming conflict**; slots shadow entities
  **single-word only** (`:3155`); the shadow is **silent** (no diagnostic). Pre-existing, not caused
  by D15.

## Next session

1. Write **ADR-271** (compiler pass-through + the three defects). It ships first, is independent of
   (iv), and helps authors today. Its D13 resolution should take the *cheap* route — narrow
   `define verb`'s docs to what works — since ADR-270 makes general aliasing redundant.
2. Then ADR-267 (constructs; slot spelling D15 lands here) and ADR-268 (ordering — run the specificity
   experiment before fixing a design).
3. Owed with ADR-267: the `chord-grammar-changes.md` row and ADR-257 version bump for D15.
4. Deferred deletion: `docs/reference/stdlib-chord/` (56 files) + `scripts/generate-stdlib-chord.js`
   are decided-retired (D2) but **not deleted** — that is an explicit-confirmation step at
   implementation time.

**Stale artifact noted**: `docs/context/project-profile.md` (2026-07-16) says the website is Astro; it
is Next.js. Not touched this session.
