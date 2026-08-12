# Chord Writer notarization: the hang, and what 21 submissions proved

**Status**: unresolved, and there are **two independent triggers**.

1. **Vendored toolchain** (§1–§5). Toolchain-bearing bundles submitted through
   `package.sh`'s CLI path never return a verdict — no Accepted, no Invalid, no
   log, no timeout. The same app without the toolchain clears in 31 seconds.
2. **The x86_64 slice** (§5a, isolated 2026-08-12). A universal
   (`x86_64 arm64`) build hangs the same way; `lipo -thin arm64` on the very
   same export clears in ~30 seconds. This one is *not* about the toolchain —
   neither bundle carried one — and it is what currently blocks Intel support.

Together they mean the only shippable Chord Writer today is **arm64 and
toolchain-less**.

**Provenance**: consolidated 2026-08-12 from four session summaries
(`docs/context/session-20260810-1535-*`, `session-20260810-2232-*`,
`session-20260811-1540-*`, `session-20260812-0152-*`). Submission ids, fixture
names, creation timestamps, and current statuses were **re-verified first-hand**
against `xcrun notarytool history` at `2026-08-12T07:13:12Z` (§2). Completion
*durations* for the cleared cohort are as-recorded during the session and were
not re-derivable from the history API. The bisection (2026-08-12 05:07–06:37
UTC by submission timestamps) is the substance; the rest is the arc that
produced the question.

**Why this file exists**: the evidence lived only in a session summary named
after an unrelated branch, where the next session's summary would not carry it
forward. This is also most of what an Apple Feedback report needs, which has
not been filed.

---

## 1. The claim, stated so it can be attacked

> Submitting a `.app` whose `Contents/Resources/toolchain` contains the real
> vendored `@sharpee/devkit` closure causes Apple's notary service to accept the
> upload and then never process it. The same app, same signing identity, same
> credentials, same submission command, with the toolchain removed, is Accepted
> in 31 seconds.

Every fixture below was a real signed `.app`, submitted through the exact path
`package.sh` uses (`ditto -c -k --keepParent` then `xcrun notarytool submit`).
Pre-registered decision rule, fixed before the first submission: **still
In Progress at 10 minutes = hung cohort.** Nothing landed between the cohorts —
the slowest cleared submission was 113 seconds, the fastest hang is still open.

---

## 2. Submission ledger

**Statuses below were re-verified first-hand** with
`xcrun notarytool history --keychain-profile dc-notary` at
**`2026-08-12T07:13:12Z`**. Every `In Progress` row was still In Progress at
that moment. Completion *times* in §2.1 and §2.3 are as-recorded during the
session (the history API reports status and creation, not duration); creation
timestamps and full ids are from the verified query.

### 2.1 Cleared — Accepted in 19 to 113 seconds

| Id | Fixture (zip) | Created (UTC) | Time | Hypothesis it falsifies |
| --- | --- | --- | --- | --- |
| `1b2b8f16-6c45-4249-8078-bd150edf15c5` | `control-small.zip` — real app, toolchain removed | 05:07:56 | 31s | The CLI submission channel is at fault |
| `f04cd149-fd42-439c-877b-0d9d7cca666d` | `node.zip` — 108MB Node runtime only, 0 symlinks | 05:09:58 | 44s | Total byte volume |
| `a978eb1f-d781-4fdc-9295-88540a37a504` | `esb.zip` — 9.9MB esbuild binary only | 05:49:24 | 19s | The Mach-O binaries themselves |
| `53173b72-976d-4d24-ad77-06e17e3984b2` | `inert.zip` — 11,001 stub files across 113 dirs | 05:54:06 | 110s | File count |
| `f8dfe5da-ffff-47b0-ae46-2f92cf5068d9` | `nm.zip` — same stubs, parent dir named `node_modules` | 06:22:53 | 108s | The name `node_modules` |
| `d8c49bbf-5500-4c99-b3df-760ba80bfb94` | `scope.zip` — same stubs under `node_modules/@scope/` | 06:27:44 | ~110s | `@`-prefixed directory names |
| `807e177b-5355-472c-b8a7-880c30b95346` | `deep.zip` — same stubs nested to depth 8 | 06:27:51 | ~110s | Nesting depth |
| `1f5e101f-ca07-4157-963f-e9404a8ec37a` | `dirs.zip` — same stubs across 1,103 dirs | 06:30:16 | 107s | Directory count |
| `8cddb5ae-d9cc-4aa6-8c45-deaa425adb30` | `Chord Writer.zip` — Xcode export, no toolchain | 02:59:06 | — | (not a fixture; see §6.1) |

