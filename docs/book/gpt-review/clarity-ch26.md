# Clarity review — Chapter 26: Decoration & Theming

### 1. "Your own theme" closing line — redundant
WHY: "A token block is genuinely the whole theme — no component rules required." restates the section's own heading promise and the sentence two paragraphs later ("the token block is what makes it a theme"). The same claim lands three times in this section; this instance adds nothing the preceding sentence didn't already say.
OLD: ...and the engine paints the window, menu, status bar, prose
pane, dialogs, and input from your four variables (and the `:root` defaults for the
rest). A token block is genuinely the whole theme — no component rules required.
NEW: ...and the engine paints the window, menu, status bar, prose
pane, dialogs, and input from your four variables (and the `:root` defaults for the
rest).

### 2. "Built-in themes" — "That's the whole step." — filler
WHY: "That's the whole step." is an empty close that adds no information after the sentence that already lists the three actions (copies CSS, links it, adds it to the menu). Cut it, or only keep if the reader genuinely needs reassurance — but the prior sentence already conveys completeness.
OLD: `sharpee build-browser` copies each listed built-in's CSS out of platform-browser into
`dist/web/themes/<id>.css`, links it, and adds it to the menu. That's the whole step.
NEW: `sharpee build-browser` copies each listed built-in's CSS out of platform-browser into
`dist/web/themes/<id>.css`, links it, and adds it to the menu.

Note: "That's it." at the end of the custom-theme section (line 162) is followed by a concrete sentence that explains what happens, so it functions as legitimate signposting — left unflagged.

Two flags; #1 is the clearer redundancy.
