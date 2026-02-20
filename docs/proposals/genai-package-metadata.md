# Proposal: `GENAI.md` — A Standard for AI-Readable Package Documentation

**Author:** David Cornelson
**Status:** Draft
**Date:** 2026-02-20

## Problem

AI coding assistants (Claude Code, GitHub Copilot, Cursor, Cody, etc.) are increasingly used to write code against third-party packages. When a developer asks an AI to "add authentication using passport.js" or "set up server-side rendering with Next.js," the AI must understand that package's API — not just its type signatures, but how to correctly wire things together.

Today, AI tools have no standard way to discover package-level guidance. The result:

1. **AI explores blindly.** It reads source files, guesses at patterns, and frequently gets things wrong — calling deprecated methods, missing required setup steps, or using anti-patterns.

2. **Package authors can't help.** Even if a library author writes excellent documentation, there's no convention for including AI-targeted guidance in a distributed package. READMEs are written for humans skimming a webpage. Type declarations describe *what* exists but not *how* or *why*.

3. **Tool-specific fragmentation.** Claude Code uses `CLAUDE.md`. Cursor uses `.cursorrules`. GitHub Copilot uses `.github/copilot-instructions.md`. These are all repo-level files for *project authors*, not distributable files for *package consumers*. A package published to npm, PyPI, or crates.io ships none of this.

## Current State

| Convention | Scope | Ships in Package? | AI-Discoverable? |
|---|---|---|---|
| `README.md` | Human-facing overview | Yes | Not structured for AI |
| `.d.ts` / type stubs | API signatures | Yes | Signatures only, no guidance |
| `CLAUDE.md` | Claude Code project config | No (repo-level) | Claude Code only |
| `.cursorrules` | Cursor project config | No (repo-level) | Cursor only |
| `.github/copilot-instructions.md` | Copilot workspace config | No (repo-level) | Copilot only |
| JSDoc / docstrings | Inline documentation | Yes (in source) | Scattered, no overview |

The gap: **no standard file that ships with a package, is structured for AI consumption, and is tool-agnostic.**

## Proposal

### The `GENAI.md` Convention

Packages MAY include a `GENAI.md` file at their package root. This file provides AI-targeted documentation that helps coding assistants generate correct code against the package.

```
my-package/
  package.json
  GENAI.md          <-- new convention
  README.md
  dist/
  src/
```

When an AI tool resolves a package (via `node_modules`, `site-packages`, etc.), it SHOULD check for `GENAI.md` and read it before generating code that uses the package.

### File Format

`GENAI.md` is a Markdown file with conventional sections. All sections are optional. The file should be concise (aim for under 500 lines) — AI context windows are finite.

```markdown
# {Package Name}

One-line description of what this package does.

## Quick Start

The minimum code to get started. Show the most common usage pattern.

## Key Types

The core types/interfaces/classes a consumer works with.
Include full signatures for the most important ones.
Link to or inline the type declarations.

## Patterns

How to correctly use the API. Not just "what methods exist" but
"how to wire things together." Include:
- Required initialization/setup steps
- Common composition patterns
- Extension points and how to use them

## Anti-Patterns

What NOT to do. Common mistakes AI tools make with this package.
This section is uniquely valuable — human docs rarely include this,
but it directly prevents AI-generated bugs.

## Architecture

Brief explanation of the package's internal structure, only if
consumers need to understand it to use the package correctly.
```

### `package.json` Field (Optional)

For packages that split AI docs across multiple files (e.g., one per sub-module), a `package.json` field provides structured discovery:

```json
{
  "genai": {
    "docs": "./docs/ai/",
    "entry": "./GENAI.md"
  }
}
```

| Field | Description |
|---|---|
| `genai.entry` | Path to the main AI documentation file (default: `./GENAI.md`) |
| `genai.docs` | Path to a directory of additional AI-targeted reference files |

If the `genai` field is absent, tools SHOULD still check for `GENAI.md` at the package root.

### Equivalent in Other Ecosystems

The convention is not npm-specific:

| Ecosystem | Package Root | Discovery |
|---|---|---|
| **npm** | `node_modules/{pkg}/GENAI.md` | `package.json` → `genai` field |
| **PyPI** | `site-packages/{pkg}/GENAI.md` | `pyproject.toml` → `[tool.genai]` |
| **Cargo** | Included via `include` in `Cargo.toml` | `Cargo.toml` → `[package.metadata.genai]` |
| **Go** | Module root | `GENAI.md` at module root |
| **NuGet** | Package content files | `.nuspec` contentFiles |

## Design Principles

### 1. Convention over configuration

`GENAI.md` works with zero tooling changes. An AI can find it with a file existence check. The `package.json` field is optional enhancement, not a requirement.

### 2. Concise over comprehensive

This is not a replacement for full documentation. It's a focused briefing — the minimum an AI needs to generate correct code. Think "cheat sheet for a senior developer joining the project" not "complete API reference."

### 3. Tool-agnostic

`GENAI.md` is not for Claude, Copilot, or Cursor specifically. It's plain Markdown readable by any tool. No special syntax, no tool-specific directives.