### 2.2 Hung — still no verdict as of `2026-08-12T07:13:12Z`

| Id | Fixture (zip) | Created (UTC) | Elapsed at check | What it rules out |
| --- | --- | --- | --- | --- |
| `e4244248-6e89-4d56-b829-0ee8bb04817a` | `ChordWriter-app.zip` — the real toolchain-bearing app | 02:10:09 | **5h03m** | Team mismatch (§6.3) |
| `f991e71b-742e-4a7d-a47c-48809a60b321` | `devkit.zip` — devkit closure, half | 05:10:08 | 2h03m | Sheer size of the closure |
| `add60df0-0450-4902-9904-0384ffbe89f1` | `pruned.zip` — `dist-esm`/`*.d.ts`/`*.map` stripped, 0 dangling symlinks | 05:21:29 | 1h52m | Pruning as a remedy |
| `52a2dc5b-7eda-43ea-979d-82db8a2147fa` | `deref.zip` — symlinks dereferenced, 0 symlinks, 213MB | 05:41:16 | 1h32m | **Symlinks as a cause** |
| `c177000f-bc1e-4eea-b642-6c5ab546e24a` | `shape.zip` — 11,001 stubs in devkit's `.pnpm`-style layout | 05:59:16 | 1h14m | — see §5, the live lead |
| `62ff0500-953e-4e5f-94ea-d9a644354d45` | `flat.zip` — real closure flattened out of `.pnpm` | 06:17:16 | 56m | Flattening as a remedy |
| `55302a17-9455-4b87-a0ee-fcd7005a7741` | `zipped2.zip` — entire closure as one inner zip | 06:36:50 | 36m | Archiving as a remedy |

A 90-minute poller (session `b4bb9970`) tracked `deref`, `pruned`, and `devkit`
together and hit its deadline at `07:10:43Z` with all three still In Progress,
exiting 2. The 07:13Z query above independently confirms that and covers the
other four. **The observation window has not meaningfully lengthened since the
bisection ended** — this is a re-verification, not new elapsed evidence.

### 2.3 The only non-Accepted verdict of the whole investigation

| Id | Fixture (zip) | Created (UTC) | Time | Verdict |
| --- | --- | --- | --- | --- |
| `9a8edeb8-f009-4ca7-bec6-7978e8068959` | `zipped.zip` — closure containing an **unsigned** esbuild nested inside an inner zip | 06:34:11 | 113s | **Invalid** — the log named the exact offending path three times |

Note the pairing: `zipped.zip` (Invalid in 113s) and `zipped2.zip` (hung, still
open) were submitted two minutes apart, same layout, differing by whether the
nested esbuild was signed. The service answered one immediately and has never
answered the other.

### 2.4 Earlier submissions, before the bisection

These predate the controlled phase. **None appears in `notarytool history`
under the current `dc-notary` credentials** — the history reaches back only to
`e4244248` at 02:10Z on 2026-08-12. That invisibility is independent support
for the 2026-08-10 inference that they belong to the old team account, and it
means their ids cannot be queried or cited as evidence today.

| Id | Origin | Outcome |
| --- | --- | --- |
| `e264bb44` | 2026-08-10, old icon, `minos 26` | superseded |
| `fb7db755` | 2026-08-10, new icon, `minos 26` | superseded |
| `90a8dfb6` | 2026-08-10, new icon, `minos 11.0` — the shippable build | never returned |
| `041e7810` | 2026-08-11, orphaned by a killed shell | never returned |
| `8fe1892f` | 2026-08-11, corrected app | In Progress 10 hours, never returned |

---

## 3. What the cohorts prove

