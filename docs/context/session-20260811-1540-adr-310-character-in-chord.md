# Session Summary: 2026-08-11 (CDT) — feat/adr-310-character-in-chord

## Goals
- Open a branch for ADR-310 and start the work.

## Phase Context
- **Plan**: `docs/work/character-in-chord/plan.md` — created this session, **Plan Status: ACTIVE**, 9 phases.
- **Phase executed**: Phase 1 (skeleton demonstration story) — IN PROGRESS, blocked on David's cast input. Phase 2's required platform-change discussion begun in parallel.

## Completed

### ADR-310 open-questions interview (all eight resolved)
`/devarch:adr-interview` on ADR-310, which was DRAFT with six live questions.
Five resolved this session (Q6/Q8 had closed in the writing session):

- **Q5 — is any of this wanted?** Yes; David opened the branch and directed the work.
- **Q1 → D14** — a purpose-built **skeleton** story is written FIRST, in Chord that
  does not compile yet, as the grammar specification and acceptance fixture.
  Fernhill rejected (four people, no secrets); compiler-first rejected (a green
  round-trip suite proves the parse, not the design).
- **Q2 → D15/D16/D17** — disposition was already entity-to-entity in the runtime
  (`dispositionToward(entityId, word)`, no work); naming a fact was the real gap
  and becomes `define fact` (D16); the binary truth/lie is retired in favour of a
  belief-outcome table over the shipped `ResponseAction` vocabulary (D17 — see below,
  rewritten later in the session).
- **Q3 → D18** — mood and Chord states stay two mechanisms with one spelling.
  The line is **coordinates**: a mood carries valence/arousal the platform computes
  with, an author state carries meaning only the story knows.
- **Q4 → D19** — one conversation syntax routed by whether the NPC has a character
  model, conditional on a strict-superset property.
- **Q7 → D20** — phrasebook resolution stays flat and source-ordered; the question's
  premise (nesting) was wrong.

Three answers came from reading code rather than design argument, and each shrank
the work: disposition already general, `FactSource` already carried `inferred`, and
phrasebooks were already a flat list.

### D17 — graded truthiness, designed then substantially retracted
David ruled the binary `SpreadsVersion = 'truth' | 'lie'` insufficient and asked for
graded truthiness. First design was a five-stage scale (`the truth` / `omission` /
`obfuscation` / `misdirection` / `the lie`) on the axis of what the listener ends up
believing. Later in the session, review found the shipped eight-value
`ResponseAction` vocabulary covering most of it, and David ruled **one vocabulary**
— so the five stages were retracted and D17 rewritten as a view over the eight.
See the Phase 2 rulings below for the final shape. Recorded here because the
intermediate design is what surfaced the real defect.

### Two review passes, three blockers closed
`/devarch:adr-review` returned NEEDS WORK (8/16), then READY WITH CLARIFICATIONS
(12/16). Blockers, all closed:

