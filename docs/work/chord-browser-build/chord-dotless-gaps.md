# Chord dotless gaps — surfaced by the ADR-254/256 doc sweep (2026-07-23)

> **RESOLVED (2026-07-23):** item 1 (chain-handler replacement) is fixed by a new
> **`define chain <alias> from "<module>"` hatch** (ADR-094) — David's call: "go
> the whole way." A Chord author now replaces a stdlib chain via the escape-hatch
> mechanism (the module default-exports an `EventChainHandler`; the loader
> registers it under the stdlib chain key, replacing it in place). Curated alias
> `opened-revealed` (chord `STDLIB_CHAIN_NAMES` → story-loader `CHORD_CHAIN_MAP`,
> conformance-pinned to `OPENED_REVEALED_CHAIN_KEY`); unknown alias =
> `analysis.unknown-chain`; a chained story is not browser-pure. chord 474 +
> story-loader chain tests green. The docs no longer show the dotted
> `stdlib.chain.*` key — authors use the dotless alias. Items 2 (combat) and 3
> (outcome) were doc cleanups, done. The original write-up is kept below.

---


The Phase 5 "fully dotless" documentation sweep (session 9a9ec9) removed every
dotted platform id (`if.action.*`, `if.event.*`) from author-facing Chord pages.
Three non-`if.*` dotted namespaces remained. Grounded against source below: **one
is a genuine Chord API gap, one is resolvable, one is platform-reference only.**

## 1. Chain-handler replacement — GENUINE GAP (needs a ruling / ADR)

**What.** stdlib ships *chain handlers* — post-action reaction rules keyed by a
dotted string, e.g.:

```ts
// packages/stdlib/src/chains/opened-revealed.ts:22
export const OPENED_REVEALED_CHAIN_KEY = 'stdlib.chain.opened-revealed';
//  "Key for this chain — allows stories to replace the stdlib behavior"
```

The `opened-revealed` chain reacts to the platform `opened` event and emits a
`revealed` event (a container's contents line). The docs (stdlib-reference.md,
the containers page) tell authors: *"a story that wants a different reveal, or
none, replaces that chain by its key."*

**The gap.** That replacement key is **dotted (`stdlib.chain.opened-revealed`)
and TypeScript-only.** There is:
- no ACL alias for chain keys (the ADR-255 catalog is `<action>-<message>`
  message aliases only — grep `stdlib.chain` / `chain` in `packages/chord/src`
  and `packages/story-loader/src` returns nothing);
- no Chord construct to replace or disable a chain handler.

So a **dotless Chord author cannot do what the docs describe** — chain
replacement is a TypeScript-story capability with no Chord surface. Under
ADR-254 the author cannot even *write* the dotted key.

**Options for a ruling:**
- (a) Add a Chord construct — e.g. `replace chain <kebab-key>` / `disable chain
  <kebab-key>` — with a curated kebab ACL for the stdlib chain keys (mirrors the
  ADR-255 message-alias pattern; the map would be `opened-revealed` →
  `stdlib.chain.opened-revealed`).
- (b) Rule chain replacement **out of Chord scope** (a TypeScript-story-only
  advanced feature) and change the author docs to say so, rather than implying a
  Chord author can do it.
- (c) Reframe the specific `opened-revealed` case as an author-reachable seam
  through existing Chord (e.g. an `on/after opening` hook or a channel), if one
  suffices, and drop the chain-key language.

**Doc state meanwhile.** `stdlib.chain.opened-revealed` still appears (dotted) in
`website/src/app/chord/stdlib/containers/opening-and-closing/content.mdx` and
`docs/reference/stdlib-reference.md`. Left as-is pending the ruling — not invented
a dotless form, per "raise Sharpee API gaps for Chord."

## 2. Combat messages — NOT a gap (resolvable; convert the doc refs)

The attacking page references "the `combat.*` message families." These **are
overridable** — the ADR-255 catalog already carries 28 combat aliases
(`attacking-combat-attack-hit`, `attacking-combat-already-dead`, …). So the
author-facing form is the alias family **`attacking-combat-*`**, and the doc's
`combat.*` reference should simply be converted (a one-file cleanup, not a gap).

## 3. Outcome events (`game.lost` / `game.won`) — platform-reference only

`GAME_LOST: 'game.lost'` / `GAME_WON: 'game.won'` are **engine event ids emitted
by `engine.stop()`** (`packages/stdlib/src/channels/standard.ts:70`), surfaced to
players through the `death`/`endgame` channels. An author never emits them; the
death page references `game.lost` only descriptively. This is the same category
as `if.event.*` — a platform event id, reference not syntax. Either dotless it
for consistency (`game-lost`) or leave it as a platform-event reference; no
author capability is missing, so it is **not** a gap.

## Recommendation
Only **(1) chain-handler replacement** warrants a decision — it is a real
author-capability gap the docs currently overstate. Suggest an ADR (or an
ADR-256 amendment) choosing option (a)/(b)/(c). Items (2) and (3) are doc
cleanups, not gaps.
