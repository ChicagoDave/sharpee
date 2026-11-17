# ADR-307 E2E click-through — Phase 5 acceptance gate

The ADR's End-to-End Scenario, walked as a real click-through in the IDE
(not simulated). Each step lists the action and what you should observe;
any deviation is a Phase 5 finding. Automated AC evidence (AC-1..AC-4) is
already green — this walk is the last exit-state item, and per Phase 6's
entry state your sign-off on it is the gate for starting the cutover.

**Setup**: launch SharpeeIDE (the Debug build from `xcodebuild` is current,
2026-08-10) and open `branch-stories/fernhill/fernhill.story`. If a stale
`fernhill.tests.json` exists at the project root from earlier testing,
delete it first so the walk starts clean.

Fernhill declares no `auto-assertion:` header — under the 2026-08-10 rulings
that means the platform default, `room-name-and-description`, governs what
RECORDING writes: every played turn persists its synthesized claims INTO
`fernhill.tests.json` (the JSON is the source of truth for all testing
elements), and a run — tab or CLI — evaluates exactly what the document
says, assuming nothing. (Your fresh-start `command "look" has no assertion`
FAIL was the first gap; the Test → Auto-Assertion menu's first item is now
"Default (Room Name and Description)"; the run column now details every
card and its assertions.)

## The walk

1. **Play three norths** in the Testing tab (`north`, `north`, `north`).
   - Cards land as: opening, boot look, then one card per north — and every
     card shows its RECORDED claims (the opening's prologue/title/
     description channel claims; each turn's room-name/description contains
     claims), all persisted in `fernhill.tests.json` from the first turn on.
     The JSON is complete on its own — nothing lives outside it.
   - Cards group under region headers (fernhill: **Grounds**; a fourth
     north would open **House**). Clicking a header collapses the group —
     cards fold away, branch chips stay visible, and the group you're
     playing in never collapses. Collapse survives reopen (view-state
     sidecar); the document never records regions.
2. **Author a claim** on the first `north` card (the turn that lands on the
   Gravel Drive): select a phrase from its output — e.g. `gravel crunching
   underfoot` — and click **Add contains**.
   - The claim line joins the card's recorded ones; the document's turn card
     appends it to `assertions.contains`. Deleting any claim line — recorded
     or authored — is plain removal from the JSON.
3. **Branch from that same first-`north` card**: click **Branch…** and type
   `east`.
   - A fresh-boot replay runs the prefix, then `east` plays live (Gravel
     Drive has no east exit — the "can't go that way" turn is a legitimate
     recorded card).
   - The document gains a `branches` entry ON that card with the
     alternative's own cards; the card shows the branch chip.
4. **Tail-cut the main line's second `north`** (the card that lands in the
   Fountain Court): hover its ✕, click, confirm `delete?`.
   - That card and its descendant (the third north) leave the board AND the
     document; the branch from step 3 is untouched; ⌘Z stack cleared.
5. **Close and reopen the project.**
   - The tree deserializes and replays to the IDENTICAL board — same cards,
     same claim, same branch chip, active line restored (AC-1 through the
     real driver). `fernhill.tests.json` is byte-identical to before the
     reopen.
6. **Run.**
   - The column shows `opening-iron-gates` and `gravel-drive · east` line
     headers, both PASS — no turn counts anywhere (your ruling: turns have
     no meaning unless the author gives them meaning) — and under each
     header, **every card and its assertions**: each executed command with a
     ✓/✗ per claim (your ruling this morning). The tally counts CARDS and
     ASSERTIONS — e.g. `4 cards passing, 12 assertions passing` — the same
     numbers `sharpee test` prints for the same document (AC-2; your
     "every assertion counts" ruling).
7. **Edit the story**: change the Gravel Drive description phrase you
   claimed in step 2 (e.g. `gravel crunching underfoot` → `gravel popping
   underfoot`), rebuild, **Run** again.
   - The seam shows as failed claims on exactly that turn — your authored
     contains AND the recorded description claim both went stale, each ✗
     with its message in the detail — and NOTHING else changes: the branch
     row still passes, no corruption, no lost cards.
8. **(Optional cross-check)** in a terminal:
   `cd branch-stories/fernhill && node ../../packages/devkit/dist/cli.js
   test fernhill.story --tree` — same labels, same failure citation, same
   line counts as the tab.

## Sign-off

- [x] Walked 2026-08-10 by David — findings, all resolved same-day:
  1. Fresh-start run failed in the CLI (`command "look" has no assertion`)
     while the tab showed defaults → ruling "auto assertion is the
     default", then superseded by the source-of-truth pivot below.
  2. Turn counts carried no meaning → removed from rows, report, chips.
  3. Run column showed too little → per-card, per-assertion detail on the
     wire; tally counts cards and assertions.
  4. Live synthesis made the JSON incomplete → ruling "the JSON is the
     source of truth": recording persists synthesis into the document,
     runs assume nothing.
  5. Opening claims lost on replay → opening void-fill + Channel… gesture
     on the opening card.
  6. Gutter rail/margin line → removed.
  Plus region grouping (derived from the Story IR, collapsible, chips on
  collapsed headers, play-point group always open) added mid-walk.
