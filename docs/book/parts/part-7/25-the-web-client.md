# The Web Client & Framework-Free UI

> **Status:** to be written. Adapts `@sharpee/platform-browser` (genai-api
> `presentation.md`) and the framework-free UI architecture (ADR-170).

This chapter will cover the browser client: how `BrowserClient` connects to the
engine, registers per-channel renderers (ADR-165) that turn turn packets into DOM,
and why the UI is built from plain HTML/CSS components (native `<dialog>`,
`.sharpee-*` classes, `--modifier` states) rather than a framework — so authors can
restyle or replace any renderer per story.
