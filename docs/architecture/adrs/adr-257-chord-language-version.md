# ADR-257: Chord language version

## Status: ACCEPTED (2026-07-23, session 9a9ec9 — all Open Questions resolved via the adr-interview, then adr-review (15/17 → fixes folded: `## Acceptance` section added, IR-stamping site + CLI files named, `StoryIR.languageVersion` placement pinned). Direction from David: "Chord as a language is 1.0.0 (unclear how we set/track that)." This ADR gives the language its own semantic version, independent of the `@sharpee/*` lockstep. Resolutions: Q1 (CLI surface) → a one-line `Sharpee X · Chord Y` (D4); Q2 (IR-field contract) → informational, via D3's A/B breaking-change split; Q3 (governance) → an enforced `chord.ebnf` surface pin (D5). Not implemented.)

## Date: 2026-07-23

## Parent: ADR-210 (Chord `.story` author language — the compiled Story IR is the single product of a `.story`; Chord is interpreter-primary, IR-centric). Relates to ADR-232 (Chord-first web presence — Chord is a product in its own right). Interacts with the lockstep release strategy (`release-strategy-v1.5-v2.0`) and the `IR_FORMAT` wire stamp (`packages/chord/src/ir.ts`).

## Context

Chord has **three** version-like numbers today, and none of them is the
version of *the language*:

| Number | Value (2026-07-23) | Role |
| --- | --- | --- |
| `@sharpee/chord` **package** version | `3.3.0` | the compiler's npm version — bumped in **lockstep** with the whole platform on every release |
| IR **format** stamp (`IR_FORMAT`) | `'story language 1'` | a **wire-compat gate**: `packages/story-loader` refuses an IR whose format it does not know. Bumps only on an IR-schema break |
| Chord **the language** | *(none)* | the author-facing semantic version of the language surface — **does not exist** |

When David said *"Chord as a language is 1.0.0,"* it surfaced the gap: the
platform lockstep version (`3.3.0`) is a release artifact that moves with
everything; the IR format is an internal wire integer; neither answers *"which
version of the Chord language is this?"* for an author.

Chord is positioned as a product in its own right — a Chord-first website
(ADR-232), a language reference (`chord-language.md`), a grammar (`chord.ebnf`).
A language shipped as a product deserves its own semantic version, evolving on
its own cadence — which is almost never the platform's release cadence.

## Decision

### D1 — Chord the language has an independent semantic version, starting at 1.0.0

Introduce a **`CHORD_LANGUAGE_VERSION`** constant, value `'1.0.0'`, as the single
source of truth in `packages/chord/src/version.ts`, exported from the chord
barrel. It is **decoupled from the `@sharpee/*` lockstep**: the platform may
march to 3.4, 4.0, … while the Chord language stays `1.0.0` until *the language*
changes. It is **not** stamped by the release tooling (`tsf version` / repokit
`stampVersions`); it is a hand-maintained language fact.

### D2 — Bumped by language-surface change, on semver rules

`CHORD_LANGUAGE_VERSION` moves only when the **author-visible language surface**
changes:
- **minor** (`1.0 → 1.1`): a new construct or an additive, backward-compatible
  syntax change (a story valid at 1.0 is still valid);
- **major** (`1.x → 2.0`): a breaking change — a removed/renamed construct, or a
  syntax an existing story relied on that no longer parses;
- **patch**: reserved for language-doc/spec corrections with no grammar change.

Compiler bug fixes, IR-shape refactors, and platform releases do **not** bump it.

### D3 — "Breaking change" quantified: two independent axes; the loader gates only on the wire

A "breaking change" in Chord is **two distinct events on independent axes**, and
conflating them is the trap this decision closes:

- **(A) Source (compile-time) break** — a `.story` that compiled before no longer
  does: a removed or renamed construct, or changed syntax. Detected by the
  **parser/analyzer at compile**. This is what bumps `CHORD_LANGUAGE_VERSION`
  **major** (D2). Entirely author-/source-facing.
- **(B) IR (wire) break** — the IR *schema* changes so a consumer that read the
  old IR cannot correctly read the new one (a removed/renamed/re-typed field the
  loader depends on). Detected by the loader's **`IR_FORMAT` gate at load**
  (`'story language N'`). This is what bumps `IR_FORMAT`.

The two axes move **independently**:
- A source break can occur with **no** IR break — remove a construct and old
  *sources* fail to compile, but the IR schema is unchanged (the IR simply never
  carries that construct). → language **major**, `IR_FORMAT` untouched.
- An **additive** IR change is not a break at all — a new optional field (exactly
  like `returns` / `messageOverrides` added this session) is a language **minor**
  and does **not** bump `IR_FORMAT`; an old consumer ignores an absent/unknown
  field.
- An IR break bumps `IR_FORMAT` (and is at least a language minor); the format
  stamp is what protects the loader.

