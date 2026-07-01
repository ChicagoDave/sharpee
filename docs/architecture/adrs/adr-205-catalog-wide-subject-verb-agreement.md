# ADR-205: Catalog-Wide Subject-Verb Agreement

## Status: REJECTED

> Rejected 2026-06-30 by David — **evidence-based**. Proposed as the extension of ADR-201 §6 /
> ADR-203 (verb agreement for dialogue + NPC attribution) to the general action catalog. An
> incidence count of real content showed the gap this would fix effectively **does not occur**,
> so the migration is not worth its cost. Recorded here so the recurring "straggler scan → draft
> an agreement ADR" loop is settled, not re-opened. **Handle on-demand** (below) if a story ever
> introduces a plural/collective action subject.

## Date: 2026-06-30

## Context

ADR-201 §6 and ADR-203 migrated **dialogue** and **NPC attribution** off hardcoded verbs to the
ADR-199 `{verb:… subject}` atom. The rest of the action catalog was never migrated: it still
hardcodes the present-tense verb after a `NounPhrase` subject, so a **plural/collective subject
mis-agrees** — "the coins **shatters**", "the guards **blocks** your attack".

A straggler scan of `packages/lang-en-us/src/actions` found **~120 genuine subject-verb
templates** across **~25 files** (of ~157 candidates, minus ~27 prepositions and ~9 modals).
Migrating them would be a **two-axis** change, which is what makes it expensive:

1. **Template axis** — rewrite each `{the X} VERBs` to `{verb:VERBs X}`.
2. **Emit axis** — every emitting stdlib action must pass its subject as a **number-carrying
   `NounPhrase`** (`nounPhraseFor(subject)`); otherwise `{verb:}` silently degrades to singular
   and the template edit is a no-op. `/adr-review` flagged this as the decisive, un-audited gap.

Plus contraction handling (`isn't`/`doesn't` → do-support) and a per-file audit to avoid
mis-tagging prepositions as verbs. And to actually *stop* the recurring rediscovery, a structural
fence (an ADR-202-style CI test banning new hardcoded subject-verbs / non-`NounPhrase` subjects)
would be required on top.

## The evidence (why rejected)

The gap only fires when an action's **subject is plural/collective**. Counting every
plural-marked entity in real content:

| Source | Plural entities | Plural NPCs / action-targets |
|--------|-----------------|------------------------------|
| **dungeo** (flagship Zork port — the large real game) | **0** | 0 |
| **friendly-zoo** | 3 (`goats`, `rabbits`, `parrots`) | 0 — all `.scenery()` |
| tutorials/familyzoo | same 3 (friendly-zoo's origin; duplicates) | 0 |
| platform default entities | 0 | 0 |

- The flagship game has **zero** plural subjects.
- friendly-zoo's three plurals are **`.scenery()`** (non-portable zoo animals) that appear only
  in **room/slot descriptions** — already on the migrated ADR-195/203 slot path, not the
  attacking/throwing/giving/removing catalog templates this ADR targets.
- There are **zero plural NPCs or plural action-targets** anywhere. ADR-203's "triplet acrobats"
  was a **test-only** contrivance.

So a ~120-template + per-action-emit-audit + structural-fence migration would correctly conjugate
a subject-number case that occurs **~0 times in real play**. Cost ≫ benefit.

## Decision

**Do not** perform a catalog-wide subject-verb migration. The dialogue/NPC agreement work
(ADR-201/203) stands — a collective *speaker* ("the twins say") is at least plausible and cheap,
and it is done. Generic action-target agreement is not pursued.

### On-demand fallback (the supported path)

If a real story ever introduces a plural/collective **action subject** (e.g. a portable "coins"
the player can throw, or a plural NPC guard):

1. Migrate **only** the specific templates that entity hits: `{the X} VERBs` → `{verb:VERBs X}`.
2. Ensure the emitting action passes `nounPhraseFor(subject)` (number-carrying) for those params.
3. Add a REAL-PATH test for that entity (mirror `npc-attribution-realpath.test.ts`).

This keeps the fix proportional to actual need. If on-demand cases ever become **frequent**,
revisit this ADR — and at that point do it **once, both axes, plus the structural fence** (never
another one-axis point-fix).

## Consequences

- **No work now**; the ~120 templates keep their hardcoded verbs (correct for singular, which is
  every real subject today).
- **Latent, bounded gap**: a plural action-subject would render a singular verb. Acknowledged and
  accepted; no real content triggers it.
- **The recurring loop is closed**: a future straggler scan lands here and reads "counted, ~0,
  on-demand" instead of re-drafting an agreement ADR.
- **Depends on nothing new.** ADR-204 (the `-se`/`-ie` heuristic fix) already shipped and stands
  on its own merit (it fixes real bugs regardless of this rejection).

## Relationships

- **Would have extended** ADR-201 §6 / ADR-203; **would have used** ADR-199 (Verb) + ADR-204
  (heuristic) and required an ADR-202-style fence. Rejected before implementation.
- **Supersedes** the "hardcoded `says` in `giving.ts`/`reading.ts`" straggler note — folded into
  the on-demand fallback (those are plural-*recipient*/-*item* speech lines; ~0 real incidence).

## Session

Drafted + rejected 2026-06-30 (session `012562`, branch `main`). Reached by asking "are we going
to keep bouncing between breaking and fixing?" and answering it with an incidence count rather
than continuing to draft point-fix ADRs. `/adr-review` (7/12 NEEDS WORK) had already surfaced the
two-axis cost that the evidence then made not worth paying.
