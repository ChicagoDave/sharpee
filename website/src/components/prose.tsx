/**
 * prose.tsx — shared content primitives for doc pages (website-content
 * plan, Phase 1). Every content page builds from these — MDX content via
 * the global element map (src/mdx-components.tsx), hand-written TSX via
 * direct import — so typography and color live in exactly one place.
 *
 * Public interface: <CodeBlock title?>, <Callout kind? title?>, and the
 * markdown element styles the MDX map consumes (headings, links, lists,
 * tables, inline/block code, blockquote). Owner: website (not the
 * platform workspace).
 */

import Link from "next/link";
import { isValidElement } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Block code sample. `title` renders a label bar (filename or command
 * context, e.g. "shell" or "fernhill.story"). Used directly from TSX, and
 * as the MDX `pre` mapping (where children is the fenced `<code>` element).
 */
export function CodeBlock({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {title && (
        <div className="border-b border-border bg-surface px-4 py-1.5 font-mono text-[12px] text-muted">
          {title}
        </div>
      )}
      <pre className="overflow-x-auto bg-code p-4 font-mono text-[13.5px] leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

/**
 * Aside block for notes and warnings. `kind` picks the accent: "note"
 * (navy) for guidance, "warn" (rose) for gotchas and sharp edges.
 */
export function Callout({
  kind = "note",
  title,
  children,
}: {
  kind?: "note" | "warn";
  title?: string;
  children: ReactNode;
}) {
  // Dark steps are -800, not -900: the dark canvas IS navy-900, so a -900
  // wash would vanish against it (verified in the Phase 1 dark-mode shots).
  const accent =
    kind === "warn"
      ? "border-l-rose-500 bg-rose-50 dark:bg-rose-800"
      : "border-l-navy-500 bg-navy-50 dark:bg-navy-800";
  return (
    <aside className={`rounded-r-lg border-l-4 px-4 py-3 text-[14.5px] ${accent}`}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <div className="space-y-2 [&_p]:m-0">{children}</div>
    </aside>
  );
}

/* ---- markdown element styles (consumed by src/mdx-components.tsx) ---- */

/**
 * Flattens a heading's children to their text, so a heading carrying inline
 * markup (`<code>`, emphasis) still yields a slug. Returns "" for anything
 * with no text of its own.
 */
function headingText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(headingText).join("");
  if (isValidElement(node)) return headingText((node.props as { children?: ReactNode }).children);
  return "";
}

/**
 * GitHub-style anchor slug — lowercased, punctuation dropped, whitespace to
 * dashes. "The Folly at Fernhill" -> "the-folly-at-fernhill", which is the
 * form `.mdx` authors already write by hand in in-page links.
 */
function headingSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

/**
 * Section heading. Carries an auto-derived `id` so in-page links (`[…](#the-ifid)`)
 * have somewhere to land; an explicit `id` from the caller always wins.
 */
export function ProseH2({ children, id, ...rest }: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2 id={id ?? headingSlug(headingText(children))} className="mt-8 text-[21px] font-bold" {...rest}>
      {children}
    </h2>
  );
}

/** Subsection heading. Auto-derived `id`, on the same terms as {@link ProseH2}. */
export function ProseH3({ children, id, ...rest }: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3 id={id ?? headingSlug(headingText(children))} className="mt-6 text-[17px] font-semibold" {...rest}>
      {children}
    </h3>
  );
}

/**
 * Internal hrefs go through next/link; external ones open in a new tab.
 * Internal FILE hrefs (an extension on the last segment, e.g. /chord.ebnf)
 * are static assets, not routes — plain anchor, same tab.
 * In-page hrefs (#the-ifid) are neither — plain anchor, same tab, no
 * next/link (which would treat the fragment as a route and navigate).
 * The ids they land on are derived by ProseH2/ProseH3.
 */
export function ProseLink({ href = "", children, ...rest }: ComponentPropsWithoutRef<"a">) {
  if (href.startsWith("#")) {
    return (
      <a href={href} className="text-link underline underline-offset-2" {...rest}>
        {children}
      </a>
    );
  }
  if (href.startsWith("/") && /\.\w+$/.test(href)) {
    return (
      <a href={href} className="text-link underline underline-offset-2" {...rest}>
        {children}
      </a>
    );
  }
  if (href.startsWith("/")) {
    return (
      <Link href={href} className="text-link underline underline-offset-2" {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      className="text-link underline underline-offset-2"
      target="_blank"
      rel="noreferrer"
      {...rest}
    >
      {children}
    </a>
  );
}

/**
 * Inline code styling. Fenced blocks arrive as `<code class="language-…">`
 * inside a `<pre>` (CodeBlock owns that styling) — so any fence in .mdx
 * content MUST carry a language tag (` ```text ` at minimum) or it will be
 * styled as inline code.
 */
export function InlineCode({ className, ...rest }: ComponentPropsWithoutRef<"code">) {
  if (className?.includes("language-")) return <code className={className} {...rest} />;
  return <code className="rounded bg-code px-1.5 py-0.5 font-mono text-[0.9em]" {...rest} />;
}

export function ProseUl(props: ComponentPropsWithoutRef<"ul">) {
  return <ul className="list-disc space-y-1.5 pl-6" {...props} />;
}

export function ProseOl(props: ComponentPropsWithoutRef<"ol">) {
  return <ol className="list-decimal space-y-1.5 pl-6" {...props} />;
}

export function ProseBlockquote(props: ComponentPropsWithoutRef<"blockquote">) {
  return <blockquote className="border-l-4 border-border pl-4 text-muted" {...props} />;
}

export function ProseTable(props: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[14.5px]" {...props} />
    </div>
  );
}

export function ProseTh(props: ComponentPropsWithoutRef<"th">) {
  return <th className="border-b-2 border-border px-3 py-2 text-left font-semibold" {...props} />;
}

export function ProseTd(props: ComponentPropsWithoutRef<"td">) {
  return <td className="border-b border-border px-3 py-2 align-top" {...props} />;
}
