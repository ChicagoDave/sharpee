# ADR-279: The IDE ships as "Chord Writer" — a signed, notarized, downloadable DMG

## Status: ACCEPTED (2026-07-27, session fda0f0) — drafted session 8a8c83; all open questions resolved and review findings addressed in session fda0f0

## Date: 2026-07-27

## Parent: ADR-185 (standalone authoring tool), ADR-258 (Chord authoring environment), ADR-277 (integrated testing — the feature set that makes the app worth shipping). Realizes the original IDE phase plan's final phase (`docs/work/sharpee-ide/plan-20260509-phases.md`: "a downloadable, signed, notarized DMG"), which every earlier session deferred.

## Context — verified, not assumed

- **The app is feature-complete for a first authors' release**: Chord editing
  with live Problems/Index (ADR-258), build + Play (ADR-258 D4), and
  integrated testing with transcript recording (ADR-277, implemented
  2026-07-27). Platform is at 4.2.0 (stamped this session); Chord language
  2.1.0.
- **The app today is named "Sharpee"**: `CFBundleName`/`CFBundleDisplayName:
  Sharpee`, `PRODUCT_BUNDLE_IDENTIFIER: net.sharpee.ide`,
  `CFBundleShortVersionString: "0.1.0"` (`tools/ide/project.yml:44-57`);
  the status bar hardcodes "main · Sharpee 0.1.0" (`MainWindow.swift:890` —
  a carried open item).
- **Persisted state lives in the bundle-id defaults domain** (`net.sharpee.
  ide`): recents, session restore, divider widths, play-after-build, fonts.
  Changing the bundle identifier orphans all of it unless migrated —
  ADR-258 D8's rule ("persisted IDE state is migrated, not silently broken")
  applies to any id change.
- **Signing is ad-hoc today**: `CODE_SIGN_STYLE: Automatic`,
  `CODE_SIGN_IDENTITY: "-"` (`project.yml:59-60`). A downloadable app needs
  a Developer ID Application certificate and notarization (`notarytool`),
  or every download fights Gatekeeper.
- **The IDE builds only via xcodegen + xcodebuild** (`tools/ide/`); repokit
  (the in-repo platform tool) has no IDE-related command. There is no
  archive/export/DMG automation anywhere in the repo.
- **The app embeds no toolchain**: it resolves `sharpee` from the login-shell
  PATH or a workspace shim (ADR-258 D2/Q1) — authors need `@sharpee/devkit`
  installed (`npm i -g @sharpee/devkit`, published; ADR-180). A shipped app
  must present that dependency clearly (the "sharpee not found" states
  exist, with install hints).
- **sharpee.net is live** ("Sharpee — Parser IF, composed"; Next.js behind
  Apache) — a real front door for downloads. *(Corrected 2026-07-27, session
  fda0f0: this ADR originally claimed no website existed.)*

## Decision

### D1 — The product is "Chord Writer"

