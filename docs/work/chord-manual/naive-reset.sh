#!/usr/bin/env bash
#
# naive-reset.sh — return a used naive-reader container to the state
# naive-setup.sh leaves a new one in, keeping only the Claude Code login, so
# the next run needs no new container and no new login.
#
# Public interface:
#   docs/work/chord-manual/naive-reset.sh <container-name>
#     e.g. docs/work/chord-manual/naive-reset.sh chord-naive-15
#   Run from the host, from anywhere inside the repository, after a run's log
#   has been copied out. Exits non-zero, naming the step, if any step fails.
#
# The one thing that matters: nothing the previous reader wrote may survive.
# A reader that can find an earlier run's transcript, memory, project folder
# or installed command is not naive, and its run proves nothing. So the reset
# works from a list of what is KEPT, and removes everything else the run's
# user can write to. What is kept:
#   - ~/.claude/.credentials.json   the login
#   - ~/.claude/settings.json       the theme and model chosen at login
#   - ~/.claude/.claude.json        cut down to the keys named in KEEP_KEYS
#                                   below: the account and the onboarding
#                                   marks, and nothing of any project
#   - ~/tools/playwright            only node_modules, package.json and
#                                   package-lock.json, as naive-setup.sh
#                                   installed them
#   - ~/.cache/ms-playwright, ~/.cache/fontconfig
#   - ~/.npmrc, the shell's dotfiles, and the image's own ~/scripts,
#     ~/.config and ~/.devarch
#
# What it does, in order:
#   1. Refuses unless the container exists, was made by naive-setup.sh
#      (Playwright is in ~/tools), holds a login, and has no Claude Code
#      process running in it.
#   2. Restarts the container, which ends anything the run left running
#      (a `serve` on a port, a browser).
#   3. As root: removes everything in the run user's home that is not kept,
#      empties /tmp, /var/tmp and /dev/shm, and recreates the empty folders a
#      new container has.
#   4. As the run's user: cuts ~/.claude/.claude.json down to KEEP_KEYS.
#   5. Copies in the PDF, the 43 companion folders and the brief, as
#      naive-setup.sh does, and updates Claude Code.
#   6. Checks: prints everything left under ~/.claude and ~/repos, and fails
#      if a transcript, a history file, a project record, the `sharpee`
#      command or an old execution log is still there.
#
# It does not start the run.
#
# Owner context: the Chord manual's Phase 8 (docs/work/chord-manual/plan.md).

set -euo pipefail

RUN_USER="node"
RUN_HOME="/home/node"

# The keys of ~/.claude/.claude.json that survive. Everything else in the
# file is dropped: `projects` (which records the folder the last run worked
# in and its last session), the tip and notification history, and the caches,
# which Claude Code fetches again.
KEEP_KEYS="oauthAccount userID hasCompletedOnboarding lastOnboardingVersion migrationVersion opusProMigrationComplete"

if [ "$#" -ne 1 ] || [ -z "$1" ]; then
  echo "usage: naive-reset.sh <container-name>   (e.g. chord-naive-15)" >&2
  exit 2
fi
NAME="$1"

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
EDITION="${REPO_ROOT}/docs/book/chord-v4.1.0"
OUTPUT_NAME="$(tr -d '[:space:]' < "${EDITION}/output-name")"
PDF="${EDITION}/build/${OUTPUT_NAME}.pdf"
COMPANION="${REPO_ROOT}/tutorials/relighting/chord-v4.1.0"
BRIEF="${REPO_ROOT}/docs/work/chord-manual/naive-prompt.txt"

step() { echo; echo "== $1"; }
fail() { echo "naive-reset: FAILED at: $1" >&2; exit 1; }

as_user() { docker exec -u "${RUN_USER}" "${NAME}" bash -lc "$1"; }
as_root() { docker exec -u root "${NAME}" bash -lc "$1"; }

# Invariants: every input exists, and the container is one this script may
# empty, before anything is removed.
[ -f "${PDF}" ] || fail "PDF missing at ${PDF} (run ./scripts/build-book.sh chord-v4.1.0 pdf)"
[ -d "${COMPANION}" ] || fail "companion folders missing at ${COMPANION}"
[ -f "${BRIEF}" ] || fail "brief missing at ${BRIEF}"

