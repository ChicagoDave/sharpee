# ADR-399: `change` to a platform state word writes the trait

**Status**: **ACCEPTED** (David, 2026-11-14, session a788a1. D1 to D5 are his ruling "a" on the design put to him that session; D6 and D7 are his "a" to the two questions that followed the mutation-verification pass, taken as "a" on both; the record was written at his "yes" to "Do you want the ADR written?". The code this record describes was built in the same session under those rulings.)

## Date: 2026-11-14

**Kind**: technical

**Scope**: `packages/chord/src/catalog.ts`, `packages/chord/src/analyzer.ts`, `packages/story-loader/src/platform-state-writes.ts`, `packages/story-loader/src/runtime/statements.ts`, `packages/story-loader/src/build/entity.ts`, and the tests beside each.

## Amends

ADR-231 D5a and the ratchet given it restates, "state adjectives are derivable, never stored". The given stands: a platform state word is still never stored as story state. What changes is who may set the trait's value. D5a gave a story one place to do it, `starts <state>` at build time. This record adds the second, `change <thing> to <state>` at run time, on the same table. ADR-231 otherwise stands.

## Context

GH #707 reported that `change <thing> to <state>` with a platform state word compiled and did not change the platform state. Seen in play on 2026-11-13: a story's own `kindling` clause said `change it to lit` on a lamp, `it is lit` then held, and the dark room stayed dark.

Read in the source on 2026-11-14:

- The statement wrote a story state under the thing's state key and nothing else (`packages/story-loader/src/runtime/statements.ts`, the `change` case).
- An `is <word>` read returned true on that stored value before it asked the trait (`packages/story-loader/src/evaluator.ts`, `symbolHolds`). So the condition and the world disagreed.
- A named thing was already refused at compile time, `analysis.undeclared-state`. The silent case was a target the compiler cannot name: `it` in a trait with no states of its own, `the match`, or an action's slot.
- The table that maps each word to its trait field existed, for `starts <state>` only (`STARTS_STATE_TRAIT_FIELDS` in `build/entity.ts`).

The consequence for an author: a story's own action could not light a light source, mend a breakable thing, or open, lock or switch anything. No standard action un-breaks a thing, so that one had no route at all.

Two stories in the repository wrote the form and meant something else by it: Fernhill's fuse (`change the fuse to lit`) and a gate fixture (`states: shut, open`). On both, the word is the thing's own declared state and no trait is involved.

The alternative weighed was to refuse the form at compile time everywhere. It ends the silent shadow and leaves the gap: a capability the platform has, with no way to say it in a `.story` file.

## Decision

**D1. The words.** `change` takes the nine `starts` words (`open`, `closed`, `locked`, `unlocked`, `on`, `off`, `lit`, `unlit`, `broken`) and `whole`, which no initializer needs because a breakable thing begins whole. `worn` and `attached` are not among them: each needs a second thing, a wearer or an anchor. The compiler's list is `CHANGE_STATE_PAIRINGS` in `packages/chord/src/catalog.ts`.

**D2. A declared state wins the word.** Where the thing declares the word as a state, on its own `states:` line or through a trait it composes, `change` is the story-state write it always was, and no trait is touched.

**D3. Otherwise the word writes the paired trait's field, and no story state is stored.** `starts` and `change` read one table, `PLATFORM_STATE_WRITES` in `packages/story-loader/src/platform-state-writes.ts`. A test pins that the compiler's list and the loader's table hold the same words under the same trait names.

**D4. It is the author's say, as `starts` is.** No key, fuel or power check is made and no event is emitted. The clause's own phrase says what happened. A story that wants the standard action's checks uses the standard action.

**D5. A thing without the trait is an error, never a shadow.** At compile time it is `analysis.change-state-pairing`, naming the trait to compose, for a named thing and for each composer of a trait whose body says `it`. Each composer is judged by its own states, so one that declares the word does not excuse one that does not. A door carries `openable` by construction and needs no word. For `the match` or a slot, which name no thing at compile time, the statement stops the turn as a failed command whose reason names the trait.

**D6. A thing may not declare a word of a state trait it carries.** A thing that carries `openable` and declares `open` on a `states:` line, its own or a composed trait's, is `analysis.shadow-state`. Without this, D2 and D3 meet badly: `change … to closed` would write the trait while the stored `open` still answered `is open`. This is the one-word case of the existing gate, which refused only a thing that declared both words of a pair. A census of the repository's 412 `.story` files on 2026-11-14 found no such thing.

**D7. The switch and the flame of a switchable light move together.** On a thing that is both `light-source` and `switchable`, each of `on`, `off`, `lit` and `unlit` writes both fields, as the standard switching actions do. `change the torch to lit` then leaves a torch the player can switch off, and `change the torch to on` lights one that started unlit. A plain flame and a plain switch are unaffected. `starts` shares the table, so `starts lit` and `starts on` on a switchable light set both fields too.

## Consequences

- A story verb can light, extinguish, open, close, lock, unlock, switch, break and mend. `whole` gives the un-break no standard action has.
- A condition and the world cannot disagree about a platform state: there is one store, the trait, and D6 refuses the story that would make a second.
- A future session that finds `change … to lit` writing a trait has found this record's behaviour, not a defect. Returning the write to story state, or refusing the form, reverses D3 and needs a record of its own.
- A story that composed a state trait and also declared one of its words would no longer compile (D6). None exists in the repository's story files.
- Of 23 switchable light sources in the repository's story files, one carries a `starts` word D7 touches (`docs/work/john-chord-samples/no-signal-home.story`, a flashlight, `starts on`). It was already lit through the switch, so what it shows does not change.
- Four other readers of the `change` statement still treat it as a story-state write, and one sibling gate lags. Filed, not fixed here: GH #734 (the claims cone), #735 (pins and arrange know six of the ten words), #736 (the derived runner's fact key and its refusal check), #737 (world-index does not count a remote writer), #738 (`starts open` on a door is refused without the word `openable`).
- The Chord manual's Part IV snapshot still carries its workaround for #707, and the Chord guide does not yet describe the statement's second meaning.
- There is no grammar or EBNF change. Chord's working number stays 4.0.3.
- Dungeo is TypeScript and writes no `change` statement. Its walkthrough chain was run once on the final bundle: 949 passed.

## Session

a788a1, 2026-11-14, on `main`, under the Chord manual plan's Phase 1 (defects fixed in `packages/`, design to David first). Closes GH #707.
