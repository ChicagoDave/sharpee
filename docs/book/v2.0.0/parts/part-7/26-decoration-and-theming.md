# Decoration & Theming: Style Without HTML on the Wire

Channels carry data, and the client paints it, but the data still has to *say*
something about emphasis, and the page still has to *look* like something. This
chapter covers the three pieces that turn bare text into a styled screen:
**decoration** (how prose carries styling without carrying HTML), **theming** (how
the whole page changes skin), and the **status line** (how location, score, and
turn become a bar at the top).

## Decoration: styling without HTML on the wire

Volume V's phrase algebra handled *grammar*: articles and capitalization inside a
message template. Decoration handles *style*: making a word italic, marking a name,
flagging a command. The rule Sharpee commits to is that **no HTML travels on the
wire**. A message never contains `<em>` or an inline `style`. Instead, templates use
a bracket syntax:

```text
This is Flood Control Dam #3 in the center of [em:Zork].
```

`[name:content]` wraps its content in a decoration. The prose pipeline turns each
bracket into a structured decoration node, so `[em:Zork]` becomes
`{ className: 'sharpee-em', content: ['Zork'] }`, and the browser renderer turns
*that* into `<span class="sharpee-em">Zork</span>`. Brackets nest: `[em:[strong:bold
italic]]` produces a `sharpee-strong` span inside a `sharpee-em` span.

The point of the indirection is the same as HTML-plus-CSS: the markup says *what
kind* of thing this is; the stylesheet says how it looks. A span with a class, never
a baked-in color.

## Platform vocabulary and the `sharpee-` namespace

The platform reserves the `sharpee-` prefix and ships a vocabulary, each name
mapping to one CSS class with a default rule. The names you'll use most:

| Decoration | Class | Renders as |
|---|---|---|
| `em` | `.sharpee-em` | italic |
| `strong` | `.sharpee-strong` | bold |
| `code` | `.sharpee-code` | monospace |
| `item` | `.sharpee-item` | a referenced object |
| `npc` | `.sharpee-npc` | a character |
| `room` | `.sharpee-room` | a location |
| `command` | `.sharpee-command` | a verb the player can type |

This table is an excerpt; the full `PLATFORM_VOCABULARY` is considerably larger.
It also covers text styles (`u`, `st`, `super`, `sub`), `direction`, `quote`, the
`color-*` and `bgcolor-*` families, `size-*`, `font-mono`, and the layout macros
(`br`, `p`, `indent`, `center`, `right`). Check it before inventing a class name,
because any name the platform knows gets the `sharpee-` prefix, which may not be
what you intended.

Write `[em:…]` and you inherit the platform's `.sharpee-em` rule. The resolver only
prefixes names it recognizes. Write a name the platform *doesn't* know, such as
`[thief-taunt:Hold still!]`, and it emits `<span class="thief-taunt">` verbatim,
with no prefix, and your story's CSS owns the styling completely. That's the one
firm rule for authors: don't name your own classes with `sharpee-`; that namespace
is the platform's.

## Theming: one DOM, many skins

Decoration styles the prose; **theming** styles the whole page. Sharpee's theming
model (ADR-170) rests on two commitments. First, a stable **component vocabulary**:
a fixed set of class names the DOM always uses, regardless of theme:

| Component | Class |
|---|---|
| Window shell | `.sharpee-window` |
| Menu bar | `.sharpee-menu-bar` |
| Status bar | `.sharpee-status-bar` |
| Prose pane | `.sharpee-prose-pane` |
| Input bar | `.sharpee-input-bar` |
| Dialog | `.sharpee-dialog` |

Second, and this is the part ADR-188 settled, the platform ships a **theme
engine**, and a theme is *data*. The engine (in `@sharpee/platform-browser`) is one
un-scoped layer of component rules that reads a set of `--theme-*` custom properties
and paints every component class once:

```css
/* the engine, shipped by the platform,
   written once, never per theme */
body {
  background: var(--theme-bg);
  color: var(--theme-text);
}
.sharpee-status-bar {
  background: var(--theme-accent);
  color: var(--theme-accent-text);
}
/* …every .sharpee-* component, all consuming var(--theme-*) … */
```

The engine also ships the default token values on `:root`, the `classic`
white-on-blue palette, so the page is **always** skinned, even with no theme
selected. A **theme**, then, is nothing but a block that overrides those tokens:

```css
[data-theme="modern-dark"] {
  --theme-bg: #1e1e2e;
  --theme-text: #cdd6f4;
  --theme-accent: #89b4fa;
  --theme-font: "Inter", system-ui, sans-serif;
}
```

The `--theme-*` set is the published contract. Sixteen properties the engine knows
how to consume: `--theme-bg`, `--theme-bg-alt`, `--theme-text`, `--theme-text-muted`,
`--theme-accent`, `--theme-accent-text`, `--theme-border`, `--theme-input-bg`,
`--theme-menu-bg`, `--theme-menu-hover`, `--theme-desktop-bg`, `--theme-font`,
`--theme-font-body`, `--theme-font-chrome`, `--theme-font-size`, `--theme-line-height`.
A theme sets the ones it cares about; the rest fall back to the `:root` default.

