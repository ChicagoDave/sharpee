# NPM Local-Build Test — Family Zoo

Compiles and runs the **familyzoo** tutorial against the **locally built** npm
packages in `~/.tsf-publish` — the output of `tsf build --npm` — rather than the
npm registry. It proves the local build's publish artifacts work for an external
consumer **before** anything is published.

This is the pre-publish sibling of [`../npm-test-dungeo`](../npm-test-dungeo),
which installs from the registry (i.e. tests already-published packages). This
harness closes that gap: it tests what you just staged.

## How it works

1. `gen-consumer.mjs` walks familyzoo's `@sharpee/*` dependencies transitively
   over the staged packages, `npm pack`s each into `vendor/*.tgz` (the exact
   bytes `npm publish` would upload), and writes a consumer `package.json` whose
   `@sharpee/*` deps are `file:` references to those tarballs. Third-party deps
   (e.g. `fflate`) resolve from the registry, as a real consumer's install would.
2. `run.sh` copies that into a throwaway temp dir along with familyzoo's `src/`
   and transcripts, runs `npm install` (local tarballs only for `@sharpee/*`),
   compiles with `tsc`, and runs every `tests/transcripts/*.transcript`.
3. The temp dir is removed on exit.

Nothing escapes to the npm registry for `@sharpee/*` packages, and nothing in
the workspace is mutated.

## Usage

```bash
# Use the existing ~/.tsf-publish staging (run `tsf build --npm` beforehand)
./npm-test-familyzoo/run.sh

# Build the local npm packages first, then test
./npm-test-familyzoo/run.sh --build
```

Exit code is non-zero if compilation or any transcript fails.

## Interpreting results

Results should match the workspace build of familyzoo. A transcript that fails
here **and** in the workspace is a story-content issue, not a packaging one
(e.g. `v16-scoring` asserts a perfect score the walkthrough does not reach). A
transcript that passes in the workspace but fails here points at a real
packaging defect in the npm build (missing files, bad `exports`, wrong `main`).
