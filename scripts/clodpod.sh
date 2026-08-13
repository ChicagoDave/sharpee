#!/bin/bash
# setup-claude-tart.sh — Set up a Tart macOS VM sandbox for running Claude Code
# full-throttle (no permission prompts) with Xcode, isolated from your host.
#
# Run this ON YOUR MAC (Terminal), not inside any VM:
#   bash setup-claude-tart.sh
#
# What it does:
#   1. Checks you're on Apple Silicon and have enough disk
#   2. Installs Tart via Homebrew
#   3. Installs clodpod (Tart wrapper purpose-built for AI agents; VM includes Xcode)
#   4. Adds the `clod` alias to your shell profile
#
set -euo pipefail

CLODPOD_DIR="${CLODPOD_DIR:-$HOME/projects/clodpod}"

info()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn()  { printf '\033[1;33mWARNING:\033[0m %s\n' "$*"; }
fail()  { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# --- 1. Sanity checks -------------------------------------------------------

[[ "$(uname -s)" == "Darwin" ]] || fail "This script must run on macOS (your Mac mini), not in a Linux VM or cloud shell."
[[ "$(uname -m)" == "arm64"  ]] || fail "Tart requires Apple Silicon (M1 or later)."

# The Xcode image is large: ~60+ GB unpacked. Warn below 120 GB free.
free_gb=$(df -g / | awk 'NR==2 {print $4}')
if (( free_gb < 120 )); then
  warn "Only ${free_gb} GB free on disk. The macOS+Xcode VM image needs ~60-80 GB."
  read -r -p "Continue anyway? [y/N] " ans
  [[ "$ans" =~ ^[Yy] ]] || exit 1
fi

# --- 2. Install Tart --------------------------------------------------------

if ! command -v brew >/dev/null 2>&1; then
  fail "Homebrew not found. Install it first: https://brew.sh"
fi

if command -v tart >/dev/null 2>&1; then
  info "Tart already installed: $(tart --version)"
else
  info "Installing Tart..."
  brew install cirruslabs/cli/tart
fi

# --- 3. Install clodpod -----------------------------------------------------

if [[ -d "$CLODPOD_DIR/.git" ]]; then
  info "clodpod already present at $CLODPOD_DIR — updating..."
  git -C "$CLODPOD_DIR" pull --ff-only || warn "Could not update clodpod; continuing with existing copy."
else
  info "Cloning clodpod to $CLODPOD_DIR..."
  mkdir -p "$(dirname "$CLODPOD_DIR")"
  git clone https://github.com/webcoyote/clodpod "$CLODPOD_DIR"
fi

# --- 4. Add the `clod` alias ------------------------------------------------

alias_line="alias clod=\"$CLODPOD_DIR/clod\""
shell_rc="$HOME/.zshrc"
[[ "${SHELL:-}" == */bash ]] && shell_rc="$HOME/.bash_profile"

if grep -qsF 'alias clod=' "$shell_rc"; then
  info "clod alias already in $shell_rc"
else
  info "Adding clod alias to $shell_rc"
  printf '\n# clodpod: run AI agents in an isolated Tart macOS VM\n%s\n' "$alias_line" >> "$shell_rc"
fi

# --- Done -------------------------------------------------------------------

cat <<'EOF'

  ─────────────────────────────────────────────────────────────
  Setup complete. Next steps:

    1. Open a new Terminal window (to pick up the alias)
    2. cd into your Xcode project directory
    3. Run:   clod claude

  First run downloads the macOS+Xcode VM image (tens of GB —
  grab a coffee). After that, VMs clone in seconds via APFS
  copy-on-write.

  Inside the VM, Claude Code can run with permission prompts
  disabled — it only sees the project folders you mapped in,
  never your real home directory, keychain, or SSH keys.
  ─────────────────────────────────────────────────────────────
EOF