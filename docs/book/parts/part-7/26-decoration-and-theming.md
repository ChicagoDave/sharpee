# Decoration, Theming & the Status Line

> **Status:** to be written. Adapts the decoration model (ADR-174), component-based
> theming (ADR-170), and the status channels.

This chapter will cover how text carries styling without HTML on the wire —
decorations as `span` + `sharpee-`-prefixed classes (`[em:…]` and friends) that
render as `ITextBlock` content — plus theming through CSS custom properties and
`.sharpee-*` component classes, and how the `location` / `score` / `turn` channels
drive the status line.
