# ADR-204: Verb Pluralization — `-se`/`-ze` Stem Heuristic Fix

## Status: ACCEPTED

> Accepted 2026-06-30 by David. **Amends** ADR-199 (Verb Atom & Subject Agreement) —
> refines the `regularPluralVerb` 3rd-singular→base heuristic in the English Assembler.
> Surfaced as a finding during ADR-203 (NPC attribution): the heuristic mis-strips verbs
> whose stem ends in `-se`/`-ze`. Reviewed via `/adr-review` (11/11 READY). At acceptance the
> sibling `-ies` edge (die/lie/tie) was **folded in** (per reviewer).

## Date: 2026-06-30

## Terminology

- **`regularPluralVerb`** — the ADR-199 helper in `english-assembler.ts` that recovers a
  verb's plain/plural form from the 3rd-person-singular `lemma` an author types
  (`{verb:opens door}` → "opens"/"open"). Agreement authority; on the ADR-202 structural
  allowlist (it legitimately uses a regex).
- **`-es` inflection** — English adds `-es` (not `-s`) to a 3sg verb when the stem ends in a
  sibilant that needs it: `ss`, `zz`, `x`, `ch`, `sh` (kiss→kisses, box→boxes, watch→watches).
- **`-se`/`-ze` stem** — a stem ending in a silent-`e` sibilant (use, raise, close, refuse,
  collapse, freeze); 3sg adds only `-s` (use→uses), so the surface ends `-ses`/`-zes`.

## Context

`regularPluralVerb` recovers the plural form by stripping the 3sg suffix:

```ts
if (lemma.endsWith('ies') && lemma.length > 3) return `${lemma.slice(0, -3)}y`; // carries → carry
if (/(?:s|x|z|ch|sh)es$/.test(lemma)) return lemma.slice(0, -2);                // pushes → push, boxes → box
if (lemma.endsWith('s')) return lemma.slice(0, -1);                             // opens → open
return lemma;
```

The second rule strips `-es` for **anything** ending `s/x/z/ch/sh` + `es`. That is correct for
genuine `-es` inflections (kisses→kiss, boxes→box, watches→watch) but **wrong for `-se`/`-ze`
stems**, which only added `-s`: `uses`→"us", `refuses`→"refus", `raises`→"rais",
`closes`→"clos", `collapses`→"collaps", `freezes`→"freez". So a plural/collective subject
renders a truncated verb ("the twins **collaps**").

The bug is currently **latent** in the shipped catalog: the only two live `-se` cases were
dodged during ADR-203 (`npc.unconscious` uses "falls" instead of "collapses"; conversation
`refuse` uses "declines" instead of "refuses"). It bites any future author who writes
`{verb:uses/raises/closes/loses/releases/…}` — a large, common class.

## Decision

Discriminate a **doubled sibilant** (`ss`/`zz`, which truly took `-es`) from a **single
`-se`/`-ze` stem** (which took only `-s`):

```ts
if (lemma.endsWith('ies') && lemma.length > 3) return `${lemma.slice(0, -3)}y`;   // carries → carry
if (/(?:ss|zz|x|ch|sh)es$/.test(lemma)) return lemma.slice(0, -2);                // kisses→kiss, boxes→box, watches→watch
if (lemma.endsWith('s')) return lemma.slice(0, -1);                               // opens→open, uses→use, refuses→refuse
return lemma;
```

`x`/`ch`/`sh` keep the strip-`es` branch (no silent-`e` ambiguity). `ss`/`zz` keep it
(doubled sibilant ⇒ genuine `-es`). A **single** `s`/`z` before `es` now falls through to
strip-`s`, correctly recovering the `-se`/`-ze` stem. `dances`→"dance" is already correct
(`c` was never in the set) and is unaffected.

### The `-ies` sibling edge (folded in)

The `ies`→`y` rule (`carries`→"carry") is the same shape of ambiguity: the common **`-y`
stems** (carry, cry, fly, try, apply, deny, study…) inflect `y`→`ies`, but a small **closed
set of `-ie` stems** (die, lie, tie, vie) just add `-s` and surface identically as `-ies`. The
regex can't separate them, so — symmetric with the single-`s` treatment — the `-y` rule stays,
and the closed `-ie` set goes in `IRREGULAR_VERBS`:

```ts
dies: { plural: 'die' }, lies: { plural: 'lie' }, ties: { plural: 'tie' }, vies: { plural: 'vie' },
```

`conjugateVerb` consults `IRREGULAR_VERBS` before `regularPluralVerb`, so these resolve
correctly without touching the `ies`→`y` rule. Longer `-ie` derivatives (untie, belie) are rare
and add to the table on demand.

### The irreducible ambiguity → `IRREGULAR_VERBS`