### 4. Distributable

Unlike repo-level files (`.cursorrules`, `CLAUDE.md`), `GENAI.md` ships with the package. Anyone who installs the package gets the AI documentation.

### 5. Composable with existing conventions

`GENAI.md` complements (does not replace) README.md, type declarations, and JSDoc. It bridges the gap between "here's every method signature" and "here's how to actually use this."

## What Makes AI Documentation Different?

AI-targeted docs differ from human docs in specific ways:

**Include:**
- Full type signatures (AI needs exact parameter types and return types)
- Required setup/initialization sequences (AI can't infer these from types alone)
- Anti-patterns and common mistakes (prevent the most likely AI errors)
- Wiring patterns — how components connect to each other

**Exclude:**
- Installation instructions (`npm install` — the AI already knows)
- Badges, logos, screenshots (visual noise, wastes context)
- Changelog, migration guides (historical, not useful for code generation)
- Marketing language ("blazing fast", "developer-friendly")

**Format:**
- More code blocks, less prose (AI parses code faster than English)
- Explicit over implicit (state the default values, don't make the AI guess)
- Flat over nested (deep document structures waste context on navigation)

## Example: A Minimal `GENAI.md`

```markdown
# express

Fast, unopinionated web framework for Node.js.

## Quick Start

\`\`\`typescript
import express from 'express';

const app = express();
app.use(express.json()); // Required for req.body parsing

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000);
\`\`\`

## Key Types

\`\`\`typescript
interface Application {
  get(path: string, ...handlers: RequestHandler[]): this;
  post(path: string, ...handlers: RequestHandler[]): this;
  use(middleware: RequestHandler): this;
  use(path: string, router: Router): this;
  listen(port: number, callback?: () => void): Server;
}

interface Request {
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  headers: IncomingHttpHeaders;
}

interface Response {
  json(body: any): this;
  status(code: number): this;
  send(body: string | Buffer): this;
  redirect(url: string): this;
}

type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;
type ErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => void;
\`\`\`

## Patterns

### Middleware order matters
\`\`\`typescript
// Parsing middleware MUST come before route handlers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/api/data', handler);

// Error handler MUST be last and MUST have 4 parameters
app.use((err: Error, req, res, next) => {
  res.status(500).json({ error: err.message });
});
\`\`\`

### Router for modular routes
\`\`\`typescript
const router = express.Router();
router.get('/', listUsers);
router.post('/', createUser);
app.use('/api/users', router);
\`\`\`

## Anti-Patterns

- Do NOT call `res.json()` after `res.send()` — response is already sent
- Do NOT forget `express.json()` middleware — `req.body` will be `undefined`
- Do NOT use `app.get('*', ...)` before specific routes — it catches everything
- Error handlers MUST have exactly 4 parameters or Express won't recognize them
```

## Adoption Path

### Phase 1: Convention (now)

Package authors start including `GENAI.md` in their packages. AI tools that support file reading (Claude Code, Cursor, Copilot Workspace) can immediately benefit — users just need to tell the AI "check GENAI.md in the package."

### Phase 2: Tool Integration

AI coding tools add automatic discovery: when generating code that imports a package, check for `GENAI.md` in the resolved package directory and load it into context.

### Phase 3: Ecosystem Support

Package registries (npm, PyPI) surface AI documentation alongside existing package pages. `npm info express genai` shows the path. Registry search could weight packages with `GENAI.md` higher for AI-assisted workflows.

### Phase 4: Community Contributions

Like DefinitelyTyped for TypeScript declarations, a community repository could maintain `GENAI.md` files for popular packages that haven't adopted the convention yet.

## FAQ

**Why not just improve README.md?**
READMEs serve a different audience (humans browsing a registry page) with different needs (installation, badges, screenshots, marketing). Trying to serve both audiences in one file dilutes both.

**Why not rely on type declarations?**
Types tell you *what* exists but not *how* to use it. `createClient(options: ClientOptions): Client` doesn't tell you that you need to call `client.connect()` before making requests, that `options.retry` defaults to 3, or that the client emits an `'error'` event you must handle to avoid crashes.

**Why Markdown and not a structured format (JSON, YAML)?**
The content is inherently narrative — patterns, anti-patterns, examples. Markdown is the native format for both humans and language models. Structured metadata belongs in `package.json`.

**Won't this be too much context for AI tools?**
The 500-line guideline keeps files focused. AI tools can also selectively load sections. A package with a `genai.docs` directory can split reference material into separate files loaded on demand.

**What about security — could GENAI.md contain prompt injection?**
Yes, like any package content. AI tools should treat `GENAI.md` as untrusted input, same as they treat source code. Sandboxing, content filtering, and user confirmation for sensitive operations apply regardless.

## References

- [Claude Code `CLAUDE.md` convention](https://docs.anthropic.com/en/docs/claude-code)
- [Cursor `.cursorrules` convention](https://docs.cursor.com)
- [GitHub Copilot Custom Instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [DefinitelyTyped — community-maintained type declarations](https://github.com/DefinitelyTyped/DefinitelyTyped)