step "1. ${NAME} is a naive-run container, logged in, with no run in progress"
docker container inspect "${NAME}" > /dev/null 2>&1 || fail "no container named ${NAME}"
[ "$(docker container inspect -f '{{.State.Running}}' "${NAME}")" = "true" ] || docker start "${NAME}" > /dev/null || fail "start ${NAME}"
as_user "[ -d ${RUN_HOME}/tools/playwright/node_modules/playwright ]" || fail "${NAME} has no ~/tools/playwright; it was not made by naive-setup.sh"
as_user "[ -s ${RUN_HOME}/.claude/.credentials.json ]" || fail "${NAME} holds no Claude Code login; there is nothing to keep, so make a new container with naive-setup.sh"
# The names of every running process, read from /proc so that no tool the
# image may lack is needed. A process named `claude` is a run in progress.
if as_root "cat /proc/[0-9]*/comm 2> /dev/null | grep -qx claude"; then
  fail "Claude Code is running in ${NAME}; a run is in progress, or its session is still open. Quit it first"
fi

step "2. restart ${NAME}, ending whatever the run left running"
docker restart "${NAME}" > /dev/null || fail "docker restart"

step "3. remove everything the run's user could write, except what is kept (as root)"
# Home: every entry not on the kept list goes. The list is spelled out here
# and nowhere else, so a new kind of leftover is removed without being named.
as_root "cd ${RUN_HOME} && find . -mindepth 1 -maxdepth 1 \
  ! -name .bash_logout ! -name .bashrc ! -name .profile ! -name .npmrc \
  ! -name .config ! -name .devarch ! -name scripts ! -name tools \
  ! -name .cache ! -name .claude ! -name repos \
  -exec rm -rf {} +" || fail "empty the home folder"
# ~/repos is emptied and never removed: it is the folder every command in the
# container starts in, and with it gone no later step can run.
as_root "cd ${RUN_HOME}/repos && find . -mindepth 1 -maxdepth 1 -exec rm -rf {} +" || fail "empty ~/repos"
as_root "cd ${RUN_HOME}/.cache && find . -mindepth 1 -maxdepth 1 ! -name ms-playwright ! -name fontconfig -exec rm -rf {} +" || fail "empty ~/.cache"
# ~/tools is kept for Playwright alone. A reader writes its browser scripts
# and screenshots beside it (run 13's were still there for run 14's reader to
# see), so everything but the install's own three entries goes.
as_root "cd ${RUN_HOME}/tools && find . -mindepth 1 -maxdepth 1 ! -name playwright -exec rm -rf {} +" || fail "empty ~/tools"
as_root "cd ${RUN_HOME}/tools/playwright && find . -mindepth 1 -maxdepth 1 ! -name node_modules ! -name package.json ! -name package-lock.json -exec rm -rf {} +" || fail "empty ~/tools/playwright"
as_root "cd ${RUN_HOME}/.claude && find . -mindepth 1 -maxdepth 1 ! -name .credentials.json ! -name settings.json ! -name .claude.json -exec rm -rf {} +" || fail "empty ~/.claude"
as_root "find /tmp /var/tmp /dev/shm /run/lock -mindepth 1 -maxdepth 1 -exec rm -rf {} +" || fail "empty the temporary folders"
as_user "mkdir -p ${RUN_HOME}/.local/lib/node_modules ${RUN_HOME}/.local/bin ${RUN_HOME}/repos/book-test" || fail "recreate the empty folders"

step "4. cut ~/.claude/.claude.json down to the account and the onboarding marks"
docker exec -i -u "${RUN_USER}" -e KEEP_KEYS="${KEEP_KEYS}" "${NAME}" node - <<'EOF' || fail "trim .claude.json"
const fs = require('fs');
const file = '/home/node/.claude/.claude.json';
if (fs.existsSync(file)) {
  const whole = JSON.parse(fs.readFileSync(file, 'utf8'));
  const kept = {};
  for (const key of process.env.KEEP_KEYS.split(' ')) {
    if (key in whole) kept[key] = whole[key];
  }
  fs.writeFileSync(file, JSON.stringify(kept, null, 2) + '\n', { mode: 0o600 });
  console.log('.claude.json keeps: ' + Object.keys(kept).join(', '));
} else {
  console.log('.claude.json: absent');
}
EOF

