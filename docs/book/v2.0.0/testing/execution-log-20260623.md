# Execution Log — The Sharpee Author and Developer Manual

A naive front-to-back run of the book's code in a fresh container. I follow the
book exactly as written. I do **not** research or fix Sharpee problems; when
something in the book doesn't work as written, I log it here and move on.

- Container: Debian 12, fresh.
- `@sharpee/devkit` installed globally (per Ch. 1).
- Working from `the-sharpee-book.txt` (pdftotext of the built PDF).

Issue severities: **BLOCKER** (can't proceed), **DEFECT** (book step produces
wrong/error result but I can continue), **DISCREPANCY** (output differs from
what the book says), **TYPO/UNCLEAR** (book text issue).

---

## Volume I — Getting Started

### Chapter 1 — Installing Sharpee & the Sharpee CLI

**§1.3 Verify Node/npm** — OK.
- `node --version` → `v22.23.0` (book wants ≥ v18). ✓
- `npm --version` → `11.17.0`. ✓

**§1.4 Install the CLI** — OK.
- `npm install -g @sharpee/devkit` succeeded (needed `sudo` in this container
  because `/usr/local/lib` isn't writable by the `node` user — an environment
  detail, not a book issue). `sharpee` is on PATH at `/usr/local/bin/sharpee`.

**§1.5 Create a story project** — ✅ DONE (with ISSUE 1 standing).

> **ISSUE 1 — DISCREPANCY: `sharpee init my-zoo` is an interactive wizard, but
> the book presents it as a non-interactive one-liner.**
> The book (§1.5) shows:
> ```
> sharpee init my-zoo
> cd my-zoo
> npm install
> ```
> implying `init` scaffolds the project directly from the argument. In reality
> `sharpee init my-zoo` launches a prompt wizard:
> ```
> 📖 Create a new Sharpee story
> Story title (my-zoo):
> Story ID (package name) (my-zoo):
> ... (more prompts follow)
> ```
> The `my-zoo` argument becomes the default for the prompts rather than running
> unattended. A reader copy-pasting the three commands as a block will stall at
> the first prompt. Book should either document the wizard (and its questions)
> or `init` should honor the directory arg non-interactively.
>
> **Resolution / workaround:** `sharpee init` has an undocumented (in the book)
> `-y, --yes` flag — `sharpee init my-zoo -y` scaffolds non-interactively with
> defaults, which is what the book's one-liner *implies*. The book should add
> `-y` to the §1.5 snippet (or document the wizard). I proceeded with `-y`.

Scaffold produced exactly what §1.5 promises — `src/index.ts`, `package.json`,
`tsconfig.json` (plus a `.gitignore`, not mentioned but harmless). `npm install`
pulled the platform (`@sharpee/sharpee`, `@sharpee/world-model`) cleanly,
0 vulnerabilities.

**§1.6 Building the story** — ✅ OK, exactly as written.
- `sharpee build` → "TypeScript compiled successfully", emitted `dist/index.js`
  and `dist/my-zoo.sharpee` (the `dist/<id>.sharpee` the book describes). ✓
  (Also emits `dist/index.d.ts` — extra, harmless.)

**§1.7 Playing it** — ✅ OK, exactly as written.
- `sharpee init-browser` → created `src/browser-entry.ts`, `src/version.ts`,
  `browser/my-zoo.css`, updated `package.json`. ✓
- `sharpee build` (no `npm install` in between, per the book) → emitted a
  complete `dist/web/` (index.html, game.js 890 KB, base/engine/decorations/
  my-zoo CSS). ✓ Note: `init-browser`'s own "Next steps" suggest running
  `npm install` first for browser deps, but the book omits it and the build
  worked fine without it — book is correct here.
