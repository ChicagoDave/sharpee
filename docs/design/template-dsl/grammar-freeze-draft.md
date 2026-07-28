# Template DSL — grammar freeze draft

**Status: DRAFT FOR DAVID'S REVIEW.** Not authoritative. `design.md` remains
the design doc; this is a candidate freeze of the syntax details ADR-286 D1
leaves to it ("syntax details are its to evolve and freeze at implementation
time"). Fold in, edit, or override.

Drafted 2026-07-28, session aaa5bb, from `design.md` + ADR-286's scope-level
rulings + the actual state of `platform-browser` and the default page.

Rulings marked **[PROVISIONAL]** are my call, made so there was something
concrete to react to. Flip any of them freely — nothing downstream assumes them.

---

## 1. Grounding — what the code actually does

Verified this session, because three of ADR-286's own statements are inaccurate
about the shipped client and the frozen grammar has to match reality:

| ADR-286 says | Reality |
|---|---|
| D2: transform emits "`sharpee-*` ids for standard slots" | The default page (`packages/devkit/templates/browser/index.html`) uses **unprefixed semantic ids**: `menu-title`, `status-line`, `location-name`, `score-turns`, `main-window`, `text-content`, `input-area`, `command-input`. `sharpee-*` is the **class** vocabulary, plus synthesized hidden fallback ids in `BrowserClient.adaptHostLayout` (`BrowserClient.ts:423-452`) |
| Consequences: "`game-title`, `time`, `compass` have no mount or channel today" | `game-title` **does** have a mount — `#menu-title`, read at `BrowserClient.ts:131`. `compass` is a story-declared channel by David's ruling, so it is not owed one. Only `time` is genuinely absent |
| D1: `score` and `turn` are separate boxes | The default page **fuses** them into one `<span id="score-turns">`, and `BrowserClient.ts:344-370` carries a "score+turn composite override" with local caches purely to compensate |

The third is an opportunity, not just a correction: emitting separate `score` and
`turn` elements lets that composite override be **deleted**. Recorded as part of
ADR-286's platform change.

---

## 2. File and template structure

- One story-level file: **`<storyId>.templates`**, beside the `.story` file
  (ADR-286 D1, Q-2 resolved).
- Contains one or more named blocks:

```
template <name>
    …body…
end template
```

- A `standard` block is **required**; its absence is a compile error (D4).
- Template names follow the standing convention: hyphenated, spelled-out,
  lowercase (`standard`, `dream`, `end-credits`). No abbreviations.
- A duplicate template name is a compile error naming both line numbers.
  **[PROVISIONAL]**

### Comments

`##` to end of line, matching Chord's file-header comment form (ADR-249). Legal
on its own line or trailing. **[PROVISIONAL]**

### Indentation

- Leading whitespace is **significant**: it defines block membership.
- A block's members indent deeper than their header line. Any consistent amount
  works; 4 spaces is conventional.
- **Tabs are a compile error.** Mixed tabs and spaces is the classic source of
  invisible layout bugs, and the language gains nothing by allowing them.
  **[PROVISIONAL]**

---

## 3. The `declare` section

Optional, at most one per template, conventionally first.

```
declare
    font "Baskerville"
    font-size 18
```

- `font` — a quoted family name.
- `font-size` — a bare integer, points.
- Colour is **not** here: it belongs to the theme system (reader-controlled
  light/dark), and `browser/<storyId>.css` remains the styling escape (D1).
- An unknown key in `declare` is a compile error listing the known keys.
  **[PROVISIONAL]**

---

## 4. Rows, columns, groups, adjustment

**Rows** are the top-level lines of a template body, in vertical order.

**`::`** separates a row into columns.

**`|`** separates items within a row.

**`<` / `>`** are left / right adjustment markers.

### Adjustment scope — [PROVISIONAL, and the one real ambiguity in the sketch]

```
< room-name > score | turn
```

`>` could bind to `score` alone or to `score | turn`. Frozen as: **a marker
applies to every item that follows it until the next marker or end of row.**
So the line above is room-name left-adjusted; score and turn both
right-adjusted — the conventional status line, and the reading that makes the
sketch's own example come out right.

Unmarked items default to **left**.

---

## 5. Named containers

```
main-column scrolling 75% :: info-column fixed 25%

main-column
    main-text

info-column
    compass top
```

- A container is **introduced** by appearing in a row with a behavior keyword,
  and **defined** by a later indented block of the same name.
- Behavior is `scrolling` or `fixed` — required, no default. **[PROVISIONAL]**
- Width is an integer percentage.
- **Widths need not sum to 100.** Unspecified widths share the remainder
  equally; specified widths summing above 100 is a compile error.
  **[PROVISIONAL]**
- Containers may nest (a container block may contain another container row).
  Each name is defined exactly once. **[PROVISIONAL]**

### Diagnostics (D1 names these; wording frozen here)

- A container named in a row with **no indented block** → error, "container
  `x` is never defined".
- A block whose name appears in **no row** → error, "container `x` is defined
  but never placed" — the typo'd-container case.

---

## 6. Image slots

```
right-embedded-image floating right wrap 30%
left-embedded-image  floating left nowrap 20%
```

- Introduced by the `floating` clause; the name becomes an **ADR-216 layer
  name**, so stories target it with `show image <asset> in <layer>` — syntax
  that already ships.
- `left` | `right` — float side.
- `wrap` | `nowrap` — whether prose flows around it.
- Integer percentage — width relative to the containing box.
- A template image slot matching **no layer the story declares** → transform
  **warning** (the z-stack fallback is for deliberate omission, not typos).
- A layer with no template box falls back to the z-stacked media mount
  (today's behavior). A bare `show image` targets `main`. No image ever has
  nowhere to go.

---

## 7. Name resolution — one concept, three sources

There is no slot manifest and no syntactic distinction between a "standard
slot" and anything else. **Usage is the declaration.** A placed name resolves
against, in order:

1. **Standard slots** (§8)
2. **The story's declared channels**
3. **Names the template itself introduces** — containers by their indented
   block, image slots by their `floating` clause

A name matching none of the three is a **compile error** listing the known
names. A channel the story uses but the template never places still gets a
mount from the transform, rendered via the generic-panel fallback
(ADR-253 D4) — **visible, never hidden** — plus a warning naming it.

### Where `compass` sits (resolved 2026-07-28)

`compass` is **standard vocabulary that the default template does not place**.
The sketch's compass line is not a custom-channel demonstration — it is the
"the standard layout omits this, and you can add it" demonstration. Same
pedagogical point, no story-declared machinery.

This matters to the grammar only in that the name resolves from source 1
rather than source 2. **It also dissolves a wrinkle an earlier draft of this
document raised**: the seeded `.templates` file from `sharpee init` (ADR-280
Phase 3) *could* legally contain a compass line, since a new story needs to
declare nothing for the name to resolve. Whether the seed *should* is a
separate question for that phase.

What renders behind the name — an `exits` channel, a default rose as a new
kind of HTML asset, and click-to-move input — is **ADR-288**, deliberately
kept out of this grammar. The DSL's only requirement is that the name
resolves.

---

## 8. Standard slot vocabulary

| Name | Mount today | Notes |
|---|---|---|
| `room-name` | `#location-name` | `location` channel |
| `score` | `#score-turns` (fused) | splits — see §1 |
| `turn` | `#score-turns` (fused) | splits — see §1 |
| `main-text` | `#text-content` | prose pane |
| `command-line` | `#input-area` + `#command-input` | input row |
| `game-title` | `#menu-title` | **see Q1 below** |

`time` appears in neither the sketch's slot list nor any existing mount;
ADR-286 leaves its membership to this doc. **Frozen as: not in v1.**
**[PROVISIONAL]**

The vocabulary starts minimal and earns additions — the Chord grammar
discipline.

---

## 9. What the transform emits

- **Mount ids: the existing unprefixed semantic ids** (`location-name`,
  `text-content`, `main-window`, `input-area`, `command-input`), *not* D2's
  stated `sharpee-*`. Recorded as a correction to ADR-286 D2. This keeps every
  existing `browser/<storyId>.css` working. **[PROVISIONAL — Q2]**
- Story channels: unprefixed `#<channel>` + `data-channel` (ADR-253 D2),
  unchanged.
- `sharpee-*` **classes** are emitted as today, so engine.css applies.
- engine.css / base.css / decorations.css links, theme links, and token
  substitution all happen inside the transform — not author-visible, not
  author-breakable.
- **Chrome is always emitted** around the described layout: title bar, menu bar
  (save/restore/restart, theme picker), dialogs. The layout file describes the
  content region only.
- Layout errors surface as ordinary compile diagnostics in the existing
  gate/Problems surfaces.

---

## 10. Template switching (D4, v1)

- `use template <name>` — Chord sugar, lowers onto a layout-channel emit
  (the ADR-216 pattern, on a signal kind ADR-163 already defines).
- All templates compile at build time; switching never compiles at runtime.
- The client swaps structure and **re-parents live channel content**: prose
  scrollback, status values, and mounted images are story state, not template
  state, and survive the swap.
- The switch is an emitted event, so event-sourced saves replay it.
- A replayed switch naming a since-removed template is ignored.
- Boot uses `standard`. `use template` naming an unknown block is a compile
  error listing the file's templates.
- Not capability-gated; non-browser clients realize it within their own
  capabilities, down to ignoring it.

---

## 11. Open questions to settle before implementation

**Q1 — `game-title`: slot or chrome?** ADR-286 D2 says the transform always
emits the title bar and "chrome is not a slot and not the template's business";
the sketch's first line is `game-title`. **[PROVISIONAL: chrome, not
placeable]**, with the title sourced from story metadata — which lines up with
the `title:` field proposed in issue #187. If it should be placeable instead,
D2's chrome sentence needs rewording and the title bar becomes
template-addressable.

**Q2 — mount id convention.** §9's unprefixed ruling needs confirming, and
ADR-286 D2 amended to match.

**Q-5 (from ADR-286, unresolved there) — how do slot labels reach the client?**
D1 rules that slots carry their own labeling from lang-layer messages
(`score` renders as "Score: 100"), but channel payloads are data-only and no
mechanism carries lang-layer text to client-side channel renderers today.
Candidates: a boot-time label packet emitted by the build, or labels riding
channel registration. Touches lang-en-us, the wire, and platform-browser.
**Blocks D2's status-row emission and the labeling half of D1** — this one is
load-bearing, not cosmetic.

Note the interaction with §1: the `score`/`turn` split and Q-5 are the same
change. `channels/status.ts` currently hardcodes the strings `Score: N` and
`Turns: N`; those literals are exactly what Q-5 moves into the lang layer.

---

## 12. Corrections owed to ADR-286 at freeze

1. D2's `sharpee-*` id claim → unprefixed semantic ids (§1, §9).
2. Consequences' "`game-title`, `time`, `compass` have no mount or channel" →
   `game-title` has `#menu-title`; `compass` is a story-declared channel and is
   not owed one; only `time` is absent.
3. Add: deleting `BrowserClient`'s score+turn composite override is part of the
   platform change.
4. Add: the seeded template and the teaching example are different files (§7).
