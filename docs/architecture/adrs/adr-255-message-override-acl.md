# ADR-255: Standard-action message override via a curated kebab ACL

## Status: ACCEPTED (2026-07-22, session 818d28) — seven decisions ruled by David directly via the open-questions interview: dedicated `override message` / `override messages <locale>` constructs (D1, D2) with full `define phrase` body parity (D1); hand-maintained catalog on the `<action>-<message-key>` convention (D2 + Q-4a); all standard messages overridable (D3); Interface-Contract-3 split (D4) with loader-side completeness pinning (D5); story-wide-default precedence (D6); full 734-alias catalog authored in the companion appendix (D7). All Open Questions resolved (section removed); `adr-review` clean after three fixes (stale status line, missing Acceptance section, decision ordering). Not implemented.

## Date: 2026-07-22

## Parent: ADR-254 (Chord single-token labels). ADR-254 removes the dotted **spelling** `define phrase if.action.taking.fixed_in_place`; this ADR restores the **capability** it superseded (ADR-231 D1b) behind a curated kebab anti-corruption layer, so the raw dotted platform id never appears in a `.story`. Extends the ACL pattern of `catalog.ts` "Interface Contract 2" (event selectors) to action messages. Blocks the `chord-language.md` §5.2/§5.3 + website `chord/guide` doc sweep, which must teach the ACL name this ADR defines rather than the dotted id.

## Context

Before ADR-254, a Chord story overrode a platform standard-action message
story-wide by defining a phrase under the message's raw dotted id:

```story
define phrase if.action.taking.fixed_in_place
  It will not budge, and neither will anything else bolted to this place.
end phrase
```

ADR-254 makes `.` illegal in every label, so that spelling no longer parses.
The **need** is real (an author wants "It won't budge" in their own voice), but
the raw id (`if.action.taking.fixed_in_place`) is a platform internal that a
Chord author should never type — it leaks stdlib structure into the story
surface and is exactly the coupling ADR-254 set out to remove.

Chord already solves this shape for **events**. `catalog.ts` (header:
"Interface Contract 2") holds the *curated language-side names* — event verbs,
kind nouns, and client-capability flags that map mechanically to platform
camelCase (`split-pane` → `splitPane`, `capabilityKeyOf`). The *platform-side
dotted bindings* (`if.event.*`) live in `@sharpee/story-loader`, "keeping the
compiler platform-free." An author writes a bare curated selector; the loader
resolves the dotted id.

**The overridable id set.** Every standard-action message is a per-action key in
`packages/lang-en-us/src/actions/<action>.ts` (`taking.ts` → `fixed_in_place`,
`already_have`, `too_heavy`, `cannot_take`, …), assembled as
`if.action.<action>.<key>` (`language-provider.ts:196`). "All standard messages
overridable" (D3) means the ACL must cover this entire set — and stay complete
as stdlib grows.

## Decision

### D1 — A dedicated `override message` construct (ruled by David)

An author overrides a standard-action message with a curated kebab **alias**, in
a dedicated block — never `define phrase`, never a dotted id:

```story
override message taking-fixed-in-place
  It will not budge, and neither will anything else bolted to this place.
end override
```