- Served with `python3 -m http.server -d dist/web` (book's command) → HTTP 200.
- **Play-tested under Playwright/Chromium** (headless): page renders the
  "Starting Room", `#command-input` accepts input, and the loop runs:
  `look` re-prints the room, `inventory` → "You aren't carrying anything at
  all.", `wait` → "Time passes...", turn counter advances 1→5. **No console or
  page errors.** The web client genuinely plays. ✓

> **OBSERVATION (not a book defect): `examine me` → "You can't see any such
> thing."** in the bare starter stub. Standard IF usually makes the player
> examinable by default. The book doesn't instruct `examine me` at this point
> (I tried it on my own), and this is the empty stub, not the zoo — so not
> logged as a defect. Flagging to re-check once the player gets an
> IdentityTrait in Ch. 2.

**Chapter 1 — COMPLETE.** Environment + scaffold + build + browser play loop
all verified working end-to-end. Only standing issue is ISSUE 1 (cosmetic:
book should show `-y`).

---

### Chapter 2 — Your First Room

Replaced `src/index.ts` with the Family Zoo story, assembled from the book's
pieces (§2.3 imports + config, §2.4 createPlayer, §2.5 initializeWorld, §2.7
exports), transcribed exactly as written.

> **ISSUE 2 — DISCREPANCY: the scaffolded starter `src/index.ts` doesn't match
> the book's Chapter 2 conventions.** The stub `sharpee init` generates:
> - imports `Story, StoryConfig` from **`@sharpee/sharpee`**, but the book
>   (§2.3) imports them from **`@sharpee/engine`**;
> - defines the story as an **object literal** (`export const story: Story =
>   { config, createPlayer, ... }`), but the book uses a **class**
>   (`class FamilyZooStory implements Story`).
> Neither is fatal — the book's `@sharpee/engine` import resolves because
> `@sharpee/engine` is present as a transitive dep (package.json only lists
> `@sharpee/sharpee` + `@sharpee/world-model`), and `tsc` finds it in
> node_modules. But a reader comparing the generated stub to the book will see
> two different import styles and two different story shapes for "the same"
> thing. Worth a footnote in the book, or aligning the template with the prose.

**§1.6 build of the Ch. 2 story** — ✅ OK. `sharpee build` → "TypeScript
compiled successfully", `dist/my-zoo.sharpee` (1.4 KB) + `dist/web/` rebuilt.
The book's exact code (the `@sharpee/engine` import, the class form) compiles
cleanly under strict TS.
- Cosmetic: the browser-build banner still prints "Story: An interactive
  fiction adventure (my-zoo)" — it reads **package.json**, not the story
  `config` in index.ts. At play time the *game* banner is correct (see below),
  so this is only a build-log cosmetic.

**§2.8 Try it** — ✅ ALL PASS (play-tested under Playwright/Chromium):
- Banner renders "Family Zoo / Story v0.1.0 / By Sharpee Tutorial" — the story
  `config` from index.ts is honored. ✓
- Room auto-lists contents: "You can see welcome sign, ticket booth here." ✓
- `look` → full room description ✓
- `examine sign` → "A brightly painted wooden sign welcomes you to the zoo." ✓
- `examine booth` → booth description ✓
- `take sign` → "The welcome sign is fixed in place." ✓ (book: "Can't — it's
  scenery") ✓
- `inventory` → "You aren't carrying anything at all." ✓
- No console or page errors. ✓

> **ISSUE 3 — DEFECT: the player is not examinable.** With the Ch. 2 code, the
> player has a full `IdentityTrait` (name `'yourself'`, description "Just an
> ordinary visitor to the zoo.", `aliases: ['self','myself','me']`). Yet every
> form fails with **"You can't see any such thing."**:
> `examine me`, `examine myself`, `examine self`, `examine yourself` (the
> player's own name!), `x me`, `look at yourself`. The player entity isn't in
> resolvable scope for examination even though the code clearly intends it to
> be (and standard IF convention expects `x me` to work). No crash — the game
> continues — so DEFECT, not BLOCKER. The book's §2.8 list doesn't instruct
> `examine me`, so a strict reader wouldn't hit it *here*, but the player's
> IdentityTrait is plainly meant to make it work. Re-check if a later chapter
> relies on examining the player. (This is the same symptom flagged as an
> OBSERVATION on the bare stub in Ch. 1 — now confirmed to persist with a
> fully-described player, so it's a platform/parser scope issue, not a missing
> trait.)

**Chapter 2 — COMPLETE.** Builds and plays; every §2.8 "Try it" command behaves
as the book says. Standing defect: ISSUE 3 (player not examinable).

---

## Volume I — Getting Started (cont.) / Volume II — Building a World

### Chapter 3 — The Play Loop & How a Turn Works

Conceptual chapter — the book states outright "You won't write any new code
here." It explains the turn pipeline: parse → resolve scope → run action
(validate/execute/report) → events become text → other actors move. Nothing to
build or run. The §3.3 worked example (`examine sign`) is behavior already
verified in Ch. 2. **No issues.**

- Side note reinforcing **ISSUE 3**: §3.2.2 says scope resolves words to
  entities "by their aliases — the aliases you put on an IdentityTrait back in
  Chapter 2," and that a non-match "ends right here with a 'you can't see any
  such thing' message." That is exactly what `examine me` yields, yet the player
  *has* `me`/`myself`/`self` aliases — so by the book's own description of scope,
  it should resolve. Confirms ISSUE 3 is a real parser/scope defect.

**Chapter 3 — COMPLETE (concept only).**

### Chapter 4 — Rooms & Navigation

Added the `Direction` import (§4.4) and replaced `initializeWorld` with the
four-room version (Zoo Entrance, Main Path, Petting Zoo, Aviary), exits wired
both ways, plus new scenery (direction signs, pygmy goats, toucan). Transcribed
exactly as written. `createPlayer`/config/exports unchanged.

**§1.6 build** — ✅ OK. TypeScript compiled successfully; `dist/web/` rebuilt
(game.js 894 KB). The new fields the chapter introduces — `Direction.*` exit
keys, `grammaticalNumber: 'plural'` on the signs/goats — all type-check.

**§4.7 Try it** — ✅ ALL PASS (play-tested under Playwright):
- `south` → Main Path (full desc + "You can see direction signs here.") ✓
- `examine signs` → direction-signs description ✓
- `east` → Petting Zoo ✓
- `west` → Main Path ✓
- `west` → Aviary ✓
- `east` → Main Path ✓
- `north` → Zoo Entrance ✓
- Every exit works in both directions; the "going action is free" claim (§4.5)
  holds — no movement code written. No console or page errors. ✓

**Chapter 4 — COMPLETE.** Navigation fully working.

### Chapter 5 — Scenery & Portable Objects

Added the §5.7 objects to `initializeWorld` (after the Ch. 4 scenery, before
placing the player): souvenir penny (item, Main Path), iron fence (scenery,
entrance), rabbits (scenery+plural, Petting Zoo), zoo map (item, entrance), bag
of animal feed (item, Petting Zoo). Transcribed as written.

**§1.6 build** — ✅ OK, compiled cleanly (game.js 895 KB).

**§5.8 Try it** — ✅ ALL PASS (Playwright):
- `look` (entrance) lists portable items inline: "...iron fence, zoo map here." ✓
- `take map` → "Taken." / `inventory` → "You are carrying: zoo map" ✓
- `examine fence` → description (scenery still examinable) ✓
- `take fence` → "The iron fence is fixed in place." ✓
- `south` carries the map along; Main Path shows "souvenir penny here." ✓
- `take penny` → "Taken." / `drop map` → "Dropped." / `look` shows map now on
  the Main Path ground ✓
- `east` → Petting Zoo lists "pygmy goats, rabbits, bag of animal feed" ✓
- `take feed` → "Taken." ✓
- `take goats` → "The pygmy goats **are** fixed in place." — **plural agreement
  works** (`grammaticalNumber: 'plural'` → "are", not "is"), exactly as §5.7's
  sidebar promises. ✓
- No console or page errors. ✓

**Chapter 5 — COMPLETE.** Portable-by-default, SceneryTrait, plural agreement
all verified.

### Chapter 6 — Containers & Supporters

Added `SupporterTrait` to imports; added backpack (portable container, entrance),
feed dispenser (container+scenery, Petting Zoo), park bench (supporter+scenery,
Main Path) per §6.2–6.3. `ContainerTrait` was already imported.

**§1.6 build** — ✅ OK (game.js 896 KB).

**§6.6 Try it** — ✅ ALL PASS (Playwright):
- `put map in backpack` → "You put the zoo map in the backpack." ✓
- `look in backpack` → "In the backpack you see: zoo map." ✓
- `inventory` → just "backpack" — portable container carries its contents as a
  single item, exactly as §6.2.1 promises ✓
- `put penny on bench` → "You put the souvenir penny on the park bench."; `look`
  then shows "On the park bench you see souvenir penny." (supporter always open) ✓
- `take dispenser` → "The feed dispenser is fixed in place."; `examine
  dispenser` still works ✓
- No console or page errors. ✓

> **MINOR (TYPO/UNCLEAR, cosmetic): article mismatch in §6.1 preview.** §6.1
> shows illustrative output "You put zoo map in backpack." / "You put penny on
> bench." — no articles. The real engine renders "You put **the** zoo map in
> **the** backpack." (the better form). The §6.6 "Try it" list doesn't pin exact
> wording, so this isn't a failed step — just the preview snippets in §6.1 don't
> match the engine's actual article handling. Not tracked as a real defect.

**Chapter 6 — COMPLETE.** Containers, supporters, capacity, composable traits,
portable-vs-fixed all verified.

### Chapter 7 — Openable Things, Locked Doors & Keys

Added imports `OpenableTrait, LockableTrait, DoorTrait`; added the §7.4 puzzle:
Supply Room, metal shelves (scenery), staff keycard (item @ entrance), staff
gate (EntityType.DOOR with Identity/Door/Openable/Lockable/Scenery), and rewired
Main Path exits to add `[SOUTH]: { destination: supplyRoom, via: staffGate }`
plus the Supply Room's return exit `via` the gate. (The §7.1 lunchbox/juice is
illustrative only — not part of the zoo, so not added.)

**§1.6 build** — ✅ OK (game.js 898 KB). The five-trait door entity and the
`via` exits all type-check.

**§7.5 Try it** — ✅ ALL PASS (Playwright):
- `take keycard` → "Taken." ✓
- `south` (Main Path), gate now listed ✓
- `south` → "The staff gate is locked." ✓ (the `via` check fires)
- `unlock gate with keycard` → "You unlock the staff gate with the staff
  keycard." ✓
- `open gate` → "You open the staff gate." ✓
- `south` → Supply Room ✓
- `examine shelves` → shelving description ✓
- `north` → back through the open gate to Main Path ✓
- No console or page errors. ✓

The whole find-key → unlock → open → pass puzzle works for free from the trait
combination, exactly as §7.2.2 / §7.6 describe.

**Chapter 7 — COMPLETE.** First real puzzle works end-to-end.

### Chapter 8 — Light & Dark

Added imports `LightSourceTrait, SwitchableTrait`; added flashlight (Switchable +
LightSource, in Supply Room), the dark Nocturnal Exhibit (`isDark: true`), its
animals (sugar gliders, bush babies, barn owl), and rewired Supply Room exits to
add the south passage (north still `via` the gate).

**§1.6 build** — ✅ OK (game.js 900 KB).

**§8.8 Try it** — ✅ ALL PASS (Playwright):
- Supply Room now lists the flashlight; `take flashlight` → "Taken." ✓
- `south` into the unlit exhibit → "It is pitch dark. You are likely to be eaten
  by a grue." (Zork homage); `look` → "It's pitch dark, and you can't see a
  thing." ✓
- `switch on flashlight` → "The flashlight switches on, banishing the darkness."
  — Switchable→LightSource linkage confirmed (flipping the switch sets isLit) ✓
- `south` → exhibit now lit, lists "sugar gliders, bush babies, barn owl" ✓
- `examine owl` / `examine gliders` → descriptions resolve only once lit ✓
- `switch off flashlight` → "...plunging the area into darkness."; `look` dark
  again ✓
- No console or page errors. ✓

**Chapter 8 — COMPLETE.** Darkness, light sources, and the switch linkage all
verified.

### Chapter 9 — The Map & Regions

Conceptual chapter, **no "Try it" section**, and §9.6 says outright "The zoo is
small enough to skip regions entirely." So the book's running zoo does *not*
include regions. To verify the API the chapter documents, I temporarily added
the §9.2 region code (`createRegion` ×2, `assignRoom` ×6) plus probe handlers,
tested, then **reverted** so the baseline matches the book for later chapters.

**API verification (temporary):**
- `world.createRegion(id, { name, ambientSmell })` and `world.assignRoom(roomId,
  regionId)` — ✅ compile and run as documented. `RegionOptions` fields
  (`name`, `ambientSmell`) type-check.
- §9.4 automatic boundary events — ✅ fire on crossing. Going south through the
  staff gate emitted `if.event.region_exited` (`regionId: reg-public`,
  `toRegionId: reg-staff`) and `if.event.region_entered` (`regionId: reg-staff`,
  `fromRegionId: reg-public`); the reverse crossing emitted the mirror pair.
  Payload carries `actorId`, `regionId`, `from/toRegionId`, `actionId`, `turn`.

> **ISSUE 4 — DEFECT: region boundary events are emitted twice.** Each
> `region_entered` / `region_exited` handler fired **twice per crossing** with
> identical payloads (same `turn`). Confirmed it's true double-emission, not
> double setup: a one-shot probe showed `initializeWorld` runs exactly **once**
> and each handler is registered **once**, yet each event dispatches twice. §9.4
> describes the events as firing "once for each region being left / entered," so
> any region-keyed logic (atmosphere lines, scoring, one-time triggers) written
> per the book would double-execute. Not a blocker (the zoo skips regions), but a
> real platform defect a reader following §9.4 would hit.

**Chapter 9 — COMPLETE (concept + API verified; regions intentionally not kept
in the zoo, per §9.6).**

## Volume III — Making It Interactive

### Chapter 10 — The Standard Actions & the Four-Phase Model

Conceptual, no code, no "Try it" — the book states "You won't write an action in
this chapter." Explains the four-phase action contract
(validate → execute → report → blocked) and the free stdlib verb catalog. Every
"free verb" it names that's relevant to the zoo has already been exercised in
Ch. 1–8 play-tests: take, drop, open, close, go/compass, examine, look,
inventory, put…in/on, unlock…with, switch on/off, wait. **No issues.**

**Chapter 10 — COMPLETE (concept only).**

### Chapter 11 — Scope & Visibility

Conceptual, no code, no "Try it." Explains scope (per-turn set of referable
entities), degrees of access (in-room / visible / reachable / carried / audible),
and permissive-parser-strict-action. Core claims already observed in earlier
play-tests: scope resolves the right entity by location (Ch. 2–7), and §11.3's
"darkness shrinks sight-based scope without deleting objects" is exactly the Ch. 8
dark-exhibit behavior (look/examine collapse to the darkness message; objects
reappear with light). **No issues. COMPLETE (concept only).**

### Chapter 12 — Readable Objects & Switchable Devices

Added `ReadableTrait` import; added info plaque (scenery+readable, Petting Zoo),
zoo brochure (item+readable, entrance), radio (item+switchable+scenery, Supply
Room). (The intro mentions a "yellow warning sign" but no code for it is given,
so not added.)

**§1.6 build** — ✅ OK (game.js 902 KB).

**§12.6 Try it** — ✅ ALL PASS (Playwright):
- `read brochure` → "The zoo brochure reads:" + the multi-line guide (the `\n\n`
  stanza breaks render); `examine brochure` → the physical description. read and
  examine pull from different traits, exactly as §12.1's table promises. ✓
- `read plaque` → goat/rabbit text; `examine plaque` → "A brass plaque mounted
  on a wooden post…" ✓
- `examine radio` → description; `switch on radio` → "The radio hums to life.";
  `switch off radio` → "The radio powers down with a soft whir." (bare
  Switchable, no light) ✓
- `take radio` → "The radio is fixed in place." (SceneryTrait) ✓
- No console or page errors. ✓

**Chapter 12 — COMPLETE.** ReadableTrait and standalone SwitchableTrait verified.

## Volume IV — Custom Behavior

### Chapter 13 — Event Handlers

Biggest code change yet. Added: imports `GameEngine` (@sharpee/engine),
`ISemanticEvent` (@sharpee/core), `IWorldModel` (@sharpee/world-model); two
private class fields (`roomIds`, `entityIds`); a Gift Shop room west of the
Aviary (rewiring the Aviary exits) with a souvenir press (container+scenery); ID
bookkeeping at the end of `initializeWorld`; and a new `onEngineReady` method
holding two `world.chainEvent(...)` registrations (§13.5 goats, §13.6 press).

**§1.6 build** — ✅ OK (game.js 904 KB). All three new packages/types resolve
and the `chainEvent` signature + returned event-object shape type-check.

**§13.7 Try it** — ✅ ALL PASS (Playwright):
- `drop feed` (in Petting Zoo) → "Dropped." **then** the goats' reaction
  paragraph — the chain handler's custom `zoo.event.goats_react` event renders
  its `text` and the original "Dropped." survives (confirms §13.2's
  game.message warning — using a custom type adds rather than replaces). ✓
- `put penny in press` (Gift Shop) → the put line **then** "CLUNK! CRUNCH!
  WHIRRR! …"; `inventory` afterwards shows **pressed penny**, not the plain one
  — the 4-step transform (removeEntity → createEntity → moveEntity → return
  event) works. ✓
- `examine pressed penny` → "A flattened oval of copper with an embossed
  toucan." ✓
- The `this.roomIds`/`this.entityIds` cross-phase ID pattern works (`this` binds
  correctly in `onEngineReady`; fields set in `initializeWorld` are readable
  there). ✓
- "React once" guard (`getStateValue`/`setStateValue 'goats-fed'`) present;
  couldn't double-trigger via re-drop (drop needs the item carried), so the
  guard wasn't stress-tested but the single-fire path is correct. No errors. ✓

**Chapter 13 — COMPLETE.** Both event-handler patterns (reaction + transform)
work end-to-end.

### Chapter 14 — Custom Actions

Largest chapter so far. Added imports `Action, ActionContext, ValidationResult`
(@sharpee/stdlib), `Parser` (@sharpee/parser-en-us), `LanguageProvider`
(@sharpee/lang-en-us). Added two top-level `Action` consts (`feedAction`,
`photographAction`) with full validate/execute/report/blocked phases + message-id
maps; a disposable camera in the Gift Shop; and three class methods —
`getCustomActions()`, `extendParser()` (grammar patterns `feed :thing`,
`photograph/photo/snap :thing` with `.withPriority(150).build()`), and
`extendLanguage()` (message text for every id).

**§1.6 build** — ✅ OK (game.js 907 KB). All five new imports resolve; the
`grammar.define(...).mapsTo(...).withPriority(...).build()` fluent API and
`language.addMessage(...)` type-check. (Note: the pdftotext of §14.5 truncated
the grammar lines mid-`.build` — reconstructed as `.build()`, which is correct.)

**§14.7 Try it** — ✅ ALL PASS (Playwright):
- `feed goats` → "You scatter some feed on the ground. The pygmy goats rush
  over…" (custom verb fires; FED_GOATS message) ✓
- `feed goats` again → "You've already fed them. They look contentedly full."
  (ALREADY_FED — the validate `getStateValue('fed-<id>')` guard) ✓
- `photograph goats` (no camera) → "You don't have a camera. There's one in the
  gift shop." (blocked phase, NO_CAMERA) ✓
- Gift Shop lists "disposable camera"; `take camera` → "Taken." ✓
- `photograph press` → "Click! You snap a photo of souvenir press. That one's
  going on the fridge." — `{target}` param substitution works ✓
- Verbs registered via `getCustomActions` + `extendParser` + `extendLanguage`
  all cooperate; the four-phase model drives a custom action exactly like a
  stdlib one. `photo`/`snap` aliases are registered (only `photograph`
  exercised). No console or page errors. ✓

**Chapter 14 — COMPLETE.** Full custom-verb pipeline (action + grammar +
language) verified.

### Chapter 15 — Capability Dispatch

Most intricate chapter yet. Added the capability toolkit imports (`ITrait`,
`CapabilityBehavior`, `CapabilityValidationResult`, `CapabilitySharedData`,
`CapabilityEffect`, `createEffect`, `registerCapabilityBehavior`,
`hasCapabilityBehavior`, `findTraitWithCapability`, `getBehaviorForCapability`
from @sharpee/world-model). Added a custom `PettableTrait implements ITrait`
(with `static capabilities`), a `pettingBehavior` branching on `animalKind`, a
hand-written `pettingAction` dispatcher, gave goats/rabbits the trait, added a
parrot (ACTOR) to the Aviary, and registered the behavior once (guarded by
`hasCapabilityBehavior`). Wired the action into getCustomActions/extendParser
(`pet`/`stroke`)/extendLanguage.

**§1.6 build** — ✅ OK (game.js 910 KB). The custom trait class, the
`CapabilityBehavior` shape, the dispatch helpers, and `createEffect` all
type-check.

**§15.6 Try it** — ✅ ALL PASS (Playwright):
- `pet goats` → "You pet the nearest goat. It leans into your hand and bleats
  happily…" ✓
- `pet rabbits` → "You gently stroke one of the rabbits. Its fur is incredibly
  soft…" ✓
- `pet dispenser` → "You can't pet that." (no PettableTrait → CANT_PET) ✓
- `stroke rabbits` (alias) → same rabbits message ✓
- `pet parrot` → "CHOMP! It nips your finger. \"NO TOUCHING!\"…" — same verb,
  the parrot's `animalKind` selects the bite branch ✓
- One behavior, per-entity outcomes via the trait's own data, exactly as §15.5
  diagrams. No console or page errors. ✓

**Chapter 15 — COMPLETE.** Capability dispatch (custom trait + behavior +
hand-written dispatcher) verified end-to-end.

### Chapter 16 — Custom Traits & Behaviors

No "Try it." Conceptual chapter on the trait(data)/behavior(rules) split. Its
`DispenserTrait`/`DispenserBehavior` example is illustrative — the §16.4 caller
("inside a custom action's execute phase, or an event handler") is hypothetical,
so the book never wires the dispenser to a playable verb.

Verified the chapter's concrete, falsifiable claim — the multi-file pattern and
the **ESM `.js`-extension relative import** (§16.3): created `src/dispenser-
trait.ts` and `src/dispenser-behavior.ts` exactly as written (the behavior
imports `from './dispenser-trait.js'`).

**§1.6 build** — ✅ OK. `tsc` compiled both new files → `dist/dispenser-trait.js`
+ `dist/dispenser-behavior.js`; the `.js`-extension relative import resolves.
game.js unchanged at 910 KB (the files aren't imported by index.ts, so nothing
new is bundled — faithful, since the book leaves the dispenser unwired). No
runtime play-test applicable (no verb triggers the behavior).

**Chapter 16 — COMPLETE (concept; trait/behavior file pattern + ESM `.js` import
verified by compilation).**

## Volume V — Words

### Chapter 17 — Extending the Grammar

No "Try it." Conceptual deep-dive on the `extendParser` grammar builder, whose
core path (`define`/`mapsTo`/`withPriority`/`build` + multiple-pattern aliases)
was already verified working in Ch. 14–15. Documents three extras not used by
the zoo: `.where(slot, scope => …)` constraints (§17.6), two-slot
`feed :food to :animal` patterns (§17.5), and phrasal verbs (`pick up :item`).

Spot-checked the §17.6 `.where` claim by temporarily constraining the feed
pattern — found a real bug:

> **ISSUE 5 — DEFECT: §17.6's `.where` example doesn't compile under the strict
> tsconfig `sharpee init` generates.** The book shows
> `.where('animal', scope => scope.touchable())` with an un-annotated callback
> param. The generated `tsconfig.json` has `"strict": true` (→ `noImplicitAny`),
> so this fails to build: `error TS7006: Parameter 'scope' implicitly has an
> 'any' type.` The API itself is fine — annotating the param
> (`(scope: any) => scope.touchable()`) compiles and `.where`/`scope.touchable()`
> exist — so the fix is purely a missing type annotation in the book's snippet.
> A reader copy-pasting §17.6 verbatim hits a compile error. (Mirrors the spirit
> of ISSUE 2: book code vs. the strict template don't quite line up.) Reverted
> the experiment; the zoo keeps the plain `feed :thing` pattern from Ch. 14.

**Chapter 17 — COMPLETE (concept; core builder already verified, `.where` API
exists but its book snippet needs a type annotation — ISSUE 5).**

### Chapter 18 — The Language Layer — Messages & Message IDs

No "Try it." Conceptual; the core (`addMessage(id, template)` + `{param}`
substitution) was already verified in Ch. 14 ("photo of souvenir press"). Tested
the one new falsifiable claim — §18.5 "override an existing message ID":
temporarily registered `addMessage('if.action.taking.taken', '…')` and `take map`
printed the override instead of "Taken." ✅ — so overriding stdlib messages works
as documented. Reverted the probe.

> **ISSUE 6 — TYPO: §18.1/§18.3 cite a built-in message ID that doesn't exist.**
> The book uses `if.action.taking.success` as its running example of a stdlib
> message ID ("Every built-in verb emits IDs like if.action.taking.success").
> The real ID is **`if.action.taking.taken`** (confirmed in
> `@sharpee/lang-en-us/actions/taking.js`: key `'taken': "Taken."`). Overriding
> `if.action.taking.success` silently does nothing (no such ID); overriding
> `if.action.taking.taken` works. Minor because §18.1 presents it as an
> illustrative example, but a reader who follows §18.5 to re-skin "Taken." would
> use the wrong ID and see no effect (exactly what happened on first probe).
> Book should use the real ID.

**Chapter 18 — COMPLETE (concept; override mechanism verified; example ID is
wrong — ISSUE 6).**

### Chapter 19 — The Formatter Chain

No "Try it." Conceptual; most claims already observable in stdlib output:
- §19.2 **article formatters** (`{the:item}`, `{a:item}`): "the zoo map", "the
  backpack", "a flashlight" all render correctly across earlier chapters. ✓
- §19.5 **verb agreement** (`{is:item}`): verified back in Ch. 5 — "The pygmy
  goats **are** fixed in place." (plural) vs singular "…**is** fixed in place." ✓

> **ISSUE 7 — DISCREPANCY: room-contents lists render without the Oxford "and".**
> §19.6 shows the list formatter producing "a goat, a rabbit, **and** a parrot
> here." And the lang package's own `@sharpee/lang-en-us/data/events.js`
> (lines ~278–283) builds the line as
> `` `You can see ${allButLast.join(", ")} and ${lastItem} here.` `` — i.e. with
> a final "and". But the **actual rendered output** is comma-only:
> "You can see direction signs, souvenir penny, park bench, staff gate here."
> (captured fresh on both room-arrival and `look`, 4 items, no "and"). So the
> browser build isn't hitting that `events.js` path — the most visible list in
> the game reads as "A, B, C, D here" instead of "A, B, C, and D here", which is
> exactly the un-grammatical join Chapter 19 says the formatter chain prevents.
> Platform/build inconsistency (rendered output vs. the lang package's own
> source), surfaced while verifying §19.6. Low severity, but ironic for the
> formatting chapter. (Didn't fully isolate whether `{items:list}` used directly
> produces "and" — would need a custom array-param message not in the book.)

**Chapter 19 — COMPLETE (concept; article + verb-agreement formatters verified
via stdlib output; list rendering shows ISSUE 7).**

## Volume VI — Living Worlds

### Chapter 20 — Non-Player Characters

Big chapter. Added imports `NpcBehavior, NpcContext, NpcAction,
createPatrolBehavior` (@sharpee/stdlib), `NpcPlugin` (@sharpee/plugin-npc),
`NpcTrait` (@sharpee/world-model). Extended `roomIds` to include
`mainPath`/`aviary` for the patrol route. Added top-level `parrotBehavior`
(onTurn random squawk, onPlayerEnters emote) + PARROT_PHRASES; promoted the
Ch. 15 parrot to an NPC (`NpcTrait`, canMove:false); added Sam the zookeeper
(ACTOR + NpcTrait, canMove:true, behaviorId 'zoo-keeper-patrol') on the Main
Path; and in `onEngineReady` registered the `NpcPlugin`, built the patrol with
`createPatrolBehavior`, overrode its id, and registered both behaviors.

**§1.6 build** — ✅ OK (game.js 913 KB). All NPC types/plugin resolve.

**§20.5 Try it** — ✅ PASS (Playwright), NPC system works:
- Main Path lists "…zookeeper here."; `examine zookeeper` → Sam's description ✓
- Entering the Aviary fired **both** parrot hooks in one turn: the `onTurn`
  squawk ("BAWK! Welcome to the zoo!") **and** the `onPlayerEnters` emote ("The
  parrot ruffles its feathers and eyes you with interest.") ✓
- Subsequent `wait`s → random phrases from PARROT_PHRASES, ~50% of turns (one
  quiet turn observed — the per-turn coin flip), confirming `random.chance` /
  `random.pick`. The `npc.speech`/`npc.emote` platform message ids render the
  passed text verbatim (no extendLanguage needed), as §20.3 states. ✓
- **Zookeeper patrol is functional** (separate probe): Sam present on Main Path
  at start, absent while at other stops, back by wait 4, and found in the
  Petting Zoo when the player followed east — he cycles Main Path → Petting Zoo
  → Aviary and loops. ✓
- No console or page errors. ✓

> **ISSUE 8 — DISCREPANCY (minor): NPC room changes are silent.** The patrol
> works, but the engine prints no arrival/departure line when an NPC enters or
> leaves the player's room. Waiting on the Main Path shows only "Time passes…"
> even as Sam walks off to the Petting Zoo and (turns later) returns — his
> movement is imperceptible unless the player issues `look` and reads the room
> contents. §20.5's Try-it narration ("Sam patrols on toward the petting zoo")
> implies the player would notice; in practice there's no "Sam leaves to the
> east." / "Sam arrives." message, which undercuts the chapter's "world starts
> to feel inhabited" goal. The parrot feels alive (it speaks); the patroller is
> invisible in motion. Likely a platform gap (no NPC enter/exit announcement)
> rather than story code — the book doesn't show how to add such a line.

**Chapter 20 — COMPLETE.** NPC trait/behavior/plugin all work; parrot fully
visible, patrol functional but silent (ISSUE 8).

### Chapter 21 — Scenes

No "Try it," but §21.4 gives a concrete location-based scene — added it
(`scene-petting-zoo`, active while the player is in the Petting Zoo, `recurring:
true`, with onBegin/onEnd text). Kept it (it's the book's example; harmless
atmosphere). `createScene` is on the WorldModel already in scope; no new import
needed for this scene (SceneTrait would only be needed for the §21.5 timed
`activeTurns` example, which is illustrative and not added).

**§1.6 build** — ✅ OK (game.js 913 KB). `createScene({ begin, end, onBegin,
onEnd, recurring })` type-checks.

**Verification** (Playwright):
- Enter Petting Zoo → "A waft of hay and warm fur greets you." (onBegin) ✓
- Leave → "The animal sounds fade behind you." (onEnd) ✓
- Re-enter → onBegin fires **again** — `recurring: true` reactivates the scene ✓
- No console or page errors. ✓

Side note: scene onBegin/onEnd **do** print on room transitions — so the engine
can announce transitions; it just doesn't for NPC enter/leave (reinforces
ISSUE 8 — the capability exists, NPC movement simply doesn't use it).

**Chapter 21 — COMPLETE.** Scene lifecycle + onBegin/onEnd + recurring verified.

### Chapter 22 — Turns, Timed Events & Daemons

Added imports `SchedulerPlugin` (@sharpee/plugin-scheduler) + types `Daemon, Fuse,
SchedulerContext`. Added a `TimedMessages` table and three top-level factories
(`createPAAnnouncementDaemon`, `createGoatBleatingDaemon`,
`createFeedingTimeFuse`); registered the scheduler + daemons + fuse in
`onEngineReady` (alongside the NPC plugin); added the six message texts to
`extendLanguage`.

**§1.6 build** — ✅ OK (game.js 921 KB). Scheduler types all resolve.

**§22.6 Try it** — ✅ MOSTLY PASS (Playwright), scheduler mechanics all correct:
- PA daemon fired every 5th turn, capped at 4: turn 5 "closes in three hours",
  10 "Two hours", 15 "One hour", 20 "now closed". ✓ (turn modulus + closure
  counter)
- Feeding-time **fuse fired at turn 11**, not 10 — confirms §22.4's own warning
  that a fuse "skips its first tick, fires about eleven ticks after
  registration." ✓
- Fuse **re-armed**: fired again at turn 19 (= 11 + `originalTurns: 8`); `repeat:
  true` works. ✓
- **Conditional bleating daemon** ran exactly 3 turns (12–14) — the fuse set
  `feeding_time_active`/`bleat_turns_remaining`, the daemon counted down and
  stopped; ambient text only shows in the Petting Zoo. ✓ (fuse→daemon handoff
  via world state, exactly as §22.3/22.4 describe)
- `game.message` + `narrate: true` ambient output renders correctly. ✓
- No console or page errors. ✓

> **ISSUE 9 — DISCREPANCY: §22.6 says `feed goats` stops the bleating; it
> doesn't.** The Try-it lists `feed goats → "The bleating stops"`. But the
> feeding action from Ch. 14 sets `fed-<goatsId>`, while the bleating daemon
> keys off `zoo.feeding_time_active` / `zoo.bleat_turns_remaining` — two
> unrelated pieces of state the book never connects. In play, after `feed goats`
> the bleating **continued**; it only stopped when the daemon's own 3-turn
> countdown expired (as §22.3 correctly says: "counting itself down and
> stopping"). So §22.6's annotation contradicts §22.3 and the actual behavior —
> feeding has no effect on the bleating. To make `feed goats` stop it, the book
> would need (but never shows) an event handler on the feed action that clears
> `zoo.feeding_time_active`. A reader following §22.6 sees the bleating ignore
> their feeding. Mechanics are fine; the Try-it's causal claim is wrong.

**Chapter 22 — COMPLETE.** Scheduler/daemons/fuses all work; only the §22.6
"feed stops bleating" claim is incorrect (ISSUE 9).

### Chapter 23 — Scoring & Endgame

Added the §23.2 scoring tables (`MAX_SCORE`, `ScoreIds`, `ScorePoints`,
`ROOM_SCORE_MAP`, `ScoreMessages`), `createVictoryDaemon`, extended `entityIds`
with `zooMap`/`brochure`, `world.setMaxScore(75)`, the pet-behavior award (§23.3,
shown), the three §23.3 chain handlers (actor_moved room-visits, taken→map,
read→brochure), victory-daemon registration, and the VICTORY message text.

> **ISSUE 10 — DEFECT (completeness gap): the book defines 12 score IDs (75 pts)
> but only shows awarding code for 8 (40 pts), so victory is unreachable
> following §23.3 literally.** §23.2's table and `ScoreIds`/`ScorePoints` cover
> all 12 achievements totalling 75. But §23.3 only *shows* the awards for: pet
> (behavior execute), the 5 room visits (chain), map (chain), brochure (chain) =
> 40 pts. **No code is given** for FEED_GOATS (10), FEED_RABBITS (10),
> COLLECT_PRESSED_PENNY (10), PHOTOGRAPH_ANIMAL (5) = 35 pts. The prose ("hang
> awards wherever the achievement happens: inside custom actions and capability
> behaviors") invites the reader to add them, and the §23.5 Try-it assumes a path
> to "75 out of 75 — victory!", but a reader implementing only the shown code
> caps at **40/75** and the victory daemon never fires. To test the full chapter
> I added the 4 missing awards by analogy (feed action execute → goats/rabbits;
> photograph action execute; pressed-penny in the Ch. 13 penny-press chain),
> clearly marked "inferred" in the source. Book should either show those 4
> awards or state explicitly they're left to the reader.

**§1.6 build** — ✅ OK (game.js 924 KB). `awardScore`/`setMaxScore`/`getScore`
and the chain/daemon wiring all type-check.

**§23.5 Try it** — ✅ ALL PASS (Playwright full walkthrough, with the 4 inferred
awards in place):
- `score` (start) → "You have scored 0 out of 75, earning you the rank of
  Novice." ✓ (ranked score command + setMaxScore)
- Room visits scored via `if.event.actor_moved` (data.toRoom/destination) — all
  5 exhibits awarded; idempotent (no double-score on re-entry). ✓
- `feed goats`/`feed rabbits` (+10 each), `pet goats` (+5), `take map` (+5, via
  `taken` chain), `read brochure` (+5, via `read` chain), `photograph press`
  (+5), `put penny in press` (+10). ✓
- The moment the score reached 75 (put penny in press), the **victory daemon
  (priority 100) fired that same turn**: "Congratulations! You've earned your
  JUNIOR ZOOKEEPER badge … *** You have won ***" ✓
- Final `score` → "You have achieved a perfect score of 75 points!" ✓
- No console or page errors. ✓

**Chapter 23 — COMPLETE.** Scoring + idempotency + victory daemon all work;
book under-specifies 4 of the 12 awards (ISSUE 10), supplied by analogy.

## Volume VII — Presentation & Architecture

### Chapters 24 & 25 — Channels + The Web Client

Mostly conceptual (the channel/packet/renderer architecture), but §24.6 + §25.5
give a concrete coupled example — the `zoo.ambience` custom channel + its
browser renderer — so I implemented both. Story side: added `AMBIENCE_BY_ROOM`
and a `registerChannels(registry: IChannelRegistry)` hook (type from
`@sharpee/if-domain`; the engine auto-invokes it during `start()` —
game-engine.js:510). Browser side: added the §25.5
`renderer.registerRenderer('zoo.ambience', …)` to `browser-entry.ts` after
`connectEngine`.

**§1.6 build** — ✅ OK (game.js 924 KB). The `registerChannels` hook,
`IChannelRegistry`, and `client.getChannelRenderer().registerRenderer(...)` all
type-check.

**Verification** (Playwright):
- At the entrance (not in AMBIENCE_BY_ROOM): no `#zoo-ambience` element — the
  channel produced `undefined`, the renderer never ran. ✓
- Entering the Aviary: a renderer-created `#zoo-ambience` div appears with "The
  air is alive with birdsong and the rustle of wings." ✓ — the custom channel
  produces data and the custom renderer paints it, end to end (the core point of
  both chapters).
- No console or page errors. ✓

> **ISSUE 11 — DISCREPANCY (minor): the §24.6/§25.5 ambience line never clears
> when you leave a mood room.** §24.6 says rooms not in the map "stay quiet"
> (produce returns `undefined`), and the §25.5 renderer writes
> `String(value ?? '')` — which reads as "clear to empty when there's no value."
> But the channel is declared `emit: 'sparse'` ("only re-emit when the value
> changes"), so returning `undefined` emits **nothing** and the renderer is never
> called to clear — the last room's mood lingers. In play, walking Aviary →
> Main Path leaves "birdsong…" still showing on the Main Path. The renderer's
> `?? ''` hints clearing was intended, but `sparse` + `undefined` prevents it;
> `emit: 'always'` (or emitting `''` instead of `undefined`) would clear it. So
> "stay quiet" actually means "keep showing the previous mood," not "blank."
> Low severity; the feature itself works.

**Chapters 24 & 25 — COMPLETE.** Custom channel + custom renderer verified
(visible ambience line); minor staleness wrinkle (ISSUE 11).

### Chapter 26 — Decoration, Theming & the Status Line

Concrete deliverable: the `zoo-sunny` theme. Added the §26.4.2 `[data-theme=
"zoo-sunny"]` token block + flourish rules to `browser/my-zoo.css`, and the
§26.4 `sharpee.themes` array to `package.json` (`["modern-dark", "paper",
{ id: 'zoo-sunny', name: 'Zoo Sunny' }]`).

**build** — ✅ OK. `sharpee build` reported "Wired 3 theme package(s):
modern-dark, paper, zoo-sunny"; copied the two built-ins to
`dist/web/themes/*.css` (the custom one lives inline in the override stylesheet,
per §26.4.2); `index.html` gained a "Zoo Sunny" menu entry.

**Verification** (Playwright):
- Default theme = `modern-dark` (from browser-entry): body bg `rgb(30,30,46)`. ✓
- "Zoo Sunny" present in the theme menu. ✓
- Flipping `data-theme="zoo-sunny"` re-skinned the page: body bg →
  `rgb(255,250,240)` (`#fffaf0` cream), text → `rgb(47,42,36)` (`#2f2a24`) —
  exactly the four tokens in the block. "A theme is just a token block" and the
  engine re-reads the CSS variables, as §26.3/26.4 describe. ✓
- Status line (§26.5 — location/score/turn channels) has rendered correctly in
  every prior play-test (status bar shows room · Score · Turns). ✓
- No errors. ✓

Note: §26.1–26.2 prose decoration (`[em:…]` bracket syntax) wasn't separately
exercised — the book adds no decorated message to the zoo, so there was nothing
concrete to drive. Theming + status line, the chapter's substantive deliverables,
are verified.

**Chapter 26 — COMPLETE.** Custom theme wires in and re-skins; status line
confirmed.

### Chapter 27 — Media & Audio

No "Try it," ships no assets, and §27.6's room-atmosphere wiring is partial (the
event-processor registration call isn't shown). Verified the chapter's central,
falsifiable claim — "a story that declares a soundscape but ships no audio is
silent, not broken" (§27.4) — via the simplest faithful path: a one-off
`media.sound.play` emitted "straight from the action" (§27.6), added to the feed
action's report alongside its prose, with `src: 'audio/feed-crunch.mp3'` (no
asset shipped).

**§1.6 build** — ✅ OK. `context.event('media.sound.play', { src, volume })`
type-checks and bundles.

**Verification** (Playwright):
- `feed goats` printed its full prose (turn not broken). ✓
- The browser **requested `audio/feed-crunch.mp3` → 404** (the missing asset),
  then the game stayed fully playable (`look` worked next). ✓ — confirms §27.4:
  "the channel still fires and the renderer still runs, the browser just 404s…
  silent, not broken."
- No page errors. ✓

Kept the crunch event in the feed action (the book's v18 has it; "wire channels
first, drop assets later"). The AudioRegistry room-atmosphere model (§27.6) was
**not** fully wired — the book doesn't show how the room-entry handler is
registered on the event processor, and there are no assets — so it's
concept-only here; the media-event → channel → browser-renderer path itself is
verified by the feed crunch.

**Chapter 27 — COMPLETE (media-event mechanism verified silent-not-broken; full
AudioRegistry wiring underspecified in book + needs assets).**

## Volume VIII — Shipping

### Chapter 28 — Putting It All Together — The Multi-File Story

Conceptual/architectural. The book explicitly "walks their structure rather than
reprinting every line," pointing at external tutorial source
(`tutorials/familyzoo/src/ch28-multi-file/`) not contained in the book. The
§28.5 "after-hours" second act (parrot behavior swap via
`npcService.removeBehavior`, after-hours daemons, +25 bonus tier) is *described*
but no complete code is given. So there's nothing to transcribe-and-test
faithfully — refactoring my working single `index.ts` into the 7 suggested files
would mean inventing code the book doesn't provide. Left the working single-file
zoo as-is. **No issues; concept-only.**

**Chapter 28 — COMPLETE (conceptual; no reprinted code to verify).**

### Chapter 29 — Transcript Testing & Walkthroughs

Concrete + testable. `sharpee build --test` is supported (confirmed in
`build --help`: runs `tests/transcripts/*.transcript` unit tests and
`walkthroughs/wt-*.transcript` chains). Wrote a unit transcript
`tests/transcripts/feed-goats.transcript` in the §29.1 format (YAML header, `>`
commands, `[OK: contains/not contains]` + `[EVENT: …]` assertions), adapted to my
zoo's actual geography (the book's literal §29.1 example does `take feed` before
reaching the Petting Zoo — illustrative, doesn't match this layout — so I routed
entrance → south → east first).

**`sharpee build --test`** — ✅ PASS. Ran the transcript through the real engine:
all 4 commands passed, including the text assertions and the
`[EVENT: true, type="zoo.event.fed"]` event-layer assertion. "4 passed", "All
tests passed!", exit 0.

**Negative control** — ✅ tester genuinely asserts: a transcript asserting `look`
contains a nonsense string produced `FAIL ✗ Output does not contain "…"`,
"1 test(s) failed", exit 1. So the harness really checks, not just rubber-stamps.

**Chapter 29 — COMPLETE.** Transcript format, text + event assertions, the
`build --test` runner, and pass/fail detection all verified.

### Chapter 30 — Saving & Restoring

Mostly "you get it for free." Tested the concrete claim — browser autosave
restores mid-game on reload (§30.3).

**Verification** (Playwright, persistent context):
- Played to the Petting Zoo, fed goats, pet goats → Score 20, Turns 6.
- localStorage held `my-zoo-save-autosave` + `my-zoo-saves-index` (the autosave
  envelope, written per-turn off `channel:packet` with no story code). ✓
- **Reloaded the page** → state fully restored: Score 20, Turns 6, still in the
  Petting Zoo. ✓ No errors. Confirms §30.1: world state serializes to ISaveData
  and rebuilds on restore — score, turn count, and location all came back.
- §30.2's `getRunnerState`/`restoreRunnerState` trap: my PA-announcement and
  victory daemons already implement those hooks (they compile and ship); the
  world-resident score restored correctly. The closure-counter round-trip wasn't
  separately stress-tested (would need the after-hours swap daemon, which the
  book leaves as §28.5 prose).

**Chapter 30 — COMPLETE.** Autosave + restore verified across a page reload.

### Chapter 31 — Building & Publishing the Browser Client

The build/publish workflow I've exercised all book. Verified the substantive
claims:
- **Self-contained deliverable** (§31.2): `dist/web/` = index.html + bundled
  game.js (~947 KB) + base/engine/decorations/my-zoo CSS + themes/ — no server,
  no node_modules, no runtime dep. ✓
- **Version-stamped first** (§31.4): `src/version.ts` carries
  `STORY_VERSION 1.0.0`, `ENGINE_VERSION 1.0.0`, `BUILD_DATE
  2026-06-23T15:13:07Z` (matches this build). ✓
- **Runs with no server** (§31.2 "open index.html and the game runs"): loaded
  `file:///…/dist/web/index.html` directly under Chromium — banner rendered
  ("FAMILY ZOO … Zoo Entrance …") and `south` worked, no console/page errors. ✓

**Chapter 31 — COMPLETE.** Static, self-contained, versioned browser build runs
straight from `file://`.

### Chapter 32 — Multi-User with Zifmia

About a separate Docker-based server product (Zifmia) — WebSockets, a DB volume,
`docker compose`. Not deployable in this container (no Docker). The author-facing
claim is that "your story is just a `.sharpee` file the server loads, exactly as
it was for the single-player build" (no story-code changes).

**Verified at the artifact level:**
- The CLI documents `dist/<story>.sharpee` as the "Story bundle for **Zifmia
  runner**" — i.e. the same bundle drives single-player and multi-user. ✓
- `dist/my-zoo.sharpee` (12 KB) exists — the unchanged artifact a Zifmia server
  would mount. ✓
- The multi-user server itself (Docker image, join codes, turn lease, chat/
  presence channels) is out of scope here — no Docker, and it's infra, not story
  code.

**Chapter 32 — COMPLETE (concept; author artifact confirmed; server not testable
without Docker/Zifmia).**

---

## FINAL SUMMARY — full front-to-back run COMPLETE

**All 32 chapters worked through.** The Family Zoo (`my-zoo/`) was built up
cumulatively from Chapter 2's single room to the full game: 7 rooms, a
locked-door puzzle, light/dark, containers/supporters, readables, 2 event
handlers, 3 custom verbs (feed/photograph/pet via capability dispatch), a custom
trait/behavior pair, 2 NPCs, scenes, a scheduler (PA daemon + feeding fuse +
bleating daemon + victory daemon), full scoring to a 75-point victory, a custom
ambience channel + renderer, a custom theme, a media sound event, a transcript
test, autosave/restore, and a static `file://`-runnable browser build. Every
code chapter builds clean under strict TS and was play-tested under
Playwright/Chromium; conceptual chapters were verified against observed behavior
or by spot-checking their concrete API claims.

**Severity legend:** BLOCKER (can't proceed) · DEFECT (wrong result, can
continue) · DISCREPANCY (output differs from book) · TYPO/UNCLEAR.

**Issues found (11):**
1. DISCREPANCY — §1.5 `sharpee init` is an interactive wizard; the book's
   one-liner stalls. Workaround: undocumented `-y` flag.
2. DISCREPANCY — scaffolded stub `src/index.ts` differs from the book's Ch. 2
   conventions (`@sharpee/sharpee` vs `@sharpee/engine`; object literal vs
   class).
3. DEFECT — the player is not examinable (`examine me`/`yourself`/`self` all
   "can't see any such thing") despite a full IdentityTrait with those aliases.
4. DEFECT — region boundary events (`region_entered`/`region_exited`) are
   emitted **twice** per crossing (single init, single handler).
5. DEFECT — §17.6's `.where('animal', scope => scope.touchable())` doesn't
   compile under the strict tsconfig (`scope` implicitly `any`); needs an
   annotation.
6. TYPO — §18.1/§18.3 cite a built-in message id `if.action.taking.success`
   that doesn't exist (real id: `if.action.taking.taken`); overriding the cited
   id silently no-ops.
7. DISCREPANCY — room-contents lists render comma-only ("A, B, C here") with no
   Oxford "and", though the lang package's own `events.js` builds them *with*
   "and" and §19.6 illustrates "…, and …".
8. DISCREPANCY (minor) — NPC room changes are silent; no arrival/departure line,
   so the zookeeper's patrol is imperceptible without `look` (scenes *do* print
   on transitions, so the capability exists).
9. DISCREPANCY — §22.6 says `feed goats` stops the bleating; it doesn't (feed
   action and bleating daemon key off unrelated state). Bleating only stops via
   its own 3-turn countdown, as §22.3 correctly says.
10. DEFECT (completeness) — §23 defines 12 score IDs (75 pts) but shows awarding
    code for only 8 (40 pts); FEED_GOATS/FEED_RABBITS/COLLECT_PRESSED_PENNY/
    PHOTOGRAPH_ANIMAL (35 pts) have no code, so victory is unreachable following
    §23.3 literally. Supplied the 4 by analogy to reach 75/victory.
11. DISCREPANCY (minor) — the §24.6/§25.5 ambience line never clears on leaving
    a mood room: `emit: 'sparse'` + `produce` returning `undefined` means the
    renderer's `String(value ?? '')` clear-path never runs, so the last mood
    lingers.

**No BLOCKERs** — every chapter's code could be built and run; the worst issues
(ISSUE 3 player-examine, ISSUE 4 double region events) are DEFECTs that don't
stop progress. Several issues are book-text problems (ISSUEs 1, 2, 5, 6, 9, 10)
rather than platform bugs.

**Conceptual chapters with no code/Try-it** (verified by concept / observed
behavior / API spot-check): 3, 9, 10, 11, 16, 17, 18, 19, 24/25 (partly), 27
(partly), 28, 30 (mostly), 32.

**Environment notes:** built with `@sharpee/devkit` global CLI; play-tested via
Playwright/Chromium against `python3 -m http.server -d dist/web 8099`; driver
scripts in the session scratchpad (`play_chNN.mjs`).

---

## Current status / pick up here

**Environment is fully provisioned** (all installs done in this container):
- `@sharpee/devkit` global → `sharpee` CLI works (`sharpee` with no args prints help).
- Toolchain for building the book itself (not needed to run the examples):
  `pandoc 3.6.4`, `weasyprint`, `imagemagick (convert)`, `poppler-utils`.
- **Browser testing ready:** Playwright + Chromium installed and smoke-tested.
  - `playwright` npm dep in `../test-book` (a throwaway `package.json` was
    `npm init -y`'d at the repo root just to host the test harness — separate
    from the book's `my-zoo/` project).
  - `npx playwright install chromium` → Chrome Headless Shell 149.0.7827.55.
  - `sudo npx playwright install-deps chromium` → system libs installed.
  - Verified: `chromium.launch()` opens a page and reports version 149. ✓

**Book progress: ALL 32 CHAPTERS COMPLETE.** Full front-to-back run finished —
see the **FINAL SUMMARY** section above for the cumulative game built, the
11 issues found (no BLOCKERs), and the list of conceptual chapters. `my-zoo/`
builds clean (game.js ~947 KB) and plays end-to-end (to a 75-point victory) both
via the `:8099` static server and straight from `file://`.

**Test harness:** Playwright driver scripts live in the session scratchpad
(`play_chNN.mjs`). Pattern: serve `dist/web` with `python3 -m http.server -d
dist/web 8099`, then `node play.mjs` types into `#command-input` and reads back
`document.body.innerText`. Import playwright as a default export
(`import pw from '.../playwright/index.js'; const { chromium } = pw;`) — it's
CJS, named ESM imports fail. Transcript tests: `sharpee build --test`
(`tests/transcripts/feed-goats.transcript`).

**If reopened:** the book is fully worked through. Possible follow-ups, none
required: (a) fix-list write-up of the 11 issues for the book authors; (b)
implement the §28.5 after-hours second act (book gives only prose); (c) test the
Zifmia multi-user server if Docker becomes available.

**Note on cwd:** the shell occasionally resets between calls; use absolute paths
(`/home/node/repos/test-book/my-zoo`) rather than relying on a persisted `cd`.
