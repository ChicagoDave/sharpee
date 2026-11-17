# Sharpee: a verified timeline

March 2023 → August 2026. Every row traces to a commit, a file, or a dated
document. Rows marked **†** were checked by an adversarial verifier in Phase 5 and
carry that verifier's corrected wording, not the original claim.

Two things this timeline deliberately does not do: it does not date the ChatGPT
design conversations (nothing in them or around them fixes an absolute date), and
it does not treat an ADR's Status line as evidence that anything shipped.

One thing it cannot do: **some turning points left no artifact.** The
conversation that actually triggered the move from C# to TypeScript happened in
the web app, where saving context was hard, and is not in the archive at all. It
appears below on testimony alone. Where a row's only source is testimony, it says
so — and its absence from the record is a fact about the record, not about the
event.

---

## 2023 — the design, in C#

| Date | Event | Source |
| --- | --- | --- |
| 2023-03-19 | `IFPlatform` — 3 projects, 18 files, 675 lines, with a `GameEngine`, a `StandardLibrary`, and a `CloakOfDarkness/Story.cs` | file mtimes |
| 2023-03-21 | `IFStory` — 5 projects, 5 files, 109 lines, mostly `Class1.cs` stubs. A structure sketched and put down | file mtimes |
| 2023-04-01 → 04-03 | `StoryRunner` — 11 projects, 29 files, 1,909 lines. Property graph with reciprocal typed edges, an event published on every mutation, a fluent grammar builder. Every standard action is an empty method body | `DataStore/World.cs`, `StandardLibrary/Core.cs` |
| undated | Five ChatGPT design conversations. They order themselves — files 3 and 4 enumerate eight projects, file 5 says "three times" — but carry no absolute date. "graph" appears 124 times in file 4 alone | `chat-history/chatgpt/` |

## The first wall †

| Date | Event | Source |
| --- | --- | --- |
| 2023-04-03 → 2024-03-02 | **Eleven months, no artifact of any kind.** David: *"trying to use the first version of ChatGPT and instantly giving up — those were the salad days of hallucinations and imaginary code"* | testimony; file mtimes |

## 2024 — the C# platform gets built

| Date | Event | Source |
| --- | --- | --- |
| 2024-03-02 → 05-21 | `StoryRunner` touched again — nine files carry spring-2024 mtimes | file mtimes |
| 2024-06-26 | First Claude conversation: *"Building a Modular Interactive Fiction Data Store."* Its opening request models the grammar on **Inform 6's** | `reviewed/2024-06-26-01-08-48.json` |
| 2024-07-28 † | The name appears — as a Windows path in a pasted compiler error: `…\OneDrive - Mach9Poker, Inc\repos\sharpee\WorldModel\DataStore.csproj`. It belonged to the C# project | `reviewed/2024-07-28-18-44-16.json` |
| 2024-06 → 10 | 124 conversations, peaking at **74 in August**. Containers, supporters, scenery, doors, scope, tokenization, an event source for text. Compiler errors (`CS0535`, `CS0272`) date it beyond doubt: still C# | conversation index |
| undated, **not in the archive** | **The actual catalyst.** Frustration with Claude writing C# → *"rank the best platforms by Claude's capability"* → Level A is Python and TypeScript → *"What would Sharpee look like in TypeScript?"* Held in the web app, where saving context was hard; most likely inside the 2024-11 → 2025-02 gap | testimony |
| 2024-12-14 † | **The language evaluation** — not the decision. Two conversations, same day: "Translating Graph-Based C# to TypeScript" and "Evaluating C# 8 to TypeScript Migration." Staged and adversarial — second turn is *"Any cons?"* — and settled on scope: *"given a 'story' would always be single-user single-threaded…"* | `platform/2024-12-14-*.json` |

## 2025 — TypeScript, and two more walls

