# Phase 2 — Documentation Audit

Decision document for go-live item 2, first half. Written 2026-08-06, session
20260806-1650. **No UI is built by this phase.** Phase 3 (the Documentation tab)
depends on what is decided here.

The question Phase 2 was set: *which corpus does the IDE ship, at what version,
and how does it stay current?* The audit answers that, and turns up one thing
larger than the gap the phase was scoped around.

---

## 1. The corpus, measured

Every figure below is from a command run against the working tree at
`13f3bcb0` on 2026-08-06.

| Corpus | Size | Current with Chord 3.0.0? | Offline-renderable? |
|---|---|---|---|
| `docs/reference/` | 8 files, 9,530 lines | **No** — declares 1.4.0 | markdown only |
| `docs/book/v2.0.0/` | 36 chapters, 22,243 lines | **Wrong language entirely** (see §2.1) | **yes** — already builds one self-contained HTML |
| `website/src/app/chord` (sharpee.net) | 135 pages, ~51,400 words | **Mostly** — 15 stale headers (§2.2) | **not yet** — needs a static export (§2.3) |
| `packages/sharpee/docs/genai-api/` | 18 files, generated | tracks `.d.ts` | markdown only |

The language version itself is **not** ambiguous, which was worth establishing
first:

```
packages/chord/src/version.ts:178   export const CHORD_LANGUAGE_VERSION = '3.0.0';
tools/ide/.../ChordVersionCheck.swift:36   static let supportedLanguageVersion = "3.0.0"
```

The compiler and the IDE already agree. The language is **frozen at 3.0.0** and
nothing at 3.x has been published (owner ruling 2026-08-03, recorded in
`version.ts`). So there is no moving target here — only documentation that has
not caught up.

---

## 2. Findings

### 2.1 The book documents an authoring path the IDE cannot open

This is the finding that matters most, and it was not what the phase expected.

*The Sharpee Author and Developer Manual* — 36 chapters, complete and QA'd as of
2026-06-23 — teaches the **TypeScript author path**, not Chord:

