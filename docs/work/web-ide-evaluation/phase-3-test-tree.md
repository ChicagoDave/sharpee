# Phase 3 — The test tree, in-page: the ADR-307 round trip with no host process

**Plan**: `docs/work/web-ide-evaluation/plan.md`
**Run**: 2026-09-15, session 989482, macOS 26.6.2, Edge 153.0.4234.32
**Spike code**: `/Users/david/repos/spikes/web-ide/src/{testing,walker,storage}.ts`, `src/shim/*`, `app/{testing,walker}.html`, `build.mjs` (outside this repository)
**Evidence in repo**: `evidence/phase-3/` — ten JSON readouts posted by the pages themselves, the written tree document, and the Node baseline stream

**Verdict: PASS on both halves, unattended.** The real testing surface — the byte-identical bundle the macOS app ships — drove fernhill's real 31-card document through a full replay in the page and wrote back a 32-card document that is **byte-for-byte identical to the one the Avalonia host wrote**. Separately, `@sharpee/branch-tester`'s real walker ran the same document in the page and matched the Node CLI exactly: 11 lines, 222 commands, 86 cards, 104 assertions, all passing.

And the count the plan told this phase to watch for is now **explained**: the browser host, which has no relay and no process boundary at all, reproduced the Avalonia host's 274 records exactly. The arithmetic below accounts for every one of them. **The Avalonia over-run was not a defect; the OpenSilver host's 31 was an under-run.**

## 1. What the browser replaces, and what stayed real

The macOS IDE splits this round trip across a process boundary. `TestingSurfaceViewController` injects a document-start boot script, receives the client's turn records on a `turnEvents` WKWebView message handler, forwards each one back into the page with `evaluateJavaScript`, receives the serialized document on a `testingSurface` handler, and writes the file from Swift.

In a browser every one of those hops is a function call in one JS heap. The whole Swift side reduces to this:

```js
window.webkit = { messageHandlers: {
  turnEvents:     { postMessage(body) { deliver(JSON.parse(body)); } },
  testingSurface: { postMessage(body) { /* document → storage adapter */ } },
} };
```

Both `@sharpee/platform-browser`'s `turn-events.ts` and the surface bundle look for `window.webkit.messageHandlers` by name. A browser page owns its own `window`, so supplying that object is not counterfeiting a host — there is no host to counterfeit. It is, however, a real coupling: **the shipped surface bundle and the shipped client both hard-code a WKWebView-shaped bridge**, so every non-WKWebView host has to supply it. That is recorded as a finding in §6, not waved through.

What was **not** replaced (rule 13a):

| Piece | What ran |
| --- | --- |
| The surface | `app/ide-testing-surface/surface.js`, copied from `tools/ide/SharpeeIDE/Resources/testing-surface/surface.js`. `sha256 cd46afaa…c3591` on both — the same file, not a rebuild |
| The page | The platform's own testing skeleton, copied from fernhill's browser build (`index-testing.html`), CSS links repointed and one spike-only button added |
| The client | The real `BrowserClient`, booted by the same sequence `chord-browser-entry.ts.template` runs |
| The turn feed | The records `emitTurnEvent` posts. Nothing synthesized one |
| The walker | `runTreeDocument` from `@sharpee/branch-tester`, and `assembleGame` from `@sharpee/bootstrap` — the same two calls devkit's `runTreeDocumentCommand` and `loadAuthorGame` make |
| The document | fernhill's real `fernhill.tests.json`, 21,329 bytes, seed 42, 31 top-level cards / 86 including branches |

The three boot-script details the IDE's own comments explain were kept, and for the same reasons: `AudioContext` removed (a synthetic Enter is not a user gesture, so `resume()` would never settle and every replayed command would hang), `confirm()` stubbed true (a typed `restart` is the driver's fresh-boot door), and web storage cleared. **All three traps are real in a browser too** — they are properties of synthetic events and modal guards, not of WKWebView.

## 2. The round trip — PASS

```json
"cardsIn": 86, "cardsOut": 87, "topLevelIn": 31, "topLevelOut": 32,
"newLastCard": {"command": "inventory", "skip": true, "type": "turn"},
"documentWrites": 1, "documentWriteError": null,
"writtenChars": 21412, "seedPreserved": true, "storyPreserved": true,
"readBackMatchesLastPost": true, "typedMs": 102, "totalMs": 2561
```

Document in, full replay, one turn typed into the client's real input, whole document posted back by the surface, written through the storage adapter, and then **read back from storage** and re-parsed — because a write that returns without landing is exactly the failure a round trip has to catch.

The written document, compared against the Avalonia host's own evidence file (`docs/work/avalonia-ide-evaluation/evidence/phase-1-fernhill.tests.written.json`):

```
web  21412 chars  sha256 4f50b66b4161b2e4…
ava  21412 chars  sha256 4f50b66b4161b2e4…
identical: True
```

**Byte-for-byte identical.** Two hosts with nothing in common below the surface bundle — one a .NET desktop app driving a WebView2, one a page in Edge with no process behind it — produce the same file from the same input. That is the strongest form the ADR-307 D1 claim can take: the document is the surface's projection, and the host only lands bytes.

