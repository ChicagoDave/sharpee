#!/usr/bin/env bash
#
# naive-setup.sh — prepare a container for a naive-reader run of The Chord
# Manual, so the reader never needs sudo and the brief's SETUP is only a check.
#
# Public interface:
#   docs/work/archive/chord-manual/naive-setup.sh <container-name>
#     e.g. docs/work/archive/chord-manual/naive-setup.sh chord-naive-4
#   Run from the host, from anywhere inside the repository, before the prompt
#   is given. Exits non-zero, naming the step, if any step fails.
#
# What it does, in order:
#   1. Creates <container-name> from the image devarch-claude:latest. Refuses
#      if a container of that name already exists: it never reuses or removes
#      one, because a naive run must start from a fresh box.
#   2. Copies in the PDF, the 43 companion folders and the brief.
#   3. As root: updates Claude Code to the latest release, in /usr/local where
#      the image keeps it.
#   4. As the run's user (node): points npm's global prefix at ~/.local, and
#      installs Playwright and its Chromium in ~/tools/playwright.
#   5. As root: installs the system libraries Chromium needs, and (5a) the
#      PDF tools the reader opens the book with (poppler-utils) and unzip. Steps 3 and 5
#      need root, and they are the reason this script exists.
#   6. As node: prints the Claude Code version, launches Chromium once and
#      closes it, then prints what a run needs to be true.
#
# It does not install the `sharpee` command (chapter 4 does that) and does not
# start the run.
#
# Owner context: the Chord manual's Phase 8 (docs/work/archive/chord-manual/plan.md).

set -euo pipefail

IMAGE="devarch-claude:latest"
RUN_USER="node"
RUN_HOME="/home/node"

if [ "$#" -ne 1 ] || [ -z "$1" ]; then
  echo "usage: naive-setup.sh <container-name>   (e.g. chord-naive-4)" >&2
  exit 2
fi
NAME="$1"

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
EDITION="${REPO_ROOT}/docs/book/chord-v4.1.0"
OUTPUT_NAME="$(tr -d '[:space:]' < "${EDITION}/output-name")"
PDF="${EDITION}/build/${OUTPUT_NAME}.pdf"
COMPANION="${REPO_ROOT}/tutorials/relighting/chord-v4.1.0"
BRIEF="${REPO_ROOT}/docs/work/archive/chord-manual/naive-prompt.txt"

step() { echo; echo "== $1"; }
fail() { echo "naive-setup: FAILED at: $1" >&2; exit 1; }

# Invariants: every input exists before anything is created.
[ -f "${PDF}" ] || fail "PDF missing at ${PDF} (run ./scripts/build-book.sh chord-v4.1.0 pdf)"
[ -d "${COMPANION}" ] || fail "companion folders missing at ${COMPANION}"
[ -f "${BRIEF}" ] || fail "brief missing at ${BRIEF}"
docker image inspect "${IMAGE}" > /dev/null 2>&1 || fail "image ${IMAGE} not found"
if docker container inspect "${NAME}" > /dev/null 2>&1; then
  fail "a container named ${NAME} already exists; pick a new name"
fi

as_user() { docker exec -u "${RUN_USER}" "${NAME}" bash -lc "$1"; }
as_root() { docker exec -u root "${NAME}" bash -lc "$1"; }

step "1. create ${NAME} from ${IMAGE}"
docker run -d -it --name "${NAME}" "${IMAGE}" bash -l > /dev/null || fail "docker run"

step "2. copy the PDF, the companion folders and the brief"
as_user "mkdir -p ${RUN_HOME}/repos/book-test" || fail "mkdir book-test"
docker cp "${PDF}" "${NAME}:${RUN_HOME}/repos/book-test/" || fail "copy PDF"
docker cp "${COMPANION}" "${NAME}:${RUN_HOME}/repos/book-test/companion" || fail "copy companion"
# The host's companion folders may hold ignored build output (dist/) from an
# earlier build; the box gets the folders as the site serves them, without it.
as_root "find ${RUN_HOME}/repos/book-test/companion -type d -name dist -prune -exec rm -rf {} +" || fail "drop build output from companion"
docker cp "${BRIEF}" "${NAME}:${RUN_HOME}/repos/naive-prompt.txt" || fail "copy brief"
as_root "chown -R ${RUN_USER}:${RUN_USER} ${RUN_HOME}/repos" || fail "chown repos"

step "3. update Claude Code (as root: the image's copy lives under /usr/local)"
# Root, with the prefix named, so the one copy on the PATH is the one updated.
# Updating as the run's user would leave a second copy under ~/.local.
# --allow-scripts: the image's npm blocks install scripts by default, and
# without its postinstall the package has no native binary and cannot start.
as_root "npm install -g --prefix /usr/local --allow-scripts=@anthropic-ai/claude-code @anthropic-ai/claude-code@latest" || fail "update Claude Code"

step "4. npm prefix, Playwright and Chromium (as ${RUN_USER})"
as_user "npm config set prefix ${RUN_HOME}/.local && mkdir -p ${RUN_HOME}/.local/lib/node_modules ${RUN_HOME}/.local/bin" || fail "npm prefix"
as_user "mkdir -p ${RUN_HOME}/tools/playwright && cd ${RUN_HOME}/tools/playwright && npm init -y > /dev/null && npm install playwright && npx playwright install chromium" || fail "install Playwright"

step "5. Chromium's system libraries (as root)"
as_root "cd ${RUN_HOME}/tools/playwright && npx playwright install-deps chromium" || fail "playwright install-deps"

step "5a. the PDF tools the reader opens the book with, and unzip (as root)"
# poppler-utils gives pdftoppm, which Claude Code needs to read a PDF's pages,
# and pdftotext. Chapter 40 unzips the published story with the unzip
# command. The image has none of these, and the reader cannot install them.
as_root "apt-get install -y --no-install-recommends poppler-utils unzip" || fail "install poppler-utils and unzip"

step "6. checks (as ${RUN_USER})"
as_user "claude --version > /dev/null && echo \"claude: \$(claude --version) at \$(command -v claude)\"; if [ -e ${RUN_HOME}/.local/bin/claude ]; then echo 'claude: a second copy sits under ~/.local/bin'; exit 1; fi" || fail "Claude Code check"
as_user "cd ${RUN_HOME}/tools/playwright && node -e \"const { chromium } = require('playwright'); chromium.launch().then(b => b.close()).then(() => console.log('chromium: launches'));\"" || fail "Chromium launch"
as_user "command -v pdftoppm > /dev/null && command -v pdftotext > /dev/null && command -v unzip > /dev/null && echo 'pdf tools and unzip: present'" || fail "PDF tools and unzip check"
as_user "echo \"npm prefix: \$(npm config get prefix)\"; echo \"companion folders: \$(ls ${RUN_HOME}/repos/book-test/companion | wc -l | tr -d ' ')\"; ls ${RUN_HOME}/repos/book-test/*.pdf; ls ${RUN_HOME}/repos/naive-prompt.txt; if command -v sharpee > /dev/null; then echo 'sharpee: INSTALLED (it should not be)'; exit 1; else echo 'sharpee: not installed, as it should be'; fi" || fail "final checks"

echo
echo "naive-setup: ${NAME} is ready. Log in to Claude Code in it and give it ~/repos/naive-prompt.txt."
