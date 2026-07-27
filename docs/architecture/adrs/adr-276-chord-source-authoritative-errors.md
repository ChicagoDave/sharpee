# ADR-276: Chord compile is authoritative for every source-derivable error (the stdlib manifest)

## Status: ACCEPTED (2026-07-27, session 332f30) — all three open questions resolved via the open-questions interview same day: Q-1 **full census, one arc** (one end-of-arc audit; ADR-258 implementation waits on the whole census), Q-2 **locale-keyed manifest from day one** (`en-US` sole entry), Q-3 **declarative setting-schema table owned by story-loader** (loader and generator consume one source). adr-review **15/15** after two SMALL fixes (corpus-green no-false-positives gate; D4 defines the record shape, ADR-258's `--json` is its transport). Not implemented. Next: ADR-258's D5 amendment rides on this, then the migration arc's implementation plan.

## Date: 2026-07-27

## Parent: ADR-210 (Chord; direction rule: no platform package may depend on `@sharpee/chord`). Revises the "chord stays stdlib-ignorant" doctrine (`analyzer.ts:1366`, ADR-270 D2/D3's loader-owned diagnostics). Consumes ADR-269 D7 (freshness-gated build-step generation — the mechanism precedent) and the standard grammar source it created. **Unblocks ADR-258** (IDE Chord authoring): its D5 ("compile is authoritative for diagnostics") was found stale in the 2026-07-27 re-assessment because ADR-270 moved author-reachable grammar-alteration errors to load time; this ADR restores the premise, and ADR-258's D5 amendment rides on it. Relates to ADR-251 (`CompileOptions` host hooks — the rejected alternative), ADR-252 (the browser client compiles `.story` at boot — a second consumer of every compile gate), ADR-261 D4 / ADR-215 (`use`-gates as the existing analyzer pattern).

## Context — verified, not assumed

Chord v2 is already overwhelmingly source-based: the compiler emits **312 distinct
`parse.*`/`analysis.*` codes** from 152 diagnostic call sites, covering reference
resolution (`analysis.unknown-entity`, `-condition`, `-channel`, `-counter`, `-role`,
`-extension`…), structural gates (doors, regions, state pairings), and the `use`-gates
(`analysis.scoring-needs-use`, state-machines). Diagnostics carry full spans
(`line`/`column`/`endLine`/`endColumn`) and are **collected** in a `DiagnosticBag` —
the author sees every error at once.