**Q2 resolved — `languageVersion` is informational.** The loader consumes **IR,
not source**, so a source break (axis A) never reaches it: a compiled IR is
always internally consistent for whatever Chord produced it. The loader's only
hard compatibility gate is therefore `IR_FORMAT` (axis B). The IR records the
language version as **`StoryIR.languageVersion`** — a top-level, additive field
beside `format` (not inside `meta`, which holds author-declared header fields;
this is a compiler fact) — set from `CHORD_LANGUAGE_VERSION` by the analyzer as
it builds the `StoryIR` (`packages/chord/src/analyzer.ts`, where `format` is
already stamped). It records *which* Chord compiled the story ("Chord 1.0.0")
for tooling and diagnostics, but the loader (`packages/story-loader`) never warns
or refuses on it — there is no loader-detectable break for it to gate that
`IR_FORMAT` does not already own.

### D4 — Surfaced author-facing

`sharpee --version` (the devkit CLI, `packages/devkit/src/cli.ts`) prints the
platform and language versions together on **one line** — `Sharpee 3.3.0 · Chord
1.0.0` — so an author sees the release they installed and the language version
side by side, every time. `sharpee compose` (`packages/devkit/src/commands/compose.ts`)
echoes the Chord language version in its output (`compose: Chord 1.0.0 — …`),
where the language is actually in play. Both read `CHORD_LANGUAGE_VERSION` from
the `@sharpee/chord` barrel (the platform version comes from the sharpee
package.json, as the design generator already does). The language reference
(`chord-language.md` / `chord-grammar.md` headers) states the current language
version. So an author can see and cite "Chord 1.0.0" independent of whatever
`@sharpee/*` release they installed.

### D5 — The bump is enforced by a language-surface pin, not left to discipline

`CHORD_LANGUAGE_VERSION` is guarded by a **conformance-style pin** — the pattern
this repo already uses for the media/event maps, the message-alias catalog, and
the chain map (ADR-094) — so the version cannot silently lag the language. The
pinned surface is **`docs/reference/chord.ebnf`**, the language's maintained,
machine-readable grammar (updated in lockstep with real grammar changes, as this
session's `override message` / channel `return` / `define chain` additions were);
the hand-written recursive-descent parser has no clean enumerable surface to pin
instead. A test asserts the committed grammar's hash matches the hash pinned for
the current `CHORD_LANGUAGE_VERSION`; a change to `chord.ebnf` — an **axis-A
surface change** (D3) — fails the build until the version is bumped and the pin
updated together. The human still chooses **minor vs major** (D2); the pin only
guarantees the version *moves* when the surface does. Internal parser refactors
that leave the grammar unchanged do not trip it.

## Acceptance

**Done when:**
- `CHORD_LANGUAGE_VERSION = '1.0.0'` lives in `packages/chord/src/version.ts` and
  is exported from the `@sharpee/chord` barrel; it is **not** touched by the
  release stamper (`tsf version` / repokit `stampVersions`).
- The compiled IR carries an additive top-level `StoryIR.languageVersion` set
  from that constant; a story compiled today reads `languageVersion: "1.0.0"`.
- `sharpee --version` prints `Sharpee <platform> · Chord <language>` on one line;
  `sharpee compose` echoes `Chord <language>` in its output.
- The `chord-language.md` / `chord-grammar.md` headers state the current language
  version.

**Rejection / edge cases** (each a test):
- **Loader ignores it** — the loader constructs a story from an IR whose
  `languageVersion` it does not recognize (e.g. a future `"2.0.0"`) **without any
  warning or refusal**; only an unknown `IR_FORMAT` is refused (D3, axis B).
- **Surface pin forces a bump** — the `chord.ebnf` pin test **fails the build**
  when the grammar file changes without a `CHORD_LANGUAGE_VERSION` bump, and
  **passes** once the version and the pinned hash are updated together (D5).
- **Refactor is invisible** — an internal parser change that leaves `chord.ebnf`
  unchanged does not trip the pin (no bump required).

## Consequences

- **Chord gains an identity separate from the platform release train.** The
  language version answers a question the lockstep package version never could,
  and it can stay stable across many platform releases.
- **One more version to maintain, by hand.** Deliberately: a language version
  that auto-bumps with the platform would be meaningless. The cost is a
  discipline (Q3) — remembering to bump on a language change.
- **Two version stamps travel in the IR** (`format` gate + `languageVersion`
  marker). A compiled story now records which language version compiled it,
  useful for tooling and for "this story needs Chord ≥ 1.1" diagnostics later.
- **The docs get a version header**, so a reader knows which language the page
  describes — important as the language evolves past 1.0.
- **No platform-package version change.** `@sharpee/chord` stays on the lockstep
  (`3.3.0`); this ADR adds a constant + IR field + CLI/doc surface, not a
  re-versioning of the npm package.

## Session

Session 9a9ec9 (2026-07-23, branch main). Prompted by David's note during the
3.3.0 publish that "Chord as a language is 1.0.0 (unclear how we set/track
that)." Grounded against `packages/chord/src/ir.ts` (`IR_FORMAT = 'story
language 1'`), the `@sharpee/*` lockstep package versions (all `3.3.0`), and the
absence of any language-version constant in the chord barrel.
