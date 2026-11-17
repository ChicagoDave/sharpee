# 01 — Concept

**Created**: 2026-09-11
**Status**: EXPLORATORY

## The idea

Chord's surface is deterministic and almost entirely declarative. A child
drags a `room` onto a canvas, drags `lockable` onto a door, types a sentence,
and presses Play. The app writes Chord; the child reads Chord if they want to,
because the Chord tab sits beside the Map tab from the first minute.

## Who it is for (D2)

Children. The framing is **entertainment**, or extra credit at a push — a kid
makes a text adventure because making one is fun, and finds out what
interactive fiction is on the way through.

It is deliberately **not** a classroom tool. An earlier pass of this design
assumed a teacher: assignments, a teacher-authored trait library, a shared
device, a governance layer. All of that was cut. The consequences are not
cosmetic:

- No assignment, no grading, no correctness pressure. Nothing in the app tells
  a child their story is wrong; the problem sheet reports what will not *run*
  and labels its own opinions as opinions (`05`).
- Time-to-first-playable matters more than coverage of the language.
- Nothing is gated behind a teacher account, because there are no accounts
  (`06`).

### The bar this sets

Extra credit only has to beat a worksheet. Entertainment has to beat
everything else already on the iPad, and IF's hook — the pleasure of typing at
a machine that answers — is a slow burn. This is the central risk of the whole
concept and it is not mitigated anywhere in this folder. Recorded, not solved.

## The blank canvas (D3)

A new story opens onto an empty page. No starter world, no ghost cards, no
"drag a room here", no guided first run.

The reasoning, which survived a disagreement and won it: an empty state reads
as a failure mode to an adult facing a tool, not to a child facing a page.
Children work on blank paper constantly and do not experience it as a void.
What makes a blank page safe is not content but *structure* — knowing what a
finished thing needs. That is the checklist (`05`), and it is the only thing
on screen beside the empty canvas.

A corollary worth stating because it was tempting: no shelf of starter stories
to remix. Remix arrives, if it arrives, through file export (`06`), not
through seeded content.

## Single user (D8)

One author editing one story at a time. No live collaboration, no presence, no
merge. The `authors:` header field takes as many names as the story wants —
that is a byline for the finished thing, not a claim about who can edit it.

This removes a whole class of problem from the design (conflict resolution
over a projection, range drift under concurrent edits) and is worth defending
even if the app later grows a server.

## What it is not

- Not Chord Writer. Chord Writer (ADR-154) is the macOS IDE for authors who
  want the language. This is a different product with a different audience,
  reading and writing the same file format.
- Not a Chord subset, dialect or fork. There is one language. The app exposes
  part of it and shows the rest as read-only source (`04`, "The filter").
- Not a teaching curriculum. There is no lesson order and no progress model
  beyond the checklist.
