# Chord 4.0.2 gaps, from the primer

**Written**: 2026-11-16
**Source**: `../sharpee/docs/work/chord-primer/CHORD-PRIMER.md` (pinned to Sharpee 5.6.1 · Chord 4.0.2, committed in `../sharpee` as `c0f2a552f`)
**Purpose**: one list of everything the primer says Chord 4.0.2 cannot say, does silently wrong, or does unexpectedly, for whoever plans the next Underground port.

A gap here is a place where the language or its tools fall short of what a story needs. Chord's deliberate rules (no `if`, the ownership rule, positive `must` lines) are not gaps; they are listed at the end only so they are not reported as gaps.

## How to read the "Since 4.0.2" column

It names a commit in `../sharpee` that landed after the 5.6.1 / 4.0.2 release (`95bde75e9`, 2026-11-13) and whose subject line appears to address the gap. None of these is published: npm is still at 5.6.1. The match is by commit subject only. Nobody has read the changes or re-run the primer's cases against them.

"Nothing found" means no commit subject since the release mentions it. It does not mean the gap is still open.

## 1. Compiles clean and does the wrong thing

These are the dangerous ones: the compiler is silent.

| # | Gap | What happens at 4.0.2 | Primer's advice | Since 4.0.2 |
|---|---|---|---|---|
| G-1 | `change <thing> to` a platform state (`lit`, `open`, `closed`, `locked`, `on`, `off`, `broken`) | Compiles, the clause runs and prints, the state does not change. `change` writes declared `states:` only | Extend the standard action for a new word (`extend action lighting`) and restyle with `override message` | `d6eb698f9` (#707, ADR-399): `change` to a platform state word writes the trait |
| G-2 | A story action cannot change a platform state | Follows from G-1: a `define action` has no statement that lights, opens, locks or switches anything | Same as G-1. A side effect (a door unlocking because of something else, a light going out on a timer) has no spelling | `d6eb698f9`, if G-1 is fixed |
| G-3 | `pullable` answers one pull | The thing's `on the player pulling` runs once; afterwards "The <thing> has already been pulled." | Do not hang a repeatable response on pulling | `948ac6477` (#706, ADR-398): a thing answers every pull |
| G-4 | `on the player pushing` or `pulling` on a thing without `pushable` / `pullable` | The clause never runs; the game prints "is fixed in place" | Give the thing the trait word the verb needs | `948ac6477` (#706): a pulling or pushing clause alone makes it pullable or pressable |
| G-5 | A person with `define greetings` (or another conversation block beyond a plain topic table) and no character-model line | Compiles gate-clean, then fails at load: "declares conversation blocks but no character model" | Add a model line, for example `mood calm` | Nothing found |
| G-6 | `states: still, tolling, reversible` | Compiles as three states; `, reversible` must go before the colon | Write `states, reversible: still, tolling` | `d0b19f35b` (#709): `reversible` is not a state name |
| G-7 | A trait's `on the player <standard-gerund>` clause (observed, not re-run for the primer) | Silently disables the own `on` and `after` clauses for that gerund on every thing composing the trait | Do not put a standard-action clause on both a trait and its carrier; repeat the line on each thing | `9c9df1b29` (#708, ADR-118 Amendment 1): every binding is consulted, a thing's own clauses first |
| G-8 | `emit` with several words as the event name (observed) | Sends an event nobody listens for. A dotted name is an error | One hyphenated name: `emit media-sound-play with ...` | `58ce321c4` (#713): an `emit` event name is one word |

## 2. Runs, but not the way the words suggest

| # | Gap | What happens at 4.0.2 | Primer's advice | Since 4.0.2 |
|---|---|---|---|---|
| G-9 | `when <thing> moves` (observed) | Fires for a person arriving in a room, not for a thing being taken, dropped or carried | None given | Nothing found |
| G-10 | A timer declared `for <thing>` (observed) | Speaks its named turns only where that thing is | A timer with no `for` belongs to the story and is heard everywhere; its `when <timer> expires` goes in the story header | Nothing found |
| G-11 | `play sound <name>` on every turn (observed) | Also prints "You hear <name>." to a player in earshot | None given | `58ce321c4` (#713, ADR-402): a sound prints only the lines its `define sound` block states |
| G-12 | A room's `first time` text | Replaces the description on the first visit instead of adding to it | Put the exits and anything the player needs in both | Nothing found |
| G-13 | An `on` clause that prints nothing | The standard message still appears; a printed phrase replaces it | Print a phrase when the standard message is wrong | Nothing found |
| G-14 | A `when` suffix on `win` / `lose` | Does not stop the clause; later statements still run | Put a `when` on every line of a two-outcome clause | Nothing found |
| G-15 | A person without `proper` | The game prints "a Morgan" | Add `proper` | Nothing found |

## 3. No way to say it

| # | Gap | Primer's advice | Since 4.0.2 |
|---|---|---|---|
| G-16 | `the story is <state>` as a condition is an error (`analysis.unknown-entity`), though `change the story to <state>` is the correct write | Read the story's state as the bare word (`while calm`) | `a1ff77c5f` (#705, Chord 4.0.3): a condition may say `the story is [not] <state>` |
| G-17 | No condition asks who the player is | Gate on a state of the person | Nothing found |
| G-18 | `is on` does not exist; a thing on a supporter is tested with `is in` | `the brass bell is in the hook` | Nothing found |
| G-19 | A two-noun clause head cannot narrow with `on` (`putting on the hook` is an error) | `after the player putting the hook`; the allowed words are `at`, `for`, `from`, `about`, `in` | Nothing found |
| G-20 | One clause per gerund per thing; two with different `while` gates are `analysis.duplicate-clause` | One clause, branch inside it | Nothing found |
| G-21 | A listed-gerund head (`on the player pushing, touching`) cannot carry a phrase with an inline body (`analysis.duplicate-phrase`) | Declare the phrase in `define phrases` | Nothing found |
| G-22 | `before the game starts` takes no `phrase` | Opening text is the header's `prologue:` | Nothing found |
| G-23 | No end-of-line comment and no comment inside a block | `##` lines at column 1 between top-level constructs, blank line on both sides | Nothing found |
| G-24 | Strings have no escapes | None given | Nothing found |
| G-25 | The acting statement (`Hobb gives the hush page to Ansel`) is not legal in an `on` clause | Use it in `after`, `when`, `on every turn` or a conversation row | Nothing found |

## 4. Tools

| # | Gap | Primer's advice | Since 4.0.2 |
|---|---|---|---|
| G-26 | The published `sharpee play` prints no title and no prologue | It is the CLI, not the story | `8855d46d8` (#704): `sharpee play` shows a story's prologue and banner |
| G-27 | A test `states` assertion on `lit` fails with "declares no states" | Assert on the printed text for light | Nothing found by subject; may follow from `d6eb698f9` |
| G-28 | A test file not in canonical form (two-space indent, sorted keys, trailing newline) is refused | Write it with a script that sorts keys | Nothing found |
| G-29 | Derived tests the runner could not arrange are listed as SKIPPED and do not fail the run | None given; a skipped derived test proves nothing | `20def2d31` (#715) mentions derived tests arranging action guards; scope unknown |

## 5. What the primer does not cover

The primer names these as existing and large, and tells the session not to write them from memory: shaped conversation (`define exchange`, `define conversation`, `define manner`, `define initiative`), the character model (`feels`, `knows`, `thinks`, personality words) and principles (`never`, `protects`, `temperament`). A port that needs any of them needs a working example from the owner first.

It also names opt-in header lines without describing them: `use chapters`, `use combat`, `use hunger`, `use expanses`, `use sailing`.

Word lists and one-line spellings in the primer come from the 4.0.2 grammar file and were not each run.

## 6. Deliberate rules, not gaps

Listed so a port session does not report them as gaps or work around them.

- No `if`, `else`, variables or loops other than `each`. Control is `must`, `refuse when`, a `when` suffix, `select` and ordinal blocks.
- Ownership: an action never asks which thing was named (`analysis.slot-identity-test`); a thing's own `on` clause does not answer a story action (`analysis.story-action-on-clause`); a thing answers a new verb through a trait.
- A `define action` may not repeat a standard command's grammar (`analysis.repeats-standard-grammar`).
- `it` only inside a `define trait` body or a `define condition` (`analysis.it-removed`).
- No global flags: a fact lives in `states:` on its owner or in the story header.
- States move forward only unless declared `, reversible` (`analysis.irreversible-state`); a state may not just negate another (`analysis.negated-state`); a story may not declare a platform pair (`analysis.shadow-state`).
- `refuse when not ...` and `must not ...` are errors; a requirement is a positive `must`.
- `after` may not refuse.
- In a `define action`, every refusal and `must` line stands above the first effect statement.

## What this means for the port

- Seven of the eight silent failures in section 1 have a matching fix commit in `../sharpee` that is not yet published. A port on 5.6.1 has to write around them; a port on the next release may not have to.
- G-1 and G-2 are the ones most likely to touch Underground, wherever a 1979 verb or event lights, opens, locks or unlocks something by a route other than the plain standard verb. Which verbs those are has not been checked against `extracted/world.json` or the archived `mapping.md`.
