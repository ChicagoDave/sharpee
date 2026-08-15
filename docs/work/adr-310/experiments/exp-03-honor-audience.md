# exp-03 — Honor and Audience

**Concept under test**: honor as audience-dependent self-image — the force
that makes the same character give a different answer depending on who is in
the room, and whose enforcement arm is the propagation graph (reputation is
caring what spreads about you). Feeds the `honor` force in exp-01's arbiter.

**Scenarios**: B2 (the audience changes the man), B4 (the fallout travels).
N2 (thealderman native scene) — **pending David's pick**.

**What a candidate must answer**: what acts honor gates (they are *face*
acts — backing down, showing fear — not moral categories: the proud duelist
and the humble saint must both be expressible, so honor ≠ principles);
before whom it binds (scope grammar); what feeds its intensity; and whether
it is a force of its own or folds into duty.

---

## Iteration 1 — run 2026-08-15

Trace scenes. **B2**: a menacing player demands the Colonel stand aside —
once with the room empty, once with a soldier of his regiment present. Same
demand, same mood. **B2-discriminator** (added during drafting): the Colonel
is publicly caught in an error; honest admission is a face-act (`admits
fault`), silence keeps face but violates `never lies` — honor and duty on
opposite sides, which only an *ordering* can decide. **B4**: the Colonel
backs down before the Maid; two NPC turns later the player asks the Cook
about the Colonel and hears a changed answer, never having seen the gossip
move.

### Candidate A — one line, full face bundle

```chord
create the Colonel
  a person, proud, ruthless
  honor before the regiment
  nature honor over fear
```

`honor before <scope>` — scope grammar is D9/D10's (`anyone`, kinds,
entities, `except …`). The gated acts are the platform's closed **face-act
vocabulary**: backs down, shows fear, admits fault, pleads, accepts insult
(*caught lying* reserved until exp-05's ledger exists). One line buys the
whole bundle.

### Candidate B — selective face block

```chord
create the Colonel
  a person, proud, ruthless
  honor before the regiment
    never backs down
    never shows fear
  end honor
```

The author picks which face-acts bind — the Colonel who will not retreat but
freely admits error.

### Candidate C — no honor construct: principles with an observed qualifier

```chord
create the Colonel
  a person, proud, ruthless
  never backs down, when observed by the regiment
```

The elegance-oracle provocation: reuse exp-02's grammar, delete the `honor`
force entirely, fold everything into duty. Fewest constructs.

### Traces

**B2 under A:**

1. Room empty: demand → *comply* (fear live) vs *refuse* (what force?). No
   regiment present → honor not live. Fear is the only live force → steps
   aside.
2. Soldier present: backing down is a face-act, declared audience matches →
   honor live. `honor over fear` → **refuses**, proud voice. Same request,
   same mood, different room, different man. Both traces agreed. B2 holds.

**B2-discriminator, A vs C:**

- **A**: admitting fault is a face-act (honor live, audience present);
  staying silent when asked directly violates `never lies` (duty live).
  Nature `honor over duty` → he brazens it out — the Lord Jim shape, the
  character who would rather sin than be shamed. Nature `duty over honor` →
  he confesses before the regiment. **The author chooses, in one nature
  line.** Both traces agreed.
- **C**: both sides are principles feeding duty. Two unexcepted principles in
  live collision → exp-02 finding 5 → paralysis/evasion. Evasion is *a*
  human outcome, but it is the only one C can produce — the brazen-it-out
  character and the public-confession character are both **inexpressible**.
  Depth failure, and it is exactly the four-force expressiveness exp-01's
  vocabulary exists to carry. C also quietly deletes `honor` from every
  nature declaration, unwinding exp-01's verdict as a side effect.

**B4 (composition check — candidate-independent):**

1. The Colonel backs down before the Maid (player forced the scene). The
   face-act is witnessed; the observer machinery (ADR-141's
   character-observer, already live in stdlib) mints it as knowledge for the
   Maid.
2. The Maid `spreads gossip chatty to trusted` (D10, as written). Turns pass;
   the topic reaches the Cook.
3. Player asks the Cook about the Colonel: the Cook's response gates on
   `when it knows <the shame topic>` → changed line, changed tone. The player
   saw the act and the changed answer, never the transmission. B4's target.
4. **The gap the trace hit**: step 3's `when it knows …` needs a topic
   *name*, and the knowledge was minted mechanically, not authored on a
   `knows` line. What name does the author write? Trace 1 assumed the
   on-block's name, trace 2 assumed a platform-derived event id — divergence,
   but in a contract that belongs to observation/propagation generally, not
   to honor. Recorded as finding 5 and handed to the companion ADR rather
   than graded against these candidates.

### Grades

| Candidate | Scenario | Depth | Cost | Predictability | Legibility |
|---|---|---|---|---|---|
| A | B2 + discriminator | GREEN | GREEN (1 line + nature) | GREEN | GREEN |
| B | B2 | GREEN | YELLOW (block for granularity) | GREEN | GREEN |
| C | B2 | **RED** — honor-vs-duty orderings inexpressible; unwinds exp-01's force vocabulary | GREEN | GREEN | GREEN |
| all | B4 | GREEN | GREEN (zero new lines) | YELLOW — event-to-topic naming contract undefined (finding 5) | GREEN |

### Verdict

**A is the atom, B collapses into the ladder** — `honor before the regiment`
buys the full face bundle; a named selective bundle (`define honor
soldiers-pride … end honor`, used as `honor soldiers-pride before the
regiment`) is the rung above, if a story ever needs it. **C is rejected on
Depth**: folding honor into duty deletes the honor-vs-duty ordering, and the
discriminator showed that ordering is precisely where the concept's drama
lives.

**Findings for the companion ADR:**

1. **Honor is its own force** (C's rejection). The brazen-it-out character
   and the public-confessor differ by one `nature` line only if honor and
   duty are separately orderable.
2. **Face-acts are a closed platform vocabulary**, parallel to exp-02's act
   categories: backs down, shows fear, admits fault, pleads, accepts insult;
   *caught lying* reserved for exp-05. Same rule: no detectable act, no word.
3. **Honor sees the room, not the future.** It binds on the *presence* of
   declared audience — binary, no anticipated-reputation feed, no "word will
   get out" inference. The same knife Versu and D14 used (no theory of
   mind), applied to time.
4. **The D4 ladder is now the standing resolution to atom-vs-granularity**
   — third consecutive experiment where "one line = default bundle, `define`
   = selective control" dissolved the candidate competition. Future
   experiments should stop fielding granularity candidates and assume the
   ladder.
5. **The event-to-topic naming contract is a real gap, and it is not
   honor's.** Mechanically-witnessed acts become knowledge that authors must
   be able to name in `when it knows …` — the name's origin (authored on the
   scene? derived from the act?) is undefined. Companion-ADR item; B4 cannot
   be built without it.
6. **Observed-qualified principles are deliberately excluded.** C's grammar
   (`never steals, when observed`) doesn't spell honor — it spells
   *pretense*, a hypocrite's principle. Dramatically real, conceptually
   distinct, and blurring it into honor or conscience would cost both their
   shape. The grammar admits it later if a story demands it; no word ships
   now.

**Open for iteration 2 / N2**: whether audience weight ever matters (shame
before the one person whose regard you crave — currently out, disposition
may cover it via exp-04's territory); the N2 native scene when David picks
it.
