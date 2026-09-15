# Phase 4 — Storage adapters: the O1+O2 hybrid this evaluation actually builds

**Plan**: `docs/work/web-ide-evaluation/plan.md`
**Run**: 2026-09-15, session 989482, macOS 26.6.2 — Edge 153.0.4234.32, Safari 26.6.2, Firefox 155.0
**Spike code**: `/Users/david/repos/spikes/web-ide/src/{storage,phase4}.ts`, `app/phase4.html`, `make-fixture-zip.mjs` (outside this repository)
**Evidence in repo**: `evidence/phase-4/` — 23 JSON readouts, three browsers, each posted by the page itself

**Verdict: PASS on the interface, the import/export door, the selection rule, and the cross-adapter exit state — with one leg owed.** The `open/list/read/write/delete/watch` interface works, and the same compose → play → test call path Phases 2 and 3 use runs over it **unchanged and with identical results in all three browsers**, including the two that have no folder access at all. What is owed: the interface has not been exercised at these call sites over the *folder* adapter, because re-granting a lost handle needs a user gesture (§8).

The unplanned dividend: **the full ADR-307 round trip now reproduces identically on three engines** — Chromium, WebKit and Gecko — each writing a document byte-for-byte identical to the Avalonia host's (§5).

## 1. The interface, and a seam thinner than the brainstorm assumed

`src/storage.ts` implements brainstorm §5's shape:

```ts
interface StorageAdapter {
  kind: 'folder' | 'opfs';
  name: string;
  externallyMutable: boolean;
  list(): Promise<StoryFile[]>;
  read(name): Promise<string | null>;
  readBytes(name): Promise<Uint8Array | null>;
  write(name, data): Promise<void>;
  delete(name): Promise<boolean>;
  watch(names, onChange, intervalMs?): () => void;
}
```

**The finding worth carrying out of this phase: OPFS and the File System Access API hand back the *same* `FileSystemDirectoryHandle` interface.** `getFileHandle`, `createWritable`, `removeEntry`, `entries()` — identical on both. So `read`, `write`, `list` and `delete` are **one** implementation over both routes (`DirectoryAdapter`), and the two adapters are thin subclasses.

That is a smaller abstraction than the brainstorm anticipated, and it is a *good* result: the less the seam has to translate, the less there is to drift. Three things genuinely differ, and those are exactly what the subclasses carry:

| | `LocalFolderAdapter` | `OPFSAdapter` |
| --- | --- | --- |
| How the root handle is acquired | a picked handle, persisted in IndexedDB — needs a user gesture, once | `navigator.storage.getDirectory()` — no gesture, ever |
| Who else can change the bytes (`externallyMutable`) | **true** — an editor, Finder, a git checkout | **false** — only this origin |
| Needs an import/export door | no, the files are the author's already | **yes** — no picker means a project arrives and leaves as an archive |

Per-browser interface results (`4-3-interface-*.json`) — **identical in all three**:

```
write:  readBack "one"                                    ok
watch:  fired after 150 ms, read-back matches the change  ok
delete: deleted true, deleted-again false, read null      ok
list:   10 before, 10 after (the probe file cleaned up)   ok
```

`delete` returning `false` rather than throwing on a missing entry is deliberate: "it is not there" is an answer, not a failure.

## 2. The selection rule (deliverable 3)

**The author's real folder whenever this browser can reach it without asking; otherwise the origin's own store.** Automatic, author-*visible*, author-*overridable* — which is not the same as author-decided.

It is automatic because the alternative is asking an author to choose between "your folder" and a phrase like "origin private file system" before they have written anything, which is a question they cannot answer. `kind` is reported in every readout (and would be in the UI); `selectAdapter(label, prefer)` lets a caller force either route.

What is deliberately *not* in the rule is a picker prompt. `showDirectoryPicker()` requires a user gesture, so **a page cannot fall back to the folder route on its own** — that route is available only where a grant already exists. That asymmetry is why OPFS is the default rather than the fallback, and it is a property of the platform, not a design preference.

