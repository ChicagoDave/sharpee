# ADR-359 D1 baselines (Phase 1, captured 2026-10-05, session 0ebc5d)

Captured on `main` at 10e31c2cc, before any D1 code. Package builds dated 2026-10-04 01:39–01:40, after the last source commit touching them. Every command ran once.

## Story test trees (`./sharpee test <dir>`)

| Story | Passing | Failing | Skipped | Exit | Report |
|---|---:|---:|---:|---:|---|
| branch-stories/fernhill | 45 | 0 | 29 | 0 | `branch-stories_fernhill.stdout.txt` |
| branch-stories/ides-of-march | 25 | 0 | 59 | 0 | `branch-stories_ides-of-march.stdout.txt` |
| branch-stories/secret-letter | 890 | 53 | 813 | 1 | `branch-stories_secret-letter.stdout.txt` (stderr: 660 lines of pre-existing stub-template parse noise) |
| stories/thealderman/chord | 32 | 5 | 33 | 1 | `stories_thealderman_chord.stdout.txt` |

Counts are report lines marked ✓ / ✗ / ◌. The failures in secret-letter and thealderman were there before this work. After the cutover each report must match its baseline line for line.

## Compile gates (`./sharpee compose <story> --check`)

All 17 stories pass (`compose_*.stdout.txt` / `.stderr.txt`). The one exception is `branch-stories/upps/upps.story`, which is header only and fails with `analysis.start-block-missing`, as expected. The `test_*` files record that stories without a test tree exit 2 ("no test tree found"). For those stories the compile gate and the IR are the check.

## IR (`ir/*.ir.json`, `./sharpee compose <story> -o`)

The IR of all 17 stories, 4.4 MB. After the cutover the only expected differences are `format` (`story language 4` → `story language 5`), `thing` in `kinds` for plain entities, and source spans shifted by the inserted text.

## Package suites (`suites/`)

| Package | Passing | Failing | Skipped |
|---|---:|---:|---:|
| chord | 1179 | 0 | 0 |
| story-loader | 1195 | 0 | 1 |
| world-index | 215 | 0 | 1 |
| branch-tester | 270 | 0 | 0 |
| devkit | 203 | 0 | 1 |
| platform-browser | 175 | 0 | 0 |

`world-index` and `branch-tester` run vitest in watch mode by default, so run them with `pnpm --filter <pkg> exec vitest run`.

## Dungeo walkthrough chain

`node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`: 952 passing, 0 failures across 17 transcripts, exit 0 (`dungeo-chain.txt`). The bundle is dated 2026-09-29; the only package commit since (f90faa177) touches the test-tree wire, not gameplay.

## Corpus inventory (parser-based)

| Where | Files | Blocks | No kind | Kind not first | Files with parse errors |
|---|---:|---:|---:|---:|---:|
| branch-stories/secret-letter | 25 | 486 | 289 | 28 | 0 |
| branch-stories/fernhill | 1 | 65 | 35 | 4 | 0 |
| branch-stories/ides-of-march | 1 | 20 | 8 | 0 | 0 |
| stories/ | 14 | 116 | 45 | 2 | 0 |
| fixtures: packages/chord | 54 | 238 | 72 | 4 | 11 |
| fixtures: other packages and tools | 20 | 153 | 73 | 4 | 0 |
| docs/work fixtures | 105 | 584 | 350 | 4 | 104 |
| manual (mdx chord blocks) | 160 | 319 | 121 | 3 | 36 |
| website/public (fernhill copy) | 1 | 65 | 35 | 4 | 0 |
| **Total** | | **2,046** | **1,028** | **53** | |

The totals match ADR-359's count exactly. "Kind not first" is the codemod's move-the-kind rule (clarified 2026-10-05). Almost every such block is a same-line `scenery, a supporter`.

Chord embedded in other source, which the codemod's host adapters must reach (approximate counts of `create` lines): TS/JS, 172 files and 994 lines; Swift/C#, 13 files and 52 lines.

## Decision needed (Phase 3)

- **Sources that do not parse cleanly**: 104 of the 105 `docs/work` fixtures, 36 manual pages and 11 chord test fixtures. The 11 are likely the deliberately invalid ones. The parser still recovers their blocks, and the ADR's count includes them. The plan says to skip and report parse-error sources, which would leave about 350 docs/work blocks and some manual blocks unmigrated. Decide whether the codemod edits recovered blocks in files with errors, or leaves `docs/work` fixtures as records.
