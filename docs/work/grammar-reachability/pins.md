# Phase 1 Pins — ADR-230 implementation (grammar-reachability)

Status: SIGNED OFF (David, 2026-07-17 — all six sub-decisions ruled; amendments folded inline. No later phase may improvise on these.)
Session: 907f28 → continued. Derives from ADR-230; plan at `docs/work/grammar-reachability/plan.md`.

Each pin below is a proposal with a recommendation. Items marked **[DAVID]** are the
sub-decisions that need an explicit ruling at this checkpoint; everything else is
mechanical consequence of ADR-230's accepted decisions.

## PIN 1 — parser-en-us reachability export

`EnglishParser` gains one method, placed near `getStoryGrammar()`:

```ts
/** Action ids reachable from this parser's registered grammar. Used by the
 *  stdlib reachability gate (ADR-230 D1). */
getReachableActionIds(): Set<string> {
  return new Set(this.grammarEngine.getRules().map(r => r.action));
}
```

- No new engine machinery: `GrammarRule.action` and `GrammarEngine.getRules()` already
  exist (`packages/if-domain/src/grammar/grammar-engine.ts`).
- The gate constructs a core-grammar-only parser via the existing
  `createParserWithLanguage` test pattern (`packages/stdlib/tests/test-utils/parser-helpers.ts`).
- Known possible amendment: Phase 6's verb-level assertion may need pattern-shape data,
  not just ids. If so, that is a recorded amendment to this pin, not a silent addition.

## PIN 2 — tool-field shape (OpenableTrait + CuttableTrait, shared verbatim)

Mirror `ILockableData`'s key fields exactly, shared by both traits:

```ts
toolId?: EntityId;      // single accepted tool
toolIds?: EntityId[];   // multiple accepted tools
```

- Behavior predicates mirror LockableBehavior: `requiresTool(entity)`,
  `canOpenWith(entity, tool)` / `canCutWith(entity, tool)`.
- One shared stdlib helper `validateToolRequirements()` mirroring
  `validateKeyRequirements` (`lock-shared.ts:60-106`), used by opening and cutting.
- **RULED (David, 2026-07-17): no `acceptsMasterTool` equivalent** — `acceptsMasterKey`
  itself is documented inert, never read; don't clone a dead field. No `autoX`
  equivalents either, same reasoning.
- Shape is shared verbatim between the two traits — any future divergence is a re-pin.

## PIN 3 — Chord `cuttable` clause + load-time authoring-error check

- **Syntax (confirmed, no parser change):** trait keyword `cuttable`, config key `tool` —
  `cuttable with tool the rusty knife` parses today via the generic
  `with <key> <article> <name>` trait-config machinery (`packages/chord/src/parser.ts:632-733`).
  Tool name → world-id resolution must be correct from the start (do NOT copy the
  pre-Phase-9 lockable bugs).
- **RULED (David, 2026-07-17): story-loader post-load pass**:
  after full load, for every entity carrying `CuttableTrait`, assert a registered
  capability behavior for `if.action.cutting` exists on it. Loader-side (not Chord
  analyzer) because implementations may come from either Chord clauses (`on cutting it`)
  or TS story code in hybrid stories — only the loaded world sees both. Diagnostic:
  load error `cuttable-unimplemented` — "Entity 'X' is cuttable but registers no
  cutting implementation." (D5-gate philosophy: authoring error at load, never a
  silent runtime no-op.)

## PIN 4 — D4 verb → action-id mapping table (complete, from verbs.ts)

Legend: ✓ already parses today (or lands via D2/Phase 3); **+** = new D4 alias grammar.