- **D19a** — routing had no socket. ADR-102 is still `Proposed`; stdlib's
  registration point was never built (`asking.ts:8` calls it "a future conversation
  extension"), and `DialogueExtension` lives inside `@sharpee/character`.
- **D20a** — a gated-out phrasebook entry must not advance its per-`(book, key)`
  counters, or a `first-time` line in a state book burns while the state is absent.
- **D21** — rewritten after David rejected its first framing. He was right that no
  versioning applies (nothing has ever persisted character state); the check that
  confirmed it found the real defect — `CharacterPhaseRegistry` has a working,
  tested `toJSON`/`fromJSON` that **nothing calls**, so goal progress, active
  influences and already-told records silently reset across save/restore while
  traits survive.

### Plan + plan review
`session-planner` produced 9 phases; `/devarch:plan-review` returned CONFLICTS FOUND
with four contradictions, all applied:

1. Phase 7 routed dialogue per NPC — contradicted ADR-102's *One Extension Per Story*.
   Now one extension routing internally; **ADR-310 D19a reworded to match**.
2. Phase 2 registered the dialogue extension through `@sharpee/plugins`; ADR-102
   specifies `world.registerDialogueExtension`. Plugins seam now scoped to the
   save/tick-phase wiring D21 names.
3. Four grammar phases added author-visible surface with no `CHORD_LANGUAGE_VERSION`
   or `chord.ebnf` movement — now a standing requirement (3.0.0 → 3.1.0 by ADR-257 D2;
   both copies of the grammar file move together).
4. ADR-144's `selective`/`vague` amendment lagged its code change by three phases —
   moved to Phase 3.

### ADR-310 flipped to ACCEPTED
21 decisions (D1–D21 incl. D11a, D19a, D20a). Four SMALL review findings deliberately
carried into planning rather than answered in the ADR.

### Phase 1 — skeleton story, partially drafted
`branch-stories/visitors/visitors.story` created. David's premise: an alien lifeform
with non-human psychology; four visitors in human form in a small midwestern town,
here to understand humans; player is the town sheriff.

- **`define profile manifold`** — augmented perception, resistant belief-formation,
  fragmented coherence, episodic lucidity, uncertain self-model. Named for behavior
  per D5. The file records what the sheriff *sees* for each dimension, which is the
  D12 discipline written down before any prose exists.
- **Four visitors** (Liam, Noah, Olivia, Emma — top baby names, genders deliberately
  not aligned with human physiology, never explained). Their differentiation in the
  file is marked STRUCTURAL PLACEHOLDER, not characterization.
- **Emergent property worth recording**: augmented perception + resistant
  belief-formation + `FactSource: 'hallucinated'` produces characters who are
  *confidently wrong in good faith* — they spread sincere errors the speaker holds
  at full confidence. Indistinguishable from lying to the sheriff, and generated by
  the premise rather than designed. Under the final D17 this is `confabulate`, which
  already existed in the shipped vocabulary.
- **Six townspeople + the player added.** David supplied the roles (florist, retired
  attorney, hairdresser, antique shop owner, teenager, mail carrier) and delegated
  the names: Bonnie Ellis, Ray Pike, Sherri Lenz, Walter Nagy, Cody Brandt, Dale
  Vollmer. Each propagation profile is **derived from the role**, which is the point
  of drawing the network from a real town — Sherri is the hub (`chatty to anyone`),
  Ray `spreads nothing` (a discreet attorney is D10's `mute` in English), Dale and
  Cody are the only two who `know … witnessed` rather than by being told, and Cody's
  testimony is first-hand but lands in adults at low confidence, which the
  belief-outcome table expresses and no flag could. Walter deliberately has no
  profile yet — an antiques dealer's contribution depends on whether the visitors
  carry anything, which is David's call.
- The cast all spread `the odd ones`, a **gossip fact that is deliberately not the
  story's real secret** — it gives the network traffic that is nobody's lie, so the
  sheriff's difficulty is not only people withholding.
- **The player** is declared with `resists intimidation` and no character model
  (D7 opt-in). ADR-146 influence runs *at* the player (`pc-influence.ts`), so a
  sheriff being leaned on is the player-side half of D9 — the reason `resists` is
  not NPC-only, now in the fixture.
- **Vocabulary gap hit three times**: `persistent`, `inquisitive` and `nosey` are
  none of them among the twelve personality words. `very curious, stubborn` is the
  closest honest rendering for both the visitors and the sheriff. Recorded in the
  story file as a Phase 4 item — this is ADR-310's own "review the list before it is
  frozen" consequence, confirmed on the first characters ever written.

### Phase 2 discussion (CLAUDE.md platform-change gate) — 1 of 4 rulings made
Read-only recon produced four findings; David ruled on the first.

- **RULED — interface home**: `@sharpee/if-domain` with `DialogueResult<TIntent = unknown>`
  generic. `world-model` was the alternative. Deciding factor: the
  `LanguageProvider` (if-domain) → `lang-en-us` (implements) → stdlib
  (`setLanguageProvider`) precedent is the identical relation. The generic is
  *required*, not stylistic — `ResponseIntent` needs `Mood`/`Coherence` from
  `world-model`, which already depends on `if-domain`, so the concrete type would
  close a cycle. Affordable because `responseIntent` has zero production consumers.
- **RULED — one conversation vocabulary**: `ResponseAction`'s eight values stand;
  D17's proposed five-stage truthiness scale is **retracted as a rival vocabulary**
  and rewritten as a **view over the eight**. Three of the five were near-duplicates
  of `tell`/`omit`/`lie`, `obfuscation` was `deflect` renamed, and `confabulate`
  already covered sincere invention.

  What survives, and is the real finding: **nothing today varies where a transferred
  belief lands.** `propagation/fact-transfer.ts` calls
  `addFact(topic, 'told', 'believes', …)` — source and confidence hardcoded for every
  transfer, with `transfer.version` carried and then ignored at the landing site.
  D17 is now a belief-outcome table mapping each `ResponseAction` to the
  `(version, source, confidence)` triple the listener records.

  One genuine gap remains: none of the eight expresses *deliberately implying a
  falsehood using true statements*. That becomes a ninth action, `misdirect`,
  landing the false version with source `inferred` — so the listener holds it as
  their own conclusion and confronting them with the deception does not dislodge it.

### Phase 2 implemented (items 1 and 2) — commit `ed9cefa2`
Two more rulings from David ("go with your recommendations on both"): keep the
shipped `DialogueExtension` signature and amend ADR-102 to match, and let a
per-entity interceptor beat the story-wide extension.

- **Interface moved** to `packages/if-domain/src/dialogue.ts`, generic in `TIntent`.
  `@sharpee/character`'s `dialogue-types.ts` became a binding module exporting
  `CharacterDialogueExtension`/`CharacterDialogueResult`, so nothing inside the
  package spells the type parameter. Added the `if-domain` dep + tsconfig reference.
- **Registration** `registerDialogueExtension`/`getDialogueExtension` on the concrete
  `WorldModel`.
- **Consultation** through a new shared `stdlib/src/actions/dialogue.ts`
  (`consultDialogue` + message/param merge helpers), wired into ASK, TELL and
  TALK TO. Each falls back to its existing default when no extension is registered.
- **Interceptor precedence needed no new machinery**: the extension sets the primary
  message, and ADR-228's `runPostReport` runs afterwards, where exactly one
  interceptor may `override` it. The ruling implements itself with the natural
  ordering.

**A mistake worth keeping, because the pattern is the lesson.** I first added the two
methods to the **`IWorldModel` interface** as well, which broke `AuthorModel`
(TS2420) — and I was about to "fix" it by writing a delegate. David: *"you need a
very good reason to modify `IWorldModel`."* There wasn't one. Both consumers already
hold the concrete class (`ActionContext.world` is `WorldModel`; story-loader's
registrars take `WorldModel`), so the widening bought nothing — the same reasoning
that moved `EntityQuery` off the interface. Reverted; `IWorldModel` is untouched, and
the reason is recorded at the registration site so it is not re-litigated. Removing
the widening also removed a `?.` optional-call hedge in stdlib that only existed to
paper over it.

**The shape of the session's errors, named by David**: overconfidence was consistently
strongest where the reasoning came from an *adjacent fact* rather than the thing
itself — `registerActionInterceptor` is on the interface so the new one goes there;
the version-reader ruling exists so it applies here; the interface exists so the seam
exists. Each read as settled when it was inference; none survived opening the file.
Each was caught by review rather than by the original pass.

**Verification** (17:47 CDT): `npx tsf build` clean; `@sharpee/stdlib` 1604 passed /
27 skipped; `@sharpee/world-model` 1453 passed / 10 skipped; `@sharpee/character`
301 passed.

### SAY: investigated, recommended for removal (undecided)
`handleSay` is on the interface and has no caller. There is **no `saying` action in
stdlib and no `say` pattern in the standard grammar**. Dungeo built its own SAY as a
*story* action, for word puzzles — say "Odysseus" to the cyclops, say "echo" in the
Loud Room — which is `SAY XYZZY`, puzzle input addressed to the world, not speech
addressed to a person. And the character model's `handleSay` forwards to `handleAsk`
while declining the untargeted case, which is the only thing SAY expresses that ASK
cannot. Recommendation: drop `handleSay` from the interface and treat SAY, if it ever
becomes a platform action, as ADR-090 capability dispatch (its meaning is per-entity,
like WAVE). **Not actioned** — David tabled the session before ruling.

## Key Decisions
- ADR-310 ACCEPTED with 21 decisions; see the ADR for the full map.
- Interface home ruling above (ADR-310 D19a, plan Phase 2 step 1).

## Open Items

### Blocking Phase 1
- **The setting** — what rooms exist (main street, the shops, wherever this happens).
- **What actually happened** — the fact graph the sheriff is investigating. This is
  the last big one: goals (D8), influence pairs (D9), and who does what with what they
  know all fall out of it rather than needing separate decisions.
- **Title** for the story; `[TBD]` in the file. Directory/id `visitors` is provisional.

### Blocking Phase 2 (two rulings outstanding; two made — see above)
- **ADR-102 is still `Proposed` and unamended.** It needs the signature amendment
  (shipped shape wins) and a ruling on SAY before the flip Phase 2 owns.
- **Registration location unresolved**: world-level (where it is now, matching
  ADR-102) vs stdlib's `ActionRegistry` alongside `setLanguageProvider`. The
  `LanguageProvider` precedent that decided the interface *home* points at the
  registry, and the argument that originally settled this ("D19a implements ADR-102,
  it does not amend it") no longer holds now that ADR-102 is being amended anyway.
  Today's code is compatible with either; moving it later is small.

### Carried from prior sessions (untouched)
- Chord Writer DMG blocked on notarization `8fe1892f-…`; `041e7810-…` orphaned.
- ADR-308 testing-navigation interview not started.

## Files Modified

**Commit `454f7beb`** (docs):
- `docs/architecture/adrs/adr-310-character-model-in-chord.md` — 8 questions resolved,
  D14–D21 added, D19 corrected, status → ACCEPTED
- `docs/work/character-in-chord/plan.md` — new, 9 phases, plan-review fixes applied
- `docs/context/.current-plan` — repointed
- `branch-stories/visitors/visitors.story` — new, partial skeleton

**Commit `ed9cefa2`** (Phase 2, `packages/`):
- `packages/if-domain/src/dialogue.ts` — new, the moved contract
- `packages/stdlib/src/actions/dialogue.ts` — new, `consultDialogue` + helpers
- `packages/world-model/src/world/WorldModel.ts` — concrete-class registration
- `packages/character/` — binding module, deps, tsconfig reference, barrels
- `packages/stdlib/src/actions/standard/{asking,telling,talking}/` — delegation

## Notes

**Verified rather than inherited this session**: `pnpm --filter '@sharpee/character' test`
→ 19 files, 301 tests, 301 passing (15:53 CDT). The ADR's Context figure holds.

**A correction worth keeping**: D21's first draft claimed "after the v3→v4 hard break,
the next save-format change adds a version reader." Both halves wrong —
`save-restore-service.ts:77` is `SAVE_FORMAT_VERSION = '3.0.0'`, the hard break was
v1→v2, and the version reader already shipped at v2→v3 (ADR-293 D7). Folded from
memory without opening the file; caught on the second review pass.

---

## Session Metadata
- **Status**: IN PROGRESS — session ended by David to hand the work to Fable 5.
- **Blocker**: Phase 1 blocked on David's story content (setting + fact graph).
  Phase 2 items 1-2 landed; the ADR-102 amendment/flip and the registration-location
  question remain.
- **Rollback Safety**: contained — all work is on `feat/adr-310-character-in-chord`,
  never on `main`. `packages/` changes are commit `ed9cefa2` alone and are additive:
  no existing behavior changes when no dialogue extension is registered.
