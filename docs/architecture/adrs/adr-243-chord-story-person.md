# ADR-243: Chord Story Person — first/second/third narration

## Status: DRAFT (all questions resolved 2026-07-19 — pending ACCEPTED flip)

## Date: 2026-07-19

## Context

Sharpee narrates in the second person, and only in the second person:
the lang-en-us message rows spell "You" literally ("You are carrying:",
"You can't see that here."), and no story-level setting exists to say
otherwise. First- and third-person narration are standard IF viewpoints
(Inform: "The story viewpoint is first person"), and Chord has no
surface for them.

The platform half of the seam already exists. The phrase algebra
(ADR-192…206) carries `person?: 'first'|'second'|'third'` on
`NounPhrase` (unset ⇒ third), the Assembler owns verb agreement over it
(ADR-199), and pronoun realization is table-driven (ADR-197, fed by
ADR-242's declared pronoun sets). Deferred realization was built
precisely so a grammatical property like person could be decided at
assembly time rather than baked into template strings. What is missing
is (a) a Chord authoring surface for the story's narration person, (b)
the loader/provider thread that puts the declared person onto the
player's noun phrase and the narration voice, and (c) message rows that
realize the narrator through the algebra instead of a literal "You".

Raised by David mid-session (2026-07-19, session c331a9, during the
website content phases): "we need to enable story person (1st/2nd/3rd)
to Chord."

## Decision

- Chord grows a **story-level narration declaration** in the story
  header: **`narration: first person`** (ruled Q-1, David 2026-07-19 —
  the fuller phrase field over a bare `person:` field or a `define`
  block). Value forms are the closed set `first person` /
  `second person` / `third person`, analyzer-gated with nearest-match
  suggestions. **Tense is out of scope for this ADR** (ruled Q-4, David
  2026-07-19): the value grammar accepts `<person> person` and nothing
  else today, and the phrase-field spelling deliberately reserves the
  room a future tense ADR needs (`narration: first person, past
  tense`) — past-tense verb realization is a much larger conjugation
  surface (ADR-199's Verb machinery) and gets its own decision when
  wanted. Absent, the story narrates in the **second person** —
  today's behavior, unchanged; the field is additive and no existing
  story or transcript changes meaning.
- The declared person flows compile → IR → loader → language provider,
  and realization happens in the phrase algebra: the player/narrator
  noun phrase carries the declared person, and the Assembler's existing
  agreement machinery produces "You are carrying" / "I am carrying" /
  "She is carrying" from the same message row.
- Message rows stop hard-coding the narrator (ruled Q-2, David
  2026-07-19): **marker realization + literal sweep.** The `{You}`
  marker (and its verb-agreement partners) realizes per the story's
  declared narration person — one central change at the
  assembler/formatter seam covering the 382 rows already in marker
  form — and the 124 literal-"You" lines (9 files, counted 2026-07-19)
  are swept into marker form. No per-person row variants: branching
  stays out of templates, per the phrase algebra's design.
- **Third person requires a declared protagonist** (ruled Q-3, David
  2026-07-19): `narration: third person` with no `pronouns` line and no
  `proper` name on `create the player` is a **compile error** — a
  third-person story must say who its protagonist is; the narrator's
  subject is wrong on nearly every line otherwise. ADR-242's person
  lines (`proper`, `pronouns <set>`) become legal on the player block.
  An intentional "it" protagonist stays one explicit line away
  (`pronouns it`). ADR-242's "absent means absent" stance is unchanged
  for every other person — this gate binds only the player, only under
  third-person narration. **Input stays imperative in every person**
  (`take lamp`, never "she takes the lamp") — confirmed, standard IF
  convention; the parser is untouched.
- The grammar addition lands via the standing governance path — a
  `docs/architecture/chord-grammar-changes.md` entry and ratchet row
  now that Q-1 has pinned the spelling.

## Consequences

- Additive header grammar; parser change is small. The lang-en-us cost
  is now measured: one central marker-realization change (382 rows ride
  it for free) plus a bounded sweep of 124 literal-"You" lines across
  9 files.
- Third person interacts with ADR-242: the ADR-242 person surface
  covers the player's identity, and the ruled compile gate makes the
  missing-identity case legible rather than silently wrong. The
  analyzer must accept `proper`/`pronouns` on `create the player` and
  add the third-person-requires-identity gate.
- Transcript gates stay green by default (second person unchanged);
  new-person stories need their own fixtures.
- Parser/input side is untouched — player commands stay imperative
  ("take lamp") regardless of narration person (confirmed, Q-3).

## Acceptance Criteria

- **AC-1**: `narration: first person` / `second person` / `third
  person` compile; any other value is a compile error with a
  nearest-match suggestion; tense-bearing values are errors (reserved).
- **AC-2**: a story with no `narration:` field behaves byte-identically
  to today — all existing transcript gates green, no fixture churn.
- **AC-3**: a first-person fixture story renders the narrator through
  the same message rows ("I am carrying:") with correct verb agreement.
- **AC-4**: a third-person story whose player declares `pronouns she`
  renders "She is carrying:" with agreement; `proper` + third person
  renders the name where the narrator NP appears.
- **AC-5**: `narration: third person` with neither `pronouns` nor
  `proper` on `create the player` is a compile error naming the gate;
  `pronouns it` declared explicitly compiles and narrates "it".
- **AC-6**: zero literal narrator-"You" rows remain in lang-en-us
  outside marker form (the 124-line sweep is complete, verified by
  grep).
- **AC-7**: the grammar-changes entry + ratchet row land with the
  implementation; ebnf + grammar doc updated.

## Session

Session c331a9 (2026-07-19, chord-foundations). Raised by David as a
side note during the website content wave (plan
`docs/work/website-content/plan.md`); ADR-worthiness confirmed same
session. No implementation this session — capture only.