The three browsers produce three different reasons for the same outcome, which is the rule working rather than a coincidence (`4-1-selection-*.json`):

| Browser | Chosen | Reason recorded |
| --- | --- | --- |
| Edge 153 | `opfs` | "no stored handle for this origin (a picker needs a user gesture)" |
| Safari 26.6.2 | `opfs` | "this browser has no showDirectoryPicker" |
| Firefox 155 | `opfs` | "this browser has no showDirectoryPicker" |

And a forced route that cannot be reached is **refused, never silently substituted** (`4-1-selection-edge-forced-folder.json`):

```json
"requested": "folder",
"refused": "the folder route was required but is unavailable — no stored handle
            for this origin (a picker needs a user gesture)"
```

Silently handing back a different store under a caller that named one is how an author ends up editing a copy they did not know existed.

## 3. OPFS as a genuine working copy — the import and export doors

The plan asked for OPFS proven as a working copy, "not just a fallback": imported from a zip, edited, exported back to a zip.

**Import** (`4-2-import-*.json`). A real archive is built from the fixture by `make-fixture-zip.mjs` (stored entries, fixed mtime, so it is reproducible: `sha256 e08c6624d240d0fd…`, 10 entries, 127,511 bytes). The page fetches it, **wipes the OPFS project directory** so the import starts empty, unzips with `fflate`, writes every entry through the adapter, then lists the store and hashes every file back:

| Browser | Entries in archive | Files after import | Import ms | Per-file identical |
| --- | --- | --- | --- | --- |
| Edge | 10 | 10 | 11 | **true** |
| Safari | 10 | 10 | 18 | **true** |
| Firefox | 10 | 10 | 20 | **true** |

`mismatches: []` in all three.

**Export** (`4-5-export-*.json`). The store is listed, every file read back as bytes, zipped, and then — before the page claims anything — **re-opened through the unzipper in the page** and re-hashed. All three browsers produce the *same* archive: 10 files, 127,511 bytes, `sha256 103391cba447e558…`, `reopensIdentical: true`.

The Edge export's bytes ride the record as base64, so the evidence carries the artifact rather than a claim about it. Decoded and unzipped **outside the browser** in Node, all ten files match the original fixture hash for hash:

```
chatgpt-review.md          12781  8b1e2f3e49111ba7
fernhill.config.json          69  a2264711a5693cb5
fernhill.recipe.json        1110  549adad8d9007be3
fernhill.story             30559  c848f271acb70231
fernhill.tests.json        21329  069f424df29560fb
fernhill.world-ignore.json   161  f54ed4fc1290afc0
measure-1755.story         52036  72cd60f02bde52fe
spike-fragment.chord         277  da1b328deac88523
spike-import-probe.story     435  853177cf66f3eaba
WALKTHROUGH.txt             7586  a7e8c149bac41701
```

The export archive is **not byte-identical to the import archive** (`103391cb…` vs `e08c6624…`) and should not be: the entries come back in the store's listing order rather than the source order. Every file's bytes are identical, which is the claim that matters; the archive hash is not a meaningful invariant and is not offered as one.

One honest note on the door itself: a real download needs a user gesture, so the export leaves this page through the evidence sink rather than a save dialog. The zipping, the round trip and the byte comparison are real; only the last inch — handing the file to the author — is a click this spike does not have.

## 4. The exit state: the same call path over the adapter (deliverable 1's real test)

The plan's exit state is the honest test of an abstraction: *the same compose/play/test code path exercised against the adapter, not one adapter with the other stubbed out.* `4-4-callpath-*.json` runs exactly Phases 2 and 3's calls, reading through the adapter:

| | Edge 153 | Safari 26.6.2 | Firefox 155 |
| --- | --- | --- | --- |
| **compose** (`@sharpee/chord`) | 19.1 ms, 114,170-byte IR | 17.4 ms | 14.9 ms |
| **play** (real engine, typed `look`) | 66 entities, opens at Iron Gates | 66, true | 66, true |
| **test** (`runTreeDocument`) | 11 lines, 222 cmd / 85 authored, **all passing** | identical | identical |
| matches the Node baseline | **true** | **true** | **true** |

