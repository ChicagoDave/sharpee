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

*(Original D4 — "no silent bundling; first-run says `npm install -g
@sharpee/devkit`" — is superseded by this ruling.)*

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

Downloads live on **GitHub Releases** in this repo, tagged
**`chord-writer-v<version>`** (prefixed so app releases stay distinct from
platform tags, per D5). **sharpee.net is the front door**: its download
page/button points at the release asset — optionally via a stable redirect
(e.g. `sharpee.net/download` → latest DMG) — so writers see a product page,
not a GitHub UI. Releases provide versioned, checksummed artifact hosting
at zero VPS cost; the site provides the writer-facing surface, and hosts
the D7 appcast.

### D7 — Full Sparkle auto-update from v1 (Q-5 resolved 2026-07-27, session fda0f0)

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

## Session

Drafted 2026-07-27, session 8a8c83, immediately after ADR-277's
implementation and the 4.2.0 platform bump
(`docs/context/session-20260727-1640-main.md`).
Amendment A1: 2026-08-02, session 7dd736.