Total elapsed for the whole thing, from page load to the written file: **2.56 s** (boot 23 ms, surface bundle load 1.90 s, replay 503 ms, typed turn 102 ms).

## 3. The 274, explained

The plan told this phase to record its own count and flag a discrepancy rather than assume a match. Measured:

```json
"feedRecords": 274, "turnRecords": 263, "restartFences": 11, "forkBoots": 11
```

274 — the Avalonia host's exact number, on a host with no relay to blame. Every term is accounted for by numbers measured in this same session:

| Term | Count | Where it was measured |
| --- | --- | --- |
| The walker's own executed commands (11 boot looks + 211 typed) | 222 | `3w-3-run.json`, `executedCommands` — and the Node CLI's identical 222 |
| One `restart` **turn** per fresh boot, before its fence | 11 | `forkBoots: 11` — the surface's driver types `restart`, and the client executes it as a turn |
| The final active-line replay (`replayTree`'s last step): its boot look + the main line's 29 commands | 30 | main-line `turnCount: 29` in `3w-3-run.json` |
| **Turn records** | **263** | 222 + 11 + 30 = 263 ✓ measured 263 |
| Restart fences, one per fresh boot | 11 | `restartFences: 11` = `forkBoots: 11` ✓ |
| **Total delivered** | **274** | 263 + 11 = 274 ✓ measured 274 |

The surface's replay costs more than the walker's because it does two things the walker does not: it drives every fresh boot by **typing `restart` into the live client** (a real turn, then a fence), and it **replays the active line a second time at the end** so the board is left live on it. Both are in `replayTree` / `driveFreshBoot` by design.

So the Avalonia record's open item — "274 turn records and 12 `forkBoot`s where OpenSilver saw 31 and 1 … the settled document is correct; the path is not" — resolves the other way round. **274 is what a complete replay of this document costs.** The OpenSilver host's 31 records and 1 `forkBoot` are the main line and its boot alone: that host never fresh-booted the ten branch lines, which is why its number is close to the main line's 29 commands. Avalonia's 12 vs this host's 11 `forkBoot`s is a single extra boot, not a class difference, and is the one piece this phase cannot settle from here.

This does not close Avalonia's item by itself — it is a third host's evidence, not a re-run of the second — but it removes the reason to suspect the relay, which was the standing hypothesis.

**Confirmed on two more engines since.** Phase 4 re-ran this page unchanged in Safari 26.6.2 and Firefox 155: both reproduce 274 / 263 / 11 / 11, 86 → 87 cards and the same 21,412-char document (`phase-4-storage-adapters.md` §5). The arithmetic is not a Chromium artifact.

## 4. The walker in-page — PASS, and an exact match to Node

The other three shapes answer "run my tests" by spawning `sharpee test --tree --json` and relaying NDJSON. A browser has no process to spawn, so the walker has to run on the page. It does:

```json
"lineCount": 11, "passed": 11, "failed": 0, "blocked": 0, "errored": 0,
"executedCommands": 222, "authoredCommands": 85,
"passingCards": 86, "assertions": 104, "defects": [],
"engineBoots": 11, "elapsedMs": 128, "matchesNode": true
```

Against the Node baseline taken the same day (`./sharpee test branch-stories/fernhill/fernhill.story --tree`, 2026-09-14 — `11 line(s)`, `86 cards passing, 104 assertions passing`, `222 commands (85 authored + 137 replayed)`): **identical on every count, and every line label matches** (`opening-iron-gates`, `gravel-drive · north`, … `folly · wait`).

The 128 ms is the walker alone, in-page; the Node command's 0.385 s wall time includes process start and the compile, so the two are not a like-for-like performance comparison and are not offered as one. What the numbers do establish is that **the walker is the same walker**: same lines, same derived labels, same command accounting, same verdicts.

## 5. The browser entry point the harness does not have — a real seam

The plan's hypothesis was that `runner.ts` is "the one node-bound file" in `@sharpee/branch-tester`. That is not what the code says. `packages/branch-tester/src/` imports **no** node builtins at all — the walker, the runner, the tree-document model, auto-assertion and the channel assertions are already browser-clean.

What blocks a browser build is the **barrel**. `@sharpee/branch-tester`'s `index.ts` re-exports `@sharpee/transcript-tester`, whose own barrel also re-exports `watch`, `golden`, `coverage`, `search` and `story-loader`. Those pull in `fs`, `path` and `glob`, and `glob` pulls in `node:fs/promises`, `node:stream`, `node:string_decoder` and the rest — 25 unresolvable imports for a browser bundle that wanted four functions.

`@sharpee/transcript-tester` publishes exactly one browser-safe subpath, `./assertion-core` (added for the IDE's own surface bundle). `@sharpee/branch-tester` publishes none. So this spike needed three module-resolution shims, all recorded in `build.mjs`:

- a four-line barrel re-exporting `types`, `assertion-core`, `command-core`, `channel-assert` and `aggregate` **from source** — the same treatment `tools/ide/web/testing-surface/build.mjs` already gives three of those modules, for the same stated reason;
- a real `path` (pure string work: `basename` for an error label, `join` for a `$save` path);
- an `fs` and a `module` that **throw by name** rather than returning plausible values, so that if the walker ever did reach a filesystem path the run would die loudly instead of reporting a pass. Across 222 commands it never did.

None of this stands in for the code under test — every function that ran is the package's own, bundled from the package's own source. But it means **a browser host cannot consume the testing harness as published**, and that is a platform gap, not a spike detail.

## 6. Findings, recorded not fixed

Platform changes require discussion first, so these are written down and filed rather than patched.

1. **The testing harness has no browser entry point** (§5). The logic is browser-clean; the barrels are not. Filed as **#463**.
2. **The surface bundle and the play client both hard-code a WKWebView-shaped bridge.** `turn-events.ts` posts to `window.webkit.messageHandlers.turnEvents` and gates the world digest on its presence; the surface posts to `window.webkit.messageHandlers.testingSurface`. Any non-WKWebView host — this browser, and both prior spikes — must supply that object by name. Filed as **#464**.
3. **A stored `FileSystemDirectoryHandle` did not survive the gap since Phase 2** (§7). This qualifies Phase 1's headline result and is added to **#461**.

## 7. What this phase did not prove, and why

**The write went to OPFS, not to the author's real folder.** Phase 1's stored handle was gone when this phase ran. The origin's state, probed directly before anything else was attempted (`3-storage-diagnosis.json`):

```json
"databases": [{"name": "phase1", "version": 1}],
"phase1": {"stores": ["handles"], "version": 1, "keys": []},
"persisted": false,
"estimate": {"quota": 10737420080, "usage": 1840}
```

The IndexedDB database and its object store survived; **the one record holding the handle did not**. Phase 2's own page (`compose.html`), unchanged since it passed at 00:37, now reports `2-no-handle` as well — so this is the origin's state changing, not this phase's code.

The origin was never made persistent: `navigator.storage.persisted()` is `false`, because nothing ever called `navigator.storage.persist()`. That is the most likely cause and it is actionable — a real web IDE must request persistent storage — but this phase did not prove the mechanism, and says so.

`showDirectoryPicker()` needs a user gesture, so a page that drives itself cannot recover a lost handle. Rather than stall, this phase ran its round trip on an **OPFS working copy** seeded once from the fixture over a read-only `/fixture/` route on the dev server, through a small two-implementation storage adapter (`src/storage.ts` — brainstorm §5's shape, arriving a phase early because Phase 3 needed somewhere to write). Every readout names its route.

What that costs, precisely: the round trip's **write leg was proven against OPFS, not against the author's directory**. The real-folder write itself is not unproven — Phase 1 proved it directly, verified from outside the browser (30,608 = 30,559 + 49 bytes) — but it was not re-proven end-to-end here, and this record does not claim it was. `testing.html` now carries a **Use real folder…** button: one click and one folder pick re-grants the handle, after which the same page takes the `folder` route with no other change. That is a single gesture whenever someone is at the keyboard.

Also not established here: the surface's **Run column** (its NDJSON relay UI) was not wired to the in-page walker — the walker ran on its own page. Joining them is the obvious next step and is not evidence this phase claims.

## 8. Nothing in the repository was written

`git status --short branch-stories/fernhill` empty throughout; `branch-stories/fernhill/fernhill.tests.json` and the spike's fixture copy both still hash `069f424d…fe4de6`, their Phase 0 baseline. The round trip's writes went to the origin private file system, which no repository path can reach.

## Integration Reality Statement (rule 13a)

**The ADR-307 tree-document round trip, in a browser**

- **OWNED**: `@sharpee/branch-tester` (walker, runner, tree-document model, auto-assertion); `@sharpee/transcript-tester`'s assertion and command cores; `@sharpee/bootstrap`'s `assembleGame`; `@sharpee/chord`'s compiler; `@sharpee/story-loader`; `@sharpee/platform-browser`'s client and turn feed; the IDE's `testing-surface` bundle; the platform's testing page skeleton.
- **EXTERNAL**: Edge 153's File System Access API, OPFS, and IndexedDB — the browser, which this repository does not ship.
- **REAL-PATH TEST**: `3w-3-run.json` — `runTreeDocument` and `assembleGame` executed in the page over fernhill's real document, 222 commands, 11 lines, matching the Node CLI exactly; and `3-3-replay.json` / `3-4-round-trip.json` — the shipped surface bundle driving the shipped client through 274 records to a written document byte-identical to another host's. No injection, no override, no stub of any owned dependency.
- **STUB JUSTIFICATION**: three module-resolution shims (`fs`, `module`, and a narrow `@sharpee/transcript-tester` barrel) exist only so a browser bundler can resolve a barrel that re-exports node-side modules. They replace **no** logic: `path` is implemented correctly, `fs` and `module` throw by name so a reached filesystem path fails loudly, and the narrow barrel re-exports the package's own source. Backed by the REAL-PATH tests above, in which the `fs` shim was never reached across 222 commands. The OPFS storage route is not a stub of an owned dependency — it is one of the two adapters this evaluation is here to compare, and §7 states plainly what it does and does not prove.