The Node baseline is `./sharpee test branch-stories/fernhill/fernhill.story --tree` (11 lines, 222 commands, 85 authored, all passing). **Three browser engines and the Node CLI agree exactly.**

Note what the "play" row is and is not: a real `assembleGame` engine executing a real typed turn, with no client DOM. The *full* client round trip — surface, cards, dialogs — is §5.

## 5. The ADR-307 round trip on three engines

Phase 3's `testing.html` was loaded unchanged in Safari and Firefox. Both reproduce Phase 3's Edge result **exactly**:

| | Edge 153 | Safari 26.6.2 | Firefox 155 |
| --- | --- | --- | --- |
| Delivered records | **274** | **274** | **274** |
| Turn records / fences / `forkBoot`s | 263 / 11 / 11 | 263 / 11 / 11 | 263 / 11 / 11 |
| Cards in → out | 86 → 87 (31 → 32 top level) | same | same |
| New card | `{"command":"inventory","skip":true,"type":"turn"}` | same | same |
| Written document | 21,412 chars, read back identical | same | same |
| Replay / total | 503 ms / 2.56 s | 504 ms / 3.46 s | 507 ms / 3.56 s |

So the 274 arithmetic Phase 3 derived (222 walker commands + 11 `restart` turns + 30 for the final active-line replay = 263 turns, plus 11 fences) is **not a Chromium artifact** — it holds on WebKit and Gecko too, and all three write a document byte-for-byte identical to the one the Avalonia host wrote. That is four independent hosts now agreeing on the output of this round trip.

Replay time is within 4 ms across the three engines; the spread is all in the surface bundle's load (1.90 / 2.78 / 2.90 s), which is a 122 KB script and a first-load cost, not a per-turn one.

## 6. `watch`: no notification API anywhere, and two different meanings

Neither route has a change-notification API — not the File System Access API, not OPFS — so `watch` polls size and mtime, at 750 ms by default, and the interface says so rather than implying an event source it does not have. It fired within 150 ms of a write in all three browsers.

The important part is that the same method means two different things:

- On the **folder** route (`externallyMutable: true`) polling can see an edit made in a text editor, a `git checkout`, or Finder. That is what an IDE actually wants from `watch`.
- On the **OPFS** route (`externallyMutable: false`) it can only ever observe this page's own writes, because no one else can reach the store.

A caller asking "did someone else change this file?" is asking a question only one route can answer, which is why `externallyMutable` is on the interface rather than left for a caller to infer from `kind`.

This confirms firsthand the "no change-notification API" entry the OpenSilver parity table carried as a host finding.

## 7. The cloud-adapter boundary (deliverable 4)

The options doc ruled this out of spike scope in its own words — "the OAuth work is not a spike question; it is known cost" — and this phase respects that rather than re-litigating it with a partial implementation. What the boundary *is*, stated so the decision record can price it:

A cloud adapter is not a fourth `DirectoryAdapter`. Everything §1 shares between the two live routes comes from `FileSystemDirectoryHandle`, and no cloud API hands you one. A Drive or OneDrive adapter implements the **interface**, not the base class, and takes on four things neither local route has: an **identity** (a sign-in the author must complete before any file is reachable), a **token lifecycle** (browser-only clients get short-lived access tokens and must renew silently; a durable refresh token is generally a backend's privilege, and this evaluation's scope ruling forbids a backend), **file identity by opaque id rather than by name** (so the adapter needs a name↔id map that local routes get for free), and **latency and failure as normal conditions** (every `read` becomes a network call that can be slow, rate-limited, or offline — which the compose-on-every-keystroke path in Phase 2 would feel immediately).

The scope-narrowing choice that makes it tractable is worth naming now: Google's `drive.file`-style per-file scope, where the app sees only files the author created in it or explicitly opened, keeps the adapter out of full-drive-access territory and its review burden. That shape is the right target, and the specific scope names, review requirements and token lifetimes must be verified against current provider documentation at the time it is built — they are the kind of fact that moves, and nothing in this record checked them.