step "5. copy the PDF, the companion folders and the brief; update Claude Code"
docker cp "${PDF}" "${NAME}:${RUN_HOME}/repos/book-test/" || fail "copy PDF"
docker cp "${COMPANION}" "${NAME}:${RUN_HOME}/repos/book-test/companion" || fail "copy companion"
as_root "find ${RUN_HOME}/repos/book-test/companion -type d -name dist -prune -exec rm -rf {} +" || fail "drop build output from companion"
docker cp "${BRIEF}" "${NAME}:${RUN_HOME}/repos/naive-prompt.txt" || fail "copy brief"
as_root "chown -R ${RUN_USER}:${RUN_USER} ${RUN_HOME}/repos" || fail "chown repos"
as_root "npm install -g --prefix /usr/local --allow-scripts=@anthropic-ai/claude-code @anthropic-ai/claude-code@latest" || fail "update Claude Code"
# The update runs as root and may leave root's npm files in /tmp.
as_root "find /tmp -mindepth 1 -maxdepth 1 -exec rm -rf {} +" || fail "empty /tmp after the update"

step "6. checks (as ${RUN_USER})"
echo "everything under ~/.claude:"
as_user "cd ${RUN_HOME}/.claude && find . -mindepth 1 | sort"
echo "everything in ~/repos and ~/repos/book-test:"
as_user "ls -A ${RUN_HOME}/repos ${RUN_HOME}/repos/book-test"
# Each of these is something a reader could learn an earlier run from.
as_user "[ -z \"\$(find ${RUN_HOME}/.claude -mindepth 1 ! -name .credentials.json ! -name settings.json ! -name .claude.json)\" ]" || fail "something besides the three kept files is under ~/.claude"
as_user "! grep -q '\"projects\"' ${RUN_HOME}/.claude/.claude.json" || fail ".claude.json still has a projects record"
as_user "[ \"\$(ls -A ${RUN_HOME}/tools | tr '\n' ' ')\" = 'playwright ' ] && [ \"\$(ls -A ${RUN_HOME}/tools/playwright | sort | tr '\n' ' ')\" = 'node_modules package-lock.json package.json ' ]" || fail "~/tools holds more than the Playwright install"
as_user "[ \"\$(ls -A ${RUN_HOME}/repos | sort | tr '\n' ' ')\" = 'book-test naive-prompt.txt ' ]" || fail "~/repos holds more than book-test and the brief"
as_user "[ \"\$(ls -A ${RUN_HOME}/repos/book-test | sort | tr '\n' ' ')\" = 'companion ${OUTPUT_NAME}.pdf ' ]" || fail "~/repos/book-test holds more than the PDF and the companion folders"
as_user "[ -z \"\$(ls -A /tmp /var/tmp /dev/shm | grep -v ':\$' | grep -v '^\$' | grep -v '^node-compile-cache\$')\" ]" || fail "a temporary folder is not empty"
as_user "if command -v sharpee > /dev/null; then echo 'sharpee: INSTALLED (it should not be)'; exit 1; else echo 'sharpee: not installed, as it should be'; fi" || fail "sharpee check"
as_user "[ -z \"\$(ls -A ${RUN_HOME}/.local/bin ${RUN_HOME}/.local/lib/node_modules | grep -v ':\$' | grep -v '^\$')\" ]" || fail "~/.local is not empty"
as_user "[ -s ${RUN_HOME}/.claude/.credentials.json ] && echo 'login: kept'" || fail "the login was lost"
as_user "claude --version > /dev/null && echo \"claude: \$(claude --version) at \$(command -v claude)\"; if [ -e ${RUN_HOME}/.local/bin/claude ]; then echo 'claude: a second copy sits under ~/.local/bin'; exit 1; fi" || fail "Claude Code check"
as_user "cd ${RUN_HOME}/tools/playwright && node -e \"const { chromium } = require('playwright'); chromium.launch().then(b => b.close()).then(() => console.log('chromium: launches'));\"" || fail "Chromium launch"
as_user "command -v pdftoppm > /dev/null && command -v pdftotext > /dev/null && command -v unzip > /dev/null && echo 'pdf tools and unzip: present'" || fail "PDF tools and unzip check"
as_user "echo \"npm prefix: \$(npm config get prefix)\"; echo \"companion folders: \$(ls ${RUN_HOME}/repos/book-test/companion | wc -l | tr -d ' ')\""  || fail "final checks"

echo
echo "naive-reset: ${NAME} is ready. Start Claude Code in it and give it ~/repos/naive-prompt.txt."