The dedicated form is self-documenting (the reader sees "this overrides a
platform message"), and it isolates the ACL alias namespace from story-defined
phrase keys, so there is no collision-with-`define phrase` question to resolve.

**Full `define phrase` parity (Q-1, ruled by David).** `override message` accepts
the *entire* `define phrase` body grammar — `, cycling` and other strategies,
`or`-separated variants, `with <name> = <value>` parameters, and description
markers — not just flat text. A standard message can therefore rotate,
randomize, or splice generated text story-wide, giving the author full story-logic
customization of platform prose:

```story
override message taking-fixed-in-place, cycling
  It will not budge.
or
  You heave, but it stays bolted to this place.
end override
```

Mechanically the override body **is** a phrase body bound to a platform message
alias instead of a story key — the parser reuses the `define phrase` body reader,
so the two constructs never drift.

**Two forms, mirroring `define phrase` / `define phrases` (Q-2, ruled by David).**
The override construct has both a singular and a locale-block form, exactly
paralleling the phrase constructs:

- **`override message <alias>` … `end override`** — one alias with the full
  phrase body (variants/strategy/parameters/markers), as above. Locale-agnostic,
  like `define phrase`.
- **`override messages <locale>`** — a locale block of many `alias:` → flat-text
  entries, dedent-terminated (no `end`), the localizable catalog form, exactly
  like `define phrases <locale>`. Per-entry text is flat (no per-entry strategy),
  matching `define phrases`.

```story
override messages en-US
  cant-take-fixed:
    It will not budge.
  already-have-it:
    You are already holding it.
```

A multi-locale story overrides per language through the block form; a
single-locale story can use either. Both forms resolve to the same alias →
`if.action.*` binding (D4); the locale block simply carries a locale the loader
routes on.

### D2 — Hand-maintained catalog, `<action>-<message-key>` naming convention (ruled by David: D2 + Q-4a)

Alias names are a **hand-maintained** catalog — a curator owns it and D5 pins its
completeness; it is never silently auto-generated — following one uniform
convention: **`<action>-<message-key>`**, the action segment plus the message
key with underscores kebabbed.

```
taking-fixed-in-place   → if.action.taking.fixed_in_place
taking-already-have     → if.action.taking.already_have
wearing-already-worn    → if.action.wearing.already_worn
```

The action prefix keeps every alias 1:1 with the platform id and free of
cross-action collision — a bare `already-have-it` could come from taking *or*
wearing; the scoped form cannot. The kebabbed message key is the default alias
text; a curator may polish a genuinely cryptic key, but the action scope is
invariant.

`kebab` replaces **both `_` and `.`** — a message key can itself be internally
dot-namespaced (`attacking`'s combat keys are `combat.attack.hit_heavy`,
`combat.health.dead`, …), and the alias must be a single dotless kebab token
(ADR-254), so `if.action.attacking.combat.attack.hit_heavy` →
`attacking-combat-attack-hit-heavy`. Empirically the `<action>-` prefix plus
full kebabbing yields **zero collisions** across the whole catalog (D7).

> **Reconciliation (session 818d28).** This decision merges two answers that
> emphasized different axes. The D2 question settled *ownership* — a
> hand-maintained, completeness-pinned catalog rather than an unowned mechanical
> generation. Q-4a settled *naming style* — systematic action-scoped, chosen
> once full coverage (D3) made cross-action ambiguity the deciding constraint,
> over the friendlier-but-ambiguous `cant-take-fixed` phrasing. The result is a
> hand-owned catalog that follows the action-scoped convention; D2's original
> "decoupled, not a de-dot" framing is superseded by the action-scoped form.

### D3 — Every standard-action message is overridable (ruled by David)

The ACL exposes an alias for **every** `if.action.<action>.<key>` in lang-en-us.
There is no "vetted subset" wall; if stdlib emits it, an author can override it.

### D4 — Split across the Interface-Contract seam (design)

Mirrors Interface Contract 2 exactly, as a new **Interface Contract 3**:

- **`@sharpee/chord`** (`catalog.ts`) holds the *set of valid alias names* — the
  closed vocabulary the analyzer checks `override message <alias>` against. Names
  only; no dotted ids, so the compiler stays platform-free.
- **`@sharpee/story-loader`** holds the *alias → `if.action.*` mapping* — the
  platform binding side.
- An `override message <alias>` where `<alias>` is not in the catalog raises
  `analysis.unknown-message-alias` (mirrors `analysis.unknown-channel`).

### D5 — Loader-side completeness pinning (design)

A conformance test (like the one pinning `CLIENT_CAPABILITY_FLAGS` against the
platform flag set) asserts the alias catalog is a **total bijection** with the
live lang-en-us message-id set: every `if.action.<action>.<key>` has exactly one
alias, and every alias maps to a real id. A new stdlib message without an alias
**fails the build** — completeness is mechanically enforced, not curated by
vigilance. This is the guardrail that makes "hand-curated aliases" + "full
coverage" safe together.

### D6 — An override is a story-wide *default*, not a flat replacement (Q-3, ruled by David)

`override message` replaces **only the platform baseline**; the more specific
routes still win. The loader resolves a standard-action message in this order,
most-specific first:

1. the `on` clause's own refusal (§3.6),
2. the per-entity `phrase <key>:` override (§2.10),
3. the story-wide `override message <alias>` (this ADR),
4. the platform default (lang-en-us).

This preserves the precedence the superseded dotted form had: a global "It won't
budge" rewrite sets the baseline without stomping a bespoke per-entity line. The
loader's resolution order is pinned by test alongside D5's completeness check.

### D7 — The full catalog is authored with this ADR (Q-4b, ruled by David)

The complete alias set — one `<action>-<message-key>` alias for **every**
`if.action.<action>.<key>` in `@sharpee/lang-en-us` — is authored now, before
implementation, in the companion appendix
[**adr-255-alias-catalog.md**](adr-255-alias-catalog.md). Enumerated
deterministically from the built `lang-en-us` action modules. The authoring pass
counted **54 actions, 734 aliases**; Phase 2 implementation (session 448562)
found the live set had since grown to **56 actions, 748 aliases** — the appendix
predated `cutting`/`digging` (ADR-230, 7 messages each). Per D3 (all overridable)
and D5 (bijection with the LIVE set) the shipped catalog covers all **748**; the
appendix was regenerated to match. **0 cross-action collisions.** D5's
completeness test pins the shipped `catalog.ts` alias set and the `story-loader`
mapping against the live message ids, so any drift fails the build.

> **Note (session 448562).** The Acceptance worked example below cites the alias
> `wearing-already-worn`; the live `wearing` action's key is `already_wearing`
> (alias `wearing-already-wearing`) — `already_worn` never existed. The catalog
> is generated from live, so the real alias is `wearing-already-wearing`; the
> example's intent is unchanged.

## Acceptance

**Worked example.** A story softens taking's fixed-in-place refusal and localizes
another message:

```story
override message taking-fixed-in-place, cycling
  It will not budge.
or
  You heave; it stays bolted to the floor.
end override

override messages en-US
  wearing-already-worn:
    You are already wearing it.
```

`take statue` on a scenery statue renders the (cycling) override text; a statue
whose own `on taking` clause refuses still speaks its bespoke line (D6).

**Done when:**
- `override message <alias>` and `override messages <locale>` parse, reusing the
  `define phrase` body reader (D1); the IR carries the alias and its resolved
  `if.action.*` id.
- An `override message` whose alias is absent from `catalog.ts` raises
  `analysis.unknown-message-alias` (D4) and the compile fails.
- The `@sharpee/story-loader` completeness test (D5) passes: the alias catalog is
  a total bijection with the live lang-en-us message ids; adding a stdlib message
  without an alias fails the build.
- Resolution honors D6 precedence (on-clause refusal → per-entity phrase →
  `override message` → platform default), pinned by test.
- The companion catalog (D7) matches the live message set: 734 aliases, 0 dotted
  aliases, 0 collisions.

## Consequences

- **The ADR-254 doc/website sweep unblocks with a replacement to teach.**
  `chord-language.md` §5.2/§5.3 and the `chord/guide` pages move authors from
  `define phrase if.action.*` to `override message <alias>` — a rewrite, not a
  deletion.
- **A new closed vocabulary to maintain**, but its completeness is pinned (D5),
  so drift fails CI rather than shipping a gap.
- **The `.story` surface stays platform-free** — no author ever types
  `if.action.*`; Interface Contract 3 keeps the dotted ids on the loader side.
- **One-time curation cost**: the full 734-alias catalog is authored now in the
  D7 appendix ([adr-255-alias-catalog.md](adr-255-alias-catalog.md)); the ADR-254
  doc/website sweep depends on it presenting a complete story.

## Session

Session 818d28 (2026-07-22, branch main). Emerged from the ADR-254 work: the
"drop the override capability" reading was corrected by David to "keep it behind
an ACL so authors never touch the raw ids." Three shaping decisions (construct,
naming, scope) ruled directly; grounded against `catalog.ts` (Interface Contract
2), `@sharpee/story-loader`, and `packages/lang-en-us/src/actions/*.ts` (the
message-id set). Open Questions to be resolved by interview before the DRAFT →
ACCEPTED flip.
