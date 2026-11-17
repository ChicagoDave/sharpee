# Phase 6 — The shell: offline, appearance, project pane, second window, settings

**Plan**: `docs/work/web-ide-evaluation/plan.md`
**Run**: 2026-09-15, session 989482, macOS 26.6.2, Edge 153.0.4234.32
**Spike code**: `/Users/david/repos/spikes/web-ide/src/shell.ts`, `app/sw.js`, `app/shell.html`, plus `listTree()` and nested paths added to `src/storage.ts` (outside this repository)
**Evidence in repo**: `evidence/phase-6/` — nine JSON readouts, including one recorded while the dev server was stopped

**Verdict: PASS on four of five, PARTIAL on one.** Offline, appearance, project pane and settings all pass. The second window passes on the mechanism that matters (`BroadcastChannel`, proven across two real windows) and **fails on `window.open`**, which a page with no user gesture cannot call — recorded as the finding it is rather than worked around.

The appearance flip is the number Phase 7's table cell needed: **0.01 ms median**, against the OpenSilver host's 0.9 ms `Apply()` and Avalonia's free flip.

## 1. R13 — offline, proven by stopping the server (PASS)

Not "service workers just work". The worker precaches the app shell **and the two heavy assets this shape actually depends on**, because an IDE that opens offline but cannot build offline has not answered the question:

```json
"precachedEntries": 16, "precacheFailures": 0,
"precachedBytes": 17283364,
"heavyAssets": { "platform.zip": 2043666, "esbuild.wasm": 13509049 },
"registrationMs": 237, "controllingThisPage": true
```

**17.28 MB cached**, of which 15.5 MB is the platform payload and the bundler. That is the real weight of the offline claim for this shape, and it was not knowable before Phase 5 measured those two assets.

Then the actual test. The dev server was **stopped** (`pkill`, then `curl` confirming connection refused: `server now: 000`), and the page reloaded. It came up, and the run recorded — from the offline load itself:

```json
"serverReachable": false,
"composeFromCache":          { "ok": true, "sourceChars": 30509, "irBytes": 114170 },
"platformPayloadFromCache":  { "bytes": 2043666, "files": 1127 },
"esbuildWasmFromCache":      { "bytes": 13509049 },
"settingsSurvived": true,
"storageReachable":          { "route": "opfs", "files": 17 }
```

**With no server running, the page compiled fernhill's real story** — 30,509 source characters to a 114,170-byte IR — and had the full platform payload and the 12.88 MB bundler in hand. The service worker registered in **1 ms** (already installed) and was controlling the page.

The run could not post while offline, so it banked its readouts in `localStorage` and the next online load drained them. The timestamps carry the proof: `6-2-offline-capability.json` is stamped `02:47:18` and reached the sink after the `02:47:50` reload. That queue-and-drain is itself the offline story working.

**What the offline run did not prove**: it did not execute a tree test. The testing and walker pages are not in the precache list, so they were never exercised with the server down. Everything they need *is* cached (the payload is the same one they resolve against), which makes this a gap in what was proven rather than a known limitation — but it is a gap, and the parity column should say "compose and publish, proven; test, not exercised" rather than "offline".

## 2. R17 — ADR-297's live flip (PASS, and the fastest of the four)

Measured the way the two prior spikes measured it: a token mutated, the **rendered** value read either side, the apply timed. Same token and same two values as the OpenSilver probe — `Theme.swift`'s `railBackground`, `#DCE0E8` light / `#16171D` dark — so the numbers are comparable rather than merely analogous.

```json
"before": { "token": "#DCE0E8", "rendered": "rgb(220, 224, 232)" },
"after":  { "token": "#16171D", "rendered": "rgb(22, 23, 29)" },
"matchesExpected": true, "changed": true,
"flipMsFirst": 0.165, "flipMsMedian": 0.01, "flipMsP90": 0.015,
"samples": 50, "tokensPerFlip": 3
```

The rendered values are read with `getComputedStyle` **after a forced layout**, so the measurement covers the browser's work and not just the property write — the OpenSilver probe timed a whole `Apply()`, and a bare setter would not have been the same thing.

| Host | Flip cost | Mechanism |
| --- | --- | --- |
| WPF | (predicted expensive — invalidate every `OnRender` surface) | immediate-mode redraw |
| OpenSilver | 0.9 ms `Apply()` | one `SolidColorBrush` property write per token |
| Avalonia | free | elements hold brush references |
| **Web** | **0.01 ms median, 0.165 ms first** | three CSS custom properties on `:root` |

The web host wins this row structurally: a CSS custom property *is* the shared reference, so one write on `:root` recolours every element that reads it, and the browser's own style engine does the invalidation. The first flip costs 0.165 ms because it is the first style recalculation; steady state is 0.01 ms.

System tracking is `matchMedia('(prefers-color-scheme: dark)')` with a `change` listener — `prefersColorSchemeDark: false` on this machine at run time. Wired and read, **not** exercised by flipping the OS mid-run, which is the same qualification the OpenSilver record made.

## 3. The project pane — ADR-280 D1's typed artifact view (PASS)

A typed lens over the storage adapter, not a directory listing. This needed a change to the adapter: Phase 4 shipped `list()` flat and named the gap, so `listTree()` was added here, along with nested-path support in `read`/`write`/`delete` (walking and creating intermediate directories). Four nested artifacts were seeded so the lenses are exercised on real nesting rather than on a flat list that happens to have no folders.

```json
"filesInTree": 17, "flatListCount": 13,
"renderedGroups": 7, "openNotStrict": true
```

