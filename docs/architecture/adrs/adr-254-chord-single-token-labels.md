# ADR-254: Chord labels are single kebab-case tokens — no dotted keys

## Status: ACCEPTED (2026-07-22 — all decisions ruled by David directly, session 74219a: `.` is illegal in every Chord label/key (all label kinds, one uniform rule); dotted keys "do not fit in Chord"; its own cross-cutting ADR, sequenced before ADR-253 because it feeds the renderer naming. Open-questions interview complete (same session): no platform-event carve-out — Chord never references platform events with dotted keys (verified zero `.story` usage; `if.event.*` is internal binding, not an author label); grammar change and fernhill + friendly-zoo migration land atomically. No Open Questions remain. Multi-ADR review (252/253/254) same session: 14/14 per-ADR, 0 hard contradictions; the only cross-ADR drift lived in the 253 stub (dotted example + missing pointer), fixed before this flip. Not implemented.)

## Amendment (2026-07-22, session 818d28): explicitly supersedes ADR-231 D1b

This ADR **supersedes ADR-231 D1b** — the rider under ADR-231 D1 that extended
dotted phrase keys to *all* Chord key sites "honoring the EBNF's `phrase-key =
WORD { \".\" WORD }` everywhere." That rider was a **deliberate, real, and
tested** capability, not a dead branch: it made `define phrase
if.action.taking.fixed_in_place` a legal Chord form for overriding a platform
standard-action message story-wide (documented in `chord-language.md` §5.2/§5.3,
fixture `define/dotted-override.story`, and exercised by
`packages/chord/tests/dotted-keys-all-sites.test.ts`). ADR-254 retires the
dotted **spelling**: dots are illegal in every label, so `define phrase
if.action.taking.fixed_in_place` no longer parses. The original Context below
called the dotted platform reference form "vestigial and unused" — that
characterization is **corrected here**: it was a supported, documented
capability, not code nobody wrote.

**The override capability is retained — only its spelling changes.** Rather than
drop platform-message override, Chord gains a curated kebab **anti-corruption
layer (ACL)** for it, mirroring the event-selector ACL already in place
(`catalog.ts` "Interface Contract 2": the chord language side holds curated bare
names, `@sharpee/story-loader` holds the dotted `if.event.*` bindings, keeping
the compiler platform-free). An author overrides a standard-action message with
a curated kebab name (e.g. `taking-fixed-in-place`) that the loader maps to the
internal `if.action.taking.fixed_in_place` id — the raw dotted platform id never
appears in a `.story`. The ACL's design (spelling of the override construct,
curated-name set vs. mechanical de-dot transform, collision rules with
story-defined phrase keys, loader-side conformance pinning) is specified in a
**follow-up ADR (ADR-255)**; this amendment records that the capability stays
and the dotted author spelling does not. No *shipped* story used the dotted form
(verified zero `.story` usage), so the ban carries no story migration beyond
fernhill/friendly-zoo's namespaced keys.

The test removal and the `dotted-keys-all-sites.test.ts` deletion landed in
session 818d28. The `chord-language.md` §5.2/§5.3 and website guide edits — which
must move authors from the dotted `if.action.*` form to the ACL kebab name, not
delete the override capability — are sequenced **after ADR-255** so they teach
the replacement rather than a hole.

## Date: 2026-07-22

## Parent: ADR-210 (Chord `.story` author language). Completes the direction of ADR-231 D1 (refusal-key namespace: bare kebab keys are correct; the ad-hoc dotted-key escapes are dead branches to be removed) by tightening the *grammar* to match, and **supersedes ADR-231 D1b** — the rider that deliberately extended dotted phrase keys to every key site (`readDottedKey`, `WORD { "." WORD }`), including the platform-message-override form `define phrase if.action.<key>`. That was a real, documented capability, retired here (see Amendment). Feeds ADR-253 (declarative renderers — its channel/event naming assumes single-token labels).

## Context

Chord is kebab-case single tokens everywhere else — entity ids, trait names,
phrase strategies, region/slot names. One primitive breaks that grain:
`readDottedKey` (`parser.ts`, `WORD { "." WORD }`), reached from **15 call
sites** — event/`emit` keys, phrase keys, exit keys (the sites carry the comment
"phrase-key = WORD { "." WORD } (ADR-231 D1b, exit keys ruled in)"). It permits
a dotted label like `estate.clock`.

