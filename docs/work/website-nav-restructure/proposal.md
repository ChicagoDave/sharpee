# Website nav restructure — proposal (for review, 2026-07-21, session eb743f)

**Status**: EXECUTED (David, 2026-07-21, session eb743f) — D1 **Retire + fold**, D2 **Vocabulary & text §5.12**, D3 **Full promote (the AFTER tree)**. Website `next build` clean.

## Executed (2026-07-21)
- **nav.ts**: Chord section regrouped — `Getting started` · `The world` · `Behavior` · `Flow & progression` · `Vocabulary & text` (+ 5.12) · `Project & files` (Reading a .story file + Multi-file stories + Tooling) · `Cookbook` · `Standard library` · `Reference`. `Language` and the `Author guide` mega-group removed.
- **New page** `/chord/guide/project/multi-file-stories` (ADR-251) — import/paste model, `.chord`-assumed, fragment rules, D6 diagnostics table.
- **New page** `/chord/guide/vocabulary/comments` (§5.12, ADR-249) — `##` blank-delimited, no-inside-block, no-EOL. Added to the vocabulary landing list.
- **Stale fix**: `define-phrasebook` page + title `import phrasebook "…story"` → `import "…"`, cross-linked to the new multi-file page.
- **Language retired**: `src/app/chord/language/{people,doors-and-regions,topics}` removed (each topic keeps its dedicated guide/stdlib entry — no content lost); permanent redirects added in `next.config.ts` (people→world/people, doors-and-regions→world/doors, topics→behavior/topic-tables); inbound `compose-and-run` link repointed.
- **Build**: `next build` compiled clean; new routes present, `/chord/language/*` gone, no errors.

## Not done (flagged, optional follow-ups)
- `docs/reference/chord-language.md` describes generalized `import` *inside* §5.11 (phrasebooks) rather than as its own section — accurate but oddly placed now that import is general. A dedicated reference section is a small optional follow-up.
- The retired Language people page's concise inline NPC-roles example (`patrol with route […]`) now lives only in the stdlib plugins/traits pages — covered, but no longer has a one-line guide example.
**Governing IA**: ADR-244 (minimal-scroll pages, one nav model in `website/src/lib/nav.ts`, sticky accordion rail). This proposal changes **grouping/labels only** — no page splits, no URL/file moves — so it stays in-compliance and carries zero route churn.
**Trigger**: surface ADR-249 (`##` comments), ADR-250 (phrasebook `use`/`import` forms), ADR-251 (generalized `import` / multi-file stories); "a lot going on" in the nav.

## Audit — the four smells

1. **A redundant parallel track.** The `Language` group (`/chord/language/people`, `/doors-and-regions`, `/topics`) covers the *same* material the numbered Author guide already carries — `guide/world/people` (2.14), `guide/world/doors` (2.12) + `regions` (2.13), `guide/behavior/topic-tables` (3.9). Two tracks, one audience, no signposted difference between them.
2. **No home for two shipped constructs.** `##` comments (ADR-249) and `import "<file>"` / multi-file stories (ADR-251) have nowhere in the nav. Vocabulary §5 is "`define …`" constructs; neither comments nor `import` is a `define`.
3. **One mega-group.** `Author guide` is a single group holding ~45 pages across five chapters (world 14, behavior 9, flow 8, vocabulary 11, tooling 3). The accordion keeps it *usable*, but every guide reader opens the same giant group.
4. **Stale content.** The `define-phrasebook` page still teaches `import phrasebook "voices/winter.story"` — superseded by ADR-251's bare `import "voices/winter"` + `.chord`.

## Proposed structure (Chord section)

Promote the guide's five chapters to **top-level groups** (the accordion collapses all but the active one, so more groups = *less* crowding, not more), fold the `Language` overlap in, and add one **Project & files** group as the home for the new constructs.

```
BEFORE (Chord)                          AFTER (Chord)
─────────────────                       ─────────────────
Getting started                         Getting started
Language            ← redundant         The world          (was guide/world; + people/doors/regions landing)
Author guide  ┐                         Behavior           (was guide/behavior)
  world       │  ← one mega-group       Flow & progression (was guide/flow)
  behavior    │                         Vocabulary & text  (was guide/vocabulary; + §5.12 comments)
  flow        │                         Project & files    (NEW: multi-file import, the .story/.chord model,
  vocabulary  │                                             + Tooling: compose / diagnostics / migrating)
  tooling     ┘                         Cookbook
Cookbook                                Standard library
Standard library                        Reference
Reference
```

- **`Language` group retired.** Its three pages are the smell in #1. Decision D1 below rules their disposition — my recommendation folds their unique overview prose into the matching group landings and redirects the three URLs, removing the duplicate track without losing content.
- **`Project & files` (new group).** Homes ADR-251: a new **"Multi-file stories"** page (`import "<file>"`, the `.story` main file vs `.chord` fragments, splice-in-place, the flat rule, diagnostics) plus the existing **Tooling** pages (compose / reading diagnostics / migrating), which are also "how a project is built." Import naturally sits beside tooling.
- **`##` comments (new page).** Recommendation: `/chord/guide/vocabulary/comments` as **§5.12**, in "Vocabulary & text" — comments are a source-text construct and sit naturally beside `define phrase`/`define text`. (Alternative in D2: a "Reading a .story file" placement.)
- **Phrasebook fix (not a move).** The `define-phrasebook` page's `import phrasebook` section is rewritten to the ADR-251 `import` form. If D1 retires `Language`, phrasebook stays where it is (§5.11).

Everything else (Cookbook, Standard library, Reference, Sharpee, Learn) is unchanged.

## What this is NOT

- Not a page-granularity change — ADR-244's one-§N.M-per-page rule is untouched; new pages author to it.
- Not a URL/file move for existing pages — only `nav.ts` group labels and membership change. The one exception is D1's *optional* redirect of the three retired `Language` URLs (only if you choose to retire, not repoint).
- Not a Sharpee/Learn change.

## Decisions for you (D1–D3)

**D1 — the redundant `Language` group.** Pick one:
- **(a) Retire + fold (recommended)** — merge each page's unique overview prose into the matching new group's landing (people→The world, doors/regions→The world, topics→Behavior), add redirects from the three old URLs. One track, no lost content.
- **(b) Keep as a "Feature tours" group** — relabel `Language` → `Feature tours`, accept the intentional overlap as curated entry points, guide stays the deep reference.
- **(c) Leave as-is** — do the new-content + regroup work but don't touch `Language`.

**D2 — where `##` comments live.** `/chord/guide/vocabulary/comments` (§5.12, beside the `define`s — recommended) vs a new "Source files" placement under Project & files (next to import) — the latter groups "file-level" concerns (comments + imports) together.

**D3 — how far to regroup.** Full promote-to-top-level-groups (the AFTER tree above — recommended) vs a lighter touch (keep one `Author guide` group, only add `Project & files` + the new pages + fix stale refs).

## Execution once approved (no code until then)

1. Apply the agreed `nav.ts` regrouping.
2. New page: **Multi-file stories** (`/chord/…/multi-file-stories`) — example-first per the docs-example-first rule.
3. New page: **`##` comments** (location per D2).
4. Fix the stale `import phrasebook` section on the `define-phrasebook` page.
5. D1 disposition (fold/redirect, relabel, or leave).
6. `npm run build` (website) clean; spot-check the rail/pager/breadcrumbs derive correctly.
```
