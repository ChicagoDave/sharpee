# Vendored Node runtime (ADR-279 D4)

Chord Writer ships a Node runtime inside its own app bundle so Cmd-B works on a
machine with no Node, no npm, and no Sharpee checkout. These are the bytes that
end up at `toolchain/node/bin/node` (`node.exe` on Windows) inside the shipped
app, signed and notarized along with the rest of it on macOS.

| | |
| --- | --- |
| Version | **v22.23.1** (Node 22 "Jod" LTS, released 2026-06-22) |
| Platforms | **darwin-arm64, darwin-x64, win-x64, linux-x64** |
| Form | official archive from nodejs.org, committed as-is |
| Checksums | `SHASUMS256.txt`, lines copied verbatim from <https://nodejs.org/dist/v22.23.1/SHASUMS256.txt> |

| Platform | Archive | Member extracted | Lands at |
| --- | --- | --- | --- |
| darwin-arm64 | `node-v22.23.1-darwin-arm64.tar.xz` | `bin/node` | `node/bin/node` |
| darwin-x64 | `node-v22.23.1-darwin-x64.tar.xz` | `bin/node` | `node/bin/node` |
| linux-x64 | `node-v22.23.1-linux-x64.tar.xz` | `bin/node` | `node/bin/node` |
| win-x64 | `node-v22.23.1-win-x64.zip` | `node.exe` (at the dist ROOT, not under `bin/`) | `node/bin/node.exe` |

Windows is the one row whose archive layout differs from where the file lands.
The official zip puts `node.exe` at the distribution root; the toolchain places
it under `node/bin/` anyway, so that the launcher, the seal scan, and PaneHost's
resolution differ between platforms by a **filename** rather than by a path
shape. One layout, platform-specific leaf.

## Why the compressed archive rather than the binary

`bin/node` is **112.9 MB** uncompressed, and `node.exe` is **86.9 MB** — both
past GitHub's hard 100 MB per-file limit (node.exe is under it, but only just,
and it is the same argument). Committing them raw would need Git LFS, and
adopting LFS would mean every contributor needs `git-lfs` installed just to
clone. The official archives are 25.9–35.7 MB, well inside the limits, and carry
a publisher checksum we can verify. `vendor-toolchain.sh` extracts the runtime
at build time and nothing is fetched from the network.

## Why these four and not more

**Two macOS arches** because Chord Writer ships as separate per-arch installers
rather than a universal binary (David, 2026-08-13): a universal app would carry
one toolchain that is wrong for half the machines it runs on. Both darwin
runtimes are minos 11.0, so the deployment target is 11.0 for both and the
toolchain reaches as far as the app does on either.

**`linux-arm64` is deliberately absent** (David, 2026-09-16). It is out of scope
for the cross-platform pass; adding it later means vendoring one more tarball
here and one more case in the script's target table, nothing structural.

## Updating the runtime

1. Download the new archives and the release's `SHASUMS256.txt` from nodejs.org.
2. Verify: `shasum -a 256 -c SHASUMS256.txt` — never hand-edit the checksum file.
3. Replace the archives here and keep only the matching lines in `SHASUMS256.txt`.
4. Bump `NODE_VERSION` in `tools/ide/vendor-toolchain.sh` in the same commit —
   the script hard-fails on a version/file mismatch rather than silently
   bundling the old runtime.
5. Re-run the real-path test: `tools/ide/toolchain-realpath-test.sh <resources-dir>`.

`git rm` the old archives in the same commit. The bytes stay in history either
way, so avoid gratuitous bumps — track the Node 22 LTS line and move when there
is a reason to.
