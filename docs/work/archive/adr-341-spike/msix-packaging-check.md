# ADR-341 D2 spike — Phase 5, the D7 packaging check

**Result: MSIX is viable. Both checks PASS under a real signed package installed to
`C:\Program Files\WindowsApps`.**

**Run**: 2026-09-12 (UTC), session `89f9e0`. `tools/spikes/adr-341/msix-check/`.
**Environment**: Windows 11 Pro 10.0.26100, AMD64, .NET SDK 10.0.401, developer mode on.

D7 names two candidate delivery mechanisms — MSIX with its hosted appinstaller update
path, and a conventional installer plus an appcast-style updater — and says the spike
phase must run the vendored Node toolchain and ADR-280's real project folders under
MSIX's packaged filesystem, "because that result is what decides between them."

**This phase records the evidence only.** D7 is explicit that the installer choice is
made by the later shell plan, and nothing here decides it.

---

## What was built

A minimal Desktop-Bridge app (`Windows.FullTrustApplication`, `runFullTrust`) carrying a
**real vendored Node**: `node.exe` from `node-v22.23.1-win-x64`, 83 MB, the Windows
counterpart of what `tools/ide/vendor-toolchain.sh` vendors for macOS. The Node version
is read from that script (`NODE_VERSION="22.23.1"`) rather than chosen, so the check is
against the toolchain the project actually ships.

The app writes a report to `Documents\ADR-341 Spike Story\` instead of printing, because
a packaged app has no console attached — and because a report readable from outside the
package is itself part of check (b).

## Three runs, deliberately

A single packaged run would not have distinguished "MSIX is fine" from "my harness never
left the developer loop". Each run answers something the previous one could not:

| # | Mode | `packaged` | Install location | Why it was run |
| --- | --- | --- | --- | --- |
| 1 | Unpackaged `.exe` | `False` | build output | **Baseline.** Establishes what "no redirection" looks like and proves the harness detects package identity correctly rather than always reporting success. |
| 2 | `Add-AppxPackage -Register` (loose) | `True` | the layout folder | Packaged identity, but `IsDevelopmentMode: True` — **does not** test the ACL-locked install path. |
| 3 | **Signed `.msix`, installed** | `True` | **`C:\Program Files\WindowsApps\…`** | The real test. `IsDevelopmentMode: False`, `SignatureKind: Developer`. |

Run 2 is recorded rather than discarded because it is the run that looks conclusive and
is not: a loose registration leaves the payload in an ordinary directory, so check (a)
would pass there even if `WindowsApps` refused to execute a bundled binary.

The packaging chain: `makeappx pack` → 39 MB `.msix` from a 109 MB payload;
`New-SelfSignedCertificate` (code-signing EKU) → `signtool sign /fd SHA256`; the
certificate imported to `LocalMachine\TrustedPeople`; `Add-AppxPackage`.

---

## (a) The vendored Node toolchain — **PASS**

The question: MSIX installs into `C:\Program Files\WindowsApps`, which is ACL-locked and
has historically been hostile to executing bundled binaries. ADR-341 D6 accepts vendoring
a Node toolchain as the price of a native mirror, so if that path refuses to execute,
the mirror does not work under MSIX at all.

From the `WindowsApps` install:

```
node path : C:\Program Files\WindowsApps\Sharpee.Adr341.MsixCheck_1.0.0.0_x64__skvq0y9n7nny2\vendor\node.exe
exists    : True          size : 83.0 MB
exitCode  : 0
stdout    : {"v":"v22.23.1","arch":"x64","cwd":"C:\\windows\\system32"}
```

The vendored interpreter launched from the package payload, executed a script, and
returned its version and architecture. **No shim, no copy-to-temp, no extraction step.**

One observation worth carrying: the child process's **cwd is `C:\windows\system32`**,
not the package directory (the unpackaged baseline reported the project directory
instead). Harmless here, but a subprocess site that assumes its working directory
would break under packaging — and `tools/ide/SharpeeIDE` has **seven** subprocess sites
(`BuildRunner`, `ShellEnvironment`, `ComposeRunner`, `IntrospectionRunner`, `TestRunner`,
`WorldIndexRunner`, `ChordVersionCheck`). The Windows shell must set
`WorkingDirectory` explicitly at each of them rather than inherit it.

## (b) ADR-280's real project folders — **PASS**

The question: the macOS app is sandboxless and treats `~/Documents/<Story Title>/` as an
ordinary directory. MSIX's virtualized filesystem can silently redirect writes into the
package's private store — which reads as success from inside the app, and as "my story
folder is empty" to the author looking at Documents in Explorer.

```
Documents    : C:\Users\David\Documents
projectDir   : C:\Users\David\Documents\ADR-341 Spike Story
wrote+read   : OK
resolvedPath : C:\Users\David\Documents\ADR-341 Spike Story\story.chord
redirected   : False
```

No redirection: the resolved path contains neither `Packages\` nor `VirtualStore\`.

**And verified from outside the package**, which is the test that actually matters —
the author's editor, `git`, and cloud-sync client all live outside it. A sentinel file
written by the packaged app was read back by an ordinary non-packaged process:

```
C:\Users\David\Documents\ADR-341 Spike Story\visible-to-outside.txt
"if you can read this from outside the package, the folder is real"
```

**`runFullTrust` is what buys this.** A Desktop-Bridge app runs with the user's own
token, so the user's real folders behave normally. This is not the restricted
`documentsLibrary` capability — no broadFileSystemAccess declaration, no file-type
association, no Store-review-sensitive capability. ADR-280's project model survives
packaging **unchanged**.

---

## Integration Reality Statement (rule 13a)

**ADR-341 Phase 5 — MSIX packaging of a vendored toolchain**

- **OWNED**: the vendored `node-v22.23.1-win-x64` binary this repository would ship; the
  MSIX package and its manifest; the packaging chain (`makeappx`, `signtool`) this repo
  would run; ADR-280's project-folder contract.
- **EXTERNAL**: none. The Node download is from nodejs.org, but the binary under test is
  the one that would be vendored — it is owned once vendored.
- **REAL-PATH TEST**: run 3 — a **signed** `.msix`, installed by `Add-AppxPackage` to
  `C:\Program Files\WindowsApps`, `IsDevelopmentMode: False`, launched through its AUMID
  by the shell. The vendored Node was executed as a real subprocess from that location,
  and the project-folder write was verified by a separate, non-packaged reader.
- **STUB JUSTIFICATION**: none. No stub, fake, or mock was used. Runs 1 and 2 are not
  stubs but weaker configurations of the same real path, recorded to show what each
  fails to establish; the acceptance result is run 3's.

## What this does **not** establish

- **The update channel.** D7's two candidates differ in how they update — MSIX's hosted
  `.appinstaller` path against an appcast-style updater — and none of that was tested.
  This phase tested packaging and filesystem behaviour only.
- **Azure Trusted Signing.** Run 3 used a self-signed certificate trusted locally.
  D7 specifies Trusted Signing under David's account, which is a CI-and-identity
  question, not a packaging one.
- **Store submission.** Sideloading a signed package is not Store certification, and
  nothing here speaks to it.
- **A real story project.** The check wrote a sentinel and a `story.chord` stub, not a
  composed, built, playable Chord project. AC-4 (a story created on one platform opening
  on the other) is the shell plan's, not this phase's.

## Cleanup

The test package was uninstalled and the self-signed certificate removed from
`LocalMachine\TrustedPeople` after the run — a spike must not leave a signing
certificate trusted on the machine. `Documents\ADR-341 Spike Story\` was left in place;
it holds the report this document quotes.