**Not built, and deliberately: this phase implemented zero lines of cloud adapter.** A half-built OAuth flow would have produced a number nobody could trust, and the scope ruling already said so.

## 8. What this phase did not prove

**The folder adapter was not exercised at these call sites.** Phase 3 found the stored handle gone (`persisted: false`, the IndexedDB record vanished while the database survived — #460), and `showDirectoryPicker()` needs a user gesture, so a self-driving page cannot restore it. Every run in this phase therefore took the OPFS route, which is exactly what the plan asked for in *Safari and Firefox* and is a substitution in *Edge*.

The folder adapter is not unexercised code: Phases 1 and 2 read fernhill's real `.story` through that handle and Phase 1 wrote through it and verified the result from outside the browser (30,608 = 30,559 + 49 bytes). What has not happened is that route behind *this* interface at *these* call sites — `list`, `delete`, `watch` against a real directory, and an `externallyMutable: true` watch actually observing an edit made outside the browser, which is the one behavior OPFS can never demonstrate.

Closing it is one click: `testing.html` carries a **Use real folder…** button, and `phase4.html?prefer=folder` then runs this phase's whole exercise on the real directory. Until then, this record does not claim the folder route at these call sites, and the parity column will say so.

Also not done: `list` returns files only, not subdirectories — fernhill's `assets/` and `browser/` subtrees are invisible to it. Every consumer so far reads flat story files, so nothing needed it; a project browser would.

## 9. Nothing in the repository was written

`git status --short branch-stories/fernhill` empty throughout. The tracked `fernhill.tests.json` and the spike fixture copy both still hash `069f424d…fe4de6`. Every write in this phase went to the origin private file system, which no repository path can reach; the fixture was read only, through the dev server's read-only `/fixture/` view and the reproducible archive built from it.

## Integration Reality Statement (rule 13a)

**The storage adapter over the File System Access API and OPFS**

- **OWNED**: `src/storage.ts`'s interface and both adapters; the import/export door (`fflate`, bundled from this repository's own `node_modules`); and the consumers exercised over it — `@sharpee/chord`'s compiler, `@sharpee/bootstrap`'s `assembleGame`, `@sharpee/story-loader`, `@sharpee/branch-tester`'s `runTreeDocument`, `@sharpee/platform-browser`'s client, and the IDE's shipped `testing-surface` bundle.
- **EXTERNAL**: the three browsers' OPFS, File System Access and IndexedDB implementations — Edge 153, Safari 26.6.2, Firefox 155 — which this repository does not ship.
- **REAL-PATH TEST**: `4-3-interface-*.json` (list/read/write/delete/watch against real OPFS directories in three browsers, each assertion on observed state — a read-back, a fired callback, a re-read after delete); `4-2-import-*.json` and `4-5-export-*.json` (a real archive in, per-file hashes out, the export re-opened in the page **and** decoded and unzipped outside the browser in Node); `4-4-callpath-*.json` (compose, a real engine turn, and the real tree walker over the adapter, matching the Node CLI exactly in all three browsers); `4-6-roundtrip-{safari,firefox}*.json` (the full client-and-surface round trip). No injection, no override, no mock of OPFS, of a handle, or of the bundler.
- **STUB JUSTIFICATION**: none for the OPFS route — it is the real API throughout. The `/fixture/` HTTP view and the pre-built archive are the *source* of the imported bytes, not a stand-in for the store: an author would supply the same archive from a download or a drop. The **folder route is the gap and it is stated as one** (§8): it is not stubbed here, it is *unexercised at these call sites*, and this record claims nothing about it that Phases 1–2 did not measure directly. The three node-builtin shims from Phase 3 (`fs`, `module`, a narrow `@sharpee/transcript-tester` barrel) remain in force and remain unreached — the `fs` shim throws by name and never fired across the tree runs in all three browsers.