`uses` (use+s) and `buses` (bus+es) are **surface-identical** in ending (`-ses`); no rule can
separate them. `-se`/`-ze` verbs (use, raise, close, lose, refuse, pause, release, increase,
choose, freeze…) vastly outnumber single-`s`-stem verbs (focus, bus, gas), so the heuristic
optimizes for the common case. The rare single-`s` stems that regress (`focuses`→"focuse")
are handled by the existing **`IRREGULAR_VERBS` table** — the ADR-199 escape hatch — added
on demand (`focuses: { plural: 'focus' }`). None are in the current catalog.

## Options considered

- **Per-`{verb:}` plural override in the template** — rejected: expands the ADR-199 atom
  syntax for an edge the `IRREGULAR_VERBS` table already covers.
- **Full morphological verb table** — rejected: heavy; ADR-199 is deliberately a heuristic +
  small irregular table. This keeps that shape.
- **Leave latent, keep dodging in templates** — rejected: pushes the trap onto every future
  author and leaves platform wording distorted ("falls" for "collapses").

## Scope

**In:** the `regularPluralVerb` regex change; the `-ie` closed-set additions to
`IRREGULAR_VERBS` (die/lie/tie/vie); verb-agreement tests for `-se`/`-ze` + `-ies` correctness
and `ss`/`zz`/`x`/`ch`/`sh` + `-y` regression; revert the two ADR-203 template dodges
(`npc.unconscious` "falls"→"collapses"; conversation `refuse` "declines"→"refuses"); an
amendment note in ADR-199.

**Atomic ordering:** the two template reverts MUST land in the **same commit** as the regex fix
— reverting "falls"→"collapses" before the fix would render "collaps" transiently.

**Out:** neopronoun/tense work (ADR-199 Out). Longer `-ie` derivatives (untie/belie) and rare
single-`s` stems (focus/bus/gas) are handled by adding to `IRREGULAR_VERBS` on demand — none
are in the catalog today.

## Consequences

- **`-se`/`-ze` verbs agree correctly** for plural/collective subjects: "the twins **use**",
  "they **refuse**", "the crowds **release**".
- **No current-catalog change** — every shipped `{verb:…}` lemma renders identically (the live
  verbs are either already single-`s` strip or genuine `ss`/`ch` cases); verified by grep +
  the regression test.
- **Removes the latent author trap** and lets ADR-203's `falls`/`declines` dodges revert to the
  natural platform wording.
- **Rare single-`s` stems** (focus/bus/gas) now need an `IRREGULAR_VERBS` entry — documented;
  none currently used.
- **ADR-202 clean** — `regularPluralVerb` is on the structural-mandate allowlist; the change is
  a regex refinement in place, no new structure-recovery code elsewhere.

## Acceptance Criteria

1. `-se`/`-ze` stems: `{verb:uses x}`→"use", `refuses`→"refuse", `raises`→"raise",
   `closes`→"close", `collapses`→"collapse", `freezes`→"freeze", `loses`→"lose",
   `chooses`→"choose", `releases`→"release" (plural); singular unchanged.
2. Genuine `-es` stems still strip: `kisses`→"kiss", `misses`→"miss", `passes`→"pass",
   `boxes`→"box", `buzzes`→"buzz", `watches`→"watch", `pushes`→"push", `approaches`→"approach".
3. Unaffected classes unchanged: `opens`→"open", `dances`→"dance", `notices`→"notice",
   `changes`→"change", `carries`→"carry", `cries`→"cry", `flies`→"fly".
3a. `-ie` closed set via `IRREGULAR_VERBS`: `dies`→"die", `lies`→"lie", `ties`→"tie",
   `vies`→"vie" (plural); singular unchanged.
4. A single-`s`-stem verb added to `IRREGULAR_VERBS` (e.g. `focuses: {plural:'focus'}`) renders
   "focus" — proves the escape hatch (add only if a real use appears; otherwise assert the
   documented regression is acknowledged).
5. Regression guard: every `{verb:…}` lemma currently in the lang catalog renders identically
   before/after (grep-enumerated list).
6. ADR-202 structural-mandate test stays green; lang-en-us suite green; the two ADR-203 dodges
   reverted and the friendly-zoo/NPC paths still render correctly.

## Relationships

- **Amends** ADR-199 (Verb atom) — refines `regularPluralVerb`; **uses** its `IRREGULAR_VERBS`
  escape hatch. **Bound by** ADR-202 (structural mandate — helper is allowlisted).
- **Follows from** ADR-203 (surfaced the bug; owns the `falls`/`declines` dodges this reverts).

## Session

Drafted + accepted 2026-06-30 (session `012562`, branch `main`) as the ADR-203 verb-heuristic
follow-up. The `-ies`/die-lie-tie edge was folded into scope at acceptance (reviewer decision).
