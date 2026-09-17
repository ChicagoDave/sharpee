#!/usr/bin/env python3
"""patch-apphost.py <apphost> <new-relative-path>

Rewrites the .NET AppHost's embedded app-path field in place, so hostfxr
resolves the managed payload somewhere other than the AppHost's own directory.

The SDK's HostWriter patches a 1024-byte buffer (initialised to the literal
"c3ab8ff13720e8ad9047dd39466b3c89") with the path of the managed entry
assembly, relative to the AppHost. Repointing it is what lets an Apple-conformant
bundle keep Contents/MacOS native-only while the payload lives in
Contents/Resources.

The field is located by SEARCHING for the current value, never by seeking a
fixed offset: the offset is an artefact of the SDK version and the app name, and
a stale constant would corrupt a binary silently. Measured on the production
PaneHost AppHost 2026-09-16: one occurrence at 66088 with 13 bytes of clear zero
padding, the same offset the ADR-351 Q-5 spike saw -- stable in fact, but not
relied upon.

Exits non-zero if the field cannot be located unambiguously, or if the new path
does not fit in the zero padding that follows the current value.

Public interface: two positional arguments. Modifies <apphost> in place.
Owner context: tools/ide -- macOS release tooling for the Avalonia desktop head.
Ported from the ADR-351 Q-5 spike 2026-09-16; the recipe's evidence is
docs/work/velopack-macos-bundle-layout/decision.md.
"""
import sys

if len(sys.argv) != 3:
    sys.exit(__doc__.strip().splitlines()[0])

host, new = sys.argv[1], sys.argv[2]
blob = bytearray(open(host, "rb").read())

# The field currently holds the entry assembly's name; the new path ends in
# that same name, so derive the needle rather than hard-coding one app.
needle = new.rsplit("/", 1)[-1].encode() + b"\x00"
hits = []
start = 0
while True:
    i = blob.find(needle, start)
    if i < 0:
        break
    hits.append(i)
    start = i + 1

if len(hits) != 1:
    sys.exit(f"expected exactly one embedded app-path field, found {len(hits)} at {hits}")

off = hits[0]
payload = new.encode() + b"\x00"

# The field must be followed by enough zero padding to hold the longer path.
tail = blob[off + len(needle): off + len(payload)]
if any(tail):
    sys.exit(f"not enough zero padding at {off}: would overwrite live data")

blob[off:off + len(payload)] = payload
open(host, "wb").write(blob)
print(f"patch-apphost: offset {off}: {needle[:-1].decode()!r} -> {new!r}")
