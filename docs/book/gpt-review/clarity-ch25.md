# Clarity review — Chapter 25: The Web Client

### 1. "Why no framework" — restates-next
WHY: "This is a deliberate architecture, not an omission." is a content-free framing sentence; the sentence after it carries the actual point (a framework would insert a runtime and impose its own override idioms). Promote the concrete sentence.
OLD: This is a deliberate architecture, not an omission. A framework would put a runtime
between the author and the page and impose its own idioms for overriding a view.
NEW: The framework-free build is deliberate: a framework would put a runtime
between the author and the page and impose its own idioms for overriding a view.

### 2. "Why no framework" final line — vague
WHY: "Nothing to learn but the web platform you already know." restates the preceding sentence ("an author restyles it with CSS and replaces a renderer with a function") without adding mechanism. It is a tone flourish, not information. Consider cutting, or fold the concrete claim forward.
OLD: Sharpee's bet is the opposite: the page is just HTML and CSS, so an author restyles
it with CSS and replaces a renderer with a function. Nothing to learn but the web
platform you already know.
NEW: Sharpee's bet is the opposite: the page is just HTML and CSS, so an author restyles
it with CSS and replaces a renderer with a function. There is no framework API to learn.

Two flags. Both are minor; #1 is the clearer win.