Load is different. `story-loader` has **50 `LoadError` throw sites** (`loader.ts`),
and `LoadError` is **first-throw** (`errors.ts:14`): one error per attempt, message
string plus an optional span flattened to `(line N)`. Most of the 50 are declared
defensive backstops for compile gates ("rogue IR — the compiler's door gates refuse
this", "the compiler gate should have caught this") and are unreachable for
gate-clean IR. But a minority are **author-reachable errors that only exist at load**,
because of a deliberate doctrine stated at `analyzer.ts:1366`:

> Target-name resolution is deliberately NOT here: the loader owns it (story-first,
> else the stdlib id set — chord stays stdlib-ignorant).

The census of that minority (loader.ts line numbers), with what each check needs:

| # | Load-only error | Site | Needs |
|---|---|---|---|
| 1 | `extend action` target names no story/standard action | 1123 | stdlib action-id set |
| 2 | `remove from action` target names no standard action | 1141 | stdlib action-id set |
| 3 | removal pattern matches no standard rule | 1153 | standard grammar shapes per action |
| 4 | trait setting takes `true`/`false`, got other | 1808, 2000 | per-trait setting schema |
| 5 | trait setting needs a number, got other | 1995 | per-trait setting schema |
| 6 | config value names no entity (trait/extension config) | 226, 2041 | schema (which keys are entity-refs) — names are IR-internal |
| 7 | `combat` vocabulary without `use combat` | 1744 | combat trait-name set |
| 8 | unknown NPC behavior adjective | 1877 | closed adjective set |
| 9 | `patrol` needs `with route [ … ]` | 1862 | IR shape only |
| 10 | hiding position not behind/under/on/inside | 1705 | closed set |
| 11 | `dark` applies to rooms only | 1758 | IR shape only |
| 12 | worn by player but not wearable | 672 | IR + trait knowledge chord has |
| 13 | adjective needs exactly one gerund implementation | 1556, 1562 | adjective→gerund map |
| 14 | conditional composition unsupported for trait | 1585 | IR shape only |
| 15 | trait neither declared nor a v1 adjective | 1772 | IR + catalog chord has |
| 16 | unknown direction word | 2363 | standard direction vocabulary |

Every entry needs stdlib **data** — names, shapes, value types — never stdlib
*behavior*. And chord already crossed the names line, twice:

- `catalog.ts` embeds the closed language vocabulary with the header rule *"Platform
  mappings (kind → trait bundle) live in @sharpee/story-loader; this file is names
  only so the compiler stays platform-free."*
- `STDLIB_CHAIN_NAMES` (`catalog.ts:160`) is a stdlib fact embedded in chord, feeding
  `analysis.unknown-chain` at compile — the exact shape of what entries 1–2 need.

The data for entry 3 did not exist when ADR-270 ruled "the loader owns the
diagnostics" — it does now: ADR-269 made the standard grammar a Chord source
(`packages/parser-en-us/grammar/standard-en-us.story`, 410 rules / 55 blocks) with a
freshness-gated build step (`repokit grammar` → generated `src/grammar.ts`). The
loader's own id set is one line: `STDLIB_ACTION_IDS = new Set(Object.values(IFActions))`
(`loader.ts:2429`).

Two consumers make the gap author-visible. `sharpee compose --check` (and ADR-258
D5's planned `--json`) runs gates without the load-proof, so entries 1–16 are
invisible to it — the IDE's Problems panel would never show them. And the browser
client compiles `.story` at boot (ADR-252 — `game.js` ships the chord compiler), so
every compile gate runs there for free while every load-only check does not exist
until load.

What genuinely cannot be source-based: hatch module *existence* (fs), hatch *export
shapes* (requires executing author JS — loader.ts:318/330/342), language-provider
capabilities (691/702), profile refusals (288), IR-format (252), and the evaluator's
at-play errors (live-world condition evaluation). That residue is invisible to a
pure-Chord story: fernhill gets 100% source-based errors.

## Decision

### D1 — Compile is authoritative for every source-derivable error

Any author-reachable error that is derivable from the `.story` source plus stdlib
**facts** (names, shapes, value types) is a compile diagnostic: a `parse.*`/`analysis.*`
code with a full span, collected — never first-thrown. The sixteen census entries
above move into the analyzer. The corresponding `LoadError` sites **remain as
defensive backstops**, joining the door gates' existing pattern ("rogue IR — the
compiler's gate refuses this"); their author-facing message text migrates to the
analyzer with them.

The doctrine is revised, precisely: chord stays **platform-free** (imports nothing
from stdlib/world-model/story-loader; browser-safe) but is no longer
**stdlib-ignorant** — it carries stdlib *data*. ADR-210's direction rule is untouched
in both directions: no platform package imports chord, and chord imports no platform
package.

**The census migrates as one arc** (Q-1 resolved 2026-07-27): all sixteen entries
land in a single migration program with one end-of-arc audit — no alterations-only
slice, no accepted-but-unscheduled remainder. D3 still orders the no-new-data checks
first *within* the arc, but the arc is done when the census is empty, and ADR-258's
implementation waits on the whole of it.

### D2 — The data ships as a generated, freshness-gated stdlib manifest in `@sharpee/chord`

A `repokit` build step generates a manifest module into `@sharpee/chord` (committed,
like `parser-en-us/src/grammar.ts`), carrying names/shapes/types only:

- the stdlib action-id set (from `IFActions`, as `loader.ts:2429` derives it today),
- the standard grammar's pattern shapes per action (from the ADR-269 generated
  grammar — the same source of truth the parser ships),
- per-trait setting schemas: key → value type (`boolean` | `number` | `entity-ref`),
- extension vocabulary sets currently loader-side (combat trait names),
- the standard direction vocabulary,
- the closed sets of entries 8/10 where they don't already live in `catalog.ts`.

The step is **freshness-gated** exactly as ADR-269 D7's is: a stdlib surface change
that would alter the manifest fails the platform build until regenerated. The
manifest is data-only — no imports, no behavior — so `catalog.ts`'s platform-free
rule survives; its "names only" clause widens to "names, shapes, and value types."

**The manifest is locale-keyed from day one** (Q-2 resolved 2026-07-27): the
generator is parameterized by locale and the manifest's shape carries the locale id
explicitly — `en-US` the sole entry today, sourced from `parser-en-us`/`lang-en-us` —
so locale-owned facts (grammar shapes, direction words) are structurally
distinguished from locale-neutral ones (action ids, setting schemas) and are never
presented as language facts. How a story *selects* a locale stays out of scope (no
story-side locale declaration exists); the analyzer resolves the single entry until
one does.

**Setting schemas get one declarative source** (Q-3 resolved 2026-07-27): the
per-trait setting schema table (key → `boolean` | `number` | `entity-ref`) moves into
an exported data module owned by `@sharpee/story-loader`. The loader's own validation
consumes it directly — its hand-written mapping tables refactor into it as part of
the arc — and the repokit generator bakes the same table into the manifest, so the
compile gate and the load backstop are provably one source. (The generator reads the
module; chord still imports nothing.)

*Rejected alternative*: injecting the data per-host via `CompileOptions` (the
`importResolver` seam, ADR-251). That keeps chord data-free but pushes the burden
onto every host — devkit, repokit, **and the browser boot compile** — and makes "what
does the compiler know" a per-host variable. Generated data serves all hosts
identically and keeps `compile(source)` self-contained.

### D3 — Checks that need no new data move immediately

Census entries whose checks are pure IR shape or already-embedded catalog knowledge
(9, 11, 12, 14, 15 — and 13's map if it is small and closed) migrate without waiting
on the manifest generator. Each lands as an ordinary analyzer diagnostic with tests;
the loader site converts to a backstop in the same commit.

### D4 — The hatch source lint becomes a diagnostic surface

`compose`'s hatch lint (`hatch.chord-namespace` — added with ADR-259, currently
formatted text) is re-emitted as structured records alongside compile diagnostics:
same `{severity, code, message}` shape, with a file+line site (hatch module, not
`.story` — no end-span exists). It stays host-side (it reads hatch files; chord stays
filesystem-free) but joins the one diagnostics stream rather than being a second
text format. This record shape is what ADR-258 D5's `--json` transport carries for
hatch findings; until that mode lands, `compose`'s text output keeps printing them —
D4 defines the shape, not a new transport. Hatch *export-shape* checks stay at load
(residue).

### D5 — The residue is closed and recorded

After D1–D4, load-time `LoadError`s are exactly: defensive backstops, hatch
provision/export-shape errors, language-provider capability errors, profile/IR-format
refusals. Nothing else. A new author-reachable load error class may not be introduced
without either a compile gate or an amendment here — the loader comment convention
("the compiler's gate refuses this") marks every backstop.

## Acceptance

- A test story with a typo'd `remove from action` target, an unmatched removal shape,
  a `true/false` setting given a word, and an unknown direction gets **all four**
  diagnostics, with spans, from a single `sharpee compose --check` run — no load, no
  `node_modules` (D1, D2).
- The same story compiled by the **browser** client's boot path reports the same
  diagnostics (D1; ADR-252 consumer).
- Editing the standard grammar source or the stdlib action surface without
  regenerating the manifest fails `repokit` verify/build (freshness gate, D2 —
  demonstrated by a deliberate stale edit during review).
- Hand-built rogue IR fed directly to the loader still fails with the backstop
  `LoadError`s — the loader's defense is not weakened (D1).
- The census table is re-audited at implementation end: every author-reachable
  `LoadError` in `loader.ts` is either analyzer-gated (with its compile code named)
  or in D5's residue list — no third category.
- `@sharpee/chord` still imports no platform package, and no platform package
  imports chord (`scripts/bundle-entry.js` direction check stays green).
- The migrated diagnostics are **collected**: a story with N alteration errors
  surfaces all N in one compile, versus today's one-per-build-attempt (D1).
- **No false positives**: the full corpus (dungeo units + walkthrough chain, cloak,
  fernhill, friendly-zoo, nautical, acceptance stories) stays green after migration —
  a migrated compile gate must not be stricter than the load check it replaces except
  by explicit ruling recorded here.
- ADR-258's D5 amendment lands as a follow-on edit citing this ADR: `--json` (gates +
  IR, no load-proof) is sufficient for the IDE Problems panel for everything except
  D5's recorded residue.

