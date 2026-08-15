#!/bin/bash
# fetch-sparkle-tools.sh — put Sparkle's release tools where package.sh can find
# them (ADR-279 D7).
#
# Fetches the pinned Sparkle distribution, verifies its checksum, and extracts
# the three tools the release pipeline needs into tools/ide/.sparkle-tools/:
#
#   sign_update       EdDSA-signs an update archive with the keychain private key
#   generate_appcast  builds/updates appcast.xml from a directory of archives
#   generate_keys     key generation, export (-x) and import (-f)
#
# Public interface: run with no arguments. Idempotent — re-running with the tools
#   already present and the right version is a no-op. Pass --force to refetch.
# Owner context: tools/ide — release tooling.
#
# WHY FETCHED RATHER THAN COMMITTED. These are ~5MB of signed Mach-O binaries
# that change only when Sparkle releases. Committing them would put binaries in
# a source tree that has none, and would make a Sparkle bump a large diff that
# reviews as noise. Fetching with a pinned version AND a pinned checksum gives
# the property that actually matters: everyone gets the same bytes, and a
# tampered or swapped-out download fails loudly instead of silently signing
# releases with an unknown tool.
#
# WHY THE CHECKSUM IS NOT OPTIONAL. sign_update is handed the private key that
# authenticates every update Chord Writer will ever install. A compromised
# signing tool is the single worst outcome in this pipeline — worse than a
# compromised release, because it forges trust for all subsequent ones. The
# version pin says which Sparkle; the checksum says whether it is really Sparkle.

set -euo pipefail

readonly SPARKLE_VERSION="2.9.5"
# sha256 of Sparkle-2.9.5.tar.xz, recorded 2026-08-15 from the GitHub release
# asset. Update BOTH this and SPARKLE_VERSION together, never one alone.
readonly SPARKLE_SHA256="015336b601493e05c237964954bff6191370003d94edefe663724c88840d73cc"
readonly SPARKLE_URL="https://github.com/sparkle-project/Sparkle/releases/download/${SPARKLE_VERSION}/Sparkle-${SPARKLE_VERSION}.tar.xz"

readonly IDE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly TOOLS_DIR="$IDE_DIR/.sparkle-tools"
readonly STAMP="$TOOLS_DIR/.version"
readonly TOOLS=(sign_update generate_appcast generate_keys)

die() { printf 'error: %s\n' "$1" >&2; exit 1; }

force=0
[ "${1:-}" = "--force" ] && force=1

# Already have the right version? Check the stamp AND every tool — a partial
# extraction that left the stamp behind would otherwise look complete.
if [ "$force" -eq 0 ] && [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$SPARKLE_VERSION" ]; then
  complete=1
  for tool in "${TOOLS[@]}"; do
    [ -x "$TOOLS_DIR/$tool" ] || complete=0
  done
  if [ "$complete" -eq 1 ]; then
    echo "Sparkle $SPARKLE_VERSION tools already present in $TOOLS_DIR"
    exit 0
  fi
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Braces are load-bearing, not style: without them a following multibyte
# character (an ellipsis, here) can be absorbed into the variable name under a
# non-UTF-8 locale, and `set -u` then fails on a name that reads as correct.
echo "Fetching Sparkle ${SPARKLE_VERSION}..."
curl -sSL --fail -o "$work/sparkle.tar.xz" "$SPARKLE_URL" \
  || die "could not download $SPARKLE_URL"

actual="$(shasum -a 256 "$work/sparkle.tar.xz" | awk '{print $1}')"
[ "$actual" = "$SPARKLE_SHA256" ] || die "checksum mismatch for Sparkle $SPARKLE_VERSION.
  expected $SPARKLE_SHA256
  got      $actual
  Refusing to extract. Either the pin is stale (update SPARKLE_SHA256 alongside
  SPARKLE_VERSION) or the download is not the release it claims to be."

for tool in "${TOOLS[@]}"; do
  tar -xJf "$work/sparkle.tar.xz" -C "$work" "./bin/$tool" \
    || die "the distribution has no bin/$tool — did Sparkle's layout change?"
done

mkdir -p "$TOOLS_DIR"
for tool in "${TOOLS[@]}"; do
  cp "$work/bin/$tool" "$TOOLS_DIR/$tool"
  chmod +x "$TOOLS_DIR/$tool"
done
printf '%s\n' "$SPARKLE_VERSION" > "$STAMP"

# Assert the artifact rather than trusting the exit codes above — the same
# discipline website/deploy.sh uses for its generated bundles. A copy loop that
# reports success while producing nothing usable looks identical to one that
# worked, and this is the tool that signs releases.
for tool in "${TOOLS[@]}"; do
  [ -x "$TOOLS_DIR/$tool" ] || die "$tool is missing or not executable after extraction."
done

echo "Sparkle $SPARKLE_VERSION tools installed in $TOOLS_DIR:"
for tool in "${TOOLS[@]}"; do
  printf '  %s\n' "$tool"
done
