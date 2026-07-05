# Naive-executor protocol addendum — accepted limitations (v2.0.0 book)

Paste (or reference) this list in the container run brief. These are design
decisions, not defects: a run that reports none of them and no new issues is
a clean run.

## Accepted by design — do not report

1. **Chapter 28 needs GitHub.** It is the book's one read-along chapter; its
   code lives in the companion repository. A fully offline reader gets
   nothing to run there, and that is the accepted trade-off.
2. **CLI hint drift.** The CLI's "Next steps" output and `--help` text may
   lag the book (`npm run build` vs `sharpee build`; the help lists `test`
   as reserved even though `build --test` works). The book's §1.7
   follow-the-book rule pre-acknowledges this. Report only if a book command
   actually fails.
3. **Transitive package resolution.** Volume VII imports
   (`@sharpee/plugin-npc`, `plugin-scheduler`, `media`, `core`, `if-domain`,
   `event-processor`) resolve transitively rather than from the scaffold's
   own package.json. Report only if an import actually fails to resolve.

## Resolved by the 2.1.1 republish (2026-07-04)

The `player` reserved word and IdentityTrait name/alias resolution in
`[STATE:]` expressions now work on the published packages. The book's use of
exact created names (`yourself`, `bag of animal feed`) remains valid on every
version and is not a defect.

Behavior quirks present in ALL versions (in-repo included), not chapter
defects:

- `[REQUIRES:]`/`[ENSURES:]` must sit on the lines directly under `[GOAL:]`,
  and a failed condition fails the run only under `--stop-on-failure`
  (directive errors are otherwise discarded, `runner.ts:278`).
- A transcript header must end with the `---` separator; without it the
  parser can silently eat directives that follow the header.

## What "clean" means

Every chapter PASS, zero BLOCKED, zero deviations, and every reported issue
either absent or on the lists above.