## Consequences

- **The IDE story becomes whole.** ADR-258's Problems panel shows every
  source-derivable error live, unblocking its D5 without weakening its "no
  `node_modules` in the editor path" rule.
- **A new standing coupling**: stdlib surface that authors can reference (action ids,
  grammar shapes, setting keys, direction words) must regenerate the manifest —
  freshness-gated, so forgetting is a build failure, not drift. Same class of
  obligation as ADR-269's generated grammar and ADR-257's `chord.ebnf` pin.
- **`catalog.ts`'s doctrine is formally widened** from "names only" to "names, shapes,
  and value types; never mappings-to-behavior." The `analyzer.ts:1366` comment is
  rewritten to cite this ADR.
- **Authors get batch errors.** First-throw load errors made authors fix one error
  per build; migrated checks arrive all at once with spans.
- **The browser boot compile strengthens for free** — every migrated check runs
  wherever `compile()` runs.
- **Chord's published package grows** by the manifest (hundreds of shape strings) —
  data only; the browser bundle already ships the whole compiler.
- **The residue is honest and visible**: hatch export-shape and provision errors
  remain build-time. An IDE author using hatches sees those in Build output, not
  Problems — recorded in ADR-258's amendment rather than papered over.
- **Locale is structural, not deferred** (Q-2): the manifest is keyed by locale id
  from day one, with `en-US` its sole entry. A second locale slots into the manifest
  without reshaping it — though it would still face the far larger question of
  Chord's own English-shaped surface, which this ADR does not touch.

## Session

Session 332f30 (2026-07-27, branch main). Triggered by the ADR-258 staleness
re-assessment: its D5 premise ("compile is authoritative for diagnostics") had been
silently broken by ADR-270 landing author-reachable grammar-alteration errors as
load-time `LoadError`s. David ruled the step-back question — "can we enable
source-based errors for all of Chord v2" — and the census above answered yes for
everything except an irreducible host/toolchain residue. The doctrine being revised
(`chord stays stdlib-ignorant`) was located as a deliberate comment at
`analyzer.ts:1366`; the enabling precedents (catalog.ts names-only rule,
`STDLIB_CHAIN_NAMES`, ADR-269 D7's freshness-gated generation) were all verified in
source this session.

Interviewed and reviewed the same session, with review run **before** the status flip
at David's direction. Q-1 went against the facilitator's recommendation
(alterations-first) — David ruled one arc, keeping the census's forcing function
whole rather than optimizing for the IDE unblock. Q-2 likewise (locale-keyed now,
not deferred). adr-review surfaced two SMALL gaps, both fixed inline: the acceptance
set lacked a no-false-positives corpus gate, and D4 implied a structured transport
that only exists once ADR-258's `--json` lands.
