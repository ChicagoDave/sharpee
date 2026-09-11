# 06 — Distribution

**Created**: 2026-09-11
**Status**: UNDECIDED — this is the open fork with the largest consequences

Two shapes. They are not increments of each other; the second is not a smaller
first.

---

## Option A — export only

Story files export to iCloud Drive. Nothing else.

**What it buys**

- **No COPPA surface.** Under-13 users + accounts + user-to-user content is
  not a moderation feature, it is a compliance programme with a lawyer
  attached. No accounts means none of it.
- No server, no uptime, no moderation queue, no takedown path, no abuse
  reports, no cost floor.
- The asset stays clean. What a buyer acquires is an app, a language and a
  runtime, not an operating liability.
- **"Send it to someone" comes free.** A `.story` file in Files.app is
  AirDrop, Mail and Messages. For this age group the parent is the
  distribution channel, which is where it belongs.
- Since what exports is **source**, two children with the app already have
  sharing *and* remixing without a line of server code. The cheap version of
  the whole platform arrives as a side effect of D1 and D7 — including the
  original's canvas layout, which rides in the comment run.
- Most of the versioning problem evaporates. A file on someone's iCloud is
  opened by whatever app version they have. Nobody is owed a promise that a
  hosted artefact still plays in 2031.

**What it costs**

The app must stand entirely on the fun of making one. The loop closes at
showing someone; there is no shelf of other people's stories pulling anyone
back. That is the same bet as D3, made twice.

**Under this option**: `ifid` stays a low-priority warning, and there is no
lineage, cover-art or byline-attribution work.

---

## Option B — a publishing server

A server API: publish a story, play other people's, optionally publish the
Chord source alongside.

### What it forces to be decided

**Language lifetime.** Chord is still landing ADRs in the 330s; `chord.ebnf`'s
hash is pinned to `CHORD_LANGUAGE_VERSION` and the removed-spellings list is
already long. A story published this month is recompiled by whatever Chord
runs a year from now. Either:

- the published artefact is the **IR** — plays forever, source a separate
  optional attachment; or
- the story carries the language version it was written against and the server
  keeps old compilers around.

Publishing a playable and publishing source are two products with two
different lifetimes. Cheapest to decide before the endpoint exists.

**IFID stops being a warning.** It becomes the identity of a published thing.
A remix needs a fresh one plus a pointer at its parent — lineage without
inventing a social graph.

**Cover and byline.** Both become real: a story strangers see needs a face,
and `authors:` becomes attribution rather than decoration.

### Moderation, if B

The intent recorded is strong filters, possibly with Claude as oversight on
the publish path.

- **A useful property**: a Chord story's printable text is *enumerable without
  playing it*. Descriptions, phrase variants, prologue, refuse messages — all
  declarations, so the complete set of strings a player could ever see comes
  straight out of the IR. No crawling, no coverage problem, no "it only says
  that on turn 40". Most UGC platforms cannot do this.
- **The gap is identifiers.** If source publishes, entity names, phrase keys
  and `##` comment runs are public text too, and they are exactly where nobody
  looks. A child's note-to-self ships with the file.
- **Placement**: the gate belongs on the endpoint, not the keyboard. Children
  write dark things privately and that is fine — IF is half horror.
  Interrupting mid-sentence kills the blank page D3 exists to protect.
- **Server-side, not client-side.** A filter in the app is a suggestion; the
  endpoint is the boundary.
- **Design the false positive.** "Rejected", unexplained, is brutal to a
  nine-year-old. An oversight step should name the sentence and offer a
  rewrite, turning the worst moment in the product into an edit. And the thing
  that actually matters for child safety is often not the prose at all — it is
  a real name, a school or a handle in the title or byline, which is a
  narrower and far more reliable check.

---

## Current lean

Option A, with Option B left to a potential buyer. Not decided.