**The cleared cohort falsifies causes.** Eight fixtures, each differing from
its neighbour by one property, exonerate in turn: the submission channel, byte
volume, the two Mach-O binaries, file count, the `node_modules` name,
`@`-scoped directories, nesting depth, and directory count. A ninth
falsification comes from the hung cohort rather than the cleared one:
`52a2dc5b` dereferenced all 222 symlinks and hung anyway, so symlinks are not
the cause either.

**The hung cohort falsifies remedies.** Pruning the 81% of the closure that is
never read (`add60df0`), flattening it out of `.pnpm` (`62ff0500`), and sealing
it inside a single zip (`55302a17`) all still hang. Every fixture containing
real devkit content hung, across every layout tried — as-built, pruned,
dereferenced, flattened, archived. The trigger is content-borne and
layout-independent.

**The Invalid verdict is the load-bearing piece of evidence.** `9a8edeb8` came
back in 113 seconds with a log naming the exact path of the unsigned binary,
three times. That establishes the baseline: **when Apple's notary has something
to say, it says it in under two minutes, specifically.** Every documented
failure mode produces a fast, precise rejection. Our hangs produce nothing at
all — which is why "we are doing something wrong and Apple is telling us" does
not fit the observations.

It also proves a fact worth keeping independently: **Apple's notary descends
into nested archives.** A zip inside a zip is not opaque to it; every Mach-O
inside still needs full signing. This matches electron-builder#4637.

---

## 4. Local failure modes checked and excluded

Each of these is a documented cause of notarization trouble. All came back
clean, so none explains the hang.

- **Foreign-platform binaries** — the closure is `darwin-arm64` only. No
  `linux-x64` or `win32` esbuild is present, so the vscode#130158 failure mode
  does not apply.
- **Filename case collisions** — 0 found.
- **`com.apple.cs.*` extended attributes** — 0 found.
- **Case-sensitivity** — `codesign --verify --deep --strict` passed identically
  on a case-sensitive APFS disk image and on the normal volume, excluding that
  whole class.

---

## 5. The one live lead

`c177000f` is the single stub fixture that hung; the other five cleared. It
carried devkit's `.pnpm`-style deep layout, and two of its properties were
never isolated:

