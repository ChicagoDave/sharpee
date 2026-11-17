# Naive-reader protocol addendum: accepted limitations (The Chord Manual, Chord 4.1.0 / Sharpee 5.7.0)

This list is repeated in `naive-prompt.txt`, which is the brief a container run
is given. Edit the two together. Every item is a design decision or a fault the
book already states, not a defect a run should report: a run that reports none
of them and no new issues is a clean run.

Items 1, 2 and 5 were proposed by the session that wrote this file (cd304d,
2026-11-17) and accepted as written by David the same session ("a"). Item 2
was rewritten after run 1, on the two rulings it quotes.

## Accepted by design: do not report

1. **No Chord Writer.** The book says Chord Writer does the same work as the
   `sharpee` command, and chapters 4 and 38 describe it, but this edition
   prints no Chord Writer steps and the container has no Chord Writer. Every
   step is done with the `sharpee` command the book gives. Report only a step
   that the book says can be done and for which it gives no command.
2. **The companion folders are part of the book.** The chapters do not print
   every line of the story: a chapter's "Build and try it" says what to copy
   from its companion folder, and the book gives a sharpee.net address for
   them (David, 2026-11-17, on run 1: "b and the companion folder would be at
   sharpee.net from the website"). For a naive run the folders are put in the
   container, at ~/repos/book-test/companion, and the brief says to look there
   and not at the website (David, same day: "we can provide the companion
   folder directly and have a simple qualifier to look there and not the
   website"). A run does not report that a step needs a companion folder, or
   that the address differs. It reports a step that needs a line and names no
   place to copy it from. Chapter 35 has no companion folder, as it says.
3. **Values that belong to the run.** The IFID a build mints, build timings and
   file sizes, the address `npx serve` prints, and absolute paths in messages
   differ from the book's. Report only when a line's wording or shape differs.
4. **Faults the book states.** Chapter 39 says `sharpee claim` does not return
   when asked to lock a fact after a line's first `put`, and that a `needs
   verbs` line naming `put` stops `sharpee test` from finishing. Chapter 38
   says the command line has no recorder. Do not try these to see whether they
   are true.
5. **Sound cannot be heard in the container.** Chapters 36, 37 and 40 play
   recordings. A headless run cannot hear them. Report only a recording or
   picture the page fails to load, or an error the page prints.
6. **Text that varies on purpose.** Where a chapter teaches a choice that
   cycles, is random, or changes after the first time (chapters 17 and 20, and
   every clause built on them afterwards), the wording differs between turns.
   Report only output that contradicts what the chapter says the choice does.
7. **Reference material is read, not run.** The appendices are not executed.
   The boxes headed "From another system" quote Inform 10 and TADS 3 and are
   never typed in. Commands inside "Under the Hood" boxes are run.
8. **The version numbers.** The book quotes `Sharpee 5.7.0 · Chord 4.1.0` and
   `Chord 4.1.0` wherever a command prints its version (chapter 4's
   `--version` line and every `compose:` line). A run on the interim release
   prints `Sharpee 5.6.2 · Chord 4.0.3` and `Chord 4.0.3` in those places.
   Report only a difference in such a line beyond the two numbers. This item
   and the expected line below go back to 5.7.0 / 4.1.0 when that release is
   published.

## Versions this run expects

`npm install -g @sharpee/devkit` must give a `sharpee` whose `--version` line
is exactly `Sharpee 5.6.2 · Chord 4.0.3`, the interim release David cut on
2026-11-17 so the runs need not wait for 5.7.0 / 4.1.0. Anything else is a
stale registry or a stale container: an environment failure, not a book defect.

## What "clean" means

Every chapter PASS, zero BLOCKED, zero deviations, and every reported issue
either absent or on the list above.
