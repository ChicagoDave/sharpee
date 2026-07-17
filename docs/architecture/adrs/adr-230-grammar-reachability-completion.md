# ADR-230: Grammar Reachability Completion — closing the parser gap ADR-229 assumed closed

## Status: ACCEPTED (2026-07-16 — all five open questions ruled by David via interview, session 907f28)

## Date: 2026-07-16

> Successor to ADR-229. ADR-229's Consequences claim "every wired action
> is reachable (R3)" — but R3 fixed only the named instance (talking);
> no registry-vs-grammar sweep was ever run. The stdlib-reference
> documentation passes (sessions 2c43df, 4685f3) ran that sweep by hand
> and found the claim false today. This ADR records the full gap
> inventory, decides the mechanical closure, and — the durable part —
> pins reachability with a load-time-style gate so the class of gap
> cannot silently recur. It also carries two adjacent language-surface
> rulings that belong to the same decision family: the verbs.ts synonym
> lists and the dotted-phrase-key parser/EBNF disagreement.

## Context

Parsing is grammar-rule-driven: an action is player-reachable iff some
pattern in `packages/parser-en-us/src/grammar.ts` (or story grammar)
maps to its id. The lang-en-us verb declarations (`verbs.ts`) are
help/docs metadata only — they do not parse. The D5 descriptor registry
(`packages/stdlib/src/actions/lifecycle/registry.ts`, ADR-228) knows
every wired action; nothing today asserts that the registry and the
grammar agree.

The two-session sweep (all items verified against grammar.ts and/or the
CLI bundle) found:

**Wired but unreachable — no core grammar maps to the action id (5):**

| Action | Note |
| --- | --- |
| `if.action.locking` | `lock` is not understood at all (CLI-verified) |
| `if.action.removing` | bare `remove X` → taking_off; `take X from Y with Z` → taking_with; nothing reaches removing |
| `if.action.listening` | verbs declared in lang-en-us, no pattern |
| `if.action.smelling` | verbs declared in lang-en-us, no pattern |
| `if.action.sleeping` | no pattern (session 4685f3, Phase 6) |

**Partially unreachable (1):** keyless `unlock X` does not parse — core
grammar has only `unlock :door with|using :key` (grammar.ts:524).

**Orphan grammar — pattern exists, no stdlib action implements the id (3):**
`if.action.examining_carefully` (grammar.ts:46), `if.action.opening_with`
(grammar.ts:535), `if.action.cutting` (grammar.ts:543). All three parse
and then fail at runtime as not-understood.

**Correction on the record:** `hiding` was flagged unreachable in the
Phase-1 checklist; that was wrong — grammar.ts:878-905 has hide/duck/
crouch + reveal patterns. Corrected in session 4685f3; future audits
should not re-open it.

**Adjacent gap A — verbs.ts synonyms don't parse.** lang-en-us verb
lists include synonyms with no grammar behind them (shut, cover, secure,
unwrap, uncover, check, view, observe, find, locate, tug, swallow,
activate, start, deactivate, stop, break, smash, destroy, …). Because
the lists feed help/docs, every such entry advertises a phrasing the
parser rejects. Systemic; needs one decision, not per-verb patches.

**Adjacent gap B — dotted phrase keys.** The Chord EBNF says
`phrase-key = WORD { "." WORD }`, but the phrase parser truncates at the
first dot: `define phrase if.action.taking.fixed_in_place` parses
gate-clean and silently registers key `if`. One side is wrong.
Consequence today: Chord has no story-wide override of platform message
text; per-entity on/after clauses are the only route.

## Decision

### D1: Reachability becomes a pinned invariant, not a consequence claim

A registry-vs-grammar gate is added to the **stdlib unit test suite**
(ruled by David, 2026-07-16 — same home and pattern as the D5 fs-scan
gate, `tests/unit/actions/lifecycle-registry.test.ts`; parser-en-us
exposes its pattern→action-id mapping for the test to consume):
derive the set of action ids reachable from core grammar (export or
introspect the pattern→id mapping from parser-en-us), then assert

```
D5-registry ⊆ grammar-reachable ∪ documented-exceptions
```

The documented-exceptions set starts as `{ if.action.entering_room,
if.action.deadly_room_death }` (internal redirect targets, by design not
player-typeable) and lives next to the gate with a comment per entry.
The gate also asserts the inverse for orphans: every grammar-mapped
`if.action.*` id resolves to a registered action, with its own
exceptions list if any orphan is deliberately retained. Adding an action
without grammar, or grammar without an action, fails the build from then
on.

### D2: The five unreachable actions and keyless unlock get mechanical core grammar

Each gains core patterns at standard priority (100), mirroring the
ask/tell/talk precedent from ADR-229 R3. Pattern table (ruled by David,
2026-07-16 — accepted as proposed, bare `sniff` included; keyless
lock/unlock forms are safe because `validateKeyRequirements`
(lock-shared.ts) already refuses with `no_key` when the lockable
requires a key):

| Action | Proposed patterns |
| --- | --- |
| locking | `lock :target`, `lock :target with\|using :key` |
| unlocking | `unlock :target` (keyless form added alongside the existing keyed form) |
| removing | `remove :item from :container` (bare `remove X` stays with taking_off) |
| listening | `listen`, `listen to :target` |
| smelling | `smell`, `smell :target`, `sniff`, `sniff :target` |
| sleeping | `sleep` |

### D3: Orphan ids are dispositioned — one remap, two real implementations (ruled by David, 2026-07-16)

"Parses then runtime-fails" is not an allowed steady state; the D1 gate
enforces the dispositions below.

