# Mocks for ADR-313's projection format

Concrete files to run adversarial tests against, so ADR-313's Q-1 (the
projection's concrete syntax) gets decided on evidence rather than taste.

Nothing here is implemented or decided. These are mocks of a file that does not
exist yet.

## What is being tested

Whether a file format produced from and back into the tree schema can **also be
a place a person creates a test**, not merely a dump they can edit.

The mechanism it rests on is already in the schema: a card has three states, not
two.

| Card state | Meaning | Verified at |
| --- | --- | --- |
| `assertions` present | "This is what I claim." A replay never overwrites it. | `model.ts:69-72` |
| `skip: true` | Runs and asserts nothing, deliberately. | `tree-walker.ts:512` |
| neither | A **void** — the next whole-path replay fills it. | `model.ts:311-314`, `334-337` |

The void is the authoring affordance. A hand-written test is a projection with
voids in it: the author types commands, leaves claims empty, and the tool fills
them by replaying at the pinned seed. That is why the format needs no provenance
field — "is there a claim yet" is a question the schema already answers, and
"did a human write this claim" is one nothing needs to ask.

## The files

| File | What it is |
| --- | --- |
| `01-fernhill-projected.tests.txt` | Candidate A. The **real** `branch-stories/fernhill/fernhill.tests.json` projected — same claims, same forks, same seed. The round-trip target. |
| `02-fernhill-authored.tests.txt` | The same tree as a person would hand-write it before anything is filled. Every card a void. **15 lines.** |
| `03-fernhill-pruned.tests.txt` | The projection after an author edits it: claims deleted, one turn demoted to `skip`, one turn spliced in as a void. The three edits the format must keep distinct. |
| `04-adversarial.tests.txt` | Candidate A against the cases catalogued below. |
| `05-candidate-b.tests.yaml` | Candidate B (YAML) on the authoring case and the adversarial cases where it differs. |

`01` and `branch-stories/fernhill/fernhill.tests.json` are the round-trip pair:
parse `01`, serialize to JSON, and it must equal that file byte for byte after
key sorting.

## Candidate A, in one page

Header lines precede the first card:

```
story    <story id>
seed     <integer>
format   1
```

Structure lines, indentation four spaces per level:

| Line | Means |
| --- | --- |
| `opening` | the opening card |
| `boot` | the boot look |
| `> <text>` | a turn; the command is the rest of the line, verbatim |
| `fork <id>` | a branch off the card it is indented under; `<id>` is the stable id |
| `skip` | `skip: true` on the card it is indented under |
| `# <text>` | a comment, at any indent, never part of a value |

Claim lines, indented under a card:

| Line | Family |
| --- | --- |
| `contains <text>` | `contains` |
| `not-contains <text>` | `notContains` |
| `exact` + block | `exact` (always a block — it is lines) |
| `state <expr>` | `states` |
| `event <expr>` | `events` |
| `channel <id> is <text>` | `channels[].is` |
| `channel <id> contains <text>` | `channels[].contains` |

**Values are the rest of the line, verbatim.** No quoting and no escaping, which
is what keeps a claim's spelling stable no matter what prose it holds. A value
needing newlines uses the block form: the keyword alone on its line, the value on
the following lines at one more indent, joined with `\n`.

A card with no claim lines and no `skip` is a void — including a card that
carries a `fork` but no claims (A-10).

## Adversarial catalogue

Every case is in `04-adversarial.tests.txt` unless marked GENERATED, meaning it
cannot survive being committed as text and must be produced by the fixture
script.

| # | Case | Expected |
| --- | --- | --- |
| A-1 | command is a claim keyword (`skip`) | parses; the `>` sigil disambiguates |
| A-2 | command is a structural keyword with an argument (`fork 1`) | parses |
| A-3 | command begins with the sigil (`> look`) | parses; command is `> look` |
| A-4 | empty command | **reject** — a turn with no command is invalid per the schema |
| A-5 | value begins with a claim keyword | parses; value is `contains no warranty` |
| A-6 | multi-line value (block form) | parses; joined with `\n`. **The common case** — descriptions are multi-paragraph |
| A-7 | empty-string value | decide: reject, or a claim asserting the empty string |
| A-8 | block lines that look like claim lines | parses verbatim; indentation settles it |
| A-9 | `exact` and `contains` on one card | must round-trip both or reject; silently dropping `contains` makes projection lossy |
| A-10 | card with a fork and no claims | parses as a void that has children |
| A-11 | branch with zero cards | decide: reject, or an empty branch |
| A-12 | fork nested inside a branch's card | parses; recursion to any depth |
| A-13 | non-monotonic fork ids (9 then 5) | parses; ids are stable, never positional |
| A-14 | every remaining family on one card | parses |
| A-15 | channel id containing dots | parses; real — fernhill uses `info.title` |
| A-16 | channel `is` with empty value | decide, with A-7 |
| A-17 | same value in `contains` and `not-contains` | parses; a test that cannot pass is the author's business, not the parser's |
| A-18 | unicode, quotes, backslashes, brackets in a value | parses unchanged; no escaping exists to get wrong |
| A-19 | value that is exactly a structural line (`> north`) | parses as a value |
| A-20 | 200+ character single-line value | parses; wrapping would change the string, so it stays on one line |
| A-21 | trailing whitespace on a value | GENERATED — decide: preserved, or stripped and therefore lossy |
| A-22 | CRLF line endings | GENERATED — normalize on read |
| A-23 | tab indentation | GENERATED — decide: reject, or treat as one level |
| A-24 | UTF-8 BOM | GENERATED — strip on read |
| A-25 | `opening` not first, or `boot` twice | **reject** — `flattenTreeLines` validates card position (`tree-walker.ts:173-179`) |
| A-26 | zero cards | parses to an empty document |
| A-27 | duplicate fork ids in one card | **reject** — the sidecar references them |

## What the mocks already show

**The authoring case is the whole argument.** `02` is 15 lines for a tree with
two forks and seven turns; the same thing in Candidate B is 34, and the extra
lines are punctuation rather than content. Whatever wins Q-1 has to be judged
first on this file, because it is the one an author actually types.

**Candidate B's real advantages** are A-4 (an explicit `command: ""` beats a bare
`>` line that is easy to produce by accident) and A-6 (block scalars with
chomping indicators are better specified than a hand-rolled block form).

**Candidate B's disqualifying weakness is A-18/A-19**: YAML picks quoting based
on content, so a claim's spelling in the file changes when the prose changes.
That is diff churn caused by nothing the author did, in the artifact whose
readability in review is a stated reason for building it at all. Candidate A's
verbatim-rest-of-line has no such coupling.

**Three cases are genuinely undecided** and need answers before either candidate
is complete: A-7/A-16 (is an empty value a claim or an error), A-9 (does the file
preserve a family combination the runner ignores), and A-11 (is an empty branch
legal). None is deep; all three are places where "just pick one" produces a
silent lossiness later.
