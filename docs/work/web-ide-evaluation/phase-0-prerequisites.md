# Phase 0 — Prerequisites, browser matrix, and scaffold

**Plan**: `docs/work/web-ide-evaluation/plan.md`
**Run**: 2026-09-14, session 3b49f8, macOS 26.6.2 (build 25G83, Apple Silicon)
**Spike code**: `/Users/david/repos/spikes/web-ide/` (outside this repository, per the plan's evidence discipline)
**Evidence in repo**: `evidence/phase-0-probe-safari-26.6.2.json`, `evidence/phase-0-probe-firefox-155.0.1.json`, `evidence/phase-0-probe-edge-153.0.4234.32.json`

**Verdict: PASS on all four deliverables.** The inventory found **no Chromium-family browser installed on this Mac**, which blocked Phase 1's kill test — the File System Access API is absent from both browsers that were installed. David chose Edge (2026-09-14) and it was installed the same session; Edge 153 exposes the API and **Phase 1 is unblocked**. The block and its resolution are both recorded in §2 rather than tidied away, because the browser matrix is itself evidence for this evaluation's Web column.

## 1. Browser inventory — what is actually installed, 2026-09-14

Read from the installed bundles themselves (`mdls -name kMDItemVersion`), not from a compatibility table:

| Browser | Installed | Version | Engine |
| --- | --- | --- | --- |
| Safari | yes | **26.6.2** | WebKit 605.1.15 |
| Firefox | yes | **155.0.1** | Gecko (rv:155.0) |
| Microsoft Edge | **installed this session** | **153.0.4234.32** (Chromium 153) | Blink |
| Google Chrome | no | — | — |
| Any other Chromium (Chromium, Brave, Vivaldi, Opera, Arc) | no | — | — |

Edge was not present at the start of this phase. It was installed at David's direction once the gap below surfaced (`brew install --cask microsoft-edge`, cask `153.0.4234.32`, auto-updating); David does not use Chrome. Ungoogled-chromium was offered as a non-corporate cross-check and is not installed.

Checked three ways so the absence is a fact rather than an assumption: `ls /Applications` filtered for every browser name; `ls ~/Applications`; and a Spotlight sweep (`mdfind "kMDItemKind == 'Application'"`) filtered the same way. The only hits outside `/Applications` were unrelated directories in `OneDriveArchive` whose names happen to contain "Service" or "App". `sw_vers` → `macOS 26.6.2`, build `25G83`.

**This supersedes the options doc's caniuse-sourced table for this evaluation's own claims**, as the plan required. The options doc's §2 fork assumed a Chromium tier would be exercisable here; at the start of this phase it was not, which is itself worth knowing — the machine this evaluation runs on was not already set up to favour the shape being evaluated.

## 2. The gap that blocked Phase 1, and its resolution

Phase 1 is the kill phase, and its subject is the File System Access API — `showDirectoryPicker()`, a persisted `FileSystemDirectoryHandle`, reacquisition across a reload, and a real write. **Neither browser installed at the time exposed it**, and the Edge installed later does. From the probe page's own readout in each browser (§4), not from documentation:

| Capability | Safari 26.6.2 | Firefox 155.0.1 | Edge 153.0.4234.32 |
| --- | --- | --- | --- |
| `showDirectoryPicker` (File System Access) | **false** | **false** | **true** |
| `showOpenFilePicker` | **false** | **false** | **true** |
| `navigator.storage.getDirectory` (OPFS) | **true** | **true** | **true** |
| `FileSystemWritableFileStream` | **true** | **true** | **true** |
| `FileSystemFileHandle.prototype.createSyncAccessHandle` | **false** | **false** | **false** |
| `IndexedDB` | true | true | true |
| `serviceWorker` | true | true | true |
| `BroadcastChannel` | true | true | true |
| `SharedArrayBuffer` | true | true | true |
| `crossOriginIsolated` | **true** | **true** | **true** |
| Secure context on `http://127.0.0.1` | true | true | true |

So the options doc's §2 fork — "the File System Access API is Chromium-only" — is **confirmed firsthand on this machine, in both directions**: absent in the two non-Chromium browsers, present in the Chromium one. That is a cleaner result than a caniuse citation, and it is the evidence the decision record's Web column needs for the browser-matrix row (options doc §7 Q2).

At the time this phase ran, though, only the two negative results existed, and that blocked the kill phase outright. What follows is the reasoning applied then; it is kept rather than rewritten, because the same judgment will be needed the next time a phase stalls on a missing prerequisite.

**Three things follow, and they should not be blurred.**

**This is not a kill of O1.** The plan's Phase 1 exit state reserves that verdict for "no Chromium browser on this machine can complete the round trip at all." No Chromium browser being *installed* is a different fact from this Mac being unable to run one, and treating the two as the same would kill a candidate on a missing `.app` rather than on evidence. Installing Chrome or Edge is ordinary, reversible, and takes minutes.

**It is David's call, not this phase's.** Installing a browser modifies his machine and the choice between Chrome, Edge, and a de-Googled Chromium is his. Per rule 13a the phase records the gap rather than substituting around it: there is no stub of `showDirectoryPicker` in this spike and will not be one.

**Resolved the same session.** David ruled Edge, noting he does not use Chrome and would prefer a non-corporate Chromium if one were better. Edge was installed and probed; `showDirectoryPicker` and `showOpenFilePicker` are both present (third column above, `evidence/phase-0-probe-edge-153.0.4234.32.json`). **Phase 1 is unblocked and its kill test can run as written.** Ungoogled-chromium (BSD-3, 691★, `152.0.7977.82-1.1` pushed 2026-09-06, arm64 dmg in Homebrew) was recommended as a *cross-check* rather than as Edge's replacement, on the ground that it patches web-platform behavior in places and not only Google services — so a permission-persistence result measured only there would be a result about the fork. It is not installed; the offer stands and Phase 1 can add its column later without redoing anything.

**Edge was probed against a throwaway profile** (`--user-data-dir=.../out/edge-profile --no-first-run --no-default-browser-check`), both because its first-run wizard swallows a URL passed to a cold launch and so that nothing in this evaluation touches David's own Edge profile. Phase 1 should keep that discipline: a permission grant recorded against a disposable profile is a cleaner measurement than one entangled with real browsing state.

**Everything downstream of storage is unaffected and already reachable.** OPFS — the O2 half of the scope ruling, and the tier that serves every non-Chromium browser — is present and writable in all three browsers, so Phase 4's `OPFSAdapter` can be built and proven here today. Phases 2, 3, 5 and 6 are about compose, play, the test tree, bundling and the shell; none of them needs the folder route, and each can run against the OPFS adapter. **The plan's phase order is what stalls, not the plan.**

Two smaller readings worth recording:

- **`createSyncAccessHandle` is false in all three**, checked on the main thread. That is the synchronous OPFS handle Phase 4's adapter and Phase 5's virtual filesystem would want, and in several engines it is exposed only inside a Worker. This probe did not run in a Worker, so the honest statement is "absent on the main thread in all three, worker context unchecked" — a Phase 4 question, flagged rather than concluded. That it is uniformly absent across three unrelated engines makes the worker-only explanation more likely than a per-engine gap, but "more likely" is not a measurement.
- **`crossOriginIsolated` is true in all three**, because the scaffold sends COOP/COEP from the start (§3). That is the precondition for `SharedArrayBuffer`, which `esbuild-wasm`'s threaded build wants — so Phase 5 does not inherit a late discovery that the headers were missing.

## 3. The scaffold — PASS

`/Users/david/repos/spikes/web-ide/`, no framework, no dependencies, no build step:

- `app/index.html` — the page, and a capability probe that renders its readout and posts it to the server's sink.
- `serve.mjs` — a ~60-line Node static server over `node:http`, serving `app/` on `127.0.0.1`. It sends `cross-origin-opener-policy: same-origin` and `cross-origin-embedder-policy: require-corp` from the first response, and `cache-control: no-store`.

**It is dev-loop plumbing, not O3.** It answers no compose, build, play, or test request — every one of those runs in the page in later phases — and it exists only because a browser will not grant File System Access or a persistent origin to a `file://` page. The plan's Phase 0 text makes this distinction explicitly and the file's own header comment repeats it, so a later reader cannot mistake it for the companion process David ruled out of scope.

```
$ node serve.mjs 5180
serving /Users/david/repos/spikes/web-ide/app at http://127.0.0.1:5180/

$ curl -s -o /dev/null -w "status=%{http_code} bytes=%{size_download} type=%{content_type}" http://127.0.0.1:5180/
status=200 bytes=2479 type=text/html; charset=utf-8

$ curl -s -D - -o /dev/null http://127.0.0.1:5180/ | grep -i -E 'cross-origin|cache-control'
cache-control: no-store
cross-origin-opener-policy: same-origin
cross-origin-embedder-policy: require-corp
```

Traversal refused in all three forms, with `--path-as-is` so the dot segments actually reach the server rather than being normalized away by curl:

```
$ curl --path-as-is -o /dev/null -w "%{http_code}" http://127.0.0.1:5180/../serve.mjs                        → 404
$ curl --path-as-is -o /dev/null -w "%{http_code}" http://127.0.0.1:5180/../fixtures/fernhill/fernhill.story → 404
$ curl --path-as-is -o /dev/null -w "%{http_code}" http://127.0.0.1:5180/%2e%2e/serve.mjs                    → 404
```

## 4. The probe sink — why the readout is evidence and not a transcription

The page posts its capability object to `POST /probe`, which the server writes to `out/probe-<ISO timestamp>.json`. Both files in §2 are those writes, copied into `evidence/` unedited. This matters for the plan's discipline: the alternative was screenshotting a browser window and retyping booleans, which is exactly the "read off a table" failure mode the plan's rule-13a section forbids.

Loaded in each browser by `open -a Safari` / `open -a Firefox` against `http://127.0.0.1:5180/`, 2026-09-14 20:06 UTC. The user-agent string in each file is the browser's own and matches the bundle version in §1.

## 5. The iCloud question — verified, and the 2026-08-13 flag is reaffirmed

Brainstorm §4.1 flagged "no third-party web API for iCloud Drive" on 2026-08-13 and it was never verified. Checked directly against Apple's own documentation today rather than re-cited:

**CloudKit web services and CloudKit JS give a web app access to the app's own CloudKit container — records, zones, subscriptions, and assets — and nothing else.** Apple's own framing: *"You use the CloudKit native framework to take your app's existing data and store it in the cloud… Then you can use CloudKit web services or CloudKit JS to provide a web interface for users to access the same data as your app."* The service requires the container's schema to exist already, which is what makes it app-scoped by construction. There is no iCloud Drive surface in it, no ubiquity container, no document storage.

Apple's iCloud developer page lists the technologies offered — CloudKit, Telemetry, Logs, Dashboards, Identity & Trust, Push Notifications — and **iCloud Drive document access is not among them**. Programmatic access to a user's iCloud Drive files is native-framework territory: `FileManager`'s ubiquity container, the document picker, and the FileProvider extension API (introduced WWDC 2021) that third-party providers implement to appear *inside* Files and Finder. None of those has a web counterpart, and iCloud does not speak WebDAV natively.

**Finding: reaffirmed, with a current source and a date.** The flag's status changes from "never verified" to "verified 2026-09-14." The consequence for this evaluation is narrow and worth stating plainly — an iCloud adapter is not a cost this shape can choose to pay later; it does not exist as an option at all. Phase 4's cloud-adapter boundary paragraph names Google Drive (`drive.file`) and OneDrive/Graph for exactly this reason, and iCloud's absence from that list is now a documented fact rather than an omission.

Sources, read 2026-09-14: [CloudKit Web Services Reference](https://developer.apple.com/library/archive/documentation/DataManagement/Conceptual/CloudKitWebServicesReference/index.html), [CloudKit JS](https://developer.apple.com/documentation/cloudkitjs), [Apple's iCloud for developers](https://developer.apple.com/icloud/), [Allowing Users to Manage Data Stored in iCloud](https://developer.apple.com/icloud/allowing-users-to-manage-data/).

## 6. The fernhill fixture — PASS

```
$ cp -R /Users/david/repos/sharpee/branch-stories/fernhill /Users/david/repos/spikes/web-ide/fixtures/fernhill
$ du -sh /Users/david/repos/spikes/web-ide/fixtures/fernhill
5.3M
  assets  browser  chatgpt-review.md  dist  fernhill.config.json  fernhill.recipe.json
  fernhill.story  fernhill.tests.json  fernhill.world-ignore.json  WALKTHROUGH.txt
```

`fernhill.tests.json` (the 31-card tree document both prior evaluations used) and the already-built `dist/` bundle both came across, so Phases 2, 3 and 5 have what they need.

```
$ git status --short branch-stories/fernhill
(empty)
```

The tracked story is untouched and stays that way.

## 7. Exit state

The plan's four exit conditions:

1. **Browser versions known and recorded** — yes. The answer initially removed the plan's critical path and then restored it within the same session (§2); the final matrix is Safari 26.6.2, Firefox 155.0.1, Edge 153.0.4234.32.
2. **Scaffold serves a blank page over `http://localhost`, not `file://`** — yes, with COOP/COEP and traversal refusal proven (§3).
3. **The iCloud finding closed** — yes, reaffirmed with a current source, ending its "never verified" status (§5).
4. **fernhill's copy exists and is never the tracked one** — yes (§6).

Phase 0 is complete and **Phase 1 is unblocked** — Edge 153 exposes the File System Access API, so the kill phase's subject can be exercised as the plan wrote it, against a disposable Edge profile. Phases 2–6 were never blocked; OPFS is present and writable in all three browsers.

## 8. What this phase does not establish

- **Anything about the File System Access API's real behavior** — permission persistence, reacquisition across reloads, the shape of the reprompt. Phase 0 established only that `showDirectoryPicker` and `showOpenFilePicker` are *defined* in Edge; whether a handle survives a reload, and what UI the reacquire costs, is Phase 1's whole subject and it has not run.
- **Anything about ungoogled-chromium**, which is not installed.
- **Whether `createSyncAccessHandle` exists in a Worker** in either installed browser (§2). Main thread only here.
- **Any compile, play, test, bundle, or shell claim.** The scaffold renders a capability probe and nothing else; the `@sharpee/*` packages have not been loaded in a page yet.
- **That OPFS actually works**, as opposed to being present on the API surface. Phase 4 writes and reads through it; this phase only observed that `navigator.storage.getDirectory` and `FileSystemWritableFileStream` are defined.
