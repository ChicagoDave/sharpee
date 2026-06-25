# Em-dash review — Chapter 26: Decoration and Theming

Source: `docs/book/parts/part-7/26-decoration-and-theming.md`

### 1. "The --theme-* set is the published contract" paragraph (line 94) — prose
OLD:
The `--theme-*` set is the published contract — sixteen properties the engine knows
how to consume: `--theme-bg`, `--theme-bg-alt`, `--theme-text`, `--theme-text-muted`,
`--theme-accent`, `--theme-accent-text`, `--theme-border`, `--theme-input-bg`,
`--theme-menu-bg`, `--theme-menu-hover`, `--theme-desktop-bg`, `--theme-font`,
`--theme-font-body`, `--theme-font-chrome`, `--theme-font-size`, `--theme-line-height`.
A theme sets the ones it cares about; the rest fall back to the `:root` default.

NEW:
The `--theme-*` set is the published contract that includes sixteen properties the engine knows how to consume: `--theme-bg`, `--theme-bg-alt`, `--theme-text`, `--theme-text-muted`,
`--theme-accent`, `--theme-accent-text`, `--theme-border`, `--theme-input-bg`,
`--theme-menu-bg`, `--theme-menu-hover`, `--theme-desktop-bg`, `--theme-font`,
`--theme-font-body`, `--theme-font-chrome`, `--theme-font-size`, `--theme-line-height`.
A theme sets the ones it cares about; the rest fall back to the `:root` default.

### 2. "Flourishes are optional polish" paragraph (line 178) — prose
OLD:
Flourishes are optional polish; the token block is what makes it a theme. (The author
override stylesheet is also where anything that *isn't* a theme lives — a one-off tweak
to a single component, an extra class your prose uses.)

NEW:
Flourishes are optional polish; the token block is what makes it a theme. (The author
override stylesheet is also where anything that *isn't* a theme lives: a one-off tweak
to a single component, an extra class your prose uses.)
