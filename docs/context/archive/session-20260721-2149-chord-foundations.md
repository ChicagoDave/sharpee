# Session Summary: 2026-07-21 - chord-foundations

**Goal**: Diagnose and fix SSH sessions to plover.net freezing/disconnecting shortly after connecting.
**Status**: COMPLETE
**Outcome**: Diagnosed as an idle-connection timeout (NAT/firewall in the path dropping silent connections, confirmed by user as freeze/disconnect not hang-then-reconnect); fixed with client-side SSH keepalives added to the user's Mac `~/.ssh/config`, script run successfully.

**Files modified**: scratchpad/fix-ssh-keepalive.sh (created, in-repo); ~/.ssh/config (modified on user's Mac, outside repo)

**Notes**: Script at `/Users/david/repos/sharpee_v2/scratchpad/fix-ssh-keepalive.sh` is idempotent — backs up `~/.ssh/config`, skips if a `Host plover.net` block already exists, appends `ServerAliveInterval 30`/`ServerAliveCountMax 4`/`TCPKeepAlive yes`, sets 600 perms, accepts an optional interval arg (default 30, e.g. 15 for stubborn routers). Ran successfully; backup created at `~/.ssh/config.bak.20260721-214805`. No Sharpee platform or story code touched — pure sysadmin task, unrelated to chord-foundations branch work.
