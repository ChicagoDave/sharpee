# `docs/unofficial/` — junk mail

**Everything under this directory is unofficial. Treat it the way you treat junk
mail: it arrived, it is being kept, and it is not something you act on.**

Four things are true of every file in here.

**It is in-repo, not published.** Nothing under `docs/unofficial/` reaches
sharpee.net, the npm package, or Chord Writer's embedded help. It exists only
because deleting it would lose history that occasionally turns out to matter.

**It is unmaintained.** No one updates these files when the code changes. Much
of it is superseded by material that *is* maintained — sharpee.net for author
docs, `docs/architecture/adrs/` for decisions, `docs/core-concepts/` for how the
platform actually works today. Where a file here disagrees with those, the file
here is wrong.

**It is out of scope for proposal, planning, and research** unless a human
directs otherwise. Do not cite it, plan from it, research in it, or use it as
evidence for a claim about how the system behaves.

**Using anything requires moving it out first.** Recovering a file is a
deliberate, human-directed act: someone moves it out of `docs/unofficial/`,
which is the moment its content gets re-qualified against current reality. A
file consulted where it sits has skipped that step.

## What is in here

| Path | What it was |
| --- | --- |
| `guides/` | Author guides, superseded by sharpee.net's `chord/guide` and `chord/cookbook` pages |
| `reference/` | Language and stdlib reference, superseded by sharpee.net's `chord/stdlib` pages |
| `spec/` | Specification material of uncertain current purpose — see [issue #247](https://github.com/ChicagoDave/sharpee/issues/247) |

## Two files were pulled back out on the way in (2026-08-14)

Both were misfiled here by the move that created this folder, and both are
recorded so the next person does not go looking for them:

- **`reference/chord.ebnf` → `packages/chord/chord.ebnf`.** Not stale reference
  material at all — it is the machine-readable Chord grammar that
  `language-version.test.ts` hashes as ADR-257 D5's build gate. Quarantining it
  broke that test outright.
- **`guides/transcript-testing.md` → `docs/core-concepts/transcript-testing.md`.**
  `@sharpee/transcript-tester` and `@sharpee/branch-tester` both link to it from
  READMEs that ship to npm, and it has no sharpee.net equivalent. Two published
  packages documenting their own test surface with it is the opposite of
  unmaintained.

One file in `guides/` still has no published equivalent —
`creating-a-language-implementation.md`. That makes it the likeliest candidate
to move back out someday. It does not make it current, and it does not exempt
it from the rule above.
