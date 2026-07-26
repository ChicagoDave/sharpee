# ADR-272: Grammar documentation surfaces

## Status: IMPLEMENTED (2026-07-26, same session — see the implementation addendum) — last child of the ADR-266 umbrella; with it, all six umbrella children are landed. Sequenced last by design (umbrella D14): its content is written against what ADR-267/268 landed and derived from what ADR-269 shipped, and ADR-270 has now handed it the final capability its pages must describe. Owes umbrella acceptance items 16 and 17. All three open questions (inherited Q-5 restated as Q-1, plus Q-2/Q-3) resolved via the open-questions interview same day, each the presented recommendation: Q-1 → generated data module + `<GrammarBlock>` component (D4), Q-2 → two per-construct pages (D3), Q-3 → cookbook tables stay hand-written (Not addressed). adr-review same day: 13/14, four SMALL findings folded (Modules list; D6 harness correction — `seedStandard` required, verified against `grammar-harness.ts`; D2 fence discipline; slot-name count re-verified at implementation) — re-scored 14/14.

## Parent: ADR-266 (umbrella — D3a/D3b both halves and their homes, D9 in-place instances, Q-5 devolved here, acceptance 16–17). Consumes ADR-269 (the shipped source the docs derive from: `packages/parser-en-us/grammar/standard-en-us.story`; also the committed-plus-freshness-gated generation precedent, its D7), ADR-270 (the alteration constructs `extend action` / `remove from action` — its D5 hands their author-facing pages here; its D4 reorder idiom is page content), ADR-267 (the landed construct set and spellings the capability page teaches; its D2 note restates the 17-slot-name publication obligation here), ADR-268 (no ordering notation — ordering is taught in author terms, never numbers), ADR-273 (its D5 hands the `must be reachable` semantics statement here), ADR-271 (its D5 docs-examples-load test is the enforcement instrument this ADR widens). Relates to the project docs policy (example-first, minimal prose — owner ruling 2026-07-19) and ADR-258 (the IDE ships author docs; out of scope here).

## Date: 2026-07-26

## Context

### What this ADR owes — the family's hand-offs, compiled