The macOS app is named **Chord Writer** (David's naming, 2026-07-27):
`CFBundleName`/`CFBundleDisplayName`, window titles, the About panel, menu
bar app name, and the status-bar label (closing the stale "Sharpee 0.1.0"
open item). "Sharpee" remains the platform/engine name; "Chord" the
language. The repo home is ruled in D5.

The bundle identifier changes with the name (Q-1 resolved 2026-07-27,
session fda0f0): **`net.sharpee.chord-writer`**, with a one-time defaults
migration from `net.sharpee.ide` per ADR-258 D8 ("persisted IDE state is
migrated, not silently broken"). Ruled now because the migration cost is at
its floor — the app has never been distributed, so the only shipped state is
David's own; post-ship an id change would drag Gatekeeper identity, TCC
grants, and every user's defaults with it.

Chord Writer carries its **own version line, starting 1.0.0** (Q-2 resolved
2026-07-27, session fda0f0) — app maturity is tracked separately from the
platform version. D4's bundling makes the platform version a *displayed
fact* rather than something the app version must encode: About and the
status bar show both, e.g. "Chord Writer 1.0.0 · Sharpee 4.2.0 / Chord
2.1.0" (this is the fix for the hardcoded "Sharpee 0.1.0" status-bar label).
UI-only fixes rev the app alone; platform releases don't force app bumps.
The DMG is named from the app version: `ChordWriter-1.0.0.dmg`.

### D2 — Deliverable: a signed, notarized DMG

The shipping artifact is a DMG containing Chord Writer.app —
Developer-ID-signed, notarized, and stapled, so a fresh download opens
without Gatekeeper overrides. Ad-hoc signing remains for local dev builds;
release packaging is a distinct, scripted path (one command, not a manual
Xcode Organizer ritual).

### D3 — Packaging is scripted in-repo: `tools/ide/package.sh`

A single scripted entry point — **`tools/ide/package.sh`** (Q-4 resolved
2026-07-27, session fda0f0) — drives: platform build for the toolchain
bundle D4 embeds → xcodegen → xcodebuild archive → export with Developer
ID → codesign verify → notarytool submit + wait → staple → DMG assembly →
a checksummed artifact named `ChordWriter-<version>.dmg`. It lives beside
the Mac-only code because the pipeline is Mac-only by nature: repokit stays
Node-only and IDE-ignorant (the boundary D5 leans on) — the script calls
into the platform build for the devkit bundle rather than repokit reaching
into Xcode land. Secrets (signing identity, notary credentials) come from
the environment/keychain profile, never the repo.

### D4 — The app bundles the toolchain (amended 2026-07-27, session fda0f0)

Chord Writer ships self-contained: a Node runtime plus the `@sharpee/devkit`
CLI bundle live inside `Chord Writer.app/Contents/Resources`, and Cmd-B works
straight off the DMG on a machine with no Node, no npm, and no checkout.
David ruled this after running the as-designed first-install experience
himself (new story scaffolded outside the checkout, no global CLI → the
"sharpee not found" wall): requiring writers to install a JavaScript package
manager before the Build button works loses them at minute one; a heavier
DMG loses no one.

Resolution order becomes: **workspace shim → login-shell PATH → bundled
toolchain**. The first two are unchanged from ADR-258 D2/Q1, so the in-repo
dev loop still tracks the local build and an author's deliberate global
install still wins; the bundled copy is the fallback that makes first run
work. The app ships the exact toolchain version it was built against, which
makes the ChordVersionCheck pairing exact for bundled resolution.

Deferred, not decided: an "Install Command Line Tool…" menu item (VS Code
style) that symlinks the bundled CLI onto PATH for authors who want the
book's terminal workflow without npm.

Coupling note (2026-07-28, from the ADR-282/287 review): the IDE now
*writes* artifacts (fence-grammar transcripts) that a PATH-resolved
toolchain older than ADR-287 cannot parse. The failure is a loud parse
error and the bundled fallback (always current) is the recovery; a
minimum-toolchain note in the test panel's error surface is the cheap
mitigation. The bundled devkit carries whatever the devkit carries —
e.g. the ADR-286 template transform — with no packaging change.

> **Amended 2026-08-12 (session 1744e6) — the coupling note above is stale in
> both halves.** The IDE does not write fence-grammar transcripts: ADR-307's
> cutover (landed 2026-08-10) made one JSON tree document per story
> (`<story-id>.tests.json`) the Chord/IDE world's only serialization, and
> retired the `.transcript` grammar `@sharpee/branch-tester` carried. ADR-287's
> grammar survives only in `@sharpee/transcript-tester` — Dungeo's text world,
> which the IDE neither reads nor writes.
>
> The version-drift risk therefore moved rather than vanished, and it moved
> somewhere better. `tree-document.ts` refuses a document whose `version` is
> newer than the reader with a named message, and reports anything else it
> cannot understand as MALFORMED so the caller degrades to a fresh empty tree —
> it never throws, and the grammar is closed, so additive fields must arrive
> with a version bump. That is a stronger guard than the "minimum-toolchain
> note" proposed above, it is already implemented and tested (AC-4), and it
> holds for a PATH-resolved toolchain exactly as it does for a bundled one. The
> mitigation this note asked for is not needed and should not be built.

*(Original D4 — "no silent bundling; first-run says `npm install -g
@sharpee/devkit`" — is superseded by this ruling.)*

> **INTERIM 2026-08-12 (session 1744e6) — the original D4 is temporarily back in
> service, by necessity.** Toolchain-bearing bundles do not clear notarization:
> seven submissions containing the real vendored devkit closure have returned no
> verdict at all — no Accepted, no Invalid, no log — while the same app with the
> toolchain removed clears in 31 seconds and nine control fixtures cleared in
> under two minutes. The full bisection, fixture ids and falsified hypotheses are
> in [`docs/work/archive/adr-279-chord-writer-packaging/notarization-bisection.md`](../../work/archive/adr-279-chord-writer-packaging/notarization-bisection.md).
>
> So `package.sh --dmg-from <app> --no-toolchain` packages a deliberately
> toolchain-less Chord Writer, and the download page tells authors to
> `npm install -g @sharpee/devkit`. This works because the resolution order this
> decision established puts the login-shell PATH (tier 2) **above** the bundled
> toolchain (tier 3), so a global install is found whether or not tier 3 exists,
> and a missing tier 3 is non-fatal by construction
> (`BundledToolchain.executable` returns nil, never throws).
>
> **This does not reverse the ruling.** Everything D4 says about first-run cost
> still stands — requiring a JavaScript package manager before Build works is
> exactly the wall David hit and ruled against, and shipping toolchain-less
> re-imposes it. What changed is the alternative: in July the choice was
> bundled-versus-not, and today it is toolchain-less-and-shipping versus
> bundled-and-blocked-indefinitely. Bundling remains the target and the flag
> should stop being used the day a toolchain-bearing bundle gets a verdict.
> The flag is deliberately narrow: it skips exactly three toolchain gates and
> refuses any bundle that actually carries a toolchain.

> **INTERIM LIFTED 2026-08-13 (session 73a646) — a toolchain-bearing DMG
> shipped, and nothing in this repo was ever the cause.**
>
> **The whole of it: Apple's notary intermittently stalls.** Not on a property
> of the bundle — on nothing detectable at all. The same archive, same SHA-256
> `43a3bddb…76d`, one account, one command:
>
> | Submission | Submitted | Outcome |
> | --- | --- | --- |
> | `359b004e-ccd2-4ab0-a02e-0516b5598b75` | 2026-08-13T05:40:32Z | In Progress at 10h+ |
> | `f0c04838-dda4-4172-8d79-cc1cfaaef601` | 2026-08-13T15:55:14Z | **Accepted in 72s** |
>
> Identical bytes, opposite outcomes. Fifteen submissions on 2026-08-13 spanning
> every shape — with and without the dependency tree, with and without a signed
> binary, plain and encrypted archives, 11MB to 60MB, high-entropy and trivially
> compressible — produced eight hangs and no content-shaped pattern.
>
> **A false lead, recorded because it is the more instructive half.** During the
> investigation the raw `vendor-toolchain.sh` output was archived directly and
> submitted; it came back Invalid in 115 seconds naming npm's ad-hoc-signed
> esbuild (`c27bc940`), and re-signing that binary made the same tree Accepted
> in 92 seconds (`6486cc83`). That looked like the root cause and was briefly
> written up as one. **It was an artifact of the fixture.** `package.sh` has
> always signed every Mach-O under the bundled toolchain — generically, by
> `find`, splitting node (with `bundled-node.entitlements`) from everything else
> — under a comment that already named the problem: *"esbuild and friends arrive
> ad-hoc/linker-signed, which never notarizes."* Zipping the toolchain tree
> bypassed that step; a real bundle never does. A `vendor-toolchain.sh` step 4.6
> was added to re-sign the closure and then **reverted** as redundant with the
> script that owns signing.
>
> **What was actually run, and what it proved.** `package.sh` end to end,
> 2026-08-13T17:30Z. Platform build, archive, toolchain seal, nested signing
> (2 binaries), deep-strict verification, hardened runtime on app and node,
> node entitlements asserted correct — every gate green, app submitted as
> `da156648-79c6-4295-bedd-4d01f1b2b19b`.
>
> **That app came back Invalid in ~8 minutes, and the finding matters: the
> toolchain passed.** The notary's only objection was
> `Contents/Frameworks/libswift_Concurrency.dylib` — no Developer ID
> certificate, no secure timestamp, both slices. Nothing about the toolchain,
> node, esbuild, or the 7,900 files. A toolchain-bearing app was fully
> inspected and the vendored toolchain cleared.
>
> **A real gap in `package.sh`'s build path, and the reason the Xcode route is
> the standing preference.** Its nested-signing loop covers `$BUNDLED_TC` only
> and never re-signs `Contents/Frameworks/`. Xcode's Distribute App → Direct
> Distribution does, which is why `--dmg-from` exists and why notarizing
> through Xcode is the recorded workflow. Local verification cannot catch it:
> the dylib carries a valid Apple signature, so `codesign --verify --deep
> --strict` passes, exactly as this script's own header warns ("Neither gap
> fails a `codesign --verify` of the outer bundle").
>
> **The INTERIM is lifted — a stapled toolchain-bearing DMG shipped
> 2026-08-13.** Route taken: `xcodebuild archive` with
> `SHARPEE_VENDOR_TOOLCHAIN=1`, Xcode Distribute App → Direct Distribution,
> then `package.sh --dmg-from`. `ChordWriter-1.0.0.dmg`, 56MB, Accepted and
> stapled, Gatekeeper `source=Notarized Developer ID`.
>
> `package.sh`'s own build path remains broken for the framework reason above
> and was not fixed. Extending its signing loop to `Contents/Frameworks/` would
> repair it, but then two routes sign the same bundle two ways — a decision,
> not a detail, and deferred rather than taken.
>
> **Consequences.**
>
> - **No code change was required.** The packaging path was correct as written
>   in July. Three sessions of bisection found a defect that was not there.
> - **`--no-toolchain` stays, with a changed rationale** — a release escape
>   hatch for the intermittency, not evidence that bundling is blocked. First
>   response to a stall past ~15 minutes is to **resubmit**.
> - **The download page and `/chord-writer` are rewritten and SHIPPED** —
>   merged to `main` (PR #261), the DMG uploaded to plover, site deployed
>   2026-08-13. D4's first-run cost argument is satisfied rather than deferred,
>   and verified on the installed app: `which sharpee` → not found,
>   `npm ls -g @sharpee/devkit` → empty, ⌘B builds from the bundled toolchain
>   (`Sharpee 5.0.0 · Chord 3.0.0`). **This INTERIM is lifted.**
> - **[`notarization-bisection.md`](../../work/archive/adr-279-chord-writer-packaging/notarization-bisection.md)
>   is superseded in its conclusions**, not its data. Its "content-borne and
>   layout-independent" finding, its eight exonerated properties, and its
>   `.pnpm`-naming lead are all artifacts of intermittency. Its ledger, the
>   Invalid-in-113s log behaviour, and the deletion of hung submissions 21–26
>   hours after creation all stand.
> - **§5a's Intel conclusion is FALSIFIED, and Intel shipped the same day.**
>   It rested on a single matched pair 14 minutes apart — exactly the shape this
>   session showed proves nothing. Re-tested 2026-08-13: a universal build was
>   **Accepted in ~103 seconds** (`975d1c21-68bd-400a-a591-14818bb4b425`). Arch
>   and notarization are unrelated.
>
>   Intel now ships as a **separate per-arch installer** rather than a universal
>   binary (David 2026-08-13): each app carries a bundled toolchain for exactly
>   one architecture, so a universal slice would ship a Build button with the
>   wrong toolchain behind it for half the machines it runs on.
>   `ChordWriter-1.0.0-x86_64.dmg` is signed, notarized, stapled and live
>   alongside the arm64 build. Both target macOS 11.0 — verified on the real
>   tarballs that both Node runtimes are `minos 11.0`.
>
>   Verified under Rosetta only; no genuine Intel hardware was available, and
>   David accepted that for v1. What Rosetta did establish: correct slices and
>   teams throughout, and a full `sharpee build` of a real story through the
>   bundled x64 toolchain.
> - **The intermittency is Apple's bug**, reported in forum thread 841846. Not a
>   Sharpee problem, and not a shipping gate.
>
> **The lesson worth carrying.** Every hypothesis here failed the same way:
> a cohort was compared against another cohort submitted at a different time,
> and the difference was attributed to the artifacts. Against intermittent
> infrastructure, only a *matched pair of identical bytes* proves anything —
> which is what finally did.
>
> Full fixture matrix, all fifteen submissions and the falsified hypotheses:
> [`docs/work/archive/adr-279-chord-writer-packaging/fixtures/RESULTS.md`](../../work/archive/adr-279-chord-writer-packaging/fixtures/RESULTS.md).

### D5 — Chord Writer stays in the sharpee monorepo (ruled 2026-07-27, session fda0f0)

The app remains at `tools/ide/` in this repo; no separate repository.
Rationale:

- **The contract seam is still hot**: the IDE consumes `compose --json`
  (ComposeJsonPayload + schemaVersion rejection), the build/test CLI
  surface, and the Chord version pairing — all still evolving (ADR-258/276/
  277/278). Co-location lands a schema change and its Swift decoder change
  in one commit; a split turns every contract tweak into a cross-repo dance.
- **D4's bundling favors one checkout**: the D3 packaging script builds the
  toolchain and packages the app around it in one pipeline, with exact
  app↔toolchain version pairing for free. A separate repo would pin a
  published devkit version instead — more moving parts before release one.
- **The seam is already clean**: `tools/ide/` has its own toolchain
  (xcodegen/xcodebuild), repokit doesn't know it exists. There is no
  monorepo tax being paid; extraction later is cheap if a reason appears.

**Revisit triggers** (any one reopens this): the app takes a different
license than the platform (the forcing case); the independent version line
(D1) sharing one repo's Releases proves unmanageable despite D6's
`chord-writer-v*` tag prefix; or the app grows its own contributor base
wanting it without the platform.

### D6 — Distribution: sharpee.net front door, GitHub Releases storage (Q-3 resolved 2026-07-27, session fda0f0)

> **SUPERSEDED by Amendment A2 (2026-08-15).** GitHub Releases was never used.
> sharpee.net hosts the artifacts directly and the `chord-writer-v<version>` tag
> scheme is withdrawn. Read A2 before acting on anything below.

Downloads live on **GitHub Releases** in this repo, tagged
**`chord-writer-v<version>`** (prefixed so app releases stay distinct from
platform tags, per D5). **sharpee.net is the front door**: its download
page/button points at the release asset — optionally via a stable redirect
(e.g. `sharpee.net/download` → latest DMG) — so writers see a product page,
not a GitHub UI. Releases provide versioned, checksummed artifact hosting
at zero VPS cost; the site provides the writer-facing surface, and hosts
the D7 appcast.

### D7 — Full Sparkle auto-update from v1 (Q-5 resolved 2026-07-27, session fda0f0)

> **AMENDED by A2 and A3 (2026-08-15).** Archives are served from
> sharpee.net, not GitHub Releases (A2); there is one appcast **per
> architecture**, not one shared feed (A3); and "from v1" did not happen — 1.0.0
> and 1.0.1 shipped with no updater, so 1.1.0 is the earliest version any install
> can be updated from, and every earlier install is permanently on manual
> re-download.

Chord Writer ships with **Sparkle 2** auto-update in the first release
(David's ruling: full Sparkle, not a check-for-updates stopgap). D4's
bundling motivates it — an author on an old app is on an old *toolchain*,
so updates must reach writers without a manual download ritual.

- **Appcast**: hosted on sharpee.net (D6's front door); update archives
  themselves stay on GitHub Releases — the appcast points at the release
  assets.
- **Signing**: Sparkle EdDSA key pair; the private key is a D3-class secret
  (environment/keychain, never the repo). Update archives are EdDSA-signed
  in addition to Developer ID + notarization.
- **Pipeline**: `tools/ide/package.sh` (D3) gains the release steps —
  generate/sign the update archive, append the appcast entry, publish the
  appcast to sharpee.net.
- **App side**: standard Sparkle integration — framework embedded in the
  bundle, `SUFeedURL` pointing at the sharpee.net appcast, the usual
  "Check for Updates…" menu item plus scheduled background checks.

## Implementation touchpoints

- `tools/ide/project.yml` — bundle id (`net.sharpee.chord-writer`), display
  name, `CFBundleShortVersionString: 1.0.0`, release signing config (D1/D2).
- `tools/ide/SharpeeIDE/Compose/ComposeRunner.swift`
  (`resolveSharpee`) — bundled-toolchain fallback after shim and PATH (D4),
  plus wherever the bundled Node + devkit paths inside
  `Contents/Resources` are resolved.
- `tools/ide/SharpeeIDE/MainWindow.swift` — status-bar label becomes
  "Chord Writer <app-version> · Sharpee <platform> / Chord <chord>" (D1).
- A one-time defaults migration unit, `net.sharpee.ide` →
  `net.sharpee.chord-writer` (D1, ADR-258 D8 discipline).
- Sparkle 2 embedding: framework in the bundle, `SUFeedURL`, update menu
  item + scheduled checks (D7).
- `tools/ide/package.sh` — new; the whole D3 pipeline including D7's
  archive-sign/appcast steps.
- sharpee.net — download page/button and appcast hosting (D6/D7; site-side,
  outside this repo).

## Acceptance

1. The built app presents as "Chord Writer" everywhere user-visible (menu
   bar, About, window title, status bar, Finder).
2. One command produces `ChordWriter-<version>.dmg` from a clean checkout
   (given credentials); the script fails loudly at any unsigned/unnotarized
   intermediate.
3. `spctl --assess --type open --context context:primary-signature`
   (Gatekeeper) accepts the stapled DMG on a machine that never built it.
4. Persisted state (recents, session, dividers, fonts) survives the id
   change to `net.sharpee.chord-writer` (D1) — a test pins the one-time
   defaults migration from `net.sharpee.ide`.
5. The IDE suite stays green; dev-loop builds (`xcodegen` + `xcodebuild`)
   are unaffected.
6. On a machine with no Node, no npm, and no Sharpee checkout, a fresh
   install of the DMG can create a story and Cmd-B builds it via the bundled
   toolchain (D4). A test pins the shim → PATH → bundled resolution order.
7. An installed build offered a newer version via the sharpee.net appcast
   downloads it, EdDSA-verifies it, and relaunches updated (D7).

## Consequences

- "Chord Writer" becomes the authors-facing product name; docs/site work
  inherits it. The Sharpee/Chord/Chord Writer naming triangle needs one
  clear sentence wherever the app is introduced.
- Release packaging requires David's Apple Developer credentials (cert +
  notary profile) configured once on the build Mac; CI packaging is out of
  scope until a macOS CI exists (carried open item).
- Chord Writer versions independently (D1/Q-2): `<version>` on the DMG and
  in About is the app's own line starting 1.0.0, with the embedded
  platform/Chord versions displayed alongside rather than encoded in the
  app version.
- Bundling (D4) grows the DMG by roughly the Node binary (~50–80MB) plus the
  devkit bundle, and ties toolchain updates to app updates for authors who
  rely on the bundled fallback — for the writer audience, one thing to
  update. The embedded Node binary and CLI bundle become part of the D2/D3
  signing and notarization surface.
- Sparkle (D7) adds the framework to the signing surface, an EdDSA private
  key to the secret set, and a deployment coupling to sharpee.net: releasing
  now includes publishing an appcast entry to the site, so the release
  script needs a publish path to the VPS.

## Amendment A1 — the window title carries the story title (2026-08-02, session 7dd736)

D1 treated the window title as app identity, and session a68086 (commit
`9a028c05`) reduced it to the product name alone, removing the per-project
`"Sharpee — <project>"` retitle on the ruling that the project tree and status
bar already name the open folder. GH #188 revisits that deliberately: the
folder-name ruling stands, but a story **title** (`story "The Folly at
Fernhill" …`) is the work's name, not the folder's, and a document window
carries the name of the work. Amended behavior: the window opens as the
product name and switches to the composed story's title once a compose
reveals one (`WindowTitle.title(for:)` — grammar-header files and blank
titles keep the product name; project switches reset to the product name
until the new project's first compose). Centering is NSWindow's standard
titled-window behavior — no custom titlebar accessory. The title source is
the compose IR (`meta.title`), so this amendment is unaffected by GH #187's
positional-literal → `title:` field reshape; only the compiler's extraction
changes.

## Amendment A2 — sharpee.net hosts the artifacts directly; GitHub Releases is not used (2026-08-15, session 00d322)

D6 decided that downloads live on **GitHub Releases** under a
`chord-writer-v<version>` tag, with sharpee.net acting as a front door pointing
at the release asset. **That is not what was built, and never has been.** The
site serves the bytes itself:

```
$ curl -sS https://sharpee.net/chord-writer/download | grep -o 'href="[^"]*ChordWriter[^"]*"'
href="/downloads/ChordWriter-1.0.1-arm64.dmg"
href="/downloads/ChordWriter-1.0.1-x86_64.dmg"

$ curl -o /dev/null -w '%{http_code}' https://sharpee.net/downloads/ChordWriter-1.0.1-arm64.dmg
200
```

The installers exist **only on the plover server**. They are not committed
(`website/public/downloads/` holds one story zip and no DMGs), and no
`chord-writer-v*` tag or GitHub release carries them. Publishing a release means
copying the artifacts to that server, which is a manual step outside
`website/deploy.sh` — the deploy script has no download-asset handling at all.

**Amended decision**: sharpee.net is both the front door and the artifact host.
Update archives are served from `https://sharpee.net/downloads/` beside the
DMGs, and the D7 appcast's enclosure URLs point there. The
`chord-writer-v<version>` tag scheme is withdrawn — nothing produces or consumes
it.

**Why this is amended rather than implemented as written**: D7's appcast was
first generated against D6's URL scheme, which would have produced a signed,
well-formed feed whose every download 404'd for every author. The failure mode
matters more than the URL — an appcast is not exercised by any build or test, so
a wrong host would have surfaced only when a real author's update failed. This
is the second decision in this ADR to describe a path the release process does
not actually take (see A3 on D4/D3 below); the standing lesson is that an ADR
records what was decided, not what is true, and anything load-bearing must be
verified against the running system before code is written against it.

## Amendment A3 — Sparkle forces per-architecture feeds, and `package.sh` now signs Contents/Frameworks (2026-08-15, session 00d322)

Two consequences of implementing D7 that D7 did not anticipate.

**Per-architecture appcasts.** D7 says "`SUFeedURL` pointing at the sharpee.net
appcast", singular. Sparkle's appcast has no architecture filter — it supports
`minimumSystemVersion`, `maximumSystemVersion`, `channel`, `belowVersion` and
(2.9+) `hardwareRequirements`, but that last one only expresses "requires Apple
silicon" and cannot express "Intel only"; Rosetta means an Apple-silicon Mac
matches an Intel item regardless. Because D4 ships **separate per-arch
installers**, each carrying a bundled toolchain for one architecture, a shared
feed would eventually hand an author the other architecture's build — an app
that launches and then cannot build a story. Amended: one feed per slice,
`appcast-<arch>.xml`, with `SUFeedURL` written as
`.../appcast-$(ARCHS).xml` so each build bakes in its own.

Observed while generating the first real feed: `generate_appcast` inspects the
binary's slices and emits `<sparkle:hardwareRequirements>arm64</...>` for the
Apple-silicon build without being asked. That is a genuine partial safeguard —
but only on the arm64 side. The Intel build gets no equivalent gate, because an
x86_64 binary really does run on both architectures under Rosetta, so there is
nothing for Sparkle to exclude. An Apple-silicon Mac pointed at the Intel feed
would still be offered the Intel build and accept it. The per-arch split is what
prevents that; the inferred requirement is a second line of defence on one side
only, not a replacement.

**`package.sh` must sign `Contents/Frameworks`.** The script signed the vendored
toolchain and the outer bundle but never the embedded frameworks, because every
shipped release went through Xcode's Distribute App, which re-signs them. That
made the gap invisible until 2026-08-14, when a `package.sh`-signed submission
was rejected on `libswift_Concurrency.dylib` ("not signed with a valid Developer
ID certificate", "signature does not include a secure timestamp", both
architectures). Sparkle makes it structural: `Sparkle.framework` carries an
`Autoupdate` binary, an `Updater.app` and two XPC services, all in that
unsigned corner. Amended: the signing step enumerates nested code bundles and
loose Mach-Os under `Contents/Frameworks`, signs them deepest-first, and
verification asserts the **Team ID on every nested item** — `codesign --verify
--deep --strict` is insufficient by construction, as it checks that nested code
carries *a* valid signature rather than *ours*, which is exactly why the
rejected build passed locally. Confirmed by submission
`2eb1a046-4d73-4932-b969-cbd46124a9ec` (Accepted, 2026-08-15), the first
`package.sh`-only Sparkle-carrying build Apple has accepted.

**Acceptance 7 remains open.** The payload builds, signs and verifies on the
real path, but no installed app has yet updated itself — that needs two
published versions and a served feed.

## Session

Drafted 2026-07-27, session 8a8c83, immediately after ADR-277's
implementation and the 4.2.0 platform bump
(`docs/context/session-20260727-1640-main.md`).
Amendment A1: 2026-08-02, session 7dd736.
Amendments A2 and A3: 2026-08-15, session 00d322, during D7's implementation.
