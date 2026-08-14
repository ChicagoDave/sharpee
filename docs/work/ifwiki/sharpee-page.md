# IFWiki `Sharpee` page — section-by-section update guide

Target: https://www.ifwiki.org/Sharpee
Prepared 2026-08-14. Every claim below was checked against the repository at
commit `7ce444b9`; the checks are named inline so they can be re-run.

> The live page could not be fetched directly — ifwiki.org sits behind a
> Cloudflare managed challenge that returns 403 to non-browser clients. This
> guide is written against the wikitext captured in this file on 2026-08-14.
> If the page has changed since, re-diff before pasting.

---

## Summary of findings

| # | Section | Verdict | Why |
|---|---|---|---|
| 1 | Infobox | EDIT | `System=` conflates the cross-platform runtime with the macOS-only editor |
| 2 | Lead paragraph | EDIT | Does not mention Chord, which is now how stories are written |
| 3 | `== Sharpee is organized as... ==` | REPLACE | Malformed heading (a sentence in heading markup); list is stale and incomplete |
| 4 | Zifmia bullet | **DELETE** | Component retired 2026-08-13; description was also factually wrong |
| 5 | stdlib action count | EDIT | 43 → 57 registered |
| 6 | Key Features | EDIT | Accurate, but predates Chord and channels |
| 7 | Distribution | **REPLACE** | Describes a distribution path that no longer exists |
| 8 | Current Status | EDIT | Room count wrong; focus has moved to Chord + Chord Writer |
| 9 | Roadmap | FLAG | Cannot verify current Forge plans from the repo — your call |

Two items are wrong in a way a reader would act on: **Distribution** tells
authors to ship `.sharpee` bundles to a runner that no longer ships, and the
**Zifmia** bullet describes a retired component as a current one.

---

## 1. Infobox — EDIT

Current:

```
|System=Windows, macOS, Linux
|Download=https://www.sharpee.net/chord-writer/download
|Version=5.0.0
|Date=2026-08-13
```

**Problem.** `System=` and `Download=` disagree. The Sharpee runtime is
TypeScript on Node and runs anywhere Node runs; **Chord Writer, the authoring
application the download link points at, is macOS-only** (`tools/ide/project.yml`
declares `platform: macOS` for every target). A reader on Windows follows that
download link and finds nothing they can install.

**Verified.** `Version=5.0.0` is correct — `packages/sharpee/package.json`
and `packages/chord/package.json` both read `5.0.0`. `Style=Parser`, MIT
license, and `Developer=David Cornelson` all check out (`LICENSE`, © 2025).

**Suggested:**

```
|System=Windows, macOS, Linux (runtime); macOS (Chord Writer)
```

**Needs your call:** `Date=2026-08-13` — is that the 5.0.0 release date? The
most recent commit is 2026-08-14. Also confirm the minimum macOS version for
Chord Writer; `project.yml` carries both `deploymentTarget: macOS "26.0"` and
`MACOSX_DEPLOYMENT_TARGET: "11.0"`, which cannot both be the answer.

---

## 2. Lead paragraph — EDIT

Current:

> Sharpee is a parser-based interactive fiction authoring platform built in
> Typescript by [[David Cornelson]]. It provides a modern, extensible
> architecture for creating text adventures with optional rich media support.

Accurate but incomplete: it describes the implementation language rather than
the authoring experience, and never mentions Chord. Also, "Typescript" should
be "TypeScript".

**Suggested replacement:**

```mediawiki
Sharpee is a parser-based interactive fiction authoring platform created by
[[David Cornelson]]. Stories are written in '''[[Chord]]''', a purpose-built
authoring language, and run on a TypeScript engine that supports classic text
play as well as optional rich media. Authors who want direct access to the
platform can write TypeScript against the engine packages instead.
```

---

## 3. `== Sharpee is organized as a monorepo of composable packages: ==` — REPLACE

Two problems. The heading is a sentence wrapped in heading markup, so it lands
in the table of contents as a sentence. And it sits under a single-`=` heading
(`= Architecture =`), which on MediaWiki renders at page-title size; IFWiki
articles conventionally start at `==`.

**Suggested replacement for the whole Architecture block** (replaces lines
`= Architecture =` through the Zifmia bullet):

```mediawiki
== Architecture ==

=== Authoring ===

* '''[[Chord]]''' — The story authoring language and its compiler: lexer, parser, semantic analysis, and structured diagnostics. A story is a plain <code>.story</code> file with no package manifest and no build configuration.
* '''Chord Writer''' — Native macOS authoring application. In-process syntax highlighting, a Problems pane fed live by the compiler, and one-step Build and Play to a browser bundle.

=== Runtime ===

Sharpee is organized as a monorepo of composable packages:

* '''Engine''' — Turn cycle, command execution, event dispatch, plugin architecture
* '''World Model''' — Entity system with traits and behaviors for modeling game objects, rooms, and actors
* '''Standard Library (stdlib)''' — 45 world actions (take, drop, open, lock, go, look, etc.) plus 11 meta commands (save, restore, undo, again, score, help), each following a four-phase pattern: validate, execute, report, blocked
* '''Parser''' — Grammar-based command parsing with verb aliases, slot constraints, and story-extensible patterns
* '''Language Layer''' — All user-facing text is separated from logic via message IDs, enabling localization (currently English)
* '''Channels''' — Every story-to-interface signal (prose, status, media, layout) travels as structured data over named channels, so a client renders the story rather than the story printing to a client
* '''Platform Browser''' — Classic IF web client with menus, save/restore, and theme support, built on channels and customizable per story
* '''Extensions''' — Optional systems an author opts into: scoring, hunger, basic combat, conversation, and a testing extension
```

---

## 4. The Zifmia bullet — DELETE

Current:

