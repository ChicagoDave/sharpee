# Proposal: Publish-readiness defects — what gates a formal Sharpee 5.2.0 + Chord Writer publish

**Status**: REVIEWED — `proposal-review` ran 2026-09-03 (8 blocking findings, 5 advisory). David: *"accept the 36 and take your recommendations on the eight"* — 40 items ACCEPTED (P-8 with its ADR-325 amendment; P-7 absorbed by P-8; P-33 enumerated; P-34 owning the Reset item; P-42 reworded to the site), 4 items (P-11, P-20, P-21, P-29) PROPOSED pending the ADRs the plan's first phase writes. Advisory tensions carried into the plan: ADR-326 D5's sentence (P-3), ADR-290's status (P-35), the pinned tutorial edition (P-37), the language freeze against the live port (P-44), the tick-order audit inside P-11/P-17.
**Origin**: issue set — the open GitHub issues as of 2026-09-03, filtered to what an outside author writing a modest Chord story meets in their first hours, plus the release gate itself. Each item's text is copied in from the issue; nothing links live.
**Date**: 2026-09-03
**Session**: b6d0a8

David asked what shape Sharpee/Chord is in for publishing outside of Secret Letter. The measured answer (2026-09-03): the author path is complete end to end — `sharpee init`, write, `build`, `publish` produced a working 0.4 MB zip of Fernhill today, IFID enforced, four themes, assets in; Chord Writer 1.3.1 shipped 2026-08-18 signed and notarized with auto-update and a Publish tab; `@sharpee/*` 5.1.1 is on npm (2026-08-19) and the repo is at 5.2.0 unpublished. **The platform is publishable by its author and not yet by its audience**: the language is mid-migration (ADR-327/329/330/332 landed in the last three weeks), the tutorial no longer type-checks, no outside author has ever installed devkit and shipped a story, and the open defect list is where a first story lands. This proposal is the punch list that closes that gap. Chosen against the whole open issue set with David (2026-09-03: *"keep all of them, add #94 too"*).

**Deliberately out**: #347 (ADR-320 D10 is built; close it separately), #352 (the in-repo bundle harness, not the author path), #344 (Secret Letter content), features needing ADRs (#197, #298, #291, #299, #267, #272, #200), the testing-UX revamp set (#193, #194, #198, #252–#254, #243, #244 — its own plan), API hygiene (#135–#143), the docs sweeps other than #94 (#213, #214, #215, #247), IDE polish (#129, #188, #289, #292–#297), Chord features (#303, #263, #269, #268).

**Standing rule for the run**: every fixed defect ships with a test that pinned it first — a Chord fixture story under `packages/<pkg>/tests/fixtures/` run through `./sharpee test`, or a transcript for stdlib/parser items — and the fix is not DONE until that test fails without the change and passes with it (DEVARCH rules 12–13a).

## Items

### A. Chord language and loader defects a first story hits

