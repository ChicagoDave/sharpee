# ADR-279: The IDE ships as "Chord Writer" — a signed, notarized, downloadable DMG

## Status: DRAFT (2026-07-27, session 8a8c83) — Open Questions unresolved

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
- **No website distribution point exists yet** — the site redo is its own
  parked effort (custom CMS direction; no Astro — standing ruling).

## Decision

### D1 — The product is "Chord Writer"

The macOS app is named **Chord Writer** (David's naming, 2026-07-27):
`CFBundleName`/`CFBundleDisplayName`, window titles, the About panel, menu
bar app name, and the status-bar label (closing the stale "Sharpee 0.1.0"
open item). "Sharpee" remains the platform/engine name; "Chord" the
language. The binary/product name and repo path follow the Open Questions'
identifier ruling.

### D2 — Deliverable: a signed, notarized DMG

The shipping artifact is a DMG containing Chord Writer.app —
Developer-ID-signed, notarized, and stapled, so a fresh download opens
without Gatekeeper overrides. Ad-hoc signing remains for local dev builds;
release packaging is a distinct, scripted path (one command, not a manual
Xcode Organizer ritual).

### D3 — Packaging is scripted in-repo

A single scripted entry point (home decided in Q4) drives: xcodegen →
xcodebuild archive → export with Developer ID → codesign verify →
notarytool submit + wait → staple → DMG assembly → a checksummed artifact
named `ChordWriter-<version>.dmg`. Secrets (signing identity, notary
credentials) come from the environment/keychain profile, never the repo.

### D4 — The app states its toolchain dependency

Chord Writer does not bundle the Sharpee toolchain (ADR-258's resolution
model stands). First-run and failure states must say plainly: install the
Sharpee CLI (`npm install -g @sharpee/devkit`) to build/test/play. The
existing "sharpee not found" hints are the seam; packaging adds no silent
bundling.

## Acceptance

1. The built app presents as "Chord Writer" everywhere user-visible (menu
   bar, About, window title, status bar, Finder).
2. One command produces `ChordWriter-<version>.dmg` from a clean checkout
   (given credentials); the script fails loudly at any unsigned/unnotarized
   intermediate.
3. `spctl --assess --type open` (Gatekeeper) accepts the stapled DMG on a
   machine that never built it.
4. Existing users' persisted state (recents, session, dividers, fonts)
   survives the rename per the Q1 identifier ruling — a test pins the
   migration if one exists.
5. The IDE suite stays green; dev-loop builds (`xcodegen` + `xcodebuild`)
   are unaffected.

## Consequences

- "Chord Writer" becomes the authors-facing product name; docs/site work
  inherits it. The Sharpee/Chord/Chord Writer naming triangle needs one
  clear sentence wherever the app is introduced.
- Release packaging requires David's Apple Developer credentials (cert +
  notary profile) configured once on the build Mac; CI packaging is out of
  scope until a macOS CI exists (carried open item).
- The versioning ruling (Q2) decides what `<version>` means on the DMG and
  in About — and whether the app version moves in lockstep with platform
  releases or independently.

## Open Questions

### Q-1: Does the bundle identifier change with the name?
- **Why it matters**: `net.sharpee.ide` is the defaults domain holding all
  persisted state; it is also the notarization/Gatekeeper identity users'
  Macs will remember. Options: keep `net.sharpee.ide` under the new name
  (zero migration, mismatched id forever), or move to (e.g.)
  `net.sharpee.chord-writer` with a one-time defaults migration (ADR-258 D8
  discipline).
- **Blocks**: D3's export config, Acceptance 4.

### Q-2: What version does Chord Writer carry?
- **Why it matters**: today it says 0.1.0. Options: (a) its own product line
  starting 1.0.0 (app maturity ≠ platform version); (b) lockstep with the
  platform (4.2.0) so one number rules everything; (c) keep 0.x until the
  authors' beta ends. Decides the DMG name, About panel, and the status-bar
  label fix.
- **Blocks**: D1's status-bar/About text, D3's artifact naming.

### Q-3: Where do downloads live?
- **Why it matters**: no website exists yet. Options: GitHub Releases on
  the sharpee repo now (zero infra, versioned, checksummable) with the
  future site linking there; or wait for the site. Also whether the DMG is
  announced/linked from the npm README.
- **Blocks**: nothing technical — the artifact is host-agnostic; blocks the
  "download it here" sentence.

### Q-4: Where does the packaging script live?
- **Why it matters**: options: a `repokit ide:package` command (platform
  tool learns about the Mac app), or a self-contained `tools/ide/package.sh`
  (keeps repokit Node-only; the Mac-only step stays beside the Mac-only
  code). Either way it is the one D3 entry point.
- **Blocks**: D3 implementation start.

### Q-5: Auto-update mechanism now or later?
- **Why it matters**: a bare DMG means manual updates. Sparkle adds real
  complexity (appcast hosting, EdDSA keys) — likely a later ADR once a
  site exists; but deciding "none for v1, check-for-update menu item that
  opens the downloads page" vs "nothing at all" shapes the first release's
  Help menu.
- **Blocks**: nothing in D2/D3; blocks only the Help-menu content.

## Session

Drafted 2026-07-27, session 8a8c83, immediately after ADR-277's
implementation and the 4.2.0 platform bump
(`docs/context/session-20260727-1640-main.md`).
