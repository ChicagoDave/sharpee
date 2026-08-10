# Testing Play Surface — Functional Logic Walkthrough

**Date**: 2026-08-09 (session fb4281, after click-through rounds 4a–4i)
**SUPERSEDED (2026-08-10, session ed3730)**: §1–§8 describe **model v1**,
retired by ADR-307's cutover — see §9 for the successor. The tree document
(`<story-id>.tests.json`) is now the model; the transcript grammar, ticking,
ranges, stems, and `continues:` composition are deleted from the codebase.
This document remains the historical record of v1 as built.
**Purpose**: the complete behavioral ruleset of the Testing tab as then
built, written down for a walkthrough BEFORE any further changes. This is not
an ADR — it is the working logic, including the places still in question.
Items marked **[OPEN]** were unresolved at writing; resolution happened
through ADR-307 and its cutover.

---

## 1. The session and its cards

1. The Testing tab hosts the play surface. It binds per project on first
   visit, loads after ⌘B, shows a placeholder before any build, and reloads
   on rebuild (re-reading the story's on-disk `auto-assertion:` policy).
2. Playing happens through the client's real input at the bottom. Every
   delivered turn becomes a **card**: the client's own rendered prose, moved
   into the card by its `data-turn` anchor.
3. The **opening card** (ordinal 0) holds the banner + prologue (claimed out
   of the boot look's bracket by their `sharpee-banner-*` classes). The
   **boot look** is turn 1. Typed turns follow.
4. Each card, top to bottom: meta line (`OPENING` / `TURN N · BOOT` /
   `TURN N`) → the prose → a rule line → **the assertion list** → a rule
   line → the action buttons.
5. A restart typed by the author is a **fence**: cards, undo stack, and
   session tracking clear; files already in `tests/` stay (the fence ends
   the session, not the suite).

## 2. Ticking — ranges, one transcript per line

6. The checkbox rail drives **ranges**. A tick:
   - with no range open and nothing closed before it on its line: **starts**
     an open range there;
   - with a range open: **closes** it at this turn (or extends its start
     upward if ticked above the start);
   - with a closed range earlier on the same line: **extends** that range's
     end to this turn — the same transcript grows and its file renames.
     Turns between join the walk with their default assertions.
   - Exception: a **fork point** between blocks extension — fork-made
     boundaries are the only boundaries.
7. Consequence: **one lineage carries one transcript** (plus fork-made
   splits). Chaptering does not exist (Split and Merge ↑ are retired).
8. Unticking the end of a closed range reopens it (recording resumes).
   Unticking a start drops the range whole — and removes its file.
9. Mid-range checkboxes render implied (checked, dimmed); only boundaries
   are author ticks.
   - **[OPEN]** Turns inside an open recording's *growing extent* are in the
     file but their checkboxes do not currently render as implied. Should
     they?

## 3. Files — the writer

10. **A range is a file from its first tick.** Ticking the opening (or any
    turn) writes `tests/<stem>.transcript` immediately. An open recording's
    file **grows as you play** (its extent = the line's latest turn,
    stopping short of a neighbouring transcript's turns).
11. Closing a range stops the growth. Reopening resumes it. The file never
    leaves disk for being open.
12. Every authoring gesture rewrites the file at once. A rename (route
    changed) deletes the old stem and cascades children's `continues:`.
13. **Names**:
    - a transcript starting at the opening: `opening-<first room>` — stable
      as it grows;
    - otherwise: `<start room>-to-<end room>-<turn count>`, or
      `<room>-<count>` for a loop; the name grows with an open recording.
    - Same-route collisions get `-2`, `-3`.
    - **[OPEN — David, tonight]** Why append the turn count at all? Proposed:
      drop it — `iron-gates-to-gravel-drive`, loop `iron-gates`, pending
      chip `gravel-drive-east`; keep only the collision suffix. NOT yet
      implemented.
14. **Hand edits**: a file edited beyond the claim grammar re-hydrates as
    *diverged* on reopen and **detaches** — the writer never touches it
    until a gesture on that range takes it back.
15. **Hand deletes**: a file deleted on disk dissolves its range on reopen
    (never re-written from defaults). Unticking removes the file directly.

## 4. Assertions

16. The card's assertion list shows exactly the lines the transcript
    carries for that turn, green, each with a hover ✕ that deletes it.
    `[SKIP]` and Exact's literal block render faint.
17. **Defaults**: under an `auto-assertion:` policy the runner's own
    synthesis supplies each in-range turn's default lines (room name /
    description contains). A story with **no policy line gets the surface
    default `room-name-and-description`** — an explicit header line wins.
18. **The opening's default** is its first prose line — the banner title in
    the real client (`[OK: contains "The Folly at Fernhill"]`).
    - **[OPEN]** Is the title line the right opening default, or should it
      assert more of the banner (version? byline? prologue)?
19. **Authored claims**: selection → *Add contains*; buttons for *Not
    contains… / Exact / State… / Event… / Channel…* (pickers read the
    turn's real captures/digest). Authoring on a turn inside the growing
    extent claims without closing the range; authoring outside any range
    starts one.
20. **Precedence**: authored contains (or a deleted default) withhold that
    turn's defaults — narrowing, never silent abandonment. Exact supersedes
    the contains family but keeps state/event/channel claims. A turn pruned
    to nothing demotes to `[SKIP]`.
21. **Deleting via ✕** maps to the model's mutators (the old source
    column's DeleteRef machinery). Deleting one policy-default line keeps
    the others as authored contains.
22. **Undo (⌘Z)** covers authoring state — ticks, ranges, claims, collapse.
    Played turns are never undone; fork, chip switch, branch delete, and
    fence clear the stack. Never fires inside a text field.

## 5. Branching

23. **Branch… runs FROM the card**: the fork point is the next turn on the
    active path; the typed alternate replaces *that* turn. The path's tip
    offers no Branch (typing continues the recording). Available inside
    open recordings too.
24. The fork **auto-splits**: the shared prefix becomes its own transcript
    ending just before the fork; the main line's continuation and the
    branch each become their own transcripts. Nothing auto-collapses —
    Collapse is a manual gesture only.
25. A fresh boot replays the branch live (restart → prefix suppressed →
    alternate typed). Dialogs auto-drive from recorded outcomes. The
    **viewed lineage is always the live lineage** — chips replay before
    they show.
26. The chip row sits at the fork point: main first, then siblings in
    creation order. Later forks at the same point add siblings. Turns past
    a fork are sticky to the branch that played them (lineage cut).
27. **Branch delete** (chip ✕, armed then confirmed): the lineage, its
    descendants, and their files go. Deleting the viewed branch replays the
    surviving parent live. The last sibling at a point dissolves the fork —
    the auto-split prefix folds back into one transcript (always safe:
    every boundary is fork-made).
28. **`continues:` appears only at fork points**: the branch child AND the
    main line's post-fork continuation both continue from the shared
    prefix. Sequential ticking can no longer create one.
    - **[OPEN — David, tonight]** The main continuation's `continues:` is
      still "unasked for" from the author's view, even granting the fork is
      a logical separation. Wanted: an affordance to REMOVE a `continues:`.
      Two candidate semantics to walk through:
      - **(a) Merge**: removing it folds the continuation back into the
        prefix — one file for the main line. But a surviving branch shares
        only the pre-fork prefix, so its file must then become
        **standalone** (its own `seed:` root, shared prefix as `[SKIP]`
        ancestry) — the runner supports that form today.
      - **(b) Standalone**: removing it leaves both files but rewrites the
        continuation as a standalone `seed:` root ([SKIP] ancestry replaces
        the header link). Names unchanged; the runner re-plays the prefix
        commands inside this file's own run.
      - Where the gesture lives (proposed): a hover ✕ on the card strip's
        "↳ continues from …" note.

## 6. Persistence — the sidecar and reopen

29. The sidecar (`~/Library/Application Support/net.sharpee.chord-writer/
    testing-sessions/<storyId>-<hash>.json`) holds the replay script, fork
    tree, segment structure, written stems (pointers), and dialog outcomes.
    **Never assertions or transcript content — the files are the truth.**
30. **The persisted session is the session the suite describes**: each
    line's commands persist only to the last turn its transcripts (or a
    surviving branch's fork) need; segmentless branches drop whole;
    unticked play is ephemeral. Untick everything → reopen is a fresh boot
    (opening + boot look only). The same scoping applies on READ, so stale
    or foreign sidecars never type unticked commands back in.
31. Reopen restores by replay (root, branches, active last), re-applies
    structure by position, and re-hydrates each range's claims from its
    file. Open recordings re-hydrate too.
32. A corrupt sidecar degrades to a fresh session, never an error.

## 7. The run column

33. Run executes the real `sharpee test --tree --json` over `tests/` — the
    whole tree on disk, prior sessions' files included. One row per
    transcript in run order: PASS with turn count, FAIL with the first
    failure one-line, `—` for unreached/blocked/pending; a tally line ends
    the run.
34. This session's not-yet-run transcripts show `—` ("not run yet" /
    "recording…" for an open one). A pending branch (no landed turn) shows
    a dash by rule.
35. **Any change to the suite on disk voids the results** — the column
    resets to not-run (guarded while a run is in flight). ⌘U runs through
    the same button; Cancel kills the same process.
36. **Opening claims are runnable** (platform, tonight): the runner
    evaluates them against everything the player saw through the first
    command — boot-captured `banner`/`prologue` channels (always captured
    now, with banner JSON flattened to its rendered lines) plus the first
    command's output.

## 8. IDE shell behaviors (this session's additions)

37. Window frame and project/play pane widths persist in `SessionState` —
    applied at launch, saved on drag/move/resize once a project is open
    (close the landing page → nothing persisted).
38. Settings has one preference: **Reopen last story at launch** — skips
    the landing page when the persisted project is still a story project on
    disk; falls back to the page otherwise.
39. The right panel's selected tab, pane visibilities, open documents, and
    expansion persist as before.

---

## The open list, gathered

| # | Question | Where |
|---|---|---|
| A | Drop the turn count from transcript names (keep collision `-2` only)? | §13 |
| B | `continues:` removal gesture — merge (branches go standalone) or standalone-continuation? And the gesture's home. | §28 |
| C | Should mid-extent turns of an open recording render implied ticks? | §9 |
| D | Is the banner title the right opening default assertion? | §18 |

---

## §9 — Model v2 (proposed during this walkthrough)

The walkthrough itself produced a proposed successor model that supersedes
much of the above: **the tree is the model, files are a projection** —
one JSON tree document per story, deserialized into the tab on load and
serialized fresh on every change; no checkboxes (playing in the Testing tab
IS writing the suite); no stems, no `continues:`, no detach class. Open
questions A, B, and C above are deleted by it rather than answered.

Written up as **ADR-307** (`docs/architecture/adrs/adr-307-testing-tree-model-v2.md`),
since ACCEPTED and fully implemented — the cutover landed 2026-08-10
(session ed3730), deleting the v1 transcript world §1–§8 describe. This
document remains the record of model v1 as built.
