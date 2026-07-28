# Vendored Node runtime (ADR-279 D4)

Chord Writer ships a Node runtime inside its own app bundle so Cmd-B works on a
machine with no Node, no npm, and no Sharpee checkout. These are the bytes that
end up in `Chord Writer.app/Contents/Resources/toolchain/node/bin/node`, signed
and notarized along with the rest of the app.

| | |
| --- | --- |
| Version | **v22.23.1** (Node 22 "Jod" LTS, released 2026-06-22) |
| Platform | **darwin-arm64 only** |
| Form | official `.tar.xz` from nodejs.org, committed as-is |
| Source | <https://nodejs.org/dist/v22.23.1/node-v22.23.1-darwin-arm64.tar.xz> |
| Checksum | `SHASUMS256.txt`, copied verbatim from <https://nodejs.org/dist/v22.23.1/SHASUMS256.txt> |

## Why the compressed archive rather than the binary

`bin/node` is **112.9 MB** uncompressed — past GitHub's hard 100 MB per-file
limit, so it cannot be committed raw without Git LFS, and adopting LFS would
mean every contributor needs `git-lfs` installed just to clone. The official
`.tar.xz` is 25.9 MB, well inside the limits, and carries a publisher checksum
we can verify. `vendor-toolchain.sh` extracts `bin/node` from it at build time
and nothing is fetched from the network.

## Why arm64 only

macOS 26 (Tahoe) is the last release to support Intel, and only four Intel
models can run it at all — MacBook Pro 16" (2019), MacBook Pro 13" (2020,
four-port), iMac 27" (2020), and Mac Pro (2019). The app's deployment target is
already 26.0. Shipping an x86_64 slice would add ~113 MB to every download to
serve authors on five-to-seven-year-old hardware. `project.yml` pins
`ARCHS: arm64` to match, so the app never ships a slice with no toolchain
behind it.

If that call is ever revisited, both sides move together: vendor the
`darwin-x64` tarball here, teach `vendor-toolchain.sh` to place both under
`toolchain/node/<arch>/`, and drop the `ARCHS` pin.

## Updating the runtime

1. Download the new tarball and the release's `SHASUMS256.txt` from nodejs.org.
2. Verify: `shasum -a 256 -c SHASUMS256.txt` — never hand-edit the checksum file.
3. Replace the tarball here and keep only the matching line in `SHASUMS256.txt`.
4. Bump `NODE_VERSION` in `tools/ide/vendor-toolchain.sh` in the same commit —
   the script hard-fails on a version/file mismatch rather than silently
   bundling the old runtime.
5. Re-run the real-path test: `tools/ide/toolchain-realpath-test.sh <resources-dir>`.

`git rm` the old tarball in the same commit. The bytes stay in history either
way, so avoid gratuitous bumps — track the Node 22 LTS line and move when there
is a reason to.
