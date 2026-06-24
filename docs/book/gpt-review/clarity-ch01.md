# Clarity review — Chapter 1: Installing Sharpee

Flag count: 1

### 1. "Building the story" — vague
WHY: "a true no-op is rare" hand-waves why the stale-build advice exists without saying the actual cause or the actual fix. The promoted clause should say what to do and why it works.
OLD: Whenever you change the story, `sharpee build` again. (If a build ever looks
stale, delete `dist/` and rebuild — `build` checks that each step actually emits
output, so a true no-op is rare.)
NEW: Whenever you change the story, `sharpee build` again. (If a build ever looks
stale, delete `dist/` and rebuild from a clean slate; `build` already checks that
each step emits output, so a stale `dist/` rarely survives a rebuild on its own.)
