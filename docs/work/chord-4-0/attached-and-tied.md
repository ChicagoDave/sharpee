# Attached and tied — the whole picture

**Date**: 2026-10-22 · **Session**: 289aa0 · **Branch**: chord-4-0 · **Decisions**: ADR-373 D1, D6, D8 (D8 written today)

Organized by noun: each thing first (what it is, how a story makes one, what it holds), then its behavior under each command. Every claim cites the file it was read from. "Tested" means a test asserts it; "read" means I read the code and no test pins it.

The relationship has three nouns: **the held thing**, **its anchor**, and **the hold** between them, which is either fixed or a knot. A fourth, **the free thing**, is anything not held, and is where a hold made in play starts.

---

## 1. The hold

**What it is.** The relationship itself: this thing is held to that one. It lives on the held thing as an `AttachedTrait` (`packages/world-model/src/traits/attached/attachedTrait.ts`). Its one owner is `AttachedBehavior` (`attachedBehavior.ts`), whose `attach` and `detach` every writer calls.

**Its kinds.** Two kinds are reachable:

| Kind | `attachmentType` | Comes undone? | Made by |
|---|---|---|---|
| **fixed** | `stuck` | only if `detachable`, and only by pulling | `attached to` (Chord) |
| **knot** | `tied` | always, by untying or pulling | `tied to` (Chord, new today); `tie X to Y` (play) |

The trait lists five more types (`glued`, `nailed`, `screwed`, `welded`, `magnetic`). Nothing makes them, and the platform treats each the same as `stuck`, except that untying refuses anything that is not `tied`.

**What it holds.** `attachedTo` (the anchor), `attachmentType`, `detachable`, and `loose` (read by `isAttached`; nothing ever sets it true). `detachForce`, `detachSound` and `onDetach` are unread, and ADR-373 D1 keeps them out of Chord.

**Its behavior.** A hold exists while `attachedTo` is set and the hold is not `loose` (`isAttached`). Breaking it (`detach`) clears `attachedTo` and moves nothing. It refuses, changing nothing, when there is no hold or the hold is fixed and not detachable. A thing cannot be held to itself (`attach` throws).

---

## 2. The held thing

**What it is.** Any thing with a hold. A story declares it in the thing's own block, or a player makes it in play (see the free thing).

```chord
create the inspection plate
  a thing, attached to the sorting machine
  in the Sorting Room

create the route placard
  a thing, attached to the sorting machine, detachable
  in the Sorting Room

create the bell rope
  a thing, tied to the sorting machine
  in the Sorting Room
```

| Written on the thing | The hold it starts with |
|---|---|
| `attached to the X` | fixed, not detachable |
| `attached to the X, detachable` (either order) | fixed, detachable |
| `tied to the X` | knot (always detachable) |

The loader makes the hold through `AttachedBehavior.attach` once the anchor's name resolves, so the anchor may be declared later in the file (`story-loader/src/loader.ts`, `case 'attached': case 'tied':`). Tested: `story-loader/tests/adr-373-physical-state-runtime.test.ts`.

**What the compiler refuses on it** (`chord/src/parser.ts`, `chord/src/analyzer.ts`; tested in `chord/tests/adr-373-physical-state.test.ts`):

| Written | Diagnostic |
|---|---|
| `attached` or `tied` with no `to the <thing>` | `parse.attached-to` |
| an anchor that names no entity | `analysis.setting-names-no-entity` |
| `detachable` with no `attached to` | `analysis.detachable-not-attached` |
| `detachable` beside `tied to` | `analysis.detachable-tied` (new) |
| `tied to` beside `attached to` | `analysis.tied-and-attached` (new) |
| `attached to` twice, or `tied to` twice | **nothing; it compiles** (Open 1) |

**What a story can ask of it.** `while the rope is attached` is true while it has a hold of either kind (`story-loader/src/evaluator.ts`). No word asks which kind.

**Its behavior.**

| Command | Fixed, not detachable | Fixed, detachable | Knot |
|---|---|---|---|
| `take X`, `take X from Y` | refused: "The plate is fixed to the sorting machine." | refused: fixed to | refused: "The bell rope is fixed to the sorting machine." (Open 2) |
| `pull X` | refused: "The plate won't budge." | **freed**: "You pull the placard free of the sorting machine." | **freed** (read) |
| `untie X` | refused: "The plate isn't tied to anything." | refused: isn't tied to anything | **freed**: "You untie the bell rope." |
| `untie X from Y`, Y its anchor | as `untie X` | as `untie X` | **freed** |
| `untie X from Z`, Z not its anchor | refused: isn't tied to anything | refused: isn't tied to anything | refused: "isn't tied to anything" (false; Open 3) |
| `tie X to Z` | refused: the implicit take refuses it (read) | refused (read) | refused (read) |

A freed thing is a free thing again (section 4). It stays where it is.

