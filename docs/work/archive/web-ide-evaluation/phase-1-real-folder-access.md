# Phase 1 — Real folder access: the kill phase

**Plan**: `docs/work/web-ide-evaluation/plan.md`
**Run**: 2026-09-14/15, session 3b49f8, macOS 26.6.2 (Apple Silicon)
**Spike code**: `/Users/david/repos/spikes/web-ide/app/fsa.html` (the harness) and `serve.mjs` (the recording sink), outside this repository
**Evidence in repo**: `evidence/phase-1/` — ten JSON files, each posted by the page itself at the moment the step ran, plus `edge-reacquire-dialog.png` (David's screenshot of the restart reprompt)

**Verdict: PASS on every sub-deliverable, and the permission story is better than the options document predicted.** The File System Access route opens fernhill's real folder, persists the handle, survives a reload with no prompt at all, survives a full browser restart **once the author takes the persistent grant**, and writes back — verified from outside the browser. Safari and Firefox refuse cleanly rather than partially.

**The product answer in one line: the author is asked twice, ever.** Once when picking the folder, once more at the first restart — where Edge offers "Allow on every visit" — and never again.

## 1. Result, three browsers

| | Safari 26.6.2 | Firefox 155.0.1 | Edge 153.0.4234.32 |
|---|---|---|---|
| `showDirectoryPicker` | **clean `TypeError`** | **clean `TypeError`** | **PASS** — `fernhill`, 11 entries |
| `showOpenFilePicker` | clean `TypeError` | clean `TypeError` | present |
| Handle persisted to IndexedDB | — | — | **PASS** — survives structured clone |
| Reacquire across reload | — | — | **PASS, silent** — `granted`, 6.6 ms, no UI |
| Reacquire across **browser restart** | — | — | **`prompt`** — the grant does not survive by default |
| The restart reprompt | — | — | **one click, folder named** — not a re-pick |
| Restart after "Allow on every visit" | — | — | **PASS, silent** — `granted`, 1.6 ms, no UI |
| Real write, independently verified | — | — | **PASS** — +49 bytes, confirmed on disk |
| OPFS available instead | yes | yes | yes |

## 2. (a) The pick — PASS

`showDirectoryPicker({ id: 'fernhill', mode: 'readwrite' })`, invoked by a real click (the API requires user activation; there is no automated path to this and none was faked). David chose `/Users/david/repos/spikes/web-ide/fixtures/fernhill`.

```json
"granted": true, "name": "fernhill", "kind": "directory",
"permissionAfterPick": "granted", "entryCount": 11,
"entries": [".DS_Store", "WALKTHROUGH.txt", "assets/", "browser/", "chatgpt-review.md",
            "dist/", "fernhill.config.json", "fernhill.recipe.json", "fernhill.story",
            "fernhill.tests.json", "fernhill.world-ignore.json"]
```

The directory enumerates through `handle.entries()` with `kind` distinguishing files from directories — enough for ADR-280 D1's typed artifact tree, with one caveat in §6.

**Cancelling the picker is also clean.** An earlier run where the dialog was dismissed produced `AbortError: Failed to execute 'showDirectoryPicker' on 'Window': The user aborted a request.` — a distinguishable, catchable outcome rather than a hang or a silent null, which is what a real "Open Story" flow needs.

## 3. (b) Persisting the handle — PASS

The `FileSystemDirectoryHandle` was written straight into IndexedDB and read back in the same session: `persistedToIndexedDB: true`, `handleSurvivesStructuredClone: true` (the read-back value is still an instance of `FileSystemDirectoryHandle`, not a stripped object). No serialization format, no path string, no re-derivation — the handle itself is the durable token.

## 4. (c) Reacquisition across a reload — PASS, silent, and better than predicted

**This is the phase's actual subject and the result that matters.** On reload the page read the handle back from IndexedDB and called `queryPermission({ mode: 'readwrite' })` before touching anything else:

```json
"storedHandle": true, "name": "fernhill",
"permissionWithoutPrompting": "granted", "ms": 6.6,
"reading": "silent reacquire — the grant survived"
```

Then `requestPermission({ mode: 'readwrite' })` on the same handle:

```json
"permissionBefore": "granted", "permissionAfter": "granted", "ms": 0.2
```

**David's own observation, which is the evidence here and not the timing**: no permission UI appeared at this step — only the page itself. The harness times the call because a prompt cannot be observed from script, but a 0.2 ms resolution is a proxy and the human watching is the measurement. The two agree.

The options doc's §2 framing allowed for "a one-click reprompt" as the likely cost of reopening a project. **On Edge 153 the cost is zero.** An author who opens Chord Writer, picks their story folder once, and returns later gets their project back with no dialog — which is materially better for the product than the write-up assumed, and it is the single most encouraging result in this evaluation so far.

Two honest limits on that claim: this was one reload inside one browser session, and the profile was freshly created for this run. §4b takes the harder case — a full restart — and finds a different answer.

## 4b. Across a browser restart — a reprompt by default, silent once made persistent

A reload is not a restart, and the plan asked for both. Edge was quit entirely and relaunched against the same profile. The handle came back from IndexedDB intact — but the permission did not:

```json
"storedHandle": true, "name": "fernhill",
"permissionWithoutPrompting": "prompt", "ms": 3.4,
"reading": "grant did NOT survive; a reprompt is required"
```

**So the silent result in §4 is a same-session property, not a durable one.** Recorded plainly because the difference is the whole product question: a grant that dies on restart turns "open Chord Writer in the morning" back into a permission flow.

**What the reprompt actually costs: one click, and the folder is named for you.** `requestPermission` produced this dialog (`evidence/phase-1/edge-reacquire-dialog.png`):

> **http://127.0.0.1:5180 wants to** — View and edit files from the last time you visited this site:
> 📁 fernhill  📁 fernhill
> [ Allow this time ] [ Allow on every visit ] [ Don't allow ]

This is the good case, not the bad one. The author is **not** thrown back into the file picker to navigate and re-choose; Edge remembers the folder and asks only for consent to resume. `prompt → granted` on the click (`ms: 63604.9` — that is the dialog sitting open while it was screenshotted, i.e. human time, and it is exactly what the harness's timing heuristic is for: the number is meaningless as a measurement and conclusive as a signal that a dialog was shown).

**And "Allow on every visit" makes even that go away.** Edge was quit and relaunched a second time, with no click available to the page and none made:

```json
"storedHandle": true, "name": "fernhill",
"permissionWithoutPrompting": "granted", "ms": 1.6,
"reading": "silent reacquire — the grant survived"
```

So the full permission ladder on Edge 153 is: **pick once (one dialog) → first restart (one dialog, folder named, with a persistent option) → every restart thereafter, silent.** For a tool an author opens daily, that is close to the best outcome the API allows, and it is better than the options doc's "one-click reprompt" framing, which implicitly assumed the reprompt recurs.

**One observation not explained**: the dialog lists **fernhill twice**. The folder was picked twice during the earlier run, so the most plausible cause is one entry per grant for the same path rather than a defect. Whether a single-pick flow shows a single entry is untested. It matters only cosmetically, but a list that accumulates a row per pick would look wrong to an author who has re-opened their story a few times, so it is worth a glance during any real implementation.

## 5. (d) The write — PASS, verified from outside the browser

A `## ` comment line appended to `fernhill.story` through `createWritable()`, then read back twice: once by the page through a **freshly obtained** `getFileHandle` (not the handle it wrote through), and once by this session from the shell, with the browser's involvement ended.

Page:

```json
"file": "fernhill.story", "bytesBefore": 30509, "bytesAfter": 30558,
"appended": 49, "readBackMatches": true,
"marker": "## phase-1 write probe 2026-09-15T00:09:20.675Z"
```

Shell, independently:

```
$ wc -c .../fixtures/fernhill/fernhill.story
   30608          # 30559 before + 49 appended
$ tail -1 .../fixtures/fernhill/fernhill.story
## phase-1 write probe 2026-09-15T00:09:20.675Z
```

The file was then restored from the tracked original and the restore verified by hash:

```
$ md5 -q .../fixtures/fernhill/fernhill.story   → 754eff222b7bcbfc7f2d3ab71884c79d   (baseline, matches)
$ git status --short branch-stories/fernhill    → (empty)
```

## 6. Two findings the harness surfaced

**`File.text().length` is UTF-16 code units, not bytes** — and the gap is not academic. The page reported `bytesBefore: 30509` for a file that is 30,559 bytes on disk. fernhill contains 25 non-ASCII characters, each three bytes in UTF-8, so the counts diverge by exactly 50. Nothing here depended on it, but anything that tracks file size, computes a diff offset, reports "bytes saved", or compares against a stat from another source will be wrong in a way that only shows up on stories with typographic punctuation — which is to say, on real prose. The field in this phase's own JSON is misnamed for exactly this reason and is left as written rather than quietly corrected, since the misnaming is the finding.

**A real folder carries OS noise the project pane must filter.** `.DS_Store` appears in the enumeration alongside the story's own files. The macOS app's typed artifact tree (ADR-280 D1) reads a real folder through Foundation and gets the same problem; a web project pane will need the same filtering, and it is worth noting that the browser hands over the directory exactly as it is rather than pre-cleaned.

## 7. What this phase does not establish

- **What "Allow this time" costs on the following restart.** The ladder in §4b was measured along the persistent branch. Whether the non-persistent choice reprompts once per restart forever — almost certainly yes — was not exercised, and would need the profile wiped and the run repeated.
- **Whether the duplicate folder entry in the reprompt dialog is an artifact of the double-pick** (§4b).
- **Anything about ungoogled-chromium**, which is offered but not installed; a second Chromium column would show whether the silent reacquire is stock-Chromium behavior or Edge's.
- **Anything about Chrome**, which David does not use and which was not installed.
- **Behavior on a folder outside the spike tree** — in particular `~/Documents/<Story Title>/`, which is ADR-280 A1's actual promise. This phase pointed the picker at `/Users/david/repos/spikes/...`; whether a Documents-rooted folder prompts differently (macOS's own TCC layer sits under Documents, Desktop and Downloads) is untested and is a real candidate for a different answer.
- **Scale.** Eleven entries, one write, one file. Nothing here says what a folder of hundreds of assets costs to enumerate, or what a save of every open document costs.
- **A permission grant entangled with real browsing state.** The profile was disposable and freshly wiped before the run, which makes the measurement clean but also makes it a best case.

## 8. Exit state

The plan's exit condition — "a named PASS/FAIL per browser for open, persist, reacquire, and write, dated and with the exact version from Phase 0's inventory" — is met for all four, in all three browsers, with the Chromium tier passing every one. The plan's further question, "whether it differs session to session," is answered in §4b: it does, and the difference is one dialog with a persistent opt-out.

The kill question is answered in O1's favour on this machine: **the real-folder promise holds, and the permission cost is two dialogs across the life of a project rather than one per session.** The evaluation proceeds to Phase 2 with that promise proven rather than assumed, and with the non-Chromium tier's fallback (OPFS, confirmed present in all three browsers) already identified as the O2 route Phase 4 builds.
