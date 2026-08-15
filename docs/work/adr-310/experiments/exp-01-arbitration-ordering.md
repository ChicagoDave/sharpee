# exp-01 — The Arbitration Ordering

**Concept under test**: "character" in the moral sense as an authorable
ordering over named forces — what wins when principle, fear, desire, honor,
and attachment collide. The 2026-08-15 session's working intuition is that
this is the most Chord-shaped piece of the whole normative layer (*puts duty
over fear* — pure words, closed vocabulary, no numbers), and that everything
else (principles, honor, conscience) resolves *through* it, which is why it
runs first.

**Scenarios**: B1 (refusal on principle — the ordering is what makes the
refusal hold against fear or desire pushing the other way), B6 (the arc flip —
the ordering *changing* as a ratcheted dramatic state, with voice selection on
both sides).

**What a candidate must specify before it can be traced** (found gaps go here
as they surface):

- The force vocabulary: which forces exist, whether the set is closed
  (platform) or open (author-named), and what feeds each force its strength
  (fear ← threat/mood; desire ← active goals; principle ← exp-02's
  declarations; honor ← exp-03; attachment ← disposition).
- Partial vs total order: what happens when two forces the author never
  ordered collide — compile diagnostic, platform default, or tie-break rule.
- Where the declaration lives: on the character, on a `define`-able named
  profile (rule 2's ladder), or both.
- How the flip is authored: B6 needs the ordering change to be a `change`-verb
  ratchet moment, not a numeric drift.
- What the ordering *gates*: goal selection only, dialogue-act selection
  (refuse/comply/evade), or both.

---

## Iteration 1 — run 2026-08-15

Trace scene (mechanism-level, not story content): **the Witness** holds a
confidence. The player can THREATEN the Witness (feeds fear via threat/mood)
and ASK ABOUT THE SECRET (the reveal is forbidden by a principle feeding
duty — exp-02 stub: assume the principle exists and feeds duty when the
reveal is the act under consideration). B1: with duty over fear, the Witness
refuses *while panicked*; remove the ordering line and they comply. B6: the
Witness starts fear-ruled, an authored dramatic moment flips them, and the
refusal/compliance voices differ across the flip.

### Candidate A — inline pairwise, no profiles

```chord
create the Witness
  a person, nervous, slightly honest
  puts duty over fear
```

The declaration is per-character pair lines. Unstated pairs fall to the
default (see finding 2). The B6 flip has no home in this candidate except a
statement form that mutates the declaration:

```chord
  on giving the letter
    puts duty over fear now
```

### Candidate B — named natures on the D4 ladder, flip by `change`

```chord
define nature steadfast
  duty over fear
  duty over desire
end nature

create the Witness
  a person, nervous, slightly honest
  nature timid

  on giving the letter
    change nature to steadfast
```

`define nature` is the D4/D5 ladder verbatim: named profile, `with` overrides
(`nature steadfast with love over duty`), shared across characters. The flip
reuses the `change` verb.

### Candidate C — named natures bound to states; the flip IS the state change

```chord
define nature steadfast
  duty over fear
  duty over desire
end nature

create the Witness
  a person, nervous, slightly honest
  states: cowed, resolute
  score resolute worth 10
  nature timid while cowed
  nature steadfast while resolute

  on giving the letter
    change it to resolute
```

No `change nature` exists. The only lever that moves an ordering is the
entity-state ratchet Chord already has — with its forward-march default, its
scoring, and D13's phrasebook gating hanging off the same state.

### Traces

**B1 under all three** (the candidates agree here; ordering source differs):

1. Player THREATENS the Witness → observer: threat ↑, mood nervous → panicked.
   No dialogue act arbitrated; no forces collide yet.
2. Player ASKS ABOUT THE SECRET → candidate acts: *reveal* (fear says comply:
   threat is live) vs *refuse* (duty says withhold: principle is live).
   Two live forces disagree → arbiter consults the ordering: duty over fear →
   **refuse**. Voice: mood is panicked → panicked phrasebook (D13). The player
   sees a terrified refusal — the exact B1 target.
3. Delete the ordering line → step 2's arbiter falls to the default (finding
   2): fear's feed (threat + panicked mood) burns hotter than duty's → comply.
   B1's counterfactual holds.