| Date | Event | Source |
| --- | --- | --- |
| 2024-12-15 → 2025-03-27 | Silence. No conversations, no repository | conversation index |
| 2025-03-27 | The record restarts at 23 conversations in one day: Lerna, project structure, "Separating Grammar, Parsing, and Language Structures" — and, the same day, story design and *"Optimizing Claide.AI vs. Claude Code"* | conversation index |
| 2025-03-29 † | First commit — **twice**, `d9003cf7` and `330931b5`, minutes apart. What importing existing work looks like | `git log --reverse` |
| 2025-03-29 → 06-23 † | **Wall 2, ~12 weeks.** Not idle: April's conversations are a firefight ("Resolving Build Errors in Stdlib"), with zero commits | git; conversation index |
| 2025-06-23 | Twelve weeks land in one commit: *"wholesale refactoring - not even going to list the changes"* (`a52d135e`, 529 files). 16 trait directories appear; the C# `Thing → Person → Player` inheritance chain never crosses into TypeScript | `git show --stat a52d135e` |
| 2025-06-20 / 06-28 | The conversation archive ends; the work-summary corpus begins eight days later. Not a gap — the instrument changed, chat to Claude Code | corpus index |
| 2025-07-02 † | `SpatialIndex` lands (`331b0674`): a single-parent tree plus derived child index. **The 2023 reciprocal-edge invariant is abandoned** — containment becomes exactly the parent pointer the prototype refused. Not drift: a design conversation asked *"What data storage patterns would be optimal?"* and argued the graph out. ADR-015 cites Unity Transform, Unreal attachment and Guava BiMap rather than the property-graph literature the C# design came from | `git log --diff-filter=A`; testimony; ADR-015 |
| 2025-07-02 | The same day: `"type": "module"` added to every package at 18:50 and removed from every package at 21:15 | session summaries |
| 2025-07-22 † | `save-restore-service.ts` ships partially implemented, silently dropping ScoreLedger, capabilities, state values, relationships and ID counters. **Not caught until 2026-04-28** | git; ADR-157 arc |
| 2025-08-13 † | `CLAUDE.md` created — 14 lines | `git log -- CLAUDE.md` |
| 2025-09-02 → 12-25 † | **Wall 3, ~16 weeks.** No commits, no summaries, no conversations in any source | git; corpus index |
| 2025-12-25 † | Return — and `987ba181` is the **first commit carrying `Co-Authored-By: Claude Opus 4.5`**. 25 minutes 48 seconds later, `1723c4e8` adds an "Autonomous Work Flow" section, whose first subsection is "Context Management," to a 71-line `CLAUDE.md` | `git log --format=%b` |
| 2025-12 | **What actually changed** — three things, two invisible to git: Opus 4 → 4.5, the Pro Max subscription, and the 200k context window. David: *"Claude was finally able to maintain an entire repo of complex architecture"* | testimony |
| 2025-12-26 | All 43 stdlib actions refactored **three times in one day**: three-phase → `report-helpers` → four-phase with `blocked()`, the middle version killed by a self-authored assessment. One visible day in a thirteen-month campaign — 232 commits touched `stdlib/src/actions`, 144 naming a refactor or migration — searching for an atomic action set. The three phases came first; the fourth arrived here | git; session summaries; testimony |
| 2025-12-27 | **Project Dungeo** launched — a ~191-room Mainframe Zork implementation, explicitly as dog-fooding. Over five days it forces a scheduler, an NPC system, combat, entity event handlers, transcript testing, and two-layer scoring | session summaries |
| 2025-12 | The text service is **deliberately left alone** while that runs: 4 commits to `packages/text-service*` against 49 to `stdlib` + `world-model`. David: *"an absolute piece of garbage that I intentionally ignored during the dungeo port because that was exposing and closing seams in the middle of the platform"* | git; testimony |
| 2025-12-27 † | Event sourcing rejected as an *"unnecessary technical rathole"* — in a session summary, not a decision record. ADR-034 still reads "Proposed (Future)" today; the ADR index marked it Abandoned only on 2026-02-18 | `2025-12-27-platform-assessment.md` |

## 2026 — the platform, the language, the app