1. A **dot-prefixed directory** (`.pnpm`).
2. **`+` characters** in directory names (pnpm's `@scope+name@version` encoding).

This is likely a *second, independent* trigger, and it is the reason three
earlier hypotheses looked wrongly exonerating: fixtures that varied one
property while silently holding another confound. Isolating these two is the
next experiment, and it is cheap — the stub-generator fixtures clear in ~110
seconds, so a two-fixture run costs four minutes.

Surviving explanation for the primary hang, absent that result: an Apple-side
content queue that may resolve on its own over a day. That is David's read, and
it is a hypothesis, not a finding. **It remains untested** — the longest-running
submission (`e4244248`) was only 5h03m old at the 07:13Z verification, well
inside a day, so nothing yet distinguishes "slow queue" from "never completes."
The cheapest evidence available is simply to re-query the seven ids in §2.2
after 24 and 48 hours; if any returns Accepted, the queue hypothesis survives
and the fix is patience, not packaging.

---

## 5a. A second trigger, isolated 2026-08-12: the x86_64 slice

Everything above concerns bundles containing the vendored devkit closure. A
separate attempt — shipping a **universal** (`x86_64 arm64`) Chord Writer under
the toolchain-less interim — found a second, independent trigger, and isolated
it in one pair.

| Id | Bundle | Created (UTC) | Outcome |
| --- | --- | --- | --- |
| `5133a8de-3e4b-4354-9759-2b5d52335789` | `ChordWriter-universal.zip` — as exported, `x86_64 arm64` | 07:48:28 | **In Progress past 16 min, no verdict** |
| `ee8cf37e-f8b6-493a-b818-08e01f77e1ca` | `ChordWriter-thin-arm64.zip` — the same bundle after `lipo -thin arm64` + re-sign | ~08:02 | **Accepted in ~30s**, stapled, `spctl` reports `accepted / source=Notarized Developer ID` |

**This is the cleanest matched pair in the investigation.** Both come from a
single `xcodebuild archive` + `-exportArchive` (method `developer-id`, team
`RSNGKW5LNH`). Same signing identity, same `codesign --options runtime
--timestamp`, same `ditto -c -k --keepParent`, submitted 14 minutes apart. The
thinned bundle differs by exactly one `lipo` operation. Neither carries a
toolchain.

**It is a distinct failure mode, not the devkit one.** Arm64 Mach-O content was
already exonerated in §2.1: the 108MB Node runtime cleared in 44 seconds and the
9.9MB esbuild in 19. So "contains Mach-O binaries" is not the shared cause, and
the two triggers should be investigated separately.

**Consequence for shipping**: Intel support is gated on this, not on a build
setting. `project.yml` builds universal cleanly and the suite stays green at 480
tests — it simply produces an app that cannot be notarized. `ARCHS` is
deliberately pinned back to `arm64` with this finding recorded inline; do not
flip it without a notarization result that says otherwise.

**A methodology note worth keeping.** The universal submission changed *two*
variables against the §2.1 control `1b2b8f16` — architecture and build route
(fresh archive/export, versus a fixture made by stripping the toolchain out of
an already-signed app). That confound is why the thinned control was needed, and
it is the same mistake §5 records the original bisection making. One variable
per submission, every time.

## 6. Findings that are not the hang but matter

### 6.1 The Xcode path cannot produce a shippable app

`8cddb5ae` — a Distribute App → Direct Distribution export of archive
`SharpeeIDE 8-11-26, 9.58 PM.xcarchive` — was **Accepted**, stapled, and
verifies (`stapler validate` passes; CDHash `99e285ac` matches the ticket;
TeamIdentifier `RSNGKW5LNH`; `spctl -a -t exec` reports
`accepted / source=Notarized Developer ID`).

It is still not shippable, for two independent reasons:

- **No toolchain.** `project.yml:99` gates vendoring on
  `SHARPEE_VENDOR_TOOLCHAIN=1`, which Xcode's Distribute App UI never sets, so
  the post-build script silently skipped it. Chord Writer without its third
  tier cannot build a story on a machine lacking a global `sharpee`.
- **Nothing signs what the post-build script drops in.** No Xcode target signs
  the Mach-O binaries placed into `Resources`, and the vendored node needs its
  own entitlements. That is precisely what `package.sh` step 5 exists for.

Consequence: notarizing through Xcode and adopting the result via
`package.sh --dmg-from` cannot work until the Xcode post-build path sets
`SHARPEE_VENDOR_TOOLCHAIN=1` *and* the signing of vendored binaries is moved
into or after that path. Neither is done.

### 6.2 A real bundle-layout violation, not proven causal

Toolchain executables live in `Contents/Resources/toolchain` rather than
`Contents/MacOS` or a Helpers directory, contrary to Apple's bundle-layout
guidance — the stated risk is signature fragility via extended attributes that
zip and DMG packaging strip. **ADR-279 D4 chose `Resources` without weighing
this.** It is a plausible contributor and an ADR amendment candidate; it is not
evidence, and moving the executables has not been tried as a fixture.

### 6.3 Team mismatch is retired as the explanation

The 2026-08-11 session root-caused the hang to the app being signed by
`54CCCRZJ3X` (the old Mach9 Poker business account) while submitted with
`RSNGKW5LNH` credentials (the new individual account), and predicted a
re-submission under matched credentials would return within the hour. That
prediction failed: `e4244248` already carries the correct cert and hung 4h40m+.
The credential bug was real and is fixed; it was never the cause of the delay.

### 6.4 A falsified claim in `package.sh`'s own header

`xcrun notarytool submit` died with `Bus error: 10` four times during the
bisection, **always after the upload succeeded and a submission id had been
returned**. `package.sh`'s header comment currently asserts the crash is
"always inside the wait and never the submit." That sentence is falsified by
this evidence and should be corrected, because the never-wait design leans on
it.

This is the second unverified root-cause claim found in a header comment in
this area (§6.3 is the first), which is why the 2026-08-12 session recommended
auditing other packaging scripts for the same pattern.

---

## 7. Measurements worth keeping

The vendored toolchain, as built:

| Metric | Value |
| --- | --- |
| Size | 165 MB |
| Files | 7,911 |
| Directories | 764 |
| Symlinks | 222 |
| Mach-O binaries | **2** — node (108 MB), esbuild (9.9 MB) |

**81% of it is dead weight.** 6,436 of the 7,911 files (35 MB) are `dist-esm`,
`*.d.ts`, and `*.map`, none of which the CJS shim ever opens. devkit has zero
genuine dynamic `import()` — every `import(` occurrence is `typeof import(...)`
— so pruning them from the *vendored* bundle is safe. (Not from the in-repo
tree, where vitest reads `dist-esm`.) Pruning leaves 0 dangling symlinks, so
`package.sh`'s seal scan still passes.

Pruning does not fix the hang (`add60df0`), but it is a defensible size win
independent of this investigation.

---

## 8. If this is filed with Apple

The evidence is unusually strong for a report of this kind, and the shape of it
is what makes it usable:

- 21 submissions total, 16 of them controlled, each pair differing by one
  property.
- A pre-registered decision rule fixed before the first submission.
- Two clean cohorts with nothing between them: 19–113 seconds versus never.
- Nine submissions that cleared in under two minutes against seven that never
  completed, under identical credentials and command.
- A same-session Invalid verdict in 113 seconds proving the service *can*
  respond fast and specifically to these bundles, and a two-minutes-apart pair
  (`9a8edeb8` answered, `55302a17` never) isolating that behaviour.
- Two minimal reproducers, one per trigger:
  - **Toolchain**: `1b2b8f16-6c45-4249-8078-bd150edf15c5` (Accepted, 31s) versus
    `e4244248-6e89-4d56-b829-0ee8bb04817a` (In Progress 5h+), differing only by
    the presence of `Contents/Resources/toolchain`.
  - **x86_64 slice** (§5a, and the stronger of the two): `ee8cf37e-f8b6-493a-b818-08e01f77e1ca`
    (Accepted, ~30s) versus `5133a8de-3e4b-4354-9759-2b5d52335789` (In Progress
    16 min+) — one export, differing by a single `lipo -thin arm64`. If only one
    case can be filed, file this one: the bundles are otherwise byte-identical,
    both are small (6.5MB), and neither involves third-party content.

Before filing, re-run the §2.2 query so the report carries current elapsed
times rather than the 07:13Z snapshot.

The ask is narrow: **why does a submission enter a state that produces no
verdict, no log, and no timeout?** Whatever is wrong with the bundle, the
service's own behaviour on `9a8edeb8` shows it is capable of saying so.

---

## 9. Open work

| Item | Cost | Blocking? |
| --- | --- | --- |
| Re-query the seven §2.2 ids at +24h and +48h | seconds | No — but it is the cheapest test of the queue hypothesis |
| Re-query `5133a8de` (§5a) — the only live probe of the x86_64 trigger | seconds | No |
| Isolate the x86_64 trigger further: does a `x86_64`-only build hang, or only a fat one? | ~2 min of submissions | **Yes** — blocks Intel support entirely |
| Isolate `.pnpm` dot-dirs and `+` in dir names (§5) | ~4 min of submissions | No — but it is the only live lead |
| File the Apple Feedback report (§8) | ~1 hr | No |
| Wire `SHARPEE_VENDOR_TOOLCHAIN=1` into the Xcode post-build path (§6.1) | small | **Yes** — blocks the `--dmg-from` flow entirely |
| Sign vendored Mach-Os in the Xcode path (§6.1) | medium | **Yes** — same |
| Land a genuine happy-path `--dmg-from` run | blocked | Needs a toolchain-bearing app that has cleared notarization; none exists |
| Correct `package.sh`'s SIGBUS header claim (§6.4) | trivial | No |
| Amend ADR-279 D4 for bundle layout (§6.2) | small | No |
| Audit packaging scripts for unverified root-cause claims in headers (§6.4) | small | No |

**Housekeeping**: `release/.notarize-state` still carries
`APP_SUBMISSION=e4244248`, a dead id. A plain `./package.sh` will resume polling
it forever; `--rebuild` discards the ledger. The app currently staged at
`tools/ide/release/Chord Writer.app` is notarized and stapled but has no
toolchain — **do not ship it.**