**D3a — `look [carefully] at :target` remaps to `if.action.examining`.**
The phrasing survives; the adverb adds nothing a separate action would
honor. `if.action.examining_carefully` disappears from grammar.

**D3b — `open :target with|using :tool` remaps to `if.action.opening`
with an `.instrument()` tool slot** — the ADR-229 R2 precedent
(locking/unlocking key slot), not a separate action. The tool is
author-configurable by mirroring the lockable key pattern:
`OpenableTrait` gains tool fields (shape analogous to Lockable's key
config — a declared tool requirement, validated in `validate()`, with
wrong-tool/no-tool refusal messages). An openable with no tool
requirement ignores an offered tool exactly as a keyless lockable
ignores keyless `lock`. The opening descriptor gains a second
consultable slot for the tool, published order target → tool (D3-B
ordering discipline).

**D3c — `cut :object with|using :tool` keeps its id and `if.action.cutting`
becomes a real stdlib action.** New `CuttableTrait` carries the
author-configured tool requirement (same lockable-key-mirroring shape);
a non-cuttable target refuses, a cuttable target with the wrong/missing
tool refuses, a correct tool succeeds. Full citizen: lifecycle
descriptor (target → tool), lang-en-us messages, Chord catalog surface
analogous to `lockable with key X`. Interceptability comes free from the
lifecycle engine — no separate dispatch-only mode.

**Success semantics (ruled by David, 2026-07-16, post-review):** the
stdlib cutting action performs NO mutation of its own. `CuttableTrait`
gates eligibility (only a cuttable entity can be cut) and carries the
tool requirement; the actual cut outcome is a **registered behavior on
each cuttable direct object** (capability dispatch, ADR-090 — behaviors
own mutations, actions coordinate). Rope → pieces, cake → slices,
wire → disarmed trap: each is that entity's registered implementation,
not platform policy. A cuttable entity with no registered cut
implementation is an authoring error, surfaced at load time where the
surface allows it (Chord's `cuttable` syntax should require the
implementation clause, D5-gate philosophy) rather than silently
no-opping at runtime.

### D4: Every verbs.ts synonym is promoted to grammar (ruled by David, 2026-07-16)

The verb lists are the author/player-facing contract; the parser grows
to meet them — no trimming. Concretely:

- Synonyms that alias an existing action get grammar mapping to it
  (shut → closing; view/observe/check → examining; swallow → eating;
  activate/start → switching on; deactivate/stop → switching off;
  tug → pulling; break/smash/destroy → attacking; …).
- Synonyms with no existing action behind them (find, locate, unwrap,
  uncover, cover, secure, …) get either a defensible alias mapping or a
  new stdlib action — the implementation plan must produce the complete
  verb → action-id mapping table as a deliverable, and any new action
  arrives as a full citizen (descriptor, lang messages, D5 registration).
- Enforcement joins the D1 gate: derive the declared verb list from
  lang-en-us `verbs.ts` and assert every entry is reachable through some
  grammar pattern. The help surface can never advertise a phrasing the
  parser rejects again.

### D5: The parser is fixed to honor the EBNF — dotted keys register whole (ruled by David, 2026-07-16)

`phrase-key = WORD { "." WORD }` stands; the phrase parser's
first-dot truncation is a bug and is fixed. `define phrase
if.action.taking.fixed_in_place: "…"` registers the full dotted key,
opening story-wide Chord overrides of platform message ids — parity
with what TS stories can do through the lang layer.

Scope note: registering the key is half the feature. Implementation
must verify (and wire if absent) the resolution path — the message
renderer consults story-registered phrases for action message ids
before falling back to lang-en-us templates. If that path doesn't
exist, D5 delivers parser fix + resolution wiring together; a dotted
key that registers but never resolves would just be a quieter version
of today's bug.

## Consequences

- ADR-229's "every wired action is reachable" consequence becomes true
  and *stays* true mechanically — this class of gap recurred across two
  sessions precisely because nothing pinned it.
- parser-en-us likely needs to expose its pattern→action-id mapping for
  the gate; that export is new public surface and should be minimal.
- The stdlib reference (`docs/reference/stdlib-reference.md`) documents
  the current gaps honestly (§2.3 removing, §4 locking/keyless-unlock,
  §6 listening/smelling, §10 sleeping, dotted-key note in §2 intro). A
  doc touch-up pass is owed after the fixes land, plus a site re-render.
- New grammar is cross-story parser surface: verify with the dungeo
  walkthrough chain (one good run = baseline) and the unit transcripts.
- D5 opens story-wide platform message overrides in Chord — a new
  author capability that chord-language.md's phrase section and the
  stdlib reference's §2 intro (which currently teach the opposite) must
  document once it lands.
- D3 grows the platform surface: cutting is a NEW action + trait (D5
  registry grows by one; lang-en-us gains a cutting file; Chord catalog
  gains cuttable/tool syntax to be specified at implementation), and
  opening gains a consultable tool slot (existing `on opening it`
  registrations unaffected; a tool-side registration becomes possible).
  Both need the standard pinning-test treatment (slot order, veto,
  no-consultation-when-absent) per the R2 template.
- Out of scope, recorded for the plan: loader container+`with key` drop,
  pulling/restarting lang drift, dead message IDs, chord-language.md
  death section (ADR-227 owns that decision).

## Session

Session 907f28 (2026-07-16, chord-foundations). Gap inventory produced
and verified in sessions 2c43df and 4685f3 during the stdlib-reference
documentation passes; ADR drafted on David's direction after the
pre-session audit flagged the backlog as recurring-unactioned.
