# 5.6.2 — the fixes the Chord manual found, and a `play` that shows the whole opening

**Status**: PUBLISHED
**Published**: 2026-11-17
**Chord language**: 4.0.3
**Traces to**: ADR-397 · ADR-398 · ADR-399 · [#704](https://github.com/ChicagoDave/sharpee/issues/704) · [#705](https://github.com/ChicagoDave/sharpee/issues/705) · [#706](https://github.com/ChicagoDave/sharpee/issues/706) · [#707](https://github.com/ChicagoDave/sharpee/issues/707) · [#708](https://github.com/ChicagoDave/sharpee/issues/708) · [#709](https://github.com/ChicagoDave/sharpee/issues/709) · [#710](https://github.com/ChicagoDave/sharpee/issues/710) · [#711](https://github.com/ChicagoDave/sharpee/issues/711) · [#712](https://github.com/ChicagoDave/sharpee/issues/712) · [#713](https://github.com/ChicagoDave/sharpee/issues/713) · [#772](https://github.com/ChicagoDave/sharpee/issues/772)

## What shipped

Writing a manual for Chord meant running every construct the language has, and the ones that did
not behave as written were fixed in the platform. This release carries those fixes. `sharpee play`
now prints a story's prologue and banner, several Chord forms do what their words say, and a claim
is either held or unproven. Chord moves to 4.0.3. It is an interim release: the manual's edition is
pinned to the release after it.

## Details

- `sharpee play` shows a story's prologue and banner, and an ended story says so instead of
  printing an engine error (#704).
- A condition may say `the story is <state>` or `the story is not <state>` (#705).
- A thing answers every pull, and a pulling or pushing clause alone makes it pullable or
  pressable. `PullableTrait` is a marker (ADR-398, #706).
- `change` to a platform state word writes the trait, not a shadow story state, and a thing may
  not declare a word of a state trait it carries (ADR-399, #707).
- Every interceptor binding on an entity is consulted, a thing's own clauses first. `, before
  <trait>` and `, after <trait>` place a clause (#708).
- A forward-only refusal spells the whole `states, reversible:` line, `reversible` is not a state
  name, and `change` is checked on every composer of a trait (#709).
- A manner beat is selected for every line a character speaks and printed before it (#710).
- A line a character speaks to the player on its own turn prints as written, and walking out of a
  conversation closes it that turn with its `on parting` line ahead of the new room (#711).
- A machine's `when <gerund> the <role>` trigger is the thing's answer to the verb, and a refused
  action never advances a machine (#712).
- A sound prints only the `heard:` and `heard from afar:` lines its `define sound` block states,
  and an `emit` event name is one word (#713).
- Every trait that answers a story action now runs, and a refused command spends no firing.
  Derived tests read every platform state word, arrange a gated action and skip removed grammar
  (#772).
- A claim is held or unproven. `violated` and the `never` flag are gone from the claims language,
  the runner and the wire (ADR-397).
- A story's channel panel and shown image are visible on the stock browser page.
- Messages from `sharpee` and from the story loader no longer cite internal decision records.

## Upgrading

- A claims file that states a `never` claim stops compiling. Delete the claim.
- A thing that declares a state word belonging to a state trait it carries stops compiling. Use
  the trait's own word.
- TypeScript that read configuration from `PullableTrait` should treat it as a marker.
