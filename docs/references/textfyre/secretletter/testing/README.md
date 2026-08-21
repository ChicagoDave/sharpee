# Playtest transcripts — reference material

Five clean playtest transcripts recorded 2007–2010, in `>command` / response form.
They are the only surviving record of people actually playing *Jack Toresal and The
Secret Letter*, and their value to the Chord port is as **worked examples of the
intended experience** — what the game said, in what order, when a real person
typed real commands at it.

## These are not the acceptance gate for the port

The port is a **retarget**, not a faithful port. What gets built is bounded by
David's change document (P-4 in `docs/proposals/secret-letter-port.md`), and the
port's own acceptance is authored Chord transcript tests under
`branch-stories/secret-letter/tests/`, run against a freshly built
`dist/cli/sharpee.js`. **No transcript in this directory is a pass/fail target.**
A divergence between one of these and the port is expected and is not, by itself, a
defect.

That statement is scoped to this port and asserts nothing, in either direction,
about any other use of these transcripts.

## The five

| File | Commands | Build | Reaches | What it is good for |
| --- | ---: | --- | --- | --- |
| `SecLet-EE07.txt` | 1,069 | 2009 release (interpreter 1.2.3 / VM 3.1.0) | **complete — `*** To be continued ***`** | The reference playthrough. Every chapter, every major conversation, in order |
| `SecLet-EE08.txt` | 767 | 2009 release (same build) | **complete — `*** To be continued ***`** | A second complete run on a different route; useful precisely where it differs from EE07 |
| `sandlerbug.txt` | 470 | 2009 release | Lord's Market, blocked at Dame Sandler | A bug hunt, not a playthrough. Ends on the failure it was recorded to capture: *"Dame Sandler asked you not to come back."* Covers Books 1–11 unevenly |
| `The Secret Letter - Jacqueline - 080101.txt` | 249 | 2007 build (interpreter 0.4.2) | Grubber's Market, rooftops | Early playtest with the tester's own `*` comments recorded inline — the only transcript carrying a player's reactions. Ends *"flummoxed"* |
| `The Secret Letter r14.txt` | 112 | 2007 build r14 (interpreter 1.1.3) | Grubber's Market into Commerce Street | Shortest and earliest content; two years of design changes sit between it and the shipped game |

Two of the five are complete runs to the ending. The 2007 pair predate large
design changes and should be read as history, not as specification.

## Conversion applied

These files were landed by the corpus gate (see `../README.md`) and are otherwise
byte-for-byte upstream. One further, deliberate change was made on 2026-08-21:

**Two characters lost to an encoding round-trip before this repository received the
files were restored.** Every occurrence of U+FFFD (the replacement character) was
one of exactly two things, verified by inspecting all 20 occurrences across the five
files against `../source/story.ni`:

- `Copyright ` + U+FFFD + ` 2009` → `Copyright © 2009` (8 occurrences)
- `canap` + U+FFFD + `s` → `canapés` (12 occurrences, all the Ballroom description;
  `story.ni` line 11058 spells it `canapés`)

No U+FFFD remains in any file. Nothing else was touched — no rewrapping, no
whitespace normalisation, no command or response text altered. The long response
lines (551 lines over 200 characters in `SecLet-EE07.txt` alone) are how the
interpreter emitted them and are left alone.

```
$ python3 -c "import glob; print(sum(open(p,encoding='utf-8').read().count(chr(0xFFFD)) for p in glob.glob('*.txt')))"
0
```