```
$ grep -ric "chord" docs/book/v2.0.0/parts docs/book/v2.0.0/frontmatter
(no matches in any of 36 files)

$ find docs/book/v2.0.0/code-snippets -type f | sed 's/.*\.//' | sort | uniq -c
 147 ts        12 sh        3 css       1 md       1 jsonc

$ sed -n '60,66p' docs/book/v2.0.0/parts/part-1/02-your-first-room.md
```typescript
import { Story, StoryConfig } from '@sharpee/engine';
```

Its runnable tutorial (`tutorials/familyzoo`) is 62 `.ts` files. The word
"Chord" does not appear in the book's prose at all.

ADR-258 D2/D8 retired that path. The IDE refuses to open such a project by name
— the string is in `AppDelegate.openProjectFromLaunch`:

> "…is not a Chord story — the IDE opens .story files (the TypeScript author
> path was retired)"

So the most complete, most polished, most nearly-shippable body of documentation
in the repo describes something Chord Writer will not open. It is the one corpus
that renders offline today (a 955 KB self-contained HTML, four external links),
which makes it the tempting answer and the wrong one.

**This does not devalue the book.** It is a real artefact with a real audience,
and it already has its own destination — the landing page that ships it beside
the zipped standalone tutorial source. It is simply not the IDE's reference.

### 2.2 sharpee.net is the right corpus and is 15 pages stale

`website/src/app/chord` is the only body of documentation written *for Chord*
and organised by author task: getting-started, guide (vocabulary / world /
behavior / flow / tooling / project), `reference/grammar`, a complete `stdlib`
tree, and a cookbook. 135 pages, ~51,400 words. It also already has search
(`website/src/components/doc-search.tsx`).

But ADR-298 (2026-08-03, three days ago) removed the positional story header,
and the site has not caught up:

```
$ grep -rn 'story "[^"]*" by ' website/src/app/chord website/src/app/learn | wc -l
15
```

These are not migration pages showing the old form deliberately. They are the
primary teaching pages:

- `chord/getting-started/first-story` — the first story an author ever writes
- `chord/guide/world/the-story-header` — the page *about* the story header
- `chord/reference/grammar`
- `learn/fernhill/world` — the tutorial
- plus 11 more across guide, stdlib and plugins

An author following `first-story` today writes a header that does not parse.
That is worse than a missing document, and it is live on sharpee.net now,
independent of anything the IDE does.

(`define verb`, removed at the same time, is **clean** — 0 hits outside the
migration page. So this is one missed change, not general rot.)

### 2.3 The website cannot currently be bundled

`website/next.config.ts` has no `output: "export"`, and `website/deploy.sh`
runs it as a live Node service (`next start` behind Apache via systemd). It also
uses `redirects()`, which a static export ignores. So "bundle the site into the
app" is not free — Phase 3 needs an export path first.

### 2.4 Transcript testing is undocumented for authors

There is no transcript-testing page anywhere under `website/src/app`. The only
prose is `docs/reference/transcript-testing.md`, which is in the directory that
declares itself non-authoritative, still references a control-flow directive
ADR-294 D4 removed, and never mentions `forces:` / `point-seed:` (ADR-293 Phase
C).

Phase 5 builds a transcript **editor**. Shipping an editor for a format with no
current author documentation is a hole worth naming now.

### 2.5 `docs/reference/` already answered its own question

`docs/reference/README.md` (2026-08-05) opens: *"Warning: these documents are
not evenly maintained and are often out of date. Never mistake anything in this
directory for the current state of the repository."* It names
`chord-language.md`'s 1.4.0 claim as the example, and points author-facing
documentation at sharpee.net.

The decision this phase was asked to make about `docs/reference/` was therefore
made the day before it started. This audit only confirms it.

---

## 3. Decision

### Sources the IDE ships

**`website/src/app/chord` plus `website/src/app/learn`, bundled at build time.**

Nothing else. Specifically:

| Excluded | Because |
|---|---|
| `docs/reference/` | Self-declared non-authoritative; describes a language two majors old. Shipping it would make the IDE confidently wrong. |
| `docs/book/v2.0.0` | Documents the retired TypeScript author path (§2.1). Ships on the landing page instead — a different job for a different reader. |
| `packages/sharpee/docs/genai-api/` | Generated from `.d.ts` for agents, not authors. Repo-only by design. |

### Version

The docs bundle is pinned to the language version the IDE supports. Today
`CHORD_LANGUAGE_VERSION`, `ChordVersionCheck.supportedLanguageVersion` and the
bundle are all **3.0.0**; the bundle becomes a third thing that must agree, and
the Phase 3 build should fail rather than ship a bundle built against a
different one.

### Currency mechanism

**Bundled at build time from the repo — not fetched, not pointed at.**

- Phase 3's acceptance requires the tab render with no network dependency; a
  fetch cannot meet it.
- The IDE ships a *specific* toolchain (ADR-279 D4 vendors it). Documentation
  fetched from a site that has moved ahead of that toolchain would describe a
  language the bundled compiler does not speak. Bundling ties the docs to the
  compiler in the box.
- The machinery exists: `build-testing-tab.sh` + `TestingTabSchemeHandler` +
  a folder reference in `project.yml` is exactly this shape already (ADR-301 D1).

A "Latest documentation online" link to sharpee.net covers the drift between
releases without making the offline path depend on the network.

### What an author needs at their desk

The phase asked whether the language reference, stdlib reference,
transcript-testing guide and the book are four different jobs. They are, and the
answer differs per job:

| Job | Ships in the tab | State |
|---|---|---|
| Language reference | yes — `chord/guide`, `chord/reference/grammar` | ready after §2.2 fix |
| Stdlib reference | yes — `chord/stdlib` (complete) | ready |
| Getting started / tutorial | yes — `chord/getting-started`, `learn/fernhill` | ready after §2.2 fix |
| Transcript testing | **nothing to ship** | must be written (§2.4) |
| The book | **no** — landing page, not the tab | complete, but for the retired path |

---

## 4. What this puts in front of Phase 3

Phase 3 is **blocked on two things**, neither of which existed as a known item
when the plan was written:

1. **Fix the 15 stale story headers** (§2.2). This is a sharpee.net correctness
   bug in its own right, live today, regardless of the IDE. → new item 8.
2. **Give the website a static-export path** (§2.3). Recommended: `output:
   "export"` behind an env flag, with the three `redirects()` handled another
   way in that mode, so the same corpus serves both the live site and the
   bundle. → part of Phase 3's scope, not a separate item.

And it adds one that blocks Phase 5 rather than Phase 3:

3. **Write the transcript-testing documentation** (§2.4). Phase 4's friction log
   is the natural input — an author writing 22 transcripts by hand will produce
   exactly the list of what the docs must explain. → new item 9, sequenced after
   Phase 4.

---

## 5. David's calls

Nothing below was decided unilaterally:

- **Does the book stay out of the IDE?** The recommendation above says yes — it
  is for a retired path. If the book is going to be rewritten for Chord, that is
  a large piece of work with its own place in the ordering, and Phase 3 should
  not wait on it either way.
- **Is §2.2 urgent independently of the IDE?** `first-story` teaching a header
  that does not parse is live on sharpee.net now. It may deserve fixing before
  any of this rather than as go-live item 8.
- **`docs/reference/`**: leave as the honestly-labelled stale directory it
  already declares itself to be, or retire it? The audit does not need it either
  way; this is housekeeping, not a Phase 3 dependency.
