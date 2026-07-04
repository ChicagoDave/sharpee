# Instructions for Claude — docs/book/

These rules apply to every edit under `docs/book/`, in any session, on any
machine, including container and cloud runs. They were set by David on
2026-07-03 after em-dashes crept back in through sessions that never saw them.

## Voice and style (chapter prose)

1. **Match the v1.5.0 edition's voice.** Before writing new prose, read a page
   or two of the corresponding v1.5.0 chapter to calibrate.
2. **No em-dashes in prose.** Use a comma, parentheses, a colon, a semicolon,
   or a new sentence instead. The v1.5 baseline is zero em-dashes in running
   prose. The only permitted em-dashes are:
   - "Volume N — Title" part headings (and title cross-references such as
     "Appendix A — Architecture Map");
   - verbatim quotes of platform output whose text contains one (for example,
     ch19 quotes the parser error "…is not a known kind prefix — legacy ':'
     chains are not supported"). Never edit a quoted error or transcript line
     to satisfy this rule.
3. **Complete sentences only.** No fragments, no clipped asides, no arrow
   chains in prose.
4. **No "lost meaning" paragraphs.** If a paragraph can't state its claim
   plainly, expand it rather than tightening it further.

**The appendices are exempt** from these voice and style rules. They are
generated (Appendix D by `scripts/generate-appendix-d.cjs`); regenerate,
don't hand-edit, and let the generators own their formatting.

Verification after any prose edit:

```bash
grep -rn "—" docs/book/v2.0.0/frontmatter docs/book/v2.0.0/parts | grep -v "# Volume"
```

Every hit must be one of the permitted cases above.

## Accuracy rules

- Quoted game output must match what the published platform actually prints
  (ADR-158 article-carrying forms, exact template renders). When in doubt,
  verify against the real Assembler or a transcript run; never quote from
  memory.
- Code snippets must compile against the published `@sharpee/*` packages a
  reader installs from npm. Import only symbols that exist.
- After editing fenced code, re-run `node scripts/extract-book-snippets.cjs`
  from `docs/book/v2.0.0/` so `code-snippets/` stays in sync.

## Build

```bash
./scripts/build-book.sh v2.0.0 html   # fast check while editing
./scripts/build-book.sh v2.0.0 all    # html + epub + pdf, republishes site/
```

A content edit is not done until the build is clean.
