# Session Summary: 2026-08-22 - feat/adr-321-world-index

## Goals
- Continue Phase 6 (Chapter 1 vertical slice, P-5) of the Secret Letter port: build the apple/alley transition and the ST stallkeeper tree from the change document.
- File any platform gaps the authoring surfaces as GitHub issues rather than working around them.

## Phase Context
- **Plan**: `docs/work/secret-letter-port/plan.md` — Port The Secret Letter (Textfyre, 2009) to Chord.
- **Phase executed**: Phase 6 — "Chapter 1 vertical slice in `branch-stories/secret-letter/`" (P-5), Tier Large, budget 400. **Note**: the session-state file records Phase 4 ("Produce the change document through guided conversation", P-4, tier Medium, budget 150) — this is a carried-over discrepancy from the prior session (83c2f3), not new this session. The actual work performed was a Phase 6 content-authoring increment; Phase 4 was gate-confirmed at session start but not itself advanced.
- **Tool calls used**: 165 (state file) / 150 budget under the recorded Phase 4 tracking — over budget on that tracking, though the work belongs to Phase 6's own 400-call budget.
- **Phase outcome**: Partially completed — two increments landed (apple/alley transition, ST stallkeeper tree) but Phase 6 itself did not close; six David placeholder lines and further Chapter 1 content remain.

## Completed

