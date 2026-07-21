'use client';

/**
 * doc-page.tsx — WF-B content frame: breadcrumb (derived from the nav
 * model), title, prose column. No on-page TOC rail (dropped by David,
 * 2026-07-19 — headings carry the page structure on their own).
 *
 * Public interface: <DocPage title>{content}</DocPage>.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { crumbsFor, pagerFor } from '@/lib/nav';

export function DocPage({ title, children }: { title: string; children: React.ReactNode }) {
  const crumbs = crumbsFor(usePathname());
  return (
    <article className="max-w-[860px] min-w-0 px-6 py-8 sm:px-10">
      {crumbs.length > 0 && <div className="mb-5 text-[13px] text-muted">{crumbs.join(' / ')}</div>}
      <h1 className="mb-4 text-[28px] font-bold">{title}</h1>
      <div className="space-y-4">{children}</div>
      <Pager />
    </article>
  );
}

/** Prev/next footer links, derived from the nav model (within-section only). */
function Pager() {
  const { prev, next } = pagerFor(usePathname());
  if (!prev && !next) return null;
  return (
    <nav className="mt-10 flex justify-between gap-4 border-t border-border pt-5 text-[14px]">
      {prev ? (
        <Link href={prev.href} className="text-link hover:underline">
          ← {prev.title}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={next.href} className="text-link hover:underline">
          {next.title} →
        </Link>
      )}
    </nav>
  );
}

/** Dashed placeholder block — wireframe stand-in until real content lands. */
export function Placeholder({ label, h = 130 }: { label: string; h?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface text-[13px] text-muted"
      style={{ height: h }}
    >
      {label}
    </div>
  );
}