| Date | Event | Source |
| --- | --- | --- |
| 2026-01-01 | First npm publish: 11 packages under the `beta` tag, after thirteen version bumps in one day and five failed attempts at OIDC Trusted Publishing | session summaries |
| 2026-01-11 → 12 | FORTRAN archaeology disproves the milestone declared eight days earlier: `DINDX.DAT` decoded, max score is 616 not 650, five treasures missing, three nonexistent, 21+ values swapped between fields | session summaries |
| 2026-01-13 → 14 | `@sharpee/text-services`, published January 1, is **deleted thirteen days later** after one design session — which David identifies mid-session as his own 2009/2010 FyreVM channel I/O | session summaries; git |
| 2026-01-14 † | The 774-line workflow guide written inside Sharpee is pushed **byte-identical** into a new repository, `ChicagoDave/devarch`. `CLAUDE.md` is 516 lines the same day | git, both repos |
| 2026-02-15 | The transcript tester is found to have been adding a silent `{type:"skip"}` assertion to any command written without one — so those commands were **never sent to the engine**. 26 cascading failures trace to `disembark` and `launch` never executing | session summaries |
| 2026-03 | 1,035 `as any` casts driven to zero across nine phases. The trigger was writing a CS-foundations document — a documentation exercise, no story involved | git; session summaries |
| 2026-03-24 † | DevArch installed **back into** Sharpee at v1.3.2 | `.devarch/descriptor.json` |
| 2026-04-19 † | ADR-153 Phase 4, *"Deno Sandbox Integration — Engine Subprocess and Turn Execution,"* recorded DONE while its namesake deliverable is an **84-line echo stub**. The carve-out was disclosed, not hidden: the commit message names it and the session's own Status reads INCOMPLETE | `ac523102` |
| 2026-04-23 † | **No-Stub-Under-Test** created and promoted into DevArch as rule 12a (now 13a) the same day | DevArch git |
| 2026-04-28 | `tools/server` — built, tested, Docker-deployed to play.sharpee.net — is deleted from main; ADR-153/153a/156/162 all marked REPLACED. The replacement direction is stateless per-turn workers with fyrevm-style channel I/O | git |
| 2026-05-02 | ADR-163 Phase 4B halts: `status.score` and `status.turns` have **no production emitters**, so a routing layer has nothing to route. The fix inverts the design to closure-per-channel — a channel owns its own producer | session summaries |
| 2026-05-10 † | ADR-174 deletes `@sharpee/text-service` outright: `c01208ca`, 62 files, −4,208 lines. Once each channel produced its own value, the text service had no job left | `git show --stat c01208ca` |
| 2026-06-18 | **Sharpee 1.0.0** — 27 packages published, 316 commits since 0.9.107 | tag `v1.0.0` |
| 2026-06-20 → 25 | The 31-chapter, 8-volume author manual, written in five days. Its QA pass becomes the best test harness the platform ever had — a Docker "naive reader" run finds `devkit@1.0.7` crashing on every command | session summaries |
| 2026-06-26 | One insight — *"`applyFormatters` collapses to a string too early"* — collapses six planned ADRs into one phrase algebra. 418 templates and 236 call sites migrated by a **99-agent parallel workflow**; the legacy chain deleted | session summaries; git |
| 2026-07-10 † | **Chord.** ADR-210 accepted 11:46; a working compiler runs Cloak of Darkness from a `.story` file with an 81/81 transcript gate **the same day**, about ten hours later. The npm release follows on 07-14 | git; ADR-210 |
| 2026-07 † | The blast radius: 391 non-merge commits, 86 ADR documents across 85 numbers, sixteen npm releases from 1.5.0 to 4.3.0 | git |
| 2026-07-15 | ADR-222 names Chord an **"elegance oracle"**: because Chord compiles down, a Chord form cleaner than hand-written TypeScript is proof the platform can be elegant and the TypeScript is a seam | ADR-222 |
| 2026-07-25 → 27 † | ADR-266 — from the owner's clarification that ADR-265 had misread a community complaint (Nathaniel Lindell, intfiction, 07-24) — lands all six children in about **21 hours**, removing `.withPriority` from **382 call sites** | git; ADRs 266–272 |
| 2026-07-23 | The IDE, dormant since May, is found **broken rather than stale**, and is rebuilt as a Chord authoring environment: Chord Writer | session summaries |
| 2026-08-03 → 06 | ADR-299's Skein ships across nine phases, is superseded two days later after David asks *"do we keep the Skein or do we make a transcript editing tool?"*, and its 2,768 lines plus 15 test files are deleted | git |
| 2026-08-09 → 10 † | ADR-307 retires the `.transcript` grammar entirely in favour of a `<story-id>.tests.json` tree document. `branch-tester` goes from **397 passing tests to 86** — the grammar suites died with the grammar | git |
| 2026-08-10 † | Deployment target dropped 26.0 → 11.0 in the evening, roughly three hours before the publish, so the app runs on any Apple-silicon Mac | git |
| 2026-08-10 | **Sharpee 5.0.0 published to npm** — 33 packages | publish run 31444888366 |
| 2026-08-10 | The signed Chord Writer app sits in `tools/ide/release/`, waiting on Apple's notary service, which crashed with a bus error on three consecutive submissions | `notarytool` |

---

## What the timeline is made of

| Source | Extent |
| --- | --- |
| C# prototypes | 3 solutions, 52 source files, 2,693 lines (2023–2024) |
| ChatGPT conversations | 5 files, 704 KB, undated |
| Claude conversations | 230 exports, 35 MB (2024-06 → 2025-06) |
| Session summaries | 1,247 across 13 months (2025-06 → 2026-08) |
| Git | 2,171 commits on HEAD, 2,055 non-merge across all branches |
| ADRs | 318 documents |
