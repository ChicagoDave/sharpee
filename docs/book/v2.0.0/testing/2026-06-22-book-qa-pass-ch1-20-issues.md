# Book QA pass — Chapters 1–20 — consolidated issue list

**Labels:** `book`, `content`, `qa-pass`
**Found by:** book QA pass (executing *The Sharpee Author and Developer Manual* literally — typing each chapter's code into one cumulative `my-zoo` project, `sharpee build`, and driving `dist/web/` with Playwright/Chromium)
**Date:** 2026-06-22
**Affected:** *The Sharpee Author and Developer Manual* — Volumes I–VI (Ch. 1–20)
**Environment:** Linux, node v22.23.0, npm 11.17.0, `@sharpee/devkit` **1.0.10** (global), `@sharpee/sharpee` 1.0.8, `@sharpee/world-model` 1.0.8
**Method:** Cumulative zoo (each chapter's code added to the previous), built with the `sharpee` CLI exactly as the book instructs; every "Try it" run through a headless Chromium harness that types each command into `#command-input` and reads `#text-content`.

---

## Result summary

| Ch | Title | Status |
|----|-------|--------|
| 1 | Installing Sharpee & the CLI | ✅ pass — init/install/build/init-browser/build all match §1.5–1.8 |
| 2 | Your First Room | ✅ pass — §2.3–2.7 code (incl. `@sharpee/engine` import) compiles; all §2.8 lines match |
| 3 | The Play Loop | ✅ n/a (conceptual) |
| 4 | Rooms & Navigation | ✅ pass — §4.4 builds; §4.7 navigation matches map. (See note A — a prior report's "missing scenery" appears already fixed in this PDF.) |
| 5 | Scenery & Portable Objects | ✅ pass — all §5.8 lines match (see #1) |
| 6 | Containers & Supporters | ✅ pass — all §6.6 lines match |
| 7 | Openable, Locked Doors & Keys | ✅ pass — §7.5 unlock/open/through puzzle works |
| 8 | Light & Dark | ✅ pass — §8.8 dark/flashlight reveal matches (incl. grue) |
| 9 | The Map & Regions | ✅ pass — §9.2 `createRegion`/`assignRoom` compile; plays across boundary |
| 10 | Standard Actions & Four-Phase | ✅ n/a (conceptual) |
| 11 | Scope & Visibility | ✅ n/a (conceptual) |
| 12 | Readable Objects & Switchable Devices | ⚠️ code passes; §12.6 walkthrough broken — **#2** |
| 13 | Event Handlers | ✅ pass — §13.7 goat reaction + penny-press transform match |
| 14 | Custom Actions | ⚠️ code passes; §14.7 targets wrong — **#3** |
| 15 | Capability Dispatch | ✅ pass — §15.6 per-animal petting all match |
| 16 | Custom Traits & Behaviors | ⚠️ code won't compile as printed — **#4** |
| 17 | Extending the Grammar | ✅ n/a (conceptual; grammar exercised in Ch.14/15) |
| 18 | The Language Layer | ✅ n/a (conceptual; message IDs exercised in Ch.14/15) |
| 19 | The Formatter Chain | ⏸ not yet play-tested |
| 20 | Non-Player Characters | 🔴 compiles, but NPCs never act — **#5** |

Five issues, below, in severity order.

---

## 🔴 #5 — Ch.20: following the chapter exactly, the NPCs never act

**Chapter:** 20 "Non-Player Characters" (§20.1–20.5)

Typed Ch.20's code verbatim — `NpcTrait` on the zookeeper and the parrot, `parrotBehavior`,
the patrol via `createPatrolBehavior`, and the plugin + behavior registration in
`onEngineReady` exactly as §20.4. It **compiles and `sharpee build` succeeds with no errors**,
and the NPCs exist (`examine zookeeper` and `examine parrot` both return their descriptions).
But every NPC *action* §20.5 promises fails to occur in the built web client:

- `> wait` on the Main Path with Sam present → only "Time passes..."; **Sam never patrols**
  to the Petting Zoo or Aviary across many turns.
- Walking into the Aviary → the parrot's `onPlayerEnters` greeting
  ("The parrot ruffles its feathers and eyes you with interest.") **never appears**.
- Waiting in the Aviary with the parrot present for 8+ turns → **no squawk ever**
  (book says ~50% per turn; 8 silent turns is not chance).

No console errors; the NPCs are simply inert.

**Reproduce:** build the cumulative zoo through Ch.20; serve `dist/web/`; `south` (Sam is on
the Main Path), `examine zookeeper` (works), then `wait`, `wait`, `west`, then several `wait`s
in the Aviary. Expect patrol movement, a greeting on entry, and intermittent squawks; observe
none.

**Also (walkthrough scope, same family as #2/#3):** §20.5's first step `> examine zookeeper` is
issued from the **Zoo Entrance**, but Sam starts on the **Main Path** → "You can't see any such
thing." The walkthrough omits a `> south` first.

This is a functional divergence between the book's claims and observed behavior when the book is
followed exactly. Recorded as observed; root cause (book wiring vs. platform) not diagnosed here.

---

## 🟠 #4 — Ch.16 §16.3: relative import omits the `.js` extension NodeNext requires (won't compile)

**Chapter:** 16 "Custom Traits & Behaviors" (§16.3, the `DispenserBehavior` file)

The book prints:

```ts
import { DispenserTrait } from './dispenser-trait';
```

The project `sharpee init` scaffolds uses `"module": "NodeNext"`, under which relative imports
**must** carry an explicit `.js` extension. Typed as printed, the file fails:

```
src/dispenser-behavior.ts(2,32): error TS2835: Relative import paths need explicit file
  extensions ... Did you mean './dispenser-trait.js'?
src/dispenser-behavior.ts(8,25): error TS2339: Property 'chargesRemaining' does not exist
  on type 'ITrait'.   (×3 — cascade: the unresolved import makes get() fall back to ITrait)
```

This is the first chapter to use a **relative** import; earlier chapters import only from
`@sharpee/*`. The scaffold's own generated files already do it correctly
(`browser-entry.ts` → `import { story } from './index.js'`), so the book is inconsistent with
its own toolchain.

**Fix (book text):** `import { DispenserTrait } from './dispenser-trait.js';`. With the
extension added, the trait + behavior compile cleanly (the `Partial<Self>` constructor pattern
and `entity.get(DispenserTrait)` narrowing are both fine — verified in isolation).

**Note:** Ch.16 has no "Try it"; the dispenser trait/behavior are illustrative and never wired
to a verb, so only the compile check applies.

---

## 🟠 #3 — Ch.14 §14.7: "Try it" photographs targets that aren't in scope / don't exist

**Chapter:** 14 "Custom Actions" (§14.7)

The custom feed + photograph actions are **fully correct** — verified:
`feed goats` succeeds; a second `feed goats` → already-fed block; `photograph goats` with no
camera → no-camera block; `photograph press` with the camera → "Click! You snap a photo of
souvenir press. That one's going on the fridge." (correct `{target}` substitution).

But two §14.7 steps expect outcomes the world can't produce:

- `> photograph toucan` is issued **in the Petting Zoo**, but the toucan lives in the **Aviary**
  (two rooms west) → out of scope → "You can't see any such thing." The book expects the
  no-camera block ("You don't have a camera."). Use an in-scope target, e.g. `> photograph goats`.
- `> photograph postcards` (Gift Shop) expects "Click! Photo taken", but there is **no
  `postcards` entity** — "postcards" appears only as flavor text in the room description →
  "You can't see any such thing." Use a real entity, e.g. `> photograph press`, or add a
  `postcards` entity to the gift shop.

Scope is resolved before the action runs (as Ch.11 describes), so an out-of-scope / nonexistent
noun never reaches the action's no-camera check. Engine/code correct; the §14.7 step targets are
the bug.

---

## 🟠 #2 — Ch.12 §12.6: "Try it" walkthrough is not executable as written

**Chapter:** 12 "Readable Objects & Switchable Devices" (§12.6)

The listed steps are: take brochure → read → examine → **south** → east → read plaque →
examine plaque → **west** → **take keycard** → unlock gate with keycard → …

But `take keycard` is issued while standing on the **Main Path**, whereas the keycard lives at
the **Zoo Entrance**. Following the steps literally, the player left the entrance (went south)
without ever picking up the keycard, so `take keycard` → "You can't see any such thing.", and
every staff-area step after it fails too. The annotation "(from the entrance, earlier)"
acknowledges the gap, but the step list never picks it up at the entrance.

Verified: with `take keycard` done at the entrance first, the rest of the walkthrough
(unlock/open/south/examine radio/switch on/off/take radio → "fixed in place") all works.

**Fix (book text):** add `> take keycard` as a step while at the entrance (before `> south`),
e.g. right after `examine brochure`. Engine/code are correct — walkthrough ordering only.

---

## 🟡 #1 — Plural-named scenery uses a singular verb in the "fixed in place" message

**Chapter:** 5 "Scenery & Portable Objects" (§5.8), but engine-wide

`take goats` → "The pygmy goats **is** fixed in place." The stdlib's scenery-block message
hardcodes "is", which reads wrong for plural display names (`pygmy goats`, `direction signs`,
`rabbits`). The book uses plural names freely, so this surfaces often. Behavior is correct
(take is blocked); cosmetic only. The book does not assert the exact message text, so this is an
engine-message concern rather than a book-text mismatch. Repo: stdlib taking-action / message
template.

---

## Cross-cutting observation

Issues **#2**, **#3**, and the scope-half of **#5** are the same pattern: a "Try it" step
commands an entity that is not in the player's scope at that point (wrong room, or no entity at
all). A single editorial sweep over every "Try it" list — checking that each named noun is
present and reachable at the step where it's typed — would catch all of them.

## Note A — Ch.4 prior report appears resolved

An earlier report (`2026-06-22-ch4-missing-scenery-examine-signs.md`) flagged §4.4 as omitting
the Main Path `direction signs`. In the PDF used for this pass, the §4.4 listing **explicitly
creates** `direction signs`, `pygmy goats`, and `toucan` (p. 49–50: "nothing is hidden behind an
'as before' comment"), and `examine signs` works. That issue looks already fixed in the current
manuscript.

## Not yet covered

Ch.19 (formatter chain) was not play-tested, and Volumes VI–VIII from Ch.21 onward (Scenes,
Daemons/Fuses, Scoring, Channels, Web Client, Theming, Media, Multi-file, Transcript Testing,
Saving, Publishing, Zifmia) are pending — the pass stopped at the Ch.20 blocker (#5).