The dot was only ever doing **namespacing**. Real usage across all `.story`
sources (verified 2026-07-22):

- **fernhill** — an event key: `emit estate.clock with hour …` /
  `from event estate.clock`. The dot separated the *event* key from the
  *channel* named `clock` (`define channel clock`).
- **friendly-zoo** — phrase keys: `zoo.parrot`, `zoo.feeding-time`, grouping
  related phrases under a `zoo.` prefix.
- **cloak-of-darkness** — *none*. Its only dotted text is `"chord-extras.ts"`,
  a **filename inside a quoted string**, not a label.

That last point is the scoping line: the rule is about **bare identifiers /
keys**, never about quoted **string literals** — file paths
(`"chord-extras.ts"`, `"audio/night-wind.wav"`), blurbs, and prose keep their
dots. ADR-231 already ruled bare kebab keys correct for refusals and marked the
dotted escapes for removal; this ADR finishes that by making the grammar reject
dots in labels outright, so the language reads uniformly.

**No shipped story references a platform event with a dotted key — verified.**
The engine's semantic namespace (`if.event.*`, `if.action.*`) is dotted, but
those ids are **internal binding targets** — TS constants the catalog's
event-selector map produces from an author's *bare* curated selector
(`catalog.ts:119`). No `.story` in the repo references a dotted platform event
(checked 2026-07-22: zero `if.event.*`/`if.action.*` occurrences across all
sources; the only `event` reference is fernhill's author-defined `estate.clock`).

Two dotted *author-facing* forms did exist, introduced by ADR-231 D1b and
superseded here (see Amendment above): the `event if.event.<key>` machine
trigger (`ast.ts:768`, exercised by `state-machine.test.ts` before its
2026-07-22 kebab migration) and the platform-message override
`define phrase if.action.<key>` (`chord-language.md` §5.2/§5.3). Both fall under
the ban and are removed with the dotted-key primitive; neither has a non-dotted
alternative in this ADR. No shipped story used either, so the dotted platform
namespace stops being an author-facing label and needs no carve-out.

## Decision

### D1 — A Chord label/key is a single kebab-case token; `.` in a label is a parse error

`readDottedKey` is replaced by a single-token key read: a label/key is one
`WORD` (kebab-case, hyphens allowed). A `.` encountered inside a label position
raises a new diagnostic (`parse.dotted-key`) — "Labels are single words; `.` is
not allowed in `<key>` (use kebab-case, e.g. `estate-clock`)." — rather than
being consumed into the key.

### D2 — One rule across every label kind

The ban is uniform across all `readDottedKey` sites: `emit`/event keys, `from
event` keys, phrase keys, exit keys, and any other bare-key position. There is
no label kind where a dot remains legal, and **no platform-event carve-out** —
Chord never references platform events with dotted keys (author selectors are
bare curated names; `if.event.*` is internal). The unused raw
`event if.event.<key>` reference form falls under the ban and is removed with
the dotted-key primitive; authors reference platform events only through curated
bare selectors. This is the "all labels — one rule" scope David ruled.

> **Amendment (2026-07-22, session 818d28) — event-type sites deferred to ADR-256.**
> D2's event-key claims are corrected against what implementation found. Chord
> *does* reference platform events with dotted ids today (the `media.*` fixtures,
> `emit media.sound.play`), and the raw `event <key>` form is *used*
> (`state-machine.test.ts`), not vestigial. So the event-type sites (`emit`,
> channel `from event`, machine `when event`) were **not** removed with the
> dotted-key primitive: Phase 1 scoped them to `readLabelKey(…, { allowDotted:
> true })`, and **ADR-256** resolves them — a `@sharpee/story-loader` translation
> turning a dotless Chord event id into the platform's (unchanged, dotted) id. The
> uniform ban holds at every *author-label* site now; the event-type sites become
> dotless when ADR-256 lands. This mirrors the message-override deferral to
> ADR-255 above.

### D3 — Quoted string literals are exempt

The rule constrains **bare keys only**. Quoted `STRING` literals are untouched:
file paths (`from "chord-extras.ts"`, `from "audio/night-wind.wav"`), story
blurbs, prose, and any other quoted text may contain dots freely. A dot is
illegal only where the grammar expects a bare label.

### D4 — Kebab-case single tokens replace dotted namespacing

Authors express the former namespace with a hyphen or drop it: `estate.clock →
estate-clock` (or just `clock`), `zoo.parrot → zoo-parrot`, `zoo.feeding-time →
zoo-feeding-time` (kebab already permits internal hyphens). The
event-vs-channel disambiguation fernhill used the dot for still works with a
distinct kebab token (`estate-clock` the event, `clock` the channel).

### D5 — Migration surface

Two stories carry dotted labels; both migrate at **every definition and use
site** in one change:
- **fernhill** — `estate.clock` (the `emit` sites and the `from event` site).
- **friendly-zoo** — `zoo.parrot`, `zoo.feeding-time` (each `define`/`phrase`
  definition and every invocation).
- **cloak-of-darkness** — no change (its dotted text is a filename string, D3).

**The grammar change and the story migration land atomically — one change.**
The parser rejecting dotted labels and the fernhill + friendly-zoo migration
ship together, so the repo is never in a state where a shipped story fails to
compile; every suite stays green across the change. No grammar-first window
with red stories.

## Acceptance

**Worked example.** fernhill's clock, migrated:

```
emit estate-clock with hour "evening" when evening
...
define channel clock
  from event estate-clock
  take hour
end channel
```

**Rejection case** (a rejection test): a label containing a dot —
`emit estate.clock …`, `phrase zoo.parrot`, or a dotted exit key — raises
`parse.dotted-key` at the dot, and the compile fails.

**Done when:**
- The grammar rejects `.` in every label position; `parse.dotted-key` fires
  with a message pointing at kebab-case.
- A quoted string containing a dot (`from "chord-extras.ts"`) still compiles
  (D3 — no false positive on file paths).
- fernhill and friendly-zoo compile and pass their suites with kebab labels;
  cloak is unchanged.
- No `.story` in the repo contains a dotted bare label.

## Consequences

- **The grammar now matches ADR-231's intent.** Bare kebab keys were already
  "correct as written"; the dotted escape hatch is closed rather than merely
  discouraged.
- **ADR-253's naming is clean.** The renderer ADR can assume single-token
  channel/event/phrase labels — no dotted keys to account for in render binding.
- **String literals are explicitly out of scope** (D3), so file-path hatches
  and prose are unaffected; the change cannot break media/hatch imports.
- **A small migration** (two stories) lands with the rule; the `readDottedKey`
  primitive and its 15 call sites collapse to a single-token read.
- **Author guidance shifts**: namespacing is expressed with hyphens, not dots
  — consistent with every other Chord identifier.
- **The dotted platform-message-override *spelling* is removed** (ADR-231 D1b,
  superseded); **the capability is kept.** A story could formerly replace a
  standard-action message story-wide with `define phrase
  if.action.taking.fixed_in_place`; that dotted form no longer parses. It is
  replaced by a curated kebab **ACL** — an author writes a curated name (e.g.
  `taking-fixed-in-place`) that `@sharpee/story-loader` maps to the internal
  `if.action.*` id, mirroring the event-selector Interface Contract 2
  (`catalog.ts`). The ACL is specified in **ADR-255**. The `chord-language.md`
  §5.2/§5.3 override sections and the website `chord/guide` pages must be
  updated to teach the ACL kebab name in place of the dotted id — **after
  ADR-255 lands**, so they present the replacement, not a hole.

## Session

Session 74219a (2026-07-22, branch chord-foundations). Scope (all labels, one
rule) and sequencing (own ADR, before ADR-253) ruled by David directly.
Grounded against `packages/chord/src/parser.ts` (`readDottedKey`, 15 sites),
ADR-231, and all `.story` sources (fernhill, friendly-zoo, cloak). Surfaced
mid-ADR-253 design when the `estate.clock` event key prompted the ruling that
dotted labels do not fit Chord. Both open questions resolved by David directly
in the same session's interview: no platform-event carve-out (Chord never
references platform events with dotted keys — verified zero `.story` usage);
grammar change and story migration land atomically.