**B6 divergence:**

- **A**: the flip mutates a declaration from an on-block. After `puts duty
  over fear now` runs, the create block's `puts` line is no longer the truth
  of the character, and nothing at the flip site names a state the voices can
  gate on — voice change needs a *separate* state or mood change anyway.
  Trace 1 and trace 2 disagreed on whether the mutated pair survives a later
  conflicting `puts … now` targeting the same pair (last-writer-wins? error?).
  Divergence → Predictability RED.
- **B**: `change nature to steadfast` is explicit and findable, but (a) the
  ratchet is convention — nothing stops `change nature to timid` on the next
  line, so the arc's irreversibility is authorial discipline, not semantics;
  (b) the voices still need a state or mood to gate on, so the honest flip is
  *two* changes (state + nature) that can drift apart silently — an author who
  writes one and forgets the other gets a resolute voice with a timid spine,
  invisible in testing. That is exactly the class of silent failure D16 spent
  a diagnostic on.
- **C**: `change it to resolute` moves the state; nature and voice both hang
  off it declaratively. The create block is the complete truth at read time:
  both natures visible, bound to visible states, ratchet and score inherited
  from `states:` semantics for free. Both traces agreed cold.

### Grades

| Candidate | Scenario | Depth | Cost | Predictability | Legibility |
|---|---|---|---|---|---|
| A | B1 | GREEN | GREEN (1 line, 1 construct) | GREEN | GREEN |
| A | B6 | YELLOW — flip expressible only by mutating a declaration | GREEN | **RED** — create block stops being the truth; traces diverged on double-mutation | YELLOW — no state for voices to gate on |
| B | B1 | GREEN | GREEN (define amortizes; 1 line/character) | GREEN | GREEN |
| B | B6 | YELLOW — ratchet by convention, not construct | GREEN | YELLOW — nature/state can silently drift apart | GREEN |
| C | B1 | GREEN | GREEN | GREEN | GREEN |
| C | B6 | GREEN | YELLOW — +2 binding lines over B; states line if not already present | GREEN | GREEN |

### Verdict

**C wins**, carrying A's pair spelling (`duty over fear`) inside `define
nature` and B's ladder (`define nature` / `nature X` / `with` overrides) as
its own body. One rule makes it hold together: **there is no `change nature`
— an ordering changes only because a ratcheted state it is bound to changes.**
Character change is always a dramatic state moment, which is the Q3
discussion's conclusion (mood is weather; the arc is a state) landing as a
construct. C's Cost YELLOW is accepted: the two binding lines buy the create
block being the whole truth.

**Findings for the companion ADR** (semantic decisions forced by tracing):

1. **Force vocabulary is closed at five**: `fear`, `desire`, `duty`, `honor`,
   `love` — each with a defined runtime feed (threat/mood; active goals;
   principles; audience/reputation; disposition). Closed because a force
   without a feed is dead weight, and feeds are runtime, not authorable
   (rule 1).
2. **The default is intensity — character is what overrides it.** Unordered
   pairs resolve by whichever force's feed currently burns hotter. No platform
   editorial total order needed: an *ordinary* person is ruled by the
   strongest pressure of the moment; declaring an ordering is precisely what
   having character *means*. The declaration is the deviation.
3. **Nature is static or state-bound; never directly mutated.** See verdict.
4. **Keyword**: `nature` (working choice — `character` is unusably overloaded
   with the craft term; `nature` appears unclaimed in Chord). David to
   confirm.
5. **Scope of what the ordering gates**: the arbiter runs whenever two live
   forces disagree on the act under consideration — dialogue acts
   (comply/refuse/evade) and goal selection both. A force is *live* when its
   feed is off-baseline; the feed conditions are runtime definitions the
   companion ADR must state per force.

**Open for iteration 2, if wanted**: whether `nature timid` unbound (no
`while`) is legal as a character's whole story (yes, presumably — most
characters never flip), and whether two natures bound to the same state via
trait composition is the same compile diagnostic as D16's same-specificity
phrasebook tie (it should be).