> * [[Zifmia]] — Story runner built on React, supporting both classic text and
>   rich media (inline illustrations, custom themes, audio). Named after the
>   Enchanter-trilogy spell for summoning.

**Delete this line.** Three independent reasons:

1. **Retired 2026-08-13.** The source is archived at `tools/_archive/zifmia`,
   outside the pnpm workspace; `repokit`'s `--zifmia` flag and `zifmia` command
   are removed (`CLAUDE.md:144`).
2. **"Built on React" was never right.** Sharpee's web UI is deliberately
   framework-free — no React, no Lit, no Web Components (ADR-170,
   `packages/platform-browser`).
3. **The Tauri desktop runner it describes was dropped earlier**, under ADR-180.

If a `[[Zifmia]]` page exists on IFWiki, it should be marked historical rather
than linked from here as a current component.

---

## 5. stdlib action count — 43 → 57

**Verified.** `packages/stdlib/src/actions/standard/index.ts:161` exports
`standardActions` with **57** entries:

* **45 world actions** — take, drop, examine, open, close, go, look, lock,
  unlock, cut, dig, switch on/off, enter, exit, climb, search, listen, smell,
  touch, put, insert, read, remove, give, show, throw, push, pull, lower,
  raise, turn, wear, take off, eat, drink, talk, ask, tell, attack, hide,
  reveal, sleep, wait, inventory, and an author-facing trace action
* **11 meta commands** — save, restore, quit, restart, undo, again, score,
  help, about, version
* **1 internal** — a deadly-room death handler

Publish whichever number fits the sentence; the draft in §3 uses "45 world
actions plus 11 meta commands" because "standard IF actions" reads to an IF
audience as world actions, and 57 would overstate that.

---

## 6. Key Features — EDIT

The six existing bullets are all accurate and worth keeping as written. Two
gaps, both post-dating the section:

**Add:**

```mediawiki
* Chord authoring language — Stories are written in a declarative language designed for IF rather than in a general-purpose programming language; the compiler reports errors in terms of the story, not the runtime
* Channel-based interface — Stories emit structured data on named channels rather than printing text, so the same story drives a terminal, a browser client, or an author's custom interface
```

The "Language separation" bullet ("Engine and stdlib never emit English
strings") is verified and worth keeping — it is one of the genuinely unusual
things about the platform.

---

## 7. Distribution — REPLACE ENTIRELY

Current:

> Sharpee packages are published to npm under the @sharpee scope. Stories
> compile to .sharpee bundle files (zip archives containing story code,
> metadata, optional assets and themes) that run in the [[Zifmia]] story runner
> — a lightweight desktop app (via Tauri) or web-hosted player. Authors
> distribute story files; players install one runner.

**Every sentence after the first is now wrong.** The `.sharpee` bundle format is
deprecated (`CLAUDE.md:144`), the Tauri desktop runner was dropped under
ADR-180, and Zifmia is retired. The "authors distribute story files, players
install one runner" model is not how Sharpee stories are shipped today.

**Suggested replacement:**

```mediawiki
== Distribution ==

Sharpee packages are published to npm under the <code>@sharpee</code> scope, and
Chord Writer bundles the toolchain so authors never need an npm step. A story
builds to a self-contained browser bundle — HTML, JavaScript, and any assets in
one directory — which the author hosts or distributes directly. Players need
only a web browser; there is no separate interpreter to install.
```

**Confirm before publishing:** whether you also want to state a `.story` source
distribution path (source shared for others to build), and whether the browser
bundle is the only supported output today.

---

## 8. Current Status — EDIT

Current:

> Active development. The platform is being dog-fooded with a full
> implementation of 1981 Mainframe Zork (191 rooms, ~616 points).

**Room count is wrong.** `stories/dungeo/README.md:9-10` says **172 rooms**
across 15 regions, and **616 points main game plus 100 endgame points**. The
616 figure is right but incomplete.

**Suggested replacement:**

```mediawiki
== Current Status ==

Active development, currently focused on the Chord language and Chord Writer.
The platform is dog-fooded with a full implementation of 1981 Mainframe Zork
(172 rooms across 15 regions; 616 points in the main game plus 100 in the
endgame), and with a set of smaller example stories including a Chord
implementation of ''Cloak of Darkness''.
```

---

## 9. Roadmap — FLAG, no suggested text

Current:

> * Forge will be a custom trained small language model specifically for
>   Sharpee. It will enable authors to develop a specification that Forge knows
>   how to translate to a Sharpee story.

**I cannot verify this against the repository.** There is no `docs/work/forge/`
directory — the only surviving match for "forge" in live docs is
`docs/work/test-review/event-processor-forge-if-domain-character-extensions.md`,
which is a test review, not a Forge design document. The Forge planning
material appears to have been archived or moved.

This is a statement about your intentions, so it needs your call rather than a
repo check: is Forge still the roadmap, still described as a custom-trained
SLM, and is a roadmap entry on a wiki page useful before it exists? Left
unedited pending your answer.

---

## Also worth adding: a Chord section pointing at the new page

Once the Chord page exists, the Sharpee page should link to it beyond the
Architecture bullet. Suggested placement — a short section directly after the
lead:

```mediawiki
== Chord ==

Stories are written in '''[[Chord]]''', a declarative authoring language built
for Sharpee. A Chord story is a single <code>.story</code> file describing rooms,
objects, and behavior in near-English prose, compiled by the Sharpee toolchain.
See the [[Chord]] page for the language itself.
```

---

## Full assembled page

The complete rewritten wikitext, with every change above applied, is in
`sharpee-page-final.md` alongside this file — paste-ready, minus the two items
flagged for your decision (infobox `Date`/macOS version in §1, and the Roadmap
in §9), which are left as-is and marked with an inline HTML comment.
