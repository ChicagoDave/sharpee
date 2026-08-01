# RNG Normalization — Follow-up Questions (round 2)

**Context:** Follow-up to `fable-assessment.md` (2026-07-31). The assessment was
independently corroborated on nearly every point of diagnosis. What follows is one
factual correction, then the places where the *design* half needs another pass before
it can be built against Dungeo.

Same ground rules: read from the code as-built. Chord is deliberately still out of
scope — the working assumption is that if the Sharpee-level substrate is right, the
Chord form derives from it, so designing the Chord surface now would be premature.

---

## 1. One correction

**§2.7's audio ruling is wrong on the facts.** The assessment classes
`media/src/audio/audio-registry.ts:206-212` as "presentation-layer, client-side...
it runs in the browser client, so it never affects transcripts."

`resolvePool` (`:205-215`) does not jitter at playback. It bakes the three random
values into a semantic event and returns it:

```ts
return createTypedEvent('audio.sfx', { src, volume, rate, duck: pool.duck });
```

So `src`, `volume`, and `rate` enter the event source and serialize into saves. Audio
sits *inside* the determinism boundary, not outside it. This doesn't change much — it's
three `Math.random()` calls that move onto a stream like any other — but the boundary
argument it was excluded under doesn't hold, and any "declared exempt" list built on
that reasoning would be wrong.

---

## 2. Forcing — the mechanism needs more than one pass

§4.1.3 and §4.2.3 are the most valuable part of the assessment: forcing gets outcome
coverage at linear cost where search is exponential. The tradeoff in §4.2's "honest
residual" is stated correctly. But the mechanism has open edges that decide whether it
is buildable, and all of them are downstream of one claim:

> "Forced points don't draw, so the stream stays aligned for everything else."

**Q1. That claim holds only for single-draw points. What happens at multi-draw ones?**
Dungeo's `resolveBlow` (`stories/dungeo/src/combat/melee.ts:177`) takes one `int()`
against a 9-slot table and then a *conditional* `chance(0.25)`. Forcing "the outcome"
of that point is ambiguous: does the force consume zero draws, one, or the same number
the unforced path would have? Each answer breaks something different — zero draws
desynchronizes any later assertion that depends on stream position, and
same-number-as-unforced requires knowing a count that varies by branch.

**Q2. What is the failure mode when a forced point never fires?** A typo'd name, a
renamed point, or an unreachable code path all produce the same thing: a run that looks
like it tested the case and didn't. Silent no-op is the classic bug in override tables.
Should an unfired force be a hard error at end-of-run, and is there any case where a
force legitimately shouldn't fire?

**Q3. Do forces compose, and is there a rule for conflicts?** Two forces in one session,
a force on a point reached twice in one turn, a force plus a pinned seed. Which wins,
and is the combination reportable?

**Q4. Does a force survive save/restore?** If an author forces a point, plays twenty
turns, saves, and restores — is the force table part of the session or part of the save?
Both answers are defensible; the assessment doesn't pick one, and it changes what the
save format has to carry.

---

## 3. The registry has an internal tension

§4.1 proposes implicit registration ("first use registers the name") to keep the
authoring burden near zero. §4.1.2 proposes a coverage report answering "which
registered points fired, **which never fired**."

**Q5. Those two can't both hold.** Under implicit registration, a point that never fires
is never registered, so it cannot appear in the never-fired column — precisely the
column that answers the author's actual question. What closes the gap: a static scan for
draw sites at build time, an explicit declaration for points that need coverage
guarantees, or something else? This looks like the single most load-bearing unresolved
detail in §4.

**Q6. Who declares the semantic outcome classes, and can they be contextual?** §4.2.2
("collapse numeric ranges into the classes the code branches on") is the biggest
de-explosion step, and for Dungeo combat the classes live in the *tables*
(`melee-tables.ts`), not at the draw site. There's a wrinkle: `melee.ts:248` sets
defender strength negative only `if (isHeroAttacking)`, so the auto-kill at `:197` is
unreachable when a villain attacks — the same draw against the same table has a
different reachable class set depending on the caller. Does a point declare one class
set, or a class set per context?

---

## 4. Stream granularity — pushing on the assessment's own Q1

§2.6 identifies the property that matters: stability under content evolution, so that
adding a draw in one system doesn't invalidate another system's expectations. §3.2 then
recommends per-domain streams, with `combat` as one domain.

**Q7. Is per-domain coarse enough to violate the property it was chosen for?** Dungeo's
thief carries ~9 draws and the troll ~2. On a shared `combat` stream, adding one thief
draw shifts every troll outcome — which is §2.6's failure, one level down. Does the
stated goal push toward per-system (thief, troll, cyclops) rather than per-domain, and
if so, what is the cost in save-state entries and derivation calls? A concrete count for
Dungeo would settle it.

