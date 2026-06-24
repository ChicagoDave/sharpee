# Clarity review — Chapter 28: The Multi-File Story

Flags: 1

### 1. "A feature that spans the files: after hours" — final paragraph — restates-next / filler
WHY: "The feature is *more* ambitious than anything before it" adds nothing the reader can act on, and "which is the entire payoff of organizing by concern" restates the section's own thesis already proven by the four bullets above it. The load-bearing claim is the first sentence; the rest pads it.
OLD: Every one of those touches lands in the file that owns its concern. The feature is
*more* ambitious than anything before it, and yet no single file became harder to
read — which is the entire payoff of organizing by concern.
NEW: Every one of those touches lands in the file that owns its concern: the daemons in `events.ts`, the phase flag in world state, the behavior swap in `index.ts`, the bonus tier in `scoring.ts`. A whole second act, and no single file grew harder to read.
