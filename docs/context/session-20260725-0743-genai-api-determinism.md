# Session Summary: 2026-07-25 - main

**Goal**: Pull latest main and fix the recurring loose file that dirties the working tree on every build.
**Status**: COMPLETE
**Outcome**: `scripts/generate-genai-api.js` stamped a wall-clock timestamp (`Generated: <UTC>`) into `packages/sharpee/docs/genai-api/index.md`, so every docs regeneration rewrote the file with no content change — a permanently dirty tree that also blocked the fast-forward pull. Replaced the timestamp with the platform version read from `packages/sharpee/package.json` (`Generated for Sharpee 3.5.0`) via a new `readPlatformVersion()` helper, which falls back to `unknown` so docs generation never fails on a missing or unparseable manifest. The line now changes only on a version bump.

**Files modified**:
- `scripts/generate-genai-api.js` (timestamp → version stamp, plus `readPlatformVersion()`)
- `packages/sharpee/docs/genai-api/index.md` (regenerated; one-line swap)

**Verification**: ran the generator twice back to back — the second run's output is byte-identical (md5 match), and the only diff against HEAD is the one-time line swap.

**Notes**: Pulled `489495f9..6644426a` (fast-forward, 99 files) — the ADR-264/265 numeric counters and stdlib-Chord reference work from the `adrs-264-265-counters-stdlib-reference` branch. `website/public/search-index.json`, the other file noted as loose in the prior session, has no timestamp field; it moved in this pull because the new Chord reference pages added real content, so it is not the same class of problem. The `@sharpee/ext-hunger` npm publish handed off in the prior session remains open and gated on ADR-264/265.