---

## 5. Phase 0's actual payoff

§5 sequences Phase 0 as "stop the bleeding," verified by "walkthrough chain still passes
(it already tolerates variance)."

**Q8. What does Phase 0 do to the flake, precisely, before Phase 2 lands?** Deleting the
module singletons moves combat onto `actionRandom`, which is itself time-seeded per run
(`game-engine.ts:309`), so two runs still differ. The reproducibility win appears to
arrive only with Phase 2's seed injection.

What Phase 0 *does* appear to fix independently: cross-instance contamination (§2.1's
"two engine instances in one process share these streams") and combat's absence from
save/restore round-tripping, since `actionRandom` is persisted and the module singletons
are not.

The chain's observed symptom is a total test count swinging 892 → 982 → 11533 between
runs of an identical bundle — a retry loop whose branch count varies. Is the 11533
outlier consistent with cross-instance contamination specifically, such that Phase 0
would visibly narrow the spread even without a seed? Or is Phase 0 correctly described
as a correctness fix with no expected effect on flake until Phase 2?

This matters for sequencing: if Phase 0 doesn't move the flake, it shouldn't be sold as
the fix for it, and the case for doing Phase 2 sooner gets stronger.

---

## 6. Information the assessment didn't have

Three findings from a separate sweep, offered because they bear on the assessment's own
open questions.

**6.1 — the clock population is much larger than §2.7 counted.** §2.7 lists ~15 ID sites.
A full sweep of 335 Dungeo source files and 974 platform files found, beyond the ~32
`Date.now() + Math.random()` ID sites:

- **~49 further ID sites carrying a clock and no randomness at all** (~33 in
  `stories/dungeo`, ~16 in `packages/`), shaped like
  `` id: `mirror-pole-raised-${Date.now()}` ``. A grep for `Math.random()` cannot see
  these, which is how they went uncounted.
- **`ISemanticEvent.timestamp` is a required field** (`packages/core/src/events/types.ts:22`),
  stamped `Date.now()` at **184 sites tree-wide**, and
  `engine/src/save-restore-service.ts:333,383` serializes it into the save. Three more
  clock reads sit in the save path itself, including `:235`, which stamps the save's own
  metadata.

This bears directly on the assessment's **open question 2** (byte-identical transcripts
as the acceptance bar, or is turn-outcome equivalence enough): byte-identical saves are
unreachable without touching all of the above, whereas turn-outcome equivalence is
reachable without touching any of it. Does that change the recommendation?

Everything else swept clean: zero hits for `new Date`, `toISOString`, `performance.now`,
`process.hrtime`, crypto/uuid outside the one `character/tick-phases.ts` site, `process.env`,
`cwd`, `os`, fs, or `for…in`. `Object.keys`/`Map`/`Set` iteration is insertion-ordered
and deterministic; the two bare `.sort()` calls are on string arrays. So the
two-mechanism model (clock + RNG) is correct — only the clock's volume was understated.

**6.2 — `evt-<turn>-<n>` may not be available at every ID site.** §2.7 recommends a
monotonic per-engine counter keyed on turn. Nine of the ID sites are in
`parser-en-us/src/english-parser.ts`, which runs during parse, potentially outside a turn
context. Does the counter scheme need a turn-free variant, and does anything depend on
IDs being ordered across the session rather than within a turn? (Checked separately:
zifmia does not key on engine event IDs — no `event.id` usage in `tools/zifmia/src` — so
cross-session uniqueness appears not to be required.)

**6.3 — seed search as a fallback (strategy 5) has a measured cost.** Benchmarked against
a real loaded Dungeo world: world snapshot 436 KiB, `toJSON()` p50 0.91 ms, `loadJSON()`
p50 0.69 ms, round trip **1.60 ms**, i.e. **≈623 nodes/second**, flat under play. So a
melee depth-2 search costs ~26 ms, but a thief 10-turn exploration is ~27 minutes and
20-turn is effectively unbounded. The bottleneck is branching factor, not serialization —
a cheaper snapshot would be optimizing the wrong thing.

This is the strongest quantitative argument *for* the assessment's forcing-first
position, and it also bounds strategy 5: seed search is viable for shallow, high-density
outcomes and not for deep ones. Does that change where the line between forcing and
search should sit?

---

## 7. What would be most useful back

In priority order: **Q5** (the registry tension), **Q1** (multi-draw forcing), **Q8**
(what Phase 0 actually buys), then **Q7** and **6.1**. The rest are refinements.

A concrete proposal for the choice-point API — signature, registration, class
declaration, force lookup — worked against three real Dungeo sites of different shapes
(the round-room handler, `resolveBlow`, and one thief draw) would be worth more than
prose on any of it.
