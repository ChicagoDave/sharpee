# Vocabulary Freeze Review — Phase 3 slice (manner, boundaries, time, threading)

**Status**: FROZEN — David, 2026-08-17: "frozen as proposed - go". All five
decisions in §5 stand as recommended: `define greetings` spelling,
`fresh`/`recent`/`stale`, `again so soon`/`after a while`/`after days`,
`asked once`/`asked again`/`asked many times`, and open `voice` vocabulary.
Every word list here is author-facing compatibility surface the moment the
first story ships on it (the ADR-310/318 discipline). Phase 4's slice
(exchange words, strength markers, initiative rows) is a separate review.
**Written**: 2026-08-17 (session 8e2f49), after surveying `chord.ebnf`, the
parser's create-block character lines, the condition-kind system
(`condition-disjoint.ts`), and the manifest pipeline (world-model
`character-vocabulary` → `repokit manifest` → `character-manifest.ts` →
analyzer gates). New words flow through that same pipeline.

---

## 1. `define manner` (D5) — spelling as sketched in the ADR

```
define manner for Viola Wainright
  when mood is fearful:
    beat "Her hands find the cigarette case."
    beat "She glances at the door before answering."
  when it is breaking:
    voice flat
end manner
```

- Block idiom mirrors `define topics for <name>` (person-kind owners only,
  one block per entity, at least one row — same analyzer gates).
- Conditions are the existing predicate grammar — no new condition syntax.
- **`beat`** — takes prose; rows may carry several; runtime rotates without
  back-to-back repeats.
- **`voice`** — takes ONE word. **Decision needed (§5.5): open vs. closed
  vocabulary.**

## 2. Boundary blocks (D4) — proposed spelling: `define greetings`

The ADR left the spelling open ("`define greetings` or its final spelling").
Proposal — same block idiom again:

```
define greetings for Will Kemp
  first time:
    phrase kemp-sizes-you-up
  on return:
    phrase kemp-nods
  on return, after days:
    phrase kemp-wheres-been
  asked again:
    phrase kemp-persistent
  on leaving:
    phrase kemp-turns-away
```

- Row heads are the platform boundary kinds (first-meeting / return / exit)
  plus optional absence and repetition words. `silence` boundaries are
  runtime behavior (decay), authorable via the same rows later if wanted.
- Alternative spellings considered: `define boundaries` (too abstract),
  `define meetings` (misses exit). `greetings` reads plainly and is the
  ADR's own candidate. Exit rows under a "greetings" block is the one
  wrinkle — flag if it bothers.

## 3. Time words (D6) — the two lists

**Recency** (over the ledger; `when <topic> is fresh`):

| Word | Meaning (runtime owns the curve) |
|---|---|
| `fresh` | learned/witnessed just now |
| `recent` | still current |
| `stale` | faded; no longer top of mind |

Three steps, mirroring the ADR-310 D6 idiom (words in, curves runtime-owned).

**Absence** (at boundaries; composes with `on return`):

| Word | Meaning |
|---|---|
| `again so soon` | same conversational beat — "twice in one evening" |
| `after a while` | hours/scene-scale gap |
| `after days` | day-boundary-scale gap (the theatre story's 3-day clock) |

Three steps. The exact spellings are the freeze decision — `just now` /
`lately` / `after some time` were the ADR's placeholder equivalents.

**Repetition** (D4's asked-once/again/many; composes with topic rows and
greetings rows):

| Word | Meaning |
|---|---|
| `once` | first ask |
| `again` | second |
| `many times` | third and beyond |

Spelled as `asked once` / `asked again` / `asked many times`.

## 4. Threading words (D9) — fixed phrases

- **`when <topic> was discussed`** — per-pair, across scenes, any order.
- **`when the subject changes`** — available to manner rows, response rows,
  and (Phase 4) initiative occasions.

No word list to pick — the freeze decision is the two spellings themselves.

## 5. Decisions for David

1. **`define greetings`** as the boundary-block spelling (§2)?
2. **Recency scale**: `fresh` / `recent` / `stale` (§3)?
3. **Absence words**: `again so soon` / `after a while` / `after days` (§3)?
4. **Repetition**: `asked once` / `asked again` / `asked many times` (§3)?
5. **`voice` vocabulary**: open (any single word, carried as data to the
   renderer — recommended: delivery color is prose-adjacent, and a closed
   list buys no compile check worth its friction) or closed platform list?

## 6. Non-freeze notes (implementation-side, recorded for Phase 3 work)

- New words land in world-model's character vocabulary and flow through
  `repokit manifest` regeneration — never hand-edited into
  `character-manifest.ts` (it is generated).
- Diagnostics follow the existing `parse.*` / `analysis.*` naming idiom;
  ADR references stay in code comments, never in diagnostic text (David's
  standing rule).
- Manner/greeting rows join the condition-disjointness machinery
  (`analysis` exclusivity checks) exactly as topic-row conditions do today.
