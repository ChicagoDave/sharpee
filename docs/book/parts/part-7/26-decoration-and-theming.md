# Decoration, Theming & the Status Line

Channels carry data, and the client paints it — but the data still has to *say*
something about emphasis, and the page still has to *look* like something. This
chapter covers the three pieces that turn bare text into a styled screen:
**decoration** (how prose carries styling without carrying HTML), **theming** (how
the whole page changes skin), and the **status line** (how location, score, and
turn become a bar at the top).

## Decoration: styling without HTML on the wire

Volume V's formatter chain handled *grammar* — articles and capitalization inside a
message template. Decoration handles *style*: making a word italic, marking a name,
flagging a command. The rule Sharpee commits to is that **no HTML travels on the
wire**. A message never contains `<em>` or an inline `style`. Instead, templates use
a bracket syntax:

```text
This is Flood Control Dam #3 in the center of [em:Zork].
```

`[name:content]` wraps its content in a decoration. The prose pipeline turns each
bracket into a structured decoration node — `[em:Zork]` becomes
`{ className: 'sharpee-em', content: ['Zork'] }` — and the browser renderer turns
*that* into `<span class="sharpee-em">Zork</span>`. Brackets nest: `[em:[strong:bold
italic]]` produces a `sharpee-strong` span inside a `sharpee-em` span.

The point of the indirection is the same as HTML-plus-CSS: the markup says *what
kind* of thing this is; the stylesheet says how it looks. A span with a class, never
a baked-in color.

## Platform vocabulary and the `sharpee-` namespace

The platform reserves the `sharpee-` prefix and ships a small vocabulary, each name
mapping to one CSS class with a default rule:

| Decoration | Class | Renders as |
|---|---|---|
| `em` | `.sharpee-em` | italic |
| `strong` | `.sharpee-strong` | bold |
| `code` | `.sharpee-code` | monospace |
| `item` | `.sharpee-item` | a referenced object |
| `npc` | `.sharpee-npc` | a character |
| `room` | `.sharpee-room` | a location |
| `command` | `.sharpee-command` | a verb the player can type |

Write `[em:…]` and you inherit the platform's `.sharpee-em` rule. The resolver only
prefixes names it recognizes. Write a name the platform *doesn't* know —
`[thief-taunt:Hold still!]` — and it emits `<span class="thief-taunt">` verbatim,
with no prefix, and your story's CSS owns the styling completely. That's the one
firm rule for authors: don't name your own classes with `sharpee-`; that namespace
is the platform's.

## Theming: one DOM, many skins

Decoration styles the prose; **theming** styles the whole page. Sharpee's theming
model (ADR-170) rests on two commitments. First, a stable **component vocabulary** —
a fixed set of class names the DOM always uses, regardless of theme:

| Component | Class |
|---|---|
| Window shell | `.sharpee-window` |
| Menu bar | `.sharpee-menu-bar` |
| Status bar | `.sharpee-status-bar` |
| Prose pane | `.sharpee-prose-pane` |
| Input bar | `.sharpee-input-bar` |
| Dialog | `.sharpee-dialog` |

Second, each theme is a **complete CSS file** that styles every component
end-to-end, selected by a single attribute on the document:

```css
[data-theme="dos-classic"] {
  --theme-bg: #0000aa;
  --theme-text: #ffffff;
  --theme-font: "Perfect DOS VGA 437", "Consolas", monospace;
}
```

Switching themes is one attribute flip — `data-theme="dos-classic"` → `data-theme=
"cozy"` — and the whole page re-skins, because every theme styles the same component
classes. CSS custom properties (`--theme-bg` and friends) are a convenience *inside*
a theme, but the contract between platform and author is the component classes, not
the variables. The `ThemeManager` handles the flip and remembers the choice in
`localStorage`; you list the themes in `BrowserClientConfig` and the menu does the
rest.

## Author-shipped themes

Because a theme is just a CSS file targeting the component vocabulary, a story can
ship its own. Add a stylesheet that styles `.sharpee-window`, `.sharpee-prose-pane`,
and the rest under your own `[data-theme="zoo-sunny"]` block, list it in the config,
and it appears in the theme menu beside the platform's. The component contract is
exactly what makes this safe: your theme and the built-in themes target the same
class names, so the DOM never has to change to accommodate yours.

## The status line

The bar across the top — *Toucan Enclosure · Score: 12 · Turns: 47* — is not a
special widget. It's three channels rendered into the status bar: `location`,
`score`, and `turn`, all `replace`-mode (each shows a single current value that
supersedes the last). Each turn, the engine reads the player's room, the scoring
ledger from Volume VI, and the turn count, and emits them; the client's status
renderers write them into `.sharpee-status-bar`.

Because they're ordinary channels, the status line is as customizable as anything
else. Don't want a turn counter? Restyle or hide `.sharpee-status-bar` in your
theme. Want the score as a star badge instead of a number? Re-register the `score`
renderer, exactly as the previous chapter showed. Nothing about the status line is
privileged — it's the universal channel mechanism pointed at a strip of the page.

## Key takeaway

Style reaches the screen in three layers, none of which puts HTML on the wire.
**Decoration** marks prose with `[name:content]` brackets that become
`sharpee-`-prefixed spans for the platform vocabulary (`[em:…]`, `[item:…]`) or
verbatim author classes for names it doesn't know — markup says *what*, CSS says
*how*. **Theming** keeps one DOM and a stable component vocabulary
(`.sharpee-window`, `.sharpee-prose-pane`, …); each theme is a full CSS file
selected by a single `data-theme` flip, and stories can ship their own. The **status
line** is just the `location` / `score` / `turn` channels rendered into the status
bar — restyle it with CSS or re-register its renderers like any other channel. Text
and chrome covered, the final chapter adds the senses Sharpee has saved for last:
images and sound.