So the contract between platform and author is now the **tokens**, not a pile of
per-theme component rules. The variables aren't a convenience *inside* a theme, they
*are* the theme. Switching is still one attribute flip, from `data-theme="modern-dark"`
to `data-theme="zoo-sunny"`, and the whole page re-skins, because the engine re-reads
the tokens. (Theme CSS loads *after* the engine: `:root` and `[data-theme="x"]` have
equal specificity, so source order decides, and the theme must win.) The fallback is
automatic and needs no code: an unset token, an unknown `data-theme`, or a selected
theme that isn't wired into the build all resolve to the `:root` default, so the page is
never unskinned. The `ThemeManager` handles the flip and remembers the choice in
`localStorage`.

## Applying themes

You wire themes into a story by listing them in **`package.json` → `sharpee.themes`**.
The build reads that list, copies in any theme CSS, links it after the engine, and
builds the theme menu: the `classic` default plus one entry per theme you list.
Discovery is never magic: the build wires exactly what you name and does **not** scan
`node_modules`.

### Built-in themes: list the id

The platform ships a set of built-in themes with `@sharpee/platform-browser`:
`modern-dark`, `retro-terminal`, `paper`, and `system-6` (plus `classic`, the
white-on-blue default, which is always present). To offer some of them, just list
their **ids**, with no installs and no extra dependencies:

```jsonc
// the story's package.json
"sharpee": { "themes": ["modern-dark", "paper", "system-6"] }
```

`sharpee build-browser` copies each listed built-in's CSS out of platform-browser into
`dist/web/themes/<id>.css`, links it, and adds it to the menu.

### Your own theme: three lines of CSS and one list entry

Because a theme is just a token block, shipping your own takes two small pieces:

1. **Write a `[data-theme]` token block** in your author override stylesheet,
   the `browser/*.css` file `sharpee init-browser` created, named after your
   project's *package name* (for the tutorial project that's
   `browser/my-zoo.css`, not the story's `config.id`). The build links it
   *last*, so it wins the cascade:

   ```css
   /* browser/my-zoo.css */
   [data-theme="zoo-sunny"] {
     --theme-bg: #fffaf0;          /* warm cream */
     --theme-text: #2f2a24;
     --theme-accent: #4a9d52;       /* zoo green */
     --theme-font: "Nunito", "Segoe UI", system-ui, sans-serif;
   }
   ```

2. **List it inline** in `sharpee.themes`, giving it an `id` (matching the
   `[data-theme]` value) and a menu `name`:

   ```jsonc
   "sharpee": { "themes": [
     "modern-dark", "paper",
     { "id": "zoo-sunny", "name": "Zoo Sunny" }
   ] }
   ```

That's it. The build adds *Zoo Sunny* to the menu; selecting it flips
`data-theme="zoo-sunny"`, and the engine paints the window, menu, status bar, prose
pane, dialogs, and input from your four variables (and the `:root` defaults for the
rest).

**Flourish** rules push past the tokens when you want to. Family Zoo does:
it deliberately puts its green on the title and menu bars instead of the
engine's default, the status bar. These two rules are part of the zoo's
theme, so add them to `browser/my-zoo.css` under the same `[data-theme]`
selector, below the token block:

```css
[data-theme="zoo-sunny"] .sharpee-menu-bar {
  background: var(--theme-menu-bg);
}
[data-theme="zoo-sunny"] .sharpee-status-bar {
  background: var(--theme-bg-alt);
}
```

Flourishes are optional polish; the token block is what makes it a theme. (The author
override stylesheet is also where anything that *isn't* a theme lives: a one-off tweak
to a single component, an extra class your prose uses.)

> **Sharing a theme across stories.** A theme that lives only in one story's override
> stylesheet can't be reused elsewhere. The same `[data-theme]` block can instead be
> published as a small npm package other authors install and list by name, the path
> the built-ins themselves use internally. That's an advanced step; for one story, the
> override stylesheet is all you need.

## The status line

The bar across the top, *Toucan Enclosure · Score: 12 · Turns: 47*, is not a
special widget. It's three channels rendered into the status bar: `location`,
`score`, and `turn`, all `replace`-mode (each shows a single current value that
supersedes the last). Each turn, the engine reads the player's room, the scoring
ledger from Volume VI, and the turn count, and emits them; the client's status
renderers write them into `.sharpee-status-bar`.

Because they're ordinary channels, the status line is as customizable as anything
else. Don't want a turn counter? Restyle or hide `.sharpee-status-bar` in your
theme. Want the score as a star badge instead of a number? Re-register the `score`
renderer, exactly as the previous chapter showed. Nothing about the status line is
privileged. It's the universal channel mechanism pointed at a strip of the page.

## Key takeaway

Style reaches the screen without ever putting HTML on the wire. **Decoration** marks
prose with `[name:content]` brackets that become `sharpee-`-prefixed spans; markup
says *what*, CSS says *how*. **Theming** paints a stable component vocabulary from
sixteen `--theme-*` tokens, so a theme is just a `[data-theme]` block of variables,
selected by a single flip. Offer a built-in by id in `sharpee.themes`, or ship your
own in your override stylesheet. Even the status line is just the
`location`/`score`/`turn` channels rendered into a bar you can restyle. Text and
chrome covered, the final chapter adds the senses Sharpee has saved for last: images
and sound.
