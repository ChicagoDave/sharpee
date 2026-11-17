# Origin-era source index — the C# prototypes and the ChatGPT design conversations

Everything here predates the TypeScript repository's first commit (2025-03-29).
Mechanical inventory only: what exists, how big it is, and what dating evidence
each artifact carries. No reading, no interpretation — that is Phase 2.

## The C# prototypes

`/Volumes/Backup/archives/repos-old/` — no git in any of them, so the only
dating is file mtime.

| Prototype | Projects | Source `.cs` | Lines | mtime span |
| --- | --- | --- | --- | --- |
| `IFPlatform/` | 3 | 18 | 675 | 2023-03-19 → 2023-03-21, plus one file 2024-02-29 |
| `IFStory/` | 5 | 5 | 109 | 2023-03-21 |
| `StoryRunner/` | 11 | 29 | 1,909 | 2023-04-01 → 2023-04-03, then 2024-03-02 → 2024-05-21 |

Counts exclude `obj/` build output. `PTRunner/` sits in the same folder and is
poker software (Mach9), not IF — excluded.

**Project names, which is the finding worth carrying into Phase 4.** StoryRunner's
eleven projects are: `WorldModel`, `Common`, `DataStore`, `GameEngine`,
`GrammarLibrary`, `MyStory`, `ParserLibrary`, `StandardLibrary`, `StoryRunner`,
`StoryRunner.DataStore.Tests`, `TextService`. Set that beside the TypeScript
monorepo's package list — `world-model`, `engine`, `stdlib`, `parser-en-us`,
`text-service` — and the architecture's shape is recognizable two years before
the rewrite. Whether that is continuity or reinvention is a Phase 2/4 question;
the index only records that the names line up.

**IFStory is a skeleton**, not an implementation: 5 files, 109 lines, mostly
`Class1.cs` stubs across `Grammar/`, `Parser/`, `StoryEngine/`, `WorldModel/`.
It looks like a structure sketched and abandoned rather than a program.

**StoryRunner was revisited in 2024** — nine of its files carry 2024-03 and
2024-05 mtimes, a year after it was written and weeks before the Claude
conversations begin in June 2024. The C# era did not end in April 2023.

## The ChatGPT design conversations

`chat-history/chatgpt/` — 5 plain-text dumps, 704 KB, no metadata of any kind.
File mtimes are all 2025-06-21, which is the export date, not the conversation
date.

They are, however, **self-ordering**: each one says where it stands relative to
the others.

| File | Lines | Opening line (verbatim) |
| --- | --- | --- |
| `chatgpt-1.txt` | 2,078 | "We're going to design a new parser-based Interactive Fiction platform using C#." |
| `chatgpt-2.txt` | 5,086 | "Let's work on a new C#-based IF platform." |
| `chatgpt-3.txt` | 1,993 | "I'm designing a C#-based interactive fiction platform. I'll remind you of everything we did in a previous conversation. There are eight projects includ…" |
| `chatgpt-4.txt` | 8,568 | "This is my IF Platform Design conversation. I will share the current code before we make design changes. There are eight projects including one consol…" |
| `chatgpt-5.txt` | 709 | "I've asked you to help me design a C# based interactive platform three times and the third time has gone very well. I'm having some thoughts about the whole design and wondering if we could talk about it without writing any code." |

Two dating anchors fall out of that without reading a line further:

- `chatgpt-3` and `chatgpt-4` both enumerate **eight projects** including
  `StoryRunner` (console) and `Common` (holding `IStory`), so both **postdate
  StoryRunner's creation on 2023-04-01**. Note the count: eight then, eleven in
  the copy on disk — the prototype grew after these conversations.
- `chatgpt-5` says the platform has been designed "three times," which places it
  after the other four, and its request — talk about the design *without writing
  any code* — makes it the reflective one.

**The word that dominates them is "graph."** Raw counts: 21 in file 1, 19 in
file 2, 26 in file 3, **124 in file 4**, 37 in file 5. And `StoryRunner` has a
`DataStore/GraphEvents.cs` and a `DataStore/World.cs`. The graph-shaped world
model is the oldest surviving idea in the project.

## Dating summary for Phase 2

| Artifact | Dating evidence | Strength |
| --- | --- | --- |
| C# prototypes | file mtimes only (no git) | weak — mtime is last edit, not authorship |
| ChatGPT dumps | internal cross-references; project counts; "three times" | ordering strong, absolute dates absent |
| Claude exports | `created_at` / `updated_at` in each file | strong |
| Session corpus | filename convention, then document header, then mtime | strong for 1,266 of 1,542 |
| Repo history | git | strongest |