| Action | Already covered | New aliases (D4) |
| --- | --- | --- |
| going | go ✓ | + walk/run/head/travel `:direction`; `move` LEAVES the going list (see move ruling) |
| entering | enter, go in, go into ✓ | — |
| exiting | exit, leave, get out ✓ | + go out |
| climbing | climb, scale, ascend ✓ | — |
| looking | look, l ✓ | — |
| examining | examine, x, inspect, look at ✓ | + check, view, observe |
| reading | read, peruse, study ✓ | — |
| searching | search ✓ | find, locate REMOVED from verbs.ts (ruled — see below) |
| listening | listen, listen to (D2) | + hear, hear `:target` |
| smelling | smell, sniff (D2) | — |
| touching | touch, feel ✓ | — |
| taking | take, get, grab, pick up ✓ | + pick, acquire, take up |
| dropping | drop, discard, put down ✓ | + throw away |
| putting | put, put in, put on ✓ | + place |
| inserting | insert, insert into ✓ | — |
| opening | open ✓ | + unwrap, uncover |
| closing | close ✓ | + shut, cover |
| locking | lock (D2) | + secure |
| unlocking | unlock ✓, keyless (D2) | + unsecure |
| switching_on | switch/turn on, flip ✓ | + activate, start |
| switching_off | switch/turn off ✓ | + deactivate, stop |
| pushing | push, press, shove ✓ | — |
| pulling | pull, drag ✓ | + tug |
| turning | — | **DEFERRED (ruled)** — Phase 6 delivers a design sketch before any disposition; verb entry stays, gate carries a `deferred-design` exception |
| using | — | **DEFERRED (ruled)** — same treatment as turning |
| giving | give, offer ✓ | + hand |
| showing | show ✓ | + display, present |
| throwing | throw ✓ | + toss, hurl |
| attacking | attack, hit, strike, fight, kill ✓ | + break, smash, destroy (from ADR D4 list; declared in patterns surface — see PIN 4b) |
| wearing | wear, don, equip, put on ✓ | — |
| taking_off | remove, take off, doff, unequip ✓ | — |
| eating | eat, consume, devour ✓ | — |
| drinking | drink, sip, quaff ✓ | + swallow |
| talking | talk/speak/chat/converse ✓ (ADR-229 R3) | — |
| asking | ask ✓ | + inquire, question |
| telling | tell ✓ | + inform (note: `say` already parses → if.action.saying; no change) |
| answering | — | **DEFERRED (ruled)** — same treatment as turning |
| inventory | inventory, i, inv ✓ | — |
| waiting | wait, z ✓ | — |
| sleeping | sleep (D2) | + nap, doze, rest, slumber |
| saving | save ✓ | + save game |
| restoring | restore ✓ | + load, load game, restore game |
| quitting | quit, q ✓ | + exit game |
| help | help ✓ | + ?, commands |
| about | about, info, credits ✓ | — |
| scoring | score ✓ | + points |
| trace | trace ✓ | — |

**RULED — `move` (David, 2026-07-17):** move is a manipulation verb, never movement.
`move` leaves the going entry in verbs.ts. New patterns:
- `move :target :direction` → `if.action.pushing` (direction rides as the push
  direction, same channel `push :target :direction`-style commands use)
- `move :item to :destination` → `if.action.putting` (in/on resolved by destination
  type, putting's existing delegation)
- bare `move :target` → pushing (existing, unchanged)

**RULED — find/locate (David, 2026-07-17):** removed from verbs.ts — any alias would
be too story-specific; searching is the wrong semantics. Parked future idea (not
scheduled): a "recall/remind me of" meta action that reports where a previously-seen
object was last observed. Recorded here so the trim isn't re-litigated; the recall
concept needs its own design if ever picked up.

## PIN 4b — the second help surface: lang-en-us `patterns` arrays **[DAVID]**

Research found the per-action `patterns` lists in `lang-en-us/src/actions/*.ts` are a
second advertised surface (~150 distinct verb phrases), and it's where the ADR's own
break/smash/destroy examples actually live. It also contains genuinely junk entries
(`unclose`), archaic ones (`imbibe`), and unmapped ones (`taste`, `draw`, `extract`,
`collect`, `power on/off`, `spin`, `stick`, `greet`, `say hello to`, `save as`).

**RULED (David, 2026-07-17): option (b).** Phase 6 also reconciles patterns arrays
once, manually — promote defensible entries as mechanical aliases (munch/nibble→eating,
imbibe→drinking, power on/off→switching, yank→pulling, …), delete junk (`unclose`),
and flag the genuinely unmappable few for a David call in the Phase 6 review. Gate
mechanically covers verbs.ts; patterns arrays get a one-time manual truing (gating
them would require parsing the pattern DSL — machinery not worth it yet).

## PIN 5 — D1 gate sequencing (recorded decision)

Staged exceptions, gate lands EARLY (Phase 2): the gate's documented-exceptions list is
its native mechanism, so landing it first gives every later phase a mechanical
"did I close what I claimed" signal. Temporary exceptions each carry a comment naming
the phase that removes them; Phase 7 strips them all and leaves only the two permanent
by-design entries (`if.action.entering_room`, `if.action.deadly_room_death`).

---

## Checkpoint rulings (David, 2026-07-17)

1. PIN 2 tool-field clones: ACCEPTED — no master/auto equivalents.
2. PIN 3 check home: ACCEPTED — story-loader post-load pass.
3. turning/using/answering: **DEFERRED** — no disposition until we've thought through
   how each would actually be implemented. Phase 6 delivers a short design sketch per
   verb (what a generic implementation would mean, ADR-090 tension included) for a
   David ruling; verb entries stay in verbs.ts; the Phase 6 verb-reachability gate
   assertion carries `deferred-design` exceptions for their unparsed forms until ruled.
4. find/locate: REMOVED from verbs.ts — too story-specific to alias. Future parked
   idea: "recall/remind me of" (where was X last seen). Not scheduled.
5. PIN 4b: option (b) — one-time manual patterns-array reconciliation in Phase 6.
6. move: `move :target :direction` → pushing; `move :item to :destination` → putting;
   move leaves the going verb list. (Replaces the original `move :direction` proposal.)