1. **Umbrella acceptance 16** — the `define action` page gains the capability framing, written in
   Chord terms only (D3b: no `extendParser`, no `GrammarBuilder`, no priority values, no
   Sharpee-comparison section), keeping its worked example and line-by-line reading, and publishing
   the 17 standard slot names (also ADR-267 D2's restated note).
2. **Umbrella acceptance 17** — every standard action's entry in `stdlib/reference/content.mdx`
   carries its `define action` grammar block, **derived from the shipped Chord source**; nothing
   existing is removed (D9's "in place").
3. **Inherited Q-5** — the mechanism by which derived content reaches a hand-maintained MDX page.
4. **ADR-270 D5** — author-facing pages for `extend action` and `remove from action` (the
   `define verb` page is already deleted; "other pages are ADR-272's").
5. **ADR-273 D5** — one or two example-led lines on the `define action` page stating what
   `must be reachable` means in play (same place or open containers; closed glass blocks; another
   creature's possessions blocked; sight required, so darkness refuses).
6. **The docs-examples-load test** (umbrella allocation; ADR-271 D5 lineage) — every published
   Chord example loads, enforced by execution, not review.

### What exists today (surveyed 2026-07-26, session 52a8f4)

**The capability page** (`website/src/app/chord/guide/vocabulary/define-action/content.mdx`,
56 lines) is in good shape as far as it goes: one worked `petting` example already in the
post-ADR-267 spelling (`the animal` slots, `→` cardinality, `must be reachable`, the refusal
ladder, `phrases`), a line-by-line reading, and — since ADR-271/273 — its claim that the parser
enforces the scope constraint is finally *true*. What it lacks is everything ADR-267 landed beyond
that example: `or` alternation, `[optional]` words, the greedy `takes the rest of the line` line,
`is an instrument` / `is a topic`, per-pattern `means <key> <value>`, the `directions` block — and
the slot-name list, the reachability semantics, and any mention of alteration.

**The instances page** (`website/src/app/chord/stdlib/reference/content.mdx`, 1515 lines,
56 `##` entries) is frozen output of the retired ADR-265 generator, and says so in an MDX comment
naming this ADR. It contains **zero Chord fences** — the heading carries a flattened phrase list
("take, get, pick up, grab"), several of them garbled by the old generator
(`## switch off, switch off, turn off, turn off`), a `**Slots**` line on only 38 of 56 entries,
message-alias tables, and a "Change it" line. Its `page.tsx` still claims the content comes from
`scripts/generate-stdlib-chord.js`, a script ADR-269 D5 deleted. One entry —
`if.action.deadly_room_death` — has no block in the shipped source at all: it is a system action
with no player-typed grammar (the source's 55 blocks vs the page's 56 entries, verified by diff).

**The alteration constructs** appear on the website only as two table rows on
`chord/reference/grammar/content.mdx`, filed under a heading called "The define forms" — which
neither construct is.

**The enforcement test** (`packages/story-loader/tests/docs-examples-load.test.ts`, 72 lines)
regex-extracts ` ```chord ` fences from vocabulary pages, wraps each in a minimal story harness,
and runs the full `compile()` → `createStory()` → world-init load path. Its page list is currently
hardcoded to `['define-action']` (narrowed when the `define verb` page died, ADR-270 D7).

**There is no docs derivation pipeline.** Nothing in the repo writes into `website/src`; the only
generation step the website has (`scripts/build-search-index.mjs`, run on `predev`/`prebuild`)
reads `src/app/**/content.mdx` and writes `public/search-index.json`. The repokit `grammar`
command (ADR-269 D7) is the precedent for the missing piece: generate from the Chord source,
commit the output, gate freshness in `repokit verify`.

**A known duplicate surface, recorded**: eight cookbook overview pages carry hand-written
"Phrasings" tables restating standard-grammar verb phrasings in task-shaped form
(`cookbook/{containers-and-locks, manipulation, wearing, devices-and-tools, meta, social,
movement, senses}/content.mdx`). Ruled out of scope (Q-3 interview, 2026-07-26) — see Not
addressed.

## Decision

### D1 — Scope: three author-facing surfaces, one test, and the named repairs — nothing new invented

The work is (a) the capability expansion of the existing `define action` page, (b) the derived
grammar blocks on the existing stdlib reference page, (c) the two alteration-construct pages
(D3), and (d) widening the docs-examples-load test to cover the result. All
pages stay `content.mdx` + `page.tsx` in the existing MDX pipeline; new pages get `nav.ts`
entries; the search index picks them up via the existing prebuild step. No new documentation
system, no new website dependency.

Repairs land in the same pass because the surfaces are being rewritten anyway: the garbled
duplicate headings on the reference page (corrected from the same derivation), the stale
`page.tsx` generator comment (removed), the frozen-provenance MDX comment (retired when the
derivation replaces it), and the "The define forms" mislabel on `chord/reference/grammar`
(the alteration rows move under an accurate heading and link to the two new pages).

### D2 — The capability page: every landed construct, example-first, Chord-only

The `define action` page keeps its worked example and line-by-line reading (umbrella acceptance
16) and gains example-led coverage of the full landed surface — each construct shown as a small
Chord fragment with at most a sentence or two of framing, per the project docs policy
(example-first; prose-heavy reference pages are rejected):

- pattern lines and `the <slot>` (already present), `→` cardinality (already present);
- `or` alternation and `[optional]` words (ADR-267 D8/D9);
- `the <slot> takes the rest of the line` (D10), `is an instrument` / `is a topic` (D11);
- per-pattern `means <key> <value>` and the `directions` block, shown with a non-compass example
  so the block reads as vocabulary, not hardcoded compass (D12, the ship-directions ruling);
- the constraint line family (`must be reachable` / `visible` / `held`), with ADR-273 D5's
  semantics stated in one or two example-led lines;
- **the standard slot names**, published as a short list an author can reuse in extensions
  (hand-maintained on the page; 17 as measured pre-migration — **re-counted from the shipped
  source at implementation** and published as counted, since the pre-migration figure includes
  the 12 platform-TS rules);
- **which pattern wins**, in author terms and without numbers (ADR-268): more specific patterns
  win; earlier-listed wins remaining ties; a story's grammar outranks the standard grammar
  unconditionally. No priority vocabulary exists to document.

*Fence discipline (review fix, 2026-07-26):* every ` ```chord ` fence on the page is a
**complete loadable declaration** — a full `define action` block — because the
docs-examples-load test loads whole fences (D6). Loose construct lines (`the key is an
instrument` on its own) appear as inline code only, never fenced.

D3b's voice rule is restated as binding: the page never names `extendParser`, `GrammarBuilder`,
priority values, tiers-as-implementation, or any TypeScript surface, and contains no
Sharpee-comparison section.

### D3 — The alteration pages: two per-construct vocabulary pages, cross-linked (Q-2 resolved 2026-07-26)

*Owner ruling via the open-questions interview: option (a) — the recommended option.*

Author-facing documentation lands as **two vocabulary pages** — `guide/vocabulary/extend-action`
and `guide/vocabulary/remove-from-action` — matching the section's per-construct convention and
ADR-270 D6's deliberate two-blocks ruling. The reorder idiom lives on the `extend-action` page
(it is an extension restating a line), with a pointer from `remove-from-action`; the two pages
cross-link. **Rejected** (Q-2 interview): one combined "altering standard grammar" page — breaks
the one-page-per-construct pattern, and nav/search would land authors mid-page.

Both pages are example-led like the rest of the vocabulary section, covering between them:

- extending a standard action with new grammar lines that drive the **stdlib implementation**
  (ADR-270 D2 — the story-tier synonym example: `snag the item` onto `taking`);
- removing standard patterns by restating them (D3 — shape identity, e.g. dropping `get` as a
  synonym for taking);
- the reorder idiom (D4 — no ordering syntax exists; restate the line you want to win as an
  extension, or remove its competitor);
- the loud-failure contract (D1 — unknown action name and unmatched removal shape are load
  errors, stated so authors expect them, with the did-you-mean behavior shown);
- where alterations live (D8 — the story file and spliced `.chord` fragments; a pointer from the
  multi-file-stories page is in scope).

The two rows on `chord/reference/grammar` link to the two pages, under a corrected heading (D1).

### D4 — The instances half: verbatim blocks derived from the shipped source, via a generated data module (Q-1 / umbrella Q-5 resolved 2026-07-26)

*Owner ruling via the open-questions interview: option (b) — the recommended option.*

Each action entry on `stdlib/reference/content.mdx` gains its `define action` block as a
` ```chord ` fence whose content is the action's block **verbatim from
`packages/parser-en-us/grammar/standard-en-us.story`** (umbrella D4: the source is already real
Chord an author could have written; generator-provenance comments are excluded, the block's own
content is not reformatted).

**Mechanism**: the repokit derivation step writes **one generated data module** beside the page
(committed, marked generated); the MDX gains one `<GrammarBlock action="…" />` call per entry,
written once by hand; the small component renders the fence through the existing `CodeBlock`
path. Tooling never rewrites the hand-maintained MDX; the freshness gate (D5) checks exactly one
derived artifact. **Rejected** (Q-1 interview): tool-rewritten sentinel regions inside
`content.mdx` (repeated tool edits to a 1515-line hand-maintained file — collisions and sentinel
drift); a separate fully-derived page (abandons D9's "in place"). The heading's verb list is rederived from the same blocks in the same
pass, which repairs the garbled duplicates without removing any entry content (D9 honored:
existing group/slots/events/message-table/"Change it" content all stays).

`deadly_room_death` — the one entry with no source block — states explicitly that it has no
player-typed grammar (a system action dispatched by the platform), rather than silently carrying
no fence: the derivation fails loud if any *other* entry has no matching block, and fails loud if
a source block has no entry (both directions, ADR-270 D1's lineage).

The 12 platform-side TS rules (`?` → help, the 11 `trace` rules — ADR-269's ruled exceptions)
are not in the Chord source and are not documented as Chord; nothing on the page claims they are.

### D5 — Derived content is generated, committed, and freshness-gated — never hand-edited

The mechanism ruled in D4 follows the discipline of ADR-269 D7's, applied to docs: a repokit-owned
derivation step regenerates the derived content from the shipped source; the output is committed;
`repokit verify` gains a `--check`-style freshness gate that fails when the derived content is
stale against `standard-en-us.story`. Hand-editing derived content is a build failure, not a
convention. This closes the same "artifact silently diverges" class for the docs that ADR-269
closed for `grammar.ts` — by construction, not by review.

### D6 — The docs-examples-load test widens to the full published surface

The page list stops being hardcoded to one entry: every vocabulary-section page with Chord fences
is enumerated (including the two alteration pages), and every fence must load through the real
`compile()` → `createStory()` path.

*Harness correction (review fix, 2026-07-26 — verified against code):* the current harness
registers **no** standard-tier rules — `captureGrammarRules` calls `captureGrammarEngine` without
its `seedStandard` hook (`grammar-harness.ts:74-75`) — so a `remove from action` fence would hit
ADR-270 D1's removal LoadError and fail the test. The widened test therefore **seeds the real
standard grammar** through the existing `captureGrammarEngine(…, seedStandard)` hook (the real
`defineGrammar`), so `extend action` fences validate against the real id set and
`remove from action` fences match real rule shapes — the examples are exactly the ones ADR-270's
acceptance made loadable.

The derived stdlib blocks are **not** re-loaded by this test: they are verbatim excerpts of the
source that `repokit grammar` already compiles on every build, and D5's freshness gate pins them
to it. Load-testing them would re-run the compiler 55 times to re-prove an identity.

*Implementation finding (2026-07-26):* enumerating every vocabulary page surfaced **12
pre-existing non-loading fences across six non-grammar pages** (comments, define-condition,
define-phrase, define-phrasebook, define-action-hatches, and others) — deliberate partial
snippets (own story headers, entities outside the shared harness, hatch-module imports) that
were never load-tested. Making them stand-alone is not an ADR-272 surface, so the load bar
applies to the grammar pages (acceptance 5's set), and the partial pages are enumerated in an
explicit `KNOWN_PARTIAL_PAGES` set with the reason documented — a **new page is load-tested by
default** and joins the partial set only by naming itself there. Widening the bar to the
remaining pages is future work, not silently claimed.

### D7 — Voice and length discipline for everything this ADR touches

All three surfaces follow the docs policy ruling (2026-07-19): examples for everything, basic
explanations only. The capability page grows by construct fragments, not by prose sections; the
alteration pages are built around two or three complete, loadable examples; the reference page
gains fences, not paragraphs. D3b's Chord-only rule applies to every page this ADR touches, not
only the capability page.

*Modules (review fix, 2026-07-26):* **website** — `guide/vocabulary/define-action/content.mdx`
(capability expansion); new `guide/vocabulary/extend-action/` and
`guide/vocabulary/remove-from-action/` (`content.mdx` + `page.tsx` each);
`src/lib/nav.ts` (two vocabulary rows); `stdlib/reference/content.mdx` (56 `<GrammarBlock>`
calls + repairs) and its `page.tsx` (stale comment removed); the committed generated data module
beside the reference page; the `<GrammarBlock>` component, registered globally in
`src/mdx-components.tsx` (the `Callout`/`CodeBlock` precedent); `chord/reference/grammar/content.mdx`
(heading fix + links); `guide/project/multi-file-stories/content.mdx` (alteration-fragment
pointer). **tools/repokit** — the derivation lands in the existing `grammar` command (same
source, a second emitted artifact) and its `--check` freshness gate extends to it;
`verify.ts` unchanged beyond the gate's coverage. **story-loader** —
`tests/docs-examples-load.test.ts` (page enumeration, standard-grammar seeding via the existing
`seedStandard` hook) and its grammar harness. No platform package changes.

## Acceptance

1. **Umbrella 16 discharged**: the `define action` page covers every ADR-267 construct with a
   loadable example each (every fence a complete `define action` block, per D2's fence
   discipline), publishes the standard slot names (expected 17 — counted from the shipped source
   at implementation, not assumed), states the ADR-273 D5 reachability semantics, states the
   ADR-268 ordering model without numbers, and keeps the worked example and line-by-line reading.
   A voice audit finds no `extendParser`, `GrammarBuilder`, priority value, or Sharpee-comparison
   content on any touched page. *(D2, D7)*
2. **Umbrella 17 discharged**: all 55 grammared entries on `stdlib/reference/content.mdx` carry a
   ` ```chord ` fence byte-identical to their source block (modulo the D4 exclusions);
   `deadly_room_death` states its no-player-grammar status; headings are rederived (garbles gone);
   no existing entry content is removed; the frozen-provenance comment and the stale `page.tsx`
   generator comment are gone. *(D1, D4)*
3. **Both-directions loudness**: the derivation errors on an entry with no source block (other
   than the ruled exception) and on a source block with no entry — asserted by test, not review.
   *(D4)*
4. **Freshness gate**: `repokit verify` fails when the derived content is stale — demonstrated by
   mutating `standard-en-us.story` and observing the failure. *(D5)*
5. **docs-examples-load widened**: the test enumerates vocabulary pages rather than hardcoding
   one; the harness seeds the standard grammar (D6's correction); every Chord fence on the
   capability and alteration pages loads; the suite is green. *(D6)*
6. The two alteration pages exist, teach extend / remove / reorder-by-restating / the loud-failure
   contract, are linked from `nav.ts` and from the corrected `chord/reference/grammar` rows, and
   `next build` (with its prebuild search index) is green. *(D1, D3)*
7. No reference to the deleted ADR-265 generator remains anywhere under `website/`. *(D1)*

## Consequences

**Gained (when ACCEPTED + implemented).** The ADR-266 umbrella closes — all six children landed,
and the original feedback's both clauses are answered *in the docs an author reads*: the standard
grammar is readable on the reference page as real Chord, and the pages teaching how to change it
describe capabilities that actually exist. The website gains its first derived-content discipline
(small, repokit-owned, freshness-gated), and the docs-examples-load net widens to every published
grammar example.

**Cost.** A new repokit derivation step and verify gate to maintain. A 56-entry MDX page touched
by tooling (the D4 mechanism). The docs-examples-load test's page enumeration becomes a
convention new vocabulary pages must join. Derived headings mean the reference page's headings are
no longer freely editable prose.

**Rejected (by the settled parts).** Hand-transcribing grammar into MDX (the drift class D5
closes). Documenting the platform-side TS rules as Chord (D4). Load-testing derived blocks (D6 —
an identity re-proof). Prose-section growth on the capability page (D7; docs policy).

**Not addressed.** The IDE's shipped author docs (ADR-258's surface — consumes these pages,
not specified here). Extension-package grammar docs (ADR-215 — alterations are story-scoped,
per ADR-270). Translating the docs for non-en-US locales (ADR-269 D9's mechanism note stands).
The eight cookbook "Phrasings" tables stay hand-written (Q-3 interview ruling, 2026-07-26:
recorded as a known hand-maintained duplicate surface, revisited only if observed stale —
deriving task-curated tables with non-grammar columns is a second, harder derivation shape for
the smallest surface, and would reintroduce the in-place-rewrite pattern Q-1 rejected).

## Session

Session of 2026-07-26 (52a8f4). Drafted as the last umbrella child, immediately after ADR-270's
implementation landed (`8b2a83e9`). Grounded before drafting: the umbrella's D3a/D3b/D9/Q-5 and
acceptance 16–17; ADR-267 and ADR-268 in full (the construct set and ordering model the pages
teach); ADR-269's implementation addendum (the shipped source, the repokit generation precedent,
the frozen-provenance note); ADR-270 D4–D8 (the alteration capability and its doc hand-off);
ADR-273 D5 (the reachability semantics obligation). The four documentation surfaces, the
docs-examples-load test, the absence of any pipeline writing into `website/src`, and the
55-block-vs-56-entry diff (`deadly_room_death`) were established by survey against the working
tree, not assumed from the ADRs.

**Implementation addendum (2026-07-26, same session, on the owner's "begin").** All five
phases landed; plan at `docs/work/grammar-docs-surfaces/plan.md`:

- **Phase 0**: baselines green (story-loader 398, repokit 40); slot census against the shipped
  source = **exactly 17 names**, matching the umbrella's list (acceptance 1's count verified).
- **Phase 1 (repokit)**: `repokit grammar` emits the second artifact
  `website/src/app/chord/stdlib/reference/grammar-blocks.ts` (renamed from `.generated.ts` —
  `.gitignore`'s `**/*.generated.*` would have blocked D5's committed requirement; the repo's
  committed-generated convention is plain name + GENERATED header, the `grammar.ts` precedent);
  verbatim block splitter, both-directions `validateDocsCoverage`, `--check` and `repokit
  verify` cover both artifacts; 4 new repokit tests (44 total green).
- **Phase 2 (reference page)**: 55 `<GrammarBlock>` calls (one-time scripted edit; the
  `reading` entry lacked a `**Group**` line and was inserted by hand), headings rederived from
  the source blocks (garbled duplicates gone), `deadly_room_death` no-player-grammar note,
  frozen-provenance comment and stale `page.tsx` generator comment retired, intro rewritten;
  `<GrammarBlock>` component + `mdx-components.tsx` registration (unknown id throws at
  prerender). Website deps were stale (`npm ci` on owner's go-ahead — website is an npm
  project, not workspace); build green.
- **Phase 3 (capability page)**: six new complete loadable fences (alternation+optional,
  greedy, `must be held`, typed slots, `means`, non-compass `directions`), ADR-273 D5
  reachability semantics folded into the constraint bullet, ordering paragraph without
  numbers, the 17 slot names published, cross-links to the alteration pages.
- **Phase 4 (alteration pages)**: `extend-action` and `remove-from-action` pages (error texts
  quoted from the real loader messages, pattern lists from the real blocks), nav.ts rows,
  vocabulary overview updated (its "only other top-level declarations" claim was stale),
  reference/grammar rows moved to a new "The alteration forms" section with links,
  multi-file-stories fragment pointer.
- **Phase 5 (test + sweep)**: docs-examples-load enumerates vocabulary pages and seeds the
  real `defineGrammar` (source-path import, matching the test's existing cross-workspace MDX
  read — no parser-en-us surface change); the D6 implementation finding (KNOWN_PARTIAL_PAGES)
  recorded above; story-loader 411/411; freshness-gate failure demonstrated by mutation (both
  defenses fired: STALE + coverage error) and reverted; voice audit clean; zero ADR-265
  generator references under `website/`; `next build` green (152 pages, both new pages
  prerendered). Status flipped **IMPLEMENTED**. The ADR-266 umbrella's children are all
  landed.
