# Phase 7 — Publish tab: scope

The scoping step the plan says Phase 7 "cannot start without". Written
2026-08-06, session 20260806-1650. No code.

Every figure below is from a command run against the working tree at `a8f0c528`.

---

## 1. The short version

**Publish is already designed.** ADR-284 (ACCEPTED 2026-07-28) decides what it
is, where the mechanics live, and what the v1 artifact is. It named one
implementation blocker — its own Q-2, "where does Publish live in the UI" — and
the go-live list has since answered it. So Phase 7 is not a design phase; it is
the phase that **builds what ADR-284 specified and nobody has built yet.**

The one surprise is how little is missing.

---

## 2. What exists, verified

| Piece | State |
|---|---|
| Self-contained browser build | **exists** — `sharpee build <file>.story` emits `dist/web/<id>/` |
| `index.html` at the bundle root | **yes** — `dist/web/dungeo/index.html`; this is exactly itch.io's HTML-project shape |
| Author assets copied into the artifact | **exists** — `build-browser.ts:289` copies `assets/` into the output |
| Per-story CSS/HTML override | **exists** — `build-browser.ts:277` picks up `browser/<storyId>.css` |
| IFID minting | **exists** — `sharpee ifid`, and since 2026-08-06 a Generate IFID button on the Problems row |
| `sharpee publish` | **DOES NOT EXIST** — no `publish` case in `packages/devkit/src/cli.ts` |
| ADR-286's `.templates` Web Template DSL | **NOT IMPLEMENTED** — `.templates` appears nowhere in `packages/devkit/src` or `packages/chord/src`, and no `.templates` file exists in the repo |

Reference size: `dist/web/dungeo/` is 6.3 MB, audio included.

So the mechanical core ADR-284 said "exists" really does exist, and the gap is
narrower than the ADR's own framing suggests: **publish v1 is the existing build
plus a zip plus a precondition check.**

---

## 3. What ADR-284 already decides — not re-litigated here

- **D1** — Publish is a first-class app action, a menu-level peer of Build/Play.
  The mechanics live in **devkit** (`sharpee publish`); Chord Writer invokes it
  through the resolved toolchain (ADR-279 D4 / ADR-280 D3's one-owner pattern).
  **There is no IDE-only publish path** — a terminal author gets the identical
  artifact.
- **D2** — The v1 artifact is a **zip of the self-contained browser build**.
  Unzip anywhere, open `index.html`, the story runs. itch.io-ready as-is.
- **ADR-298 D5 (inbound requirement)** — Publish **MUST hard-error** on a story
  with no IFID. A missing `ifid:` is only a compile-time warning; publication is
  where Treaty of Babel compliance (ADR-074) becomes mandatory.

## 4. What the go-live list already decides

ADR-284's **Q-2** — a single menu action versus a Publish panel — is marked
"Blocks: implementation start". Item 1 of `todo-list.md` answers it: **a Publish
tab in the right panel**, alongside Build / Play / Testing / Index / Diagnosis /
Docs.

That is the blocker cleared. It also settles the shape: a tab has room for a
target choice and story metadata, which a menu item does not, so Q-1's answer can
grow into it rather than forcing a redesign.

---

## 5. Scope of Phase 7

### In scope

1. **`sharpee publish <file>.story` in devkit.** Browser build, then zip.
   - Refuses, before building, when the story has no `ifid:` — ADR-298 D5. The
     refusal names the fix, which is now reachable in two places (the CLI's
     `sharpee ifid`, the IDE's Generate IFID button).
   - Output defaults beside the build; `--out <path>` to place it.
   - Exit code and diagnostics in the shape `compose` already uses, so the IDE
     surfaces failures through the machinery it has.

2. **A Publish tab in the right panel.** Drives the toolchain command; it does
   not reimplement any of it.
   - Preconditions shown before the author presses anything: IFID present,
     story compiles, assets resolve. A missing IFID offers the same fix the
     Problems panel does rather than sending the author to a terminal.
   - Progress and failures in the tab, not a modal.
   - On success: the artifact's path, revealable in Finder.

3. **A structural test pinning the zip's shape** — `index.html` at the root,
   assets alongside — because that shape is what itch.io accepts, and it would
   otherwise be verified once by hand and then silently drift.

### Out of scope for v1

- **Upload.** No target integrations (see §6). Publish produces a file.
- **Story metadata / cover image.** Those belong to a target that wants them;
  none is in v1.
- **The ADR-286 Web Template DSL.** See §6 — a discrepancy to rule on, not work
  to absorb here.

---

## 6. David's calls

### 6.1 ADR-284 Acceptance 1 cannot be met as written

It reads: *"Publish on a story with customized Web Template and referenced assets
produces a zip; unzipped on a machine with nothing installed, the story plays in
a browser with the customization and assets intact."*

Assets are real and copied. But "customized Web Template" in ADR-286's sense — a
`.templates` file in a layout DSL — **is not implemented**, and no story in the
repo has one. What exists today is the escape hatch: `browser/<storyId>.css`.

Two honest ways forward, and this is a ruling rather than a discovery:

- **(a) Read Acceptance 1 against what exists** — customization means the CSS/HTML
  override — and note the amendment on ADR-284. Phase 7 stays small.
- **(b) Treat ADR-286 as a prerequisite.** Phase 7 then waits on a whole
  unimplemented DSL, and go-live grows a large item nobody has scoped.

Recommendation: **(a)**. The DSL is a separate ambition, and nothing about
producing a distributable zip depends on it.

### 6.2 ADR-284 Q-1 — targets beyond the zip

Explicitly "blocks nothing in D1/D2", so v1 does not need it. The candidates the
ADR lists, unchanged: an itch.io preset (metadata/cover handling), a
zifmia-targeted artifact for multi-user hosting, and a hosted "publish to
sharpee.net" destination — which the ADR itself flags as a product ambition
rather than a feature toggle.

Worth naming: sharpee.net exists and is yours, so that third one is closer to
reachable than the ADR's phrasing suggests. It is also the one with ongoing
operational weight.

### 6.3 Does Publish also get a menu item?

ADR-284 D1 says "menu-level peer of Build/Play"; the go-live list says a tab.
These are compatible — Build already has both a menu item and a tab — but the
menu item is not written down anywhere as decided. Recommendation: yes, mirror
Build (**Build → Publish**, no default key equivalent).

---

## 7. Acceptance for Phase 7

1. `sharpee publish` on a story with an IFID produces a zip; unzipped on a
   machine with nothing installed, the story plays in a browser with its assets
   and CSS override intact.
2. `sharpee publish` on a story with **no** IFID refuses, names the story, and
   writes nothing — no partial zip, no built bundle left behind.
3. The zip's structure is pinned by a test: `index.html` at the root.
4. The Publish tab runs the toolchain command and shows its failures; it never
   produces an artifact by a different path than the CLI.
5. The IFID precondition is offered as a fix in the tab, not merely reported.
6. Verified once by hand: the zip uploads to itch.io's HTML-project flow and
   runs unmodified (ADR-284 Acceptance 2).

---

## 8. Ordering

Phase 7 depends on nothing else in the plan and blocks nothing but its own share
of the DMG story. It can run at any point. It is smaller than Phases 3 or 5 —
the build it wraps already exists — with the caveat that Acceptance 6 needs a
real itch.io account and a manual upload, which is a David-only step.