### P-1: One-way exits (#327) — a plain exit is bidirectional at load, so a room reachable only by an authorial move leaks a back door
- **Issue text**: the loader lowers a plain exit through `world.connectRooms`, which stamps both directions; Behind Fruit Stall's single `southwest to the Fruit Stall` minted a `northeast` exit in. `, one-way` has been reserved since ADR-234 D4.
- **Done when**: `<direction> to <room>, one-way` compiles and the reverse direction does not exist at load (a fixture asserts the reverse command is refused as unknown); the plain form's behaviour is documented on sharpee.net either way.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-2: A room's `first time` paragraph never renders on entering by going (#326)
- **Issue text**: `compose` emits the initial-description key and the loader sets it on the room trait, but arrival by `go` prints only the standard description, and so does the first explicit `look`.
- **Done when**: a fixture room with `first time` renders the paragraph on first arrival by going and never again; the standard description follows it.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-3: An authorial `move the player to …` never describes the destination (#331)
- **Done when**: after any authorial move of the player the destination's room description prints in the same turn, including `move the player to a random adjacent room`.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-4: A possessive-named entity cannot be used in a condition or a `change` (#336)
- **Issue text**: `the Weaponsmith's Stall is blocked` splits at the `'s` into an entity and a possessive field; the diagnostic points at the wrong word.
- **Done when**: a possessive `create` name resolves as a name in conditions and statements; when a genuine possessive field is meant the parser prefers the declared entity name and the diagnostic names the ambiguity.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-5: `phrase <key> with <param> = <value> when <condition>` cannot parse (#335)
- **Done when**: both orderings (`with … when …` and `when … with …`) parse and evaluate; `when` is a value stop.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-6: No bare-name marker — `{item}` is rejected and "another [noun]" cannot be rendered (#337)
- **Done when**: a phrase body can name a bound entity with no article (`{item}` or a documented no-article hint) and the binder renders the bare name.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-7: A removed entity in a `blocked while` condition breaks the exit (#330) — absorbed by P-8
- **Review note (2026-09-03)**: P-8's *gone* semantics subsume this; the fixture here is P-8's first test case and the two are planned together.
- **Issue text**: after `remove the voices`, entering the room throws `Expected an entity, got o0g` and the direction stops parsing.
- **Done when**: a `blocked while <entity> is here` condition reads false after the entity is removed; entering the room and taking the exit both work.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-8: A removed entity in a refuse-when condition throws as "I don't understand that." (#345)
- **Issue text**: David's direction (2026-08-31) — removed items remain in memory as *gone*: `remove` marks rather than destroys.
- **Done when**: `remove` marks the entity gone; every condition naming a gone entity evaluates (is-here false, has false, states as last set) instead of throwing; a story condition error never surfaces as the parser's "I don't understand that."; **and ADR-325 Z6 ("`remove` is unchanged and stays terminal") is amended with the *gone* semantics in the same landing** (review 2026-09-03, STALE ADR).
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-9: A phrase emitted in the same clause arm that moves its owner off-stage never renders (#329)
- **Done when**: a phrase emitted before its owner is moved offstage or removed in the same arm renders in that turn's output.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-10: An authorial `move` of a worn item leaves it worn (#334)
- **Done when**: moving a worn item off its wearer clears the worn flag; `the player wears X` reads false; taking it back leaves it carried, not worn.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-11: Only one trait's `on <action>` clause per entity is consulted (#332)
- **Issue text**: `getInterceptorForAction` picks one interceptor by priority (ADR-118); a second composed trait's clause for the same action never fires. #350 (a trait's guarded `asking` clause shadows the owner's topic table even when the guard is false) has the same cause.
- **Done when**: every composed trait's clause for an action is consulted in a documented order; a false guard falls through to the next clause and then to the owner's own arm (topic table included).
- **Status**: PROPOSED — acceptance waits on an ADR-118 amendment naming the composed-clause consultation order (plan Phase 1 writes it) (review 2026-09-03, DECISION-IN-DISGUISE; ADR-0009)

### P-12: `x me` ignores the player's `phrase detail while …` line (#325)
- **Done when**: examining the player renders its `phrase detail while` lines exactly as examining any other person does.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-13: Inline `kill the player` bodies collide across imported files (#324)
- **Issue text**: keys are minted from fragment-relative line:col; two imports at the same position produce `duplicate-phrase`. Spans carry no file identity (watch-list W-1).
- **Done when**: inline kill keys are unique across imports (file identity in the key or in the span) and a fixture with two imports killing at the same line:col compiles.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-14: `{phrase-key}` prints literally inside a `define phrase` body (#286)
- **Done when**: interpolation works in phrase bodies as it does in description bodies, or the analyzer rejects it with a diagnostic; silent literal output never happens.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-15: `the direction is <word>` never matches with compass canonicals (#285)
- **Done when**: a `refuse when the direction is east` and a `phrase … when the direction is northeast` both fire under a compass `directions` block; the analyzer's accepted spelling is the runtime's matched spelling.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-16: A `must be reachable` action slot cannot resolve the player (#312)
- **Done when**: `kick me` / `kick myself` resolve under a reachable constraint the way stdlib's `attack me` already does.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-17: The dialogue analyzer admits dialogue-only forms outside dialogue dispatch, and the acting statement rejects the shape it names (#349, #351)
- **Issue text**: `is concluded` in an every-turn clause and `leave` in a floor-turn beat pass `compose --check` and throw at runtime; `<npc> talks to <target>` fails `act-slot-shape` against `talk to|with :target`.
- **Done when**: the two forms are rejected at compile time with a diagnostic that names the spelling that does hold outside dialogue, or are given a story-level meaning; `<npc> talks to <player-name>` and `talks to the player` compile and address the player.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### B. Parser and stdlib defects the player sees

### P-18: NPC-carried items are invisible to the player (#313)
- **Done when**: an item an NPC carries is in scope for `examine` and `take` (concealed items excepted), so the author's refusal arms are reachable.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-19: No bare `take X from Y` shape; `remove … from` re-wears a wearable (#314)
- **Done when**: `take cap from satchel` works without a tool; `remove cap from satchel` leaves the cap carried, not worn.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-20: A bare noun after a missing-object prompt should complete the command (#318)
- **Done when**: after "What do you want to drop?" the next input, if it resolves as a noun phrase in scope, completes the held command; otherwise it parses fresh.
- **Status**: PROPOSED — acceptance waits on a short ADR placing the held command (engine or parser) and its expiry (plan Phase 1 writes it) (review 2026-09-03, DECISION-IN-DISGUISE; ADR-0009)

### P-21: Story-action bare-verb grammar needs scoping or stdlib fall-through (#317)
- **Done when**: a story action whose only failing gate is a `refuse when` condition falls through to the stdlib parse of the same verb (or the grammar line can be scoped), so a room-local `drop` does not shadow stdlib's `drop` everywhere.
- **Status**: PROPOSED — acceptance waits on an ADR-087/267 amendment choosing refusal fall-through or scoped grammar (plan Phase 1 writes it); the Done-when then loses its "or" (review 2026-09-03, DECISION-IN-DISGUISE; ADR-0009)

### P-22: An instrument-first pattern leaves the direct object empty (#333)
- **Done when**: `hang the item on the target` with `the item is an instrument` binds the target as the direct object; the trait clause fires.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-23: Room description on entering omits scenery supporters' contents (#338)
- **Done when**: arriving by going, by authorial move, and an explicit `look` produce the same contents listing, supporters included.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-24: "a boots (worn)" — an article on a plural worn item (#328)
- **Done when**: the inventory's worn group honours the first item's plurality (no article or `some`).
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-25: "the Jack" in third-person act narration (#323)
- **Done when**: a proper-named person is never prefixed with an article in the platform's third-person voice (ADR-328 D4).
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-26: A player cannot answer an open exchange (#346)
- **Issue text**: `define exchange` rows are bare answer words (`yes`, `aye`, `sworn`) and none parse; the only path is `ask kemp about yes`.
- **Done when**: while an exchange is open, a bare answer word, `say <word>` and `answer <word>` all reach the exchange; outside one, `say`/`answer` get a sensible refusal.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-27: A player cannot say goodbye (#300)
- **Done when**: `goodbye`/`bye` end the current conversation with the NPC's parting line if authored; `on leaving`'s meaning is documented as the NPC's departure.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-28: Tool gates require the instrument named even when held (#241)
- **Done when**: `cut the fuse` with the shears in hand succeeds by implicit instrument; without it the refusal says what is needed.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-29: Entity topics fall through silently when the topic entity is out of scope (#242)
- **Done when**: an entity topic fires wherever the NPC is, with the referenced entity's scope irrelevant, or the analyzer says which form is scoped; the generic fall-through never masks an authored reply.
- **Status**: PROPOSED — acceptance waits on a ruling on entity-topic scoping in ADR-320's topic-table section (plan Phase 1 writes it); the Done-when then loses its "or" (review 2026-09-03, DECISION-IN-DISGUISE; ADR-0009)

### P-30: Melee no-effect message binds the weapon as the target (#206)
- **Done when**: the no-effect outcome names the target, pinned by the Dungeo wt-13 sequence at seed 42.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-31: Thirty-plus orphan message ids with no English template (#108)
- **Issue text**: 11 of 43 standard actions declare `requiredMessages` keys with no lang-en-us template; `restarting` has no lang file; each is a silent turn.
- **Done when**: a test enumerates every action's required messages against lang-en-us and fails on any orphan; the count is zero.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-32: Pronoun capture from error messages that name entities (#97)
- **Done when**: after "The window is closed.", `open it` resolves to the window.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-33: The nine Fernhill defects (#245)
- **Issue text**: nine found; #241, #242 and #243 were spun out (P-28, P-29 and the testing set), leaving these seven, each asserted-as-it-behaves in a committed Fernhill transcript marked with a comment:
  1. the winning paragraph prints twice (`win.transcript`; `fernhill-saved` emitted back-to-back);
  2. the fuse's per-turn phrase fires after the blast that killed the player;
  3. the vine describes itself as a seedling while in the `flowering` state;
  4. `take the deed` on the closed box silently takes the box;
  5. the folly door's custom refusal is bypassed by the natural command;
  6. `hiding-spot` changes nothing observable;
  7. smoke follows before being fed, so the whole tool chain buys one sentence.
- **Done when**: each of the seven is either fixed in the platform or fixed in Fernhill's source (the planner sorts which), and its marked transcript assertion is corrected to the intended text; none remains asserted-as-broken.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### C. Publish and the web client

### P-34: Web client Reset menu item (#248)
- **Done when**: the published client's menu offers Reset, which clears every key under the story's storage prefix after confirmation, and nothing outside it.
- **Review note (2026-09-03)**: duplicated phase-6-fallout P-3 (PLANNED, with no plan file behind it); that item is stamped *superseded by publish-readiness-defects P-34* and this one owns the work.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-35: Menu-less Play pane; publish offers the in-page menu as an option (#196)
- **Done when**: one template, a menu flag; the Play pane serves without the in-page chrome; `sharpee publish` and the Publish tab offer the menu on or off.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-36: Chord Writer Restart does not clear the Play pane (#195)
- **Done when**: Restart clears the play origin's storage before reload, so the world starts fresh and the recording state matches the screen.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### D. The release gate

### P-37: The tutorial no longer type-checks; `repokit test:npm` is red (#224)
- **Done when**: `./repokit test:npm tutorials/familyzoo/v2.0.0` type-checks and its transcripts pass against 5.2.0; v1.5.0 is either migrated or retired with a note.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-38: ADR-327 test fallout — `test:ci` must be green (#320, #319)
- **Done when**: `scripts/__tests__/cli-chord-seed.test.ts` and friendly-zoo's `state-assertions.transcript` pass; `pnpm exec turbo run test:ci` and `pnpm test:scripts` are both green on the release commit.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-39: sharpee.net testing docs stop at hello-world and recommend `--chain` (#246)
- **Done when**: the site documents `continues:`/`--tree`, `seed:`, goldens, `[STATE:]`/`[EVENT:]`/`[CHANNEL:]`, and no page recommends `--chain` to authors.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-40: cloak-of-darkness ships two divergent implementations (#231)
- **Done when**: one implementation remains, both harnesses run the same source, and the transcript suite passes on it.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-41: `sharpee test` lacks `--bless`/`--watch`; `sharpee play` drops piped commands (#239, #240)
- **Done when**: `sharpee test --bless` records goldens and `--watch` re-runs on change; `printf 'north\nnorth\n' | sharpee play` runs both commands; no error message names a flag the author does not have.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-42: The author-facing guide set on sharpee.net covers what #94 asked of docs/guides
- **Issue text**: #94 asked for `docs/guides/` to be reviewed for accuracy, stripped of stale content, extended with traits / capability dispatch / NPC guides, and made author-facing. `docs/guides/` was quarantined to `docs/unofficial/` on 2026-08-14 (docs-consolidation P-2, David's acceptance) and sharpee.net is the author canon, so the work moves to the site and #94 closes as superseded by it (review 2026-09-03, CONTRADICTION resolved by rewording).
- **Done when**: sharpee.net carries an author-facing guide for each subject #94 listed (traits, capability dispatch, the NPC system, and the existing seven's subjects where the site lacks one), each verified against 5.2.0; the site's sidebar resolves every link; nothing under `docs/unofficial/` is touched.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-43: The outside-repo proof — install devkit from npm and ship a story from a clean directory
- **Issue text**: new. ADR-180 Phase U2 names the globally-installed author flow; nobody has run it outside this repository.
- **Done when**: on a machine or directory with no clone of this repo, `npm i -g @sharpee/devkit@5.2.0`, `sharpee init`, a small story written from the sharpee.net getting-started page alone, `sharpee test`, `sharpee build`, `sharpee publish`, and the zip's `index.html` played in a browser through to an ending — recorded as a dated transcript of the commands and their output in `docs/work/publish-readiness/`.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)

### P-44: The publish itself — Sharpee 5.2.0 and Chord Writer together, against a frozen language
- **Issue text**: new. Versions move at publish, not per landing; the npm release runs through the `Publish to npm` workflow; Chord Writer through `tools/ide/release-all.sh`.
- **Done when**: (1) a language freeze is declared for the run — no grammar or IR change lands between P-1's first fix and the publish, recorded as a dated line in this proposal; (2) `@sharpee/*@5.2.0` is on npm via the workflow with `git diff --exit-code` clean after stamping; (3) Chord Writer's next version ships as signed, notarized DMGs for both architectures, its status bar naming Sharpee 5.2.0 and the Chord version; (4) sharpee.net's install page names the published versions; (5) P-43's proof was run against the published artifacts, not the repo.
- **Status**: ACCEPTED (David, 2026-09-03, session b6d0a8)