| Group | Count | Files |
| --- | --- | --- |
| Story | 5 | `fernhill.story`, `measure-1755.story`, `spike-fragment.chord`, `spike-hatch.story`, `spike-import-probe.story` |
| Walkthroughs | 1 | `walkthroughs/wt-01-gates.transcript` |
| Transcript Tests | 1 | `tests/transcripts/rug.transcript` |
| Tree Tests | 1 | `fernhill.tests.json` |
| Assets | 1 | `assets/cover.txt` |
| Web Template | 1 | `browser/index.html` |
| Other | 7 | the rest |

**Open, not strict** — D1's ruling, and the reason `Other` is a group rather than a filter: nothing is hidden. Seventeen files in the tree against thirteen in the flat list is the gap `listTree()` closed, and the seven rendered group headings are read back out of the DOM rather than asserted from the data that produced them.

## 4. R18 — a second window (PARTIAL: the mechanism passes, `window.open` does not)

Two different claims, and they came out differently.

**`window.open` — blocked.**

```json
"windowOpen": { "attempted": true, "opened": false, "blocked": true, "error": null }
```

No exception, no error: the call simply returned `null`. `window.open` needs **transient user activation**, and a page that drives itself has none. This is a real property of the web host, not a spike artifact — a "New Window" menu item clicked by an author *would* carry activation and would work. What it means is that a browser host cannot open a second window on its own initiative (on restore, say, or to reopen the layout an author left), which a native host can. That belongs in the parity column.

**`BroadcastChannel` — PASS.** With a second window opened as an ordinary browser tab (`shell.html?role=second`), a nonce sent from the primary was observed in the second and echoed back:

```json
"secondWindowAnnouncedItself": false,
"echoReceived": true,
"echo": { "from": "second", "nonce": "sv0cw169", "at": 1789440377521 },
"roundTripMs": 252
```

The 252 ms is the primary's own 250 ms poll interval, so the channel itself is effectively immediate. `secondWindowAnnouncedItself: false` is correct and worth reading: the second window's hello fired before the primary existed, which is exactly why the primary polls rather than listening once — a real host needs the same discipline.

The record keeps both readouts: `6-5-second-window.json` (with a second window) and `6-5-second-window-no-second-window.json` (without one, where the echo correctly never arrives).

## 5. R14 — settings across a reload (PASS)

Written on pass 1, read on pass 2 with no write:

```json
"pass": "2", "wroteThisPass": false, "previousFound": true,
"previous": { "lastProject": "fernhill (OPFS)",
              "openDocuments": ["fernhill.story", "fernhill.tests.json"],
              "activeTab": "Testing",
              "writtenAt": "2026-09-15T02:45:22.293Z" },
"survivedReload": true, "matchesWhatPass1Wrote": true
```

`localStorage`, per origin. It also survived the offline run (`settingsSurvived: true` with the server down), which is the case that matters for an IDE reopening after a laptop is closed.

One property worth naming for the decision record: settings live with the **origin**, not with the project. On the folder route that means an author's window layout follows the browser profile rather than the folder — so the same project opened in another browser, or after clearing site data, starts fresh. A native host would keep it beside the project or in the app's own support directory. Neither is wrong; they are different promises.

## 6. What this phase did not establish

- **Offline was not proven for the testing surface or the walker** (§1) — those pages are not precached and were not loaded with the server down.
- **The OS appearance change was not exercised.** `prefers-color-scheme` is wired and read; flipping macOS mid-run was not done, matching the OpenSilver record's own qualification.
- **No screenshot of the shell.** A headless capture races the page's async run and would have shown an empty pane and the pre-flip palette — a misleading picture. The pane's rendering is evidenced instead by a DOM query (`renderedGroups: 7`) and the flip by computed `rgb()` values either side, which are stronger claims than an image.
- **Edge only**, like Phase 5. Service workers, `BroadcastChannel` and CSS custom properties are all long-standing in Safari and Firefox, but that is an expectation, not this phase's measurement.
- **The project pane is a list, not an editor.** Selecting a file does nothing; ADR-280's grouping is what was under test, not the interactions on top of it.

## 7. Nothing in the repository was written

`git status --short branch-stories/fernhill` empty throughout; the tracked `fernhill.tests.json` and the spike fixture copy both still hash `069f424d…fe4de6`. The four seeded artifacts (`walkthroughs/`, `tests/transcripts/`, `assets/`, `browser/`) were written into the **OPFS** store, which no repository path can reach.

## Integration Reality Statement (rule 13a)

**The browser shell: service worker, storage adapter, and the cross-window channel**

- **OWNED**: `app/sw.js` and its precache set; `src/storage.ts`'s adapter, including the `listTree()` and nested-path support added here; `@sharpee/chord`'s compiler (exercised offline); the platform payload built in Phase 5.
- **EXTERNAL**: Edge 153's service-worker, Cache Storage, `BroadcastChannel`, `localStorage`, `matchMedia` and CSS custom-property implementations — the browser, which this repository does not ship.
- **REAL-PATH TEST**: `6-2-offline-capability.json` — recorded **while the dev server was stopped** (connection refused, verified by `curl` before the run and by the page's own unreachability check), with the real compiler compiling fernhill's real story from cache and the real payload and wasm read back at full size. `6-3-appearance-flip.json` — computed `rgb()` values read off a live element either side of the flip, not token strings. `6-4-project-pane.json` — group headings counted out of the DOM after rendering. `6-5-second-window.json` — a nonce sent from one real window and observed in another. `6-6-settings-pass2.json` — read on a load that did not write. No injection, no override, no simulated offline: the server was actually down.
- **STUB JUSTIFICATION**: none. The one stand-in anywhere near this phase is the four seeded nested artifacts, which are fixture data for the grouping logic rather than a replacement for anything — the grouping, the tree walk and the rendering are all the real code. The absent screenshot is a deliberate omission of weak evidence, not a substitution for strong evidence.
