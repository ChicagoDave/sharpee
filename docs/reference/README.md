# Reference Documents — Not Authoritative

> **Warning: these documents are not evenly maintained and are often out of
> date. Never mistake anything in this directory for the current state of the
> repository.**

The files here were written at various points and updated only when someone
happened to have a reason to. There is no process that keeps them in step with
the code, so any given file may describe a version of Sharpee or Chord that no
longer exists. A statement here that contradicts the code means the code is
right and this directory is stale — not the other way around.

The failure mode is specific and worth naming: these documents read as
authoritative. They are formatted like specifications, they cite ADRs, and they
carry version numbers. None of that makes them current. `chord-language.md`
opens by declaring "Describes Chord 1.4.0" while the language has moved past
that, which is exactly the kind of confident, precise, wrong statement to expect
from this directory.

## What is authoritative

| For | Go to |
| --- | --- |
| The Chord language | `packages/chord` — the lexer, parser, analyzer, and `chord.ebnf` grammar. The parser wins over any prose. |
| Platform behavior | The package source under `packages/`, and each package's `CLAUDE.md` |
| Author-facing documentation | **sharpee.net** — the maintained home for author docs |
| Decisions and their reasoning | `docs/architecture/adrs/` |
| Orientation to the whole system | `docs/core-concepts/README.md` |

## Current contents

| File | Last touched |
| --- | --- |
| `chord.ebnf` | 2026-08-03 |
| `transcript-testing.md` | 2026-07-28 |
| `chord-grammar.md` | 2026-07-25 |
| `chord-language.md` | 2026-07-25 |
| `stdlib-cookbook.md` | 2026-07-25 |
| `stdlib-reference.md` | 2026-07-25 |
| `phrase-algebra-primer.md` | 2026-07-01 |
| `character-model.md` | 2026-04-04 |

Use these to get oriented. Do not use them to settle a question, and do not
cite them as evidence that something is true — verify against the packages
first.
