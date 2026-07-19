/**
 * mdx-components.tsx — global MDX element map (required by @next/mdx with
 * App Router). Maps markdown-generated elements onto the shared prose
 * primitives so every .mdx content file inherits the site's typography
 * without per-page styling.
 *
 * Public interface: useMDXComponents() — consumed by @next/mdx, never
 * called directly. Owner: website (not the platform workspace).
 */

import type { MDXComponents } from "mdx/types";
import {
  Callout,
  CodeBlock,
  InlineCode,
  ProseBlockquote,
  ProseH2,
  ProseH3,
  ProseLink,
  ProseOl,
  ProseTable,
  ProseTd,
  ProseTh,
  ProseUl,
} from "@/components/prose";

const components: MDXComponents = {
  // Shared primitives, available in every .mdx without imports.
  Callout,
  CodeBlock,
  h2: ProseH2,
  h3: ProseH3,
  a: ProseLink,
  code: InlineCode,
  // Fenced code arrives as <pre><code class="language-…">…</code></pre>;
  // CodeBlock owns the <pre>, and InlineCode passes language-tagged code
  // through untouched (fences must carry a language tag — see prose.tsx).
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  ul: ProseUl,
  ol: ProseOl,
  blockquote: ProseBlockquote,
  table: ProseTable,
  th: ProseTh,
  td: ProseTd,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
