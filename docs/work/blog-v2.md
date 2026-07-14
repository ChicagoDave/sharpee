# Blog post bullets — Sharpee v2 (2.0.0 → 2.1.1)

Source material for a blog post covering the v2 work. Verified against
ADRs 190–209, the phrase-algebra primer, the book change list, and the
commit history (116 commits, 2026-06-25 → 2026-07-05). Unshipped work is
kept in its own section at the end.

## The headline: the Phrase Algebra (Sharpee 2.0)

- Sharpee 2.x replaces the entire text-rendering system. Text is no longer a
  string with embedded formatters; it's a tree of typed `Phrase` values that
  defer realization, rendered by one per-locale Assembler at the end of the
  turn.
- The old formatter chain collapsed to a bare string after the first
  formatter, so nothing downstream could agree an article, pluralize a verb,
  or resolve a pronoun. The Assembler is now the single authority for
  articles, agreement, punctuation, whitespace, reference, and case.
- Authors write `{the box}`, `{verb:is target}`, `{contents:box}` and get
  grammatical English for free: "an open wooden box," "the pygmy goats are
  dead," "a goat, a rabbit, and a parrot." That's the bar Inform 7 set, and
  2.x clears it.
- Template syntax errors now throw loudly at parse time instead of silently
  rotting in output.
- The design is 15 typed phrase members; adding a text feature is one new
  union member, one Assembler case, one parser branch. Never a rewrite.
- Fifteen ADRs (192–206) specify the system, including: state-derived
  adjectives ("the *open* box" from live trait state), live container
  contents, a contribution channel where traits/NPCs/daemons append clauses
  into one grammatically-joined sentence, varying and cycling text that
  survives save/restore, pronouns that agree with the last-mentioned entity,
  numerals as digits/words/ordinals, and verbatim pass-through so you never
  see "a north."
- NPC speech is composition, not a subsystem: quoted dialogue gets
  capitalization, quote glyphs, and punctuation-inside-quotes right, and
  attribution agrees in number ("the triplet acrobats *say*").
- A CI-enforced Structural Realization Mandate bans regex post-processing of
  output. If the structure isn't in the phrase tree, it doesn't ship.

## Engine correctness (2.0–2.1)

- Capability-behavior and action-interceptor registries moved off
  process-wide singletons onto the `WorldModel` itself (ADR-207/208).
  Symptom fixed: the first story loaded in a process used to win the
  bindings for every later game — the tutorial zoo scored 70/75 because
  petting silently stopped awarding. Now it's 75/75, per world, idempotent.
- The fix was verified three ways: 201/201 transcript assertions against
  `npm pack` tarballs, then 197/197 against the real npm registry at 2.1.0.
- 2.1.1 shipped the fixes surfaced by book validation: transcript-tester
  state-assertion resolution (the `player` reserved word, alias lookup),
  engine command chaining, scenery listing/article fixes, NPC direction, and
  devkit build fixes.

## The book: The Sharpee Author and Developer Manual, v2.0.0

- A new edition for the 2.x line: 31 chapters across 8 parts plus 5
  reference appendices, building one game (the Family Zoo) from a single
  room to a themed, tested, saved-and-restored browser release. (Note: the
  change-list doc says "36 chapters" in one place — the real count is 31;
  don't quote 36.)
- The old "Formatter Chain" chapter is now "The Phrase Algebra" — the system
  it used to teach literally throws an error in 2.x.
- The validation story is the blog gold: before release, an AI agent in a
  clean Docker container played first-time reader — installed from npm,
  followed the book literally front to back, typed in every listing, ran
  every test. Seven rounds of fix-rebuild-rerun (Rounds A–G across nine
  container runs) until runs came back clean: all 31 chapters PASS, zero
  blocked, zero deviations, 169/169 transcript assertions, browser behavior
  verified with Playwright.
- Getting to zero took killing issue *classes*, not instances: the book now
  has four named front-matter conventions (the import, placement,
  replacement, and illustrative rules) that chapters cite by name, so a
  literal reader can never be lost about where code goes or whether a
  listing is meant to be typed.
- The book teaches transcript testing by doing it: readers now build a real
  two-file walkthrough chain with save/restore checkpoints, event
  assertions, and world-state assertions — every printed listing verified
  green against the published packages.
- The v1.5 edition remains available for the previous line.

## The tutorial and the proving grounds

- The Family Zoo tutorial split into versioned lines (`v1.5.0` frozen,
  `v2.0.0` current); v2 uses chapter-named cumulative snapshots
  (`ch02-first-room.ts` … `ch28-multi-file/`) that each compile against the
  published packages.
- Dungeo (the Mainframe Zork port) migrated onto the phrase system and drove
  the hard cases: article absorption, verbatim scalars, a melee blank-output
  fix, and the message-param contract sweep.
- 20 architecture decision records (ADR-190 through 209) document the era —
  including one rejection (catalog-wide subject-verb agreement, ~120
  templates, rejected on evidence the cases never occur), which is itself a
  nice "we say no" beat.

## Release and site

- Uniform lockstep versioning across all `@sharpee/*` packages: 2.0.0
  (July 1), 2.1.0 (July 3), 2.1.1 (July 5), all on npm; 1.5.0 stands as the
  final release of the previous line.
- sharpee.net refreshed for 2.1: the book linked site-wide, corrected
  getting-started flow, and the 17-step web tutorial preserved as the marked
  1.x legacy track.

## What's next (accepted, not yet built — keep separate if used)

- Room-description snippets (ADR-209): `{snippet:cabinet}` markers inside
  room prose, spliced with author-supplied varying text — motivated by 81
  missing-scenery findings in the dungeo audit.
- The "Play It Now" browser playground (ADR-191) is still proposed, not
  shipped.

## Accuracy warnings

- Don't call zifmia/multi-user part of this window; it appears only as
  motivation in ADR-207/208.
- Don't describe the dialogue work as an NPC engine; it's speech agreement
  and attribution via phrase composition (ADR-201/203).
- ADR-209 snippets and ADR-191 playground are roadmap, not shipped.