### The apple/alley transition (change document: "What ends the walk")
- `peering.chord`: added the `distant-alley` phrase and a northwest dispatch line from the Northwest Junction, Gentry verbatim from `story.ni:1488` ("The entrance to a narrow alley lies northwest.") — the one peering phrase of fifteen with no route-clause deviation, because Gentry wrote the compass word into the sentence itself.
- `secret-letter.story`: new "THE APPLE AND THE ALLEY" section — wooden crates in the Alley (Gentry's description verbatim), the apple moved onto the apple display, `after taking it while calm, once` for the theft line, `on eating it` with `refuse when the player is not in the Alley`.
- Three `## DAVID:` placeholders created, still unfilled: `apple-lifted-quietly` (the calm theft), `apple-not-here` (the directional refusal), `apple-first-bite` (the bite in the Alley).
- Recorded as a MECHANISM DEVIATION in the story file (`secret-letter.story:620`): the source's storage-bin/corresponding-item trick does not survive the port — Sharpee's taking action refuses scenery inside validate (`packages/stdlib/src/actions/standard/taking/taking.ts:112`) before any story hook runs, so an `on taking` clause on a scenery display can never fire. The apple sits on the display, a scenery supporter, as the workaround.
- Deliberately not built: no state change on the bite — the story only declares calm/chase states and the eavesdrop is neither, so that gate waits on David.

### The ST stallkeeper tree (change document: "The stallkeeper tree")
- New file `branch-stories/secret-letter/stallkeepers.chord` (575 lines), imported by the story. Ten stallkeepers (grocer, fruit, hat, leather, weaponsmith, gems, herbalist, rope dealer, candlemaker, pottery), each with greetings + topics + exchange blocks, over roughly 11 shared phrases. All nine quips ST1–ST9 are Gentry's, from `story.ni:1841-1949`.
- Rewrite decisions: Gentry's menu becomes topics (ST2/ST3/ST4); ST5's "You have any coin?" becomes a `define exchange` answered by ST6/ST7/ST8; ST2+ST5 and ST4+ST5 fold into one phrase each because a Chord topic row takes exactly one unconditional response.
- Each keeper needed `mood nervous` — conversation blocks require a character model (`packages/story-loader/src/loader.ts:929`). "nervous" is Gentry's own word describing the stallkeepers.
- Patience-counter behavior was measured, not assumed, by driving it through `sharpee play`: the source counts approaches and resets on moving stalls; Chord's `asked again`/`asked many times` arms count topic asks cumulatively and forever, and are consulted only when a scene reopens — a second `talk to` inside a live scene answers "doesn't respond," and the scene stays live several turns after walking away.
- Story header deviation list item 5 (`secret-letter.story:29`): `st-patience-third` expands Gentry's `[one of]beat it[or]scram[or]get out of here[at random]` into three whole-phrase variants because Chord randomizes phrase arms, not words inside one.

### GitHub issue filed
- [#300](https://github.com/ChicagoDave/sharpee/issues/300) (OPEN, confirmed via `gh issue view`) — "Chord: a player cannot say goodbye — no farewell verb, and `on leaving` is the NPC's departure, not the player's." Grounded in a source read: both consumers of the leaving arm (`packages/story-loader/src/runtime.ts:1265` and `:2211`) key on the NPC's own `leave` statement, and there is no goodbye/bye/farewell verb in `parser-en-us` or `stdlib`. ST9 is authored on that arm and is currently unreachable; the issue cites GH #300 from the story file.

### Watch-list updates (`docs/work/secret-letter-port/watch-list.md`)
- **W-1 confirmed** (not just predicted): twenty `analysis.phrase-overlap` errors raised while authoring `stallkeepers.chord` were every one reported as `secret-letter.story:72:5`, `:118:5`, etc. — lines that exist in the main file and are ordinary room text. The diagnostic does not merely lose the file; it points confidently at an innocent line in a different one. Legible here only because the message happened to name unique phrase keys.
- **W-8 added** (new axis): "A conversation shared by many characters has no shared owner." `define topics`/`greetings`/`exchange` bind to exactly one entity (`packages/chord/src/analyzer.ts:1509, 1520`). Nine quips spoken by ten characters cost ~460 lines of near-identical boilerplate around ~60 lines of shared phrases — roughly 8:1. Flagged as platform-shaped, not fixed in this session.

## Key Decisions

### 1. Apple sits on the display, not in a storage bin
The source's corresponding-item trick (item swaps location on a state flag) has no analog because Sharpee's taking action rejects scenery in validate before story hooks run. The apple is authored as a scenery-supporter item instead, with the theft/refusal logic living in `after`/`on eating` clauses on the item rather than in a location swap.

### 2. Stallkeeper menu becomes topics + one shared exchange
Gentry's dialogue menu (ST1–ST9) does not map one-to-one onto Chord's greeting/topic/exchange shape. ST5's coin-question was promoted to a `define exchange` (its own conversation primitive) rather than forced into a topic, and two topic+coin-question pairs were folded into single phrases because a Chord topic row accepts exactly one unconditional response.

### 3. Ten-owner sharing solved by duplication, not by a platform change
With no owner-list or kind-bound conversation primitive available, the ST tree is built as ten near-identical per-keeper blocks over a small shared-phrase core. The 8:1 boilerplate ratio is recorded in W-8 as a platform gap for future ADR discussion, not addressed in this session — consistent with the plan's own scope guard against platform changes.

## Next Phase
- Still Phase 6 — no phase advance this session. Remaining Chapter 1 work: fill the three apple placeholders and the three carried-forward Teisha placeholders (six David lines total); decide what the eavesdropped bite hands off to (a possible third story state); decide whether the crates matter mechanically for eating; rule on the route-clause treatment of the other fourteen peering phrases; the mercenary pressure model (four-state pursuer) as the next authored increment, then the chase.
- **Tier**: Large (400 budget), same as this session — Phase 6 is not closed.
- **Entry state for closing Phase 6**: all Chapter 1 David placeholders resolved, the vertical slice playable end to end, and its tree-document lines passing.

## Open Items

### Short Term
- Six unresolved `## DAVID:` placeholder lines: `apple-lifted-quietly`, `apple-not-here`, `apple-first-bite`, and Teisha's three carried from the prior session.
- Decide the bite's state handoff (a third story state beyond calm/chase) and whether the Alley crates matter mechanically.
- Rule on route-clause treatment for the fourteen peering phrases other than `distant-alley`.
- ADR-324 (IDE error surfaces, from the previous session) still has five Open Questions with the interview offered but not run.

### Long Term
- W-8's shared-owner conversation gap (`packages/chord`) may need its own ADR if it stays uncomfortable at scale — 23 trees remain to place across 47 NPCs.
- GH #300 (no player farewell verb) blocks ST9 from ever firing; needs a platform decision, not a story workaround.
- W-1's diagnostic-attribution gap (phrase-overlap errors misattributed across imported fragments) is now measured, not just predicted; still open per the watch-list's existing note that it needs its own ADR amending ADR-251 D6's span contract.

## Files Modified

**Story content** (4 files):
- `branch-stories/secret-letter/peering.chord` - added `distant-alley` phrase + northwest dispatch line
- `branch-stories/secret-letter/secret-letter.story` - "THE APPLE AND THE ALLEY" section, MECHANISM DEVIATION note, deviation-list item 5, stallkeepers import
- `branch-stories/secret-letter/stallkeepers.chord` - new file, ten-keeper ST conversation tree (575 lines)
- `branch-stories/secret-letter/secret-letter.tests.json` - tree-document test lines updated for the new content

**Planning/tracking** (1 file):
- `docs/work/secret-letter-port/watch-list.md` - W-1 confirmed with measured data, W-8 added

**Unrelated to this session's work** (present in working tree, not touched here):
- `.devarch/descriptor.json`

## Notes

**Session duration**: state file recorded 165 tool calls against a 150-call budget tracked under Phase 4; the actual work is a Phase 6 increment carrying its own 400-call budget, so "over budget" applies only to the stale Phase 4 tracking, not to the phase actually worked.

**Approach**: content authoring against the change document and the measured 2009 source (`story.ni` line citations throughout), verified interactively via `sharpee play` for the patience-counter behavior rather than assumed from the source text.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Phase 6 continues; no incomplete work blocks this session's own deliverables)
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 4's change document sections for the apple/alley transition and the stallkeeper tree existed before this session began (David's answers already recorded); `packages/character/src/conversation/` and `define conversation` primitives were already verified real in Phase 6's entry state.
- **Prerequisites discovered**: none new — the two mechanism gaps found (taking-validate ordering, single-owner conversation binding) are platform behavior discovered while authoring, not missing prerequisites.

## Architectural Decisions

- None this session — no ADR written or amended. Two platform gaps (taking action's validate-time scenery rejection; single-owner `define topics`/`greetings`/`exchange` binding) were discovered and recorded in the watch-list/GH issue rather than resolved, per the plan's explicit scope guard against `packages/` changes.
- Pattern applied: capability/behavior dispatch already in the platform was used as-is (`after taking it while calm, once`, `on eating it` with `refuse when`); no new platform mechanism was invented for the story content.

## Mutation Audit

- Story content with state-changing logic modified: `secret-letter.story` (apple theft/refusal clauses), `stallkeepers.chord` (exchange/topic state via `asked again`/`asked many times`).
- Tests verify actual state mutations (not just events): YES (evidence: `./sharpee test branch-stories/secret-letter` run 2026-08-22 15:04 CDT, after the last edit to these files at 14:58 CDT — `67 cards passing, 72 assertions passing`; the apple theft/refusal tests assert on `apple.location` — `player` after the theft, unchanged after the refusal, not just on emitted events).
- No TypeScript side-effect functions (rule 15's function-name signal) were modified this session — this is Chord story-content authoring against existing platform behaviors, not new platform code.

## Recurrence Check

- Similar to past issue? NO — this is the first session to record a "MECHANISM DEVIATION" against the taking-action validate ordering or the single-owner conversation binding; no prior session or watch-list entry names either pattern. W-1's confirmation is a prediction made in an earlier watch-list entry coming true with measured data, not a new recurrence of a separate incident.

## Test Coverage Delta

- Tests added: tree-document lines added to `secret-letter.tests.json` covering the apple theft/refusal and the ST stallkeeper conversations (exact new-assertion count not isolated from the suite total below).
- Tests passing before: 44 cards / 46 assertions (per prior session's recorded exit state) → after: 67 cards / 72 assertions (evidence: `./sharpee test branch-stories/secret-letter` run 2026-08-22 15:04 CDT, `67 cards passing, 72 assertions passing`, exit 0, timestamped after the last edit to all four modified story files).
- Known untested areas: the six unresolved David placeholders (`apple-lifted-quietly`, `apple-not-here`, `apple-first-bite`, and Teisha's three) have no content yet and so no assertions; ST9's farewell arm is authored but unreachable pending GH #300.

---

**Progressive update**: Session completed 2026-08-22 15:04