Where each refusal lives: taking and removing share `attachedRefusal` (`stdlib/src/actions/standard/attachment-shared.ts`). Taking checks it before scenery, so a fixed scenery thing names its anchor. Pulling checks the hold before `PULLABLE` (`pulling/pulling.ts`), and untying checks `isTied` (`untying/untying.ts`). Tested on the real engine: take refused (fixed and knot), pull frees a detachable one, pull refuses a fixed one with the anchor unchanged, untie frees a declared knot and a knot made in play, untie refuses a fixed one with the anchor unchanged.

---

## 3. The anchor

**What it is.** The thing a held thing is held to. Any thing can be an anchor, except a person when tying in play (section 4) and the held thing itself. Nothing is declared on the anchor; it is named from the held thing's side.

**What it holds.** Nothing. The anchor carries no record of what is held to it.

**Its behavior.** None of its own. In particular:

- Moving the anchor does not move what it holds. Take a portable anchor and the held thing stays behind, still held to it (read; Open 6).
- The held thing's refusals name it: "fixed to the sorting machine", "free of the sorting machine".
- A story can react on it through the counterpart tail: `on the player tying to the sorting machine`, written in the *held thing's* block, fires when the player ties that thing to that anchor (ADR-372; tested).

---

## 4. The free thing

**What it is.** Any thing with no hold. This covers anything never declared held, and anything freed by pull or untie.

**Its behavior.**

| Command | Result |
|---|---|
| `tie X to Y` (also `fasten`, `attach`) | X is taken if not held, moved to Y's location, and given a **knot** to Y: "You tie the line to the sorting machine." It is now a held thing (section 2). |
| `tie X` | refused: "What do you want to tie the line to?" |
| `tie X to X` | refused: "You can't tie the line to itself." |
| `tie X to <a person>` | refused: "You can't tie things to people." |
| `untie X` | refused: "The line isn't tied to anything." |
| `pull X` | its own pullable behavior, or "can't pull that"; nothing about holds |
| `take X` | taken as usual |

Source: `stdlib/src/actions/standard/tying/tying.ts`. Grammar: `parser-en-us/grammar/standard-en-us.story:694-709` (`tie`, `fasten`, `attach` for tying; `untie`, `untie … from`, `unfasten` for untying). Dungeo's own `tie` grammar outranks these, and none of its things are held.

The player's `attach X to Y` makes a knot, while the author's `attached to` makes a fixed hold (Open 4). Tying to an anchor the player is carrying moves the tied thing into the player's inventory, still held (read; Open 5).

---

> **Superseded by the design, 2026-10-22.** `tied to` (below) was built and then reverted uncommitted the same session. The replacement is a DRAFT: `docs/architecture/adrs/adr-381-connectors-replace-attachment.md` (fixed is scenery, hanging is on a supporter, joining is a connector). This file stays as the record of the model ADR-381 replaces; where it says `tied to` exists, read that it no longer does.

## What changed today (uncommitted)

- **The held thing's declaration** (P8-1): the loader makes the hold through `AttachedBehavior.attach`. It used to build the trait as `stuck` and write `attachedTo` itself.
- **The hold's header** (P8-3): `AttachedTrait` now names the behavior as its owner, not "the pulling action".
- **The knot as a declaration** (P8-4, `tied to`, ADR-373 D8): the catalog word, the schema row and the regenerated manifest; one parser production for `attached to` and `tied to`; the two new gates; the loader; `chord.ebnf` (`"tied" "to" ARTICLE name`) with its pin re-recorded and no version bump; the ADR-373 D8 amendment; the grammar-changes row; the guide (`website/src/app/chord/guide/world/kinds-traits-and-settings/content.mdx`) and the regenerated Docs tab page.
- **Same change, different noun** (P8-2): the evaluator's `broken` asks `BreakableBehavior.isBroken`.

Results, one run each: chord 1651 passing; story-loader 1373 passing and 1 skipped; world-model 1663 passing; 0 failures. Dungeo chain 952 passed, 17 of 17 golden recordings matched. Manifest and aliases `--check` are fresh.

## Open, for you

1. **The held thing: two holds compile, and the last anchor wins silently.** `attached to the post, attached to the hook` and `tied to the post, tied to the hook` both compile (probed today). Before today the first anchor won, also silently. My recommendation is one gate for any two holds on one thing, replacing `analysis.tied-and-attached`.
2. **The held thing: a knot says "fixed to".** The take refusal does not know the kind of hold.
3. **The held thing: `untie X from Z` says something false.** A knot to another anchor is refused with "isn't tied to anything".
4. **The free thing: one word, two kinds of hold.** The player's `attach` makes a knot; the author's `attached to` makes a fixed hold.
5. **The free thing: tying to a carried anchor.** The tied thing lands in the player's inventory, still held. Read, not tested.
6. **The anchor: moving it leaves what it holds behind.** Read, not tested.
7. **The hold: `loose` is consulted and never set.**
