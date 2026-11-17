# D6 startup measurements — ADR-269

## Baseline (pre-migration), 2026-07-26, session f9e069

Method: `new EnglishParser(new LanguageProvider())` against the built dist packages
(HEAD 9fc5b914 + ADR-269 docs), Darwin arm64, node from PATH. Script:
50 warm iterations after 1 cold; module require timed separately.

| measurement | value |
| --- | --- |
| module require (lang-en-us + parser-en-us dist) | 27.2 ms |
| first `new EnglishParser` (cold — all 422 registrations + pattern compiles) | 2.0 ms |
| warm construction median / p90 / min (N=50) | 0.3 / 0.5 / 0.2 ms |
| CLI whole-boot `node dist/cli/sharpee.js` (usage path, 3 runs) | 0.08 s real each |

## Reading

- The 422-registration cost is **~2 ms cold, ~0.3 ms warm** — negligible in every context
  (CLI boot, browser `handleStart`, ADR-248 restart, zifmia per-invocation).
- D7's "zero startup delta" claim is therefore easy to hold: the generated module runs the
  same registrations the hand-written file does.
- Post-swap re-measurement (acceptance 7) should show the same order of magnitude; any
  regression beyond noise means the generated module is doing more than registering.

## Post-swap (Phase 4), same session

Generated grammar.ts (410 flat `.define()` rules from the Chord source) +
platform-grammar.ts (12 exception rules):

| measurement | baseline | post-swap |
| --- | --- | --- |
| module require (lang + parser dist) | 27.2 ms | 26.9 ms |
| first `new EnglishParser` (cold) | 2.0 ms | 2.0 ms |
| warm construction median / p90 / min | 0.3 / 0.5 / 0.2 ms | 0.2 / 0.5 / 0.2 ms |
| CLI whole-boot (3 runs) | 0.08 s | 0.07 s |

**Zero startup regression** — acceptance 7 satisfied. The Chord compile happens
at platform build time only (`repokit grammar`), never at boot.
